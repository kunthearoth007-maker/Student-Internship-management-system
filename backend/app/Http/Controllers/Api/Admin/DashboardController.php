<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Company;
use App\Models\Internship;
use App\Models\InternshipAssignment;
use App\Models\Report;
use App\Models\Student;
use App\Models\Supervisor;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $month = DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', applied_at)"
            : "DATE_FORMAT(applied_at, '%Y-%m')";

        return $this->ok('OK', [
            'stats' => [
                'total_students' => Student::count(),
                'total_companies' => Company::count(),
                'total_supervisors' => Supervisor::count(),
                'total_internships' => Internship::count(),
                'total_applications' => Application::count(),
                'accepted_applications' => Application::where('status', 'accepted')->count(),
                'active_internships' => Internship::where('approval_status', 'approved')
                    ->where('is_published', true)->count(),
                'completed_internships' => InternshipAssignment::where('status', 'completed')->count(),
                'companies_awaiting_verification' => Company::whereIn('verification_status', ['unverified', 'pending'])->count(),
                'interns_without_supervisor' => InternshipAssignment::whereNull('supervisor_id')
                    ->whereIn('status', ['pending', 'active'])->count(),
                'offers_awaiting_student' => Application::where('status', 'offered')->count(),
                'suspended_accounts' => \App\Models\User::where('is_suspended', true)->count(),
            ],
            'period' => \App\Models\InternshipPeriod::where('is_active', true)
                ->orderByDesc('ends_on')->first(),
            'reports' => [
                'submitted' => Report::where('status', 'submitted')->count(),
                'approved' => Report::where('status', 'approved')->count(),
                'revision_required' => Report::where('status', 'revision_required')->count(),
            ],
            'pending_internship_approvals' => Internship::where('approval_status', 'pending')->count(),
            'charts' => [
                'applications_by_month' => Application::query()
                    ->select(
                        DB::raw("{$month} as month"),
                        DB::raw('count(*) as total'),
                        DB::raw("sum(case when status in ('offered','accepted') then 1 else 0 end) as accepted"),
                    )
                    ->where('applied_at', '>=', now()->subMonths(12))
                    ->groupBy('month')->orderBy('month')->get(),
                'internships_by_category' => Internship::query()
                    ->select('category', DB::raw('count(*) as total'))
                    ->groupBy('category')->orderByDesc('total')->get(),
                'students_by_major' => Student::query()
                    ->select('major', DB::raw('count(*) as total'))
                    ->whereNotNull('major')->groupBy('major')->orderByDesc('total')->get(),
                'application_status' => Application::query()
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')->get(),
            ],
        ]);
    }
}
