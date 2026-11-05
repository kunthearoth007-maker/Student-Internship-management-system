<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    public const ROLE_ADMIN = 'admin';
    public const ROLE_STUDENT = 'student';
    public const ROLE_COMPANY = 'company';
    public const ROLE_SUPERVISOR = 'supervisor';

    protected $fillable = ['name', 'email', 'password', 'role', 'is_suspended'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_suspended' => 'boolean',
        ];
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'recipient_id');
    }

    public function unreadNotifications()
    {
        return $this->notifications()->whereNull('read_at');
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function conversations()
    {
        return $this->belongsToMany(Conversation::class, 'conversation_participants');
    }

    public function sentMessages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function scheduledMeetings()
    {
        return $this->hasMany(Meeting::class, 'host_user_id');
    }

    public function attendedMeetings()
    {
        return $this->hasMany(Meeting::class, 'student_user_id');
    }

    public function isSuspended(): bool
    {
        return (bool) $this->is_suspended;
    }

    public function student()
    {
        return $this->hasOne(Student::class);
    }

    public function company()
    {
        return $this->hasOne(Company::class);
    }

    public function supervisor()
    {
        return $this->hasOne(Supervisor::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }
}
