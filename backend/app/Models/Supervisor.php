<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supervisor extends Model
{
    protected $fillable = ['user_id', 'employee_id', 'department_id', 'phone'];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignments()
    {
        return $this->hasMany(InternshipAssignment::class);
    }

    public function feedbacks()
    {
        return $this->hasMany(ReportFeedback::class);
    }
}
