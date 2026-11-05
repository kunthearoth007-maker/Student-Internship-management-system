<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'assignment_id', 'title', 'description', 'report_type',
        'file', 'status', 'submitted_at', 'reviewed_at',
    ];

    protected $casts = ['submitted_at' => 'datetime', 'reviewed_at' => 'datetime'];

    public function assignment()
    {
        return $this->belongsTo(InternshipAssignment::class, 'assignment_id');
    }

    public function feedbacks()
    {
        return $this->hasMany(ReportFeedback::class);
    }
}
