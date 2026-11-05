<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Application;
use App\Models\AttendanceRecord;
use App\Models\Company;
use App\Models\Conversation;
use App\Models\Department;
use App\Models\Evaluation;
use App\Models\Internship;
use App\Models\InternshipAssignment;
use App\Models\InternshipPeriod;
use App\Models\Meeting;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Report;
use App\Models\ReportFeedback;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $departments = collect([
            ['Faculty of Information Technology', 'IT'],
            ['Faculty of Business Administration', 'BA'],
            ['Faculty of Engineering', 'ENG'],
        ])->values()->map(fn ($row) => Department::create([
            'name' => $row[0], 'code' => $row[1], 'is_active' => true,
        ]));

        $periods = collect([
            ['Winter Semester 2026', true],
            ['Summer Semester 2026', false],
        ])->values()->map(fn ($row) => InternshipPeriod::create([
            'name' => $row[0],
            'starts_on' => now()->startOfMonth()->toDateString(),
            'ends_on' => now()->addDays(100)->toDateString(),
            'application_opens_on' => now()->subDays(30)->toDateString(),
            'application_closes_on' => now()->addDays(5)->toDateString(),
            'is_active' => $row[1],
        ]));

        $admin = User::create([
            'name' => 'SIMS Admin',
            'email' => 'admin@rupp.edu.kh',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        $students = collect([
            ['Kunthearoth', 'student@rupp.edu.kh', 'Computer Science', '4', ['Laravel', 'Vue', 'MySQL'], 0],
            ['Sok Dara', 'dara@rupp.edu.kh', 'Information Technology', '3', ['Python', 'Django'], 0],
            ['Chan Sokha', 'sokha@rupp.edu.kh', 'Computer Science', '4', ['React', 'TypeScript'], 2],
            ['Ly Bopha', 'bopha@rupp.edu.kh', 'Business Administration', '2', ['Excel', 'Accounting'], 1],
        ])->values()->map(fn ($row, $i) => $this->makeStudent($row, $i, $departments));

        $companies = collect([
            ['ABC Technology', 'abc@tech.kh', 'Software', 'Phnom Penh', 'verified'],
            ['XYZ Company', 'xyz@corp.kh', 'Finance', 'Phnom Penh', 'verified'],
            ['Smart Co.', 'smart@co.kh', 'Marketing', 'Siem Reap', 'pending'],
        ])->values()->map(fn ($row, $i) => $this->makeCompany($row, $i));

        $supervisors = collect([
            ['Sopheap Lim', 'lim@rupp.edu.kh', 0],
            ['Vannak Chea', 'vannak@rupp.edu.kh', 1],
        ])->values()->map(fn ($row, $i) => $this->makeSupervisor($row, $i, $departments));

        $internships = [
            $this->makeInternship($companies[0], $periods[0], 'Frontend Developer Intern', 'Technology', 'Phnom Penh', 'React, TypeScript, Tailwind'),
            $this->makeInternship($companies[0], $periods[0], 'Backend Developer Intern', 'Technology', 'Phnom Penh', 'Laravel, MySQL, REST APIs'),
            $this->makeInternship($companies[1], $periods[0], 'Finance Intern', 'Finance', 'Phnom Penh', 'Excel, accounting basics'),
            $this->makeInternship($companies[2], $periods[0], 'Digital Marketing Intern', 'Marketing', 'Siem Reap', 'Social media, content writing', false),
        ];

        // Workflow: student 0 was offered internship 0, accepted it, and is now supervised.
        Application::create([
            'student_id' => $students[0]->id,
            'internship_id' => $internships[0]->id,
            'cover_letter' => 'I am passionate about frontend development and eager to learn.',
            'status' => 'accepted',
            'applied_at' => now()->subDays(20),
            'offered_at' => now()->subDays(12),
            'offer_deadline' => now()->subDays(5),
            'responded_at' => now()->subDays(11),
        ]);

        // A second offer still waiting for student 0 to accept or decline.
        $pendingOffer = Application::create([
            'student_id' => $students[0]->id,
            'internship_id' => $internships[1]->id,
            'cover_letter' => 'I would like to grow my Laravel skills with your backend team.',
            'status' => 'offered',
            'applied_at' => now()->subDays(8),
            'offered_at' => now()->subDay(),
            'offer_deadline' => now()->addDays(6),
            'offer_note' => 'Please confirm so we can reserve your seat.',
        ]);

        Application::create([
            'student_id' => $students[1]->id,
            'internship_id' => $internships[1]->id,
            'cover_letter' => 'Backend development is my main interest.',
            'status' => 'reviewing',
            'applied_at' => now()->subDays(5),
        ]);

        $assignment = InternshipAssignment::create([
            'student_id' => $students[0]->id,
            'company_id' => $internships[0]->company_id,
            'internship_id' => $internships[0]->id,
            'supervisor_id' => $supervisors[0]->id,
            'start_date' => $internships[0]->start_date,
            'end_date' => $internships[0]->end_date,
            'status' => 'active',
        ]);

        $weekly = Report::create([
            'assignment_id' => $assignment->id,
            'title' => 'Week 1 Internship Report',
            'description' => 'Set up development environment and studied the design system.',
            'report_type' => 'weekly',
            'status' => 'submitted',
            'submitted_at' => now()->subDays(6),
        ]);

        Report::create([
            'assignment_id' => $assignment->id,
            'title' => 'Week 2 Internship Report',
            'description' => 'Implemented the login page and component library.',
            'report_type' => 'weekly',
            'status' => 'approved',
            'submitted_at' => now()->subDays(3),
            'reviewed_at' => now()->subDays(1),
        ]);

        ReportFeedback::create([
            'report_id' => $weekly->id,
            'supervisor_id' => $supervisors[0]->id,
            'feedback' => 'Good progress this week. Please add more details about the project implementation.',
        ]);

        Evaluation::create((new Evaluation([
            'assignment_id' => $assignment->id,
            'evaluator_id' => $companies[0]->user_id,
            'evaluator_type' => 'company',
            'technical_score' => 5,
            'communication_score' => 4,
            'teamwork_score' => 5,
            'attendance_score' => 5,
            'professionalism_score' => 4,
            'comment' => 'Good performance during the internship period.',
        ]))->calculateOverall()->getAttributes());

        $this->seedAttendance($assignment, $supervisors[0]->user_id);
        $this->seedMeetings($assignment, $internships[0], $supervisors[0], $students[0]);
        $this->seedMessages($assignment, $internships[0], $supervisors[0], $students[0], $companies[0]);
        $this->seedNotifications($admin, $internships[0], $companies[2], $pendingOffer, $supervisors[0], $students[0], $weekly);

        $this->command?->info('Seeded: admin@rupp.edu.kh / student@rupp.edu.kh / abc@tech.kh / lim@rupp.edu.kh — all passwords "password"');
    }

    private function makeStudent(array $row, int $i, $departments): Student
    {
        [$name, $email, $major, $year, $skills, $departmentIndex] = $row;

        $user = User::create([
            'name' => $name, 'email' => $email,
            'password' => Hash::make('password'), 'role' => 'student',
        ]);

        return Student::create([
            'user_id' => $user->id,
            'student_id' => 'RUPP2026'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
            'phone' => '012'.rand(100000, 999999),
            'gender' => $i % 2 === 0 ? 'male' : 'female',
            'date_of_birth' => now()->subYears(21)->subDays($i * 40),
            'major' => $major,
            'year' => $year,
            'address' => 'Phnom Penh, Cambodia',
            'bio' => "{$major} student at the Royal University of Phnom Penh.",
            'skills' => $skills,
            'department_id' => $departments[$departmentIndex]->id,
        ]);
    }

    private function makeCompany(array $row, int $i): Company
    {
        [$name, $email, $industry, $city, $verification] = $row;

        $user = User::create([
            'name' => $name, 'email' => $email,
            'password' => Hash::make('password'), 'role' => 'company',
        ]);

        return Company::create([
            'user_id' => $user->id,
            'company_name' => $name,
            'email' => $email,
            'phone' => '023'.rand(100000, 999999),
            'address' => "{$city}, Cambodia",
            'website' => 'https://example'.($i + 1).'.com.kh',
            'description' => "{$industry} company partnered with RUPP for internship programs.",
            'verification_status' => $verification,
            'verified_at' => $verification === 'verified' ? now()->subDays(30) : null,
        ]);
    }

    private function makeSupervisor(array $row, int $i, $departments): Supervisor
    {
        [$name, $email, $departmentIndex] = $row;

        $user = User::create([
            'name' => $name, 'email' => $email,
            'password' => Hash::make('password'), 'role' => 'supervisor',
        ]);

        return Supervisor::create([
            'user_id' => $user->id,
            'employee_id' => 'RUPP-SUP'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
            'department_id' => $departments[$departmentIndex]->id,
            'phone' => '015'.rand(100000, 999999),
        ]);
    }

    private function makeInternship(Company $company, InternshipPeriod $period, string $title,
        string $category, string $location, string $requirements, bool $approved = true): Internship
    {
        return Internship::create([
            'company_id' => $company->id,
            'period_id' => $period->id,
            'title' => $title,
            'category' => $category,
            'description' => "We are looking for a motivated {$title} intern to join our team in {$location}.",
            'requirements' => $requirements,
            'location' => $location,
            'internship_type' => 'full_time',
            'positions' => 3,
            'start_date' => now()->addDays(10)->toDateString(),
            'end_date' => now()->addDays(100)->toDateString(),
            'application_deadline' => now()->addDays(5)->toDateString(),
            'approval_status' => $approved ? 'approved' : 'pending',
            'is_published' => $approved,
        ]);
    }

    private function seedAttendance(InternshipAssignment $assignment, int $supervisorUserId): void
    {
        collect([
            [now()->subDays(6), 'present', 8.0],
            [now()->subDays(5), 'late', 7.5],
            [now()->subDays(4), 'present', 8.0],
            [now()->subDays(3), 'absent', null],
            [now()->subDays(2), 'present', 8.0],
        ])->each(fn ($row) => AttendanceRecord::create([
            'assignment_id' => $assignment->id,
            'recorded_by' => $supervisorUserId,
            'recorded_on' => $row[0]->toDateString(),
            'status' => $row[1],
            'hours' => $row[2],
        ]));
    }

    private function seedMeetings(InternshipAssignment $assignment, Internship $internship,
        Supervisor $supervisor, Student $student): void
    {
        Meeting::create([
            'assignment_id' => $assignment->id,
            'host_user_id' => $supervisor->user_id,
            'student_user_id' => $student->user_id,
            'title' => 'Week 1 check-in',
            'agenda' => 'Review the development environment setup and first tasks.',
            'scheduled_on' => now()->subDays(6)->toDateString(),
            'scheduled_at' => '09:00:00',
            'duration_minutes' => 30,
            'location' => $internship->location,
            'status' => Meeting::STATUS_COMPLETED,
            'outcome' => 'Agreed on the login page milestone for week 2.',
        ]);

        Meeting::create([
            'assignment_id' => $assignment->id,
            'host_user_id' => $supervisor->user_id,
            'student_user_id' => $student->user_id,
            'title' => 'Progress review',
            'agenda' => 'Go through the component library and plan the dashboard work.',
            'scheduled_on' => now()->addDays(2)->toDateString(),
            'scheduled_at' => '14:00:00',
            'duration_minutes' => 45,
            'location' => 'Online (Google Meet)',
            'status' => Meeting::STATUS_SCHEDULED,
        ]);
    }

    private function seedMessages(InternshipAssignment $assignment, Internship $internship,
        Supervisor $supervisor, Student $student, Company $company): void
    {
        $supervisorUser = User::find($supervisor->user_id);
        $studentUser = User::find($student->user_id);
        $companyUser = User::find($company->user_id);

        $supervision = Conversation::create([
            'assignment_id' => $assignment->id,
            'subject' => "Internship supervision — {$internship->title}",
        ]);
        $supervision->participants()->attach([
            $supervisorUser->id => ['last_read_at' => now()->subHours(5)],
            $studentUser->id => ['last_read_at' => now()->subHours(5)],
        ]);

        Message::create(['conversation_id' => $supervision->id, 'sender_id' => $supervisorUser->id,
            'body' => 'Welcome! Please submit a weekly report every Friday by end of day.']);
        Message::create(['conversation_id' => $supervision->id, 'sender_id' => $studentUser->id,
            'body' => 'Thank you, Mr Lim. I have submitted my week 1 report.']);
        Message::create(['conversation_id' => $supervision->id, 'sender_id' => $supervisorUser->id,
            'body' => 'Reviewed. Please add screenshots of the login page in the next report.']);

        $onboarding = Conversation::create([
            'assignment_id' => $assignment->id,
            'subject' => "Onboarding — {$company->company_name}",
        ]);
        $onboarding->participants()->attach([
            $companyUser->id => ['last_read_at' => now()->subDays(2)],
            $studentUser->id => ['last_read_at' => null],
        ]);

        Message::create(['conversation_id' => $onboarding->id, 'sender_id' => $companyUser->id,
            'body' => 'Please bring your ID card on your first day and arrive at 8:30 AM.']);
        Message::create(['conversation_id' => $onboarding->id, 'sender_id' => $studentUser->id,
            'body' => 'Noted with thanks. See you then.']);
    }

    private function seedNotifications(User $admin, Internship $internship, Company $pendingCompany,
        Application $pendingOffer, Supervisor $supervisor, Student $student, Report $report): void
    {
        $companyUser = User::find($internship->company->user_id);
        $supervisorUser = User::find($supervisor->user_id);
        $studentUser = User::find($student->user_id);

        $this->log($admin, 'internship.approved', "Approved \"{$internship->title}\" for publication", $internship);

        $this->log($pendingCompany->user, 'company.submitted_for_verification',
            "{$pendingCompany->company_name} requested account verification", $pendingCompany);
        $this->notify($admin, $pendingCompany->user, 'company.verification', 'A company is awaiting verification',
            "{$pendingCompany->company_name} submitted its details for review.", '/admin/companies', $pendingCompany);

        $this->notify($studentUser, $companyUser, 'offer.pending', 'You have a new internship offer',
            "Confirm or decline the offer for {$pendingOffer->internship->title} before it expires.",
            '/student/applications', $pendingOffer);

        $this->notify($supervisorUser, $admin, 'assignment.assigned', 'You have been assigned a student',
            'Kunthearoth needs your supervision at ABC Technology.', '/supervisor/students', $supervisor);

        $this->notify($supervisorUser, $studentUser, 'report.submitted', 'Weekly report submitted',
            $report->title, '/supervisor/reports', $report);
    }

    private function notify(?User $recipient, ?User $actor, string $type, string $title,
        ?string $body, ?string $link, $subject): void
    {
        Notification::create([
            'recipient_id' => $recipient->id,
            'actor_id' => $actor?->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'link' => $link,
            'entity_type' => class_basename($subject),
            'entity_id' => $subject->getKey(),
        ]);
    }

    private function log(?User $actor, string $action, string $description, $subject): void
    {
        ActivityLog::create([
            'user_id' => $actor?->id,
            'role' => $actor?->role,
            'action' => $action,
            'description' => $description,
            'subject_type' => class_basename($subject),
            'subject_id' => $subject->getKey(),
        ]);
    }
}
