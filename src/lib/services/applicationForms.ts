import { supabase } from "../supabase";
import type { Json } from "../database";
import type { ApplicationFormSchema, FormValues, PublishedForm } from "../applicationForms";

export async function getFormBuilder(cycleId: string) {
  const { data, error } = await supabase
    .from("recruitment_application_forms")
    .select("*")
    .eq("recruitment_cycle_id", cycleId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function saveFormBuilder(
  cycleId: string,
  schema: ApplicationFormSchema,
  expectedRevision: number,
) {
  const { data, error } = await supabase.rpc("save_application_form", {
    p_cycle_id: cycleId,
    p_schema: schema as unknown as Json,
    p_expected_revision: expectedRevision,
  });
  if (error) throw error;
  return data;
}
export async function publishForm(cycleId: string, expectedRevision: number) {
  const { data, error } = await supabase.rpc("publish_application_form", {
    p_cycle_id: cycleId,
    p_expected_revision: expectedRevision,
  });
  if (error) throw error;
  return data;
}
export async function unpublishForm(cycleId: string, expectedRevision: number) {
  const { error } = await supabase.rpc("unpublish_application_form", {
    p_cycle_id: cycleId,
    p_expected_revision: expectedRevision,
  });
  if (error) throw error;
}
export async function getPublishedForm(cycleId: string): Promise<PublishedForm> {
  const { data, error } = await supabase.rpc("get_published_application_form", {
    p_cycle_id: cycleId,
  });
  if (error) throw error;
  return data as unknown as PublishedForm;
}
export async function saveBuiltDraft(cycleId: string, revision: number, values: FormValues) {
  const { data, error } = await supabase.rpc("save_built_application_draft", {
    p_cycle_id: cycleId,
    p_form_revision: revision,
    p_values: values,
  });
  if (error) throw error;
  return data;
}
