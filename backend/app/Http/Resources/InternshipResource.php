<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InternshipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'title' => $this->title,
            'category' => $this->category,
            'description' => $this->description,
            'requirements' => $this->requirements,
            'location' => $this->location,
            'internship_type' => $this->internship_type,
            'positions' => $this->positions,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'application_deadline' => $this->application_deadline?->toDateString(),
            'approval_status' => $this->approval_status,
            'is_published' => (bool) $this->is_published,
            'period_id' => $this->period_id,
            'period' => $this->whenLoaded('period', fn () => $this->period?->name),
            'company' => new CompanyResource($this->whenLoaded('company')),
            'applications_count' => $this->whenCounted('applications'),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
