import { Card, Kicker, Section } from '../components/ui';
import { PageHead } from './Projects';
import { CountUp, Lazy3D, Reveal } from '../components/widgets';
import { values, metrics } from '../lib/data';

const loadDrone = () => import('../components/three/Drone').then((m) => ({ default: m.Drone }));

const council = [
  ['Captain', ['Om Lawand']], ['Vice-Captain', ['Nirav Jain']], ['Project Manager', ['Arnav Vasane']], ['Finance', ['Pushkar Shah']],
  ['System Design Leads', ['Shivam Bhuskute', 'Aditya Jayraman', 'Ajinkya Khakare']], ['Coding Leads', ['Ojas Deshpande', 'Gargi Mokashi', 'Shreyas Dalvi']],
  ['Electronics Leads', ['Varad Tonpe', 'Ajay Agarkar']], ['Mechanical Leads', ['Sangram Phate', 'Aryan Shahi']],
  ['Sponsorship & Social Media Leads', ['Ajinkya Khakare', 'Arnav Vasane']],
] as const;

export function About() {
  return (
    <>
      <PageHead kicker="About" title="More than a club. A launchpad for builders." sub="We turn curiosity into real-world engineering — one robot, one prototype, one competition at a time." />
      <Section className="py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <Card key={v.title} className="p-6">
              <h3 className="font-display text-xl font-bold text-tekhelet">{v.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {v.items.map((i) => <li key={i} className="flex gap-2"><span className="text-celadon">▸</span>{i}</li>)}
              </ul>
            </Card>
          ))}
        </div>
        <div className="mt-16 grid gap-8 rounded-3xl bg-indigo p-10 text-white md:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label}>
              <CountUp value={m.value} className="font-display text-4xl font-extrabold text-celadon" />
              <div className="label mt-1 text-[10px] text-teal">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-16 grid items-center gap-10 lg:grid-cols-2">
          <Reveal className="max-w-xl">
            <Kicker>Our approach</Kicker>
            <p className="mt-3 text-lg text-ink-soft">
              We think in systems. Every project pulls together control, vision, embedded, mechanical and
              software into one working machine. Members learn by shipping — from a first line-follower to
              competition-grade autonomous platforms that place at national events.
            </p>
          </Reveal>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-paper-2/50">
            <div className="bp-grid absolute inset-0 opacity-60" />
            <Lazy3D load={loadDrone} className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      </Section>
    </>
  );
}

export function Team() {
  return (
    <>
      <PageHead kicker="Team" title="The people behind the machines." sub="A cross-domain team of student engineers, led by a small core." />
      <Section className="pt-8">
        <div className="relative h-44 overflow-hidden rounded-2xl bg-indigo">
          <div className="bp-grid-dark absolute inset-0 opacity-60" />
          <Lazy3D load={loadDrone} className="pointer-events-none absolute inset-0 h-full w-full opacity-90" />
          <span className="label absolute bottom-4 left-5 rounded border border-teal/30 bg-indigo/60 px-2 py-1 text-[9px] text-teal backdrop-blur">ONE TEAM · MANY SYSTEMS</span>
        </div>
      </Section>
      <Section className="py-16">
        <Kicker>Council Members</Kicker>
        <h2 className="mt-2 font-display text-3xl font-bold">The council behind the builds.</h2>
        <p className="mt-2 text-sm text-ink-soft">Names are listed in no particular order.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {council.map(([role, names]) => <Card key={role} hover className="p-5"><p className="label text-[10px] text-tekhelet">{role}</p><div className="mt-3 space-y-1.5">{names.map((name) => <p key={name} className="font-display text-lg font-semibold">{name}</p>)}</div></Card>)}
        </div>
      </Section>
    </>
  );
}

const galleryImgs = [
  '1518709268805-4e9042af9f23', '1581091226825-a6a2a5aee158', '1620712943543-bcc4688e7485',
  '1563207153-f403bf289096', '1614728263952-84ea256f9679', '1508614589041-895b88991e3e',
  '1581092160562-40aa08e78837', '1546776310-eef45dd6d63c', '1485827404703-89b55fcc595e',
];

export function Gallery() {
  return (
    <>
      <PageHead kicker="Gallery" title="From the lab floor." sub="Snapshots of builds, competitions and late-night debugging sessions." />
      <Section className="pt-8">
        <div className="relative h-48 overflow-hidden rounded-2xl bg-indigo">
          <div className="bp-grid-dark absolute inset-0 opacity-60" />
          <Lazy3D load={loadDrone} className="pointer-events-none absolute inset-0 h-full w-full opacity-90" />
          <span className="label absolute bottom-4 left-5 rounded border border-celadon/30 bg-indigo/60 px-2 py-1 text-[9px] text-celadon backdrop-blur">FLIGHT LOG · PICT ROBOTICS</span>
        </div>
      </Section>
      <Section className="py-16">
        <div className="columns-2 gap-4 md:columns-3">
          {galleryImgs.map((id, i) => (
            <img key={id} src={`https://images.unsplash.com/photo-${id}?w=600&h=${i % 2 ? 700 : 450}&fit=crop&auto=format`}
              alt="Robotics lab" loading="lazy"
              className="mb-4 w-full rounded-xl border border-line bg-paper-2 object-cover" />
          ))}
        </div>
      </Section>
    </>
  );
}
