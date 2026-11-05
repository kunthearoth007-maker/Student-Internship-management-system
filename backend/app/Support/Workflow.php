<?php

namespace App\Support;

use App\Models\Application;
use App\Models\Company;
use App\Models\Internship;
use App\Models\InternshipAssignment;
use App\Models\Report;
use App\Models\Supervisor;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Shared transitions for the cross-role workflows. Every method writes the
 * database change plus the notifications and activity log entries that other
 * roles depend on, so a workflow step can never update one role silently.
 */
class Workflow
{
    public const OFFER_VALID_DAYS = 7;

    public static function reviewApplication(Application $application, Company $company): void
    {
        $application->update(['status' => 'reviewing']);

        Notify::event(
            'application.reviewed',
            "Company {$company->company_name} moved an application to reviewing",
            [[Notify::user($application->student), 'application', 'Application under review',
                $application->internship->title, '/student/applications']],
            $application
        );
    }

    public static function sendOffer(Application $application, Company $company): InternshipAssignment
    {
        self::assertPositionAvailable($application->internship);

        $application->update([
            'status' => 'offered',
            'offered_at' => now(),
            'offer_deadline' => now()->addDays(self::OFFER_VALID_DAYS),
            'responded_at' => null,
        ]);

        $assignment = self::createAssignment($application);

        Notify::event(
            'application.offer_sent',
            "Company {$company->company_name} sent an internship offer",
            [
                [Notify::user($application->student), 'offer', 'You have an internship offer',
                    $application->internship->title.' — respond by '.
                    $application->fresh()->offer_deadline->toDateString(), '/student/applications'],
                [Notify::user($company), 'application', 'Offer sent to student',
                    $application->student->user->name, '/company/applications'],
            ],
            $application,
            ['assignment_id' => $assignment->id]
        );

        Notify::toAdmins('offer', 'Internship offer sent',
            $application->student->user->name.' → '.$application->internship->title,
            '/admin/applications', $application);

        return $assignment;
    }

    public static function acceptOffer(Application $application): InternshipAssignment
    {
        $assignment = self::assignmentFor($application) ?? self::createAssignment($application);

        if ($assignment->status === 'cancelled') {
            $assignment->update(['status' => 'pending']);
        }

        $application->update(['status' => 'accepted', 'responded_at' => now()]);

        $companyUser = Notify::user($application->internship->company);
        $supervisorUser = self::supervisorUserFor($assignment->fresh('supervisor'));

        Notify::event(
            'application.offer_accepted',
            'A student accepted an internship offer',
            [
                [$companyUser, 'offer', 'Offer accepted',
                    $application->student->user->name.' joined '.$application->internship->title,
                    '/company/interns'],
            ],
            $application,
            ['assignment_id' => $assignment->id]
        );

        if ($supervisorUser !== null) {
            Notify::to($supervisorUser, 'assignment', 'A student confirmed their internship',
                $application->student->user->name.' · '.$application->internship->title,
                '/supervisor/students', $assignment);
        }

        Notify::toAdmins('offer', 'Offer accepted by student',
            $application->student->user->name.' → '.$application->internship->title,
            '/admin/applications', $application);

        return $assignment;
    }

    public static function declineOffer(Application $application, ?string $reason = null): void
    {
        $assignment = self::assignmentFor($application);
        $assignment?->update(['status' => 'cancelled']);

        $application->update([
            'status' => 'declined',
            'responded_at' => now(),
            'offer_note' => $reason,
        ]);

        Notify::event(
            'application.offer_declined',
            'A student declined an internship offer',
            [[Notify::user($application->internship->company), 'offer', 'Offer declined',
                $application->student->user->name.' declined '.$application->internship->title,
                '/company/applications']],
            $application
        );
    }

    public static function rejectApplication(Application $application, Company $company): void
    {
        $application->update(['status' => 'rejected', 'responded_at' => now()]);

        Notify::event(
            'application.rejected',
            "Company {$company->company_name} rejected an application",
            [[Notify::user($application->student), 'application', 'Application rejected',
                $application->internship->title, '/student/applications']],
            $application
        );
    }

    public static function cancelApplication(Application $application): void
    {
        $application->update(['status' => 'cancelled', 'responded_at' => now()]);

        Notify::event(
            'application.cancelled',
            'A student cancelled an application',
            [[Notify::user($application->internship->company), 'application', 'Application cancelled',
                $application->student->user->name.' · '.$application->internship->title,
                '/company/applications']],
            $application
        );
    }

    public static function submitReport(Report $report): void
    {
        $assignment = $report->assignment;

        Notify::event(
            'report.submitted',
            'A student submitted a report',
            [[self::supervisorUserFor($assignment), 'report', 'New report to review',
                $assignment?->student?->user->name.' · '.$report->title, '/supervisor/reports']],
            $report
        );
    }

    public static function decideReport(Report $report, string $status, ?string $feedback = null): void
    {
        $assignment = $report->assignment;
        $studentUser = Notify::user($assignment?->student);

        Notify::event(
            'report.'.$status,
            "Supervisor marked a report as {$status}",
            [[$studentUser, 'report',
                $status === 'approved' ? 'Report approved' : 'Revision requested',
                $report->title.($feedback ? ' — '.$feedback : ''), '/student/reports']],
            $report
        );
    }

    public static function gaveFeedback(Report $report, Supervisor $supervisor): void
    {
        Notify::to(
            Notify::user($report->assignment?->student),
            'feedback',
            'New feedback on your report',
            $report->title.' from '.($supervisor->user->name ?? 'your supervisor'),
            '/student/reports',
            $report
        );
    }

    public static function assignmentAssigned(InternshipAssignment $assignment, ?string $previousNote = null): void
    {
        $studentUser = Notify::user($assignment->student);
        $supervisorUser = self::supervisorUserFor($assignment);
        $label = $assignment->student?->user->name.' · '.$assignment->internship?->title;

        Notify::event(
            'assignment.supervisor_assigned',
            'A supervisor was assigned to an internship',
            [
                [$studentUser, 'assignment', 'Supervisor assigned',
                    'Your supervisor is '.($supervisorUser?->name ?? 'a faculty member'),
                    '/student/dashboard'],
                [$supervisorUser, 'assignment', 'New student assigned',
                    $label, '/supervisor/students'],
                [Notify::user($assignment->company), 'assignment', 'Supervisor assigned to your intern',
                    $label, '/company/interns'],
            ],
            $assignment
        );
    }

    public static function assignmentUpdated(InternshipAssignment $assignment, string $action, string $description): void
    {
        Notify::log($action, $description, $assignment);

        Notify::to(Notify::user($assignment->student), 'assignment', 'Internship status updated',
            $assignment->internship?->title.' is now '.$assignment->status, '/student/dashboard', $assignment);
    }

    public static function companySubmittedForVerification(Company $company): void
    {
        Notify::toAdmins('company', 'Company waiting for verification',
            $company->company_name, '/admin/companies', $company);

        Notify::log('company.verification_requested',
            $company->company_name.' requested account verification', $company);
    }

    public static function companyVerified(Company $company, string $status, ?string $note): void
    {
        Notify::event(
            'company.'.$status,
            "Admin marked a company as {$status}",
            [[Notify::user($company), 'company',
                $status === 'verified' ? 'Company account verified' : 'Company verification rejected',
                $note ?: ($status === 'verified'
                    ? 'You can now publish internship opportunities.'
                    : 'Ask an admin what needs correcting, then resubmit.'),
                '/company/profile']],
            $company
        );
    }

    public static function internshipDecided(Internship $internship, string $status, ?string $note): void
    {
        if ($status === 'rejected') {
            $internship->update(['is_published' => false]);
        }

        Notify::event(
            'internship.'.$status,
            "Admin marked an internship as {$status}",
            [[Notify::user($internship->company), 'internship',
                $status === 'approved' ? 'Internship approved' : 'Internship rejected',
                $internship->title.($note ? ' — '.$note : ''), '/company/internships']],
            $internship
        );
    }

    public static function userSuspended(User $user, bool $suspended): void
    {
        $user->update(['is_suspended' => $suspended]);

        if (! $suspended) {
            Notify::to($user, 'account', 'Your account is active again',
                'Contact an administrator if you lost access to your data.', '/login');
        }

        Notify::log($suspended ? 'user.suspended' : 'user.reactivated',
            ($suspended ? 'Suspended' : 'Reactivated')." the {$user->role} account ".$user->email, $user);
    }

    public static function evaluationSubmitted(User $evaluator, InternshipAssignment $assignment, float $score): void
    {
        $isSupervisor = $evaluator->role === User::ROLE_SUPERVISOR;

        Notify::to(Notify::user($assignment->student), 'evaluation', 'You have a new evaluation',
            ($isSupervisor ? 'Supervisor' : 'Company')." scored you {$score}/5", '/student/evaluations', $assignment);

        Notify::toAdmins('evaluation', 'Evaluation submitted',
            $assignment->student?->user->name.' scored '.$score.' by '.$evaluator->name,
            '/admin/evaluations', $assignment);

        Notify::log('evaluation.submitted',
            "{$evaluator->name} submitted an evaluation scoring {$score}", $assignment);
    }

    public static function log(string $action, string $description, ?Model $subject = null): void
    {
        Notify::log($action, $description, $subject);
    }

    public static function logPublish(Internship $internship, bool $published): void
    {
        self::log($published ? 'internship.published' : 'internship.unpublished',
            ($published ? 'Published' : 'Unpublished')." the internship {$internship->title}", $internship);

        Notify::to(Notify::user($internship->company), 'internship',
            $published ? 'Internship published' : 'Internship unpublished',
            $internship->title, '/company/internships', $internship);
    }

    public static function assertPositionAvailable(Internship $internship): void
    {
        $filled = InternshipAssignment::where('internship_id', $internship->id)
            ->whereIn('status', ['pending', 'active'])
            ->count();

        if ($filled >= $internship->positions) {
            throw ValidationException::withMessages([
                'status' => 'All positions for this internship are already filled.',
            ]);
        }
    }

    public static function createAssignment(Application $application): InternshipAssignment
    {
        $internship = $application->internship;

        return InternshipAssignment::firstOrCreate(
            ['student_id' => $application->student_id, 'internship_id' => $internship->id],
            [
                'company_id' => $internship->company_id,
                'start_date' => $internship->start_date,
                'end_date' => $internship->end_date,
                'status' => 'pending',
            ]
        );
    }

    private static function assignmentFor(Application $application): ?InternshipAssignment
    {
        return InternshipAssignment::where('student_id', $application->student_id)
            ->where('internship_id', $application->internship_id)
            ->first();
    }

    private static function supervisorUserFor(?InternshipAssignment $assignment): ?User
    {
        return $assignment?->supervisor ? Notify::user($assignment->supervisor) : null;
    }
}
