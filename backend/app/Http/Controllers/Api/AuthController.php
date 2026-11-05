<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Company;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Notify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    use ApiResponse;

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => 'required|in:student,company,supervisor',
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
                'company_name' => $validated['name'],
            ]),
            'supervisor' => Supervisor::create([
                'user_id' => $user->id,
                'employee_id' => 'SUP'.str_pad((string) $user->id, 5, '0', STR_PAD_LEFT),
            ]),
        };

        $token = $user->createToken('api')->plainTextToken;

        if ($user->role === User::ROLE_COMPANY) {
            Notify::toAdmins('company', 'New company awaiting verification',
                $user->company->company_name, '/admin/companies', $user->company);

            Notify::log('company.registered', $user->company->company_name.' registered a company account', $user->company);
        } else {
            Notify::log('user.registered', "New {$user->role} account registered: ".$user->email, $user);
        }

        return $this->ok($user->role === User::ROLE_COMPANY
            ? 'Registered. An administrator must verify your company before you can publish internships.'
            : 'Registered successfully', [
            'user' => new UserResource($user->load(['student', 'company', 'supervisor'])),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return $this->fail('The provided credentials are incorrect.', 401);
        }

        if ($user->isSuspended()) {
            return $this->fail('This account has been suspended. Contact an administrator.', 403);
        }

        $token = $user->createToken('api')->plainTextToken;

        Notify::log('user.login', $user->role.' '.$user->email.' signed in', $user);

        return $this->ok('Login successful', [
            'user' => new UserResource($user->load(['student', 'company', 'supervisor'])),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return $this->ok('Logged out successfully');
    }

    public function me(Request $request)
    {
        return $this->ok('OK', new UserResource(
            $request->user()->load(['student', 'company', 'supervisor'])
        ));
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,'.$user->id,
        ]);

        $user->update($validated);

        return $this->ok('Profile updated successfully', new UserResource($user));
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        if (! Hash::check($validated['current_password'], $user->password)) {
            return $this->fail('Current password is incorrect.', 422, [
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $validated['password']]);

        return $this->ok('Password changed successfully');
    }
}
