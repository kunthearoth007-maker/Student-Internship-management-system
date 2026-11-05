<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportRequest;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use App\Support\ApiResponse;
use App\Support\FileStorage;
use App\Support\Workflow;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $student = $request->user()->student;

        $reports = Report::with(['assignment:id,student_id,status', 'feedbacks.supervisor.user'])
            ->whereHas('assignment', fn ($q) => $q->where('student_id', $student->id))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->ok('OK', ReportResource::collection($reports));
    }

    public function show(Request $request, Report $report)
    {
        $this->authorizeStudent($request, $report);

        return $this->ok('OK', new ReportResource($report->load('feedbacks.supervisor.user', 'assignment')));
    }

    public function store(StoreReportRequest $request)
    {
        $student = $request->user()->student;
        $assignment = $student->assignments()->find($request->integer('assignment_id'));

        if (! $assignment) {
            return $this->fail('Assignment not found for your account.', 404);
        }

        if (! in_array($assignment->status, ['pending', 'active'], true)) {
            return $this->fail('Reports can only be submitted for a pending or active internship.');
        }

        $report = Report::create([
            'assignment_id' => $assignment->id,
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'report_type' => $request->input('report_type'),
            'file' => $request->hasFile('file')
                ? FileStorage::store($request->file('file'), 'reports')
                : null,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        Workflow::submitReport($report->load('assignment.supervisor'));

        return $this->ok('Report submitted successfully', new ReportResource($report), 201);
    }

    public function update(Request $request, Report $report)
    {
        $this->authorizeStudent($request, $report);

        if ($report->status !== 'revision_required') {
            return $this->fail('Only reports that need revision can be resubmitted.');
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'file' => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ]);

        if ($request->hasFile('file')) {
            $report->file = FileStorage::replace($report->file, $request->file('file'), 'reports');
        }

        $report->fill(collect($validated)->except('file')->toArray());
        $report->status = 'submitted';
        $report->submitted_at = now();
        $report->save();

        Workflow::submitReport($report->load('assignment.supervisor'));

        return $this->ok('Report resubmitted successfully', new ReportResource($report));
    }

    private function authorizeStudent(Request $request, Report $report): void
    {
        abort_unless(
            $report->assignment->student_id === $request->user()->student?->id,
            403,
            'Not your report.'
        );
    }
}
