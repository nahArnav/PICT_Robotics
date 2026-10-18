import type { SupabaseClient } from "@supabase/supabase-js";
import {
  allFields,
  initialFormValues,
  makeField,
  pictStarter,
  type ApplicationFormSchema,
  type FormFieldType,
} from "../src/lib/applicationForms";
import type { ProfileRow } from "../src/lib/database";

// Only callers authenticated as an explicit local test admin may publish. This
// helper does not use service-role privileges to bypass the form workflow.
export async function publishPictTestForm(staff: SupabaseClient, cycleId: string) {
  const [cycle, domains, questions] = await Promise.all([
    staff.from("recruitment_cycles").select("*").eq("id", cycleId).single(),
    staff.from("domains").select("id,name").eq("active", true).order("display_order"),
    staff
      .from("recruitment_questions")
      .select("*")
      .eq("recruitment_cycle_id", cycleId)
      .eq("active", true)
      .order("display_order"),
  ]);
  for (const result of [cycle, domains, questions]) if (result.error) throw result.error;
  const schema = pictStarter(cycle.data, domains.data ?? []);
  const section = schema.sections.find((section) => section.title === "Questions")!;
  for (const question of questions.data ?? [])
    section.fields.push({
      ...makeField(
        "",
        question.question_type === "single_choice"
          ? "select"
          : (question.question_type as FormFieldType),
      ),
      id: `q_${question.id}`,
      label: question.question,
      required: question.required,
      options: (question.options as string[]).map((value) => ({ value, label: value })),
    });
  const saved = await staff.rpc("save_application_form", {
    p_cycle_id: cycleId,
    p_schema: schema,
    p_expected_revision: 0,
  });
  if (saved.error) throw saved.error;
  const published = await staff.rpc("publish_application_form", {
    p_cycle_id: cycleId,
    p_expected_revision: saved.data.draft_revision,
  });
  if (published.error) throw published.error;
  return { schema, revision: published.data.published_revision as number };
}
export function pictFixtureValues(schema: ApplicationFormSchema, profile: ProfileRow) {
  const values = initialFormValues(schema, profile);
  for (const field of allFields(schema)) {
    if (field.binding === "application.motivation") values[field.id] = "Robot building";
    if (field.type === "domains") values[field.id] = [field.options[0].value];
  }
  return values;
}
