<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportFeedbackResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'report_id' => $this->report_id,
            'supervisor_id' => $this->supervisor_id,
            'feedback' => $this->feedback,
            'supervisor' => new SupervisorResource($this->whenLoaded('supervisor')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
