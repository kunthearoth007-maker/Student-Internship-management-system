<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $table = 'app_notifications';

    protected $fillable = [
        'recipient_id', 'actor_id', 'type', 'title', 'body', 'link',
        'entity_type', 'entity_id', 'read_at',
    ];

    protected $casts = ['read_at' => 'datetime'];

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }
}
