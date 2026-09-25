import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './ui';
import { contacts } from '../lib/data';
import { useAuthState, isAdminRole } from '../lib/auth';

const nav = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/team', label: 'Team' },
  { to: '/recruitment', label: 'Recruitment' },
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
];

export function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { user, role, ready } = useAuthState();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="min-h-screen bg-paper">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'border-b border-line bg-paper/85 backdrop-blur-xl' : 'border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6 md:px-10">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-tekhelet' : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {ready && user ? (
              <Button to={isAdminRole(role) ? "/admin" : "/dashboard"} variant="outline" size="sm">Dashboard</Button>
            ) : (
              <Button to="/signin" variant="ghost" size="sm">Sign In</Button>
            )}
            <Button to="/recruitment" variant="cta" size="sm">Recruitment 2026</Button>
          </div>
          <button className="lg:hidden p-2 text-ink" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden border-t border-line bg-paper px-6 pb-6 pt-2">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `block rounded-md px-3 py-2.5 text-sm font-medium ${isActive ? 'text-tekhelet bg-paper-2' : 'text-ink-soft'}`}>
                {n.label}
              </NavLink>
            ))}
            <div className="mt-3">
              {ready && user ? (
                <Button to={isAdminRole(role) ? "/admin" : "/dashboard"} variant="outline" size="sm" className="w-full">Dashboard</Button>
              ) : (
                <Button to="/signin" variant="outline" size="sm" className="w-full">Sign In</Button>
              )}
            </div>
            <div className="mt-2">
              <Button to="/recruitment" variant="cta" size="sm" className="w-full">Recruitment 2026</Button>
            </div>
          </div>
        )}
      </header>

      <main className="pt-16">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-indigo text-white">
      <div className="bp-grid-dark absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm text-white/60">
              A student-driven engineering community at PICT building robots, autonomous systems and
              competitive projects.
            </p>
            <p className="label mt-6 text-[10px] text-teal">More than a club. A launchpad for builders.</p>
          </div>
          <FooterCol title="Explore" links={[['Events', '/events'], ['Achievements', '/achievements'], ['Recruitment', '/recruitment'], ['Team', '/team']]} />
          <FooterCol title="Connect" links={[['Instagram', '#'], ['LinkedIn', '#'], ['GitHub', '#'], ['YouTube', '#']]} />
          <div>
            <h4 className="label text-[10px] text-teal">Recruitment Team</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {contacts.map((c) => (
                <li key={c.name} className="flex justify-between gap-4">
                  <span>{c.name}</span>
                  <span className="font-mono text-white/50">{c.phone}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <span>© 2026 PICT Robotics Club. Pune Institute of Computer Technology.</span>
          <span className="flex items-center gap-4">
            <NavLink to="/admin/login" className="transition-colors hover:text-celadon">Admin Console</NavLink>
            <span className="label text-[10px]">Robots · People · A Brighter Tomorrow</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="label text-[10px] text-teal">{title}</h4>
      <ul className="mt-4 space-y-2.5 text-sm text-white/70">
        {links.map(([l, to]) => (
          <li key={l}>
            <NavLink to={to} className="transition-colors hover:text-celadon">{l}</NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
