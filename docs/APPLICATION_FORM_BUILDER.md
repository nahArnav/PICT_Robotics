# Admin application form builder

Admins and super admins can build the whole recruitment application at **Admin → Form Builder** (`/admin/form-builder`). Applicants cannot edit the form configuration, including through direct database/API requests.

## Build and publish

1. Create or select the recruitment campaign under Admin → Recruitment. Set its opening/closing dates, target batch and maximum domain preferences.
2. Open Form Builder and choose that campaign in **Form campaign**. Start blank, or explicitly choose **Use PICT starter**.
3. Add, remove and reorder sections and fields with the arrow controls. Edit labels, help text, placeholders, required status and choice options. Link a field to a profile/application property only when it should update that property; leave custom questions unlinked.
4. Preview the applicant steps and review screen. Preview answers are temporary and never create an application or upload files.
5. **Save builder draft** stores a private admin draft. It does not change what applicants see. **Publish form** validates and explicitly publishes the current configuration. Unsaved edits are saved as part of publishing.
6. Return to Recruitment and use **Open recruitment** when the dates cover the current time. New campaigns have no application form until an admin publishes one.

The PICT starter offers **CE, IT, ENTC, AIDS and ECE**. Class/division is a typed field, not a dropdown. Set the campaign's target batch to exactly `FY` or `SY` to restrict the linked year options to that group; `FY/SY` offers both. The linked year field must use FY/SY values. Branch choices remain admin-editable. A text target batch is not independent proof of enrollment.

Available inputs: short text, paragraph, email, phone, website URL, number, date, dropdown, single choice, checkboxes, private file upload and ranked domain preferences. Domain fields use active club domains and cannot exceed the campaign's preference limit (1–3). Limits: 12 sections, 60 fields, 80 options per field. Conditional branching, drag-and-drop ordering and version rollback are not implemented.

Legacy Recruitment → Questions is retained for historical compatibility. Editing that list does not silently change a published builder form. Use the builder's explicit question-import control, then review and publish.

## Applicant data and versions

- Loading a form, editing fields, clicking Continue between steps or using admin Preview does not create a database application. An applicant must explicitly Save Draft or Submit Application. Unsaved entries remain only in the current page.
- The first save pins the published form to that application. Later publications affect new applications only; saved drafts and submitted applications retain their original fields and answers.
- Existing pre-builder drafts are copied into an editable form snapshot without deleting their original answers, preferences or application. Previously answered inactive questions are retained. An old choice outside the offered options must be corrected by the applicant; no replacement answer is invented.
- Submitted historical applications retain their original review format. New builder responses appear in both the applicant review and admin applicant drawer.
- Unpublish stops new applications but preserves already saved versions. Close recruitment stops saves/submissions for everyone, including existing drafts. Dates are also enforced on the server.
- A concurrent admin edit produces a conflict message rather than overwriting another admin's saved configuration. Reload and reconcile deliberately.

## Files and security

File fields use the existing private applicant bucket: PDF/JPG/PNG, up to 5 MB. Viewing uses short-lived signed links. Submitted attachments cannot be deleted from the owner's document library. Removing a draft field value clears its reference, not the underlying storage file; unused uploads may require owner/operator cleanup.

The backend enforces schema, required answers, types, offered choices, file ownership, immutable versions, deadlines and account permissions. Frontend hiding alone is not the security boundary. No role, password, email provider or external-email behavior changes are part of this feature.
