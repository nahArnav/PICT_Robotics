import { useEffect, useState, useCallback } from 'react';
import { X, ChevronRight, ArrowRight, Mail, Phone } from 'lucide-react';
import { Card, Kicker, StatusChip, inputCls, Button, GithubIcon, LinkedinIcon } from '../../components/ui';
import { getApplicants, getApplicationDetail, updateApplicationStatus, type AdminApplicant, type ApplicantListFilters } from '../../lib/services/admin';
import type { ApplicationStatus } from '../../lib/database';
import { authErrorMessage } from '../../lib/auth';

const statusTone: Record<string, 'progress' | 'open' | 'info' | 'done' | 'neutral' | 'warn'> = {
  submitted: 'progress',
  under_review: 'progress',
  shortlisted: 'open',
  interview_scheduled: 'info',
  selected: 'done',
  waitlisted: 'warn',
  rejected: 'neutral',
  withdrawn: 'neutral',
};

const statusLabel: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview',
  selected: 'Selected',
  waitlisted: 'Waitlisted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export function Applicants() {
  const [items, setItems] = useState<AdminApplicant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<AdminApplicant | null>(null);
  const [yearF, setYearF] = useState<'All' | 'FY' | 'SY'>('All');
  const [statusF, setStatusF] = useState<ApplicationStatus | 'all'>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setNotice('');
    try {
      const filters: ApplicantListFilters = {
        page,
        pageSize: 50,
        search: q || undefined,
        year: yearF === 'All' ? 'all' : yearF,
        status: statusF,
      };
      const result = await getApplicants(filters);
      setItems(result.applicants);
      setTotal(result.total);
    } catch (err) {
      setNotice(authErrorMessage(err, 'Unable to load applicants.'));
    } finally {
      setLoading(false);
    }
  }, [page, q, yearF, statusF]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const allChecked = items.length > 0 && items.every((a) => selected.has(a.id));
  const pages = Math.ceil(total / 50);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>Applicants</Kicker>
          <h1 className="mt-1 font-display text-2xl font-bold">{total} total <span className="text-base font-normal text-ink-soft">· {items.length} shown</span></h1>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search applicant..." className={`${inputCls} max-w-xs`} />
        {(['All', 'FY', 'SY'] as const).map((y) => (
          <button key={y} onClick={() => { setYearF(y); setPage(1); }}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${yearF === y ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong'}`}>
            {y}
          </button>
        ))}
        {(['all', 'submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => { setStatusF(s); setPage(1); }}
            className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${statusF === s ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong'}`}>
            {s === 'all' ? 'All Status' : statusLabel[s] ?? s}
          </button>
        ))}
      </div>

      {notice && <p className="rounded-lg border border-[#f3c0c0] bg-[#fbe9e9]/60 px-3 py-2 text-sm text-[#a13939]">{notice}</p>}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-2/50 text-left text-xs text-ink-soft">
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(items.map((a) => a.id)))} className="accent-[#5b2a86]" /></th>
                {['Applicant', 'Year', 'Branch', 'Primary Domain', 'Stage', 'Submitted', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-soft">Loading applicants…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-soft">No applicants match the current filters.</td></tr>
              )}
              {items.map((a) => {
                const name = a.profile?.full_name ?? 'Unknown';
                const initials = name.split(' ').map((n) => n[0]).join('');
                const primaryDomain = a.domain_preferences?.[0]?.domain?.name ?? '—';
                return (
                  <tr key={a.id} className={`border-b border-line transition-colors hover:bg-paper-2/40 ${selected.has(a.id) ? 'bg-tekhelet/[0.04]' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} className="accent-[#5b2a86]" /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDetail(a)} className="flex items-center gap-3 text-left">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-tekhelet to-indigo text-xs font-bold text-white">{initials}</span>
                        <span><span className="font-medium text-ink">{name}</span><br /><span className="font-mono text-[11px] text-ink-soft">{a.profile?.email}</span></span>
                      </button>
                    </td>
                    <td className="px-4 py-3"><span className="rounded border border-line px-1.5 py-0.5 text-xs font-medium">{a.profile?.year ?? '—'}</span></td>
                    <td className="px-4 py-3 text-ink-soft">{a.profile?.branch ?? '—'}</td>
                    <td className="px-4 py-3">{primaryDomain}</td>
                    <td className="px-4 py-3 text-ink-soft">{statusLabel[a.status] ?? a.status}</td>
                    <td className="px-4 py-3 text-ink-soft">{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><StatusChip tone={statusTone[a.status] ?? 'neutral'} dot={false}>{statusLabel[a.status] ?? a.status}</StatusChip></td>
                    <td className="px-4 py-3"><button onClick={() => setDetail(a)} className="text-ink-soft hover:text-tekhelet"><ChevronRight size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-soft">
          <span>Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-line px-2.5 py-1 hover:bg-paper-2 disabled:opacity-50">Prev</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`rounded px-2.5 py-1 ${p === page ? 'bg-indigo text-white' : 'border border-line hover:bg-paper-2'}`}>{p}</button>
            ))}
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border border-line px-2.5 py-1 hover:bg-paper-2 disabled:opacity-50">Next</button>
          </div>
        </div>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-indigo px-4 py-3 text-white shadow-2xl">
            <span className="mr-2 text-sm font-medium">{selected.size} selected</span>
            {[
              { label: 'Shortlist', status: 'shortlisted' as ApplicationStatus },
              { label: 'Schedule Interview', status: 'interview_scheduled' as ApplicationStatus },
              { label: 'Select', status: 'selected' as ApplicationStatus },
            ].map((action) => (
              <button key={action.label} onClick={async () => {
                for (const id of selected) {
                  try { await updateApplicationStatus(id, action.status); } catch {}
                }
                setSelected(new Set());
                load();
              }} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20">{action.label}</button>
            ))}
            <button onClick={async () => {
              for (const id of selected) {
                try { await updateApplicationStatus(id, 'rejected'); } catch {}
              }
              setSelected(new Set());
              load();
            }} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white">Reject</button>
            <button onClick={() => setSelected(new Set())} className="ml-1 text-white/50 hover:text-white"><X size={16} /></button>
          </div>
        </div>
      )}

      {detail && <ApplicantDrawer applicant={detail} onClose={() => setDetail(null)} onStatusChange={() => { setDetail(null); load(); }} />}
    </div>
  );
}

function ApplicantDrawer({
  applicant: a,
  onClose,
  onStatusChange,
}: {
  applicant: AdminApplicant;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const tabs = ['Profile', 'Application', 'Scores', 'Notes'];
  const [tab, setTab] = useState('Profile');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const name = a.profile?.full_name ?? 'Unknown';
  const initials = name.split(' ').map((n) => n[0]).join('');

  const changeStatus = async (newStatus: ApplicationStatus) => {
    setBusy(true);
    setNotice('');
    try {
      await updateApplicationStatus(a.id, newStatus);
      onStatusChange();
    } catch (err) {
      setNotice(authErrorMessage(err, 'Unable to update status.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-indigo/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-paper shadow-2xl">
        {/* header */}
        <div className="border-b border-line bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-tekhelet to-indigo font-display font-bold text-white">{initials}</span>
              <div>
                <h2 className="font-display text-lg font-bold">{name}</h2>
                <p className="font-mono text-xs text-ink-soft">{a.profile?.email} · {a.profile?.year ?? ''}</p>
              </div>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft hover:bg-paper-2"><X size={16} /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusChip tone={statusTone[a.status] ?? 'neutral'} dot={false}>{statusLabel[a.status] ?? a.status}</StatusChip>
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
                  <p className="flex items-center gap-2"><Mail size={14} className="text-tekhelet" /> {a.profile?.email}</p>
                  <p className="flex items-center gap-2"><Phone size={14} className="text-tekhelet" /> {a.profile?.phone ?? '—'}</p>
                  {a.profile?.github_url && <p className="flex items-center gap-2"><GithubIcon size={14} className="text-tekhelet" /> {a.profile.github_url}</p>}
                  {a.profile?.linkedin_url && <p className="flex items-center gap-2"><LinkedinIcon size={14} className="text-tekhelet" /> {a.profile.linkedin_url}</p>}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="label text-[10px] text-glaucous">Domain preferences</h3>
                <div className="mt-3 flex gap-3 text-sm">
                  <div className="flex-1 rounded-lg bg-tekhelet/[0.06] p-3"><span className="text-xs text-ink-soft">Primary</span><p className="font-semibold">{a.domain_preferences?.[0]?.domain?.name ?? '—'}</p></div>
                  <div className="flex-1 rounded-lg bg-paper-2 p-3"><span className="text-xs text-ink-soft">Secondary</span><p className="font-semibold">{a.domain_preferences?.[1]?.domain?.name ?? '—'}</p></div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-xs text-ink-soft">Branch</span><p className="font-medium">{a.profile?.branch ?? '—'}</p></div>
                  <div><span className="text-xs text-ink-soft">Division</span><p className="font-medium">{a.profile?.division ?? '—'}</p></div>
                  <div><span className="text-xs text-ink-soft">Year</span><p className="font-medium">{a.profile?.year ?? '—'}</p></div>
                </div>
              </Card>
            </>
          )}
          {tab === 'Application' && (
            <Card className="p-5">
              <h3 className="label text-[10px] text-glaucous">Application details</h3>
              <div className="mt-3 space-y-4 text-sm">
                {a.motivation && (
                  <div><p className="font-medium">Why they want to join</p><p className="mt-1 text-ink-soft">{a.motivation}</p></div>
                )}
                {a.experience_summary && (
                  <div><p className="font-medium">Experience</p><p className="mt-1 text-ink-soft">{a.experience_summary}</p></div>
                )}
                {a.github_url && (
                  <div><p className="font-medium">GitHub</p><p className="mt-1 text-ink-soft">{a.github_url}</p></div>
                )}
                {a.portfolio_url && (
                  <div><p className="font-medium">Portfolio</p><p className="mt-1 text-ink-soft">{a.portfolio_url}</p></div>
                )}
                {!a.motivation && !a.experience_summary && (
                  <p className="text-ink-soft">No application details available.</p>
                )}
              </div>
            </Card>
          )}
          {tab === 'Scores' && (
            <Card className="p-5">
              <h3 className="label text-[10px] text-glaucous">Evaluations</h3>
              <p className="mt-3 text-sm text-ink-soft">Evaluation scores will appear here once reviews are submitted.</p>
            </Card>
          )}
          {tab === 'Notes' && (
            <Card className="border-[#f0d199] bg-[#fbe9c9]/40 p-5">
              <h3 className="label text-[10px] text-[#8a5a12]">Internal notes · Admins only</h3>
              <textarea rows={5} className={`${inputCls} mt-3`} placeholder="Add a private note..." />
            </Card>
          )}

          {notice && <p className="rounded-lg border border-[#f3c0c0] bg-[#fbe9e9]/60 px-3 py-2 text-sm text-[#a13939]">{notice}</p>}
        </div>

        {/* footer actions */}
        <div className="flex gap-2 border-t border-line bg-white p-4">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => changeStatus('rejected')}>Reject</Button>
          <Button variant="cta" className="flex-1" disabled={busy} onClick={() => {
            const next: Record<string, ApplicationStatus> = {
              submitted: 'under_review',
              under_review: 'shortlisted',
              shortlisted: 'interview_scheduled',
              interview_scheduled: 'selected',
            };
            const nextStatus = next[a.status];
            if (nextStatus) changeStatus(nextStatus);
          }}>Move to next stage <ArrowRight size={16} /></Button>
        </div>
      </div>
    </div>
  );
}
