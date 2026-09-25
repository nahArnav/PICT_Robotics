-- Club events: workshops, talks, competitions, outreach and internal sessions.
create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');

create table public.club_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  summary text not null check (char_length(summary) between 10 and 320),
  description text, category text not null default 'workshop',
  starts_at timestamptz not null, ends_at timestamptz, location text not null,
  registration_url text, capacity integer check (capacity is null or capacity > 0),
  image_url text, status public.event_status not null default 'draft', featured boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index club_events_public_idx on public.club_events(status, starts_at);
create trigger club_events_touch before update on public.club_events for each row execute procedure public.touch_updated_at();
alter table public.club_events enable row level security;
create policy "published events are public" on public.club_events for select using (status = 'published' or public.is_staff());
create policy "admins manage events" on public.club_events for all using (public.is_admin()) with check (public.is_admin());

insert into public.club_events (title, summary, description, category, starts_at, ends_at, location, status, featured)
select 'Intro to ROS 2', 'A practical evening workshop on nodes, topics and robot simulation.', 'Bring a laptop and leave with a working ROS 2 publisher/subscriber pair.', 'workshop', '2026-10-08 11:30:00+00', '2026-10-08 14:30:00+00', 'PICT Robotics Lab', 'published', true
where not exists (select 1 from public.club_events where title = 'Intro to ROS 2');
