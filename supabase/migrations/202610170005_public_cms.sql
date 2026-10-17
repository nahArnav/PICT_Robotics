-- Complete the existing Team, Gallery and Homepage Highlights admin categories.
create table public.club_team_entries(
 id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title))>0),names text[] not null default '{}',
 image_url text,description text,published boolean not null default false,display_order integer not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.gallery_items(
 id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title))>0),image_url text not null,
 published boolean not null default false,display_order integer not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.homepage_metrics(
 id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title))>0),value text not null,
 published boolean not null default false,display_order integer not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
do $$ declare entity text; begin
 foreach entity in array array['club_team_entries','gallery_items','homepage_metrics'] loop
   execute format('alter table public.%I enable row level security',entity);
   execute format('create policy "published content read" on public.%I for select using(published or public.is_admin())',entity);
   execute format('create policy "admin content manage" on public.%I for all using(public.is_admin()) with check(public.is_admin())',entity);
   execute format('create trigger touch_updated before update on public.%I for each row execute function public.touch_updated_at()',entity);
   execute format('create trigger audit_content after insert or update or delete on public.%I for each row execute function public.record_audit_change()',entity);
 end loop;
end; $$;
create trigger team_urls before insert or update on public.club_team_entries for each row execute function public.validate_web_fields();
create trigger gallery_urls before insert or update on public.gallery_items for each row execute function public.validate_web_fields();
grant select on public.club_team_entries,public.gallery_items,public.homepage_metrics to anon,authenticated;
grant insert,update,delete on public.club_team_entries,public.gallery_items,public.homepage_metrics to authenticated;

-- Copy only the exact council, gallery and metric content already present in the repository.
insert into public.club_team_entries(title,names,published,display_order) values
 ('Captain',array['Om Lawand'],true,0),('Vice-Captain',array['Nirav Jain'],true,1),('Project Manager',array['Arnav Vasane'],true,2),('Finance',array['Pushkar Shah'],true,3),
 ('System Design Leads',array['Shivam Bhuskute','Aditya Jayraman','Ajinkya Khakare'],true,4),('Coding Leads',array['Ojas Deshpande','Gargi Mokashi','Shreyas Dalvi'],true,5),
 ('Electronics Leads',array['Varad Tonpe','Ajay Agarkar'],true,6),('Mechanical Leads',array['Sangram Phate','Aryan Shahi'],true,7),('Sponsorship & Social Media Leads',array['Ajinkya Khakare','Arnav Vasane'],true,8);
insert into public.homepage_metrics(title,value,published,display_order) values('Years','11+',true,0),('Members','54',true,1),('Projects','32',true,2),('Podiums','25+',true,3);
insert into public.gallery_items(title,image_url,published,display_order)
select 'Robotics lab','https://images.unsplash.com/photo-'||photo||'?w=600&h='||case when position%2=0 then '700' else '450' end||'&fit=crop&auto=format',true,position-1
from unnest(array['1518709268805-4e9042af9f23','1581091226825-a6a2a5aee158','1620712943543-bcc4688e7485','1563207153-f403bf289096','1614728263952-84ea256f9679','1508614589041-895b88991e3e','1581092160562-40aa08e78837','1546776310-eef45dd6d63c','1485827404703-89b55fcc595e']) with ordinality as photos(photo,position);

create or replace function public.guard_reviewer_assignment() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.user_roles where user_id=new.reviewer_id and role in ('recruiter','admin','super_admin')) then raise exception 'Choose an authorised reviewer'; end if;
 if auth.uid() is not null then new.assigned_by:=auth.uid(); end if;
 return new;
end; $$;
