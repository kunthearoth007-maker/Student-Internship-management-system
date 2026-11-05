<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['company', 'supervisor'], true);
    }

    public function rules(): array
    {
        $score = 'required|integer|min:1|max:5';

        return [
            'assignment_id' => 'required|integer|exists:internship_assignments,id',
            'technical_score' => $score,
            'communication_score' => $score,
            'teamwork_score' => $score,
            'attendance_score' => $score,
            'professionalism_score' => $score,
            'comment' => 'nullable|string|max:5000',
        ];
    }
}
