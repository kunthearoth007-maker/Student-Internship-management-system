<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Meeting extends Model
{
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [self::STATUS_SCHEDULED, self::STATUS_COMPLETED, self::STATUS_CANCELLED];

    protected $fillable = [
        'assignment_id', 'host_user_id', 'student_user_id', 'title', 'agenda',
        'scheduled_on', 'scheduled_at', 'duration_minutes', 'location', 'status', 'outcome',
    ];

    protected $casts = ['scheduled_on' => 'date'];

    public function assignment()
    {
        return $this->belongsTo(InternshipAssignment::class, 'assignment_id');
    }

    public function host()
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('status', self::STATUS_SCHEDULED)
            ->where(function ($q) {
                $q->whereDate('scheduled_on', '>', now()->toDateString())
                    ->orWhere(function ($q2) {
                        $q2->whereDate('scheduled_on', now()->toDateString())
                            ->where('scheduled_at', '>=', now()->format('H:i:s'));
                    });
            })
            ->orderBy('scheduled_on')
            ->orderBy('scheduled_at');
    }
}
