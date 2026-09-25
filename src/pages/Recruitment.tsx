import { useState } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { Button, Card, Kicker, Section, StatusChip } from '../components/ui';
import { Lazy3D } from '../components/widgets';
import { recruitStages, contacts } from '../lib/data';

const loadDrone = () => import('../components/three/Drone').then((m) => ({ default: m.Drone }));

const faqs = [
  ['Who can apply?', 'First-year (FY) and second-year (SY) students of PICT across all branches. No prior robotics experience is required for FY.'],
  ['Do I need my own hardware?', 'No. The club provides lab access, components and mentorship. The task round can be completed with free simulation tools.'],
  ['How much time does it take?', 'Expect 4–6 hours per week during recruitment. Members typically commit more during competition season.'],
  ['Can I apply to multiple domains?', 'Yes — you choose a primary and a secondary domain preference in your application.'],
];

const dates = [
  ['Applications open', '15 Sep 2026'],
  ['Task round released', '20 Sep 2026'],
  ['Task submission deadline', '24 Sep 2026'],
  ['Interviews', '26–28 Sep 2026'],
  ['Final results', '30 Sep 2026'],
];

export function Recruitment() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-indigo text-white">
        <div className="bp-grid-dark absolute inset-0 opacity-70" />
        <Lazy3D load={loadDrone} className="pointer-events-none absolute right-0 top-1/2 hidden h-[130%] w-1/2 -translate-y-1/2 opacity-80 md:block" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo via-indigo/60 to-transparent" />
        <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-24">
          <StatusChip tone="open">Recruitment 2026 · Applications Open</StatusChip>
          <h1 className="mt-5 font-display text-[clamp(3rem,8vw,6rem)] font-extrabold leading-[0.9] tracking-tight">
            BUILD<br /><span className="text-celadon">WITH US.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/65">
            We recruit builders, not résumés. Show us how you think and what you’ve made — the rest we’ll teach you.
          </p>
        </div>
      </section>

      {/* Current recruitment track */}
      <Section className="-mt-12 pb-4">
        <div className="max-w-2xl">
          {[
            { yr: 'FY', title: 'FY Recruitment', desc: 'For first-year students. Learn, explore and build strong engineering foundations with mentorship.', points: ['No prior experience needed', 'Guided task round', 'Hands-on lab access'] },
          ].map((t) => (
            <Card key={t.yr} hover className="relative overflow-hidden p-8">
              <div className="bp-grid absolute inset-0 opacity-40" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="font-display text-5xl font-extrabold text-tekhelet/20">{t.yr}</span>
                  <StatusChip tone="open">Open</StatusChip>
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold">{t.title}</h2>
                <p className="mt-2 text-ink-soft">{t.desc}</p>
                <ul className="mt-5 space-y-2">
                  {t.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-ink">
                      <Check size={16} className="text-[#2f9e63]" /> {p}
                    </li>
                  ))}
                </ul>
                <Button to="/apply" variant="cta" className="mt-7 w-full">Apply for {t.yr} <ArrowRight size={16} /></Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Process timeline */}
      <Section className="py-20">
        <Kicker>The process</Kicker>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">Six clear stages.</h2>
        <p className="mt-3 max-w-xl text-ink-soft">You always know where you are, what’s next and when it’s due.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {recruitStages.map((s, i) => (
            <div key={s} className="relative rounded-xl border border-line bg-white p-5">
              <span className="label text-[11px] text-glaucous">Step {String(i + 1).padStart(2, '0')}</span>
              <p className="mt-2 font-display font-semibold">{s}</p>
              {i < recruitStages.length - 1 && (
                <ArrowRight size={16} className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-line-strong lg:block" />
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Dates + eligibility + FAQ */}
      <div className="bg-paper-2/60 py-20">
        <Section className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-xl font-bold">Important dates</h3>
              <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-white">
                {dates.map(([label, d]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-ink-soft">{label}</span>
                    <span className="font-mono font-medium">{d}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">Eligibility</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[#2f9e63]" /> Enrolled FY or SY student at PICT.</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[#2f9e63]" /> Valid PICT email for verification.</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[#2f9e63]" /> Genuine interest in building — any branch welcome.</li>
              </ul>
              <Card className="mt-4 p-4">
                <p className="label text-[10px] text-glaucous">Contact recruitment team</p>
                <div className="mt-2 space-y-1 text-sm">
                  {contacts.map((c) => (
                    <div key={c.name} className="flex justify-between"><span>{c.name}</span><span className="font-mono text-ink-soft">{c.phone}</span></div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
          <div>
            <h3 className="font-display text-xl font-bold">FAQs</h3>
            <div className="mt-4 space-y-3">
              {faqs.map(([q, a]) => <FAQ key={q} q={q} a={a} />)}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-white">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="font-medium">{q}</span>
        <ChevronDown size={18} className={`shrink-0 text-tekhelet transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-5 pb-4 text-sm text-ink-soft">{a}</p>}
    </div>
  );
}
