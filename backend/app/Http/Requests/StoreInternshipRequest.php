<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInternshipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['company', 'admin'], true);
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'category' => 'required|string',
            'description' => 'required|string',
            'requirements' => 'required|string',
            'location' => 'required|string',
            'internship_type' => 'required|string|in:full_time,part_time,remote,on_site',
            'positions' => 'required|integer|min:1',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'application_deadline' => 'required|date|before_or_equal:start_date',
            'period_id' => 'nullable|integer|exists:internship_periods,id',
        ];
    }
}
