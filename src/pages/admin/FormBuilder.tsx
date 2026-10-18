import { useEffect, useState } from "react";
import { useBlocker, useSearchParams } from "react-router";
import { ArrowDown, ArrowUp, Plus, Trash2, Eye } from "lucide-react";
import { Button, Card, Field, Kicker, inputCls } from "../../components/ui";
import { DataState } from "../../components/DataState";
import { BuiltFormField, BuiltFormReview } from "../../components/ApplicationFormFields";
import { authErrorMessage } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { useRemote } from "../../lib/useRemote";
import {
  allFields,
  blankForm,
  fieldTypes,
  linkedFields,
  makeField,
  pictStarter,
  schemaErrors,
  type ApplicationFormSchema,
  type FormField,
  type FormFieldType,
  type FormSection,
  type FormValues,
} from "../../lib/applicationForms";
import type { ApplicationFormConfigRow } from "../../lib/database";
import {
  getFormBuilder,
  publishForm,
  saveFormBuilder,
  unpublishForm,
} from "../../lib/services/applicationForms";
import { getRecruitmentCycles } from "../../lib/services/admin";
import type { Cycle } from "../../lib/services/resources";

const typeLabels: Record<FormFieldType, string> = {
  short_text: "Short text",
  long_text: "Paragraph",
  email: "Email",
  phone: "Phone",
  url: "Website URL",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  radio: "Single choice",
  multi_choice: "Checkboxes",
  file: "Private file upload",
  domains: "Ranked domain preferences",
};
const move = <T,>(items: T[], index: number, direction: number): T[] => {
  const next = [...items],
    target = index + direction;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export function FormBuilder() {
  const [params] = useSearchParams();
  const cycles = useRemote(getRecruitmentCycles);
  const [selected, setSelected] = useState(params.get("cycle") ?? "");
  const [dirty, setDirty] = useState(false);
  const cycle = cycles.data?.find((item) => item.id === selected);
  useEffect(() => {
    if (!selected && cycles.data?.length) setSelected(cycles.data[0].id);
  }, [cycles.data, selected]);
  return (
    <div className="space-y-6">
      <div>
        <Kicker>Recruitment · Admin</Kicker>
        <h1 className="mt-1 font-display text-2xl font-bold">Application form builder</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Build the entire form for each drive. Applicants only see the published version. Saved
          applications keep their original form and answers.
        </p>
      </div>
      <DataState
        loading={cycles.loading}
        error={cycles.error}
        retry={cycles.refresh}
        empty={
          !cycles.loading && !cycles.error && !cycles.data?.length
            ? "Create a recruitment campaign before building its form."
            : undefined
        }
      />
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full max-w-lg">
          <Field label="Form campaign">
            <select
              className={inputCls}
              value={selected}
              onChange={(event) => {
                if (!dirty || confirm("Leave this builder without saving your changes?")) {
                  setDirty(false);
                  setSelected(event.target.value);
                }
              }}
            >
              <option value="" disabled>
                Select a campaign
              </option>
              {cycles.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.target_batch}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button to="/admin/recruitment" variant="outline">
          Manage campaigns
        </Button>
      </div>
      {cycle && <FormEditor key={cycle.id} cycle={cycle} onDirtyChange={setDirty} />}
    </div>
  );
}

function FormEditor({
  cycle,
  onDirtyChange,
}: {
  cycle: Cycle;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const remote = useRemote(() => getFormBuilder(cycle.id), [cycle.id]);
  const domains = useRemote(async () => {
    const result = await supabase
      .from("domains")
      .select("id,name")
      .eq("active", true)
      .order("display_order");
    if (result.error) throw result.error;
    return result.data ?? [];
  });
  const [schema, setSchema] = useState<ApplicationFormSchema>(blankForm);
  const [record, setRecord] = useState<ApplicationFormConfigRow | null>(null);
  const [sectionId, setSectionId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(false),
    [previewValues, setPreviewValues] = useState<FormValues>({});
  const [previewStep, setPreviewStep] = useState(0);
  useEffect(() => {
    if (remote.loading || remote.error) return;
    setRecord(remote.data);
    const loaded = remote.data?.draft_schema as unknown as ApplicationFormSchema | undefined;
    setSchema(loaded ?? blankForm());
    setSectionId(loaded?.sections[0]?.id ?? "");
    setFieldId("");
  }, [remote.data, remote.loading, remote.error]);
  const dirty = JSON.stringify(schema) !== JSON.stringify(record?.draft_schema ?? blankForm());
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (confirm("Leave this builder without saving your changes?")) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const section = schema.sections.find((item) => item.id === sectionId);
  const selectedField = section?.fields.find((item) => item.id === fieldId);
  const changeSection = (patch: Partial<FormSection>) =>
    setSchema((current) => ({
      ...current,
      sections: current.sections.map((item) =>
        item.id === sectionId ? { ...item, ...patch } : item,
      ),
    }));
  const changeField = (patch: Partial<FormField>) => {
    if (section && selectedField)
      changeSection({
        fields: section.fields.map((item) => (item.id === fieldId ? { ...item, ...patch } : item)),
      });
  };
  const reportError = (error: unknown) => {
    setFailed(true);
    setNotice(authErrorMessage(error, "Unable to update the form."));
  };
  const persist = async (publish: boolean) => {
    const errors = schemaErrors(schema, publish);
    if (errors.length) {
      setFailed(true);
      setNotice(errors.join(" "));
      return;
    }
    if (
      publish &&
      !confirm(
        "Publish this form for new applicants? Saved drafts and submitted applications retain their original version.",
      )
    )
      return;
    setBusy(true);
    setNotice("");
    setFailed(false);
    try {
      let saved = record;
      if (dirty || !saved) {
        saved = await saveFormBuilder(cycle.id, schema, record?.draft_revision ?? 0);
        setRecord(saved);
        setSchema(saved.draft_schema as unknown as ApplicationFormSchema);
      }
      if (publish) {
        saved = await publishForm(cycle.id, saved!.draft_revision);
        setRecord(saved);
      }
      setNotice(
        publish
          ? "Form published. New applicants will use this version."
          : "Builder draft saved. The published form has not changed.",
      );
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  };
  const addSection = () => {
    const next: FormSection = {
      id: crypto.randomUUID(),
      title: "Untitled section",
      description: "",
      fields: [],
    };
    setSchema((current) => ({ ...current, sections: [...current.sections, next] }));
    setSectionId(next.id);
    setFieldId("");
  };
  if (remote.loading || remote.error)
    return <DataState loading={remote.loading} error={remote.error} retry={remote.refresh} />;
  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">
            {record?.published_schema
              ? `Published · version ${record.published_revision}`
              : "Not published"}
            {dirty ? " · Unsaved edits" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                setPreview((value) => !value);
                setPreviewStep(0);
              }}
            >
              <Eye size={15} />
              {preview ? "Edit form" : "Preview form"}
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void persist(false)}>
              Save builder draft
            </Button>
            <Button variant="cta" size="sm" disabled={busy} onClick={() => void persist(true)}>
              {busy ? "Saving…" : "Publish form"}
            </Button>
            {record?.published_schema && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  if (
                    !confirm(
                      "Unpublish for new applicants? Saved drafts keep their original form. Close the recruitment campaign to stop all saves and submissions.",
                    )
                  )
                    return;
                  setBusy(true);
                  setNotice("");
                  setFailed(false);
                  try {
                    await unpublishForm(cycle.id, record.published_revision);
                    setRecord((current) => current && { ...current, published_schema: null });
                    setNotice(
                      "Form unpublished for new applicants. Saved applications are preserved.",
                    );
                  } catch (error) {
                    reportError(error);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Unpublish
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-ink-soft">
          Saving a builder draft does not publish it. Publishing affects new applications only.
          FY/SY options must match the drive; class/division is free text.
        </p>
        {notice && (
          <p
            role={failed ? "alert" : "status"}
            className={`rounded-lg border p-3 text-sm ${failed ? "border-[#f3c0c0] bg-[#fbe9e9]/60 text-[#a13939]" : "border-line bg-celadon/15"}`}
          >
            {notice}
          </p>
        )}
      </Card>
      {preview ? (
        <div className="mx-auto max-w-3xl" data-testid="application-form-preview">
          <Card className="space-y-5 p-6">
            <p className="rounded-lg bg-paper-2 p-3 text-xs">
              Preview only. Answers entered here are not saved as an application.
            </p>
            <h2 className="font-display text-2xl font-bold">
              {schema.title || "Untitled application form"}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-ink-soft">{schema.description}</p>
            {!!schema.sections.length && (
              <>
                <div className="flex flex-wrap gap-2">
                  {[...schema.sections.map((item) => item.title), "Review"].map((title, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={previewStep === index ? "primary" : "outline"}
                      onClick={() => setPreviewStep(index)}
                    >
                      {title}
                    </Button>
                  ))}
                </div>
                {previewStep >= schema.sections.length ? (
                  <BuiltFormReview schema={schema} values={previewValues} preview />
                ) : (
                  <section className="space-y-5">
                    <h3 className="font-display text-xl font-semibold">
                      {schema.sections[previewStep].title}
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-ink-soft">
                      {schema.sections[previewStep].description}
                    </p>
                    {schema.sections[previewStep].fields.map((field) => (
                      <BuiltFormField
                        key={field.id}
                        field={field}
                        value={previewValues[field.id]}
                        onChange={(value) =>
                          setPreviewValues((current) => ({ ...current, [field.id]: value }))
                        }
                        preview
                      />
                    ))}
                  </section>
                )}
              </>
            )}
            {!schema.sections.length && (
              <p className="text-sm text-ink-soft">Add sections and fields to see the preview.</p>
            )}
          </Card>
        </div>
      ) : (
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          <Card className="space-y-4 p-5">
            <Field label="Form title" required>
              <input
                className={inputCls}
                maxLength={200}
                value={schema.title}
                onChange={(event) =>
                  setSchema((current) => ({ ...current, title: event.target.value }))
                }
              />
            </Field>
            <Field label="Form introduction">
              <textarea
                className={inputCls}
                maxLength={4000}
                rows={3}
                value={schema.description}
                onChange={(event) =>
                  setSchema((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={domains.loading || !!domains.error}
                onClick={() => {
                  if (
                    schema.sections.length &&
                    !confirm(
                      "Replace the builder layout with the PICT starter? This does not change saved applications or the published form until you publish.",
                    )
                  )
                    return;
                  const starter = pictStarter(cycle, domains.data ?? []);
                  setSchema(starter);
                  setSectionId(starter.sections[0].id);
                  setFieldId("");
                  setPreviewValues({});
                }}
              >
                Use PICT starter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    schema.sections.length &&
                    !confirm(
                      "Clear this builder draft layout? Published forms and saved applications are not deleted.",
                    )
                  )
                    return;
                  setSchema(blankForm());
                  setSectionId("");
                  setFieldId("");
                }}
              >
                Start blank
              </Button>
            </div>
            <p className="text-xs text-ink-soft">
              Optional starter: CE, IT, ENTC, AIDS, ECE; typed class/division; FY, SY or both from
              this drive. You can edit/remove all its fields. No form is created for a new drive
              until you choose to save and publish.
            </p>
            <DataState error={domains.error} retry={domains.refresh} />
          </Card>
          <div className="grid min-w-0 gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
            <Card className="min-w-0 space-y-3 self-start p-4">
              <h2 className="font-display font-semibold">Sections</h2>
              {schema.sections.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-line p-2">
                  <button
                    type="button"
                    className={`w-full break-words rounded px-2 py-2 text-left text-sm ${item.id === sectionId ? "bg-indigo text-white" : ""}`}
                    onClick={() => {
                      setSectionId(item.id);
                      setFieldId("");
                    }}
                  >
                    {index + 1}. {item.title}
                  </button>
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label={`Move section up: ${item.title}`}
                      className="rounded p-2 disabled:opacity-30"
                      onClick={() =>
                        setSchema((current) => ({
                          ...current,
                          sections: move(current.sections, index, -1),
                        }))
                      }
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === schema.sections.length - 1}
                      aria-label={`Move section down: ${item.title}`}
                      className="rounded p-2 disabled:opacity-30"
                      onClick={() =>
                        setSchema((current) => ({
                          ...current,
                          sections: move(current.sections, index, 1),
                        }))
                      }
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove section: ${item.title}`}
                      className="ml-auto rounded p-2 text-[#a13939]"
                      onClick={() => {
                        if (
                          !confirm(
                            `Remove section “${item.title}” from the builder draft? Existing applications are not changed.`,
                          )
                        )
                          return;
                        const next = schema.sections.filter((section) => section.id !== item.id);
                        setSchema((current) => ({ ...current, sections: next }));
                        if (sectionId === item.id) {
                          setSectionId(next[0]?.id ?? "");
                          setFieldId("");
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={schema.sections.length >= 12}
                onClick={addSection}
              >
                <Plus size={14} />
                Add section
              </Button>
            </Card>
            <div className="min-w-0 space-y-5">
              {section ? (
                <>
                  <Card className="space-y-4 p-5">
                    <Field label="Section title">
                      <input
                        className={inputCls}
                        maxLength={200}
                        value={section.title}
                        onChange={(event) => changeSection({ title: event.target.value })}
                      />
                    </Field>
                    <Field label="Section instructions">
                      <textarea
                        className={inputCls}
                        maxLength={4000}
                        rows={2}
                        value={section.description}
                        onChange={(event) => changeSection({ description: event.target.value })}
                      />
                    </Field>
                  </Card>
                  <Card className="min-w-0 space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-display font-semibold">Fields</h2>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={allFields(schema).length >= 60}
                          onClick={() => {
                            const next = makeField();
                            changeSection({ fields: [...section.fields, next] });
                            setFieldId(next.id);
                          }}
                        >
                          <Plus size={14} />
                          Add field
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            setNotice("");
                            setFailed(false);
                            try {
                              const result = await supabase
                                .from("recruitment_questions")
                                .select("*")
                                .eq("recruitment_cycle_id", cycle.id)
                                .eq("active", true)
                                .order("display_order");
                              if (result.error) throw result.error;
                              const existing = new Set(allFields(schema).map((field) => field.id));
                              const imported = (result.data ?? [])
                                .filter((question) => !existing.has(`q_${question.id}`))
                                .map((question) => ({
                                  ...makeField(
                                    "",
                                    question.question_type === "single_choice"
                                      ? "select"
                                      : (question.question_type as FormFieldType),
                                  ),
                                  id: `q_${question.id}`,
                                  label: question.question,
                                  required: question.required,
                                  options: (Array.isArray(question.options) ? question.options : [])
                                    .filter((item): item is string => typeof item === "string")
                                    .map((value) => ({ value, label: value })),
                                }));
                              changeSection({ fields: [...section.fields, ...imported] });
                              setNotice(
                                imported.length
                                  ? `${imported.length} existing questions added to this section. Save and publish to use them.`
                                  : "No additional existing questions to import.",
                              );
                            } catch (error) {
                              reportError(error);
                            }
                          }}
                        >
                          Import existing questions
                        </Button>
                      </div>
                    </div>
                    {section.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className={`rounded-lg border p-3 ${field.id === fieldId ? "border-tekhelet bg-paper-2/40" : "border-line"}`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="min-w-0 flex-1 break-words text-left text-sm font-medium"
                            onClick={() => setFieldId(field.id)}
                          >
                            {field.label}
                            {field.required ? " *" : ""}
                            <span className="mt-1 block text-xs font-normal text-ink-soft">
                              {typeLabels[field.type]}
                              {field.binding ? " · Linked field" : ""}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={index === 0}
                            aria-label={`Move field up: ${field.label}`}
                            className="rounded p-2 disabled:opacity-30"
                            onClick={() =>
                              changeSection({ fields: move(section.fields, index, -1) })
                            }
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={index === section.fields.length - 1}
                            aria-label={`Move field down: ${field.label}`}
                            className="rounded p-2 disabled:opacity-30"
                            onClick={() =>
                              changeSection({ fields: move(section.fields, index, 1) })
                            }
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove field: ${field.label}`}
                            className="rounded p-2 text-[#a13939]"
                            onClick={() => {
                              if (
                                !confirm(
                                  `Remove “${field.label}” from the builder draft? Saved answers are preserved.`,
                                )
                              )
                                return;
                              changeSection({
                                fields: section.fields.filter((item) => item.id !== field.id),
                              });
                              if (fieldId === field.id) setFieldId("");
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!section.fields.length && (
                      <p className="text-sm text-ink-soft">
                        No fields in this section. Add a field, then set its label and input type.
                      </p>
                    )}
                  </Card>
                  {selectedField && (
                    <div className="min-w-0" data-testid="field-editor">
                      <Card className="space-y-4 p-5">
                        <h2 className="font-display font-semibold">Edit field</h2>
                        <Field label="Field label" required>
                          <input
                            className={inputCls}
                            maxLength={200}
                            value={selectedField.label}
                            onChange={(event) => changeField({ label: event.target.value })}
                          />
                        </Field>
                        <Field
                          label="Link to profile / application"
                          hint="Custom questions stay with the application. Linked fields also populate the profile and admin filters."
                        >
                          <select
                            className={inputCls}
                            value={selectedField.binding}
                            onChange={(event) => {
                              const next = makeField(event.target.value, selectedField.type);
                              if (next.type === "domains") {
                                next.options = (domains.data ?? []).map((domain) => ({
                                  value: domain.id,
                                  label: domain.name,
                                }));
                                next.maxSelections = cycle.max_preferences;
                              }
                              if (next.binding === "profile.year")
                                next.options = pictStarter(cycle).sections[0].fields.find(
                                  (field) => field.binding === "profile.year",
                                )!.options;
                              changeField({
                                ...next,
                                id: selectedField.id,
                                required: selectedField.required,
                              });
                            }}
                          >
                            <option value="">Custom question (no profile link)</option>
                            {linkedFields.map(([value, label]) => (
                              <option
                                key={value}
                                value={value}
                                disabled={allFields(schema).some(
                                  (field) =>
                                    field.id !== selectedField.id && field.binding === value,
                                )}
                              >
                                {label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Input type">
                          <select
                            className={inputCls}
                            value={selectedField.type}
                            onChange={(event) => {
                              const kind = event.target.value as FormFieldType;
                              changeField({
                                type: kind,
                                ...(kind === "domains"
                                  ? {
                                      binding: "domains",
                                      options: (domains.data ?? []).map((domain) => ({
                                        value: domain.id,
                                        label: domain.name,
                                      })),
                                      maxSelections: cycle.max_preferences,
                                    }
                                  : {}),
                              });
                            }}
                          >
                            {allowedTypes(selectedField).map((type) => (
                              <option key={type} value={type}>
                                {typeLabels[type]}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedField.required}
                            onChange={(event) => changeField({ required: event.target.checked })}
                          />
                          Required answer
                        </label>
                        <Field label="Help text">
                          <textarea
                            className={inputCls}
                            maxLength={1000}
                            rows={2}
                            value={selectedField.help}
                            onChange={(event) => changeField({ help: event.target.value })}
                          />
                        </Field>
                        <Field label="Placeholder">
                          <input
                            className={inputCls}
                            maxLength={300}
                            value={selectedField.placeholder}
                            onChange={(event) => changeField({ placeholder: event.target.value })}
                          />
                        </Field>
                        {selectedField.type === "domains" ? (
                          <div className="space-y-3">
                            <p className="text-sm font-medium">Offered domains</p>
                            {domains.data?.map((domain) => (
                              <label key={domain.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedField.options.some(
                                    (option) => option.value === domain.id,
                                  )}
                                  onChange={(event) =>
                                    changeField({
                                      options: event.target.checked
                                        ? [
                                            ...selectedField.options,
                                            { value: domain.id, label: domain.name },
                                          ]
                                        : selectedField.options.filter(
                                            (option) => option.value !== domain.id,
                                          ),
                                    })
                                  }
                                />
                                {domain.name}
                              </label>
                            ))}
                            <Field label="Maximum domain preferences">
                              <select
                                className={inputCls}
                                value={selectedField.maxSelections}
                                onChange={(event) =>
                                  changeField({ maxSelections: Number(event.target.value) })
                                }
                              >
                                {[1, 2, 3]
                                  .filter((value) => value <= cycle.max_preferences)
                                  .map((value) => (
                                    <option key={value}>{value}</option>
                                  ))}
                              </select>
                            </Field>
                          </div>
                        ) : (
                          ["select", "radio", "multi_choice"].includes(selectedField.type) && (
                            <div className="space-y-3">
                              <p className="text-sm font-medium">Options</p>
                              {selectedField.binding === "profile.year" && (
                                <div className="flex gap-2">
                                  {(cycle.target_batch.trim().toUpperCase() === "FY"
                                    ? ["FY"]
                                    : cycle.target_batch.trim().toUpperCase() === "SY"
                                      ? ["SY"]
                                      : ["FY", "SY"]
                                  ).map((value) => (
                                    <Button
                                      key={value}
                                      size="sm"
                                      variant="outline"
                                      disabled={selectedField.options.some(
                                        (option) => option.value === value,
                                      )}
                                      onClick={() =>
                                        changeField({
                                          options: [
                                            ...selectedField.options,
                                            {
                                              value,
                                              label:
                                                value === "FY"
                                                  ? "First Year (FY)"
                                                  : "Second Year (SY)",
                                            },
                                          ],
                                        })
                                      }
                                    >
                                      Add {value}
                                    </Button>
                                  ))}
                                </div>
                              )}
                              {selectedField.options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <input
                                    aria-label={`Option ${index + 1}`}
                                    className={inputCls}
                                    maxLength={200}
                                    value={option.label}
                                    onChange={(event) =>
                                      changeField({
                                        options: selectedField.options.map((item, i) =>
                                          i === index
                                            ? {
                                                value:
                                                  selectedField.binding === "profile.year"
                                                    ? item.value
                                                    : event.target.value,
                                                label: event.target.value,
                                              }
                                            : item,
                                        ),
                                      })
                                    }
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    aria-label={`Remove option ${index + 1}`}
                                    onClick={() =>
                                      changeField({
                                        options: selectedField.options.filter(
                                          (_, i) => i !== index,
                                        ),
                                      })
                                    }
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              ))}
                              {selectedField.binding !== "profile.year" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={selectedField.options.length >= 80}
                                  onClick={() =>
                                    changeField({
                                      options: [...selectedField.options, { value: "", label: "" }],
                                    })
                                  }
                                >
                                  Add option
                                </Button>
                              )}
                            </div>
                          )
                        )}
                        {selectedField.type === "file" && (
                          <p className="rounded-lg bg-paper-2 p-3 text-xs">
                            Private uploads accept PDF, JPG or PNG up to 5 MB. Only the applicant
                            and authorised admins can open them. Submitted form attachments cannot
                            be deleted by the applicant.
                          </p>
                        )}
                      </Card>
                    </div>
                  )}
                </>
              ) : (
                <Card className="p-8 text-sm text-ink-soft">
                  Start blank or choose the optional PICT starter, then add and edit your sections.
                </Card>
              )}
            </div>
          </div>
        </fieldset>
      )}
    </div>
  );
}

function allowedTypes(field: FormField): FormFieldType[] {
  if (!field.binding) return fieldTypes.filter((type) => type !== "domains" || !field.binding);
  if (field.binding === "identity.email") return ["email"];
  if (field.binding === "profile.year") return ["select"];
  if (field.binding === "profile.division") return ["short_text"];
  if (field.binding === "domains") return ["domains"];
  if (
    ["profile.github_url", "profile.linkedin_url", "profile.portfolio_url"].includes(field.binding)
  )
    return ["url"];
  return ["short_text", "long_text", "phone", "select", "radio"];
}
