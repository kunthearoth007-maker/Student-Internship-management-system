<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Internship extends Model
{
    protected $fillable = [
        'company_id', 'period_id', 'title', 'category', 'description', 'requirements',
        'location', 'internship_type', 'positions', 'start_date', 'end_date',
        'application_deadline', 'approval_status', 'is_published',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'application_deadline' => 'date',
        'is_published' => 'boolean',
        'positions' => 'integer',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function period()
    {
        return $this->belongsTo(InternshipPeriod::class, 'period_id');
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function assignments()
    {
        return $this->hasMany(InternshipAssignment::class);
    }

    public function isOpen(): bool
    {
        return $this->approval_status === 'approved'
            && $this->is_published
            && $this->company?->isVerified();
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('approval_status', 'approved')
            ->where('is_published', true)
            ->whereHas('company', fn (Builder $q) => $q->where('verification_status', 'verified'))
            ->whereDate('application_deadline', '>=', now()->toDateString());
    }
}
