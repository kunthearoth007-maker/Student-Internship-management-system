<?php

use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\ExportController;
use App\Http\Controllers\Api\Admin\ModerationController;
use App\Http\Controllers\Api\Admin\SystemController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Company\ApplicationController as CompanyApplicationController;
use App\Http\Controllers\Api\Company\DashboardController as CompanyDashboardController;
use App\Http\Controllers\Api\Company\InternshipController as CompanyInternshipController;
use App\Http\Controllers\Api\EvaluationController;
use App\Http\Controllers\Api\InternshipController;
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PublicStatsController;
use App\Http\Controllers\Api\Student\ApplicationController as StudentApplicationController;
use App\Http\Controllers\Api\Student\ProfileController as StudentProfileController;
use App\Http\Controllers\Api\Student\ReportController as StudentReportController;
use App\Http\Controllers\Api\Supervisor\DashboardController as SupervisorDashboardController;
use App\Http\Controllers\Api\Supervisor\ReportController as SupervisorReportController;
use Illuminate\Support\Facades\Route;

Route::get('public/stats', [PublicStatsController::class, 'index']);

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::put('password', [AuthController::class, 'changePassword']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('internships', [InternshipController::class, 'index']);
    Route::get('internships/{internship}', [InternshipController::class, 'show']);
    Route::get('evaluations', [EvaluationController::class, 'index']);
    Route::get('evaluations/{evaluation}', [EvaluationController::class, 'show']);
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::put('notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy']);

    Route::prefix('messages')->group(function () {
        Route::get('contacts', [MessageController::class, 'contacts']);
        Route::get('conversations', [MessageController::class, 'index']);
        Route::post('conversations', [MessageController::class, 'open']);
        Route::get('conversations/{conversation}', [MessageController::class, 'show']);
        Route::post('conversations/{conversation}/messages', [MessageController::class, 'store']);
        Route::put('conversations/{conversation}/read', [MessageController::class, 'markRead']);
    });

    Route::get('meetings', [MeetingController::class, 'index']);
    Route::post('meetings', [MeetingController::class, 'store']);
    Route::put('meetings/{meeting}', [MeetingController::class, 'update']);
    Route::delete('meetings/{meeting}', [MeetingController::class, 'destroy']);

    Route::get('attendance', [AttendanceController::class, 'index']);
    Route::get('attendance/summary', [AttendanceController::class, 'summary']);
    Route::post('attendance', [AttendanceController::class, 'store']);

    // Reference lists every role needs to fill in their profile or a posting form.
    Route::get('departments', [SystemController::class, 'departments']);
    Route::get('periods', [SystemController::class, 'periods']);

    Route::prefix('student')->middleware('role:student')->group(function () {
        Route::get('dashboard', [StudentProfileController::class, 'dashboard']);
        Route::put('profile', [StudentProfileController::class, 'update']);
        Route::get('applications', [StudentApplicationController::class, 'index']);
        Route::post('applications', [StudentApplicationController::class, 'store']);
        Route::get('applications/{application}', [StudentApplicationController::class, 'show']);
        Route::put('applications/{application}/cancel', [StudentApplicationController::class, 'cancel']);
        Route::put('applications/{application}/accept-offer', [StudentApplicationController::class, 'acceptOffer']);
        Route::put('applications/{application}/decline-offer', [StudentApplicationController::class, 'declineOffer']);
        Route::get('reports', [StudentReportController::class, 'index']);
        Route::post('reports', [StudentReportController::class, 'store']);
        Route::get('reports/{report}', [StudentReportController::class, 'show']);
        Route::put('reports/{report}', [StudentReportController::class, 'update']);
        Route::get('assignments', [StudentProfileController::class, 'assignments']);
    });

    Route::prefix('company')->middleware('role:company')->group(function () {
        Route::get('dashboard', [CompanyDashboardController::class, 'index']);
        Route::put('profile', [CompanyDashboardController::class, 'update']);
        Route::put('verification', [CompanyDashboardController::class, 'requestVerification']);
        Route::get('internships', [CompanyInternshipController::class, 'index']);
        Route::post('internships', [CompanyInternshipController::class, 'store']);
        Route::put('internships/{internship}', [CompanyInternshipController::class, 'update']);
        Route::delete('internships/{internship}', [CompanyInternshipController::class, 'destroy']);
        Route::put('internships/{internship}/publish', [CompanyInternshipController::class, 'publish']);
        Route::put('internships/{internship}/unpublish', [CompanyInternshipController::class, 'unpublish']);
        Route::get('applications', [CompanyApplicationController::class, 'index']);
        Route::get('applications/{application}', [CompanyApplicationController::class, 'show']);
        Route::put('applications/{application}/review', [CompanyApplicationController::class, 'review']);
        Route::put('applications/{application}/accept', [CompanyApplicationController::class, 'accept']);
        Route::put('applications/{application}/reject', [CompanyApplicationController::class, 'reject']);
        Route::get('assignments', [CompanyDashboardController::class, 'assignments']);
        Route::get('reports', [CompanyDashboardController::class, 'reports']);
        Route::get('reports/{report}', [CompanyDashboardController::class, 'showReport']);
        Route::put('assignments/{assignment}/status', [CompanyDashboardController::class, 'updateAssignmentStatus']);
        Route::post('evaluations', [EvaluationController::class, 'store']);
        Route::put('evaluations/{evaluation}', [EvaluationController::class, 'update']);
    });

    Route::prefix('supervisor')->middleware('role:supervisor')->group(function () {
        Route::get('dashboard', [SupervisorDashboardController::class, 'index']);
        Route::put('profile', [SupervisorDashboardController::class, 'updateProfile']);
        Route::get('students', [SupervisorDashboardController::class, 'students']);
        Route::get('reports', [SupervisorReportController::class, 'index']);
        Route::get('reports/{report}', [SupervisorReportController::class, 'show']);
        Route::post('reports/{report}/feedback', [SupervisorReportController::class, 'feedback']);
        Route::put('reports/{report}/approve', [SupervisorReportController::class, 'approve']);
        Route::put('reports/{report}/revision', [SupervisorReportController::class, 'revision']);
        Route::post('evaluations', [EvaluationController::class, 'store']);
        Route::put('evaluations/{evaluation}', [EvaluationController::class, 'update']);
    });

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('dashboard', [AdminDashboardController::class, 'index']);
        Route::get('students', [AdminUserController::class, 'students']);
        Route::get('companies', [AdminUserController::class, 'companies']);
        Route::get('supervisors', [AdminUserController::class, 'supervisors']);
        Route::post('users', [AdminUserController::class, 'store']);
        Route::put('users/{user}', [AdminUserController::class, 'update']);
        Route::put('users/{user}/suspend', [AdminUserController::class, 'suspend']);
        Route::put('users/{user}/reactivate', [AdminUserController::class, 'reactivate']);
        Route::delete('users/{user}', [AdminUserController::class, 'destroy']);
        Route::put('companies/{company}/verify', [ModerationController::class, 'verifyCompany']);
        Route::put('companies/{company}/reject', [ModerationController::class, 'rejectCompany']);
        Route::get('supervisors-options', [ModerationController::class, 'supervisors']);
        Route::get('departments', [SystemController::class, 'departments']);
        Route::post('departments', [SystemController::class, 'storeDepartment']);
        Route::put('departments/{department}', [SystemController::class, 'updateDepartment']);
        Route::delete('departments/{department}', [SystemController::class, 'destroyDepartment']);
        Route::get('periods', [SystemController::class, 'periods']);
        Route::post('periods', [SystemController::class, 'storePeriod']);
        Route::put('periods/{period}', [SystemController::class, 'updatePeriod']);
        Route::delete('periods/{period}', [SystemController::class, 'destroyPeriod']);
        Route::get('activity-logs', [SystemController::class, 'activityLogs']);
        Route::get('exports/students', [ExportController::class, 'students']);
        Route::get('exports/applications', [ExportController::class, 'applications']);
        Route::get('exports/assignments', [ExportController::class, 'assignments']);
        Route::get('exports/reports', [ExportController::class, 'reports']);
        Route::get('internships', [ModerationController::class, 'internships']);
        Route::put('internships/{internship}/approve', [ModerationController::class, 'approveInternship']);
        Route::put('internships/{internship}/reject', [ModerationController::class, 'rejectInternship']);
        Route::put('internships/{internship}/publish', [ModerationController::class, 'publishInternship']);
        Route::put('internships/{internship}/unpublish', [ModerationController::class, 'unpublishInternship']);
        Route::delete('internships/{internship}', [ModerationController::class, 'destroyInternship']);
        Route::get('applications', [ModerationController::class, 'applications']);
        Route::get('reports', [ModerationController::class, 'reports']);
        Route::get('assignments', [ModerationController::class, 'assignments']);
        Route::post('assignments', [ModerationController::class, 'storeAssignment']);
        Route::get('assignments/{assignment}', [ModerationController::class, 'showAssignment']);
        Route::put('assignments/{assignment}', [ModerationController::class, 'updateAssignment']);
    });
});
