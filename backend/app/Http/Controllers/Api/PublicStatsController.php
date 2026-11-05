<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Internship;
use App\Models\InternshipAssignment;
use App\Models\Student;
use App\Support\ApiResponse;

class PublicStatsController extends Controller
{
    use ApiResponse;

    /** Live counts for the landing page and the auth shell. */
    public function index()
    {
        // Cancelled internships never had a chance to finish, so they stay out of the rate.
        $tracked = InternshipAssignment::query()->whereIn('status', ['pending', 'active', 'completed'])->count();
        $completed = InternshipAssignment::query()->where('status', 'completed')->count();

        return $this->ok('OK', [
            'students' => Student::count(),
            'companies' => Company::count(),
            'internships' => Internship::query()
                ->where('approval_status', 'approved')
                ->where('is_published', true)
                ->count(),
            'completion_rate' => $tracked > 0 ? (int) round($completed / $tracked * 100) : 0,
        ]);
    }
}
