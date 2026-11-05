<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\AttendanceRecord;
use App\Models\Company;
use App\Models\Internship;
use App\Models\InternshipAssignment;
use App\Models\InternshipPeriod;
use App\Models\Meeting;
use App\Models\Notification;
use App\Models\Report;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Covers the five cross-role workflows the system has to run through one shared database. */
class CrossRoleWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_company_offer_reaches_the_student_and_admins(): void
    {
        $company = $this->actingAsEmail('abc@tech.kh');
        $application = Application::where('status', 'reviewing')->firstOrFail();

        $this->putJson("/api/company/applications/{$application->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.status', 'offered');

        $this->assertSame(1, InternshipAssignment::where('student_id', $application->student_id)
            ->where('internship_id', $application->internship_id)->count());

        $this->assertDatabaseHas('internship_assignments', [
            'student_id' => $application->student_id,
            'internship_id' => $application->internship_id,
            'status' => 'pending',
        ]);

        $studentUser = User::find($application->student->user_id);

        $this->assertNotNull(Notification::where('recipient_id', $studentUser->id)->where('type', 'offer')->first());
        $this->assertNotNull(Notification::where('recipient_id', $company->id)
            ->where('title', 'Offer sent to student')->first());
        $this->assertGreaterThan(0, Notification::where('recipient_id', $this->admin()->id)->where('type', 'offer')->count());
    }

    public function test_student_accepting_an_offer_updates_company_supervisor_and_admin(): void
    {
        $application = Application::where('status', 'reviewing')->firstOrFail();
        $this->actingAsEmail('abc@tech.kh');
        $this->putJson("/api/company/applications/{$application->id}/accept")->assertOk();

        $student = $this->actingAsEmail('dara@rupp.edu.kh');

        $this->putJson("/api/student/applications/{$application->id}/accept-offer")
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');

        $assignment = InternshipAssignment::where('student_id', $student->student->id)->firstOrFail();
        $this->assertContains($assignment->status, ['pending', 'active']);

        $this->assertNotNull(Notification::where('recipient_id', $this->userId('abc@tech.kh'))
            ->where('title', 'Offer accepted')->first());

        $this->assertDatabaseHas('activity_logs', ['action' => 'application.offer_accepted']);
    }

    public function test_student_declining_an_offer_cancels_the_seat(): void
    {
        $application = Application::where('status', 'offered')->firstOrFail();
        $this->actingAsEmail('student@rupp.edu.kh');

        $this->putJson("/api/student/applications/{$application->id}/decline-offer", ['reason' => 'Took another offer.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'declined');

        $this->assertDatabaseHas('activity_logs', ['action' => 'application.offer_declined']);
        $this->assertNotNull(Notification::where('recipient_id', $this->userId('abc@tech.kh'))
            ->where('title', 'Offer declined')->first());
    }

    public function test_unanswered_offers_expire_when_the_student_lists_applications(): void
    {
        $application = Application::where('status', 'offered')->firstOrFail();
        $application->update(['offer_deadline' => now()->subDay()]);

        $this->actingAsEmail('student@rupp.edu.kh');

        $this->getJson('/api/student/applications')->assertOk();

        $this->assertSame('expired', $application->fresh()->status);
        $this->assertNotNull(Notification::where('recipient_id', $this->userId('abc@tech.kh'))
            ->where('title', 'Offer expired')->first());
    }

    public function test_admin_assigns_a_supervisor_and_all_three_roles_are_notified(): void
    {
        $this->actingAs($this->admin());

        $payload = [
            'student_id' => Student::where('user_id', $this->userId('sokha@rupp.edu.kh'))->firstOrFail()->id,
            'internship_id' => Internship::where('title', 'Finance Intern')->firstOrFail()->id,
            'supervisor_id' => Supervisor::where('user_id', $this->userId('vannak@rupp.edu.kh'))->firstOrFail()->id,
            'start_date' => now()->addDays(3)->toDateString(),
            'end_date' => now()->addDays(90)->toDateString(),
            'status' => 'pending',
        ];

        $this->postJson('/api/admin/assignments', $payload)->assertCreated();

        foreach (['sokha@rupp.edu.kh', 'vannak@rupp.edu.kh', 'xyz@corp.kh'] as $email) {
            $this->assertNotNull(
                Notification::where('recipient_id', $this->userId($email))->where('type', 'assignment')->first(),
                "{$email} should have been notified about the assignment"
            );
        }

        $this->assertDatabaseHas('activity_logs', ['action' => 'assignment.created']);
    }

    public function test_weekly_report_round_trip_between_student_and_supervisor(): void
    {
        $this->actingAsEmail('student@rupp.edu.kh');

        $created = $this->postJson('/api/student/reports', [
            'assignment_id' => InternshipAssignment::firstOrFail()->id,
            'title' => 'Week 3 Report',
            'description' => 'Built the internship dashboard.',
            'report_type' => 'weekly',
        ])->assertCreated()->json('data.id');

        $this->assertNotNull(Notification::where('recipient_id', $this->userId('lim@rupp.edu.kh'))
            ->where('title', 'New report to review')->first());

        $this->actingAsEmail('lim@rupp.edu.kh');

        $this->putJson("/api/supervisor/reports/{$created}/revision", ['feedback' => 'Add screenshots.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'revision_required');

        $this->assertNotNull(Notification::where('recipient_id', $this->userId('student@rupp.edu.kh'))
            ->where('title', 'Revision requested')->first());

        $this->actingAsEmail('student@rupp.edu.kh');
        $this->putJson("/api/student/reports/{$created}", [
            'title' => 'Week 3 Report',
            'description' => 'Built the internship dashboard with screenshots.',
        ])->assertOk()->assertJsonPath('data.status', 'submitted');

        $this->actingAsEmail('lim@rupp.edu.kh');
        $this->putJson("/api/supervisor/reports/{$created}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertNotNull(Notification::where('recipient_id', $this->userId('student@rupp.edu.kh'))
            ->where('title', 'Report approved')->first());

        $this->assertSame('approved', Report::find($created)->status);
    }

    public function test_company_reads_its_interns_reports_only(): void
    {
        $assignment = InternshipAssignment::whereHas('reports')->firstOrFail();
        $report = $assignment->reports()->firstOrFail();

        $this->actingAs($assignment->company->user);
        $rows = $this->getJson('/api/company/reports')->assertOk()->json('data');
        $this->assertContains($report->id, array_column($rows, 'id'));

        $this->getJson("/api/company/reports/{$report->id}")->assertOk()
            ->assertJsonPath('data.id', $report->id)
            ->assertJsonPath('data.assignment.company_id', $assignment->company_id);

        $foreign = Company::where('id', '!=', $assignment->company_id)->firstOrFail();
        $this->actingAs($foreign->user);
        $this->getJson("/api/company/reports/{$report->id}")->assertForbidden();
        $this->assertNotContains(
            $report->id,
            array_column($this->getJson('/api/company/reports')->assertOk()->json('data'), 'id')
        );
    }

    public function test_evaluation_is_visible_to_the_student_and_reviewed_by_admin(): void
    {
        $this->actingAsEmail('lim@rupp.edu.kh');

        $this->postJson('/api/supervisor/evaluations', [
            'assignment_id' => InternshipAssignment::firstOrFail()->id,
            'technical_score' => 5,
            'communication_score' => 4,
            'teamwork_score' => 4,
            'attendance_score' => 3,
            'professionalism_score' => 5,
            'comment' => 'Strong technically, needs to attend standups on time.',
        ])->assertCreated();

        $this->assertNotNull(Notification::where('recipient_id', $this->userId('student@rupp.edu.kh'))
            ->where('type', 'evaluation')->first());
        $this->assertGreaterThan(0, Notification::where('recipient_id', $this->admin()->id)->where('type', 'evaluation')->count());

        $this->actingAsEmail('student@rupp.edu.kh');
        $this->getJson('/api/evaluations')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->assertDatabaseHas('activity_logs', ['action' => 'evaluation.submitted']);
    }

    public function test_company_registration_to_verified_to_published(): void
    {
        $smart = $this->actingAsEmail('smart@co.kh');
        $this->assertSame('pending', $smart->company->verification_status);

        $this->putJson('/api/company/verification', [
            'company_name' => 'Smart Co.',
            'email' => 'smart@co.kh',
            'phone' => '023999888',
            'address' => 'Street 5, Siem Reap',
            'website' => 'https://smart.co.kh',
            'description' => 'A licensed marketing agency working with RUPP since 2024.',
        ])->assertOk();

        $this->assertNotNull(Notification::where('recipient_id', $this->admin()->id)->where('type', 'company')->first());

        $company = Company::find($smart->company->id);
        $this->actingAs($this->admin());
        $this->putJson("/api/admin/companies/{$company->id}/reject", ['note' => 'Missing business licence.'])
            ->assertOk()
            ->assertJsonPath('data.verification_status', 'rejected');

        $this->assertNotNull(Notification::where('recipient_id', $smart->id)
            ->where('type', 'company')->latest()->first());

        $this->putJson("/api/admin/companies/{$company->id}/verify", ['note' => 'Licence received.'])
            ->assertOk()
            ->assertJsonPath('data.verification_status', 'verified');

        $internship = Internship::where('company_id', $company->id)->firstOrFail();

        $this->actingAsEmail('smart@co.kh');
        $this->putJson("/api/company/internships/{$internship->id}/publish")
            ->assertStatus(422);

        $this->actingAs($this->admin());
        $this->putJson("/api/admin/internships/{$internship->id}/approve")->assertOk();

        $this->actingAsEmail('smart@co.kh');
        $this->putJson("/api/company/internships/{$internship->id}/publish")
            ->assertOk()
            ->assertJsonPath('data.is_published', true);

        $this->actingAsEmail('student@rupp.edu.kh');
        $visible = $this->getJson('/api/internships')->assertOk()->json('data');

        $this->assertTrue(collect($visible)->contains('title', 'Digital Marketing Intern'));
    }

    public function test_notifications_are_persistent_and_track_unread_count(): void
    {
        $this->actingAsEmail('lim@rupp.edu.kh');

        $list = $this->getJson('/api/notifications')->assertOk()->json('data');
        $this->assertGreaterThan(0, $list['unread_count']);

        $first = $list['items'][0];
        $this->putJson("/api/notifications/{$first['id']}/read")->assertOk();
        $this->assertNotSame($list['unread_count'], $this->getJson('/api/notifications')->json('data.unread_count'));

        $this->putJson('/api/notifications/read-all')->assertOk();
        $this->assertSame(0, $this->getJson('/api/notifications')->json('data.unread_count'));
        $this->assertSame(0, $this->getJson('/api/notifications/unread-count')->json('data.unread_count'));
    }

    public function test_messages_only_flow_between_people_sharing_an_internship(): void
    {
        $this->actingAsEmail('student@rupp.edu.kh');

        $this->postJson('/api/messages/conversations', ['participant_id' => $this->userId('xyz@corp.kh')])
            ->assertStatus(403);

        $conversation = $this->postJson('/api/messages/conversations',
            ['participant_id' => $this->userId('abc@tech.kh')])->assertOk()->json('data.id');

        $this->postJson("/api/messages/conversations/{$conversation}/messages", ['body' => 'When do I start?'])
            ->assertCreated();

        $this->actingAsEmail('abc@tech.kh');
        $rows = $this->getJson('/api/messages/conversations')->assertOk()->json('data.items');
        $mine = collect($rows)->firstWhere('id', $conversation);

        $this->assertSame(1, $mine['unread']);

        $this->putJson("/api/messages/conversations/{$conversation}/read")->assertOk();
        $this->assertSame(0, collect($this->getJson('/api/messages/conversations')->json('data.items'))
            ->firstWhere('id', $conversation)['unread']);

        $this->assertDatabaseHas('activity_logs', ['action' => 'message.sent']);
    }

    public function test_supervisor_schedules_a_meeting_the_student_sees(): void
    {
        $this->actingAsEmail('lim@rupp.edu.kh');

        $meeting = $this->postJson('/api/meetings', [
            'assignment_id' => InternshipAssignment::firstOrFail()->id,
            'title' => 'Mid-term review',
            'agenda' => 'Progress against the project plan.',
            'scheduled_on' => now()->addDays(4)->toDateString(),
            'scheduled_at' => '10:00',
            'duration_minutes' => 45,
            'location' => 'Room B203',
        ])->assertCreated()->json('data.id');

        $this->assertNotNull(Notification::where('recipient_id', $this->userId('student@rupp.edu.kh'))
            ->where('type', 'meeting')->first());

        $this->actingAsEmail('student@rupp.edu.kh');
        $upcoming = $this->getJson('/api/meetings?scope=upcoming')->assertOk()->json('data.items');
        $this->assertContains($meeting, collect($upcoming)->pluck('id')->all());

        $this->postJson('/api/meetings', ['assignment_id' => 1, 'title' => 'Nope',
            'scheduled_on' => now()->toDateString(), 'scheduled_at' => '11:00'])->assertStatus(403);

        $this->actingAsEmail('lim@rupp.edu.kh');
        $this->putJson("/api/meetings/{$meeting}", [
            'title' => 'Mid-term review',
            'scheduled_on' => now()->addDays(4)->toDateString(),
            'scheduled_at' => '10:00',
            'status' => Meeting::STATUS_COMPLETED,
            'outcome' => 'On track.',
        ])->assertOk();

        $this->assertSame(Meeting::STATUS_COMPLETED, Meeting::find($meeting)->status);
    }

    public function test_attendance_recorded_by_the_supervisor_shows_up_for_the_student(): void
    {
        $assignment = InternshipAssignment::firstOrFail();

        $this->actingAsEmail('lim@rupp.edu.kh');
        $this->postJson('/api/attendance', [
            'assignment_id' => $assignment->id,
            'recorded_on' => now()->toDateString(),
            'status' => 'late',
            'hours' => 7.5,
            'note' => 'Arrived after the morning standup.',
        ])->assertCreated();

        $this->postJson('/api/attendance', [
            'assignment_id' => $assignment->id,
            'recorded_on' => now()->toDateString(),
            'status' => 'present',
        ])->assertCreated();

        $this->assertSame(1, AttendanceRecord::where('assignment_id', $assignment->id)
            ->whereDate('recorded_on', now()->toDateString())->count(), 'Same-day records overwrite instead of duplicating.');

        $this->actingAsEmail('student@rupp.edu.kh');
        $this->getJson('/api/attendance/summary')->assertOk()
            ->assertJsonPath('data.0.absent', 1);

        $dashboard = $this->getJson('/api/student/dashboard')->assertOk()->json('data');
        $this->assertSame('Sopheap Lim', $dashboard['supervisor']['name']);
        $this->assertNotEmpty($dashboard['upcoming_meetings']);
        $this->assertArrayHasKey('attendance_rate', $dashboard['attendance']);
        $this->assertArrayHasKey('offers_pending', $dashboard['stats']);

        $this->assertDatabaseHas('activity_logs', ['action' => 'attendance.recorded']);
    }

    public function test_admin_reads_activity_logs_and_exports_csv(): void
    {
        $this->actingAs($this->admin());

        $logs = $this->getJson('/api/admin/activity-logs')->assertOk()->json('data.items');
        $this->assertNotEmpty($logs);

        $export = $this->getJson('/api/admin/exports/students')->assertOk();

        $this->assertStringContainsString('Kunthearoth', $export->streamedContent());

        $this->assertDatabaseHas('activity_logs', ['action' => 'export.generated']);
    }

    public function test_suspended_accounts_lose_access_everywhere(): void
    {
        $this->actingAs($this->admin());
        $dara = User::where('email', 'dara@rupp.edu.kh')->firstOrFail();

        $this->putJson("/api/admin/users/{$dara->id}/suspend")->assertOk();
        $this->assertTrue($dara->fresh()->isSuspended());

        $this->postJson('/api/auth/login', ['email' => 'dara@rupp.edu.kh', 'password' => 'password'])
            ->assertStatus(403);

        $token = $dara->createToken('test')->plainTextToken;
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/student/dashboard')
            ->assertStatus(403)
            ->assertJsonPath('message', 'This account has been suspended. Contact an administrator.');

        $this->app['auth']->forgetGuards();
        $this->actingAs($this->admin());
        $this->putJson("/api/admin/users/{$dara->id}/reactivate")->assertOk();

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/auth/login', ['email' => 'dara@rupp.edu.kh', 'password' => 'password'])
            ->assertOk();
    }

    public function test_roles_cannot_reach_each_others_endpoints(): void
    {
        $this->actingAsEmail('student@rupp.edu.kh');
        $this->getJson('/api/admin/dashboard')->assertStatus(403);
        $this->postJson('/api/supervisor/evaluations', ['assignment_id' => 1])->assertStatus(403);

        $this->actingAsEmail('abc@tech.kh');
        $this->getJson('/api/admin/students')->assertStatus(403);

        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.role', 'company');
    }

    public function test_dashboard_statistics_are_read_from_real_data(): void
    {
        $this->actingAs($this->admin());
        $stats = $this->getJson('/api/admin/dashboard')->assertOk()->json('data.stats');

        $this->assertSame(Student::count(), $stats['total_students']);
        $this->assertSame(Company::count(), $stats['total_companies']);
        $this->assertSame(Company::where('verification_status', 'pending')->count(), $stats['companies_awaiting_verification']);
        $this->assertSame(Application::where('status', 'offered')->count(), $stats['offers_awaiting_student']);

        $this->actingAsEmail('abc@tech.kh');
        $company = User::where('email', 'abc@tech.kh')->firstOrFail()->company;
        $stats = $this->getJson('/api/company/dashboard')->assertOk()->json('data.stats');

        $this->assertSame($company->internships()->count(), $stats['internships']);
        $this->assertSame($company->assignments()->where('status', 'active')->count(), $stats['active_interns']);
        $this->assertSame(Application::where('status', 'offered')
            ->whereHas('internship', fn ($q) => $q->where('company_id', $company->id))->count(),
            $stats['offers_awaiting_reply']);
    }

    public function test_departments_and_periods_are_shared_reference_data(): void
    {
        $this->actingAsEmail('student@rupp.edu.kh');

        $this->assertNotEmpty($this->getJson('/api/departments?active_only=1')->assertOk()->json('data'));

        $periods = $this->getJson('/api/periods')->assertOk()->json('data');
        $this->assertNotEmpty($periods);
        $this->assertArrayHasKey('internships_count', $periods[0]);

        $internship = Internship::whereNotNull('period_id')
            ->where('approval_status', 'approved')
            ->where('is_published', true)
            ->firstOrFail();

        $this->getJson("/api/internships/{$internship->id}")
            ->assertOk()
            ->assertJsonPath('data.period', $internship->period->name);

        $this->actingAs($this->admin());

        $rows = $this->getJson('/api/admin/internships?period_id='.$internship->period_id)
            ->assertOk()->json('data');

        $this->assertContains($internship->id, array_column($rows, 'id'));

        $this->deleteJson("/api/admin/periods/{$internship->period_id}")->assertOk();

        $this->assertNull($internship->fresh()->period_id);
    }

    private function admin(): User
    {
        return User::where('role', 'admin')->firstOrFail();
    }

    private function userId(string $email): int
    {
        return User::where('email', $email)->firstOrFail()->id;
    }

    private function actingAsEmail(string $email): User
    {
        $user = User::where('email', $email)->firstOrFail();
        $this->actingAs($user);

        return $user->load(['student', 'company', 'supervisor']);
    }
}
