import { supabase } from '../supabase';
import type { ApplicationStatus, ProfileRow } from '../database';

// ─── Types ───────────────────────────────────────────────────────────────

export type ApplicantDashboardData = {
  profile: ProfileRow;
  application: {
    id: string;
    status: ApplicationStatus;
    motivation: string | null;
    experience_summary: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    submitted_at: string | null;
    created_at: string;
    domain_preferences: Array<{
      domain_id: string;
      preference_order: number;
      domain: { name: string };
    }>;
    answers: Array<{
      question_id: string;
      answer: unknown;
      question: { question: string; question_type: string; display_order: number };
    }>;
  } | null;
  cycle: {
    id: string;
    name: string;
    status: string;
    application_close: string;
  } | null;
  interviews: Array<{
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    location: string | null;
    meeting_url: string | null;
    status: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    created_at: string;
  }>;
};

/** Load everything the applicant dashboard needs in parallel. */
export async function loadDashboardData(userId: string): Promise<ApplicantDashboardData> {
  const [profileResult, cycleResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('recruitment_cycles')
      .select('id, name, status, application_close')
      .in('status', ['open', 'closed', 'completed'])
      .order('application_open', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (cycleResult.error) throw cycleResult.error;

  const cycle = cycleResult.data;
  let application = null;
  let interviews: any[] = [];

  if (cycle) {
    const appResult = await supabase
      .from('applications')
      .select(
        `id, status, motivation, experience_summary, github_url, portfolio_url, submitted_at, created_at,
         application_domain_preferences(domain_id, preference_order, domains!inner(name)),
         application_answers(question_id, answer, recruitment_questions!inner(question, question_type, display_order))`,
      )
      .eq('applicant_id', userId)
      .eq('recruitment_cycle_id', cycle.id)
      .maybeSingle();

    if (appResult.error) throw appResult.error;

    if (appResult.data) {
      application = {
        ...appResult.data,
        domain_preferences: ((appResult.data as any).application_domain_preferences ?? []).sort(
          (a: any, b: any) => a.preference_order - b.preference_order,
        ),
        answers: ((appResult.data as any).application_answers ?? []).sort(
          (a: any, b: any) => (a.recruitment_questions?.display_order ?? 0) - (b.recruitment_questions?.display_order ?? 0),
        ).map((a: any) => ({
          question_id: a.question_id,
          answer: a.answer,
          question: a.recruitment_questions,
        })),
      };

      // Fetch interviews for this application
      const intResult = await supabase
        .from('interviews')
        .select('id, scheduled_at, duration_minutes, location, meeting_url, status')
        .eq('application_id', application.id)
        .order('scheduled_at');
      if (!intResult.error) {
        interviews = intResult.data ?? [];
      }
    }
  }

  // Fetch recent notifications
  const notifResult = await supabase
    .from('notifications')
    .select('id, title, message, type, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    profile: profileResult.data as ProfileRow,
    application,
    cycle,
    interviews,
    notifications: notifResult.data ?? [],
  };
}

/** Derive the progress stages from an application status. */
export function deriveProgressStages(status: ApplicationStatus | null) {
  const stages = [
    { name: 'Application', statusValues: ['draft', 'submitted'] as const },
    { name: 'Technical Round', statusValues: ['under_review'] as const },
    { name: 'Task Round', statusValues: ['shortlisted'] as const },
    { name: 'Interview', statusValues: ['interview_scheduled'] as const },
    { name: 'Final Result', statusValues: ['selected', 'waitlisted', 'rejected'] as const },
  ];

  if (!status) {
    return stages.map((s, i) => ({
      name: s.name,
      state: i === 0 ? 'current' as const : 'locked' as const,
    }));
  }

  const statusOrder: Record<string, number> = {
    draft: 0, submitted: 1, under_review: 2, shortlisted: 3,
    interview_scheduled: 4, selected: 5, waitlisted: 5, rejected: 5, withdrawn: -1,
  };

  const currentIndex = statusOrder[status] ?? 0;

  return stages.map((s, i) => {
    const stageMax = Math.max(...s.statusValues.map((v) => statusOrder[v] ?? 0));
    const stageMin = Math.min(...s.statusValues.map((v) => statusOrder[v] ?? 0));

    if (currentIndex > stageMax) return { name: s.name, state: 'done' as const };
    if (currentIndex >= stageMin && currentIndex <= stageMax) return { name: s.name, state: 'current' as const };
    return { name: s.name, state: 'locked' as const };
  });
}
