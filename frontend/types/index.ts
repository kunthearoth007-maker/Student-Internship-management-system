export type Role = "admin" | "student" | "company" | "supervisor";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_suspended?: boolean;
  student?: Student | null;
  company?: Company | null;
  supervisor?: Supervisor | null;
  created_at?: string;
}

export interface Student {
  id: number;
  user_id: number;
  student_id: string;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  major?: string | null;
  year?: string | null;
  address?: string | null;
  bio?: string | null;
  skills: string[];
  cv?: string | null;
  profile_image?: string | null;
  department_id?: number | null;
  department?: string | null;
  user?: User;
}

export interface Company {
  id: number;
  user_id: number;
  company_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  description?: string | null;
  logo?: string | null;
  verification_status?: "unverified" | "pending" | "verified" | "rejected";
  verified_at?: string | null;
  verification_note?: string | null;
  user?: User;
}

export interface Supervisor {
  id: number;
  user_id: number;
  employee_id?: string | null;
  department?: string | null;
  department_id?: number | null;
  phone?: string | null;
  name?: string;
  assignments_count?: number;
  is_suspended?: boolean;
  user?: User;
}

export interface Internship {
  id: number;
  company_id: number;
  title: string;
  category: string;
  description: string;
  requirements: string;
  location: string;
  internship_type: string;
  positions: number;
  start_date: string;
  end_date: string;
  application_deadline: string;
  approval_status: "pending" | "approved" | "rejected";
  is_published: boolean;
  period_id?: number | null;
  period?: string | null;
  company?: Company;
  applications_count?: number;
  created_at?: string;
}

export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "offered"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "declined"
  | "expired";

export interface Application {
  id: number;
  student_id: number;
  internship_id: number;
  cover_letter?: string | null;
  cv?: string | null;
  status: ApplicationStatus;
  applied_at?: string;
  offered_at?: string | null;
  offer_deadline?: string | null;
  responded_at?: string | null;
  offer_note?: string | null;
  offer_pending?: boolean;
  student?: Student;
  internship?: Internship;
}

export type AssignmentStatus = "pending" | "active" | "completed" | "cancelled";

export interface Assignment {
  id: number;
  student_id: number;
  company_id: number;
  internship_id: number;
  supervisor_id?: number | null;
  start_date: string;
  end_date: string;
  status: AssignmentStatus;
  student?: Student;
  company?: Company;
  internship?: Internship;
  supervisor?: Supervisor;
  reports?: Report[];
  evaluations?: Evaluation[];
}

export type ReportStatus = "submitted" | "approved" | "revision_required";

export interface Report {
  id: number;
  assignment_id: number;
  title: string;
  description?: string | null;
  report_type: "weekly" | "monthly" | "final";
  file?: string | null;
  status: ReportStatus;
  submitted_at?: string;
  reviewed_at?: string;
  feedbacks?: ReportFeedback[];
  assignment?: Assignment;
}

export interface ReportFeedback {
  id: number;
  report_id: number;
  supervisor_id: number;
  feedback: string;
  supervisor?: Supervisor;
  created_at?: string;
}

export interface Evaluation {
  id: number;
  assignment_id: number;
  evaluator_id: number;
  evaluator_type: "company" | "supervisor";
  technical_score: number;
  communication_score: number;
  teamwork_score: number;
  attendance_score: number;
  professionalism_score: number;
  overall_score: number;
  comment?: string | null;
  evaluator?: User;
  assignment?: Assignment;
}

export interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Page<T> {
  items: T[];
  meta?: PageMeta;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationFeed {
  items: NotificationItem[];
  unread_count: number;
  pagination?: PageMeta;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface ConversationSummary {
  id: number;
  subject?: string | null;
  internship?: string | null;
  people: { id: number; name: string; role: Role }[];
  last_message?: { body: string; from: string; sent_at: string } | null;
  unread: number;
}

export interface ConversationThread {
  id: number;
  subject?: string | null;
  internship?: string | null;
  people: { id: number; name: string; role: Role; email: string }[];
  messages: { id: number; body: string; from: string; sender_id: number; sent_at: string }[];
}

export interface Meeting {
  id: number;
  title: string;
  agenda?: string | null;
  outcome?: string | null;
  scheduled_on: string;
  scheduled_at: string;
  duration_minutes: number;
  location?: string | null;
  status: "scheduled" | "completed" | "cancelled";
  is_host: boolean;
  is_student: boolean;
  student?: string | null;
  host?: string | null;
  company?: string | null;
  internship?: string | null;
}

export interface AttendanceRow {
  id: number;
  assignment_id: number;
  student?: string | null;
  internship?: string | null;
  company?: string | null;
  recorded_on: string;
  status: "present" | "late" | "absent" | "excused";
  hours?: number | null;
  note?: string | null;
  recorded_by?: string | null;
}

export interface AttendanceSummary {
  assignment_id: number;
  student?: string | null;
  internship?: string | null;
  days: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  hours: number;
  attendance_rate?: number | null;
  last_recorded_on?: string | null;
}

export interface Department {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
  students_count?: number;
  supervisors_count?: number;
}

export interface InternshipPeriod {
  id: number;
  name: string;
  starts_on: string;
  ends_on: string;
  application_opens_on?: string | null;
  application_closes_on?: string | null;
  is_active: boolean;
  internships_count?: number;
}

export interface ActivityLogEntry {
  id: number;
  action: string;
  description: string;
  role?: string | null;
  user?: { id: number; name: string; email: string } | null;
  subject?: string | null;
  created_at?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PageMeta;
  errors?: Record<string, string[]>;
}
