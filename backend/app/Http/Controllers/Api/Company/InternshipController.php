<?php

namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInternshipRequest;
use App\Http\Resources\InternshipResource;
use App\Models\Internship;
use App\Support\ApiResponse;
use App\Support\Notify;
use App\Support\Workflow;
use Illuminate\Http\Request;

class InternshipController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Internship::with('period')->withCount('applications')
            ->where('company_id', $request->user()->company->id);

        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->input('approval_status'));
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->string('search').'%');
        }

        return $this->ok('OK', InternshipResource::collection(
            $query->latest()->paginate($request->integer('per_page', 15))
        ));
    }

    public function store(StoreInternshipRequest $request)
    {
        $internship = Internship::create([
            ...$request->validated(),
            'company_id' => $request->user()->company->id,
            'approval_status' => 'pending',
        ]);

        Workflow::log('internship.submitted', 'A company submitted an internship for approval', $internship);

        Notify::toAdmins('internship', 'Internship waiting for approval',
            $internship->title.' · '.$request->user()->company->company_name, '/admin/internships', $internship);

        return $this->ok('Internship created successfully. Awaiting admin approval.',
            new InternshipResource($internship->load('period')), 201);
    }

    public function update(StoreInternshipRequest $request, Internship $internship)
    {
        $this->authorizeCompany($request, $internship);

        $internship->update([...$request->validated(), 'approval_status' => 'pending', 'is_published' => false]);

        Workflow::log('internship.updated', 'A company updated the internship '.$internship->title, $internship);

        Notify::toAdmins('internship', 'Internship needs re-approval',
            $internship->title, '/admin/internships', $internship);

        return $this->ok('Internship updated successfully. Re-approval required.',
            new InternshipResource($internship->load('period')));
    }

    public function destroy(Request $request, Internship $internship)
    {
        $this->authorizeCompany($request, $internship);

        $internship->delete();

        Workflow::log('internship.deleted', 'A company deleted the internship '.$internship->title);

        return $this->ok('Internship deleted successfully');
    }

    public function publish(Request $request, Internship $internship)
    {
        $this->authorizeCompany($request, $internship);

        if ($internship->approval_status !== 'approved') {
            return $this->fail('Internship must be approved by an admin before publishing.');
        }

        if (! $request->user()->company?->isVerified()) {
            return $this->fail('Your company must be verified by an admin before publishing.');
        }

        $internship->update(['is_published' => true]);

        Workflow::logPublish($internship, true);

        return $this->ok('Internship published successfully', new InternshipResource($internship));
    }

    public function unpublish(Request $request, Internship $internship)
    {
        $this->authorizeCompany($request, $internship);

        $internship->update(['is_published' => false]);

        Workflow::logPublish($internship, false);

        return $this->ok('Internship unpublished successfully', new InternshipResource($internship));
    }

    private function authorizeCompany(Request $request, Internship $internship): void
    {
        abort_unless($internship->company_id === $request->user()->company?->id, 403, 'Not your internship.');
    }
}
