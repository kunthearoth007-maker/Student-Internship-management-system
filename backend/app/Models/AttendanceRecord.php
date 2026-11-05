<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceRecord extends Model
{
    public const STATUSES = ['present', 'late', 'absent', 'excused'];

    protected $fillable = [
        'assignment_id', 'recorded_by', 'recorded_on', 'status', 'hours', 'note',
    ];

    protected $casts = ['recorded_on' => 'date:Y-m-d', 'hours' => 'float'];

    public function assignment()
    {
        return $this->belongsTo(InternshipAssignment::class, 'assignment_id');
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
