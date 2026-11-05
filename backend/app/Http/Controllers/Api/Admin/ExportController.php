<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\InternshipAssignment;
use App\Models\Report;
use App\Models\Student;
use App\Support\ApiResponse;
use App\Support\Workflow;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    use ApiResponse;

    public function students(Request $request)
    {
        $rows = Student::with(['user', 'department'])->withCount(['applications', 'assignments'])
            ->get()
            ->map(fn (Student $s) => [
                $s->student_id,
                $s->user?->name,
                $s->user?->email,
                $s->major,
                $s->year,
                $s->department?->name,
                $s->phone,
                $s->applications_count,
                $s->assignments_count,
            ]);

        return $this->csv('students', ['Student ID', 'Name', 'Email', 'Major', 'Year', 'Department', 'Phone', 'Applications', 'Assignments'], $rows);
    }

    public function applications(Request $request)
    {
        $rows = Application::with(['student.user', 'internship.company'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->get()
            ->map(fn (Application $a) => [
                $a->student?->student_id,
                $a->student?->user?->name,
                $a->internship?->title,
                $a->internship?->company?->company_name,
                $a->status,
                $a->applied_at?->toDateString(),
                $a->offer_deadline?->toDateString(),
                $a->responded_at?->toDateString(),
            ]);

        return $this->csv('applications',
            ['Student ID', 'Student', 'Internship', 'Company', 'Status', 'Applied', 'Offer deadline', 'Responded'], $rows);
    }

    public function assignments(Request $request)
    {
        $rows = InternshipAssignment::with(['student.user', 'company', 'internship', 'supervisor.user'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->get()
            ->map(fn (InternshipAssignment $a) => [
                $a->student?->student_id,
                $a->student?->user?->name,
                $a->internship?->title,
                $a->company?->company_name,
                $a->supervisor?->user?->name ?: 'Unassigned',
                $a->start_date?->toDateString(),
                $a->end_date?->toDateString(),
                $a->status,
                $a->reports()->count(),
                (float) $a->evaluations()->avg('overall_score'),
            ]);

        return $this->csv('assignments',
            ['Student ID', 'Student', 'Internship', 'Company', 'Supervisor', 'Start', 'End', 'Status', 'Reports', 'Avg score'], $rows);
    }

    public function reports(Request $request)
    {
        $rows = Report::with(['assignment.student.user', 'assignment.company'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->get()
            ->map(fn (Report $r) => [
                $r->assignment?->student?->student_id,
                $r->assignment?->student?->user?->name,
                $r->assignment?->company?->company_name,
                $r->title,
                $r->report_type,
                $r->status,
                $r->submitted_at?->toDateString(),
                $r->reviewed_at?->toDateString(),
            ]);

        return $this->csv('reports',
            ['Student ID', 'Student', 'Company', 'Title', 'Type', 'Status', 'Submitted', 'Reviewed'], $rows);
    }

    private function csv(string $name, array $header, $rows): StreamedResponse
    {
        Workflow::log('export.generated', 'Admin exported the '.$name.' list to CSV');

        return response()->streamDownload(function () use ($header, $rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $header);

            foreach ($rows as $row) {
                fputcsv($out, array_map(fn ($v) => $v ?? '', $row));
            }

            fclose($out);
        }, $name.'-'.now()->toDateString().'.csv', ['Content-Type' => 'text/csv']);
    }
}
