import { supabase } from '../supabase';
import type { ApplicationStatus } from '../database';

// ─── Types ───────────────────────────────────────────────────────────────
export type AdminApplicant = {
  id: string;
  applicant_id: string;
  recruitment_cycle_id: string;
  status: ApplicationStatus;
  motivation: string | null;
  experience_summary: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    roll_number: string | null;
    branch: string | null;
    year: string | null;
    division: string | null;
    github_url: string | null;
    linkedin_url: string | null;
  };
  domain_preferences: Array<{
    domain_id: string;
    preference_order: number;
    domain: { name: string };
  }>;
};

export type ApplicantListFilters = {
  search?: string;
  status?: ApplicationStatus | 'all';
  year?: 'FY' | 'SY' | 'all';
  branch?: string | 'all';
  domain?: string | 'all';
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
  byYear: { fy: number; sy: number };
  byBranch: Array<{ label: string; value: number }>;
  byDomain: Array<{ label: string; value: number }>;
  byStatus: Array<{ status: string; count: number }>;
};

// ─── Dashboard metrics ──────────────────────────────────────────────────
export async function getDashboardMetrics(cycleId?: string): Promise<DashboardMetrics> {
  // Fetch all applications for the cycle with profiles and preferences
  let query = supabase
    .from('applications')
    .select('id, status, profiles!inner(branch, year), application_domain_preferences(domain_id, domains!inner(name))')
    .neq('status', 'draft');

  if (cycleId) query = query.eq('recruitment_cycle_id', cycleId);
  const { data, error } = await query;
  if (error) throw error;

  const apps = (data ?? []) as unknown as Array<{
    id: string;
    status: ApplicationStatus;
    profiles: { branch: string | null; year: string | null };
    application_domain_preferences: Array<{ domain_id: string; domains: { name: string } }>;
  }>;

  const statusCounts: Record<string, number> = {};
  const branchCounts: Record<string, number> = {};
  const domainCounts: Record<string, number> = {};
  let fy = 0;
  let sy = 0;

  for (const app of apps) {
    // Status aggregation
    statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1;

    // Year aggregation
    const yr = app.profiles?.year;
    if (yr === 'FY') fy++;
    else if (yr === 'SY') sy++;

    // Branch aggregation
    const br = app.profiles?.branch ?? 'Other';
    branchCounts[br] = (branchCounts[br] ?? 0) + 1;

    // Domain aggregation (primary preference only)
    const primary = app.application_domain_preferences?.find((p: any) => p.preference_order === 1 || app.application_domain_preferences.length === 1);
    if (primary) {
      const dName = primary.domains?.name ?? 'Unknown';
      domainCounts[dName] = (domainCounts[dName] ?? 0) + 1;
    }
  }

  return {
    totalApplicants: apps.length,
    submitted: statusCounts['submitted'] ?? 0,
    underReview: statusCounts['under_review'] ?? 0,
    shortlisted: statusCounts['shortlisted'] ?? 0,
    interviewScheduled: statusCounts['interview_scheduled'] ?? 0,
    selected: statusCounts['selected'] ?? 0,
    rejected: statusCounts['rejected'] ?? 0,
    byYear: { fy, sy },
    byBranch: Object.entries(branchCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    byDomain: Object.entries(domainCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    byStatus: Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ─── Applicant list with filtering ──────────────────────────────────────
export async function getApplicants(
  filters: ApplicantListFilters = {},
): Promise<{ applicants: AdminApplicant[]; total: number }> {
  const { page = 1, pageSize = 50, status = 'all', year = 'all', search } = filters;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('applications')
    .select(
      `*, profiles!inner(full_name, email, phone, roll_number, branch, year, division, github_url, linkedin_url),
       application_domain_preferences(domain_id, preference_order, domains!inner(name))`,
      { count: 'exact' },
    )
    .neq('status', 'draft')
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1);

  if (status !== 'all') query = query.eq('status', status);
  if (year !== 'all') query = query.eq('profiles.year', year);
  if (search) query = query.ilike('profiles.full_name', `%${search}%`);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    applicants: (data ?? []).map((row: any) => ({
      ...row,
      profile: row.profiles,
      domain_preferences: (row.application_domain_preferences ?? []).sort(
        (a: any, b: any) => a.preference_order - b.preference_order,
      ),
    })),
    total: count ?? 0,
  };
}

// ─── Single application detail ──────────────────────────────────────────
export async function getApplicationDetail(applicationId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select(
      `*, profiles!inner(*),
       application_domain_preferences(domain_id, preference_order, domains!inner(name)),
       application_answers(question_id, answer, recruitment_questions!inner(question, question_type, display_order)),
       interviews(id, scheduled_at, duration_minutes, location, meeting_url, status, notes),
       evaluations(id, technical_score, communication_score, problem_solving_score, teamwork_score, overall_score, feedback, recommendation)`,
    )
    .eq('id', applicationId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Status transition ─────────────────────────────────────────────────
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
) {
  const { data, error } = await supabase.rpc('update_application_status', {
    p_application_id: applicationId,
    p_status: newStatus,
  });
  if (error) throw error;
  return data;
}

// ─── Recruitment cycles ─────────────────────────────────────────────────
export async function getRecruitmentCycles() {
  const { data, error } = await supabase
    .from('recruitment_cycles')
    .select('*')
    .order('application_open', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOpenCycle() {
  const { data, error } = await supabase
    .from('recruitment_cycles')
    .select('*')
    .eq('status', 'open')
    .order('application_open')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Interview management ───────────────────────────────────────────────
export type InterviewRow = {
  id: string;
  application_id: string;
  round_id: string | null;
  interviewer_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_url: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function getInterviews(date?: string): Promise<any[]> {
  let query = supabase
    .from('interviews')
    .select(`*, applications!inner(applicant_id, profiles!inner(full_name, email))`)
    .eq('status', 'scheduled')
    .order('scheduled_at');

  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    query = query.gte('scheduled_at', dayStart.toISOString()).lte('scheduled_at', dayEnd.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createInterview(input: {
  application_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  location?: string;
  meeting_url?: string;
  round_id?: string;
  interviewer_id?: string;
}): Promise<InterviewRow> {
  const { data, error } = await supabase
    .from('interviews')
    .insert({
      application_id: input.application_id,
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes ?? 20,
      location: input.location ?? null,
      meeting_url: input.meeting_url ?? null,
      round_id: input.round_id ?? null,
      interviewer_id: input.interviewer_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as InterviewRow;
}

// ─── Evaluation management ──────────────────────────────────────────────
export async function createEvaluation(input: {
  application_id: string;
  round_id?: string;
  evaluator_id: string;
  technical_score?: number;
  communication_score?: number;
  problem_solving_score?: number;
  teamwork_score?: number;
  overall_score?: number;
  feedback?: string;
  recommendation?: 'strong_yes' | 'yes' | 'maybe' | 'no';
}) {
  const { data, error } = await supabase
    .from('evaluations')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvaluation(id: string, input: Record<string, any>) {
  const { data, error } = await supabase
    .from('evaluations')
    .update(input as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Admin invite management ────────────────────────────────────────────
export async function getAdminInvites() {
  const { data, error } = await supabase
    .from('admin_invites')
    .select('id, email, role, expires_at, accepted_at, revoked_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
