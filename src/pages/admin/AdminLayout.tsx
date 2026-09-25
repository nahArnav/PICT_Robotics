import { useCallback, useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router';
import { LayoutGrid, Users, GitBranch, ListChecks, CalendarClock, ClipboardCheck, Megaphone, FileEdit, BarChart3, Settings, Search, Bell, ChevronDown, LogOut, Mail, CalendarDays } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import { isAdminRole, useAuthState, useInactivityLogout } from '../../lib/auth';

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
  const auth = useAuthState();
  const signOut = useCallback(async () => { await supabase.auth.signOut(); nav_('/signin', { replace: true }); }, [nav_]);
  useInactivityLogout(15 * 60 * 1000, signOut);

  if (!auth.ready) return null;
  const role = auth.role;
  if (!role || !isAdminRole(role) || !auth.user) return <Navigate to="/admin/login" replace />;
  const name = auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0] || 'Admin';
  const admin = {
    name,
    role: role.replace('_', ' '),
    initials: name.split(' ').map((part: string) => part[0]).join(''),
  };

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
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium transition hover:border-line-strong hover:bg-paper">
                FY Recruitment 2026 <ChevronDown size={14} className="text-ink-soft" />
              </button>
              <div className="absolute right-0 top-full mt-2 hidden w-48 flex-col rounded-xl border border-line bg-white p-2 shadow-lg group-focus-within:flex group-hover:flex">
                <span className="mb-1 px-3 py-1 text-[10px] font-bold uppercase text-ink-soft">Active Campaign</span>
                <button className="flex w-full items-center justify-between rounded-md bg-paper px-3 py-2 text-sm font-medium text-tekhelet">
                  FY Recruitment 2026
                  <span className="h-1.5 w-1.5 rounded-full bg-celadon"></span>
                </button>
                <button className="mt-1 flex w-full items-center rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-paper">
                  SY Recruitment 2026
                </button>
              </div>
            </div>

            <div className="relative group">
              <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-line-strong hover:text-ink">
                <Bell size={16} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-celadon ring-2 ring-white" />
              </button>
              <div className="absolute right-0 top-full mt-2 hidden w-64 flex-col rounded-xl border border-line bg-white p-3 shadow-lg group-focus-within:flex group-hover:flex">
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="font-semibold">Notifications</span>
                  <button className="text-xs text-tekhelet hover:underline">Mark read</button>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="rounded-lg bg-paper-2 p-3 text-sm">
                    <p className="font-medium">New Applicant</p>
                    <p className="text-xs text-ink-soft">Arnav submitted an application</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group hidden lg:block">
              <button className="grid h-9 w-9 place-items-center rounded-full bg-tekhelet font-display text-sm font-bold text-white transition hover:ring-2 hover:ring-tekhelet/30 hover:ring-offset-2">
                {admin.initials}
              </button>
              <div className="absolute right-0 top-full mt-2 hidden w-48 flex-col rounded-xl border border-line bg-white p-2 shadow-lg group-focus-within:flex group-hover:flex">
                <div className="border-b border-line px-3 pb-2 pt-1">
                  <p className="font-medium text-ink truncate">{admin.name}</p>
                  <p className="text-xs text-ink-soft capitalize">{admin.role}</p>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <NavLink to="/admin/settings" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-paper-2 text-ink">
                    <Settings size={14} className="text-ink-soft" /> Settings
                  </NavLink>
                  <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#a13939] hover:bg-paper-2">
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            </div>

            <button onClick={signOut} title="Sign out" className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-tekhelet hover:text-tekhelet lg:hidden">
              <LogOut size={16} />
            </button>
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
