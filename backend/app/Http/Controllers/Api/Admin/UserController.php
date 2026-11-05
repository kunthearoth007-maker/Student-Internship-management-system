<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\StudentResource;
use App\Http\Resources\SupervisorResource;
use App\Http\Resources\UserResource;
use App\Models\Company;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Workflow;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    use ApiResponse;

    public function students(Request $request)
    {
        $query = Student::with(['user', 'department']);

        if ($request->filled('search')) {
            $s = $request->string('search');
            $query->where(fn ($q) => $q->where('student_id', 'like', "%{$s}%")
                ->orWhere('major', 'like', "%{$s}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%")));
        }

        return $this->ok('OK', StudentResource::collection($query->paginate($request->integer('per_page', 15))));
    }

    public function companies(Request $request)
    {
        $query = Company::with('user');

        if ($request->filled('search')) {
            $s = $request->string('search');
            $query->where(fn ($q) => $q->where('company_name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%"));
        }

        if ($request->filled('verification_status')) {
            $query->where('verification_status', $request->input('verification_status'));
        }

        return $this->ok('OK', CompanyResource::collection($query->paginate($request->integer('per_page', 15))));
    }

    public function supervisors(Request $request)
    {
        $query = Supervisor::with(['user', 'department'])->withCount('assignments');

        if ($request->filled('search')) {
            $s = $request->string('search');
            $query->where(fn ($q) => $q->where('employee_id', 'like', "%{$s}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")));
        }

        return $this->ok('OK', SupervisorResource::collection($query->paginate($request->integer('per_page', 15))));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)],
            'role' => 'required|in:admin,student,company,supervisor',
            'company_name' => 'required_if:role,company|string|max:255',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
        ]);

        match ($validated['role']) {
            'student' => Student::create([
                'user_id' => $user->id,
                'student_id' => 'RUPP'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT),
            ]),
            'company' => Company::create([
                'user_id' => $user->id,
                'company_name' => $validated['company_name'] ?? $validated['name'],
            ]),
            'supervisor' => Supervisor::create([
                'user_id' => $user->id,
                'employee_id' => 'SUP'.str_pad((string) $user->id, 5, '0', STR_PAD_LEFT),
            ]),
            default => null,
        };

        return $this->ok('User created successfully', new UserResource($user), 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,'.$user->id,
            'role' => 'sometimes|required|in:admin,student,company,supervisor',
        ]);

        $user->update($validated);

        return $this->ok('User updated successfully', new UserResource($user));
    }

    public function suspend(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return $this->fail('You cannot suspend your own account.');
        }

        Workflow::userSuspended($user, true);

        return $this->ok('Account suspended', new UserResource($user));
    }

    public function reactivate(Request $request, User $user)
    {
        Workflow::userSuspended($user, false);

        return $this->ok('Account reactivated', new UserResource($user));
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return $this->fail('You cannot delete your own account.');
        }

        Workflow::log('user.deleted', "Admin deleted the {$user->role} account ".$user->email, $user);

        $user->delete();

        return $this->ok('User deleted successfully');
    }
}
