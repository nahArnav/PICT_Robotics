import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight, Cpu, Eye, CircuitBoard, Cog, Wrench, Code2, Trophy, Bot } from 'lucide-react';
import { Button, Card, Kicker, Section, StatusChip, Corners } from '../components/ui';
import { Reveal, CountUp, Lazy3D, Gauge, Terminal } from '../components/widgets';
import { metrics, domains, achievements } from '../lib/data';
import { getPublishedAchievements } from '../lib/services/achievements';
const loadScene = () => import('../components/RoboticsScene').then((m) => ({ default: m.RoboticsScene }));
const loadArm = () => import('../components/three/RobotArm').then((m) => ({ default: m.RobotArm }));
const loadDrone = () => import('../components/three/Drone').then((m) => ({ default: m.Drone }));

const domainIcons = [Bot, CircuitBoard, Eye, Cpu, Wrench, Cog, Code2, Trophy];

export function Home() {
  const [spotlight, setSpotlight] = useState<any>(achievements[2]); // Fallback to AIR 1 ISRO 2025

  useEffect(() => {
    let active = true;
    getPublishedAchievements()
      .then((items) => {
        if (!active) return;
        const feat = items.find((a) => a.featured);
        if (feat) {
          setSpotlight({
            competition: feat.title,
            year: feat.year,
            position: feat.description,
            rank: feat.category ?? '01',
            project: feat.title,
            team: 'PICT Robotics Club',
            description: feat.description,
          });
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden bg-indigo text-white">
        <div className="bp-grid-dark absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-tekhelet/40 blur-[120px]" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-72 w-72 rounded-full bg-glaucous/20 blur-[120px]" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-6 py-20 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-celadon" />
              <span className="label text-[10px] text-teal">Recruitment 2026 · Applications Open</span>
            </div>
            <h1 className="font-display text-[clamp(2.6rem,6vw,4.6rem)] font-extrabold leading-[0.98] tracking-tight">
              ENGINEERING<br />MACHINES.<br />
              <span className="text-celadon">BUILDING</span> INNOVATORS.
            </h1>
            <p className="mt-6 max-w-lg text-base text-white/65 md:text-lg">
              A student-driven community at PICT building robots, autonomous systems, embedded
              solutions and competitive engineering projects.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/achievements" variant="cta" size="lg">Explore Our Achievements <ArrowRight size={18} /></Button>
              <Button to="/recruitment" variant="outline" size="lg" className="!border-white/25 !bg-white/5 !text-white hover:!border-celadon hover:!text-celadon">
                Join Robotics Club
              </Button>
            </div>
            <p className="label mt-10 text-[10px] text-white/40">From curiosity to real-world solutions</p>
          </div>
          <div className="relative">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <Corners />
              <div className="bp-dots absolute inset-0 opacity-40" />
              <Lazy3D load={loadScene} className="absolute inset-0 h-full w-full" />
              {/* Technical labels overlay */}
              {[
                { t: 'CONTROL', c: 'left-4 top-5' },
                { t: 'VISION', c: 'right-4 top-8' },
                { t: 'EMBEDDED', c: 'left-5 bottom-6' },
                { t: 'AUTONOMY', c: 'right-5 bottom-10' },
                { t: 'MECHANICAL', c: 'left-1/2 -translate-x-1/2 bottom-4' },
              ].map((l) => (
                <span key={l.t} className={`label pointer-events-none absolute ${l.c} rounded border border-teal/25 bg-indigo/40 px-1.5 py-0.5 text-[9px] text-teal/90 backdrop-blur-sm`}>
                  {l.t}
                </span>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* ---------------- WHAT WE BUILD ---------------- */}
      <Section className="py-20 md:py-28">
        <Reveal className="max-w-2xl">
          <Kicker>What we build</Kicker>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Eight engineering disciplines. One integrated system.
          </h2>
          <p className="mt-3 text-ink-soft">
            Every robot we ship is the sum of tightly-coupled engineering disciplines working together.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {domains.map((d, i) => {
            const Icon = domainIcons[i];
            return (
              <Reveal key={d.name} delay={i * 60}>
              <Card hover className="group h-full p-5">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-paper-2 text-tekhelet transition-colors group-hover:bg-tekhelet group-hover:text-white">
                  <Icon size={20} />
                </div>
                <h3 className="font-display text-[15px] font-semibold">{d.name}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{d.desc}</p>
              </Card>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ---------------- ENGINEERING IN MOTION (3D + telemetry) ---------------- */}
      <section className="relative overflow-hidden bg-indigo py-20 text-white md:py-28">
        <div className="bp-grid-dark absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-[1240px] px-6 md:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Kicker className="!text-teal">Live systems</Kicker>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">Engineering in motion.</h2>
              <p className="mt-3 max-w-md text-white/60">
                From articulated manipulators to autonomous flight — our builds run real control loops,
                perception and planning. Here’s a taste of the stack.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <Gauge label="Motor Load" value={68} color="#a5e6ba" />
                <Gauge label="Battery" value={84} color="#9ac6c5" />
                <Gauge label="Signal" value={92} color="#7785ac" />
              </div>
              <div className="mt-6"><Terminal /></div>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                <Corners />
                <Lazy3D load={loadArm} className="absolute inset-0 h-full w-full" />
                <span className="label absolute left-4 top-4 rounded border border-teal/25 bg-indigo/50 px-2 py-0.5 text-[9px] text-teal backdrop-blur">MANIPULO · 5-DOF</span>
                <span className="label absolute bottom-4 right-4 rounded border border-celadon/30 bg-indigo/50 px-2 py-0.5 text-[9px] text-celadon backdrop-blur">PICK &amp; PLACE ACTIVE</span>
                <span className="absolute bottom-4 left-4 rounded border border-white/15 bg-indigo/50 px-2 py-1 text-[10px] text-white/70 backdrop-blur">Move your cursor to steer the drop point →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- ACHIEVEMENT SPOTLIGHT ---------------- */}
      <Section className="py-20 md:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-indigo text-white">
          <div className="bp-grid-dark absolute inset-0 opacity-60" />
          <div className="relative grid lg:grid-cols-2">
            <div className="p-8 md:p-14">
              <Kicker className="!text-teal">Competitive record · {spotlight.competition}</Kicker>
              <div className="mt-6 flex items-end gap-4">
                <span className="font-display text-[7rem] font-extrabold leading-[0.8] text-celadon">
                  {String(spotlight.rank).replace(/[^0-9]/g, '').padStart(2, '0') || '01'}
                </span>
                <span className="mb-4 font-display text-2xl font-bold text-white/90 whitespace-pre-line">
                  {String(spotlight.rank).replace(/[0-9]/g, '').trim() || 'ALL INDIA\nRANK'}
                </span>
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold">{spotlight.project}</h3>
              <p className="mt-2 text-white/60">{spotlight.description}</p>
              <div className="mt-6 flex gap-6 text-sm">
                <div><div className="label text-[10px] text-teal">Team</div><div className="mt-1 text-white/90">{spotlight.team}</div></div>
                <div><div className="label text-[10px] text-teal">Year</div><div className="mt-1 text-white/90">{spotlight.year}</div></div>
              </div>
              <Button to="/achievements" variant="cta" className="mt-8">Explore All Achievements <ArrowRight size={16} /></Button>
            </div>
            <div className="relative min-h-[260px] overflow-hidden">
              <div className="bp-grid-dark absolute inset-0 opacity-60" />
              <Lazy3D load={loadDrone} className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo via-indigo/20 to-transparent" />
              <span className="label absolute bottom-5 right-5 rounded border border-celadon/30 bg-indigo/60 px-2 py-1 text-[9px] text-celadon backdrop-blur">AETHER · AUTONOMY UNIT</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------- RECRUITMENT CTA ---------------- */}
      <Section className="py-20 md:py-28">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-white p-8 md:p-16">
          <div className="bp-grid absolute inset-0 opacity-70" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <h2 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-extrabold leading-[0.95] tracking-tight text-indigo">
                THINK.<br />BUILD.<br /><span className="text-tekhelet">BREAK.</span><br /><span className="text-glaucous">IMPROVE.</span>
              </h2>
              <p className="mt-6 max-w-md text-ink-soft">
                Recruitment for FY &amp; SY students is now open. Learn, explore and build with a team that ships real engineering.
              </p>
            </div>
            <div className="space-y-4">
              {(['FY', 'SY'] as const).map((yr) => (
                <Link key={yr} to="/recruitment" className="group flex items-center justify-between rounded-2xl border border-line bg-paper p-6 transition-all hover:border-tekhelet hover:shadow-[0_16px_40px_-20px_rgba(54,5,104,0.3)]">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-display text-xl font-bold">{yr} Recruitment</h3>
                      <StatusChip tone="open">Applications Open</StatusChip>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-soft">
                      {yr === 'FY' ? 'For first-year students. Learn and build foundations.' : 'For second-year students. Go deeper into club projects.'}
                    </p>
                    <p className="label mt-3 text-[10px] text-glaucous">Deadline · 24 Sep 2026</p>
                  </div>
                  <ArrowUpRight className="text-tekhelet transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
