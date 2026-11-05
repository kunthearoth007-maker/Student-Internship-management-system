<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InternshipResource;
use App\Models\Internship;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class InternshipController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Internship::query()->with(['company', 'period'])->withCount('applications');

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%"));
        }

        foreach (['category', 'location'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        if ($request->filled('company_id')) {
            $query->where('company_id', $request->integer('company_id'));
        }

        $user = $request->user();
        $filtersOwn = $user && $user->role === 'company' && $request->boolean('mine');

        if ($filtersOwn && $user->company) {
            $query->where('company_id', $user->company->id);
        } elseif ($user && $user->role === 'admin') {
            if ($request->filled('approval_status')) {
                $query->where('approval_status', $request->input('approval_status'));
            }
        } else {
            $query->where('approval_status', 'approved')->where('is_published', true);
        }

        return $this->ok('OK', InternshipResource::collection(
            $query->latest()->paginate($request->integer('per_page', 12))
        ));
    }

    public function show(Request $request, Internship $internship)
    {
        $user = $request->user();

        $visible = $internship->approval_status === 'approved' && $internship->is_published
            || ($user?->role === 'admin')
            || ($user?->role === 'company' && $user->company && $internship->company_id === $user->company->id);

        if (! $visible) {
            return $this->fail('Internship not found.', 404);
        }

        return $this->ok('OK', new InternshipResource(
            $internship->load(['company', 'period'])->loadCount('applications')
        ));
    }
}
