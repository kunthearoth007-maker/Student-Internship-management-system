<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    protected $fillable = [
        'user_id', 'student_id', 'phone', 'gender', 'date_of_birth', 'major',
        'year', 'address', 'bio', 'skills', 'cv', 'profile_image', 'department_id',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'skills' => 'array',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function assignments()
    {
        return $this->hasMany(InternshipAssignment::class);
    }
}
