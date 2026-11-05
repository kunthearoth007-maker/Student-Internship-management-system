<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'student';
    }

    public function rules(): array
    {
        return [
            'assignment_id' => 'required|integer|exists:internship_assignments,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'report_type' => 'required|in:weekly,monthly,final',
            'file' => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ];
    }
}
