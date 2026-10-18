import { useState } from "react";
import type { Json } from "../lib/database";
import {
  displayFormValue,
  isEmptyAnswer,
  type ApplicationFormSchema,
  type FormField,
  type FormValues,
} from "../lib/applicationForms";
import { uploadPrivateDocument, privateDocumentUrl } from "../lib/services/storage";
import { authErrorMessage } from "../lib/auth";
import { Button, inputCls } from "./ui";

const fileName = (value: string) =>
  value
    .split("/")
    .at(-1)
    ?.replace(/^[0-9a-f-]{36}-/i, "") ?? "Attachment";

export function BuiltFormField({
  field,
  value,
  onChange,
  preview = false,
  onUploadState,
}: {
  field: FormField;
  value: Json | undefined;
  onChange: (value: Json) => void;
  preview?: boolean;
  onUploadState?: (fieldId: string, uploading: boolean) => void;
}) {
  const id = `field-${field.id}`;
  const common = {
    id,
    "aria-label": field.label,
    required: field.required,
    className: inputCls,
    placeholder: field.placeholder,
  };
  const options = field.options;
  let control;
  if (field.type === "long_text")
    control = (
      <textarea
        {...common}
        rows={4}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  else if (field.type === "select")
    control = (
      <select
        {...common}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  else if (["radio", "multi_choice"].includes(field.type))
    control = (
      <fieldset id={id} aria-label={field.label} className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 rounded-lg border border-line p-3 text-sm"
          >
            <input
              type={field.type === "radio" ? "radio" : "checkbox"}
              name={id}
              value={option.value}
              checked={
                field.type === "radio"
                  ? value === option.value
                  : Array.isArray(value) && value.includes(option.value)
              }
              onChange={(event) =>
                onChange(
                  field.type === "radio"
                    ? option.value
                    : event.target.checked
                      ? [...(Array.isArray(value) ? value : []), option.value]
                      : Array.isArray(value)
                        ? value.filter((item) => item !== option.value)
                        : [],
                )
              }
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    );
  else if (field.type === "domains") {
    const preferences = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
    control = (
      <div id={id} className="space-y-4">
        <p className="text-sm text-ink-soft">
          Rank up to {field.maxSelections} distinct domains. Click an optional selection again to
          clear it.
        </p>
        {["Primary", "Secondary", "Third"].slice(0, field.maxSelections).map((label, index) => (
          <div key={label} role="group" aria-label={`${label} preference`}>
            <p className="mb-2 text-sm font-medium">
              {label} preference {index === 0 && field.required ? "*" : ""}
            </p>
            {index > 0 && !preferences[index - 1] ? (
              <p className="text-sm text-ink-soft">Choose the previous preference first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {options
                  .filter((option) => !preferences.slice(0, index).includes(option.value))
                  .map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium ${preferences[index] === option.value ? "border-tekhelet bg-tekhelet text-white" : "border-line bg-white text-ink-soft hover:border-line-strong"}`}
                      onClick={() => {
                        const next = preferences.slice(0, index);
                        if (preferences[index] !== option.value || (index === 0 && field.required))
                          next.push(option.value);
                        onChange(next);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } else if (field.type === "file")
    control = (
      <FileAnswer
        field={field}
        value={value}
        onChange={onChange}
        preview={preview}
        onUploadState={onUploadState}
      />
    );
  else
    control = (
      <input
        {...common}
        type={
          ["email", "url", "number", "date"].includes(field.type)
            ? field.type
            : field.type === "phone"
              ? "tel"
              : "text"
        }
        readOnly={field.binding === "identity.email"}
        value={String(value ?? "")}
        onChange={(event) =>
          onChange(
            field.type === "number" && event.target.value !== ""
              ? Number(event.target.value)
              : event.target.value,
          )
        }
      />
    );
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium">
        {field.label}
        {field.required && (
          <span aria-hidden="true" className="ml-1 text-tekhelet">
            *
          </span>
        )}
      </label>
      {control}
      {!!field.help && <p className="mt-1 text-xs text-ink-soft">{field.help}</p>}
    </div>
  );
}

function FileAnswer({
  field,
  value,
  onChange,
  preview,
  onUploadState,
}: {
  field: FormField;
  value: Json | undefined;
  onChange: (value: Json) => void;
  preview: boolean;
  onUploadState?: (fieldId: string, uploading: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <input
        id={`field-${field.id}`}
        aria-label={field.label}
        type="file"
        disabled={preview || busy}
        accept="application/pdf,image/jpeg,image/png"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError("");
          onUploadState?.(field.id, true);
          try {
            onChange(await uploadPrivateDocument(file));
          } catch (error) {
            setError(authErrorMessage(error, "Unable to upload this file."));
          } finally {
            setBusy(false);
            onUploadState?.(field.id, false);
            event.target.value = "";
          }
        }}
      />
      <p className="text-xs text-ink-soft">
        {preview
          ? "Uploads are disabled in preview."
          : "Private upload · PDF, JPG or PNG · up to 5 MB"}
      </p>
      {busy && (
        <p role="status" className="text-sm">
          Uploading…
        </p>
      )}
      {typeof value === "string" && value && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="break-all">{fileName(value)}</span>
          <button
            type="button"
            className="text-tekhelet underline"
            disabled={busy}
            onClick={() => onChange("")}
          >
            Remove attachment
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-[#a13939]">
          {error}
        </p>
      )}
    </div>
  );
}

function AttachmentLink({ path }: { path: string }) {
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          setError("");
          try {
            window.open(await privateDocumentUrl(path), "_blank", "noopener,noreferrer");
          } catch (error) {
            setError(authErrorMessage(error, "Unable to open the attachment."));
          }
        }}
      >
        {fileName(path)}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#a13939]">
          {error}
        </p>
      )}
    </div>
  );
}

export function BuiltFormReview({
  schema,
  values,
  preview = false,
}: {
  schema: ApplicationFormSchema;
  values: FormValues;
  preview?: boolean;
}) {
  return (
    <div className="space-y-6">
      {schema.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h3 className="font-display text-lg font-semibold">{section.title}</h3>
          {section.fields.map((field) => (
            <div key={field.id} className="border-b border-line pb-3 text-sm">
              <p className="mb-1 font-medium">{field.label}</p>
              {field.type === "file" && !isEmptyAnswer(values[field.id]) && !preview ? (
                <AttachmentLink path={String(values[field.id])} />
              ) : (
                <p className="whitespace-pre-wrap break-words text-ink-soft">
                  {field.type === "file" && !isEmptyAnswer(values[field.id])
                    ? fileName(String(values[field.id]))
                    : displayFormValue(field, values[field.id])}
                </p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
