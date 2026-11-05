<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\AssignmentResource;
use App\Http\Resources\StudentResource;
use App\Http\Resources\SupervisorResource;
use App\Support\ApiResponse;
use App\Support\FileStorage;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    use ApiResponse;

    public function update(Request $request)
    {
        $student = $request->user()->student;

        $validated = $request->validate([
            'phone' => 'nullable|string|max:20',
            'gender' => 'nullable|in:male,female',
            'date_of_birth' => 'nullable|date|before:today',
            'major' => 'nullable|string|max:255',
            'department_id' => 'nullable|integer|exists:departments,id',
            'year' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:2000',
            'skills' => 'nullable|array|max:30',
            'skills.*' => 'string|max:50',
            'profile_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'cv' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        if ($request->hasFile('profile_image')) {
            $student->profile_image = FileStorage::replace(
                $student->profile_image, $request->file('profile_image'), 'avatars'
            );
        }

        if ($request->hasFile('cv')) {
            $student->cv = FileStorage::replace($student->cv, $request->file('cv'), 'cvs');
        }

        $student->fill(collect($validated)->except(['profile_image', 'cv'])->toArray());
        $student->save();

        return $this->ok('Profile updated successfully', new StudentResource($student));
    }

    public function assignments(Request $request)
    {
        $assignments = $request->user()->student->assignments()
            ->with(['company', 'internship', 'supervisor.user'])
            ->latest()
            ->get();

        return $this->ok('OK', AssignmentResource::collection($assignments));
    }

    public function dashboard(Request $request)
    {
        $student = $request->user()->student->load(['user', 'department']);
        $user = $request->user();

        $current = $student->assignments()
            ->with(['company', 'internship', 'supervisor.user', 'supervisor.department'])
            ->whereIn('status', ['pending', 'active'])
            ->latest()
            ->first();

        $assignmentIds = $student->assignments()->pluck('id')->all();

        $attendance = \App\Models\AttendanceRecord::whereIn('assignment_id', $assignmentIds)->get();
        $byStatus = $attendance->groupBy('status')->map->count();
        $days = $attendance->count();

        $reports = \App\Models\Report::whereIn('assignment_id', $assignmentIds)->get();

        return $this->ok('OK', [
            'student' => new StudentResource($student),
            'stats' => [
                'applied' => $student->applications()->count(),
                'offers_pending' => $student->applications()->where('status', 'offered')
                    ->where(fn ($q) => $q->whereNull('offer_deadline')->orWhere('offer_deadline', '>', now()))->count(),
                'accepted' => $student->applications()->where('status', 'accepted')->count(),
                'reports' => $reports->count(),
                'reports_pending_review' => $reports->where('status', 'submitted')->count(),
                'unread_messages' => \App\Models\Conversation::with('participants')
                    ->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))
                    ->get()
                    ->sum(fn ($conversation) => $conversation->unreadFor($user)),
            ],
            'attendance' => $days > 0 ? [
                'days' => $days,
                'present' => $byStatus->get('present', 0),
                'late' => $byStatus->get('late', 0),
                'absent' => $byStatus->get('absent', 0),
                'excused' => $byStatus->get('excused', 0),
                'hours' => round((float) $attendance->sum('hours'), 1),
                'attendance_rate' => round((($byStatus->get('present', 0) + $byStatus->get('late', 0)) / $days) * 100, 1),
            ] : null,
            'supervisor' => $current?->supervisor ? new SupervisorResource($current->supervisor->load('user')) : null,
            'upcoming_meetings' => \App\Models\Meeting::where('student_user_id', $user->id)
                ->upcoming()->take(3)->get()->map(fn ($meeting) => [
                    'id' => $meeting->id,
                    'title' => $meeting->title,
                    'scheduled_on' => $meeting->scheduled_on?->toDateString(),
                    'scheduled_at' => $meeting->scheduled_at,
                    'location' => $meeting->location,
                    'with' => $meeting->host?->name,
                ])->all(),
            'current_internship' => $current ? new AssignmentResource($current) : null,
        ]);
    }
}
