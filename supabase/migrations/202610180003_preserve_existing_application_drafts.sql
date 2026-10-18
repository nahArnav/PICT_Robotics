-- Carry legacy DRAFT answers into the configurable form without deleting or
-- replacing the original applications, preferences, answers or profiles.
-- Submitted applications keep their historical format and are not touched.
do $$
declare a public.applications; p public.profiles; f public.recruitment_application_forms;
 schema jsonb; values jsonb; field jsonb; value jsonb; binding text; extra_fields jsonb; extra record;
begin
 -- DDL and copies are atomic inside this DO transaction. The table lock blocks
 -- concurrent writes; any error rolls the trigger change back as well.
 execute 'alter table public.applications disable trigger application_form_snapshot_guard';
 for a in select * from public.applications where status='draft' and form_schema is null loop
   select * into f from public.recruitment_application_forms where recruitment_cycle_id=a.recruitment_cycle_id and published_schema is not null;
   if not found then continue; end if;
   select * into p from public.profiles where id=a.applicant_id;
   schema:=f.published_schema; values:='{}'; extra_fields:='[]';
   for field in select x from jsonb_array_elements(schema->'sections') s,jsonb_array_elements(s->'fields') x loop
     binding:=field->>'binding'; value:=null;
     if binding='identity.email' then value:=to_jsonb(p.email);
     elsif binding='profile.skills' then value:=to_jsonb(array_to_string(p.skills,', '));
     elsif binding='profile.programming_languages' then value:=to_jsonb(array_to_string(p.programming_languages,', '));
     elsif binding='profile.github_url' then value:=to_jsonb(coalesce(nullif(a.github_url,''),p.github_url,''));
     elsif binding='profile.portfolio_url' then value:=to_jsonb(coalesce(nullif(a.portfolio_url,''),p.portfolio_url,''));
     elsif binding like 'profile.%' then value:=to_jsonb(p)->substr(binding,9);
     elsif binding='application.motivation' then value:=to_jsonb(coalesce(a.motivation,''));
     elsif binding='application.experience_summary' then value:=to_jsonb(coalesce(a.experience_summary,''));
     elsif binding='domains' then select coalesce(jsonb_agg(domain_id order by preference_order),'[]') into value from public.application_domain_preferences where application_id=a.id;
     else select answer into value from public.application_answers where application_id=a.id and 'q_'||question_id::text=field->>'id';
     end if;
     values:=values||jsonb_build_object(field->>'id',coalesce(value,'null'::jsonb));
   end loop;
   -- Inactive or subsequently removed questions can still have real saved
   -- answers. Preserve them as labelled original text, AND retain the raw rows.
   for extra in select x.question_id,x.answer,q.question from public.application_answers x
     join public.recruitment_questions q on q.id=x.question_id where x.application_id=a.id and not exists(
       select 1 from jsonb_array_elements(schema->'sections') s,jsonb_array_elements(s->'fields') xfield where xfield->>'id'='q_'||x.question_id::text
     ) loop
     extra_fields:=extra_fields||jsonb_build_array(jsonb_build_object('id','archived_'||extra.question_id,'label',extra.question||' (previously saved)',
       'type','long_text','required',false,'binding','','help','Copied from your original draft. The stored original answer is retained.',
       'placeholder','','options','[]'::jsonb,'maxSelections',3));
     values:=values||jsonb_build_object('archived_'||extra.question_id,case when jsonb_typeof(extra.answer)='string' then extra.answer else to_jsonb(extra.answer::text) end);
   end loop;
   if jsonb_array_length(extra_fields)>0 then schema:=jsonb_set(schema,'{sections}',(schema->'sections')||jsonb_build_array(jsonb_build_object(
     'id','preserved_answers','title','Previously saved answers','description','Answers retained from your original application draft.','fields',extra_fields))); end if;
   update public.applications set form_schema=schema,form_revision=f.published_revision,form_values=values where id=a.id;
 end loop;
 execute 'alter table public.applications enable trigger application_form_snapshot_guard';
end; $$;
notify pgrst, 'reload schema';
