import { describe, expect, it } from "vitest";
import {
  allFields,
  blankForm,
  displayFormValue,
  initialFormValues,
  isEmptyAnswer,
  makeField,
  pictStarter,
  schemaErrors,
  validateFormAnswer,
} from "../../src/lib/applicationForms";
import type { ProfileRow } from "../../src/lib/database";

const cycle = { name: "PICT drive", target_batch: "FY/SY", max_preferences: 2 };
const domains = [
  { id: "software", name: "Software" },
  { id: "electronics", name: "Electronics" },
];

describe("admin-authored application forms", () => {
  it("has a blank new-drive schema until the admin chooses fields", () => {
    expect(blankForm()).toEqual({ title: "", description: "", sections: [] });
    expect(schemaErrors(blankForm())).toContain("Add at least one section.");
    expect(schemaErrors(blankForm(), false)).toEqual([]);
  });
  it("offers exactly the owner-supplied branches and free-text class/division", () => {
    const fields = allFields(pictStarter(cycle, domains));
    expect(
      fields
        .find((field) => field.binding === "profile.branch")
        ?.options.map((option) => option.value),
    ).toEqual(["CE", "IT", "ENTC", "AIDS", "ECE"]);
    expect(fields.find((field) => field.binding === "profile.division")?.type).toBe("short_text");
    expect(fields.find((field) => field.binding === "domains")?.maxSelections).toBe(2);
  });
  it.each([
    ["FY", ["FY"]],
    ["SY", ["SY"]],
    ["FY/SY", ["FY", "SY"]],
  ])("sets year options per %s drive", (target_batch, expected) => {
    const fields = allFields(pictStarter({ ...cycle, target_batch: String(target_batch) }));
    expect(
      fields
        .find((field) => field.binding === "profile.year")
        ?.options.map((option) => option.value),
    ).toEqual(expected);
  });
  it("does not prefill profile values outside the published choices", () => {
    const schema = pictStarter({ ...cycle, target_batch: "SY" });
    const profile = {
      full_name: "Student",
      email: "student@example.com",
      branch: "Mechanical",
      year: "FY",
      division: "FY-X-9",
      skills: ["ROS", "Python"],
      programming_languages: [],
    } as unknown as ProfileRow;
    const values = initialFormValues(schema, profile);
    const value = (binding: string) =>
      values[allFields(schema).find((field) => field.binding === binding)!.id];
    expect(value("profile.branch")).toBe("");
    expect(value("profile.year")).toBe("");
    expect(value("profile.division")).toBe("FY-X-9");
    expect(value("profile.skills")).toBe("ROS, Python");
    expect(value("identity.email")).toBe(profile.email);
  });
  it("accepts required numeric zero but rejects blank or malformed answers", () => {
    const field = { ...makeField("", "number"), label: "Experience", required: true };
    expect(isEmptyAnswer(0)).toBe(false);
    expect(validateFormAnswer(field, 0)).toBeNull();
    expect(validateFormAnswer(field, "")).toContain("required");
    expect(validateFormAnswer(field, "0")).toContain("valid number");
    expect(validateFormAnswer(field, Infinity)).toContain("valid number");
    expect(validateFormAnswer(field, "", false)).toBeNull();
  });
  it("validates selected options, duplicate answers and domain limits", () => {
    const field = {
      ...makeField("", "multi_choice"),
      options: [{ value: "ROS", label: "ROS" }],
      required: true,
    };
    expect(validateFormAnswer(field, ["ROS"])).toBeNull();
    expect(validateFormAnswer(field, ["ROS", "ROS"])).toContain("distinct");
    expect(validateFormAnswer(field, ["Other"])).toContain("valid");
    expect(validateFormAnswer(field, [])).toContain("required");
    const domain = allFields(pictStarter({ ...cycle, max_preferences: 1 }, domains)).find(
      (field) => field.type === "domains",
    )!;
    expect(validateFormAnswer(domain, ["software", "electronics"])).toContain("up to 1");
  });
  it("validates actual dates, email and HTTP(S) links rather than just their shape", () => {
    const date = makeField("", "date");
    expect(validateFormAnswer(date, "2026-10-18")).toBeNull();
    expect(validateFormAnswer(date, "2026-02-31")).toContain("valid date");
    expect(validateFormAnswer(makeField("", "email"), "not-an-email")).toContain("valid email");
    const url = makeField("", "url");
    expect(validateFormAnswer(url, "https://example.com/project")).toBeNull();
    expect(validateFormAnswer(url, "javascript:alert(1)")).toContain("HTTP(S)");
    expect(validateFormAnswer(url, "https://user:password@example.com")).toContain(
      "without credentials",
    );
  });
  it("validates schema identity, required choices and linked-field uniqueness", () => {
    const schema = pictStarter(cycle, domains);
    expect(schemaErrors(schema)).toEqual([]);
    schema.sections[0].fields.push(schema.sections[0].fields[0]);
    expect(schemaErrors(schema)).toContain("Section and field IDs must be unique.");
    expect(schemaErrors(schema).some((error) => error.includes("Only one field"))).toBe(true);
    const other = pictStarter(cycle, domains);
    other.sections[0].fields.find((field) => field.binding === "profile.year")!.options = [];
    expect(schemaErrors(other).some((error) => error.includes("unique options"))).toBe(true);
  });
  it("renders saved option labels rather than leaking domain IDs", () => {
    const domain = allFields(pictStarter(cycle, domains)).find(
      (field) => field.type === "domains",
    )!;
    expect(displayFormValue(domain, ["software", "electronics"])).toBe("Software → Electronics");
    expect(displayFormValue(domain, [])).toBe("Not provided");
  });
});
