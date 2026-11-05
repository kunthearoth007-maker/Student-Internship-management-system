<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'is_suspended' => (bool) $this->is_suspended,
            'student' => new StudentResource($this->whenLoaded('student')),
            'company' => new CompanyResource($this->whenLoaded('company')),
            'supervisor' => new SupervisorResource($this->whenLoaded('supervisor')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
