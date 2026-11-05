<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'internship_id' => $this->internship_id,
            'cover_letter' => $this->cover_letter,
            'cv' => $this->cv ? '/storage/'.$this->cv : null,
            'status' => $this->status,
            'applied_at' => $this->applied_at?->toISOString(),
            'offered_at' => $this->offered_at?->toISOString(),
            'offer_deadline' => $this->offer_deadline?->toISOString(),
            'responded_at' => $this->responded_at?->toISOString(),
            'offer_note' => $this->offer_note,
            'offer_pending' => $this->isOfferPending(),
            'student' => new StudentResource($this->whenLoaded('student')),
            'internship' => new InternshipResource($this->whenLoaded('internship')),
        ];
    }
}
