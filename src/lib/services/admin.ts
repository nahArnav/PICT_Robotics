import { supabase } from "../supabase";
import type { ApplicationStatus, Database, ProfileRow } from "../database";

export type AdminApplicant = Database["public"]["Tables"]["applications"]["Row"] & {
  profile: ProfileRow;
  domain_preferences: Array<{
    domain_id: string;
    preference_order: number;
    domain: { name: string };
  }>;
};
export type ApplicantListFilters = {
  search?: string;
  status?: ApplicationStatus | "all";
  year?: "FY" | "SY" | "all";
  branch?: string;
  domain?: string;
  cycleId?: string;
  page?: number;
  pageSize?: number;
};
export type DashboardMetrics = {
  totalApplicants: number;
  submitted: number;
  underReview: number;
  shortlisted: number;
  interviewScheduled: number;
  selected: number;
  rejected: number;
  byYear: {
    fy: number;
    sy: number;
  };
  byBranch: Array<{
    label: string;
    value: number;
  }>;
  byDomain: Array<{
    label: string;
    value: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
};
export async function getDashboardMetrics(cycleId?: string): Promise<DashboardMetrics> {
  const { data, error } = await supabase.rpc("dashboard_metrics", {
    p_cycle_id: cycleId,
  });
  if (error) throw error;
  return data as unknown as DashboardMetrics;
}
export async function getApplicants(filters: ApplicantListFilters = {}): Promise<{
  applicants: AdminApplicant[];
  total: number;
}> {
  const { data, error } = await supabase.rpc("list_applications", {
    p_search: filters.search ?? "",
    p_status: filters.status ?? "all",
    p_year: filters.year ?? "all",
    p_branch: filters.branch ?? "all",
    p_domain: filters.domain ?? "all",
    p_cycle_id: filters.cycleId,
    p_page: filters.page ?? 1,
    p_page_size: filters.pageSize ?? 50,
  });
  if (error) throw error;
  return data as unknown as {
    applicants: AdminApplicant[];
    total: number;
  };
}
export async function getApplicationDetail(applicationId: string) {
  const [answers, evaluations, interviews, notes, tasks, assignments] = await Promise.all([
    supabase
      .from("application_answers")
      .select("*, recruitment_questions(question,question_type,display_order)")
      .eq("application_id", applicationId),
    supabase
      .from("evaluations")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at"),
    supabase
      .from("interviews")
      .select("*")
      .eq("application_id", applicationId)
      .order("scheduled_at"),
    supabase
      .from("application_notes")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    supabase.from("task_submissions").select("*").eq("application_id", applicationId),
    supabase
      .from("application_reviewer_assignments")
      .select("*")
      .eq("application_id", applicationId),
  ]);
  for (const result of [answers, evaluations, interviews, notes, tasks, assignments])
    if (result.error) throw result.error;
  return {
    answers: answers.data as unknown as Array<{
      id: string;
      answer: unknown;
      recruitment_questions: { question: string };
    }>,
    evaluations: evaluations.data ?? [],
    interviews: interviews.data ?? [],
    notes: notes.data ?? [],
    tasks: tasks.data ?? [],
    assignments: assignments.data ?? [],
  };
}
export async function addApplicationNote(applicationId: string, body: string) {
  const { error } = await supabase
    .from("application_notes")
    .insert({ application_id: applicationId, body });
  if (error) throw error;
}
export async function updateApplicationStatus(applicationId: string, newStatus: ApplicationStatus) {
  const { data, error } = await supabase.rpc("update_application_status", {
    p_application_id: applicationId,
    p_status: newStatus,
  });
  if (error) throw error;
  return data;
}
export async function getRecruitmentCycles() {
  const { data, error } = await supabase
    .from("recruitment_cycles")
    .select("*")
    .order("application_open", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function getOpenCycle() {
  const cycles = await getRecruitmentCycles();
  return (
    cycles.find(
      (cycle) =>
        cycle.status === "open" &&
        new Date(cycle.application_open) <= new Date() &&
        new Date(cycle.application_close) > new Date(),
    ) ?? null
  );
}
export type InterviewRow = Database["public"]["Tables"]["interviews"]["Row"];
export async function getInterviews() {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .order("scheduled_at")
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
export async function createInterview(input: {
  application_id: string;
  scheduled_at: string;
  interviewer_id: string;
  duration_minutes?: number;
  location?: string;
  meeting_url?: string;
  round_id?: string;
  id?: string;
  status?: InterviewRow["status"];
}) {
  const { data, error } = await supabase.rpc("schedule_interview", {
    p_application_id: input.application_id,
    p_scheduled_at: input.scheduled_at,
    p_interviewer_id: input.interviewer_id,
    p_duration: input.duration_minutes,
    p_location: input.location,
    p_meeting_url: input.meeting_url,
    p_round_id: input.round_id,
    p_interview_id: input.id,
    p_status: input.status,
  });
  if (error) throw error;
  return data;
}
export async function createEvaluation(
  input: Database["public"]["Tables"]["evaluations"]["Insert"],
) {
  const { data, error } = await supabase.from("evaluations").insert(input).select().single();
  if (error) throw error;
  return data;
}
export async function updateEvaluation(
  id: string,
  input: Database["public"]["Tables"]["evaluations"]["Update"],
) {
  const { data, error } = await supabase
    .from("evaluations")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function getAdminInvites() {
  const { data, error } = await supabase
    .from("admin_invites")
    .select("id,email,role,expires_at,accepted_at,revoked_at,created_at")
    .in("role", ["admin", "super_admin"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
export async function getStaff() {
  const { data, error } = await supabase.rpc("staff_directory", {});
  if (error) throw error;
  return data ?? [];
}
