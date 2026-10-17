import { useEffect, useState } from "react";
import { Navigate, useNavigate, Link, useSearchParams } from "react-router";
import type { Json } from "../lib/database";
import { QuestionInput, answerIsEmpty } from "../components/QuestionInput";
import { ArrowLeft, ArrowRight, Check, Cloud } from "lucide-react";
import { Button, Field, inputCls } from "../components/ui";
import { Logo } from "../components/Logo";
import { authErrorMessage, useAuthState } from "../lib/auth";
import {
  loadApplicantFormData,
  saveApplicantDraft,
  submitApplicantApplication,
  updateApplicantProfile,
  type ApplicantFormData,
  type ProfileInput,
} from "../lib/recruitment";

const steps = ["Personal Details", "Technical Profile", "Domain Preference", "Questions", "Review"];

const emptyProfile: ProfileInput = {
  full_name: "",
  phone: "",
  roll_number: "",
  branch: "",
  year: "FY",
  division: "",
  github_url: "",
  linkedin_url: "",
  portfolio_url: "",
  bio: "",
  skills: [],
  programming_languages: [],
};

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function ApplicationForm() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const cycleId = params.get("cycle") ?? undefined;
  const auth = useAuthState();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<ApplicantFormData | null>(null);
  const [profile, setProfile] = useState<ProfileInput>(emptyProfile);
  const [primaryDomainId, setPrimaryDomainId] = useState("");
  const [secondaryDomainId, setSecondaryDomainId] = useState("");
  const [thirdDomainId, setThirdDomainId] = useState("");
  const [motivation, setMotivation] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [languagesText, setLanguagesText] = useState("");
  const [answers, setAnswers] = useState<Record<string, Json>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState<"error" | "success">("error");

  useEffect(() => {
    if (!auth.ready || !auth.user || auth.role !== "applicant") return;
    let active = true;
    setLoading(true);
    void loadApplicantFormData(auth.user.id, cycleId)
      .then((data) => {
        if (!active) return;
        if (data.draft && data.draft.status !== "draft") {
          nav("/dashboard/application", { replace: true });
          return;
        }
        setFormData(data);
        setSkillsText((data.profile.skills ?? []).join(", "));
        setLanguagesText((data.profile.programming_languages ?? []).join(", "));
        setProfile({
          full_name: data.profile.full_name,
          phone: data.profile.phone ?? "",
          roll_number: data.profile.roll_number ?? "",
          branch: data.profile.branch ?? "",
          year: data.profile.year ?? "FY",
          division: data.profile.division ?? "",
          github_url: data.profile.github_url ?? "",
          linkedin_url: data.profile.linkedin_url ?? "",
          portfolio_url: data.profile.portfolio_url ?? "",
          bio: data.profile.bio ?? "",
          skills: data.profile.skills ?? [],
          programming_languages: data.profile.programming_languages ?? [],
        });
        setPrimaryDomainId(data.draft?.domainIds[0] ?? "");
        setSecondaryDomainId(data.draft?.domainIds[1] ?? "");
        setThirdDomainId(data.draft?.domainIds[2] ?? "");
        setMotivation(data.draft?.motivation ?? "");
        setExperienceSummary(data.draft?.experienceSummary ?? "");
        setGithubUrl(data.draft?.githubUrl ?? data.profile.github_url ?? "");
        setPortfolioUrl(data.draft?.portfolioUrl ?? data.profile.portfolio_url ?? "");
        setAnswers(data.draft?.answers ?? {});
      })
      .catch((error) => {
        if (active) {
          setNotice(authErrorMessage(error, "Unable to load your application."));
          setNoticeKind("error");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auth.ready, auth.role, auth.user?.id, cycleId]);

  if (!auth.ready) return null;
  if (!auth.user || auth.role !== "applicant") return <Navigate to="/signin" replace />;
  const userId = auth.user.id;

  const updateProfile = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };
  const maxPreferences = formData?.cycle?.max_preferences ?? 3;
  const preferenceIds = [primaryDomainId, secondaryDomainId, thirdDomainId];
  const preferenceLabels = ["Primary", "Secondary", "Third"];
  const selectedDomainIds = preferenceIds.slice(0, maxPreferences).filter(Boolean);
  const choosePreference = (index: number, id: string) => {
    const next = [...preferenceIds];
    next[index] = index > 0 && next[index] === id ? "" : id;
    for (let position = index + 1; position < next.length; position++) {
      if (!next[position - 1] || next.slice(0, position).includes(next[position]))
        next[position] = "";
    }
    setPrimaryDomainId(next[0]);
    setSecondaryDomainId(next[1]);
    setThirdDomainId(next[2]);
  };
  const domainName = (id: string) =>
    formData?.domains.find((domain) => domain.id === id)?.name ?? "Not selected";

  const validateStep = (targetStep: number) => {
    if (
      targetStep === 0 &&
      (!profile.full_name.trim() ||
        !profile.phone?.trim() ||
        !profile.branch?.trim() ||
        !profile.division?.trim() ||
        !profile.year)
    ) {
      return "Complete all required personal details before continuing.";
    }
    if (targetStep === 2 && !primaryDomainId) return "Select a primary domain preference.";
    if (targetStep === 3) {
      if (!motivation.trim()) return "Tell us why you want to join the club.";
      const missing = formData?.questions.find(
        (question) => question.required && answerIsEmpty(answers[question.id]),
      );
      if (missing) return `Answer the required question: ${missing.question}`;
    }
    return null;
  };

  const persistDraft = async () => {
    if (!formData?.cycle) throw new Error("There is no open recruitment cycle right now.");
    await updateApplicantProfile(userId, {
      ...profile,
      skills: splitList(skillsText),
      programming_languages: splitList(languagesText),
      github_url: githubUrl || null,
      portfolio_url: portfolioUrl || null,
    });
    return saveApplicantDraft({
      cycleId: formData.cycle.id,
      motivation,
      experienceSummary,
      githubUrl,
      portfolioUrl,
      domainIds: selectedDomainIds,
      answers,
    });
  };

  const saveDraft = async () => {
    setSaving(true);
    setNotice("");
    try {
      await persistDraft();
      setNotice("Draft saved to your account.");
      setNoticeKind("success");
    } catch (error) {
      setNotice(authErrorMessage(error, "Unable to save your draft."));
      setNoticeKind("error");
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    const validationError =
      step === steps.length - 1
        ? ([0, 2, 3].map(validateStep).find(Boolean) ?? null)
        : validateStep(step);
    if (validationError) {
      setNotice(validationError);
      setNoticeKind("error");
      return;
    }
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      setNotice("");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const draft = await persistDraft();
      await submitApplicantApplication(draft.id);
      nav("/dashboard", { replace: true });
    } catch (error) {
      setNotice(
        authErrorMessage(
          error,
          "Unable to submit your application. Your draft is still available.",
        ),
      );
      setNoticeKind("error");
    } finally {
      setSaving(false);
    }
  };

  const back = () => setStep((current) => Math.max(0, current - 1));
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-sm text-ink-soft">
        Loading your application…
      </div>
    );

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[900px] items-center justify-between px-6">
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <Cloud size={14} className="text-[#2f9e63]" /> Secure draft storage
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {steps.map((label, index) => (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition ${
                      index < step
                        ? "bg-celadon text-indigo"
                        : index === step
                          ? "bg-tekhelet text-white"
                          : "bg-paper-2 text-ink-soft"
                    }`}
                  >
                    {index < step ? <Check size={15} /> : index + 1}
                  </div>
                  <span
                    className={`hidden text-[11px] font-medium sm:block ${
                      index === step ? "text-ink" : "text-ink-soft"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-2 h-px flex-1 ${index < step ? "bg-celadon" : "bg-line"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-7 md:p-9">
          <h1 className="font-display text-2xl font-bold">{steps[step]}</h1>
          {step === 0 && formData && formData.cycles.length > 1 && (
            <Field label="Recruitment campaign">
              <select
                className={inputCls}
                value={formData.cycle?.id ?? ""}
                onChange={(event) => setParams({ cycle: event.target.value })}
              >
                {formData.cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {formData && !formData.cycle && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-[#f0d199] bg-[#fbe9c9]/50 px-4 py-3 text-sm text-[#8a5a12]"
            >
              <p>
                Recruitment is not open right now. Your login is working, but an administrator must
                open a campaign with valid application dates before you can continue.
              </p>
              <p className="mt-2">
                You can still update your profile. Opening and closing recruitment is controlled by
                the club, not by the details entered in this form.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link to="/dashboard/profile" className="font-semibold underline">
                  Update my profile
                </Link>
                <Link to="/recruitment" className="font-semibold underline">
                  Check recruitment
                </Link>
              </div>
            </div>
          )}
          <div className="mt-6">
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" required>
                  <input
                    required
                    value={profile.full_name}
                    onChange={(event) => updateProfile("full_name", event.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="PICT email">
                  <input
                    value={formData?.profile.email ?? ""}
                    className={`${inputCls} bg-paper-2`}
                    disabled
                  />
                </Field>
                <Field label="Phone" required>
                  <input
                    required
                    value={profile.phone ?? ""}
                    onChange={(event) => updateProfile("phone", event.target.value)}
                    className={inputCls}
                    placeholder="98220 11234"
                  />
                </Field>
                <Field label="Branch" required>
                  <select
                    value={profile.branch ?? ""}
                    onChange={(event) => updateProfile("branch", event.target.value)}
                    className={inputCls}
                  >
                    <option value="" disabled>
                      Select branch
                    </option>
                    <option>Computer</option>
                    <option>IT</option>
                    <option>E&TC</option>
                    <option>Mechanical</option>
                  </select>
                </Field>
                <Field label="Division" required>
                  <select
                    value={profile.division ?? ""}
                    onChange={(event) => updateProfile("division", event.target.value)}
                    className={inputCls}
                  >
                    <option value="" disabled>
                      Select division
                    </option>
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                  </select>
                </Field>
                <Field label="Year" required>
                  <select
                    value={profile.year ?? "FY"}
                    onChange={(event) => updateProfile("year", event.target.value as "FY" | "SY")}
                    className={inputCls}
                  >
                    <option value="FY">First Year (FY)</option>
                    <option value="SY">Second Year (SY)</option>
                  </select>
                </Field>
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-5">
                <Field label="Skills" hint="Comma-separated">
                  <input
                    value={skillsText}
                    onChange={(event) => setSkillsText(event.target.value)}
                    className={inputCls}
                    placeholder="PID control, PCB design, OpenCV"
                  />
                </Field>
                <Field label="Programming languages">
                  <input
                    value={languagesText}
                    onChange={(event) => setLanguagesText(event.target.value)}
                    className={inputCls}
                    placeholder="C++, Python"
                  />
                </Field>
                <Field label="Projects you've built">
                  <textarea
                    value={experienceSummary}
                    onChange={(event) => setExperienceSummary(event.target.value)}
                    rows={3}
                    className={inputCls}
                    placeholder="Briefly list what you've made..."
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="GitHub">
                    <input
                      value={githubUrl}
                      onChange={(event) => setGithubUrl(event.target.value)}
                      className={inputCls}
                      placeholder="https://github.com/username"
                    />
                  </Field>
                  <Field label="Portfolio / LinkedIn">
                    <input
                      value={portfolioUrl}
                      onChange={(event) => setPortfolioUrl(event.target.value)}
                      className={inputCls}
                      placeholder="https://…"
                    />
                  </Field>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6">
                <p className="text-sm text-ink-soft">
                  Rank up to {maxPreferences} distinct domains. Only the primary preference is
                  required. Click an optional selection again to clear it.
                </p>
                {preferenceLabels.slice(0, maxPreferences).map((label, index) => (
                  <div key={label} role="group" aria-label={`${label} preference`}>
                    <p className="mb-2 text-sm font-medium">
                      {label} preference {index === 0 && <span className="text-tekhelet">*</span>}
                    </p>
                    {index > 0 && !preferenceIds[index - 1] ? (
                      <p className="text-sm text-ink-soft">Choose the previous preference first.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {formData?.domains
                          .filter((domain) => !preferenceIds.slice(0, index).includes(domain.id))
                          .map((domain) => (
                            <button
                              type="button"
                              key={domain.id}
                              onClick={() => choosePreference(index, domain.id)}
                              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${preferenceIds[index] === domain.id ? (index === 0 ? "border-tekhelet bg-tekhelet text-white" : "border-glaucous bg-glaucous/15 text-tekhelet") : "border-line bg-white text-ink-soft hover:border-line-strong"}`}
                            >
                              {domain.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-5">
                <Field label="Why do you want to join Robotics Club?" required>
                  <textarea
                    required
                    value={motivation}
                    onChange={(event) => setMotivation(event.target.value)}
                    rows={3}
                    className={inputCls}
                  />
                </Field>
                {formData?.questions.map((question) => (
                  <Field key={question.id} label={question.question} required={question.required}>
                    <QuestionInput
                      question={question}
                      value={answers[question.id]}
                      onChange={(value) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: value,
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
            )}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-ink-soft">
                  Review your application before submitting. Submission locks this application for
                  review.
                </p>
                {[
                  ["Name", profile.full_name],
                  ["Email", formData?.profile.email ?? ""],
                  [
                    "Branch / Division",
                    `${profile.branch || "Not selected"} · ${profile.division || "Not selected"}`,
                  ],
                  ["Year", profile.year === "SY" ? "Second Year (SY)" : "First Year (FY)"],
                  ...preferenceLabels
                    .slice(0, maxPreferences)
                    .map((label, index) => [`${label} domain`, domainName(preferenceIds[index])]),
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b border-line pb-3 text-sm"
                  >
                    <span className="text-ink-soft">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-celadon/15 p-4 text-sm text-[#1e6b43]">
                  By submitting you confirm the information above is accurate.
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
            {step > 0 ? (
              <button
                onClick={back}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <Link to="/recruitment" className="text-sm text-ink-soft hover:text-ink">
                Cancel
              </Link>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                disabled={saving || !formData?.cycle}
                onClick={() => void saveDraft()}
              >
                Save Draft
              </Button>
              <Button
                variant="cta"
                disabled={saving || !formData?.cycle}
                onClick={() => void next()}
              >
                {saving ? "Saving…" : step === steps.length - 1 ? "Submit Application" : "Continue"}{" "}
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
          {notice && (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                noticeKind === "success"
                  ? "border-[#b8dfc4] bg-celadon/15 text-[#1e6b43]"
                  : "border-[#f3c0c0] bg-[#fbe9e9]/60 text-[#a13939]"
              }`}
            >
              {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
