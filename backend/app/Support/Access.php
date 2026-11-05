<?php

namespace App\Support;

use App\Models\InternshipAssignment;
use App\Models\User;

/** Answers "may these two accounts talk about an internship?" for the messaging and meeting features. */
class Access
{
    /** Every internship a user participates in, as an assignment collection scoped to their profile. */
    public static function assignmentsFor(User $user)
    {
        return match ($user->role) {
            User::ROLE_STUDENT => InternshipAssignment::with(['student.user', 'company.user', 'supervisor.user', 'internship'])
                ->where('student_id', $user->student?->id ?? 0),
            User::ROLE_COMPANY => InternshipAssignment::with(['student.user', 'company.user', 'supervisor.user', 'internship'])
                ->where('company_id', $user->company?->id ?? 0),
            User::ROLE_SUPERVISOR => InternshipAssignment::with(['student.user', 'company.user', 'supervisor.user', 'internship'])
                ->where('supervisor_id', $user->supervisor?->id ?? 0),
            User::ROLE_ADMIN => InternshipAssignment::with(['student.user', 'company.user', 'supervisor.user', 'internship']),
            default => InternshipAssignment::with(['student.user', 'company.user', 'supervisor.user', 'internship'])->whereRaw('1 = 0'),
        };
    }

    /** The accounts this user is allowed to open a conversation with. */
    public static function contactIds(User $user): array
    {
        if ($user->isAdmin()) {
            return User::where('id', '!=', $user->id)->where('is_suspended', false)->pluck('id')->all();
        }

        $ids = [];

        foreach (self::assignmentsFor($user)->get() as $assignment) {
            foreach ([$assignment->student?->user_id, $assignment->company?->user_id, $assignment->supervisor?->user_id] as $id) {
                if ($id && $id !== $user->id) {
                    $ids[] = $id;
                }
            }
        }

        return array_values(array_unique($ids));
    }

    public static function canContact(User $user, User $target): bool
    {
        return $target->id !== $user->id
            && ! $target->isSuspended()
            && in_array($target->id, self::contactIds($user), true);
    }

    /** Assignments the user may attach a meeting to; students only see their own. */
    public static function assignmentIdsFor(User $user): array
    {
        return self::assignmentsFor($user)->pluck('id')->all();
    }
}
