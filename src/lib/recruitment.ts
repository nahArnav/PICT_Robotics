import type { Json, ProfileRow } from "./database";
import { supabase } from "./supabase";
import type { PublishedForm, FormValues } from "./applicationForms";
import { getPublishedForm } from "./services/applicationForms";

export type RecruitmentQuestion = {
  id: string;
  question: string;
  question_type: "short_text" | "long_text" | "single_choice" | "multi_choice" | "url" | "number";
  required: boolean;
  display_order: number;
  options: Json;
};

export type ApplicantFormData = {
  profile: ProfileRow;
  cycles: Array<{
    id: string;
    name: string;
  }>;
  cycle: {
    id: string;
    name: string;
    application_close: string;
    max_preferences: number;
  } | null;
  domains: Array<{
    id: string;
    name: string;
  }>;
  questions: RecruitmentQuestion[];
  form: PublishedForm;
  draft: {
    id: string;
    status: string;
    motivation: string;
    experienceSummary: string;
    githubUrl: string;
    portfolioUrl: string;
    domainIds: string[];
    answers: Record<string, Json>;
    formValues: FormValues;
  } | null;
};

export type ProfileInput = Pick<
  ProfileRow,
  | "full_name"
  | "phone"
  | "roll_number"
  | "branch"
  | "year"
  | "division"
  | "github_url"
  | "linkedin_url"
  | "portfolio_url"
  | "bio"
  | "skills"
  | "programming_languages"
>;

export async function loadApplicantFormData(
  userId: string,
  cycleId?: string,
): Promise<ApplicantFormData> {
  const [profileResult, cycleResult, domainsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("recruitment_cycles")
      .select("id, name, application_close, max_preferences")
      .eq("status", "open")
      .lte("application_open", new Date().toISOString())
      .gt("application_close", new Date().toISOString())
      .order("application_open", { ascending: false }),
    supabase.from("domains").select("id, name").eq("active", true).order("display_order"),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (cycleResult.error) throw cycleResult.error;
  if (domainsResult.error) throw domainsResult.error;

  const cycles = cycleResult.data ?? [];
  const cycle = cycleId
    ? (cycles.find((item) => item.id === cycleId) ?? null)
    : (cycles[0] ?? null);
  if (!cycle)
    return {
      profile: profileResult.data,
      cycles,
      cycle: null,
      domains: domainsResult.data ?? [],
      questions: [],
      form: { mode: "unpublished" },
      draft: null,
    };

  const [questionsResult, applicationResult, form] = await Promise.all([
    supabase
      .from("recruitment_questions")
      .select("id, question, question_type, required, display_order, options")
      .eq("recruitment_cycle_id", cycle.id)
      .eq("active", true)
      .order("display_order"),
    supabase
      .from("applications")
      .select("*")
      .eq("applicant_id", userId)
      .eq("recruitment_cycle_id", cycle.id)
      .maybeSingle(),
    getPublishedForm(cycle.id),
  ]);
  if (questionsResult.error) throw questionsResult.error;
  if (applicationResult.error) throw applicationResult.error;

  const application = applicationResult.data;
  if (!application) {
    return {
      profile: profileResult.data,
      cycles,
      cycle,
      domains: domainsResult.data ?? [],
      questions: questionsResult.data as RecruitmentQuestion[],
      form,
      draft: null,
    };
  }

  const [preferencesResult, answersResult] = await Promise.all([
    supabase
      .from("application_domain_preferences")
      .select("domain_id, preference_order")
      .eq("application_id", application.id)
      .order("preference_order"),
    supabase
      .from("application_answers")
      .select("question_id, answer")
      .eq("application_id", application.id),
  ]);
  if (preferencesResult.error) throw preferencesResult.error;
  if (answersResult.error) throw answersResult.error;

  const answers = Object.fromEntries(
    (answersResult.data ?? []).map((answer) => [answer.question_id, answer.answer]),
  );
  return {
    profile: profileResult.data,
    cycles,
    cycle,
    domains: domainsResult.data ?? [],
    questions: questionsResult.data as RecruitmentQuestion[],
    form,
    draft: {
      id: application.id,
      status: application.status,
      motivation: application.motivation ?? "",
      experienceSummary: application.experience_summary ?? "",
      githubUrl: application.github_url ?? "",
      portfolioUrl: application.portfolio_url ?? "",
      domainIds: (preferencesResult.data ?? []).map((preference) => preference.domain_id),
      answers,
      formValues: application.form_values as FormValues,
    },
  };
}

export async function updateApplicantProfile(userId: string, input: ProfileInput): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select("id")
    .single();
  if (error) throw error;
}

export async function saveApplicantDraft(input: {
  cycleId: string;
  motivation: string;
  experienceSummary: string;
  githubUrl: string;
  portfolioUrl: string;
  domainIds: string[];
  answers: Record<string, Json>;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("save_application_draft", {
    p_recruitment_cycle_id: input.cycleId,
    p_motivation: input.motivation || null,
    p_experience_summary: input.experienceSummary || null,
    p_github_url: input.githubUrl || null,
    p_portfolio_url: input.portfolioUrl || null,
    p_domain_ids: input.domainIds,
    p_answers: Object.entries(input.answers).map(([question_id, answer]) => ({
      question_id,
      answer,
    })),
  });
  if (error) throw error;
  return { id: data.id };
}

export async function submitApplicantApplication(applicationId: string): Promise<void> {
  const { error } = await supabase.rpc("submit_application", {
    p_application_id: applicationId,
  });
  if (error) throw error;
}
