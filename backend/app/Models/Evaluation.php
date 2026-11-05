<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Evaluation extends Model
{
    protected $fillable = [
        'assignment_id', 'evaluator_id', 'evaluator_type', 'technical_score',
        'communication_score', 'teamwork_score', 'attendance_score',
        'professionalism_score', 'overall_score', 'comment',
    ];

    protected function casts(): array
    {
        return ['overall_score' => 'decimal:1'];
    }

    public function assignment()
    {
        return $this->belongsTo(InternshipAssignment::class, 'assignment_id');
    }

    public function evaluator()
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function calculateOverall(): static
    {
        $this->overall_score = round(
            ($this->technical_score + $this->communication_score + $this->teamwork_score
                + $this->attendance_score + $this->professionalism_score) / 5, 1
        );

        return $this;
    }
}
