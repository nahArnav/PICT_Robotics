import { useState, useRef } from "react";
import { Button, Card, Field, inputCls } from "../../components/ui";
import { DataState } from "../../components/DataState";
import { authErrorMessage } from "../../lib/auth";
import { useRemote } from "../../lib/useRemote";
import { getRecruitmentCycles } from "../../lib/services/admin";
import {
  listResource,
  removeResource,
  saveResource,
  type ResourceName,
  type ResourceRecord,
} from "../../lib/services/resources";
import { uploadClubImage, removeUnusedClubImage } from "../../lib/services/storage";
import { useAdminCycle } from "./context";

type InputKind =
  | "text"
  | "textarea"
  | "number"
  | "datetime-local"
  | "checkbox"
  | "url"
  | "cycle"
  | "json"
  | "tags"
  | readonly string[];
type Spec = {
  key: string;
  label: string;
  kind?: InputKind;
  required?: boolean;
  initial?: unknown;
};
const text = (key: string, label: string, required = false, kind: InputKind = "text"): Spec => ({
  key,
  label,
  required,
  kind,
});
const toggle = (key: string, label: string): Spec => ({
  key,
  label,
  kind: "checkbox",
  initial: false,
});
const order = text("display_order", "Display order", true, "number");
const cycle = text("recruitment_cycle_id", "Recruitment cycle", true, "cycle");
const title = text("title", "Title", true);
const description = text("description", "Description", true, "textarea");
const image = text("image_url", "Image URL", false, "url");
const content = [
  title,
  description,
  text("year", "Year", true, "number"),
  text("category", "Category"),
  image,
  toggle("featured", "Featured"),
  toggle("published", "Published"),
  order,
];
export const resourceSpecs: Record<
  ResourceName,
  {
    title: string;
    fields: Spec[];
  }
> = {
  achievements: {
    title: "Achievements",
    fields: [
      ...content,
      text("competition", "Competition"),
      text("rank", "Rank / position"),
      text("team", "Team"),
      toggle("major", "Large spotlight card"),
      text("external_url", "External URL", false, "url"),
    ],
  },
  projects: {
    title: "Projects",
    fields: [
      ...content,
      text("slug", "Unique URL slug", true),
      text("tags", "Tags (comma separated)", false, "tags"),
      text("repository_url", "Repository URL", false, "url"),
      text("demo_url", "Demo URL", false, "url"),
    ],
  },
  club_events: {
    title: "Events",
    fields: [
      title,
      text("summary", "Summary (10–320 characters)", true, "textarea"),
      description,
      text("category", "Category", true),
      text("starts_at", "Starts", true, "datetime-local"),
      text("ends_at", "Ends", false, "datetime-local"),
      text("location", "Venue", true),
      text("registration_url", "Registration URL", false, "url"),
      text("capacity", "Capacity", false, "number"),
      image,
      {
        key: "status",
        label: "Status",
        kind: ["draft", "published", "cancelled", "completed"],
        initial: "draft",
      },
      toggle("featured", "Featured"),
      order,
    ],
  },
  announcements: {
    title: "Announcements",
    fields: [
      title,
      text("content", "Message", true, "textarea"),
      {
        key: "type",
        label: "Type",
        kind: ["general", "recruitment", "interview", "task"],
        initial: "general",
      },
      toggle("published", "Published"),
      text("published_at", "Publish at (blank = now)", false, "datetime-local"),
      text("expires_at", "Expires at", false, "datetime-local"),
    ],
  },
  recruitment_cycles: {
    title: "Recruitment cycles",
    fields: [
      text("name", "Campaign name", true),
      text("academic_year", "Academic year", true),
      text("target_batch", "Target batch", true),
      description,
      text("application_open", "Applications open", true, "datetime-local"),
      text("application_close", "Applications close", true, "datetime-local"),
      {
        key: "status",
        label: "Status",
        kind: ["draft", "upcoming", "open", "closed", "completed"],
        initial: "draft",
      },
      {
        ...text("max_preferences", "Maximum domain preferences (1–3)", true, "number"),
        initial: 3,
      },
    ],
  },
  recruitment_rounds: {
    title: "Recruitment rounds",
    fields: [
      cycle,
      text("name", "Round name", true),
      description,
      text("round_type", "Round type", true),
      text("start_at", "Starts", false, "datetime-local"),
      text("end_at", "Ends", false, "datetime-local"),
      toggle("active", "Active"),
      order,
    ],
  },
  recruitment_questions: {
    title: "Recruitment questions",
    fields: [
      cycle,
      text("question", "Question", true, "textarea"),
      {
        key: "question_type",
        label: "Answer type",
        kind: ["short_text", "long_text", "single_choice", "multi_choice", "url", "number"],
        initial: "long_text",
      },
      toggle("required", "Required"),
      toggle("active", "Active"),
      order,
      {
        key: "options",
        label: "Choice options (JSON array of strings)",
        kind: "json",
        initial: [],
      },
    ],
  },
  recruitment_tasks: {
    title: "Recruitment tasks",
    fields: [
      cycle,
      title,
      text("instructions", "Instructions", true, "textarea"),
      text("deadline", "Deadline", true, "datetime-local"),
      toggle("active", "Published to eligible applicants"),
    ],
  },
  club_team_entries: {
    title: "Team",
    fields: [
      title,
      text("names", "Names (comma separated)", true, "tags"),
      text("description", "Description", false, "textarea"),
      image,
      toggle("published", "Published"),
      order,
    ],
  },
  gallery_items: {
    title: "Gallery",
    fields: [title, { ...image, required: true }, toggle("published", "Published"), order],
  },
  homepage_metrics: {
    title: "Homepage highlights",
    fields: [
      title,
      text("value", "Display value (e.g. 11+)", true),
      toggle("published", "Published"),
      order,
    ],
  },
  domains: {
    title: "Domains",
    fields: [
      text("name", "Domain name", true),
      text("short_description", "Short description", true),
      text("detailed_description", "Full description", false, "textarea"),
      image,
      toggle("active", "Active"),
      order,
    ],
  },
};
export const toLocalTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function ResourceManager({ table }: { table: ResourceName }) {
  const { refreshCycles } = useAdminCycle();
  const spec = resourceSpecs[table];
  const defaults = () =>
    Object.fromEntries(
      spec.fields.map((field) => [
        field.key,
        field.initial ??
          (field.kind === "number" && field.required
            ? field.key === "year"
              ? new Date().getFullYear()
              : 0
            : ""),
      ]),
    );
  const [values, setValues] = useState<Record<string, unknown>>(defaults);
  const [editing, setEditing] = useState<string>();
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const remote = useRemote(() => listResource(table, page), [table, page]);
  const cycles = useRemote(getRecruitmentCycles);
  const set = (key: string, value: unknown) =>
    setValues((current) => ({ ...current, [key]: value }));
  function edit(row: ResourceRecord) {
    setSelectedFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setEditing(row.id);
    setNotice("");
    setValues(
      Object.fromEntries(
        spec.fields.map((field) => {
          let value = row[field.key] ?? defaults()[field.key];
          if (field.kind === "datetime-local" && value) value = toLocalTime(String(value));
          if (field.kind === "json") value = JSON.stringify(value);
          if (field.kind === "tags" && Array.isArray(value)) value = value.join(", ");
          return [field.key, value];
        }),
      ),
    );
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    let uploadedImage: string | undefined;
    try {
      const input = Object.fromEntries(
        spec.fields.map((field) => {
          let value = values[field.key];
          if (field.kind === "datetime-local")
            value = value ? new Date(String(value)).toISOString() : null;
          if (field.kind === "number") value = value === "" ? null : Number(value);
          if (field.kind === "json") value = typeof value === "string" ? JSON.parse(value) : value;
          if (field.kind === "tags")
            value = String(value)
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
          return [field.key, value];
        }),
      );
      if (table === "announcements" && input.published && !input.published_at)
        input.published_at = new Date().toISOString();
      if (selectedFile) {
        uploadedImage = await uploadClubImage(selectedFile);
        input.image_url = uploadedImage;
      }
      const warning = await saveResource(table, input, editing);
      setNotice(warning || (editing ? "Changes saved." : "Entry created."));
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setEditing(undefined);
      setValues(defaults());
      remote.refresh();
      if (table === "recruitment_cycles") refreshCycles();
    } catch (error) {
      if (uploadedImage)
        try {
          await removeUnusedClubImage(uploadedImage);
        } catch {
          /* Keep the original save error. Referenced uploads are never removed. */
        }
      setNotice(
        authErrorMessage(
          error,
          "Unable to save this entry. Check required fields and permissions.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card className="min-w-0 p-6">
        <h2 className="font-display text-xl font-bold">
          {editing ? "Edit" : "Create"} {spec.title.toLowerCase()}
        </h2>
        {table === "recruitment_cycles" && (
          <p className="mt-3 text-sm text-ink-soft">
            Applicants can continue only when Status is open and the current time is between
            Applications open and Applications close. Times below use{" "}
            {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </p>
        )}
        <form onSubmit={save} className="mt-5 space-y-4">
          {spec.fields.map((field) => (
            <Field key={field.key} label={field.label} required={field.required}>
              {field.kind === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(values[field.key])}
                  onChange={(event) => set(field.key, event.target.checked)}
                />
              ) : field.kind === "cycle" ? (
                <select
                  required
                  className={inputCls}
                  value={String(values[field.key] ?? "")}
                  onChange={(event) => set(field.key, event.target.value)}
                >
                  <option value="">Select cycle</option>
                  {cycles.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : Array.isArray(field.kind) ? (
                <select
                  className={inputCls}
                  value={String(values[field.key] ?? "")}
                  onChange={(event) => set(field.key, event.target.value)}
                >
                  {field.kind.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : field.kind === "textarea" || field.kind === "json" ? (
                <textarea
                  required={field.required}
                  className={inputCls}
                  rows={3}
                  value={
                    typeof values[field.key] === "string"
                      ? String(values[field.key])
                      : JSON.stringify(values[field.key])
                  }
                  onChange={(event) => set(field.key, event.target.value)}
                />
              ) : (
                <input
                  required={field.required}
                  className={inputCls}
                  type={
                    field.kind === "tags" || typeof field.kind !== "string" ? "text" : field.kind
                  }
                  value={String(values[field.key] ?? "")}
                  onChange={(event) => set(field.key, event.target.value)}
                />
              )}
            </Field>
          ))}
          {spec.fields.some((field) => field.key === "image_url") && (
            <Field label="Upload image" hint="JPG, PNG or WebP · up to 5 MB">
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setSelectedFile(file);
                  setNotice("Image selected. It will be uploaded when you save.");
                }}
              />
            </Field>
          )}
          {notice && (
            <p role="status" className="text-sm text-ink-soft">
              {notice}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="cta" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create entry"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(undefined);
                  setValues(defaults());
                  setSelectedFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                  setNotice("");
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
      <div className="min-w-0 space-y-3">
        <DataState
          loading={remote.loading}
          error={remote.error}
          retry={remote.refresh}
          empty={
            !remote.loading && !remote.data?.rows.length
              ? "No entries yet. Create the first entry."
              : undefined
          }
        />
        {remote.data?.rows.map((row) => (
          <Card key={row.id} className="p-5">
            <p className="font-display font-semibold">
              {String(row.title ?? row.name ?? row.question ?? row.id)}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {String(
                row.status ??
                  (row.published ? "Published" : row.active ? "Active" : "Draft / inactive"),
              )}
            </p>
            {table === "recruitment_cycles" && (
              <div className="mt-3 space-y-2 text-sm text-ink-soft">
                <p>
                  {new Date(String(row.application_open)).toLocaleString()} →{" "}
                  {new Date(String(row.application_close)).toLocaleString()}
                </p>
                <p>
                  {row.status === "open"
                    ? new Date(String(row.application_close)).getTime() <= Date.now()
                      ? "Expired — applicants cannot continue. Edit the dates before reopening."
                      : new Date(String(row.application_open)).getTime() > Date.now()
                        ? "Scheduled — applications have not started yet."
                        : "Accepting applications now."
                    : "Not accepting applications."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    const close = row.status === "open";
                    if (
                      !close &&
                      (new Date(String(row.application_open)).getTime() > Date.now() ||
                        new Date(String(row.application_close)).getTime() <= Date.now())
                    ) {
                      setNotice(
                        "Edit this campaign’s dates first: opening must be in the past and closing must be in the future.",
                      );
                      return;
                    }
                    if (
                      !confirm(
                        close
                          ? "Close recruitment now? Applicants will no longer be able to save or submit."
                          : "Open recruitment now? Eligible applicants will be able to save and submit until the closing time.",
                      )
                    )
                      return;
                    setBusy(true);
                    setNotice("");
                    try {
                      await saveResource(
                        "recruitment_cycles",
                        { status: close ? "closed" : "open" },
                        row.id,
                      );
                      remote.refresh();
                      refreshCycles();
                      setNotice(
                        close
                          ? "Recruitment closed. Existing applications are preserved."
                          : "Recruitment opened. Applicants can now continue.",
                      );
                    } catch (error) {
                      setNotice(
                        authErrorMessage(error, "Unable to change recruitment availability."),
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {row.status === "open" ? "Close recruitment" : "Open recruitment"}
                </Button>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => edit(row)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  if (
                    !confirm("Delete this entry? Linked recruitment records may prevent deletion.")
                  )
                    return;
                  setBusy(true);
                  try {
                    const warning = await removeResource(table, row.id);
                    remote.refresh();
                    if (table === "recruitment_cycles") refreshCycles();
                    setNotice(warning || "Entry deleted.");
                  } catch (error) {
                    setNotice(
                      authErrorMessage(
                        error,
                        "Unable to delete this entry. It may have linked records.",
                      ),
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" disabled={!page} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm">
            Page {page + 1} · {remote.data?.total ?? 0} entries
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={(page + 1) * 25 >= (remote.data?.total ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
