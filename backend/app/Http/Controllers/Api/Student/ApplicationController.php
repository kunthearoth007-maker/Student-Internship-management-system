<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApplicationRequest;
use App\Http\Resources\ApplicationResource;
use App\Models\Application;
use App\Models\Internship;
use App\Models\InternshipAssignment;
use App\Support\ApiResponse;
use App\Support\FileStorage;
use App\Support\Notify;
use App\Support\Workflow;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $this->expireStaleOffers($request);

        $applications = Application::with('internship.company')
            ->where('student_id', $request->user()->student->id)
            ->latest('applied_at')
            ->paginate($request->integer('per_page', 15));

        return $this->ok('OK', ApplicationResource::collection($applications));
    }

    public function show(Request $request, Application $application)
    {
        abort_unless($application->student_id === $request->user()->student?->id, 403);

        return $this->ok('OK', new ApplicationResource($application->load('internship.company', 'student')));
    }

    public function store(StoreApplicationRequest $request)
    {
        $student = $request->user()->student;
        $internship = Internship::find($request->integer('internship_id'));

        if (! $internship->isOpen()) {
            return $this->fail('This internship is not open for applications.');
        }

        if ($internship->application_deadline->isPast()) {
            return $this->fail('The application deadline has passed.');
        }

        $exists = Application::where('student_id', $student->id)
            ->where('internship_id', $internship->id)
            ->exists();

        if ($exists) {
            return $this->fail('You already applied to this internship.', 422, [
                'internship_id' => ['You already applied to this internship.'],
            ]);
        }

        $cvPath = $student->cv;

        if ($request->hasFile('cv')) {
            $cvPath = FileStorage::store($request->file('cv'), 'cvs');
        }

        if (! $cvPath) {
            return $this->fail('Please upload your CV or add one to your profile first.');
        }

        $application = Application::create([
            'student_id' => $student->id,
            'internship_id' => $internship->id,
            'cover_letter' => $request->input('cover_letter'),
            'cv' => $cvPath,
            'status' => 'pending',
            'applied_at' => now(),
        ]);

        Notify::log('application.submitted',
            $student->user->name.' applied to '.$internship->title, $application);

        Notify::to(Notify::user($internship->company), 'application', 'New application received',
            $student->user->name.' · '.$internship->title, '/company/applications', $application);

        return $this->ok('Application submitted successfully. Status: Pending',
            new ApplicationResource($application->load('internship')), 201);
    }

    public function acceptOffer(Request $request, Application $application)
    {
        abort_unless($application->student_id === $request->user()->student?->id, 403);

        if ($application->status !== 'offered') {
            return $this->fail('You have no open offer for this application.');
        }

        if (! $application->isOfferPending()) {
            return $this->fail('This offer has expired.');
        }

        Workflow::acceptOffer($application);

        return $this->ok('Offer accepted. Your internship is now waiting for supervisor assignment.',
            new ApplicationResource($application->load('internship.company', 'internship')));
    }

    public function declineOffer(Request $request, Application $application)
    {
        abort_unless($application->student_id === $request->user()->student?->id, 403);

        if ($application->status !== 'offered') {
            return $this->fail('You have no open offer for this application.');
        }

        $validated = $request->validate(['reason' => 'nullable|string|max:1000']);

        Workflow::declineOffer($application, $validated['reason'] ?? null);

        return $this->ok('Offer declined', new ApplicationResource($application));
    }

    public function cancel(Request $request, Application $application)
    {
        abort_unless($application->student_id === $request->user()->student?->id, 403);

        if (! in_array($application->status, ['pending', 'reviewing'], true)) {
            return $this->fail('Only pending or reviewing applications can be cancelled.');
        }

        Workflow::cancelApplication($application);

        return $this->ok('Application cancelled successfully', new ApplicationResource($application));
    }

    /** Offers the student never answered become expired, and the seat is released. */
    private function expireStaleOffers(Request $request): void
    {
        Application::where('student_id', $request->user()->student->id)
            ->where('status', 'offered')
            ->whereNotNull('offer_deadline')
            ->where('offer_deadline', '<', now())
            ->each(function (Application $application) {
                InternshipAssignment::where('student_id', $application->student_id)
                    ->where('internship_id', $application->internship_id)
                    ->where('status', 'pending')
                    ->update(['status' => 'cancelled']);

                $application->update(['status' => 'expired']);

                Notify::to(Notify::user($application->internship->company), 'offer', 'Offer expired',
                    $application->student->user->name.' did not respond in time', '/company/applications', $application);
            });
    }
}
