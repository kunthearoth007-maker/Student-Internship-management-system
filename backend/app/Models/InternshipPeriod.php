<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InternshipPeriod extends Model
{
    protected $fillable = [
        'name', 'starts_on', 'ends_on',
        'application_opens_on', 'application_closes_on', 'is_active',
    ];

    protected $casts = [
        'starts_on' => 'date',
        'ends_on' => 'date',
        'application_opens_on' => 'date',
        'application_closes_on' => 'date',
        'is_active' => 'boolean',
    ];

    public function internships()
    {
        return $this->hasMany(Internship::class, 'period_id');
    }

    public static function active(): ?self
    {
        return static::where('is_active', true)->orderByDesc('ends_on')->first();
    }
}
