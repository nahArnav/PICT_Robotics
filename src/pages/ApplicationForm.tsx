import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, Check, Cloud } from "lucide-react";
import { authErrorMessage, useAuthState } from "../lib/auth";
import {
  loadApplicantFormData,
  submitApplicantApplication,
  type ApplicantFormData,
} from "../lib/recruitment";
import {
  allFields,
  initialFormValues,
  validateFormAnswer,
  type ApplicationFormSchema,
  type FormValues,
} from "../lib/applicationForms";
import { saveBuiltDraft } from "../lib/services/applicationForms";
import { BuiltFormField, BuiltFormReview } from "../components/ApplicationFormFields";
import { Button } from "../components/ui";
import { DataState } from "../components/DataState";
import { Logo } from "../components/Logo";
import { LegacyApplicationForm } from "./LegacyApplicationForm";

export function ApplicationForm() {
  const auth = useAuthState();
  const [params] = useSearchParams();
  const cycleId = params.get("cycle") ?? undefined;
  const [data, setData] = useState<ApplicantFormData | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!auth.ready || !auth.user || auth.role !== "applicant") return;
    let active = true;
    setLoading(true);
    setData(null);
    setError("");
    void loadApplicantFormData(auth.user.id, cycleId)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((error) => {
        if (active) setError(authErrorMessage(error, "Unable to load the application form."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auth.ready, auth.user?.id, auth.role, cycleId, retry]);
  if (!auth.ready) return null;
  if (!auth.user || auth.role !== "applicant") return <Navigate to="/signin" replace />;
  if (loading || error || !data)
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <DataState loading={loading} error={error} retry={() => setRetry((value) => value + 1)} />
      </div>
    );
  if (data.draft && data.draft.status !== "draft")
    return <Navigate to="/dashboard/application" replace />;
  if (data.cycle && data.form.mode === "legacy") return <LegacyApplicationForm />;
  if (!data.cycle || data.form.mode !== "builder" || !data.form.schema || !data.form.revision)
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-6 py-16">
        <Logo />
        <h1 className="font-display text-2xl font-bold">Application form unavailable</h1>
        <p role="status" className="rounded-xl border border-line bg-white p-5 text-sm">
          {!data.cycle
            ? "Your login is working, but an administrator must open a campaign with valid application dates before you can continue."
            : "An admin has not published an application form for this drive yet. Please check back after the club publishes it."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button to="/dashboard/profile" variant="outline">
            Update my profile
          </Button>
          <Button to="/recruitment" variant="outline">
            Check recruitment
          </Button>
        </div>
        <Button disabled variant="outline">
          Save Draft
        </Button>
        <Button disabled className="ml-3">
          Continue
        </Button>
      </div>
    );
  return (
    <BuiltApplication
      key={`${data.cycle.id}-${data.form.revision}`}
      data={data}
      schema={data.form.schema}
      revision={data.form.revision}
    />
  );
}

function BuiltApplication({
  data,
  schema,
  revision,
}: {
  data: ApplicantFormData;
  schema: ApplicationFormSchema;
  revision: number;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(() => ({
    ...initialFormValues(schema, data.profile),
    ...data.draft?.formValues,
  }));
  const [saving, setSaving] = useState(false),
    [notice, setNotice] = useState(""),
    [failed, setFailed] = useState(false);
  const [uploads, setUploads] = useState<Set<string>>(new Set());
  const steps = [...schema.sections.map((section) => section.title), "Review"];
  const review = step === schema.sections.length;
  const uploadState = (id: string, busy: boolean) =>
    setUploads((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  const validate = (submitting: boolean, currentOnly = false) =>
    (currentOnly ? (schema.sections[step]?.fields ?? []) : allFields(schema))
      .map((field) => validateFormAnswer(field, values[field.id], submitting))
      .find(Boolean);
  const save = async (submit = false) => {
    const validation = validate(submit);
    if (validation) {
      setNotice(validation);
      setFailed(true);
      return;
    }
    setSaving(true);
    setNotice("");
    setFailed(false);
    try {
      const draft = await saveBuiltDraft(data.cycle!.id, revision, values);
      if (submit) {
        await submitApplicantApplication(draft.id);
        navigate("/dashboard", { replace: true });
      } else setNotice("Draft saved to your account.");
    } catch (error) {
      setNotice(
        authErrorMessage(
          error,
          "Unable to save your application. Your entries are still on this screen.",
        ),
      );
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[900px] items-center justify-between px-6">
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <Cloud size={14} /> Secure draft storage
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[900px] space-y-6 px-6 py-10">
        <div>
          <h1 className="font-display text-2xl font-bold">{schema.title}</h1>
          {schema.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{schema.description}</p>
          )}
          <p className="mt-2 text-xs text-ink-soft">
            Signed in as {data.profile.email} · {data.cycle?.name}
          </p>
        </div>
        {data.form.pinned && (
          <p className="rounded-lg border border-line bg-white p-3 text-xs text-ink-soft">
            Your saved draft uses form version {revision}. Later form changes do not overwrite your
            answers.
          </p>
        )}
        <ol className="flex gap-3 overflow-x-auto pb-2" aria-label="Application steps">
          {steps.map((title, index) => (
            <li
              key={index}
              aria-current={index === step ? "step" : undefined}
              className="flex min-w-24 flex-1 items-center gap-2 text-xs"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${index <= step ? "bg-tekhelet text-white" : "bg-paper-2 text-ink-soft"}`}
              >
                {index < step ? <Check size={14} /> : index + 1}
              </span>
              <span>{title}</span>
            </li>
          ))}
        </ol>
        <section className="rounded-2xl border border-line bg-white p-6 md:p-9">
          <h2 className="font-display text-xl font-bold">{steps[step]}</h2>
          {review ? (
            <div className="mt-6">
              <p className="mb-5 text-sm text-ink-soft">
                Review your answers. Submission locks this application for review.
              </p>
              <BuiltFormReview schema={schema} values={values} />
              <p className="mt-6 rounded-lg bg-celadon/15 p-4 text-sm">
                By submitting you confirm the information above is accurate.
              </p>
            </div>
          ) : (
            <>
              {!!schema.sections[step].description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
                  {schema.sections[step].description}
                </p>
              )}
              <fieldset disabled={saving} className="mt-6 grid gap-5">
                {schema.sections[step].fields.map((field) => (
                  <BuiltFormField
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    onChange={(value) =>
                      setValues((current) => ({ ...current, [field.id]: value }))
                    }
                    onUploadState={uploadState}
                  />
                ))}
              </fieldset>
            </>
          )}
          {notice && (
            <p
              role={failed ? "alert" : "status"}
              className={`mt-5 rounded-lg border p-3 text-sm ${failed ? "border-[#f3c0c0] bg-[#fbe9e9]/60 text-[#a13939]" : "border-line bg-celadon/15"}`}
            >
              {notice}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            {step ? (
              <Button
                variant="ghost"
                disabled={saving || !!uploads.size}
                onClick={() => {
                  setStep((value) => value - 1);
                  setNotice("");
                }}
              >
                <ArrowLeft size={16} />
                Back
              </Button>
            ) : (
              <Link to="/recruitment" className="text-sm text-ink-soft">
                Cancel
              </Link>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={saving || !!uploads.size}
                onClick={() => void save()}
              >
                Save Draft
              </Button>
              <Button
                variant="cta"
                disabled={saving || !!uploads.size}
                onClick={() => {
                  if (review) {
                    void save(true);
                    return;
                  }
                  const error = validate(true, true);
                  if (error) {
                    setNotice(error);
                    setFailed(true);
                    return;
                  }
                  setStep((value) => value + 1);
                  setNotice("");
                }}
              >
                {saving ? "Saving…" : review ? "Submit Application" : "Continue"}
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
