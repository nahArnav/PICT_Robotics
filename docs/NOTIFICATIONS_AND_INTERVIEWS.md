# Notifications, email and interview scheduling

## Delete a notification after reading

- Applicants: **Dashboard → Announcements & notifications**.
- Admins/super admins: open the **notification bell** in the admin header.
- Choose **Mark read**, then **Delete**, then confirm. Already-read items show Delete immediately.
- Deletion is permanent for that notification and persists across refresh/logout/login. Unread items must first be marked read. Public announcements are not personal notifications and are not deleted with this control.
- Database RLS allows only an active account to delete its own read notifications. Admin/super-admin roles cannot delete another account's notifications. This migration does not remove any existing rows automatically.
- Removing a notification does not remove the underlying application/interview/result. Notification retry receipts are separate, so retrying an old member message does not recreate a deliberately deleted notification.

## What sends mail

Production inspection on 2026-10-18 confirmed **Supabase Auth with custom Gmail SMTP**, host `smtp.gmail.com`, port `465`, with email confirmation enabled. Supabase handles signup verification and password-recovery emails through that configured SMTP account. Credentials remain server-side; they are not part of the browser build or this repository.

**Member Mail, application updates and interview updates currently send in-app notifications, not external emails.** Staff invitation creation returns a one-use link for manual sharing; it does not send an invitation email automatically. Configuring Auth SMTP does not turn these application messages into emails. Real production inbox delivery has not been established by local email tests.

## Schedule an interview

1. Sign in as an admin or super admin. Open **Applicants**, find the applicant, then open their details.
2. Use **Move to next stage** to move `submitted → under_review → shortlisted`. Only shortlisted/interview-scheduled applications are eligible; draft applications cannot be scheduled.
3. Click **Schedule interview** in the applicant drawer. Alternatively open **Interviews** and find/select the shortlisted applicant.
4. Choose an active admin/super-admin **Interviewer**, a future **Date and time**, **Duration in minutes** (5–480), and a **Venue** and/or **Meeting URL**.
5. Click **Save interview**. It is persisted, the application becomes interview-scheduled, and the applicant gets an in-app notification and schedule in their portal.

The date/time input uses the browser/device's local timezone and is stored in UTC. Past appointments and overlapping scheduled bookings for the same interviewer are rejected by the database. Calendar/Panels views show scheduled work; **Reschedule / update** changes time/details or marks an interview cancelled/completed/no-show.

Meeting links must be created separately and pasted into Meeting URL. The app does not automatically create Google Meet/Zoom rooms, calendar invites or interview emails.
