import { useState } from 'react';
import { Link } from 'react-router';
import { Check, Lock, ArrowRight, Link2, CalendarClock, MapPin, Users, Clock, PartyPopper } from 'lucide-react';
import { Button, Card, Field, Kicker, StatusChip, inputCls, GithubIcon } from '../../components/ui';
import { LineFollowerTrack } from '../../components/widgets';
import { applicantProgress, announcements } from '../../lib/data';

/* ------------------- Progress stepper (shared) ------------------- */
function ProgressStepper() {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {applicantProgress.map((s, i) => {
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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome back, Aarav</h1>
          <p className="text-sm text-ink-soft">FY Recruitment 2026 · Application <span className="font-mono">RC-FY-0241</span></p>
        </div>
        <StatusChip tone="progress">In Progress</StatusChip>
      </div>

      <Card className="p-6">
        <Kicker>Recruitment progress</Kicker>
        <p className="mb-4 mt-1 text-sm text-ink-soft">Where you are, what’s next, and when it’s due.</p>
        <ProgressStepper />
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Current Round" value="Task Round" sub="Deadline · 24 Sep, 11:59 PM" tone="progress" />
        <StatCard label="Application ID" value="RC-FY-0241" sub="First Year · Software" tone="info" />
        <StatCard label="Current Status" value="Task Assigned" sub="Upcoming: Technical Interview" tone="warn" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Kicker>Current task</Kicker>
            <StatusChip tone="warn" dot={false}>Not submitted</StatusChip>
          </div>
          <h3 className="mt-3 font-display text-xl font-bold">Build a Line Following Robot Simulation</h3>
          <p className="mt-2 text-sm text-ink-soft">Simulate a PID-controlled line follower and submit your code and a short write-up. Due 24 Sep.</p>
          <Button to="/dashboard/task" variant="cta" className="mt-5">View Task <ArrowRight size={16} /></Button>
        </Card>
        <Card className="p-6">
          <Kicker>Announcements</Kicker>
          <ul className="mt-3 space-y-3">
            {announcements.map((a) => (
              <li key={a.title} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <span className="shrink-0 text-xs text-ink-soft">{a.date}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">{a.body}</p>
              </li>
            ))}
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
              <Check size={16} /> Submitted on 22 Sep · 8:42 PM
            </div>
            <div className="text-sm text-ink-soft"><span className="font-medium text-ink">GitHub:</span> github.com/aaravshah/line-follower-sim</div>
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
  const [slot, setSlot] = useState(1);
  const slots = ['26 Sep · 4:00 PM', '26 Sep · 4:20 PM', '26 Sep · 4:40 PM', '27 Sep · 5:00 PM'];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Kicker>Technical Interview</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Your interview</h1></div>
        <StatusChip tone="done" dot={false}>Confirmed</StatusChip>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-px bg-line sm:grid-cols-4">
          {[
            [CalendarClock, 'Date', '26 September 2026'],
            [Clock, 'Time', slots[slot]?.split('· ')[1] ?? '4:20 PM'],
            [MapPin, 'Venue', 'Robotics Lab'],
            [Users, 'Panel', 'Panel 03'],
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
        <h3 className="font-display font-semibold">Choose interview slot</h3>
        <p className="mt-1 text-sm text-ink-soft">Pick the slot that works for you. You can change it up to 24 hours before.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {slots.map((s, i) => (
            <button key={s} onClick={() => setSlot(i)}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${slot === i ? 'border-tekhelet bg-tekhelet/[0.05]' : 'border-line bg-white hover:border-line-strong'}`}>
              <span className="text-sm font-medium">{s}</span>
              {slot === i && <Check size={16} className="text-tekhelet" />}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-display font-semibold">Instructions</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>Arrive 10 minutes early at the Robotics Lab.</li>
          <li>Bring a laptop with your task submission ready to demo.</li>
          <li>Be ready to discuss your projects and fundamentals.</li>
        </ul>
      </Card>
    </div>
  );
}

/* ------------------- Result screen ------------------- */
export function DashResult() {
  const [state, setState] = useState<'selected' | 'pending' | 'waitlist' | 'rejected'>('selected');
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap gap-2">
        {(['selected', 'pending', 'waitlist', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => setState(s)}
            className={`rounded-lg border px-3 py-1 text-xs font-medium capitalize transition ${state === s ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-white text-ink-soft'}`}>
            {s}
          </button>
        ))}
      </div>

      {state === 'selected' && (
        <Card className="relative overflow-hidden bg-indigo p-10 text-center text-white">
          <div className="bp-grid-dark absolute inset-0 opacity-60" />
          <div className="relative">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-celadon text-indigo"><PartyPopper size={26} /></div>
            <p className="label mt-6 text-[11px] text-teal">Result · FY Recruitment 2026</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight md:text-4xl">WELCOME TO<br /><span className="text-celadon">PICT ROBOTICS CLUB</span></h1>
            <p className="mt-4 text-white/70">Your recruitment process is complete. We can’t wait to build with you.</p>
            <Button variant="cta" className="mt-7">Continue <ArrowRight size={16} /></Button>
          </div>
        </Card>
      )}
      {state === 'pending' && <ResultSimple tone="progress" title="Result Pending" body="Your interview is complete. Results will be announced on 30 September 2026." />}
      {state === 'waitlist' && <ResultSimple tone="warn" title="Waitlisted" body="You're on the waitlist. We'll reach out if a spot opens up. Thank you for applying." />}
      {state === 'rejected' && <ResultSimple tone="neutral" title="Not Selected This Time" body="Thank you for applying. We encourage you to build more and apply again next cycle." />}
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
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><Kicker>Your application</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Submitted application</h1></div>
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {[['Name', 'Aarav Shah'], ['Email', 'aarav.shah@pict.edu'], ['Branch · Division', 'IT · B'], ['Year', 'First Year'], ['Primary', 'Software'], ['Secondary', 'Computer Vision']].map(([k, v]) => (
            <div key={k}><span className="label text-[10px] text-glaucous">{k}</span><p className="mt-0.5 font-medium">{v}</p></div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-display font-semibold">Answers</h3>
        <div className="mt-3 space-y-4 text-sm">
          <div><p className="font-medium">Why do you want to join Robotics Club?</p><p className="mt-1 text-ink-soft">I have built small line-followers on my own and want to work on serious autonomous systems with a team.</p></div>
          <div><p className="font-medium">Tell us about something you have built.</p><p className="mt-1 text-ink-soft">A PID-tuned line follower on Arduino and a small OpenCV object tracker.</p></div>
        </div>
      </Card>
    </div>
  );
}

export function DashAnnouncements() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><Kicker>Announcements</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Recruitment updates</h1></div>
      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.title} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display font-semibold">{a.title}</h3>
              <span className="text-xs text-ink-soft">{a.date}</span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{a.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
