<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InternshipAssignment extends Model
{
    protected $fillable = [
        'student_id', 'company_id', 'internship_id', 'supervisor_id',
        'start_date', 'end_date', 'status',
    ];

    protected $casts = ['start_date' => 'date', 'end_date' => 'date'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function internship()
    {
        return $this->belongsTo(Internship::class);
    }

    public function supervisor()
    {
        return $this->belongsTo(Supervisor::class);
    }

    public function reports()
    {
        return $this->hasMany(Report::class, 'assignment_id');
    }

    public function evaluations()
    {
        return $this->hasMany(Evaluation::class, 'assignment_id');
    }

    public function attendanceRecords()
    {
        return $this->hasMany(AttendanceRecord::class, 'assignment_id');
    }

    public function meetings()
    {
        return $this->hasMany(Meeting::class, 'assignment_id');
    }

    public function conversations()
    {
        return $this->hasMany(Conversation::class, 'assignment_id');
    }

    public function studentUser(): ?User
    {
        return User::find($this->student?->user_id);
    }

    public function supervisorUser(): ?User
    {
        return User::find($this->supervisor?->user_id);
    }

    public function companyUser(): ?User
    {
        return User::find($this->company?->user_id);
    }
}
