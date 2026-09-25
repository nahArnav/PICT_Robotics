import { Link } from 'react-router';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, Tooltip, Cell as C } from 'recharts';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { Card, Kicker } from '../../components/ui';
import { adminMetrics, funnel, branchData, domainPref } from '../../lib/data';

const brand = ['#360568', '#5b2a86', '#7785ac', '#9ac6c5', '#a5e6ba'];

export function AdminOverview() {
  const max = funnel[0].count;
  return (
    <div className="space-y-6">
      <div>
        <Kicker>Admin · Overview</Kicker>
        <h1 className="mt-1 font-display text-2xl font-bold">FY Recruitment 2026</h1>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {adminMetrics.map((m) => (
          <Card key={m.label} className="p-5">
            <span className="label text-[10px] text-glaucous">{m.label}</span>
            <p className="mt-2 font-display text-3xl font-extrabold">{m.value}</p>
            <p className="mt-1 text-xs text-ink-soft">{m.delta}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Funnel */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <Kicker>Recruitment funnel</Kicker>
            <Link to="/admin/applicants" className="text-xs font-medium text-tekhelet">View applicants →</Link>
          </div>
          <div className="space-y-2">
            {funnel.map((f, i) => (
              <div key={f.stage}>
                <Link to="/admin/applicants" className="group block">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{f.stage}</span>
                    <span className="font-display font-bold">{f.pending ? '—' : f.count}</span>
                  </div>
                  <div className="h-9 overflow-hidden rounded-lg bg-paper-2">
                    <div className="flex h-full items-center rounded-lg px-3 text-xs font-semibold text-white transition-all group-hover:brightness-110"
                      style={{ width: `${Math.max((f.count / max) * 100, f.pending ? 8 : 12)}%`, background: brand[Math.min(i, 4)] }}>
                      {f.pending ? 'Pending' : `${Math.round((f.count / max) * 100)}%`}
                    </div>
                  </div>
                </Link>
                {i < funnel.length - 1 && <ArrowDown size={13} className="ml-1 mt-1 text-line-strong" />}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          {/* Domain preferences */}
          <Card className="p-6">
            <Kicker>Domain preferences</Kicker>
            <div className="mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainPref} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#4a4358' }} interval={0} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(119,133,172,0.1)' }} contentStyle={{ borderRadius: 10, border: '1px solid #e5e2ee', fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {domainPref.map((_, i) => <Cell key={i} fill={brand[i % brand.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Applicants by branch */}
          <Card className="p-6">
            <Kicker>Applicants by branch</Kicker>
            <div className="mt-2 flex items-center gap-4">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={branchData} dataKey="value" nameKey="label" innerRadius={38} outerRadius={64} paddingAngle={2}>
                      {branchData.map((_, i) => <C key={i} fill={brand[i % brand.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e2ee', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {branchData.map((b, i) => (
                  <li key={b.label} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: brand[i % brand.length] }} />
                    <span className="text-ink-soft">{b.label}</span>
                    <span className="ml-auto font-medium">{b.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 bg-indigo p-6 text-white">
        <div>
          <h3 className="font-display text-lg font-bold">162 applicants need action</h3>
          <p className="text-sm text-white/60">Task Round submissions are ready for review and stage advancement.</p>
        </div>
        <Link to="/admin/applicants" className="inline-flex items-center gap-2 rounded-lg bg-celadon px-4 py-2.5 text-sm font-semibold text-indigo">
          Review applicants <ArrowRight size={16} />
        </Link>
      </Card>
    </div>
  );
}
