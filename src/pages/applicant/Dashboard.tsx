import { useCallback } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router';
import { LayoutGrid, FileText, ListChecks, CalendarClock, Megaphone, Trophy, LogOut } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { StatusChip } from '../../components/ui';
import { useAuthState, useInactivityLogout } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/dashboard/application', label: 'Application', icon: FileText },
  { to: '/dashboard/task', label: 'Tasks', icon: ListChecks },
  { to: '/dashboard/interview', label: 'Interview', icon: CalendarClock },
  { to: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/dashboard/result', label: 'Result', icon: Trophy },
];

export function DashboardLayout() {
  const auth = useAuthState();
  const nav_ = useNavigate();
  
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    nav_('/signin', { replace: true });
  }, [nav_]);

  useInactivityLogout(15 * 60 * 1000, signOut); // 15 minutes timeout

  if (!auth.ready) return null;
  if (!auth.session || auth.role !== 'applicant') return <Navigate to="/signin" replace />;
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white p-4 lg:flex">
        <div className="px-2 py-2"><Logo /></div>
        <nav className="mt-6 space-y-1">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-indigo text-white' : 'text-ink-soft hover:bg-paper-2 hover:text-ink'}`}>
              <n.icon size={17} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-line bg-paper-2/60 p-4">
          <p className="label text-[10px] text-glaucous">Campaign</p>
          <p className="mt-1 text-sm font-semibold">FY Recruitment 2026</p>
          <StatusChip tone="progress" >In Progress</StatusChip>
        </div>
        <div className="mt-4">
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-paper-2 hover:text-ink">
            <LogOut size={17} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="sticky top-0 z-40 flex items-center gap-3 overflow-x-auto border-b border-line bg-white/90 px-4 py-2 backdrop-blur lg:hidden">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${isActive ? 'bg-indigo text-white' : 'text-ink-soft'}`}>
            {n.label}
          </NavLink>
        ))}
        <button onClick={signOut} className="ml-auto flex items-center justify-center rounded-lg p-2 text-ink-soft hover:bg-paper-2 hover:text-ink">
          <LogOut size={18} />
        </button>
      </div>

      <main className="min-w-0 p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
