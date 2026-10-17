import { supabase } from "../supabase";
import type { ApplicationRow, ProfileRow, Database } from "../database";
import { getRecruitmentCycles } from "./admin";

export type ApplicantDashboardData = {
  profile: ProfileRow;
  cycle: Database["public"]["Tables"]["recruitment_cycles"]["Row"] | null;
  cycles: Database["public"]["Tables"]["recruitment_cycles"]["Row"][];
  application:
    | (ApplicationRow & {
        domain_preferences: Array<{
          domain_id: string;
          preference_order: number;
          domain: { name: string };
        }>;
        answers: Array<{
          question_id: string;
          answer: unknown;
          question: {
            question: string;
            question_type: string;
            display_order: number;
          };
        }>;
      })
    | null;
  interviews: Database["public"]["Functions"]["my_interviews"]["Returns"];
  notifications: Database["public"]["Tables"]["notifications"]["Row"][];
};
export async function loadDashboardData(
  userId: string,
  cycleId?: string,
): Promise<ApplicantDashboardData> {
  const [profile, cycles, notifications, interviews, latestApp] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    getRecruitmentCycles(),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.rpc("my_interviews", {}),
    supabase
      .from("applications")
      .select("recruitment_cycle_id")
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  for (const result of [profile, notifications, interviews, latestApp])
    if (result.error) throw result.error;
  const cycle =
    cycles.find((item) => item.id === cycleId) ??
    cycles.find((item) => item.id === latestApp.data?.recruitment_cycle_id) ??
    cycles.find((item) => item.status === "open") ??
    cycles[0] ??
    null;
  let application: ApplicantDashboardData["application"] = null;
  if (cycle) {
    const app = await supabase
      .from("applications")
      .select("*")
      .eq("applicant_id", userId)
      .eq("recruitment_cycle_id", cycle.id)
      .maybeSingle();
    if (app.error) throw app.error;
    if (app.data) {
      const [preferences, answers] = await Promise.all([
        supabase
          .from("application_domain_preferences")
          .select("domain_id,preference_order,domains(name)")
          .eq("application_id", app.data.id)
          .order("preference_order"),
        supabase
          .from("application_answers")
          .select("question_id,answer,recruitment_questions(question,question_type,display_order)")
          .eq("application_id", app.data.id),
      ]);
      if (preferences.error) throw preferences.error;
      if (answers.error) throw answers.error;
      const pref = preferences.data as unknown as Array<{
        domain_id: string;
        preference_order: number;
        domains: { name: string };
      }>;
      const ans = answers.data as unknown as Array<{
        question_id: string;
        answer: unknown;
        recruitment_questions: {
          question: string;
          question_type: string;
          display_order: number;
        };
      }>;
      application = {
        ...app.data,
        domain_preferences: pref.map((row) => ({
          ...row,
          domain: row.domains,
        })),
        answers: ans
          .map((row) => ({ ...row, question: row.recruitment_questions }))
          .sort((a, b) => a.question.display_order - b.question.display_order),
      };
    }
  }
  return {
    profile: profile.data!,
    cycle,
    cycles,
    application,
    interviews: (interviews.data ?? []).filter((item) => item.application_id === application?.id),
    notifications: notifications.data ?? [],
  };
}

export function deriveProgressStages(status: ApplicationRow["status"] | null) {
  const names = ["Application", "Review", "Shortlist", "Interview", "Result"];
  const index = {
    draft: 0,
    submitted: 1,
    under_review: 1,
    shortlisted: 2,
    interview_scheduled: 3,
    selected: 4,
    waitlisted: 4,
    rejected: 4,
    withdrawn: 0,
  }[status ?? "draft"];
  return names.map((name, i) => ({
    name,
    state:
      i === index
        ? ("current" as const)
        : i < index && !["rejected", "withdrawn"].includes(status ?? "")
          ? ("done" as const)
          : ("locked" as const),
  }));
}
