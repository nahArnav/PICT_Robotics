import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, ExternalLink } from 'lucide-react';
import { Card, Kicker, Section, Button } from '../components/ui';
import { supabase } from '../lib/supabase';

export type ClubEvent = { id: string; title: string; summary: string; description: string | null; category: string; starts_at: string; ends_at: string | null; location: string; registration_url: string | null; capacity: number | null; image_url: string | null; status: string; featured: boolean };
const date = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));

export function Events() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.from('club_events').select('*').eq('status', 'published').gte('starts_at', new Date().toISOString()).order('starts_at').then(({ data }) => { setEvents((data ?? []) as ClubEvent[]); setLoading(false); }); }, []);
  const feature = events.find((event) => event.featured) ?? events[0];
  return <>
    <section className="relative overflow-hidden bg-indigo py-16 text-white md:py-24"><div className="bp-grid-dark absolute inset-0 opacity-60" /><div className="relative mx-auto max-w-[1240px] px-6 md:px-10"><Kicker className="!text-teal">Club calendar</Kicker><h1 className="mt-3 font-display text-4xl font-extrabold md:text-6xl">Meet us at the build table.</h1><p className="mt-4 max-w-2xl text-lg text-white/65">Workshops, open labs, technical talks and competition briefings — all in one place.</p></div></section>
    <Section className="py-12 md:py-16">{loading ? <p className="text-ink-soft">Loading upcoming events…</p> : !events.length ? <Card className="p-10 text-center"><h2 className="font-display text-xl font-bold">Nothing scheduled yet</h2><p className="mt-2 text-sm text-ink-soft">Check back soon for the next session in the lab.</p></Card> : <div className="space-y-8">{feature && <EventCard event={feature} featured />}<div className="grid gap-4 md:grid-cols-2">{events.filter((event) => event.id !== feature?.id).map((event) => <EventCard key={event.id} event={event} />)}</div></div>}</Section>
  </>;
}

function EventCard({ event, featured = false }: { event: ClubEvent; featured?: boolean }) {
  return <Card className={`overflow-hidden ${featured ? 'bg-paper-2/60' : ''}`}><div className={featured ? 'grid md:grid-cols-[0.65fr_1fr]' : ''}>{event.image_url && <img src={event.image_url} alt="" className="h-full min-h-48 w-full object-cover" />}<div className="p-6"><span className="label text-[10px] text-tekhelet">{event.category}</span><h2 className={`mt-2 font-display font-bold ${featured ? 'text-3xl' : 'text-xl'}`}>{event.title}</h2><p className="mt-3 text-sm text-ink-soft">{event.summary}</p><div className="mt-5 space-y-2 text-sm"><p className="flex gap-2"><CalendarDays size={16} className="text-tekhelet" />{date(event.starts_at)}</p><p className="flex gap-2"><MapPin size={16} className="text-tekhelet" />{event.location}</p></div>{event.registration_url && <Button href={event.registration_url} variant="cta" className="mt-6">Register <ExternalLink size={15} /></Button>}</div></div></Card>;
}
