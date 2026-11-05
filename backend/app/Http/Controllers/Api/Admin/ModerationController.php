<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\AssignmentResource;
use App\Http\Resources\InternshipResource;
use App\Http\Resources\ReportResource;
use App\Models\Company;
use App\Models\Application;
use App\Models\Internship;
use App\Models\InternshipAssignment;
use App\Models\Report;
use App\Models\Supervisor;
use App\Support\ApiResponse;
use App\Support\Workflow;
use Illuminate\Http\Request;

class ModerationController extends Controller
{
    use ApiResponse;

    public function internships(Request $request)
    {
        $query = Internship::with(['company.user', 'period'])->withCount('applications');

        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->input('approval_status'));
        }

        if ($request->filled('period_id')) {
            $query->where('period_id', $request->integer('period_id'));
        }

        return $this->ok('OK', InternshipResource::collection($query->latest()->paginate($request->integer('per_page', 15))));
    }

    public function approveInternship(Internship $internship)
    {
        $internship->update(['approval_status' => 'approved']);

        Workflow::internshipDecided($internship->load('company'), 'approved', null);

        return $this->ok('Internship approved', new InternshipResource($internship));
    }

    public function rejectInternship(Request $request, Internship $internship)
    {
        $validated = $request->validate(['note' => 'nullable|string|max:1000']);

        $internship->update(['approval_status' => 'rejected', 'is_published' => false]);

        Workflow::internshipDecided($internship->load('company'), 'rejected', $validated['note'] ?? null);

        return $this->ok('Internship rejected', new InternshipResource($internship));
    }

    public function publishInternship(Internship $internship)
    {
        if ($internship->approval_status !== 'approved') {
            return $this->fail('Only approved internships can be published.');
        }

        $internship->loadMissing('company');

        if (! $internship->company?->isVerified()) {
            return $this->fail('This company is not verified yet.');
        }

        $internship->update(['is_published' => true]);

        Workflow::logPublish($internship, true);

        return $this->ok('Internship published', new InternshipResource($internship));
    }

    public function unpublishInternship(Internship $internship)
    {
        $internship->update(['is_published' => false]);

        Workflow::logPublish($internship, false);

        return $this->ok('Internship unpublished', new InternshipResource($internship));
    }

    public function destroyInternship(Internship $internship)
    {
        $internship->delete();

        Workflow::log('internship.deleted', 'Admin deleted the internship '.$internship->title, $internship);

        return $this->ok('Internship deleted');
    }

    public function verifyCompany(Request $request, Company $company)
    {
        $validated = $request->validate(['note' => 'nullable|string|max:1000']);

        $company->update([
            'verification_status' => 'verified',
            'verified_at' => now(),
            'verification_note' => $validated['note'] ?? null,
        ]);

        Workflow::companyVerified($company->load('user'), 'verified', $validated['note'] ?? null);

        return $this->ok('Company verified', $company->load('user'));
    }

    public function rejectCompany(Request $request, Company $company)
    {
        $validated = $request->validate(['note' => 'nullable|string|max:1000']);

        $company->update([
            'verification_status' => 'rejected',
            'verified_at' => null,
            'verification_note' => $validated['note'] ?? null,
        ]);

        $company->internships()->update(['is_published' => false]);

        Workflow::companyVerified($company->load('user'), 'rejected', $validated['note'] ?? null);

        return $this->ok('Company verification rejected', $company->load('user'));
    }

    public function supervisors(Request $request)
    {
        $query = Supervisor::with('user')->withCount('assignments');

        if ($request->filled('search')) {
            $term = '%'.$request->input('search').'%';
            $query->whereHas('user', fn ($q) => $q->where('name', 'like', $term)->orWhere('email', 'like', $term));
        }

        return $this->ok('OK', $query->orderBy('id')->get());
    }

    public function applications(Request $request)
    {
        $query = Application::with(['student.user', 'internship.company']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return $this->ok('OK', ApplicationResource::collection($query->latest('applied_at')->paginate($request->integer('per_page', 15))));
    }

    public function reports(Request $request)
    {
        $query = Report::with(['assignment.student.user', 'assignment.company']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return $this->ok('OK', ReportResource::collection($query->latest('submitted_at')->paginate($request->integer('per_page', 15))));
    }

    public function assignments(Request $request)
    {
        $query = InternshipAssignment::with(['student.user', 'company', 'internship', 'supervisor.user']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return $this->ok('OK', AssignmentResource::collection($query->latest()->paginate($request->integer('per_page', 15))));
    }

    public function storeAssignment(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|integer|exists:students,id',
            'internship_id' => 'required|integer|exists:internships,id|unique:internship_assignments,internship_id,null,null,student_id,'.$request->integer('student_id'),
            'supervisor_id' => 'nullable|integer|exists:supervisors,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'status' => 'nullable|in:pending,active,completed,cancelled',
        ]);

        $internship = Internship::findOrFail($validated['internship_id']);

        $assignment = InternshipAssignment::create([
            'student_id' => $validated['student_id'],
            'company_id' => $internship->company_id,
            'internship_id' => $internship->id,
            'supervisor_id' => $validated['supervisor_id'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'status' => $validated['status'] ?? 'pending',
        ]);

        Workflow::log('assignment.created', 'Admin created an internship assignment', $assignment);

        if ($assignment->supervisor_id) {
            Workflow::assignmentAssigned($assignment->load(['student', 'supervisor.user', 'company', 'internship']));
        }

        return $this->ok('Assignment created successfully',
            new AssignmentResource($assignment->load(['student.user', 'company', 'internship', 'supervisor.user'])), 201);
    }

    public function updateAssignment(Request $request, InternshipAssignment $assignment)
    {
        $validated = $request->validate([
            'supervisor_id' => 'nullable|integer|exists:supervisors,id',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after:start_date',
            'status' => 'required|in:pending,active,completed,cancelled',
        ]);

        $hadSupervisor = $assignment->supervisor_id !== null;
        $previousStatus = $assignment->status;
        $assignment->update($validated);

        $assignment->load(['student', 'supervisor.user', 'company', 'internship']);

        if (! $hadSupervisor && $assignment->supervisor_id) {
            Workflow::assignmentAssigned($assignment);
        } elseif ($previousStatus !== $assignment->status) {
            Workflow::assignmentUpdated($assignment, 'assignment.status_changed',
                'Admin moved an assignment from '.$previousStatus.' to '.$assignment->status);
        } else {
            Workflow::log('assignment.updated', 'Admin updated an internship assignment', $assignment);
        }

        return $this->ok('Assignment updated successfully',
            new AssignmentResource($assignment->load(['student.user', 'company', 'internship', 'supervisor.user'])));
    }

    public function showAssignment(InternshipAssignment $assignment)
    {
        return $this->ok('OK', new AssignmentResource(
            $assignment->load(['student.user', 'company', 'internship', 'supervisor.user', 'reports', 'evaluations'])
        ));
    }
}
