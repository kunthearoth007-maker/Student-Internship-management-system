<?php

namespace App\Http\Controllers\Api\Supervisor;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use App\Models\ReportFeedback;
use App\Support\ApiResponse;
use App\Support\Workflow;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $supervisor = $request->user()->supervisor;

        $query = Report::with(['assignment.student.user', 'assignment.company', 'feedbacks.supervisor.user'])
            ->whereHas('assignment', fn ($q) => $q->where('supervisor_id', $supervisor->id));

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return $this->ok('OK', ReportResource::collection(
            $query->latest('submitted_at')->paginate($request->integer('per_page', 15))
        ));
    }

    public function show(Request $request, Report $report)
    {
        $this->authorizeSupervisor($request, $report);

        return $this->ok('OK', new ReportResource(
            $report->load(['feedbacks.supervisor.user', 'assignment.student.user', 'assignment.company', 'assignment.internship'])
        ));
    }

    public function feedback(Request $request, Report $report)
    {
        $this->authorizeSupervisor($request, $report);

        $validated = $request->validate(['feedback' => 'required|string|max:5000']);

        $entry = ReportFeedback::create([
            'report_id' => $report->id,
            'supervisor_id' => $request->user()->supervisor->id,
            'feedback' => $validated['feedback'],
        ]);

        Workflow::gaveFeedback($report->load('assignment.student'), $request->user()->supervisor);

        return $this->ok('Feedback added successfully',
            new ReportResource($report->load('feedbacks.supervisor.user')), 201);
    }

    public function approve(Request $request, Report $report)
    {
        $this->authorizeSupervisor($request, $report);

        $report->update(['status' => 'approved', 'reviewed_at' => now()]);

        Workflow::decideReport($report->load('assignment.student'), 'approved');

        return $this->ok('Report approved', new ReportResource($report));
    }

    public function revision(Request $request, Report $report)
    {
        $this->authorizeSupervisor($request, $report);

        $validated = $request->validate(['feedback' => 'required|string|max:5000']);

        ReportFeedback::create([
            'report_id' => $report->id,
            'supervisor_id' => $request->user()->supervisor->id,
            'feedback' => $validated['feedback'],
        ]);

        $report->update(['status' => 'revision_required', 'reviewed_at' => now()]);

        Workflow::decideReport($report->load('assignment.student'), 'revision_required', $validated['feedback']);

        return $this->ok('Revision requested', new ReportResource($report->load('feedbacks.supervisor.user')));
    }

    private function authorizeSupervisor(Request $request, Report $report): void
    {
        abort_unless(
            $report->assignment->supervisor_id === $request->user()->supervisor?->id,
            403,
            'Not your assigned report.'
        );
    }
}
