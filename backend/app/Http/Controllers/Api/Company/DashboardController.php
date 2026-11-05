<?php

namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use App\Http\Resources\AssignmentResource;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\InternshipResource;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use App\Support\ApiResponse;
use App\Support\FileStorage;
use App\Support\Workflow;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $company = $request->user()->company;

        return $this->ok('OK', [
            'company' => new CompanyResource($company),
            'stats' => [
                'internships' => $company->internships()->count(),
                'applications' => $company->internships()
                    ->whereHas('applications')->withSum('applications as applications_count', 'id')
                    ->get()->sum('applications_count'),
                'active_interns' => $company->assignments()->where('status', 'active')->count(),
                'offers_awaiting_reply' => \App\Models\Application::whereIn('status', ['offered'])
                    ->whereHas('internship', fn ($q) => $q->where('company_id', $company->id))->count(),
            ],
            'recent_applications' => \App\Http\Resources\ApplicationResource::collection(
                \App\Models\Application::with(['student.user', 'internship'])
                    ->whereHas('internship', fn ($q) => $q->where('company_id', $company->id))
                    ->latest('applied_at')->take(5)->get()
            ),
            'interns' => AssignmentResource::collection(
                $company->assignments()->with('student.user')->latest()->take(10)->get()
            ),
        ]);
    }

    public function requestVerification(Request $request)
    {
        $company = $request->user()->company;

        if ($company->verification_status === 'verified') {
            return $this->fail('This company is already verified.');
        }

        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'address' => 'required|string|max:255',
            'website' => 'nullable|url|max:255',
            'description' => 'required|string|max:5000',
        ]);

        $company->update([...$validated, 'verification_status' => 'pending', 'verified_at' => null]);

        Workflow::companySubmittedForVerification($company);

        return $this->ok('Verification request submitted. An admin will review your company.',
            new CompanyResource($company));
    }

    public function assignments(Request $request)
    {
        $query = $request->user()->company->assignments()
            ->with(['student.user', 'internship', 'supervisor.user', 'conversations']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return $this->ok('OK', AssignmentResource::collection(
            $query->latest()->paginate($request->integer('per_page', 15))
        ));
    }

    public function reports(Request $request)
    {
        $query = $this->reportQuery($request)
            ->with(['assignment.student.user', 'assignment.internship', 'feedbacks.supervisor.user']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return $this->ok('OK', ReportResource::collection(
            $query->latest('submitted_at')->paginate($request->integer('per_page', 15))
        ));
    }

    public function showReport(Request $request, Report $report)
    {
        abort_unless($report->assignment?->company_id === $request->user()->company?->id, 403, 'Not your intern.');

        return $this->ok('OK', new ReportResource(
            $report->load(['assignment.student.user', 'assignment.internship', 'assignment.supervisor.user', 'feedbacks.supervisor.user'])
        ));
    }

    private function reportQuery(Request $request)
    {
        $companyId = $request->user()->company?->id;

        return Report::query()->whereHas(
            'assignment', fn ($q) => $q->where('company_id', $companyId)
        );
    }

    public function updateAssignmentStatus(Request $request, \App\Models\InternshipAssignment $assignment)
    {
        abort_unless($assignment->company_id === $request->user()->company?->id, 403, 'Not your intern.');

        $validated = $request->validate(['status' => 'required|in:pending,active,completed,cancelled']);

        $assignment->update(['status' => $validated['status']]);

        Workflow::assignmentUpdated($assignment->load(['student', 'internship', 'supervisor']),
            'assignment.company_status',
            'A company set an assignment to '.$validated['status']);

        return $this->ok('Assignment status updated', new AssignmentResource($assignment->load(['student.user', 'internship', 'supervisor.user'])));
    }

    public function update(Request $request)
    {
        $company = $request->user()->company;

        $validated = $request->validate([
            'company_name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'website' => 'nullable|url|max:255',
            'description' => 'nullable|string|max:5000',
            'logo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            $company->logo = FileStorage::replace($company->logo, $request->file('logo'), 'logos');
        }

        $company->fill(collect($validated)->except('logo')->toArray());
        $company->save();

        return $this->ok('Company profile updated successfully', new CompanyResource($company));
    }
}
