import { useState } from 'react';
import { X, ChevronRight, ArrowRight, Mail, Phone } from 'lucide-react';
import { Card, Kicker, StatusChip, inputCls, Button, GithubIcon, LinkedinIcon } from '../../components/ui';
import { applicants, type Applicant } from '../../lib/data';

const statusTone: Record<Applicant['status'], any> = {
  'In Progress': 'progress', Shortlisted: 'open', Interview: 'info', Selected: 'done', Rejected: 'neutral',
};

export function Applicants() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Applicant | null>(null);
  const [yearF, setYearF] = useState('All');
  const [q, setQ] = useState('');

  const list = applicants.filter(
    (a) => (yearF === 'All' || a.year === yearF) && a.name.toLowerCase().includes(q.toLowerCase()),
  );

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const allChecked = list.length > 0 && list.every((a) => selected.has(a.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>Applicants</Kicker>
          <h1 className="mt-1 font-display text-2xl font-bold">324 total <span className="text-base font-normal text-ink-soft">· {list.length} shown</span></h1>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applicant..." className={`${inputCls} max-w-xs`} />
        {['All', 'FY', 'SY'].map((y) => (
          <button key={y} onClick={() => setYearF(y)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${yearF === y ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong'}`}>
            {y}
          </button>
        ))}
        {['Branch', 'Domain', 'Stage', 'Status'].map((f) => (
          <button key={f} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-soft hover:border-line-strong">{f} ▾</button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-2/50 text-left text-xs text-ink-soft">
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(list.map((a) => a.id)))} className="accent-[#5b2a86]" /></th>
                {['Applicant', 'Year', 'Branch', 'Primary Domain', 'Stage', 'Score', 'Interview', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className={`border-b border-line transition-colors hover:bg-paper-2/40 ${selected.has(a.id) ? 'bg-tekhelet/[0.04]' : ''}`}>
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} className="accent-[#5b2a86]" /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDetail(a)} className="flex items-center gap-3 text-left">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-tekhelet to-indigo text-xs font-bold text-white">{a.name.split(' ').map((n) => n[0]).join('')}</span>
                      <span><span className="font-medium text-ink">{a.name}</span><br /><span className="font-mono text-[11px] text-ink-soft">{a.id}</span></span>
                    </button>
                  </td>
                  <td className="px-4 py-3"><span className="rounded border border-line px-1.5 py-0.5 text-xs font-medium">{a.year}</span></td>
                  <td className="px-4 py-3 text-ink-soft">{a.branch}</td>
                  <td className="px-4 py-3">{a.domain}</td>
                  <td className="px-4 py-3 text-ink-soft">{a.stage}</td>
                  <td className="px-4 py-3 font-display font-bold">{a.score ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">{a.interview}</td>
                  <td className="px-4 py-3"><StatusChip tone={statusTone[a.status]} dot={false}>{a.status}</StatusChip></td>
                  <td className="px-4 py-3"><button onClick={() => setDetail(a)} className="text-ink-soft hover:text-tekhelet"><ChevronRight size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-soft">
          <span>Showing 1–{list.length} of 324</span>
          <div className="flex gap-1">
            <button className="rounded border border-line px-2.5 py-1 hover:bg-paper-2">Prev</button>
            {[1, 2, 3].map((p) => <button key={p} className={`rounded px-2.5 py-1 ${p === 1 ? 'bg-indigo text-white' : 'border border-line hover:bg-paper-2'}`}>{p}</button>)}
            <button className="rounded border border-line px-2.5 py-1 hover:bg-paper-2">Next</button>
          </div>
        </div>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-indigo px-4 py-3 text-white shadow-2xl">
            <span className="mr-2 text-sm font-medium">{selected.size} selected</span>
            {['Move Stage', 'Assign Interview', 'Shortlist'].map((b) => (
              <button key={b} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20">{b}</button>
            ))}
            <button className="rounded-lg bg-celadon px-3 py-1.5 text-sm font-semibold text-indigo hover:brightness-95">Send Announcement</button>
            <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white">Reject</button>
            <button onClick={() => setSelected(new Set())} className="ml-1 text-white/50 hover:text-white"><X size={16} /></button>
          </div>
        </div>
      )}

      {detail && <ApplicantDrawer applicant={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function ApplicantDrawer({ applicant: a, onClose }: { applicant: Applicant; onClose: () => void }) {
  const tabs = ['Profile', 'Application', 'Task', 'Scores', 'Interview', 'Notes'];
  const [tab, setTab] = useState('Profile');
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-indigo/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-paper shadow-2xl">
        {/* header */}
        <div className="border-b border-line bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-tekhelet to-indigo font-display font-bold text-white">{a.name.split(' ').map((n) => n[0]).join('')}</span>
              <div>
                <h2 className="font-display text-lg font-bold">{a.name}</h2>
                <p className="font-mono text-xs text-ink-soft">{a.id} · {a.year}</p>
              </div>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft hover:bg-paper-2"><X size={16} /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusChip tone="progress" dot={false}>{a.stage}</StatusChip>
            <StatusChip tone={statusTone[a.status]} dot={false}>{a.status}</StatusChip>
          </div>
          <div className="mt-4 flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t ? 'bg-indigo text-white' : 'text-ink-soft hover:bg-paper-2'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {tab === 'Profile' && (
            <>
              <Card className="p-5">
                <h3 className="label text-[10px] text-glaucous">Contact</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="flex items-center gap-2"><Mail size={14} className="text-tekhelet" /> {a.email}</p>
                  <p className="flex items-center gap-2"><Phone size={14} className="text-tekhelet" /> {a.phone}</p>
                  <p className="flex items-center gap-2"><GithubIcon size={14} className="text-tekhelet" /> {a.github}</p>
                  <p className="flex items-center gap-2"><LinkedinIcon size={14} className="text-tekhelet" /> {a.linkedin}</p>
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="label text-[10px] text-glaucous">Domain preferences</h3>
                <div className="mt-3 flex gap-3 text-sm">
                  <div className="flex-1 rounded-lg bg-tekhelet/[0.06] p-3"><span className="text-xs text-ink-soft">Primary</span><p className="font-semibold">{a.domain}</p></div>
                  <div className="flex-1 rounded-lg bg-paper-2 p-3"><span className="text-xs text-ink-soft">Secondary</span><p className="font-semibold">{a.secondary}</p></div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-xs text-ink-soft">Branch</span><p className="font-medium">{a.branch}</p></div>
                  <div><span className="text-xs text-ink-soft">Division</span><p className="font-medium">{a.division}</p></div>
                  <div><span className="text-xs text-ink-soft">Year</span><p className="font-medium">{a.year}</p></div>
                </div>
              </Card>
            </>
          )}
          {tab === 'Application' && (
            <Card className="p-5">
              <h3 className="label text-[10px] text-glaucous">Application answers</h3>
              <div className="mt-3 space-y-4 text-sm">
                {a.answers.map((qa) => (
                  <div key={qa.q}><p className="font-medium">{qa.q}</p><p className="mt-1 text-ink-soft">{qa.a}</p></div>
                ))}
              </div>
            </Card>
          )}
          {tab === 'Task' && (
            <Card className="p-5 text-sm">
              <h3 className="label text-[10px] text-glaucous">Task submission</h3>
              <p className="mt-3">Line Following Robot Simulation</p>
              <p className="mt-1 text-ink-soft">Submitted 22 Sep · 8:42 PM</p>
              <a className="mt-2 block text-tekhelet hover:underline" href="#">github.com/{a.name.split(' ')[0].toLowerCase()}/line-follower ↗</a>
            </Card>
          )}
          {tab === 'Scores' && (
            <Card className="p-5">
              <h3 className="label text-[10px] text-glaucous">Round scores</h3>
              <div className="mt-3 space-y-3">
                {[['Technical Round', a.score ?? 0], ['Task Round', (a.score ?? 60) - 4]].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="mb-1 flex justify-between text-sm"><span>{k}</span><span className="font-display font-bold">{v}/100</span></div>
                    <div className="h-2 rounded-full bg-paper-2"><div className="h-full rounded-full bg-tekhelet" style={{ width: `${v}%` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {tab === 'Interview' && (
            <Card className="p-5 text-sm">
              <h3 className="label text-[10px] text-glaucous">Interview</h3>
              <p className="mt-3">{a.interview === '—' ? 'Not yet scheduled.' : `Scheduled: ${a.interview}`}</p>
              <Button variant="outline" className="mt-3">Assign Interview</Button>
            </Card>
          )}
          {tab === 'Notes' && (
            <Card className="border-[#f0d199] bg-[#fbe9c9]/40 p-5">
              <h3 className="label text-[10px] text-[#8a5a12]">Internal notes · Admins only</h3>
              <textarea rows={5} className={`${inputCls} mt-3`} placeholder="Add a private note..." defaultValue="Strong fundamentals in the technical round. Follow up on hardware experience during interview." />
            </Card>
          )}
        </div>

        {/* footer actions */}
        <div className="flex gap-2 border-t border-line bg-white p-4">
          <Button variant="outline" className="flex-1">Reject</Button>
          <Button variant="cta" className="flex-1">Move to next stage <ArrowRight size={16} /></Button>
        </div>
      </div>
    </div>
  );
}
