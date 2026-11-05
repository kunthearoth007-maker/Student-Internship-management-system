<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupervisorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'employee_id' => $this->employee_id,
            'department' => $this->department?->name,
            'department_id' => $this->department_id,
            'phone' => $this->phone,
            'assignments_count' => $this->whenCounted('assignments'),
            'is_suspended' => (bool) $this->whenLoaded('user', fn () => $this->user->is_suspended),
            'name' => $this->whenLoaded('user', fn () => $this->user->name),
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}
