import type { Json, ProfileRow } from "./database";

export const fieldTypes = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "url",
  "number",
  "date",
  "select",
  "radio",
  "multi_choice",
  "file",
  "domains",
] as const;
export type FormFieldType = (typeof fieldTypes)[number];
export type FormOption = { value: string; label: string };
export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  help: string;
  placeholder: string;
  binding: string;
  options: FormOption[];
  maxSelections: number;
};
export type FormSection = { id: string; title: string; description: string; fields: FormField[] };
export type ApplicationFormSchema = { title: string; description: string; sections: FormSection[] };
export type FormValues = Record<string, Json>;
export type PublishedForm = {
  mode: "builder" | "legacy" | "unpublished";
  schema?: ApplicationFormSchema;
  revision?: number;
  pinned?: boolean;
};
export const blankForm = (): ApplicationFormSchema => ({
  title: "",
  description: "",
  sections: [],
});
export const allFields = (schema: ApplicationFormSchema) =>
  schema.sections.flatMap((section) => section.fields);
export const isEmptyAnswer = (value: Json | undefined) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (typeof value === "string" && !value.trim()) ||
  (Array.isArray(value) && value.length === 0);

export const linkedFields = [
  ["profile.full_name", "Full name", "short_text"],
  ["identity.email", "Account email (read only)", "email"],
  ["profile.phone", "Phone", "phone"],
  ["profile.roll_number", "Roll / PRN number", "short_text"],
  ["profile.branch", "Branch", "select"],
  ["profile.year", "Year", "select"],
  ["profile.division", "Class / division", "short_text"],
  ["profile.skills", "Skills", "short_text"],
  ["profile.programming_languages", "Programming languages", "short_text"],
  ["profile.github_url", "GitHub", "url"],
  ["profile.linkedin_url", "LinkedIn", "url"],
  ["profile.portfolio_url", "Portfolio", "url"],
  ["profile.bio", "About you", "long_text"],
  ["application.motivation", "Why do you want to join Robotics Club?", "long_text"],
  ["application.experience_summary", "Projects you've built", "long_text"],
  ["domains", "Domain preferences", "domains"],
] as const;

export function makeField(binding = "", type: FormFieldType = "short_text"): FormField {
  const linked = linkedFields.find((item) => item[0] === binding);
  return {
    id: crypto.randomUUID(),
    label: linked?.[1] ?? "Untitled field",
    type: linked?.[2] ?? type,
    required: false,
    help: "",
    placeholder: "",
    binding,
    options:
      binding === "profile.branch"
        ? ["CE", "IT", "ENTC", "AIDS", "ECE"].map((value) => ({ value, label: value }))
        : [],
    maxSelections: 3,
  };
}

// A selectable starter, never an automatically published form for a new drive.
export function pictStarter(
  input: { name: string; target_batch: string; max_preferences: number },
  domains: { id: string; name: string }[] = [],
): ApplicationFormSchema {
  const field = (binding: string, required = false) => ({ ...makeField(binding), required });
  const year = field("profile.year", true);
  const batch = input.target_batch.trim().toUpperCase();
  year.options = (batch === "FY" ? ["FY"] : batch === "SY" ? ["SY"] : ["FY", "SY"]).map(
    (value) => ({ value, label: value === "FY" ? "First Year (FY)" : "Second Year (SY)" }),
  );
  const domain = field("domains", true);
  domain.options = domains.map((item) => ({ value: item.id, label: item.name }));
  domain.maxSelections = input.max_preferences;
  const section = (title: string, fields: FormField[]): FormSection => ({
    id: crypto.randomUUID(),
    title,
    description: "",
    fields,
  });
  return {
    title: input.name,
    description: "",
    sections: [
      section("Personal Details", [
        field("profile.full_name", true),
        field("identity.email"),
        field("profile.phone", true),
        field("profile.branch", true),
        field("profile.division", true),
        year,
      ]),
      section("Technical Profile", [
        field("profile.skills"),
        field("profile.programming_languages"),
        field("application.experience_summary"),
        field("profile.github_url"),
        field("profile.portfolio_url"),
      ]),
      ...(domains.length ? [section("Domain Preference", [domain])] : []),
      section("Questions", [field("application.motivation", true)]),
    ],
  };
}

export function initialFormValues(schema: ApplicationFormSchema, profile: ProfileRow): FormValues {
  return Object.fromEntries(
    allFields(schema).map((field) => {
      if (field.binding === "identity.email") return [field.id, profile.email];
      if (field.binding.startsWith("profile.")) {
        const key = field.binding.slice(8) as keyof ProfileRow;
        const value = profile[key];
        const initial = Array.isArray(value) ? value.join(", ") : (value ?? "");
        // Do not preselect a saved value that the admin did not offer in this drive.
        if (
          ["select", "radio"].includes(field.type) &&
          !field.options.some((option) => option.value === initial)
        )
          return [field.id, ""];
        return [field.id, initial as Json];
      }
      return [field.id, ["multi_choice", "domains"].includes(field.type) ? [] : ""];
    }),
  );
}

export function validateFormAnswer(
  field: FormField,
  value: Json | undefined,
  submitting = true,
): string | null {
  const error = (reason: string) => `${field.label}: ${reason}`;
  if (isEmptyAnswer(value))
    return submitting && field.required ? error("an answer is required.") : null;
  if (["multi_choice", "domains"].includes(field.type)) {
    if (
      !Array.isArray(value) ||
      value.some(
        (item) =>
          typeof item !== "string" || !field.options.some((option) => option.value === item),
      ) ||
      new Set(value).size !== value.length
    )
      return error("choose valid, distinct options.");
    if (field.type === "domains" && value.length > field.maxSelections)
      return error(`choose up to ${field.maxSelections} domains.`);
    return null;
  }
  if (field.type === "number")
    return typeof value === "number" && Number.isFinite(value)
      ? null
      : error("enter a valid number.");
  if (typeof value !== "string" || value.length > 20000)
    return error("enter text under 20,000 characters.");
  if (
    ["select", "radio"].includes(field.type) &&
    !field.options.some((option) => option.value === value)
  )
    return error("choose an offered option.");
  if (field.type === "url") {
    try {
      const url = new URL(value);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password
      )
        return error("enter an HTTP(S) URL without credentials.");
    } catch {
      return error("enter a valid HTTP(S) URL.");
    }
  }
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return error("enter a valid email.");
  if (
    field.type === "date" &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    return error("enter a valid date.");
  return null;
}

export function schemaErrors(schema: ApplicationFormSchema, publishing = true): string[] {
  const errors: string[] = [];
  if (publishing && !schema.title.trim()) errors.push("Enter a form title.");
  if (publishing && !schema.sections.length) errors.push("Add at least one section.");
  if (schema.sections.length > 12 || allFields(schema).length > 60)
    errors.push("Use at most 12 sections and 60 fields.");
  const ids = new Set<string>(),
    bindings = new Set<string>();
  for (const section of schema.sections) {
    if (ids.has(section.id)) errors.push("Section and field IDs must be unique.");
    ids.add(section.id);
    if (publishing && (!section.title.trim() || !section.fields.length))
      errors.push("Each section needs a title and at least one field.");
    for (const field of section.fields) {
      if (ids.has(field.id)) errors.push("Section and field IDs must be unique.");
      ids.add(field.id);
      if (!field.label.trim()) errors.push("Every field needs a label.");
      if (field.binding && bindings.has(field.binding))
        errors.push(`Only one field may link to ${field.binding}.`);
      if (field.binding) bindings.add(field.binding);
      if (
        publishing &&
        ["select", "radio", "multi_choice", "domains"].includes(field.type) &&
        (!field.options.length ||
          field.options.some((option) => !option.value.trim() || !option.label.trim()) ||
          new Set(field.options.map((option) => option.value)).size !== field.options.length)
      )
        errors.push(`${field.label}: add non-empty, unique options.`);
      if (
        field.binding === "profile.year" &&
        field.options.some((option) => !["FY", "SY"].includes(option.value))
      )
        errors.push("Year values must be FY or SY. You can customise their labels.");
      if (field.binding === "profile.division" && field.type !== "short_text")
        errors.push("Class / division must be a text field.");
    }
  }
  return errors;
}

export function displayFormValue(field: FormField, value: Json | undefined): string {
  if (isEmptyAnswer(value)) return "Not provided";
  const label = (item: string) =>
    field.options.find((option) => option.value === item)?.label ?? item;
  if (Array.isArray(value)) return value.map((item) => label(String(item))).join(" → ");
  return ["select", "radio"].includes(field.type) ? label(String(value)) : String(value);
}
