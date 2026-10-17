import { useCallback } from "react";
import { NavLink, Outlet, Navigate, useNavigate } from "react-router";
import {
  LayoutGrid,
  FileText,
  ListChecks,
  CalendarClock,
  Megaphone,
  Trophy,
  LogOut,
} from "lucide-react";
import { Logo } from "../../components/Logo";
import { StatusChip, inputCls } from "../../components/ui";
import { DashboardProvider, useDashboard } from "./context";
import { useAuthState, useInactivityLogout, refreshAuth } from "../../lib/auth";
import { DataState } from "../../components/DataState";
import { supabase } from "../../lib/supabase";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/dashboard/application", label: "Application", icon: FileText },
  { to: "/dashboard/task", label: "Tasks", icon: ListChecks },
  { to: "/dashboard/interview", label: "Interview", icon: CalendarClock },
  { to: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
  { to: "/dashboard/result", label: "Result", icon: Trophy },
  { to: "/dashboard/profile", label: "Profile", icon: FileText },
];

export function DashboardLayout() {
  const auth = useAuthState();
  const nav_ = useNavigate();

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    nav_("/signin", { replace: true });
  }, [nav_]);

  useInactivityLogout(15 * 60 * 1000, signOut); // 15 minutes timeout

  if (!auth.ready) return <DataState loading />;
  if (auth.error) return <DataState error={auth.error} retry={() => void refreshAuth()} />;
  if (!auth.session || auth.role !== "applicant") return <Navigate to="/signin" replace />;
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[248px_1fr]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white p-4 lg:flex">
          <div className="px-2 py-2">
            <Logo />
          </div>
          <nav className="mt-6 space-y-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo text-white"
                      : "text-ink-soft hover:bg-paper-2 hover:text-ink"
                  }`
                }
              >
                <n.icon size={17} /> {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-line bg-paper-2/60 p-4">
            <p className="label text-[10px] text-glaucous">Campaign</p>
            <CampaignSelector />
          </div>
          <div className="mt-4">
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-paper-2 hover:text-ink"
            >
              <LogOut size={17} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile top nav */}
        <div className="sticky top-0 z-40 flex items-center gap-3 overflow-x-auto border-b border-line bg-white/90 px-4 py-2 backdrop-blur lg:hidden">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isActive ? "bg-indigo text-white" : "text-ink-soft"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <button
            onClick={signOut}
            className="ml-auto flex items-center justify-center rounded-lg p-2 text-ink-soft hover:bg-paper-2 hover:text-ink"
          >
            <LogOut size={18} />
          </button>
        </div>

        <main className="min-w-0 p-5 md:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="max-w-sm">
              <CampaignSelector />
            </div>
            <NavLink to="/dashboard/announcements" className="text-sm text-tekhelet">
              Updates &amp; notifications
            </NavLink>
          </div>
          <Outlet />
        </main>
      </div>
    </DashboardProvider>
  );
}

function CampaignSelector() {
  const { data, setCycleId } = useDashboard();
  return (
    <select
      aria-label="Recruitment cycle"
      className={inputCls}
      value={data?.cycle?.id ?? ""}
      onChange={(event) => setCycleId(event.target.value)}
    >
      <option value="" disabled>
        Select campaign
      </option>
      {data?.cycles.map((cycle) => (
        <option key={cycle.id} value={cycle.id}>
          {cycle.name} · {cycle.status}
        </option>
      ))}
    </select>
  );
}
