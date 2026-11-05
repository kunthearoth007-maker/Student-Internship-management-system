<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EvaluationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'assignment_id' => $this->assignment_id,
            'evaluator_id' => $this->evaluator_id,
            'evaluator_type' => $this->evaluator_type,
            'technical_score' => $this->technical_score,
            'communication_score' => $this->communication_score,
            'teamwork_score' => $this->teamwork_score,
            'attendance_score' => $this->attendance_score,
            'professionalism_score' => $this->professionalism_score,
            'overall_score' => (float) $this->overall_score,
            'comment' => $this->comment,
            'created_at' => $this->created_at?->toISOString(),
            'evaluator' => new UserResource($this->whenLoaded('evaluator')),
            'assignment' => new AssignmentResource($this->whenLoaded('assignment')),
        ];
    }
}
