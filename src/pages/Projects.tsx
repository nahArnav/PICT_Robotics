import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { Button, Card, Kicker, Section, inputCls } from '../components/ui';
import { projects } from '../lib/data';

const filters = ['All', 'Autonomous', 'Embedded', 'Vision', 'Mechanical', 'Software'];

export function Projects() {
  const [active, setActive] = useState('All');
  const [q, setQ] = useState('');
  const list = projects.filter(
    (p) => (active === 'All' || p.category === active) && p.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHead kicker="Projects" title="Engineering we ship." sub="A live archive of the robots, systems and prototypes built by club members." />
      <Section className="py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActive(f)}
                className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition ${
                  active === f ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects..." className={`${inputCls} pl-9`} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Link key={p.slug} to={`/projects/${p.slug}`} className="group">
              <Card hover className="h-full overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden bg-paper-2">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="label absolute left-3 top-3 rounded bg-indigo/80 px-2 py-0.5 text-[10px] text-white backdrop-blur">{p.category}</span>
                  <span className="absolute right-3 top-3 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-indigo">{p.year}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold tracking-tight">{p.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{p.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded border border-line px-2 py-0.5 text-[11px] text-ink-soft">{t}</span>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
        {list.length === 0 && <EmptyState />}
      </Section>
    </>
  );
}

export function ProjectDetail() {
  const { slug } = useParams();
  const p = projects.find((x) => x.slug === slug) ?? projects[0];
  const sections = [
    ['Overview', `${p.name} is a ${p.category.toLowerCase()} project developed by the PICT Robotics Club. It was designed, prototyped and validated end-to-end by a student team over a single academic cycle.`],
    ['Problem', 'Existing solutions were either too costly or not robust enough for real deployment. The team scoped a system that balances performance, cost and manufacturability.'],
    ['Approach', 'We split the system into perception, planning and actuation subsystems, iterating on each with weekly integration tests on real hardware.'],
    ['System Architecture', 'A layered architecture: sensor drivers → state estimation → planning → low-level control, coordinated over a shared message bus.'],
    ['Hardware', 'Custom PCB for power and motor control, off-the-shelf compute, and a machined/3D-printed chassis with integrated cable routing.'],
    ['Software', `Written in ${p.tags.includes('Python') ? 'Python & C++' : 'C++'} on top of ROS, with a simulation-first workflow before hardware bring-up.`],
  ] as const;

  return (
    <>
      <section className="relative overflow-hidden bg-indigo text-white">
        <img src={p.image} alt={p.name} className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo via-indigo/70 to-indigo/40" />
        <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-10 md:py-24">
          <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-celadon">
            <ArrowLeft size={16} /> All projects
          </Link>
          <span className="label mt-6 block text-[10px] text-teal">{p.category} · {p.year}</span>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold tracking-tight md:text-6xl">{p.name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">{p.summary}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {p.tags.map((t) => (
              <span key={t} className="rounded-md border border-white/20 bg-white/5 px-2.5 py-1 text-xs">{t}</span>
            ))}
          </div>
        </div>
      </section>

      <Section className="grid gap-10 py-16 lg:grid-cols-[1fr_280px]">
        <div className="space-y-10">
          {sections.map(([title, body]) => (
            <div key={title}>
              <h2 className="mb-2 flex items-center gap-3 font-display text-xl font-bold">
                <span className="h-4 w-1 rounded bg-celadon" />{title}
              </h2>
              <p className="text-ink-soft">{body}</p>
            </div>
          ))}
          <div>
            <h2 className="mb-4 font-display text-xl font-bold">Gallery</h2>
            <div className="grid grid-cols-2 gap-3">
              {[p.image, projects[(projects.indexOf(p) + 1) % projects.length].image].map((img, i) => (
                <img key={i} src={img} alt="" className="aspect-video w-full rounded-xl border border-line object-cover" />
              ))}
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <h3 className="label text-[10px] text-glaucous">Result</h3>
            <p className="mt-2 font-display text-lg font-bold">Competition-ready</p>
            <p className="mt-1 text-sm text-ink-soft">Deployed at national competitions in {p.year}.</p>
          </Card>
          <Card className="p-5">
            <h3 className="label text-[10px] text-glaucous">Team</h3>
            <p className="mt-2 text-sm text-ink-soft">A cross-domain student team of 6–8 across software, electronics and mechanical.</p>
          </Card>
          <Button to="/recruitment" variant="cta" className="w-full">Build the next one <ArrowRight size={16} /></Button>
        </aside>
      </Section>
    </>
  );
}

export function PageHead({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-white">
      <div className="bp-grid absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-10 md:py-20">
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-indigo md:text-6xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">{sub}</p>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line-strong py-20 text-center">
      <p className="font-display text-lg font-semibold">No projects found</p>
      <p className="mt-1 text-sm text-ink-soft">Try a different filter or search term.</p>
    </div>
  );
}
