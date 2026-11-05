<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'student';
    }

    public function rules(): array
    {
        return [
            'internship_id' => 'required|integer|exists:internships,id',
            'cover_letter' => 'required|string|max:5000',
            'cv' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ];
    }
}
