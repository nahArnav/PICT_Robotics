import { useEffect, useState } from 'react';
import { Plus, GripVertical, Calendar, Clock, ArrowRight, Lock, Mail, Send } from 'lucide-react';
import { Card, Kicker, StatusChip, Button, inputCls, Field } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthState } from '../../lib/auth';
import {
  getDashboardMetrics,
  getOpenCycle,
  getApplicants,
  getInterviews,
  createInterview,
  createEvaluation,
} from '../../lib/services/admin';
import {
  getAllAnnouncements,
  createAnnouncement,
  type Announcement,
} from '../../lib/services/announcements';
import {
  getAllAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  type Achievement,
} from '../../lib/services/achievements';
import {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
  type Project,
} from '../../lib/services/projects';

/* ─── Member mail ─────────────────────────────────────────────────────── */
type Recipient = { id: string; fullName: string; email: string; role: 'member' | 'admin' };

export function AdminMail() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Fetch all profiles as potential recipients
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .then(({ data, error }) => {
        if (error) { setNotice(error.message); return; }
        const people = (data ?? []).map((p: any) => ({
          id: p.id,
          fullName: p.full_name,
          email: p.email,
          role: 'member' as const,
        }));
        setRecipients(people);
      });
  }, []);

  const toggle = (id: string) => setSelected((ids) => ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]);
  const selectGroup = (predicate: (person: Recipient) => boolean) => setSelected(recipients.filter(predicate).map((p) => p.id));

  const send = async () => {
    setBusy(true); setNotice('');
    try {
      // Create notifications for selected recipients
      const notifications = selected.map((userId) => ({
        user_id: userId,
        title: subject,
        message: message,
        type: 'admin_mail',
      }));
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
      setNotice(`Notification sent to ${selected.length} user${selected.length === 1 ? '' : 's'}.`);
      setSubject(''); setMessage(''); setSelected([]);
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Unable to send mail.'); }
    finally { setBusy(false); }
  };

  return <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
    <Card className="p-6">
      <Kicker>Registered accounts</Kicker>
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => selectGroup(() => true)}>Select all</Button></div>
      <p className="mt-4 text-xs text-ink-soft">Messages are sent as in-app notifications to the selected users.</p>
      <div className="mt-4 max-h-[420px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {recipients.map((person) => <label key={person.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-paper-2"><input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggle(person.id)} className="accent-[#5b2a86]" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{person.fullName}</span><span className="block truncate text-xs text-ink-soft">{person.email}</span></span></label>)}
        {!recipients.length && <p className="p-4 text-sm text-ink-soft">No registered accounts are available yet.</p>}
      </div>
    </Card>
    <Card className="p-6">
      <Kicker>Compose notification</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Member mailer</h1>
      <div className="mt-5 space-y-4"><Field label="Subject" required><input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Interview schedule update" /></Field><Field label="Message" required><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={9} className={inputCls} placeholder="Write the message that your selected members will receive…" /></Field></div>
      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-paper-2 p-4 text-sm"><span className="text-ink-soft"><strong className="text-ink">{selected.length}</strong> recipients selected</span><Mail size={17} className="text-tekhelet" /></div>
      {notice && <p className="mt-4 rounded-lg bg-celadon/15 px-3 py-2 text-sm text-[#1e6b43]">{notice}</p>}
      <Button variant="cta" className="mt-5 w-full" disabled={busy || !selected.length || !subject.trim() || !message.trim()} onClick={send}>{busy ? 'Sending…' : 'Send notification'} <Send size={15} /></Button>
    </Card>
  </div>;
}

/* ─── Recruitment pipeline ────────────────────────────────────────────── */
export function Pipeline() {
  const [stages, setStages] = useState<Array<{ stage: string; count: number }>>([]);
  const [cycleName, setCycleName] = useState('Recruitment');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cycle = await getOpenCycle();
        if (!active) return;
        if (cycle) setCycleName(cycle.name);
        const metrics = await getDashboardMetrics(cycle?.id);
        if (!active) return;
        setStages([
          { stage: 'Registration', count: metrics.totalApplicants },
          { stage: 'Under Review', count: metrics.underReview },
          { stage: 'Shortlisted', count: metrics.shortlisted },
          { stage: 'Interview', count: metrics.interviewScheduled },
          { stage: 'Final Selection', count: metrics.selected },
        ]);
      } catch {}
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Kicker>Recruitment · {cycleName}</Kicker>
          <h1 className="mt-1 font-display text-2xl font-bold">Pipeline</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusChip tone="progress">In Progress</StatusChip>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stages.map((p, i) => (
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
        {!loading && stages.length > 0 && (
          <button className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-ink-soft transition hover:border-tekhelet hover:text-tekhelet">
            <Plus size={20} /> <span className="text-sm font-medium">Add Stage</span>
          </button>
        )}
      </div>
      {loading && <p className="text-sm text-ink-soft">Loading pipeline data…</p>}
      <p className="text-sm text-ink-soft">Drag stages to reorder. Future coordinators can configure the entire recruitment process without developers.</p>
    </div>
  );
}

/* ─── Interview management ────────────────────────────────────────────── */
export function Interviews() {
  const [view, setView] = useState('Schedule');
  const [interviews, setInterviewList] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<Array<{ id: string; name: string; appId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [assignForm, setAssignForm] = useState({ applicationId: '', slot: '', panel: 'Panel 1', location: 'Robotics Lab' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [intData, appData] = await Promise.all([
          getInterviews(),
          getApplicants({ status: 'interview_scheduled', pageSize: 200 }),
        ]);
        if (!active) return;
        setInterviewList(intData);
        setApplicants(appData.applicants.map((a: any) => ({
          id: a.applicant_id,
          name: a.profile?.full_name ?? 'Unknown',
          appId: a.id,
        })));
      } catch (err) { if (active) setNotice(err instanceof Error ? err.message : 'Failed to load'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const assign = async () => {
    if (!assignForm.applicationId || !assignForm.slot) return;
    setNotice('');
    try {
      await createInterview({
        application_id: assignForm.applicationId,
        scheduled_at: new Date(assignForm.slot).toISOString(),
        location: assignForm.location,
      });
      setNotice('Interview assigned.');
      const updated = await getInterviews();
      setInterviewList(updated);
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Failed to assign.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Kicker>Interviews</Kicker><h1 className="mt-1 font-display text-2xl font-bold">{interviews.length} scheduled</h1></div>
        <div className="flex gap-1 rounded-lg border border-line bg-paper-2 p-1">
          {['Schedule', 'Calendar', 'Panels'].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${view === v ? 'bg-indigo text-white' : 'text-ink-soft'}`}>{v}</button>
          ))}
        </div>
      </div>
      {loading && <p className="text-sm text-ink-soft">Loading interviews…</p>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h3 className="mb-4 font-display font-semibold">Scheduled interviews</h3>
          <div className="space-y-2">
            {interviews.map((s: any) => {
              const time = new Date(s.scheduled_at);
              const applicantName = s.applications?.profiles?.full_name ?? 'Unknown';
              const initials = applicantName.split(' ').map((n: string) => n[0]).join('');
              return (
                <div key={s.id} className="group flex items-center gap-4 rounded-xl border border-line p-3 transition hover:border-line-strong">
                  <div className="w-16 shrink-0 text-center">
                    <p className="font-display font-bold text-tekhelet">{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                    <p className="text-[10px] text-ink-soft">{time.toLocaleDateString()}</p>
                  </div>
                  <div className="h-8 w-px bg-line" />
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-tekhelet to-indigo text-xs font-bold text-white">{initials}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{applicantName}</p><p className="text-xs text-ink-soft">{s.location ?? 'TBD'}</p></div>
                </div>
              );
            })}
            {!loading && interviews.length === 0 && <p className="text-sm text-ink-soft">No interviews scheduled yet.</p>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-3 font-display font-semibold">Assign interview</h3>
            <Field label="Applicant">
              <select className={inputCls} value={assignForm.applicationId} onChange={(e) => setAssignForm({ ...assignForm, applicationId: e.target.value })}>
                <option value="">Select applicant</option>
                {applicants.map((a) => <option key={a.appId} value={a.appId}>{a.name}</option>)}
              </select>
            </Field>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Date & Time"><input type="datetime-local" className={inputCls} value={assignForm.slot} onChange={(e) => setAssignForm({ ...assignForm, slot: e.target.value })} /></Field>
              <Field label="Location"><input className={inputCls} value={assignForm.location} onChange={(e) => setAssignForm({ ...assignForm, location: e.target.value })} /></Field>
            </div>
            {notice && <p className="mt-3 text-sm text-ink-soft">{notice}</p>}
            <Button variant="cta" className="mt-4 w-full" onClick={assign}>Assign <Calendar size={15} /></Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Interview evaluation ────────────────────────────────────────────── */
const rubric = [
  ['Technical Fundamentals', 10],
  ['Problem Solving', 10],
  ['Practical Understanding', 10],
  ['Learning Ability', 10],
  ['Communication', 5],
  ['Team Fit', 5],
] as const;

export function Evaluation() {
  const auth = useAuthState();
  const [applicantList, setApplicantList] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [scores, setScores] = useState<number[]>(rubric.map(() => 7));
  const [rec, setRec] = useState('strong_yes');
  const [feedback, setFeedback] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const total = scores.reduce((s, v) => s + v, 0);
  const max = rubric.reduce((s, [, m]) => s + m, 0);

  useEffect(() => {
    getApplicants({ status: 'interview_scheduled', pageSize: 200 })
      .then(({ applicants }) => setApplicantList(applicants))
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!selectedApp || !auth.user) return;
    setBusy(true); setNotice('');
    try {
      await createEvaluation({
        application_id: selectedApp,
        evaluator_id: auth.user.id,
        technical_score: scores[0],
        problem_solving_score: scores[1],
        communication_score: scores[4],
        teamwork_score: scores[5],
        overall_score: total,
        feedback,
        recommendation: rec as any,
      });
      setNotice('Evaluation submitted.');
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Failed to submit.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-[#f0d199] bg-[#fbe9c9]/50 px-4 py-2 text-sm text-[#8a5a12]">
        <Lock size={14} /> Private &amp; internal — this evaluation is visible only to the recruitment panel.
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Applicant selector */}
        <Card className="h-fit p-6">
          <Field label="Select applicant to evaluate">
            <select className={inputCls} value={selectedApp} onChange={(e) => setSelectedApp(e.target.value)}>
              <option value="">Choose…</option>
              {applicantList.map((a: any) => <option key={a.id} value={a.id}>{a.profile?.full_name ?? 'Unknown'}</option>)}
            </select>
          </Field>
          {selectedApp && (() => {
            const a = applicantList.find((x: any) => x.id === selectedApp);
            if (!a) return null;
            return (
              <div className="mt-4 space-y-2 text-sm">
                {[['Year', a.profile?.year], ['Branch', a.profile?.branch], ['Primary', a.domain_preferences?.[0]?.domain?.name ?? '—']].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between border-b border-line pb-2 last:border-0"><span className="text-ink-soft">{k}</span><span className="font-medium">{v}</span></div>
                ))}
              </div>
            );
          })()}
        </Card>

        {/* Scoring */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Evaluation rubric</h3>
            <div className="text-right"><span className="label text-[10px] text-glaucous">Total</span><p className="font-display text-2xl font-extrabold text-tekhelet">{total}<span className="text-base text-ink-soft">/{max}</span></p></div>
          </div>
          <div className="mt-5 space-y-5">
            {rubric.map(([label, maxV], i) => (
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
          <Field label="Internal notes"><textarea rows={3} className={`${inputCls} mt-1`} placeholder="Panel observations..." value={feedback} onChange={(e) => setFeedback(e.target.value)} /></Field>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">Final recommendation</p>
            <div className="flex flex-wrap gap-2">
              {[{ value: 'strong_yes', label: 'Strong Yes' }, { value: 'yes', label: 'Yes' }, { value: 'maybe', label: 'Maybe' }, { value: 'no', label: 'No' }].map((r) => (
                <button key={r.value} onClick={() => setRec(r.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${rec === r.value ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-paper-2 text-ink-soft hover:border-line-strong'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {notice && <p className="mt-4 text-sm text-ink-soft">{notice}</p>}
          <Button variant="cta" className="mt-6" disabled={busy || !selectedApp} onClick={submit}>{busy ? 'Submitting…' : 'Submit Evaluation'} <ArrowRight size={16} /></Button>
        </Card>
      </div>
    </div>
  );
}

/* ─── Announcements (admin) ───────────────────────────────────────────── */
export function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => { getAllAnnouncements().then(setItems).catch((e) => setNotice(e.message)); };
  useEffect(load, []);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      await createAnnouncement({ title, content, published: true });
      setNotice('Announcement published.');
      setTitle(''); setContent('');
      load();
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card className="h-fit p-6">
        <Kicker>New announcement</Kicker>
        <form className="mt-4 space-y-4" onSubmit={publish}>
          <Field label="Title" required><input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Task Round instructions released" /></Field>
          <Field label="Message" required><textarea required value={content} onChange={(e) => setContent(e.target.value)} rows={4} className={inputCls} placeholder="Write your announcement..." /></Field>
          {notice && <p className="text-sm text-ink-soft">{notice}</p>}
          <Button variant="cta" className="w-full" disabled={busy}><Clock size={15} /> {busy ? 'Publishing…' : 'Publish'}</Button>
        </form>
      </Card>
      <div>
        <h3 className="mb-3 font-display font-semibold">Recently published</h3>
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium">{a.title}</h4><span className="text-xs text-ink-soft">{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{a.content}</p>
              <StatusChip tone={a.published ? 'done' : 'neutral'} dot={false}>{a.published ? 'Published' : 'Draft'}</StatusChip>
            </Card>
          ))}
          {items.length === 0 && <p className="text-sm text-ink-soft">No announcements yet.</p>}
        </div>
      </div>
    </div>
  );
}

/* ─── Content CMS ─────────────────────────────────────────────────────── */
export function AdminContent() {
  const [activeTab, setActiveTab] = useState<'achievements' | 'projects'>('achievements');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notice, setNotice] = useState('');

  const loadAll = () => {
    getAllAchievements().then(setAchievements).catch(() => {});
    getAllProjects().then(setProjects).catch(() => {});
  };
  useEffect(loadAll, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Kicker>Content</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Website content</h1></div>
        <div className="flex gap-1 rounded-lg border border-line bg-paper-2 p-1">
          {(['achievements', 'projects'] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${activeTab === t ? 'bg-indigo text-white' : 'text-ink-soft'}`}>{t}</button>
          ))}
        </div>
      </div>

      {notice && <p className="text-sm text-ink-soft">{notice}</p>}

      {activeTab === 'achievements' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <Card key={a.id} hover className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">{a.title}</h3>
                <span className="font-display text-xl font-extrabold text-tekhelet">{a.year}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{a.description}</p>
              <div className="mt-3 flex gap-2">
                <StatusChip tone={a.published ? 'done' : 'neutral'} dot={false}>{a.published ? 'Published' : 'Draft'}</StatusChip>
                {a.featured && <StatusChip tone="info" dot={false}>Featured</StatusChip>}
              </div>
              <div className="mt-4 flex gap-2 text-sm">
                <button onClick={async () => { await updateAchievement(a.id, { published: !a.published }); loadAll(); }} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-tekhelet hover:text-tekhelet">
                  {a.published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={async () => { if (window.confirm('Delete?')) { await deleteAchievement(a.id); loadAll(); } }} className="rounded-lg border border-line px-3 py-1.5 font-medium text-[#a13939] hover:border-[#a13939]">Delete</button>
              </div>
            </Card>
          ))}
          {achievements.length === 0 && <p className="text-sm text-ink-soft">No achievements. Create one to get started.</p>}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} hover className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">{p.title}</h3>
                <span className="font-display text-xl font-extrabold text-tekhelet">{p.year}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{p.description}</p>
              <div className="mt-3 flex gap-2">
                <StatusChip tone={p.published ? 'done' : 'neutral'} dot={false}>{p.published ? 'Published' : 'Draft'}</StatusChip>
              </div>
              <div className="mt-4 flex gap-2 text-sm">
                <button onClick={async () => { await updateProject(p.id, { published: !p.published }); loadAll(); }} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-tekhelet hover:text-tekhelet">
                  {p.published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={async () => { if (window.confirm('Delete?')) { await deleteProject(p.id); loadAll(); } }} className="rounded-lg border border-line px-3 py-1.5 font-medium text-[#a13939] hover:border-[#a13939]">Delete</button>
              </div>
            </Card>
          ))}
          {projects.length === 0 && <p className="text-sm text-ink-soft">No projects. Create one to get started.</p>}
        </div>
      )}

      <p className="text-sm text-ink-soft">The public website content can be maintained here without editing code.</p>
    </div>
  );
}

/* ─── Generic admin stub ──────────────────────────────────────────────── */
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
