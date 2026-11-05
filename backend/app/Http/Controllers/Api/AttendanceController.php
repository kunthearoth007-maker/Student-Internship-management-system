<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\InternshipAssignment;
use App\Models\User;
use App\Support\Access;
use App\Support\ApiResponse;
use App\Support\Notify;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $user = $request->user();

        $query = AttendanceRecord::with(['assignment.student.user', 'assignment.supervisor.user', 'recorder'])
            ->whereIn('assignment_id', $this->scopeIds($user));

        if ($request->filled('assignment_id')) {
            $query->where('assignment_id', $request->integer('assignment_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('from')) {
            $query->whereDate('recorded_on', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('recorded_on', '<=', $request->date('to'));
        }

        $paginator = $query->orderByDesc('recorded_on')->paginate($request->integer('per_page', 25));

        return $this->ok('OK', [
            'items' => collect($paginator->items())->map(fn (AttendanceRecord $r) => [
                'id' => $r->id,
                'assignment_id' => $r->assignment_id,
                'student' => $r->assignment?->student?->user?->name,
                'internship' => $r->assignment?->internship?->title,
                'company' => $r->assignment?->company?->company_name,
                'recorded_on' => $r->recorded_on?->toDateString(),
                'status' => $r->status,
                'hours' => $r->hours,
                'note' => $r->note,
                'recorded_by' => $r->recorder?->name,
            ])->all(),
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

        abort_unless(in_array($user->role, [User::ROLE_SUPERVISOR, User::ROLE_COMPANY, User::ROLE_ADMIN], true),
            403, 'Only supervisors, companies and admins record attendance.');

        $validated = $request->validate([
            'assignment_id' => 'required|integer',
            'recorded_on' => 'required|date',
            'status' => 'required|in:'.implode(',', AttendanceRecord::STATUSES),
            'hours' => 'nullable|numeric|min:0|max:24',
            'note' => 'nullable|string|max:1000',
        ]);

        $assignment = InternshipAssignment::with('student.user')->findOrFail($validated['assignment_id']);

        if (! in_array($assignment->id, $this->scopeIds($user), true)) {
            return $this->fail('This intern is not assigned to you.', 403);
        }

        if (! in_array($assignment->status, ['pending', 'active'], true)) {
            return $this->fail('Attendance can only be recorded for a pending or active internship.');
        }

        $record = AttendanceRecord::updateOrCreate(
            ['assignment_id' => $assignment->id, 'recorded_on' => $validated['recorded_on']],
            [
                'recorded_by' => $user->id,
                'status' => $validated['status'],
                'hours' => $validated['hours'] ?? null,
                'note' => $validated['note'] ?? null,
            ]
        );

        Notify::log('attendance.recorded',
            $user->name.' marked '.$assignment->student?->user?->name.' as '.$record->status.' on '.$record->recorded_on->toDateString(),
            $assignment,
            ['assignment_id' => $assignment->id, 'status' => $record->status]
        );

        return $this->ok('Attendance saved', [
            'id' => $record->id,
            'assignment_id' => $record->assignment_id,
            'recorded_on' => $record->recorded_on->toDateString(),
            'status' => $record->status,
            'hours' => $record->hours,
        ], 201);
    }

    public function summary(Request $request)
    {
        $user = $request->user();

        $assignmentId = $request->integer('assignment_id') ?: null;

        if ($assignmentId && ! in_array($assignmentId, $this->scopeIds($user), true)) {
            throw ValidationException::withMessages(['assignment_id' => 'Not your internship.']);
        }

        $rows = AttendanceRecord::with('assignment.student.user')
            ->when($assignmentId, fn ($q) => $q->where('assignment_id', $assignmentId))
            ->whereIn('assignment_id', $this->scopeIds($user))
            ->get()
            ->groupBy(fn (AttendanceRecord $r) => $r->assignment_id);

        $summaries = $rows->map(function ($records, $id) {
            $byStatus = $records->groupBy('status')->map->count();

            return [
                'assignment_id' => $id,
                'student' => $records->first()->assignment?->student?->user?->name,
                'internship' => $records->first()->assignment?->internship?->title,
                'days' => $records->count(),
                'present' => $byStatus->get('present', 0),
                'late' => $byStatus->get('late', 0),
                'absent' => $byStatus->get('absent', 0),
                'excused' => $byStatus->get('excused', 0),
                'hours' => round((float) $records->sum('hours'), 1),
                'attendance_rate' => $records->count() > 0
                    ? round((($byStatus->get('present', 0) + $byStatus->get('late', 0)) / $records->count()) * 100, 1)
                    : null,
                'last_recorded_on' => $records->max('recorded_on')?->toDateString(),
            ];
        })->values();

        return $this->ok('OK', $summaries);
    }

    private function scopeIds(User $user): array
    {
        return $user->isAdmin()
            ? InternshipAssignment::pluck('id')->all()
            : Access::assignmentIdsFor($user);
    }
}
