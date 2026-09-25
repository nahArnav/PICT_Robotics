-- These questions are already present in the existing application form UI. Seed them only for
-- the existing 2026-27 cycle, without changing or fabricating any other recruitment content.
insert into public.recruitment_questions (
  recruitment_cycle_id, question, question_type, required, display_order, active
)
select cycle.id, seed.question, 'long_text', true, seed.display_order, true
from public.recruitment_cycles cycle
cross join (
  values
    ('Tell us about something you have built.', 1),
    ('What technical skill would you like to learn?', 2)
) as seed(question, display_order)
where cycle.academic_year = '2026-27'
  and cycle.target_batch = 'FY/SY'
  and not exists (
    select 1 from public.recruitment_questions existing
    where existing.recruitment_cycle_id = cycle.id
      and existing.question = seed.question
  );
