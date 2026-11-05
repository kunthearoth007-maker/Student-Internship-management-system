<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'company_id' => $this->company_id,
            'internship_id' => $this->internship_id,
            'supervisor_id' => $this->supervisor_id,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'status' => $this->status,
            'student' => new StudentResource($this->whenLoaded('student')),
            'company' => new CompanyResource($this->whenLoaded('company')),
            'internship' => new InternshipResource($this->whenLoaded('internship')),
            'supervisor' => new SupervisorResource($this->whenLoaded('supervisor')),
            'reports' => ReportResource::collection($this->whenLoaded('reports')),
            'evaluations' => EvaluationResource::collection($this->whenLoaded('evaluations')),
        ];
    }
}
