<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class Notify
{
    /** Resolve the login account behind a profile row (Student/Company/Supervisor) or pass a User through. */
    public static function user(mixed $owner): ?User
    {
        if ($owner === null) {
            return null;
        }

        if ($owner instanceof User) {
            return $owner;
        }

        if ($owner instanceof Model) {
            $id = $owner->getAttribute('user_id');

            return $id ? User::find($id) : null;
        }

        return null;
    }

    public static function log(string $action, string $description, ?Model $subject = null, array $properties = []): void
    {
        $actor = auth()->user();

        ActivityLog::create([
            'user_id' => $actor?->id,
            'role' => $actor?->role,
            'action' => $action,
            'description' => $description,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'properties' => $properties ?: null,
            'ip_address' => request()?->ip(),
        ]);
    }

    public static function to(?User $recipient, string $type, string $title, ?string $body = null,
        ?string $link = null, ?Model $subject = null): ?Notification
    {
        if ($recipient === null || $recipient->isSuspended()) {
            return null;
        }

        return Notification::create([
            'recipient_id' => $recipient->id,
            'actor_id' => auth()->id(),
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'link' => $link,
            'entity_type' => $subject ? class_basename($subject) : null,
            'entity_id' => $subject?->getKey(),
        ]);
    }

    /** Notify every active admin account. */
    public static function toAdmins(string $type, string $title, ?string $body = null,
        ?string $link = null, ?Model $subject = null): void
    {
        User::where('role', User::ROLE_ADMIN)->where('is_suspended', false)
            ->each(fn (User $admin) => self::to($admin, $type, $title, $body, $link, $subject));
    }

    /**
     * One entry point for the repeated "record the action, then tell people" pattern.
     *
     * @param  array<int, array{0: ?User, 1: string, 2: string, 3?: ?string, 4?: ?string}>  $messages
     */
    public static function event(string $action, string $description, array $messages,
        ?Model $subject = null, array $properties = []): void
    {
        self::log($action, $description, $subject, $properties);

        foreach ($messages as $message) {
            self::to($message[0] ?? null, $message[1], $message[2], $message[3] ?? null, $message[4] ?? null, $subject);
        }
    }
}
