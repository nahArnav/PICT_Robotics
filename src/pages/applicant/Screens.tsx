import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarClock, Check, Clock, Lock, PartyPopper } from "lucide-react";
import { Button, Card, Field, Kicker, StatusChip, inputCls } from "../../components/ui";
import { DataState } from "../../components/DataState";
import { useDashboard } from "./context";
import { deriveProgressStages } from "../../lib/services/applicant";
import { authErrorMessage, useAuthState } from "../../lib/auth";
import { useRemote } from "../../lib/useRemote";
import { supabase } from "../../lib/supabase";
import { getPublishedAnnouncements } from "../../lib/services/announcements";
import { markAllAsRead } from "../../lib/services/notifications";
import { NotificationActions } from "../../components/NotificationActions";
import { updateApplicantProfile, type ProfileInput } from "../../lib/recruitment";
import type { TaskRow, TaskSubmissionRow } from "../../lib/database";
import { uploadPrivateDocument, privateDocumentUrl } from "../../lib/services/storage";

const label = (value?: string | null) => (value ? value.replace(/_/g, " ") : "Not started");
function DashboardState() {
  const { loading, error, refresh } = useDashboard();
  return <DataState loading={loading} error={error} retry={refresh} />;
}

export function DashOverview() {
  const { data, loading, error } = useDashboard();
  if (loading || error || !data) return <DashboardState />;
  const status = data.application?.status;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Welcome back, {data.profile.full_name.split(" ")[0] || "Applicant"}
          </h1>
          <p className="text-sm text-ink-soft">
            {data.cycle?.name ?? "Recruitment"} · {data.profile.email}
          </p>
        </div>
        <StatusChip tone="progress">{label(status)}</StatusChip>
      </div>
      <Card className="p-6">
        <Kicker>Recruitment progress</Kicker>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {deriveProgressStages(status ?? null).map((stage, index) => (
            <div
              key={stage.name}
              className={`rounded-xl border p-4 ${
                stage.state === "current" ? "border-tekhelet bg-tekhelet/[0.04]" : "border-line"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="label text-xs text-glaucous">{index + 1}</span>
                {stage.state === "done" ? (
                  <Check size={15} />
                ) : stage.state === "current" ? (
                  <Clock size={15} />
                ) : (
                  <Lock size={15} />
                )}
              </div>
              <p className="mt-3 text-sm font-semibold">{stage.name}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {stage.state === "done"
                  ? "Completed"
                  : stage.state === "current"
                    ? "Current"
                    : "Pending"}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <Kicker>Application</Kicker>
          <h2 className="mt-3 font-display text-xl font-bold">
            {!status
              ? "Start your application"
              : status === "draft"
                ? "Continue your draft"
                : `Status: ${label(status)}`}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {data.cycle
              ? `Applications close ${new Date(data.cycle.application_close).toLocaleString()}`
              : "No recruitment campaign is available right now."}
          </p>
          <Button
            to={
              !status || status === "draft"
                ? `/apply?cycle=${data.cycle?.id ?? ""}`
                : "/dashboard/application"
            }
            variant="cta"
            className="mt-5"
          >
            {!status || status === "draft" ? "Open application" : "View application"}
            <ArrowRight size={16} />
          </Button>
        </Card>
        <Card className="p-6">
          <Kicker>Recent updates</Kicker>
          {data.notifications.slice(0, 4).map((item) => (
            <div key={item.id} className="mt-3 border-b border-line pb-3">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{item.message}</p>
            </div>
          ))}
          {!data.notifications.length && (
            <p className="mt-4 text-sm text-ink-soft">No notifications yet.</p>
          )}
          <Link to="/dashboard/announcements" className="mt-4 block text-sm text-tekhelet">
            View all updates
          </Link>
        </Card>
      </div>
    </div>
  );
}

export function DashApplication() {
  const { data, loading, error } = useDashboard();
  if (loading || error || !data) return <DashboardState />;
  const app = data.application;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Kicker>Your application</Kicker>
        <h1 className="mt-1 font-display text-2xl font-bold">
          {app ? label(app.status) : "No application yet"}
        </h1>
      </div>
      <Card className="p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            ["Name", data.profile.full_name],
            ["Email", data.profile.email],
            [
              "Branch / division",
              `${data.profile.branch ?? "—"} · ${data.profile.division ?? "—"}`,
            ],
            ["Year", data.profile.year ?? "—"],
            ...(app?.domain_preferences.map((preference, index) => [
              `${["Primary", "Secondary", "Third"][index] ?? `Preference ${index + 1}`} domain`,
              preference.domain.name,
            ]) ?? []),
          ].map(([key, value]) => (
            <div key={key}>
              <span className="label text-[10px] text-glaucous">{key}</span>
              <p className="mt-1 font-medium">{value}</p>
            </div>
          ))}
        </div>
      </Card>
      {app && (
        <Card className="space-y-4 p-6">
          <div>
            <p className="font-semibold">Why do you want to join?</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{app.motivation}</p>
          </div>
          <div>
            <p className="font-semibold">Experience</p>
            <p className="text-sm text-ink-soft">{app.experience_summary || "—"}</p>
          </div>
          {app.answers.map((answer) => (
            <div key={answer.question_id}>
              <p className="font-semibold">{answer.question.question}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                {Array.isArray(answer.answer)
                  ? answer.answer.join(", ")
                  : String(answer.answer ?? "")}
              </p>
            </div>
          ))}
        </Card>
      )}
      {(!app || app.status === "draft") && (
        <Button to={`/apply?cycle=${data.cycle?.id ?? ""}`} variant="cta">
          {app ? "Continue draft" : "Start application"}
        </Button>
      )}
    </div>
  );
}

export function DashTask() {
  const dashboard = useDashboard();
  const app = dashboard.data?.application;
  const remote = useRemote(async () => {
    if (!app) return { tasks: [], submissions: [] };
    const [tasks, submissions] = await Promise.all([
      supabase
        .from("recruitment_tasks")
        .select("*")
        .eq("recruitment_cycle_id", app.recruitment_cycle_id)
        .eq("active", true)
        .order("deadline"),
      supabase.from("task_submissions").select("*").eq("application_id", app.id),
    ]);
    if (tasks.error) throw tasks.error;
    if (submissions.error) throw submissions.error;
    return { tasks: tasks.data ?? [], submissions: submissions.data ?? [] };
  }, [app?.id]);
  if (dashboard.loading || dashboard.error) return <DashboardState />;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Kicker>Task round</Kicker>
        <h1 className="font-display text-2xl font-bold">Your tasks</h1>
      </div>
      <DataState
        loading={remote.loading}
        error={remote.error}
        retry={remote.refresh}
        empty={
          !remote.loading && !remote.data?.tasks.length
            ? "No tasks have been published for your application."
            : undefined
        }
      />
      {app &&
        remote.data?.tasks.map((task) => (
          <TaskForm
            key={task.id}
            task={task}
            applicationId={app.id}
            saved={remote.data?.submissions.find((item) => item.task_id === task.id)}
            refresh={remote.refresh}
          />
        ))}
    </div>
  );
}
function TaskForm({
  task,
  applicationId,
  saved,
  refresh,
}: {
  task: TaskRow;
  applicationId: string;
  saved?: TaskSubmissionRow;
  refresh: () => void;
}) {
  const [repo, setRepo] = useState(saved?.repository_url ?? "");
  const [demo, setDemo] = useState(saved?.demo_url ?? "");
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const closed = new Date(task.deadline) <= new Date();
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">{task.title}</h2>
        <StatusChip tone={saved ? "done" : "warn"}>
          {saved ? "Submitted" : "Not submitted"}
        </StatusChip>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        Deadline · {new Date(task.deadline).toLocaleString()}
      </p>
      <p className="my-5 whitespace-pre-wrap text-sm">{task.instructions}</p>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setNotice("");
          try {
            const { error } = await supabase.rpc("submit_task", {
              p_task_id: task.id,
              p_application_id: applicationId,
              p_repository_url: repo,
              p_demo_url: demo,
              p_notes: notes,
            });
            if (error) throw error;
            setNotice("Task submission saved.");
            refresh();
          } catch (error) {
            setNotice(authErrorMessage(error, "Unable to save your task submission."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Repository URL" required>
          <input
            required
            type="url"
            className={inputCls}
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
          />
        </Field>
        <Field label="Demo video URL" required>
          <input
            required
            type="url"
            className={inputCls}
            value={demo}
            onChange={(event) => setDemo(event.target.value)}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className={inputCls}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
        {notice && (
          <p role="status" className="text-sm text-ink-soft">
            {notice}
          </p>
        )}
        <Button variant="cta" disabled={busy || closed}>
          {closed
            ? "Deadline passed"
            : busy
              ? "Saving…"
              : saved
                ? "Update submission"
                : "Submit task"}
        </Button>
      </form>
    </Card>
  );
}

export function DashInterview() {
  const { data, loading, error } = useDashboard();
  if (loading || error || !data) return <DashboardState />;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Kicker>Interviews</Kicker>
        <h1 className="font-display text-2xl font-bold">Your interview schedule</h1>
      </div>
      {!data.interviews.length && (
        <Card className="p-8 text-center text-sm text-ink-soft">
          No interview has been scheduled yet. You'll be notified when a time is assigned.
        </Card>
      )}
      {data.interviews.map((item) => (
        <Card key={item.id} className="p-6">
          <div className="flex items-center justify-between">
            <CalendarClock className="text-tekhelet" />
            <StatusChip tone={item.status === "scheduled" ? "open" : "neutral"}>
              {label(item.status)}
            </StatusChip>
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">
            {new Date(item.scheduled_at).toLocaleString()}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {item.duration_minutes} minutes · {item.location || "Online"}
          </p>
          {item.meeting_url && item.status === "scheduled" && (
            <Button href={item.meeting_url} target="_blank" variant="cta" className="mt-4">
              Join meeting
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}

export function DashResult() {
  const { data, loading, error } = useDashboard();
  if (loading || error || !data) return <DashboardState />;
  const status = data.application?.status;
  const selected = status === "selected";
  return (
    <div className="mx-auto max-w-2xl">
      <Card className={`p-10 text-center ${selected ? "bg-indigo text-white" : ""}`}>
        {selected && <PartyPopper className="mx-auto text-celadon" size={36} />}
        <Kicker>{data.cycle?.name ?? "Recruitment"}</Kicker>
        <h1 className="mt-4 font-display text-3xl font-bold">
          {selected
            ? "Welcome to PICT Robotics Club"
            : status === "waitlisted"
              ? "You are on the waitlist"
              : status === "rejected"
                ? "Not selected this time"
                : status === "withdrawn"
                  ? "Application withdrawn"
                  : "Result pending"}
        </h1>
        <p className="mt-4 text-sm">
          {selected
            ? "Your recruitment result is confirmed. Check your updates for next steps."
            : status === "rejected"
              ? "Thank you for applying. We encourage you to keep building and apply in a future cycle."
              : "Your latest application status will appear here as the team completes the process."}
        </p>
        <Button to="/dashboard/announcements" variant="cta" className="mt-6">
          View updates
        </Button>
      </Card>
    </div>
  );
}

export function DashAnnouncements() {
  const dashboard = useDashboard();
  const announcements = useRemote(getPublishedAnnouncements);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Kicker>Updates</Kicker>
          <h1 className="font-display text-2xl font-bold">Announcements &amp; notifications</h1>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || dashboard.loading}
          onClick={async () => {
            setBusy(true);
            setNotice("");
            try {
              await markAllAsRead();
              dashboard.refresh();
            } catch (error) {
              setNotice(authErrorMessage(error, "Unable to mark notifications read."));
            } finally {
              setBusy(false);
            }
          }}
        >
          Mark all read
        </Button>
      </div>
      <DataState
        loading={dashboard.loading || announcements.loading}
        error={dashboard.error || announcements.error}
        retry={() => {
          dashboard.refresh();
          announcements.refresh();
        }}
      />
      {notice && (
        <p role="alert" className="text-sm text-ink-soft">
          {notice}
        </p>
      )}
      <p className="text-sm text-ink-soft">
        {dashboard.data?.notifications.filter((item) => !item.read).length ?? 0} unread in recent
        notifications
      </p>
      {dashboard.data?.notifications.map((item) => (
        <Card key={item.id} className={`p-5 ${item.read ? "" : "!border-tekhelet/40"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-semibold">{item.title}</h2>
            <NotificationActions
              notification={item}
              onChanged={dashboard.refresh}
              disabled={busy}
            />
          </div>
          <p className="mt-2 text-sm text-ink-soft">{item.message}</p>
        </Card>
      ))}
      {announcements.data?.map((item) => (
        <Card key={item.id} className="p-5">
          <h2 className="font-display font-semibold">{item.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{item.content}</p>
        </Card>
      ))}
      {!announcements.loading &&
        !announcements.data?.length &&
        !dashboard.data?.notifications.length && (
          <Card className="p-5 text-sm text-ink-soft">No updates yet.</Card>
        )}
    </div>
  );
}

export function DashProfile() {
  const dashboard = useDashboard();
  if (dashboard.loading || dashboard.error || !dashboard.data) return <DashboardState />;
  return (
    <ProfileForm
      key={dashboard.data.profile.id}
      initial={dashboard.data.profile}
      refresh={dashboard.refresh}
    />
  );
}
function ProfileForm({
  initial,
  refresh,
}: {
  initial: NonNullable<ReturnType<typeof useDashboard>["data"]>["profile"];
  refresh: () => void;
}) {
  const [profile, setProfile] = useState<ProfileInput>({ ...initial });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const files = useRemote(async () => {
    const { data, error } = await supabase.storage.from("private-applicant-files").list(initial.id);
    if (error) throw error;
    return data ?? [];
  });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Kicker>Applicant profile</Kicker>
        <h1 className="font-display text-2xl font-bold">Your details</h1>
      </div>
      <Card className="p-6">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setNotice("");
            try {
              const { id, email, created_at, updated_at, profile_photo_url, ...permitted } =
                profile as typeof initial;
              await updateApplicantProfile(initial.id, permitted);
              setNotice("Profile saved.");
              refresh();
            } catch (error) {
              setNotice(authErrorMessage(error, "Unable to save your profile."));
            } finally {
              setBusy(false);
            }
          }}
        >
          {(
            [
              "full_name",
              "phone",
              "roll_number",
              "branch",
              "division",
              "github_url",
              "linkedin_url",
              "portfolio_url",
              "bio",
            ] as const
          ).map((key) => (
            <Field label={label(key)} key={key}>
              <input
                className={inputCls}
                type={key.endsWith("_url") ? "url" : "text"}
                value={profile[key] ?? ""}
                onChange={(event) => setProfile({ ...profile, [key]: event.target.value })}
              />
            </Field>
          ))}
          <Field label="Academic year">
            <select
              className={inputCls}
              value={profile.year ?? "FY"}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  year: event.target.value as "FY" | "SY",
                })
              }
            >
              <option>FY</option>
              <option>SY</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <p className="text-sm text-ink-soft">
              Email: {initial.email}. Email changes must be confirmed through your account.
            </p>
            {notice && (
              <p role="status" className="my-3 text-sm">
                {notice}
              </p>
            )}
            <Button disabled={busy} variant="cta">
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </Card>
      <Card className="p-6">
        <h2 className="font-display text-xl font-bold">Private documents</h2>
        <p className="my-3 text-sm text-ink-soft">
          Upload only documents the recruitment team asks for. PDF, JPG or PNG · 5 MB maximum.
        </p>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              await uploadPrivateDocument(file);
              files.refresh();
              setNotice("Document uploaded.");
            } catch (error) {
              setNotice(authErrorMessage(error, "Upload failed."));
            } finally {
              setBusy(false);
            }
          }}
        />
        <DataState loading={files.loading} error={files.error} retry={files.refresh} />
        {files.data?.map((file) => (
          <div key={file.id} className="mt-3 flex items-center justify-between text-sm">
            <span>{file.name}</span>
            <div>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    window.open(
                      await privateDocumentUrl(`${initial.id}/${file.name}`),
                      "_blank",
                      "noopener",
                    );
                  } catch (error) {
                    setNotice(authErrorMessage(error, "Unable to open this document."));
                  }
                }}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!confirm("Delete this document?")) return;
                  const { error } = await supabase.storage
                    .from("private-applicant-files")
                    .remove([`${initial.id}/${file.name}`]);
                  if (error) setNotice(authErrorMessage(error, "Unable to delete document."));
                  else files.refresh();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
