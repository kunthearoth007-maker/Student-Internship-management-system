<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'student_id' => $this->student_id,
            'phone' => $this->phone,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'major' => $this->major,
            'year' => $this->year,
            'address' => $this->address,
            'bio' => $this->bio,
            'skills' => $this->skills ?? [],
            'cv' => $this->cv ? '/storage/'.$this->cv : null,
            'profile_image' => $this->profile_image ? '/storage/'.$this->profile_image : null,
            'department_id' => $this->department_id,
            'department' => $this->whenLoaded('department', fn () => $this->department?->name),
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}
