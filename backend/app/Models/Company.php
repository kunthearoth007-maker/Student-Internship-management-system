<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $fillable = [
        'user_id', 'company_name', 'email', 'phone', 'address',
        'website', 'description', 'logo',
        'verification_status', 'verified_at', 'verification_note',
    ];

    protected $casts = ['verified_at' => 'datetime'];

    public function isVerified(): bool
    {
        return $this->verification_status === 'verified';
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function internships()
    {
        return $this->hasMany(Internship::class);
    }

    public function assignments()
    {
        return $this->hasMany(InternshipAssignment::class);
    }
}
