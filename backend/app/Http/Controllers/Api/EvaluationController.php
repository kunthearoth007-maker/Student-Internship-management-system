<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEvaluationRequest;
use App\Http\Resources\EvaluationResource;
use App\Models\Evaluation;
use App\Support\ApiResponse;
use App\Support\Workflow;
use Illuminate\Http\Request;

class EvaluationController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Evaluation::with(['evaluator', 'assignment.student.user', 'assignment.company', 'assignment.internship']);

        match ($user->role) {
            'company' => $query->whereHas('assignment', fn ($q) => $q->where('company_id', $user->company->id)),
            'supervisor' => $query->whereHas('assignment', fn ($q) => $q->where('supervisor_id', $user->supervisor->id)),
            'student' => $query->whereHas('assignment', fn ($q) => $q->where('student_id', $user->student->id)),
            default => null,
        };

        return $this->ok('OK', EvaluationResource::collection(
            $query->latest()->paginate($request->integer('per_page', 15))
        ));
    }

    public function show(Request $request, Evaluation $evaluation)
    {
        $this->authorizeView($request, $evaluation);

        return $this->ok('OK', new EvaluationResource(
            $evaluation->load(['evaluator', 'assignment.student.user', 'assignment.company', 'assignment.internship'])
        ));
    }

    public function store(StoreEvaluationRequest $request)
    {
        $user = $request->user();
        $assignment = \App\Models\InternshipAssignment::find($request->integer('assignment_id'));

        if ($user->role === 'company') {
            abort_unless($assignment->company_id === $user->company?->id, 403, 'Not your intern.');
            $type = 'company';
        } else {
            abort_unless($assignment->supervisor_id === $user->supervisor?->id, 403, 'Not your student.');
            $type = 'supervisor';
        }

        $duplicate = Evaluation::where('assignment_id', $assignment->id)
            ->where('evaluator_id', $user->id)
            ->where('evaluator_type', $type)
            ->exists();

        if ($duplicate) {
            return $this->fail('You already evaluated this student. Update the existing evaluation instead.');
        }

        $data = collect($request->validated())->except('assignment_id')->all();
        $data['assignment_id'] = $assignment->id;
        $data['evaluator_id'] = $user->id;
        $data['evaluator_type'] = $type;

        $evaluation = (new Evaluation($data))->calculateOverall();
        $evaluation->save();

        Workflow::evaluationSubmitted($user, $assignment, (float) $evaluation->overall_score);

        return $this->ok('Evaluation saved successfully', new EvaluationResource($evaluation), 201);
    }

    public function update(StoreEvaluationRequest $request, Evaluation $evaluation)
    {
        if ($evaluation->evaluator_id !== $request->user()->id) {
            return $this->fail('You can only update your own evaluation.', 403);
        }

        $evaluation->fill(collect($request->validated())->except('assignment_id')->all());
        $evaluation->calculateOverall()->save();

        return $this->ok('Evaluation updated successfully', new EvaluationResource($evaluation));
    }

    private function authorizeView(Request $request, Evaluation $evaluation): void
    {
        $user = $request->user();
        $assignment = $evaluation->assignment;

        $allowed = $user->isAdmin()
            || ($user->role === 'company' && $assignment->company_id === $user->company?->id)
            || ($user->role === 'supervisor' && $assignment->supervisor_id === $user->supervisor?->id)
            || ($user->role === 'student' && $assignment->student_id === $user->student?->id);

        abort_unless($allowed, 403);
    }
}
