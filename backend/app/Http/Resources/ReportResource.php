<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'assignment_id' => $this->assignment_id,
            'title' => $this->title,
            'description' => $this->description,
            'report_type' => $this->report_type,
            'file' => $this->file ? '/storage/'.$this->file : null,
            'status' => $this->status,
            'submitted_at' => $this->submitted_at?->toISOString(),
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'feedbacks' => ReportFeedbackResource::collection($this->whenLoaded('feedbacks')),
            'assignment' => new AssignmentResource($this->whenLoaded('assignment')),
        ];
    }
}
