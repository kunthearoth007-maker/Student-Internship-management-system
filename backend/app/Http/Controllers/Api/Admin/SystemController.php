<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Department;
use App\Models\InternshipPeriod;
use App\Support\ApiResponse;
use App\Support\Workflow;
use Illuminate\Http\Request;

class SystemController extends Controller
{
    use ApiResponse;

    public function departments(Request $request)
    {
        $query = Department::withCount(['students', 'supervisors']);

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return $this->ok('OK', $query->orderBy('name')->get());
    }

    public function storeDepartment(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:departments,name',
            'code' => 'nullable|string|max:32|unique:departments,code',
            'description' => 'nullable|string|max:2000',
            'is_active' => 'nullable|boolean',
        ]);

        $department = Department::create($validated);

        Workflow::log('department.created', 'Admin created the department '.$department->name, $department);

        return $this->ok('Department created', $department, 201);
    }

    public function updateDepartment(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:departments,name,'.$department->id,
            'code' => 'nullable|string|max:32|unique:departments,code,'.$department->id,
            'description' => 'nullable|string|max:2000',
            'is_active' => 'nullable|boolean',
        ]);

        $department->update($validated);

        Workflow::log('department.updated', 'Admin updated the department '.$department->name, $department);

        return $this->ok('Department updated', $department);
    }

    public function destroyDepartment(Department $department)
    {
        $department->students()->update(['department_id' => null]);
        $department->supervisors()->update(['department_id' => null]);

        Workflow::log('department.deleted', 'Admin deleted the department '.$department->name);

        $department->delete();

        return $this->ok('Department deleted');
    }

    public function periods(Request $request)
    {
        $query = InternshipPeriod::withCount('internships');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return $this->ok('OK', $query->orderByDesc('starts_on')->get());
    }

    public function storePeriod(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:internship_periods,name',
            'starts_on' => 'required|date',
            'ends_on' => 'required|date|after:starts_on',
            'application_opens_on' => 'nullable|date|before_or_equal:starts_on',
            'application_closes_on' => 'nullable|date|before_or_equal:ends_on',
            'is_active' => 'nullable|boolean',
        ]);

        $period = InternshipPeriod::create($validated);

        Workflow::log('period.created', 'Admin opened the internship period '.$period->name, $period);

        return $this->ok('Period created', $period, 201);
    }

    public function updatePeriod(Request $request, InternshipPeriod $period)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:internship_periods,name,'.$period->id,
            'starts_on' => 'sometimes|required|date',
            'ends_on' => 'sometimes|required|date|after:starts_on',
            'application_opens_on' => 'nullable|date|before_or_equal:starts_on',
            'application_closes_on' => 'nullable|date|before_or_equal:ends_on',
            'is_active' => 'nullable|boolean',
        ]);

        $period->update($validated);

        Workflow::log('period.updated', 'Admin updated the internship period '.$period->name, $period);

        return $this->ok('Period updated', $period);
    }

    public function destroyPeriod(InternshipPeriod $period)
    {
        $period->internships()->update(['period_id' => null]);

        Workflow::log('period.deleted', 'Admin deleted the internship period '.$period->name);

        $period->delete();

        return $this->ok('Period deleted');
    }

    public function activityLogs(Request $request)
    {
        $query = ActivityLog::with('user')->latest();

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->filled('action')) {
            $query->where('action', 'like', $request->string('action').'%');
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        $paginator = $query->paginate($request->integer('per_page', 25));

        return $this->ok('OK', [
            'items' => collect($paginator->items())->map(fn (ActivityLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'role' => $log->role,
                'user' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email] : null,
                'subject' => $log->subject_type ? $log->subject_type.'#'.$log->subject_id : null,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->all(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
