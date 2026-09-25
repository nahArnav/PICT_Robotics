import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Check, Lock, ArrowRight, Link2, CalendarClock, MapPin, Users, Clock, PartyPopper } from 'lucide-react';
import { Button, Card, Field, Kicker, StatusChip, inputCls, GithubIcon } from '../../components/ui';
import { LineFollowerTrack } from '../../components/widgets';
import { useAuthState, authErrorMessage } from '../../lib/auth';
import { loadDashboardData, deriveProgressStages, type ApplicantDashboardData } from '../../lib/services/applicant';
import { getPublishedAnnouncements, type Announcement } from '../../lib/services/announcements';

/* ------------------- Progress stepper (shared) ------------------- */
function ProgressStepper({ status }: { status: string | null }) {
  const stages = deriveProgressStages(status as any);
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {stages.map((s, i) => {
        const tone = s.state === 'done' ? 'done' : s.state === 'current' ? 'progress' : 'locked';
        return (
          <div key={s.name} className={`relative rounded-xl border p-4 ${s.state === 'current' ? 'border-tekhelet bg-tekhelet/[0.04]' : 'border-line bg-white'}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="label text-[10px] text-glaucous">{String(i + 1).padStart(2, '0')}</span>
              <span className={`grid h-6 w-6 place-items-center rounded-full ${s.state === 'done' ? 'bg-celadon text-indigo' : s.state === 'current' ? 'bg-tekhelet text-white' : 'bg-paper-2 text-ink-soft'}`}>
                {s.state === 'done' ? <Check size={13} /> : s.state === 'locked' ? <Lock size={12} /> : <Clock size={12} />}
              </span>
            </div>
            <p className="text-sm font-semibold">{s.name}</p>
            <div className="mt-2"><StatusChip tone={tone as any} dot={false}>{s.state === 'done' ? 'Cleared' : s.state === 'current' ? 'Current' : 'Locked'}</StatusChip></div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------- Overview ------------------- */
export function DashOverview() {
  const auth = useAuthState();
  const [data, setData] = useState<ApplicantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.ready || !auth.user) return;
    let active = true;
    loadDashboardData(auth.user.id)
      .then((d) => { if (active) setData(d); })
      .catch((err) => { if (active) setError(authErrorMessage(err, 'Unable to load dashboard.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.ready, auth.user]);

  if (loading) return <div className="py-12 text-center text-sm text-ink-soft">Loading your dashboard…</div>;
  if (error) return <div className="py-12 text-center text-sm text-[#a13939]">{error}</div>;
  if (!data) return null;

  const name = data.profile.full_name?.split(' ')[0] ?? 'Applicant';
  const status = data.application?.status ?? null;
  const appId = data.application?.id ? `RC-${data.profile.year ?? 'FY'}-${data.application.id.slice(0, 4).toUpperCase()}` : '—';
  const primaryDomain = (data.application as any)?.domain_preferences?.[0]?.domain?.name ?? '—';

  const statusLabel: Record<string, string> = {
    draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
    shortlisted: 'Shortlisted', interview_scheduled: 'Interview Scheduled',
    selected: 'Selected', waitlisted: 'Waitlisted', rejected: 'Not Selected', withdrawn: 'Withdrawn',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome back, {name}</h1>
          <p className="text-sm text-ink-soft">{data.cycle?.name ?? 'Recruitment'} · Application <span className="font-mono">{appId}</span></p>
        </div>
        <StatusChip tone={status ? 'progress' : 'neutral'}>{statusLabel[status ?? ''] ?? 'Not Started'}</StatusChip>
      </div>

      <Card className="p-6">
        <Kicker>Recruitment progress</Kicker>
        <p className="mb-4 mt-1 text-sm text-ink-soft">Where you are, what's next, and when it's due.</p>
        <ProgressStepper status={status} />
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Current Stage" value={statusLabel[status ?? ''] ?? 'Apply'} sub={data.cycle ? `Deadline · ${new Date(data.cycle.application_close).toLocaleDateString()}` : '—'} tone="progress" />
        <StatCard label="Application ID" value={appId} sub={`${data.profile.year ?? 'FY'} · ${primaryDomain}`} tone="info" />
        <StatCard label="Current Status" value={statusLabel[status ?? ''] ?? 'Not Started'} sub="Check back for updates" tone="warn" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {!data.application || data.application.status === 'draft' ? (
          <Card className="p-6">
            <Kicker>Get started</Kicker>
            <h3 className="mt-3 font-display text-xl font-bold">Complete your application</h3>
            <p className="mt-2 text-sm text-ink-soft">Fill out your details and submit before the deadline.</p>
            <Button to="/apply" variant="cta" className="mt-5">Start Application <ArrowRight size={16} /></Button>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <Kicker>Application</Kicker>
              <StatusChip tone="done" dot={false}>Submitted</StatusChip>
            </div>
            <h3 className="mt-3 font-display text-xl font-bold">Application Submitted</h3>
            <p className="mt-2 text-sm text-ink-soft">Your application has been received. Check back for status updates.</p>
            <Button to="/dashboard/application" variant="outline" className="mt-5">View Application <ArrowRight size={16} /></Button>
          </Card>
        )}
        <Card className="p-6">
          <Kicker>Announcements</Kicker>
          <ul className="mt-3 space-y-3">
            {data.notifications.slice(0, 4).map((n) => (
              <li key={n.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <span className="shrink-0 text-xs text-ink-soft">{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">{n.message}</p>
              </li>
            ))}
            {data.notifications.length === 0 && <li className="text-sm text-ink-soft">No announcements yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: any }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="label text-[10px] text-glaucous">{label}</span>
        <StatusChip tone={tone} dot={false}>{tone === 'progress' ? 'Active' : tone === 'warn' ? 'Action' : 'Info'}</StatusChip>
      </div>
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-ink-soft">{sub}</p>
    </Card>
  );
}

/* ------------------- Task screen ------------------- */
export function DashTask() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Kicker>Task Round</Kicker>
          <h1 className="mt-1 font-display text-2xl font-bold">Line Following Robot Simulation</h1>
        </div>
        <StatusChip tone={submitted ? 'done' : 'warn'} dot={false}>{submitted ? 'Submitted' : 'Not submitted'}</StatusChip>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-6 text-sm">
          <div><span className="label text-[10px] text-glaucous">Deadline</span><p className="mt-1 font-medium">24 Sep · 11:59 PM</p></div>
          <div><span className="label text-[10px] text-glaucous">Domain</span><p className="mt-1 font-medium">Software</p></div>
          <div><span className="label text-[10px] text-glaucous">Weight</span><p className="mt-1 font-medium">Task Round · 30%</p></div>
        </div>
        <hr className="my-5 border-line" />
        <div className="mb-5 overflow-hidden rounded-xl border border-line bg-paper-2/50 px-4 py-3">
          <span className="label text-[10px] text-glaucous">Reference behaviour</span>
          <LineFollowerTrack className="mt-1 h-20 w-full" />
        </div>
        <h3 className="font-display font-semibold">Instructions</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>Simulate a differential-drive robot following a black line on a white track.</li>
          <li>Implement a PID controller and expose tunable gains.</li>
          <li>Handle at least one 90° turn and one gap in the line.</li>
          <li>Record a 30-second demo and include it in your submission.</li>
        </ol>
        <h3 className="mt-5 font-display font-semibold">Resources</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li><a className="text-tekhelet hover:underline" href="#">Starter simulation template ↗</a></li>
          <li><a className="text-tekhelet hover:underline" href="#">PID tuning guide ↗</a></li>
        </ul>
      </Card>

      <Card className="p-6">
        <h3 className="font-display font-semibold">{submitted ? 'Your submission' : 'Submission'}</h3>
        {submitted ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-celadon/15 px-4 py-3 text-sm text-[#1e6b43]">
              <Check size={16} /> Submitted
            </div>
            <Button variant="outline" onClick={() => setSubmitted(false)}>Edit Submission</Button>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
            <Field label="GitHub URL" required>
              <div className="relative"><GithubIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" /><input className={`${inputCls} pl-9`} placeholder="github.com/you/project" /></div>
            </Field>
            <Field label="Drive URL (demo video)" required>
              <div className="relative"><Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" /><input className={`${inputCls} pl-9`} placeholder="drive.google.com/..." /></div>
            </Field>
            <Field label="Notes"><textarea rows={3} className={inputCls} placeholder="Anything the reviewers should know..." /></Field>
            <Button variant="cta" className="w-full">Submit Task</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

/* ------------------- Interview screen ------------------- */
export function DashInterview() {
  const auth = useAuthState();
  const [data, setData] = useState<ApplicantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.user) return;
    loadDashboardData(auth.user.id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [auth.ready, auth.user]);

  if (loading) return <div className="py-12 text-center text-sm text-ink-soft">Loading…</div>;

  const interview = data?.interviews?.[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Kicker>Technical Interview</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Your interview</h1></div>
        <StatusChip tone={interview ? 'done' : 'neutral'} dot={false}>{interview ? 'Scheduled' : 'Not Scheduled'}</StatusChip>
      </div>

      {interview ? (
        <>
          <Card className="overflow-hidden">
            <div className="grid gap-px bg-line sm:grid-cols-4">
              {[
                [CalendarClock, 'Date', new Date(interview.scheduled_at).toLocaleDateString()],
                [Clock, 'Time', new Date(interview.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })],
                [MapPin, 'Venue', interview.location ?? 'TBD'],
                [Users, 'Duration', `${interview.duration_minutes} min`],
              ].map(([Icon, k, v]: any) => (
                <div key={k} className="bg-white p-5">
                  <Icon size={16} className="text-tekhelet" />
                  <p className="label mt-2 text-[10px] text-glaucous">{k}</p>
                  <p className="mt-1 text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="font-display font-semibold">Instructions</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
              <li>Arrive 10 minutes early at the designated venue.</li>
              <li>Bring a laptop with your task submission ready to demo.</li>
              <li>Be ready to discuss your projects and fundamentals.</li>
            </ul>
          </Card>
        </>
      ) : (
        <Card className="p-10 text-center">
          <StatusChip tone="neutral" dot={false}>Not Scheduled</StatusChip>
          <h2 className="mt-4 font-display text-xl font-bold">Interview not yet scheduled</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">When your interview is assigned, details will appear here. Check back later.</p>
        </Card>
      )}
    </div>
  );
}

/* ------------------- Result screen ------------------- */
export function DashResult() {
  const auth = useAuthState();
  const [data, setData] = useState<ApplicantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.user) return;
    loadDashboardData(auth.user.id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [auth.ready, auth.user]);

  if (loading) return <div className="py-12 text-center text-sm text-ink-soft">Loading…</div>;

  const status = data?.application?.status;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {status === 'selected' && (
        <Card className="relative overflow-hidden bg-indigo p-10 text-center text-white">
          <div className="bp-grid-dark absolute inset-0 opacity-60" />
          <div className="relative">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-celadon text-indigo"><PartyPopper size={26} /></div>
            <p className="label mt-6 text-[11px] text-teal">Result · {data?.cycle?.name ?? 'Recruitment'}</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight md:text-4xl">WELCOME TO<br /><span className="text-celadon">PICT ROBOTICS CLUB</span></h1>
            <p className="mt-4 text-white/70">Your recruitment process is complete. We can't wait to build with you.</p>
            <Button variant="cta" className="mt-7">Continue <ArrowRight size={16} /></Button>
          </div>
        </Card>
      )}
      {status === 'waitlisted' && <ResultSimple tone="warn" title="Waitlisted" body="You're on the waitlist. We'll reach out if a spot opens up. Thank you for applying." />}
      {status === 'rejected' && <ResultSimple tone="neutral" title="Not Selected This Time" body="Thank you for applying. We encourage you to build more and apply again next cycle." />}
      {(!status || !['selected', 'waitlisted', 'rejected'].includes(status)) && (
        <ResultSimple tone="progress" title="Result Pending" body="Your recruitment process is ongoing. Results will be announced once all rounds are complete." />
      )}
    </div>
  );
}

function ResultSimple({ title, body, tone }: { title: string; body: string; tone: any }) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto mb-4"><StatusChip tone={tone} dot={false}>{title}</StatusChip></div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">{body}</p>
      <Button to="/" variant="outline" className="mt-6">Back to home</Button>
    </Card>
  );
}

/* ------------------- Application (read-only) & Announcements ------------------- */
export function DashApplication() {
  const auth = useAuthState();
  const [data, setData] = useState<ApplicantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.user) return;
    loadDashboardData(auth.user.id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [auth.ready, auth.user]);

  if (loading) return <div className="py-12 text-center text-sm text-ink-soft">Loading application…</div>;

  const app = data?.application;
  const profile = data?.profile;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><Kicker>Your application</Kicker><h1 className="mt-1 font-display text-2xl font-bold">{app?.status === 'draft' ? 'Draft application' : 'Submitted application'}</h1></div>
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Name', profile?.full_name ?? '—'],
            ['Email', profile?.email ?? '—'],
            ['Branch · Division', `${profile?.branch ?? '—'} · ${profile?.division ?? '—'}`],
            ['Year', profile?.year === 'FY' ? 'First Year' : profile?.year === 'SY' ? 'Second Year' : '—'],
            ['Primary', (app as any)?.domain_preferences?.[0]?.domain?.name ?? '—'],
            ['Secondary', (app as any)?.domain_preferences?.[1]?.domain?.name ?? '—'],
          ].map(([k, v]) => (
            <div key={k}><span className="label text-[10px] text-glaucous">{k}</span><p className="mt-0.5 font-medium">{v}</p></div>
          ))}
        </div>
      </Card>
      {app && (
        <Card className="p-6">
          <h3 className="font-display font-semibold">Details</h3>
          <div className="mt-3 space-y-4 text-sm">
            {app.motivation && <div><p className="font-medium">Why do you want to join Robotics Club?</p><p className="mt-1 text-ink-soft">{app.motivation}</p></div>}
            {app.experience_summary && <div><p className="font-medium">Experience</p><p className="mt-1 text-ink-soft">{app.experience_summary}</p></div>}
            {(app as any)?.answers?.map((a: any) => (
              <div key={a.question_id}><p className="font-medium">{a.question?.question ?? 'Question'}</p><p className="mt-1 text-ink-soft">{String(a.answer)}</p></div>
            ))}
          </div>
        </Card>
      )}
      {!app && <Card className="p-6 text-center text-sm text-ink-soft">You haven't started an application yet. <Link to="/apply" className="font-semibold text-tekhelet">Apply now</Link></Card>}
    </div>
  );
}

export function DashAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedAnnouncements().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><Kicker>Announcements</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Recruitment updates</h1></div>
      {loading && <p className="text-sm text-ink-soft">Loading…</p>}
      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display font-semibold">{a.title}</h3>
              <span className="text-xs text-ink-soft">{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{a.content}</p>
          </Card>
        ))}
        {!loading && items.length === 0 && <Card className="p-5 text-center text-sm text-ink-soft">No announcements yet.</Card>}
      </div>
    </div>
  );
}
