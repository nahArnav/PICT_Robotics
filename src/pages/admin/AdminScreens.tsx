import { useState } from "react";
import { useSearchParams } from "react-router";
import { Button, Card, Field, Kicker, inputCls } from "../../components/ui";
import { DataState } from "../../components/DataState";
import { useAuthState, authErrorMessage } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { useRemote } from "../../lib/useRemote";
import {
  getApplicants,
  getApplicationDetail,
  getInterviews,
  getStaff,
  createInterview,
  createEvaluation,
  updateEvaluation,
  getRecruitmentCycles,
} from "../../lib/services/admin";
import { ResourceManager, toLocalTime } from "./ResourceManager";
import type { ResourceName } from "../../lib/services/resources";
import { AdminOverview } from "./Overview";

function ResourceTabs({
  title,
  options,
}: {
  title: string;
  options: Array<[ResourceName, string]>;
}) {
  const [selected, setSelected] = useState<ResourceName>(options[0][0]);
  return (
    <div className="space-y-6">
      <div>
        <Kicker>Administration</Kicker>
        <h1 className="mt-1 font-display text-2xl font-bold">{title}</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {title === "Recruitment management" && (
          <Button to="/admin/form-builder" variant="cta">
            Application form builder
          </Button>
        )}
        {options.map(([table, label]) => (
          <Button
            key={table}
            variant={selected === table ? "primary" : "outline"}
            onClick={() => setSelected(table)}
          >
            {label}
          </Button>
        ))}
      </div>
      {selected === "recruitment_questions" && (
        <p className="rounded-lg border border-line bg-white p-4 text-sm text-ink-soft">
          These questions support older saved applications. Use Application form builder to add or
          import questions, then publish the complete form for new applicants.
        </p>
      )}
      <ResourceManager key={selected} table={selected} />
    </div>
  );
}
export function Pipeline() {
  return (
    <ResourceTabs
      title="Recruitment management"
      options={[
        ["recruitment_cycles", "Cycles"],
        ["recruitment_rounds", "Rounds"],
        ["recruitment_questions", "Questions"],
        ["domains", "Domains"],
      ]}
    />
  );
}
export function AdminAnnouncements() {
  return <ResourceTabs title="Announcements" options={[["announcements", "Announcements"]]} />;
}
export function AdminContent() {
  return (
    <ResourceTabs
      title="Website content"
      options={[
        ["achievements", "Achievements"],
        ["projects", "Projects"],
        ["club_team_entries", "Team"],
        ["gallery_items", "Gallery"],
        ["homepage_metrics", "Homepage highlights"],
      ]}
    />
  );
}
export function AdminAnalytics() {
  return <AdminOverview />;
}
export function AdminStub({ title }: { title: string }) {
  return <h1 className="font-display text-2xl font-bold">{title}</h1>;
}

export function AdminTasks() {
  const remote = useRemote(async () => {
    const { data, error } = await supabase
      .from("task_submissions")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });
  return (
    <div className="space-y-6">
      <ResourceTabs title="Tasks" options={[["recruitment_tasks", "Task briefs"]]} />
      <Card className="p-6">
        <h2 className="font-display text-xl font-bold">Recent submissions</h2>
        <DataState loading={remote.loading} error={remote.error} retry={remote.refresh} />
        {remote.data?.map((row) => (
          <div key={row.id} className="mt-3 border-t border-line pt-3 text-sm">
            <p className="font-mono">Application {row.application_id}</p>
            <a
              className="text-tekhelet underline"
              href={row.repository_url}
              target="_blank"
              rel="noreferrer"
            >
              Repository
            </a>{" "}
            ·{" "}
            <a
              className="text-tekhelet underline"
              href={row.demo_url}
              target="_blank"
              rel="noreferrer"
            >
              Demo
            </a>
            <p className="mt-1">{row.notes}</p>
          </div>
        ))}
        {remote.data?.length === 0 && (
          <p className="mt-3 text-sm text-ink-soft">No task submissions yet.</p>
        )}
      </Card>
    </div>
  );
}

export function AdminMail() {
  const [page, setPage] = useState(0);
  const recipients = useRemote(async () => {
    const { data, error, count } = await supabase
      .from("profiles")
      .select("id,full_name,email", { count: "exact" })
      .order("full_name")
      .order("id")
      .range(page * 50, page * 50 + 49);
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  }, [page]);
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-6">
        <Kicker>Registered accounts</Kicker>
        <DataState
          loading={recipients.loading}
          error={recipients.error}
          retry={recipients.refresh}
        />
        <Button
          variant="outline"
          size="sm"
          className="my-4"
          onClick={() =>
            setSelected((ids) =>
              [...new Set([...ids, ...(recipients.data?.rows.map((p) => p.id) ?? [])])].slice(
                0,
                200,
              ),
            )
          }
        >
          Select this page
        </Button>
        <div className="divide-y divide-line">
          {recipients.data?.rows.map((person) => (
            <label key={person.id} className="flex items-center gap-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(person.id)}
                onChange={() =>
                  setSelected((ids) =>
                    ids.includes(person.id)
                      ? ids.filter((id) => id !== person.id)
                      : [...ids, person.id].slice(0, 200),
                  )
                }
              />
              <span>
                {person.full_name || person.email}
                <span className="block text-xs text-ink-soft">{person.email}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <Button size="sm" variant="outline" disabled={!page} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={(page + 1) * 50 >= (recipients.data?.total ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </Card>
      <Card className="h-fit p-6">
        <Kicker>Member messages</Kicker>
        <h1 className="mt-2 font-display text-2xl font-bold">Send a notification</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Delivered to the recipient’s dashboard. Email delivery requires a configured email
          provider.
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setNotice("");
            try {
              const { data, error } = await supabase.rpc("send_member_notifications", {
                p_user_ids: selected,
                p_title: subject,
                p_message: message,
                p_request_id: requestId,
              });
              if (error) throw error;
              setNotice(
                data
                  ? `Delivered ${data} in-app notifications.`
                  : "This message was already delivered.",
              );
              setSelected([]);
              setSubject("");
              setMessage("");
              setRequestId(crypto.randomUUID());
            } catch (error) {
              setNotice(authErrorMessage(error, "Unable to send the notification."));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Subject" required>
            <input
              required
              maxLength={200}
              className={inputCls}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Field>
          <Field label="Message" required>
            <textarea
              required
              maxLength={10000}
              rows={8}
              className={inputCls}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </Field>
          <p className="text-sm">{selected.length} recipients selected (maximum 200)</p>
          {notice && (
            <p role="status" className="text-sm text-ink-soft">
              {notice}
            </p>
          )}
          <Button variant="cta" disabled={busy || !selected.length}>
            {busy ? "Sending…" : "Send notification"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function Interviews() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const applicants = useRemote(() => getApplicants({ search, pageSize: 100 }), [search]);
  const staff = useRemote(getStaff);
  const interviews = useRemote(getInterviews);
  const [view, setView] = useState("Schedule");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState<string>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const blank = {
    application_id: params.get("application") ?? "",
    scheduled_at: "",
    interviewer_id: "",
    duration_minutes: 20,
    location: "",
    meeting_url: "",
    status: "scheduled" as "scheduled" | "completed" | "cancelled" | "no_show",
  };
  const [form, setForm] = useState(blank);
  const rows = (interviews.data ?? []).filter(
    (item) => !date || toLocalTime(item.scheduled_at).startsWith(date),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Kicker>Interviews</Kicker>
          <h1 className="font-display text-2xl font-bold">Interview scheduling</h1>
        </div>
        <div className="flex gap-2">
          {["Schedule", "Calendar", "Panels"].map((label) => (
            <Button
              key={label}
              size="sm"
              variant={view === label ? "primary" : "outline"}
              onClick={() => setView(label)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <DataState
        loading={interviews.loading}
        error={interviews.error || staff.error || applicants.error}
        retry={() => {
          interviews.refresh();
          staff.refresh();
          applicants.refresh();
        }}
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          {view === "Calendar" && (
            <Field label="Filter by date">
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
          )}
          {view === "Panels" &&
            staff.data?.map((person) => (
              <div key={person.id} className="mb-4 border-b border-line pb-3">
                <p className="font-semibold">{person.full_name || person.email}</p>
                <p className="text-sm text-ink-soft">
                  {
                    rows.filter((i) => i.interviewer_id === person.id && i.status === "scheduled")
                      .length
                  }{" "}
                  scheduled interviews
                </p>
              </div>
            ))}
          {view !== "Panels" &&
            rows.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-line py-4"
              >
                <div>
                  <p className="font-medium">
                    {applicants.data?.applicants.find((a) => a.id === item.application_id)?.profile
                      .full_name ?? item.application_id.slice(0, 8)}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {new Date(item.scheduled_at).toLocaleString()} · {item.duration_minutes} min
                  </p>
                  <p className="text-sm">
                    {item.location} · {item.status}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(item.id);
                    setForm({
                      application_id: item.application_id,
                      scheduled_at: toLocalTime(item.scheduled_at),
                      interviewer_id: item.interviewer_id ?? "",
                      duration_minutes: item.duration_minutes,
                      location: item.location ?? "",
                      meeting_url: item.meeting_url ?? "",
                      status: item.status,
                    });
                  }}
                >
                  Reschedule / update
                </Button>
              </div>
            ))}
          {!rows.length && <p className="text-sm text-ink-soft">No interviews for this view.</p>}
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-lg font-bold">
            {editing ? "Update interview" : "Schedule interview"}
          </h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setNotice("");
              try {
                await createInterview({
                  ...form,
                  id: editing,
                  scheduled_at: new Date(form.scheduled_at).toISOString(),
                });
                setNotice("Interview saved. The applicant has been notified.");
                setEditing(undefined);
                setForm(blank);
                interviews.refresh();
                applicants.refresh();
              } catch (error) {
                setNotice(authErrorMessage(error, "Unable to save this interview."));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Find applicant">
              <input
                className={inputCls}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
              />
            </Field>
            <Field label="Shortlisted applicant" required>
              <select
                required
                disabled={Boolean(editing)}
                className={inputCls}
                value={form.application_id}
                onChange={(event) => setForm({ ...form, application_id: event.target.value })}
              >
                <option value="">Select applicant</option>
                {applicants.data?.applicants
                  .filter((a) => ["shortlisted", "interview_scheduled"].includes(a.status))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.profile.full_name} · {a.profile.email}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Interviewer" required>
              <select
                required
                className={inputCls}
                value={form.interviewer_id}
                onChange={(event) => setForm({ ...form, interviewer_id: event.target.value })}
              >
                <option value="">Select interviewer</option>
                {staff.data?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name || person.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date and time" required>
              <input
                required
                type="datetime-local"
                className={inputCls}
                value={form.scheduled_at}
                onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })}
              />
            </Field>
            <Field label="Duration in minutes">
              <input
                type="number"
                min={5}
                max={480}
                required
                className={inputCls}
                value={form.duration_minutes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    duration_minutes: Number(event.target.value),
                  })
                }
              />
            </Field>
            <Field label="Venue">
              <input
                className={inputCls}
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
              />
            </Field>
            <Field label="Meeting URL">
              <input
                type="url"
                className={inputCls}
                value={form.meeting_url}
                onChange={(event) => setForm({ ...form, meeting_url: event.target.value })}
              />
            </Field>
            {editing && (
              <Field label="Status">
                <select
                  className={inputCls}
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as typeof form.status,
                    })
                  }
                >
                  {["scheduled", "completed", "cancelled", "no_show"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </Field>
            )}
            {notice && (
              <p role="status" className="text-sm text-ink-soft">
                {notice}
              </p>
            )}
            <Button variant="cta" disabled={busy}>
              {busy ? "Saving…" : "Save interview"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(undefined);
                  setForm(blank);
                }}
              >
                Cancel edit
              </Button>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}

const rubric = [
  ["Technical fundamentals", 10],
  ["Problem solving", 10],
  ["Practical understanding", 10],
  ["Learning ability", 10],
  ["Communication", 5],
  ["Team fit", 5],
] as const;
export function Evaluation() {
  const auth = useAuthState();
  const [search, setSearch] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const applicants = useRemote(() => getApplicants({ search, pageSize: 100 }), [search]);
  const detail = useRemote(
    () => (applicationId ? getApplicationDetail(applicationId) : Promise.resolve(null)),
    [applicationId],
  );
  const [scores, setScores] = useState([0, 0, 0, 0, 0, 0]);
  const [feedback, setFeedback] = useState("");
  const [rec, setRec] = useState<"strong_yes" | "yes" | "maybe" | "no">("maybe");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const own = detail.data?.evaluations.find(
    (item) => item.evaluator_id === auth.user?.id && !item.round_id,
  );
  return (
    <div className="space-y-6">
      <Kicker>Private recruitment evaluations</Kicker>
      <h1 className="font-display text-2xl font-bold">Evaluate an applicant</h1>
      <DataState
        loading={applicants.loading || detail.loading}
        error={applicants.error || detail.error}
        retry={applicants.refresh}
      />
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="h-fit space-y-4 p-6">
          <Field label="Find applicant">
            <input
              className={inputCls}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Applicant">
            <select
              className={inputCls}
              value={applicationId}
              onChange={(event) => {
                setApplicationId(event.target.value);
                setNotice("");
                setScores([0, 0, 0, 0, 0, 0]);
                setFeedback("");
              }}
            >
              <option value="">Select applicant</option>
              {applicants.data?.applicants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.profile.full_name} · {a.profile.email}
                </option>
              ))}
            </select>
          </Field>
          {detail.data?.evaluations.map((evaluation) => (
            <div className="border-t border-line pt-3 text-sm" key={evaluation.id}>
              <p>
                Score {evaluation.overall_score}/50 · {evaluation.recommendation}
              </p>
              <p className="text-ink-soft">{evaluation.feedback}</p>
              {evaluation.evaluator_id === auth.user?.id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const saved = evaluation.rubric_scores;
                    setScores(
                      Array.isArray(saved)
                        ? saved.map(Number)
                        : [
                            evaluation.technical_score ?? 0,
                            evaluation.problem_solving_score ?? 0,
                            0,
                            0,
                            evaluation.communication_score ?? 0,
                            evaluation.teamwork_score ?? 0,
                          ],
                    );
                    setFeedback(evaluation.feedback ?? "");
                    setRec(evaluation.recommendation ?? "maybe");
                  }}
                >
                  Load my evaluation
                </Button>
              )}
            </div>
          ))}
        </Card>
        <Card className="p-6">
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!auth.user) return;
              setBusy(true);
              setNotice("");
              try {
                const input = {
                  application_id: applicationId,
                  evaluator_id: auth.user.id,
                  technical_score: scores[0],
                  problem_solving_score: scores[1],
                  communication_score: scores[4],
                  teamwork_score: scores[5],
                  overall_score: scores.reduce((a, b) => a + b, 0),
                  rubric_scores: scores,
                  feedback,
                  recommendation: rec,
                };
                if (own) await updateEvaluation(own.id, input);
                else await createEvaluation(input);
                setNotice("Evaluation saved.");
                detail.refresh();
              } catch (error) {
                setNotice(authErrorMessage(error, "Unable to save this evaluation."));
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="font-display text-xl font-bold">
              Rubric · {scores.reduce((a, b) => a + b, 0)}/50
            </h2>
            <div className="my-5 space-y-4">
              {rubric.map(([label, max], index) => (
                <Field label={`${label} · ${scores[index]}/${max}`} key={label}>
                  <input
                    type="range"
                    min={0}
                    max={max}
                    value={scores[index]}
                    className="w-full accent-[#5b2a86]"
                    onChange={(event) =>
                      setScores((current) =>
                        current.map((score, i) =>
                          i === index ? Number(event.target.value) : score,
                        ),
                      )
                    }
                  />
                </Field>
              ))}
            </div>
            <Field label="Internal notes">
              <textarea
                className={inputCls}
                rows={4}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
              />
            </Field>
            <Field label="Recommendation">
              <select
                className={inputCls}
                value={rec}
                onChange={(event) => setRec(event.target.value as typeof rec)}
              >
                {["strong_yes", "yes", "maybe", "no"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            {notice && (
              <p className="mt-4 text-sm text-ink-soft" role="status">
                {notice}
              </p>
            )}
            <Button variant="cta" className="mt-5" disabled={busy || !applicationId}>
              {busy ? "Saving…" : own ? "Update my evaluation" : "Submit evaluation"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
