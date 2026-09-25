import { useEffect, useState } from 'react';
import { Plus, GripVertical, Calendar, Clock, ArrowRight, Lock, Mail, Send } from 'lucide-react';
import { Card, Kicker, StatusChip, Button, inputCls, Field } from '../../components/ui';
import { applicants } from '../../lib/data';
import { api } from '../../lib/supabase';

type Recipient = { id: string; fullName: string; email: string; role: 'member' | 'admin' };

export function AdminMail() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<{ recipients: Recipient[] }>('/admin/recipients').then(({ recipients: people }) => setRecipients(people)).catch((err) => setNotice(err.message)); }, []);
  const toggle = (id: string) => setSelected((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  const selectGroup = (predicate: (person: Recipient) => boolean) => setSelected(recipients.filter(predicate).map((person) => person.id));
  const send = async () => {
    setBusy(true); setNotice('');
    try {
      const result = await api<{ sent: number; failures: number }>('/admin/mail', { method: 'POST', body: JSON.stringify({ recipientIds: selected, subject, message }) });
      setNotice(`Sent to ${result.sent} registered account${result.sent === 1 ? '' : 's'}${result.failures ? ` · ${result.failures} failed` : ''}.`);
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Unable to send mail.'); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
    <Card className="p-6">
      <Kicker>Registered accounts</Kicker>
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => selectGroup(() => true)}>Select all</Button><Button variant="outline" size="sm" onClick={() => selectGroup((person) => person.role === 'admin')}>All admins</Button></div>
      <p className="mt-4 text-xs text-ink-soft">Messages are sent only to the email address each person used to register.</p>
      <div className="mt-4 max-h-[420px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {recipients.map((person) => <label key={person.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-paper-2"><input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggle(person.id)} className="accent-[#5b2a86]" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{person.fullName}</span><span className="block truncate text-xs text-ink-soft">{person.email}</span></span><span className="label text-[9px] text-glaucous">{person.role}</span></label>)}
        {!recipients.length && <p className="p-4 text-sm text-ink-soft">No registered accounts are available yet.</p>}
      </div>
    </Card>
    <Card className="p-6">
      <Kicker>Compose email</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Member mailer</h1>
      <div className="mt-5 space-y-4"><Field label="Subject" required><input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Interview schedule update" /></Field><Field label="Message" required><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={9} className={inputCls} placeholder="Write the message that your selected members will receive…" /></Field></div>
      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-paper-2 p-4 text-sm"><span className="text-ink-soft"><strong className="text-ink">{selected.length}</strong> recipients selected</span><Mail size={17} className="text-tekhelet" /></div>
      {notice && <p className="mt-4 rounded-lg bg-celadon/15 px-3 py-2 text-sm text-[#1e6b43]">{notice}</p>}
      <Button variant="cta" className="mt-5 w-full" disabled={busy || !selected.length || !subject.trim() || !message.trim()} onClick={send}>{busy ? 'Sending…' : 'Send email'} <Send size={15} /></Button>
    </Card>
  </div>;
}

/* ---------------- Recruitment pipeline ---------------- */
const pipeline = [
  { stage: 'Registration', count: 324 },
  { stage: 'Technical Round', count: 258 },
  { stage: 'Task Round', count: 162 },
  { stage: 'Interview', count: 82 },
  { stage: 'Final Selection', count: 0 },
];

export function Pipeline() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Kicker>Recruitment · FY Recruitment 2026</Kicker>
          <h1 className="mt-1 font-display text-2xl font-bold">Pipeline</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusChip tone="progress">In Progress</StatusChip>
          <span className="text-sm text-ink-soft">15–30 Sep · 324 applicants</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {pipeline.map((p, i) => (
          <Card key={p.stage} hover className="group p-5">
            <div className="mb-3 flex items-center justify-between">
              <GripVertical size={16} className="cursor-grab text-line-strong group-hover:text-glaucous" />
              <span className="label text-[10px] text-glaucous">Stage {i + 1}</span>
            </div>
            <p className="font-display font-semibold">{p.stage}</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-tekhelet">{p.count || '—'}</p>
            <p className="mt-1 text-xs text-ink-soft">applicants</p>
          </Card>
        ))}
        <button className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-ink-soft transition hover:border-tekhelet hover:text-tekhelet">
          <Plus size={20} /> <span className="text-sm font-medium">Add Stage</span>
        </button>
      </div>
      <p className="text-sm text-ink-soft">Drag stages to reorder. Future coordinators can configure the entire recruitment process without developers.</p>
    </div>
  );
}

/* ---------------- Interview management ---------------- */
const schedule = [
  { time: '4:00 PM', name: 'Aarav Shah', panel: 'Panel 1' },
  { time: '4:20 PM', name: 'Riya Mehta', panel: 'Panel 1' },
  { time: '4:40 PM', name: 'Karan Joshi', panel: 'Panel 2' },
  { time: '5:00 PM', name: 'Aditya Rao', panel: 'Panel 1' },
  { time: '5:20 PM', name: 'Isha Kulkarni', panel: 'Panel 2' },
];

export function Interviews() {
  const [view, setView] = useState('Schedule');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Kicker>Interviews</Kicker><h1 className="mt-1 font-display text-2xl font-bold">26 September · 48 scheduled</h1></div>
        <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
          {['Schedule', 'Calendar', 'Panels'].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${view === v ? 'bg-indigo text-white' : 'text-ink-soft'}`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h3 className="mb-4 font-display font-semibold">Today’s interviews</h3>
          <div className="space-y-2">
            {schedule.map((s) => (
              <div key={s.time} className="group flex items-center gap-4 rounded-xl border border-line p-3 transition hover:border-line-strong">
                <div className="w-16 shrink-0 text-center">
                  <p className="font-display font-bold text-tekhelet">{s.time.split(' ')[0]}</p>
                  <p className="text-[10px] text-ink-soft">{s.time.split(' ')[1]}</p>
                </div>
                <div className="h-8 w-px bg-line" />
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-tekhelet to-indigo text-xs font-bold text-white">{s.name.split(' ').map((n) => n[0]).join('')}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-ink-soft">{s.panel} · Robotics Lab</p></div>
                <button className="opacity-0 transition group-hover:opacity-100"><StatusChip tone="info" dot={false}>Reschedule</StatusChip></button>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-3 font-display font-semibold">Panels</h3>
            {['Panel 1 · Autonomy', 'Panel 2 · Electronics', 'Panel 3 · Software'].map((p, i) => (
              <div key={p} className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0">
                <span>{p}</span><span className="font-display font-bold text-tekhelet">{[18, 16, 14][i]}</span>
              </div>
            ))}
          </Card>
          <Card className="p-6">
            <h3 className="mb-3 font-display font-semibold">Assign interview</h3>
            <Field label="Applicant"><select className={inputCls}>{applicants.map((a) => <option key={a.id}>{a.name}</option>)}</select></Field>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Slot"><input className={inputCls} defaultValue="26 Sep · 5:40 PM" /></Field>
              <Field label="Panel"><select className={inputCls}><option>Panel 1</option><option>Panel 2</option><option>Panel 3</option></select></Field>
            </div>
            <Button variant="cta" className="mt-4 w-full">Assign <Calendar size={15} /></Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Interview evaluation ---------------- */
const rubric = [
  ['Technical Fundamentals', 8, 10],
  ['Problem Solving', 9, 10],
  ['Practical Understanding', 7, 10],
  ['Learning Ability', 9, 10],
  ['Communication', 4, 5],
  ['Team Fit', 4, 5],
] as const;

export function Evaluation() {
  const a = applicants[1];
  const [scores, setScores] = useState<number[]>(rubric.map(([, v]) => v));
  const [rec, setRec] = useState('Strong Yes');
  const total = scores.reduce((s, v) => s + v, 0);
  const max = rubric.reduce((s, [, , m]) => s + m, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-[#f0d199] bg-[#fbe9c9]/50 px-4 py-2 text-sm text-[#8a5a12]">
        <Lock size={14} /> Private &amp; internal — this evaluation is visible only to the recruitment panel.
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Applicant summary */}
        <Card className="h-fit p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-tekhelet to-indigo font-display font-bold text-white">{a.name.split(' ').map((n) => n[0]).join('')}</span>
            <div><h2 className="font-display text-lg font-bold">{a.name}</h2><p className="font-mono text-xs text-ink-soft">{a.id}</p></div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {[['Year', a.year], ['Branch', a.branch], ['Primary', a.domain], ['Secondary', a.secondary], ['Task score', `${a.score}/100`]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line pb-2 last:border-0"><span className="text-ink-soft">{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-paper-2 p-3 text-xs text-ink-soft">
            <p className="font-medium text-ink">On something they built</p>
            <p className="mt-1">{a.answers[1].a}</p>
          </div>
        </Card>

        {/* Scoring */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Evaluation rubric</h3>
            <div className="text-right"><span className="label text-[10px] text-glaucous">Total</span><p className="font-display text-2xl font-extrabold text-tekhelet">{total}<span className="text-base text-ink-soft">/{max}</span></p></div>
          </div>
          <div className="mt-5 space-y-5">
            {rubric.map(([label, , maxV], i) => (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="font-display font-bold">{scores[i]} / {maxV}</span>
                </div>
                <input type="range" min={0} max={maxV} value={scores[i]}
                  onChange={(e) => setScores((s) => s.map((v, j) => (j === i ? +e.target.value : v)))}
                  className="w-full accent-[#5b2a86]" />
              </div>
            ))}
          </div>

          <Field label="Internal notes"><textarea rows={3} className={`${inputCls} mt-1`} placeholder="Panel observations..." /></Field>

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">Final recommendation</p>
            <div className="flex flex-wrap gap-2">
              {['Strong Yes', 'Yes', 'Maybe', 'No'].map((r) => (
                <button key={r} onClick={() => setRec(r)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${rec === r ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Button variant="cta" className="mt-6">Submit Evaluation <ArrowRight size={16} /></Button>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Announcements (admin) ---------------- */
export function AdminAnnouncements() {
  const audiences = ['All Applicants', 'FY', 'SY', 'Task Round', 'Interview Round', 'Selected Candidates'];
  const [aud, setAud] = useState('All Applicants');
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card className="h-fit p-6">
        <Kicker>New announcement</Kicker>
        <div className="mt-4 space-y-4">
          <Field label="Title" required><input className={inputCls} placeholder="Task Round instructions released" /></Field>
          <Field label="Message" required><textarea rows={4} className={inputCls} placeholder="Write your announcement..." /></Field>
          <div>
            <p className="mb-2 text-sm font-medium">Audience</p>
            <div className="flex flex-wrap gap-2">
              {audiences.map((x) => (
                <button key={x} onClick={() => setAud(x)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${aud === x ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-white text-ink-soft'}`}>{x}</button>
              ))}
            </div>
          </div>
          <Button variant="cta" className="w-full"><Clock size={15} /> Publish</Button>
        </div>
      </Card>
      <div>
        <h3 className="mb-3 font-display font-semibold">Recently published</h3>
        <div className="space-y-3">
          {[
            ['Task Round instructions released', 'All Applicants', '20 Sep'],
            ['Deadline updated to 24 Sep', 'Task Round', '19 Sep'],
            ['Interview slots opening soon', 'Interview Round', '17 Sep'],
          ].map(([t, a, d]) => (
            <Card key={t} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium">{t}</h4><span className="text-xs text-ink-soft">{d}</span>
              </div>
              <StatusChip tone="info" dot={false}>{a}</StatusChip>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Content CMS + generic stub ---------------- */
export function AdminContent() {
  const groups = [['Projects', 32], ['Achievements', 25], ['Team', 54], ['Gallery', 68], ['Homepage Highlights', 6]] as const;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><Kicker>Content</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Website content</h1></div>
        <Button variant="cta"><Plus size={16} /> New entry</Button></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(([g, n]) => (
          <Card key={g} hover className="p-5">
            <div className="flex items-center justify-between"><h3 className="font-display font-semibold">{g}</h3><span className="font-display text-xl font-extrabold text-tekhelet">{n}</span></div>
            <p className="mt-1 text-xs text-ink-soft">entries · last edited 2 days ago</p>
            <div className="mt-4 flex gap-2 text-sm">
              <button className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-tekhelet hover:text-tekhelet">Manage</button>
              <button className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-tekhelet hover:text-tekhelet">Add</button>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-sm text-ink-soft">The public website can be maintained here without editing code.</p>
    </div>
  );
}

export function AdminStub({ title }: { title: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-paper-2 text-tekhelet"><Lock size={22} /></div>
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <p className="mt-1 max-w-sm text-sm text-ink-soft">This module is part of the platform system and shares the same design language as the screens built out here.</p>
      </div>
    </div>
  );
}
