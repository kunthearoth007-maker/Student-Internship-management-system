<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = ['assignment_id', 'subject'];

    public function assignment()
    {
        return $this->belongsTo(InternshipAssignment::class, 'assignment_id');
    }

    public function participants()
    {
        return $this->belongsToMany(User::class, 'conversation_participants')
            ->withPivot('last_read_at')
            ->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function lastMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany('created_at');
    }

    /** Messages from other people that arrived after this participant last opened the conversation. */
    public function unreadFor(User $user): int
    {
        $since = $this->participants->firstWhere('id', $user->id)?->pivot->last_read_at;

        return $this->messages()
            ->where('sender_id', '!=', $user->id)
            ->when($since, fn ($query) => $query->where('created_at', '>', $since))
            ->count();
    }
}
