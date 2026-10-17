import { useState } from "react";
import { CalendarDays, MapPin, ExternalLink } from "lucide-react";
import { Card, Kicker, Section, Button } from "../components/ui";
import { DataState } from "../components/DataState";
import { supabase } from "../lib/supabase";
import { useRemote } from "../lib/useRemote";
import type { Database } from "../lib/database";
export type ClubEvent = Database["public"]["Tables"]["club_events"]["Row"];
export function Events() {
  const [past, setPast] = useState(false);
  const [page, setPage] = useState(0);
  const remote = useRemote(async () => {
    let query = supabase
      .from("club_events")
      .select("*", { count: "exact" })
      .in("status", past ? ["published", "completed"] : ["published"])
      .order("display_order")
      .order("starts_at", { ascending: !past })
      .order("id")
      .range(page * 12, page * 12 + 11);
    query = past
      ? query.lt("starts_at", new Date().toISOString())
      : query.gte("starts_at", new Date().toISOString());
    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  }, [past, page]);
  const feature = remote.data?.rows.find((event) => event.featured) ?? remote.data?.rows[0];
  return (
    <>
      <section className="relative overflow-hidden bg-indigo py-16 text-white md:py-24">
        <div className="bp-grid-dark absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-[1240px] px-6 md:px-10">
          <Kicker className="!text-teal">Club calendar</Kicker>
          <h1 className="mt-3 font-display text-4xl font-extrabold md:text-6xl">
            Meet us at the build table.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/65">
            Workshops, open labs, technical talks and competition briefings — all in one place.
          </p>
        </div>
      </section>
      <Section className="space-y-6 py-12 md:py-16">
        <div className="flex gap-3">
          {[false, true].map((value) => (
            <Button
              key={String(value)}
              variant={past === value ? "primary" : "outline"}
              onClick={() => {
                setPast(value);
                setPage(0);
              }}
            >
              {value ? "Past events" : "Upcoming events"}
            </Button>
          ))}
        </div>
        <DataState
          loading={remote.loading}
          error={remote.error}
          retry={remote.refresh}
          empty={
            !remote.loading && !remote.error && !remote.data?.rows.length
              ? past
                ? "No past events yet."
                : "Nothing scheduled yet. Check back for the next session."
              : undefined
          }
        />
        {feature && <EventCard event={feature} featured />}
        <div className="grid gap-4 md:grid-cols-2">
          {remote.data?.rows
            .filter((event) => event.id !== feature?.id)
            .map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
        </div>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={!page} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * 12 >= (remote.data?.total ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </Section>
    </>
  );
}
function EventCard({ event, featured = false }: { event: ClubEvent; featured?: boolean }) {
  const [details, setDetails] = useState(false);
  return (
    <Card className={`overflow-hidden ${featured ? "bg-paper-2/60" : ""}`}>
      <div className={featured && event.image_url ? "grid md:grid-cols-[0.65fr_1fr]" : ""}>
        {event.image_url && (
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full min-h-48 w-full object-cover"
          />
        )}
        <div className="p-6">
          <Kicker>{event.category}</Kicker>
          <h2 className={`mt-2 font-display font-bold ${featured ? "text-3xl" : "text-xl"}`}>
            {event.title}
          </h2>
          <p className="mt-3 text-sm text-ink-soft">{event.summary}</p>
          <div className="mt-5 space-y-2 text-sm">
            <p className="flex gap-2">
              <CalendarDays size={16} className="text-tekhelet" />
              {new Date(event.starts_at).toLocaleString()}
            </p>
            <p className="flex gap-2">
              <MapPin size={16} className="text-tekhelet" />
              {event.location}
            </p>
          </div>
          <div className="mt-5 flex gap-3">
            {event.registration_url && new Date(event.starts_at) > new Date() && (
              <Button href={event.registration_url} target="_blank" variant="cta">
                Register
                <ExternalLink size={15} />
              </Button>
            )}
            {event.description && (
              <Button variant="outline" onClick={() => setDetails(!details)}>
                {details ? "Hide details" : "Event details"}
              </Button>
            )}
          </div>
          {details && (
            <p className="mt-5 whitespace-pre-wrap text-sm text-ink-soft">{event.description}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
