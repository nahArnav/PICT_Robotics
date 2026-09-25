import { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router';
import { LayoutGrid, Users, GitBranch, ListChecks, CalendarClock, ClipboardCheck, Megaphone, FileEdit, BarChart3, Settings, Search, Bell, ChevronDown, LogOut, Mail, CalendarDays } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { getCurrentRole, supabase } from '../../lib/supabase';

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/admin/applicants', label: 'Applicants', icon: Users },
  { to: '/admin/recruitment', label: 'Recruitment', icon: GitBranch },
  { to: '/admin/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/admin/interviews', label: 'Interviews', icon: CalendarClock },
  { to: '/admin/evaluations', label: 'Evaluations', icon: ClipboardCheck },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/mail', label: 'Member Mail', icon: Mail },
  { to: '/admin/content', label: 'Content', icon: FileEdit },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const nav_ = useNavigate();
  const [admin, setAdmin] = useState<{ name: string; role: string; initials: string } | null | undefined>(undefined);
  useEffect(() => { Promise.all([supabase.auth.getUser(), getCurrentRole()]).then(([{ data }, role]) => {
    if (!role || role === 'applicant') return setAdmin(null);
    const name = data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'Admin';
    setAdmin({ name, role: role.replace('_', ' '), initials: name.split(' ').map((part: string) => part[0]).join('') });
  }).catch(() => setAdmin(null)); }, []);
  if (admin === undefined) return null;
  if (!admin) return <Navigate to="/admin/login" replace />;

  const signOut = async () => { await supabase.auth.signOut(); nav_('/admin/login', { replace: true }); };

  return (
    <div className="min-h-screen bg-paper-2/40 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-indigo p-4 text-white lg:flex">
        <div className="px-1 py-2"><Logo dark /></div>
        <nav className="mt-6 space-y-0.5">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white/10 text-celadon' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tekhelet font-display text-xs font-bold text-white">{admin.initials}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{admin.name}</p>
              <p className="truncate text-[11px] text-white/50">{admin.role}</p>
            </div>
            <button onClick={signOut} title="Sign out" className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-celadon">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="lg:hidden"><Logo /></div>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input placeholder="Search applicants, tasks..." className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-sm focus:border-tekhelet focus:outline-none" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium">
              FY Recruitment 2026 <ChevronDown size={14} className="text-ink-soft" />
            </button>
            <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink-soft">
              <Bell size={16} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-celadon ring-2 ring-white" />
            </button>
            <button onClick={signOut} title="Sign out" className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-tekhelet hover:text-tekhelet lg:hidden">
              <LogOut size={16} />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-tekhelet font-display text-sm font-bold text-white">{admin.initials}</div>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="flex gap-2 overflow-x-auto border-b border-line bg-white px-4 py-2 lg:hidden">
          {nav.slice(0, 6).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${isActive ? 'bg-indigo text-white' : 'text-ink-soft'}`}>
              {n.label}
            </NavLink>
          ))}
        </div>

        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
