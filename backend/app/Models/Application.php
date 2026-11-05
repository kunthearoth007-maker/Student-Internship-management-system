<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    protected $fillable = [
        'student_id', 'internship_id', 'cover_letter', 'cv', 'status', 'applied_at',
        'offered_at', 'offer_deadline', 'responded_at', 'offer_note',
    ];

    protected $casts = [
        'applied_at' => 'datetime',
        'offered_at' => 'datetime',
        'offer_deadline' => 'datetime',
        'responded_at' => 'datetime',
    ];

    public const STATUSES = [
        'pending', 'reviewing', 'offered', 'accepted', 'rejected', 'cancelled', 'declined', 'expired',
    ];

    public function isOfferPending(): bool
    {
        return $this->status === 'offered'
            && ($this->offer_deadline === null || $this->offer_deadline->isFuture());
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function internship()
    {
        return $this->belongsTo(Internship::class);
    }
}
