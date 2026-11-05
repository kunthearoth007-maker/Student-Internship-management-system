<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'company_name' => $this->company_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'website' => $this->website,
            'description' => $this->description,
            'logo' => $this->logo ? '/storage/'.$this->logo : null,
            'verification_status' => $this->verification_status ?? 'unverified',
            'verified_at' => $this->verified_at?->toISOString(),
            'verification_note' => $this->verification_note,
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}
