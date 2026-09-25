import { useEffect, useState } from 'react';
import { Trophy, Award, Medal } from 'lucide-react';
import { Card, Section, Kicker } from '../components/ui';
import { Lazy3D } from '../components/widgets';
import { achievements as staticAchievements } from '../lib/data';
import { getPublishedAchievements, type Achievement as DbAchievement } from '../lib/services/achievements';

const years = ['All', '2026', '2025', '2024', '2023', '2022'];
const loadDrone = () => import('../components/three/Drone').then((m) => ({ default: m.Drone }));

type DisplayAchievement = {
  competition: string;
  year: number;
  position: string;
  rank: string;
  project: string;
  team: string;
  description: string;
  major?: boolean;
  image: string;
};

function dbToDisplay(a: DbAchievement): DisplayAchievement {
  return {
    competition: a.title,
    year: a.year,
    position: a.description,
    rank: a.category ?? '',
    project: a.title,
    team: 'PICT Robotics Club',
    description: a.description,
    major: a.featured,
    image: a.image_url ?? 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=1200&h=800&fit=crop&auto=format',
  };
}

export function Achievements() {
  const [year, setYear] = useState('All');
  const [items, setItems] = useState<DisplayAchievement[]>(staticAchievements);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublishedAchievements()
      .then((dbItems) => {
        if (!active) return;
        if (dbItems.length > 0) {
          setItems(dbItems.map(dbToDisplay));
        }
        // If DB is empty, keep static data as fallback
      })
      .catch(() => {
        // Keep static data on error
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const list = items.filter((a) => year === 'All' || String(a.year) === year);
  const major = list.filter((a) => a.major).sort((a, b) => {
    if (a.rank === 'AIR 1') return -1;
    if (b.rank === 'AIR 1') return 1;
    if (a.year === 2026 && b.year === 2026) {
      if (a.competition === 'ROBOCON India') return -1;
      if (b.competition === 'ROBOCON India') return 1;
    }
    return b.year - a.year;
  });
  const minor = list.filter((a) => !a.major).sort((a, b) => b.year - a.year);

  return (
    <>
      {/* Hero with hovering drone */}
      <section className="relative overflow-hidden border-b border-line bg-indigo text-white">
        <div className="bp-grid-dark absolute inset-0 opacity-60" />
        <Lazy3D load={loadDrone} className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-90" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo via-indigo/70 to-transparent" />
        <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-10 md:py-24">
          <Kicker className="!text-teal">Achievements</Kicker>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-6xl">Built. Tested. Competed.</h1>
          <p className="mt-4 max-w-xl text-lg text-white/65">
            An AIR 1 at ISRO IROC-U, AIR 4 at ISRO ASCEND, and a sustained national ROBOCON India record.
          </p>
        </div>
      </section>
      <Section className="py-12">
        <div className="mb-10 flex flex-wrap gap-2">
          {years.map((y) => (
            <button key={y} onClick={() => setYear(y)}
              className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition ${year === y ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong'}`}>
              {y}
            </button>
          ))}
        </div>

        {loading && <p className="text-ink-soft">Loading achievements…</p>}

        {/* Major achievements — large spotlight cards */}
        {major.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-3">
            {major.map((a) => (
              <Card key={`${a.competition}-${a.year}-${a.rank}`} hover className="group overflow-hidden">
                <div className="relative aspect-[16/11] overflow-hidden bg-indigo">
                  <img src={a.image} alt={a.competition} className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo via-indigo/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="flex items-center gap-2 text-celadon">
                      <Trophy size={18} />
                      <span className="font-display text-3xl font-extrabold text-white">{a.rank}</span>
                    </div>
                    <p className="label mt-1 text-[10px] text-teal">{a.competition} · {a.year}</p>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-base font-semibold">{a.project}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft">{a.description}</p>
                  <p className="mt-3 text-xs text-glaucous">{a.team}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Minor achievements — compact timeline rows */}
        {minor.length > 0 && (
          <div className="mt-12">
            <h2 className="label mb-4 text-[11px] text-glaucous">More results</h2>
            <div className="divide-y divide-line rounded-2xl border border-line bg-white">
              {minor.map((a) => (
                <div key={`${a.competition}-${a.year}-${a.rank}`} className="flex items-center gap-5 p-5 transition-colors hover:bg-paper-2/60">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper-2 text-tekhelet">
                    {a.rank === '2nd' ? <Medal size={22} /> : <Award size={22} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3">
                      <h3 className="font-display font-semibold">{a.competition}</h3>
                      <span className="rounded bg-celadon/25 px-2 py-0.5 text-[11px] font-semibold text-[#1e6b43]">{a.position}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">{a.project} · {a.team}</p>
                  </div>
                  <span className="font-display text-xl font-bold text-glaucous">{a.year}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="grid place-items-center rounded-2xl border border-dashed border-line-strong py-20 text-center">
            <p className="font-display text-lg font-semibold">No achievements found</p>
            <p className="mt-1 text-sm text-ink-soft">Try a different year filter.</p>
          </div>
        )}
      </Section>
    </>
  );
}
