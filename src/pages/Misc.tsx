import { Card, Kicker, Section } from "../components/ui";
import { PageHead } from "./Projects";
import { Lazy3D, Reveal } from "../components/widgets";
import { values } from "../lib/data";
import { useRemote } from "../lib/useRemote";
import { supabase } from "../lib/supabase";
import { DataState } from "../components/DataState";

const loadDrone = () => import("../components/three/Drone").then((m) => ({ default: m.Drone }));

export function About() {
  return (
    <>
      <PageHead
        kicker="About"
        title="More than a club. A launchpad for builders."
        sub="We turn curiosity into real-world engineering — one robot, one prototype, one competition at a time."
      />
      <Section className="py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <Card key={v.title} className="p-6">
              <h3 className="font-display text-xl font-bold text-tekhelet">{v.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {v.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-celadon">▸</span>
                    {i}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="mt-16 grid items-center gap-10 lg:grid-cols-2">
          <Reveal className="max-w-xl">
            <Kicker>Our approach</Kicker>
            <p className="mt-3 text-lg text-ink-soft">
              We think in systems. Every project pulls together control, vision, embedded,
              mechanical and software into one working machine. Members learn by shipping — from a
              first line-follower to competition-grade autonomous platforms that place at national
              events.
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
  const remote = useRemote(async () => {
    const { data, error } = await supabase
      .from("club_team_entries")
      .select("*")
      .eq("published", true)
      .order("display_order")
      .order("id");
    if (error) throw error;
    return data ?? [];
  });
  return (
    <>
      <PageHead
        kicker="Team"
        title="The people behind the machines."
        sub="A cross-domain team of student engineers, led by a small core."
      />
      <Section className="pt-8">
        <div className="relative h-44 overflow-hidden rounded-2xl bg-indigo">
          <div className="bp-grid-dark absolute inset-0 opacity-60" />
          <Lazy3D
            load={loadDrone}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
          />
          <span className="label absolute bottom-4 left-5 rounded border border-teal/30 bg-indigo/60 px-2 py-1 text-[9px] text-teal backdrop-blur">
            ONE TEAM · MANY SYSTEMS
          </span>
        </div>
      </Section>
      <Section className="py-16">
        <Kicker>Council Members</Kicker>
        <h2 className="mt-2 font-display text-3xl font-bold">The council behind the builds.</h2>
        <p className="mt-2 text-sm text-ink-soft">Names are listed in no particular order.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DataState
            loading={remote.loading}
            error={remote.error}
            retry={remote.refresh}
            empty={
              !remote.loading && !remote.error && !remote.data?.length
                ? "No team entries have been published."
                : undefined
            }
          />
          {remote.data?.map((entry) => (
            <Card key={entry.id} hover className="p-5">
              {entry.image_url && (
                <img
                  src={entry.image_url}
                  alt={entry.title}
                  className="mb-4 aspect-video w-full rounded-lg object-cover"
                />
              )}
              <p className="label text-[10px] text-tekhelet">{entry.title}</p>
              <div className="mt-3 space-y-1.5">
                {entry.names.map((name) => (
                  <p key={name} className="font-display text-lg font-semibold">
                    {name}
                  </p>
                ))}
              </div>
              {entry.description && (
                <p className="mt-2 text-sm text-ink-soft">{entry.description}</p>
              )}
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}

export function Gallery() {
  const remote = useRemote(async () => {
    const { data, error } = await supabase
      .from("gallery_items")
      .select("*")
      .eq("published", true)
      .order("display_order")
      .order("id")
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });
  return (
    <>
      <PageHead
        kicker="Gallery"
        title="From the lab floor."
        sub="Snapshots of builds, competitions and late-night debugging sessions."
      />
      <Section className="pt-8">
        <div className="relative h-48 overflow-hidden rounded-2xl bg-indigo">
          <div className="bp-grid-dark absolute inset-0 opacity-60" />
          <Lazy3D
            load={loadDrone}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
          />
          <span className="label absolute bottom-4 left-5 rounded border border-celadon/30 bg-indigo/60 px-2 py-1 text-[9px] text-celadon backdrop-blur">
            FLIGHT LOG · PICT ROBOTICS
          </span>
        </div>
      </Section>
      <Section className="py-16">
        <DataState
          loading={remote.loading}
          error={remote.error}
          retry={remote.refresh}
          empty={
            !remote.loading && !remote.error && !remote.data?.length
              ? "No gallery images have been published."
              : undefined
          }
        />
        <div className="columns-2 gap-4 md:columns-3">
          {remote.data?.map((entry) => (
            <img
              key={entry.id}
              src={entry.image_url}
              alt={entry.title}
              loading="lazy"
              className="mb-4 w-full rounded-xl border border-line bg-paper-2 object-cover"
            />
          ))}
        </div>
      </Section>
    </>
  );
}
