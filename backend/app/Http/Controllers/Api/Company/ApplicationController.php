<?php

namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApplicationResource;
use App\Models\Application;
use App\Support\ApiResponse;
use App\Support\Workflow;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Application::with(['student.user', 'internship'])
            ->whereHas('internship', fn ($q) => $q->where('company_id', $request->user()->company->id));

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('internship_id')) {
            $query->where('internship_id', $request->integer('internship_id'));
        }

        return $this->ok('OK', ApplicationResource::collection(
            $query->latest('applied_at')->paginate($request->integer('per_page', 15))
        ));
    }

    public function show(Request $request, Application $application)
    {
        $this->authorizeCompany($request, $application);

        return $this->ok('OK', new ApplicationResource($application->load('student.user', 'internship')));
    }

    public function review(Request $request, Application $application)
    {
        $this->authorizeCompany($request, $application);

        if ($application->status !== 'pending') {
            return $this->fail('Only pending applications can be moved to reviewing.');
        }

        Workflow::reviewApplication($application, $request->user()->company);

        return $this->ok('Application is now under review', new ApplicationResource($application));
    }

    public function accept(Request $request, Application $application)
    {
        $this->authorizeCompany($request, $application);

        if (! in_array($application->status, ['pending', 'reviewing'], true)) {
            return $this->fail('This application can no longer receive an offer.');
        }

        Workflow::sendOffer($application, $request->user()->company);

        return $this->ok('Offer sent. The student has 7 days to respond.',
            new ApplicationResource($application->fresh()->load('student.user', 'internship')));
    }

    public function reject(Request $request, Application $application)
    {
        $this->authorizeCompany($request, $application);

        if (! in_array($application->status, ['pending', 'reviewing'], true)) {
            return $this->fail('This application can no longer be rejected.');
        }

        Workflow::rejectApplication($application, $request->user()->company);

        return $this->ok('Applicant rejected', new ApplicationResource($application));
    }

    private function authorizeCompany(Request $request, Application $application): void
    {
        abort_unless(
            $application->internship->company_id === $request->user()->company?->id,
            403,
            'Not your application.'
        );
    }
}
