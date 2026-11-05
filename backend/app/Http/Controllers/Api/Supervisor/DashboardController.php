<?php

namespace App\Http\Controllers\Api\Supervisor;

use App\Http\Controllers\Controller;
use App\Http\Resources\AssignmentResource;
use App\Http\Resources\SupervisorResource;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $supervisor = $request->user()->supervisor;
        $assignments = $supervisor->assignments();

        $upcomingMeetings = \App\Models\Meeting::query()
            ->where(function ($q) use ($supervisor, $request) {
                $q->where('host_user_id', $request->user()->id)
                    ->orWhereHas('assignment', fn ($a) => $a->where('supervisor_id', $supervisor->id));
            })
            ->upcoming()
            ->count();

        return $this->ok('OK', [
            'supervisor' => new SupervisorResource($supervisor->load(['user', 'department'])),
            'stats' => [
                'assigned_students' => $assignments->count(),
                'pending_reports' => \App\Models\Report::whereHas(
                    'assignment', fn ($q) => $q->where('supervisor_id', $supervisor->id)
                )->where('status', 'submitted')->count(),
                'completed' => $assignments->where('status', 'completed')->count(),
                'upcoming_meetings' => $upcomingMeetings,
            ],
            'students' => AssignmentResource::collection(
                $supervisor->assignments()->with(['student.user', 'company', 'internship'])->get()
            ),
        ]);
    }

    public function students(Request $request)
    {
        $query = $request->user()->supervisor->assignments()
            ->with(['student.user', 'company', 'internship']);

        if ($request->filled('search')) {
            $s = $request->string('search');
            $query->whereHas('student.user', fn ($u) => $u->where('name', 'like', "%{$s}%"))
                ->orWhereHas('student', fn ($q) => $q->where('student_id', 'like', "%{$s}%"));
        }

        return $this->ok('OK', AssignmentResource::collection(
            $query->latest()->paginate($request->integer('per_page', 15))
        ));
    }

    public function updateProfile(Request $request)
    {
        $supervisor = $request->user()->supervisor;

        $validated = $request->validate([
            'department_id' => 'nullable|integer|exists:departments,id',
            'phone' => 'nullable|string|max:20',
        ]);

        $supervisor->update($validated);

        return $this->ok('Profile updated successfully',
            new SupervisorResource($supervisor->load(['user', 'department'])));
    }
}
