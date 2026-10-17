import { useCallback, useState } from "react";
import { NavLink, Outlet, Navigate, useNavigate, useLocation } from "react-router";
import {
  LayoutGrid,
  Users,
  GitBranch,
  ListChecks,
  CalendarClock,
  ClipboardCheck,
  Megaphone,
  FileEdit,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  Mail,
  CalendarDays,
} from "lucide-react";
import { Logo } from "../../components/Logo";
import { Button, inputCls } from "../../components/ui";
import { DataState } from "../../components/DataState";
import { supabase } from "../../lib/supabase";
import { isAdminRole, useAuthState, useInactivityLogout } from "../../lib/auth";
import { getMyNotifications, markAllAsRead } from "../../lib/services/notifications";
import { useRemote } from "../../lib/useRemote";
import { AdminProvider, useAdminCycle } from "./context";

const nav = [
  {
    to: "/admin",
    label: "Overview",
    icon: LayoutGrid,
    end: true,
    review: true,
  },
  { to: "/admin/applicants", label: "Applicants", icon: Users, review: true },
  { to: "/admin/recruitment", label: "Recruitment", icon: GitBranch },
  { to: "/admin/tasks", label: "Tasks", icon: ListChecks },
  {
    to: "/admin/interviews",
    label: "Interviews",
    icon: CalendarClock,
    review: true,
  },
  {
    to: "/admin/evaluations",
    label: "Evaluations",
    icon: ClipboardCheck,
    review: true,
  },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/mail", label: "Member Mail", icon: Mail },
  { to: "/admin/content", label: "Content", icon: FileEdit },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];
export function AdminLayout() {
  const auth = useAuthState();
  const navigate = useNavigate();
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/signin", { replace: true });
  }, [navigate]);
  useInactivityLogout(15 * 60 * 1000, signOut);
  if (!auth.ready) return <DataState loading />;
  if (auth.error) return <DataState error={auth.error} retry={() => window.location.reload()} />;
  if (auth.user && auth.role === "applicant") return <Navigate to="/dashboard" replace />;
  if (!auth.user || !isAdminRole(auth.role)) return <Navigate to="/signin" replace />;
  return (
    <AdminProvider>
      <AdminShell signOut={signOut} />
    </AdminProvider>
  );
}
function AdminShell({ signOut }: { signOut: () => void }) {
  const auth = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();
  const { cycleId, setCycleId, cycles } = useAdminCycle();
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notice, setNotice] = useState("");
  const notifications = useRemote(getMyNotifications, [location.pathname]);
  const name = String(auth.user?.user_metadata.full_name || auth.user?.email || "Admin");
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  const links = nav.filter((item) => auth.role !== "recruiter" || item.review);
  const permitted =
    auth.role !== "recruiter" || links.some((item) => item.to === location.pathname);
  return (
    <div className="min-h-screen bg-paper-2/40 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-indigo p-4 text-white lg:flex">
        <div className="px-1 py-2">
          <Logo dark />
        </div>
        <nav className="mt-6 space-y-0.5">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-celadon"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-tekhelet text-xs font-bold">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm">{name}</p>
            <p className="text-xs text-white/50">{auth.role?.replace("_", " ")}</p>
          </div>
          <button onClick={signOut} title="Sign out" className="ml-auto">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <form
            className="relative hidden max-w-sm flex-1 md:block"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/admin/applicants?q=${encodeURIComponent(search)}`);
            }}
          >
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              aria-label="Search applicants"
              placeholder="Search applicants…"
              className={`${inputCls} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>
          <select
            aria-label="Active campaign"
            value={cycleId}
            onChange={(event) => setCycleId(event.target.value)}
            className={`${inputCls} ml-auto max-w-xs`}
          >
            <option value="">All campaigns</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
          <div className="relative">
            <button
              aria-label="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg border border-line p-2"
            >
              <Bell size={18} />
              {notifications.data?.some((item) => !item.read) && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-celadon" />
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-line bg-white p-4 shadow-lg">
                <DataState loading={notifications.loading} error={notifications.error} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await markAllAsRead();
                      notifications.refresh();
                    } catch {
                      setNotice("Unable to mark notifications read.");
                    }
                  }}
                >
                  Mark read
                </Button>
                {notice && <p className="text-sm">{notice}</p>}
                {notifications.data?.slice(0, 5).map((item) => (
                  <div key={item.id} className="mt-2 border-t border-line py-2 text-sm">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-ink-soft">{item.message}</p>
                  </div>
                ))}
                {!notifications.data?.length && (
                  <p className="text-sm text-ink-soft">No notifications yet.</p>
                )}
              </div>
            )}
          </div>
          <button
            title="Sign out"
            onClick={signOut}
            className="rounded-lg border border-line p-2 lg:hidden"
          >
            <LogOut size={18} />
          </button>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-line bg-white px-4 py-2 lg:hidden">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isActive ? "bg-indigo text-white" : "text-ink-soft"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <main className="p-4 md:p-6">
          {permitted ? (
            <Outlet />
          ) : (
            <DataState error="You do not have permission to access this page." />
          )}
        </main>
      </div>
    </div>
  );
}
