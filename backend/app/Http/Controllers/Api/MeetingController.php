<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InternshipAssignment;
use App\Models\Meeting;
use App\Models\User;
use App\Support\Access;
use App\Support\ApiResponse;
use App\Support\Notify;
use Illuminate\Http\Request;

class MeetingController extends Controller
{
    use ApiResponse;

    private const RULES = [
        'title' => 'required|string|max:255',
        'agenda' => 'nullable|string|max:5000',
        'scheduled_on' => 'required|date',
        'scheduled_at' => 'required|date_format:H:i',
        'duration_minutes' => 'nullable|integer|min:5|max:480',
        'location' => 'nullable|string|max:255',
    ];

    public function index(Request $request)
    {
        $user = $request->user();
        $assignmentIds = Access::assignmentIdsFor($user);

        $query = Meeting::with(['host', 'student', 'assignment.internship', 'assignment.company'])
            ->where(function ($q) use ($user, $assignmentIds) {
                $q->where('student_user_id', $user->id)
                    ->orWhere('host_user_id', $user->id)
                    ->orWhereIn('assignment_id', $assignmentIds);
            });

        if ($request->input('scope') === 'upcoming') {
            $query->upcoming();
        } else {
            $query->orderByDesc('scheduled_on')->orderByDesc('scheduled_at');
        }

        $paginator = $query->paginate($request->integer('per_page', 25));

        return $this->ok('OK', [
            'items' => collect($paginator->items())->map(fn (Meeting $m) => $this->row($m, $user))->all(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate(self::RULES + [
            'assignment_id' => 'required|integer',
        ]);

        if ($user->role === User::ROLE_STUDENT) {
            return $this->fail('Students cannot schedule meetings. Ask your supervisor or company.', 403);
        }

        $assignment = InternshipAssignment::with(['student.user', 'supervisor.user', 'company.user'])
            ->findOrFail($validated['assignment_id']);

        abort_unless(in_array($assignment->id, Access::assignmentIdsFor($user), true), 403, 'Not your internship.');

        $studentUser = $assignment->student?->user;

        if (! $studentUser) {
            return $this->fail('This assignment has no student account.');
        }

        $meeting = Meeting::create([
            'assignment_id' => $assignment->id,
            'host_user_id' => $user->id,
            'student_user_id' => $studentUser->id,
            'title' => $validated['title'],
            'agenda' => $validated['agenda'] ?? null,
            'scheduled_on' => $validated['scheduled_on'],
            'scheduled_at' => $validated['scheduled_at'],
            'duration_minutes' => $validated['duration_minutes'] ?? 30,
            'location' => $validated['location'] ?? null,
            'status' => Meeting::STATUS_SCHEDULED,
        ]);

        $summary = $this->when($meeting).' · '.($meeting->location ?: 'location to be confirmed');

        foreach ($this->watchers($meeting, $user) as $recipient) {
            Notify::to($recipient, 'meeting', 'Meeting scheduled: '.$meeting->title,
                $summary, '/meetings', $meeting);
        }

        Notify::log('meeting.scheduled', $user->name.' scheduled the meeting '.$meeting->title, $meeting);

        return $this->ok('Meeting scheduled', $this->row($meeting->load(['host', 'student', 'assignment.internship', 'assignment.company']), $user), 201);
    }

    public function update(Request $request, Meeting $meeting)
    {
        $user = $request->user();
        $this->authorizeParticipant($user, $meeting);

        $validated = $request->validate(self::RULES + [
            'status' => 'nullable|in:'.implode(',', Meeting::STATUSES),
            'outcome' => 'nullable|string|max:5000',
        ]);

        $meeting->update(collect($validated)->only([
            'title', 'agenda', 'scheduled_on', 'scheduled_at', 'duration_minutes', 'location', 'status', 'outcome',
        ])->filter(fn ($v) => $v !== null)->all() + ['status' => $validated['status'] ?? $meeting->status]);

        $meeting->load(['host', 'student', 'assignment.internship', 'assignment.company']);

        foreach ($this->watchers($meeting, $user) as $recipient) {
            Notify::to($recipient, 'meeting', match ($meeting->status) {
                Meeting::STATUS_COMPLETED => 'Meeting completed: '.$meeting->title,
                Meeting::STATUS_CANCELLED => 'Meeting cancelled: '.$meeting->title,
                default => 'Meeting updated: '.$meeting->title,
            }, $this->when($meeting), '/meetings', $meeting);
        }

        Notify::log($meeting->status === Meeting::STATUS_SCHEDULED ? 'meeting.updated' : 'meeting.'.$meeting->status,
            $user->name.' set the meeting '.$meeting->title.' to '.$meeting->status, $meeting);

        return $this->ok('Meeting '.$meeting->status, $this->row($meeting, $user));
    }

    public function destroy(Request $request, Meeting $meeting)
    {
        $user = $request->user();
        $this->authorizeHost($user, $meeting);

        $meeting->delete();

        Notify::log('meeting.deleted', $user->name.' removed the meeting '.$meeting->title);

        return $this->ok('Meeting removed');
    }

    private function row(Meeting $meeting, User $user): array
    {
        return [
            'id' => $meeting->id,
            'title' => $meeting->title,
            'agenda' => $meeting->agenda,
            'outcome' => $meeting->outcome,
            'scheduled_on' => $meeting->scheduled_on?->toDateString(),
            'scheduled_at' => $meeting->scheduled_at,
            'duration_minutes' => $meeting->duration_minutes,
            'location' => $meeting->location,
            'status' => $meeting->status,
            'is_host' => $meeting->host_user_id === $user->id,
            'is_student' => $meeting->student_user_id === $user->id,
            'student' => $meeting->student?->name,
            'host' => $meeting->host?->name,
            'company' => $meeting->assignment?->company?->company_name,
            'internship' => $meeting->assignment?->internship?->title,
        ];
    }

    private function watchers(Meeting $meeting, User $actor): array
    {
        $meeting->loadMissing(['assignment.supervisor.user', 'assignment.company.user']);

        $people = array_filter([
            $meeting->student,
            $meeting->host,
            $meeting->assignment?->supervisor?->user,
            $meeting->assignment?->company?->user,
        ]);

        $unique = [];

        foreach ($people as $person) {
            if ($person->id !== $actor->id) {
                $unique[$person->id] = $person;
            }
        }

        return array_values($unique);
    }

    private function when(Meeting $meeting): string
    {
        return $meeting->scheduled_on?->toDateString().' at '.$meeting->scheduled_at;
    }

    private function authorizeParticipant(User $user, Meeting $meeting): void
    {
        abort_unless($user->isAdmin()
            || in_array($user->id, [$meeting->student_user_id, $meeting->host_user_id], true)
            || ($user->role === User::ROLE_COMPANY && $meeting->assignment?->company_id === $user->company?->id),
            403, 'Not your meeting.');
    }

    private function authorizeHost(User $user, Meeting $meeting): void
    {
        abort_unless($user->isAdmin() || $meeting->host_user_id === $user->id, 403, 'Only the host can remove a meeting.');
    }
}
