You are GPT-5.6 acting as a senior full-stack engineer, backend architect, database engineer, security engineer, QA engineer, and product engineer.

You are working inside Figma Make on an existing web application for the PICT Robotics Club.

The existing Figma Make project contains the frontend/UI and visual design for a modern robotics club website + FY/SY recruitment management platform.

YOUR JOB IS NOT TO CREATE A STATIC PROTOTYPE.

Your job is to turn the existing application into a FUNCTIONAL, PERSISTENT, MULTI-USER WEB APPLICATION with a real Supabase backend.

Do not use fake/mock persistence for any production flow.

Do not merely make buttons appear to work.

Every important user action must perform the correct backend operation, persist correctly, return meaningful success/error states, and remain correct after refresh, logout/login, browser restart, and access from another account.

IMPORTANT IMPLEMENTATION PRINCIPLE:

Use the existing Figma design, visual language, component system, navigation, spacing, typography, colors, and UX wherever possible.

Do NOT redesign the application unnecessarily.

Do NOT replace the existing UI with generic dashboards or generic SaaS templates.

Improve the implementation underneath the existing design.

==================================================

1. PRIMARY PRODUCT
   ==================================================

The product is the official PICT Robotics Club website and recruitment management system.

It serves TWO major purposes:

A. PUBLIC CLUB WEBSITE

* Showcase PICT Robotics Club
* Explain the club
* Showcase achievements over the years
* Showcase projects
* Showcase domains/teams
* Display recruitment information
* Provide application access
* Provide announcements and important recruitment information

B. RECRUITMENT MANAGEMENT PLATFORM

* FY and SY student registration
* Applicant authentication
* Applicant profile
* Recruitment application
* Domain preferences
* Application submission
* Application status tracking
* Recruitment rounds
* Screening
* Shortlisting
* Interview management
* Admin review
* Admin status management
* Applicant communication/status visibility
* Recruitment analytics
* Club content management

The final application should behave like a real production-oriented college-club recruitment platform.

==================================================
2. BACKEND TECHNOLOGY
=====================

Use:

* Supabase Authentication
* Supabase PostgreSQL
* Supabase Row Level Security
* Supabase Storage
* Supabase Realtime where useful
* Supabase Edge Functions where server-side logic is required
* Supabase secrets for sensitive credentials
* Supabase-generated APIs / client SDK

Do not expose:

* service_role key
* private API keys
* SMTP secrets
* admin secrets
* Edge Function secrets
* privileged database credentials

in frontend/browser code.

Use only safe public Supabase credentials in the client.

Any privileged operation must execute server-side through an appropriate secure mechanism.

==================================================
3. FIRST: INSPECT THE EXISTING APPLICATION
==========================================

Before modifying anything:

1. Inspect all existing screens.
2. Inspect all navigation flows.
3. Inspect every interactive component.
4. Identify all forms.
5. Identify every page that currently uses mock/static data.
6. Identify all buttons that currently have no backend action.
7. Identify existing applicant/admin flows.
8. Identify existing dashboard states.
9. Identify existing recruitment-related screens.
10. Identify existing achievements/project/content management screens.
11. Identify reusable components.
12. Preserve the existing visual design.

Create an internal feature inventory before implementation.

Then map:

EXISTING UI
↓
BACKEND ACTION
↓
DATABASE TABLE
↓
AUTHORIZATION RULE
↓
SUCCESS STATE
↓
ERROR STATE

Do not remove a feature simply because its backend does not yet exist.

==================================================
4. IMPORTANT: REAL SUPABASE BACKEND
===================================

Connect this application to the Supabase project connected to this Figma Make file.

Do NOT create fake JavaScript-only state as a replacement for the backend.

Do NOT use:

* hard-coded users
* localStorage as the primary database
* session-only application records
* static JSON as the actual source of truth
* mock applicants
* fake login logic
* fake admin authentication

The Supabase database must become the source of truth.

If the application currently contains mock data, retain it only as optional development/demo seed data and clearly separate it from production data.

All actual CRUD operations must use Supabase.

==================================================
5. DATABASE ARCHITECTURE
========================

Build a normalized relational schema suitable for the application.

Use UUID primary keys wherever appropriate.

At minimum create the following entities.

---

## PROFILES

profiles

Fields:

* id UUID primary key
* full_name
* email
* phone
* roll_number
* branch
* year
* division
* profile_photo_url
* github_url
* linkedin_url
* portfolio_url
* bio
* created_at
* updated_at

The id must correspond to the authenticated Supabase user.

---

## USER ROLES

user_roles

Fields:

* id
* user_id
* role
* created_at

Allowed roles:

* applicant
* recruiter
* admin
* super_admin

Do not trust a role supplied by the frontend.

Authorization must be enforced server-side/database-side.

---

## RECRUITMENT CYCLES

recruitment_cycles

Fields:

* id
* name
* academic_year
* target_batch
* description
* application_open
* application_close
* status
* created_at
* updated_at

Possible statuses:

* draft
* upcoming
* open
* closed
* completed

---

## DOMAINS

domains

Fields:

* id
* name
* short_description
* detailed_description
* icon
* image_url
* active
* display_order
* created_at
* updated_at

Examples may include robotics-related domains such as:

* Mechanical
* Electronics
* Embedded Systems
* ROS
* Computer Vision
* AI/ML
* Software
* Automation

Use the actual domains already represented in the UI rather than inventing unnecessary ones.

---

## APPLICATIONS

applications

Fields:

* id
* applicant_id
* recruitment_cycle_id
* status
* motivation
* experience_summary
* github_url
* portfolio_url
* submitted_at
* updated_at
* reviewed_at
* reviewed_by

Application statuses should support a controlled workflow such as:

* draft
* submitted
* under_review
* shortlisted
* interview_scheduled
* selected
* waitlisted
* rejected
* withdrawn

Never allow arbitrary status strings from the client.

---

## APPLICATION DOMAIN PREFERENCES

application_domain_preferences

Fields:

* id
* application_id
* domain_id
* preference_order
* created_at

The system must prevent duplicate domain preferences for the same application.

---

## APPLICATION ANSWERS

application_answers

Fields:

* id
* application_id
* question_id
* answer
* created_at
* updated_at

---

## RECRUITMENT QUESTIONS

recruitment_questions

Fields:

* id
* recruitment_cycle_id
* question
* question_type
* required
* display_order
* active
* options
* created_at

Support question types such as:

* short_text
* long_text
* single_choice
* multi_choice
* url
* number

---

## INTERVIEWS / ROUNDS

recruitment_rounds

Fields:

* id
* recruitment_cycle_id
* name
* description
* round_type
* start_at
* end_at
* active
* created_at

interviews

Fields:

* id
* application_id
* round_id
* interviewer_id
* scheduled_at
* location
* meeting_url
* status
* notes
* created_at
* updated_at

---

## EVALUATIONS

evaluations

Fields:

* id
* application_id
* round_id
* evaluator_id
* technical_score
* communication_score
* problem_solving_score
* teamwork_score
* overall_score
* feedback
* recommendation
* created_at
* updated_at

Do not expose evaluator-only information to applicants.

---

## ACHIEVEMENTS

achievements

Fields:

* id
* title
* description
* year
* category
* image_url
* external_url
* featured
* display_order
* created_at
* updated_at

---

## PROJECTS

projects

Fields:

* id
* title
* description
* year
* category
* image_url
* repository_url
* demo_url
* featured
* display_order
* created_at
* updated_at

---

## ANNOUNCEMENTS

announcements

Fields:

* id
* title
* content
* type
* published
* published_at
* expires_at
* created_by
* created_at
* updated_at

---

## NOTIFICATIONS

notifications

Fields:

* id
* user_id
* title
* message
* type
* read
* created_at

---

## AUDIT LOG

audit_logs

Fields:

* id
* actor_id
* action
* entity_type
* entity_id
* metadata
* created_at

Use this for security-sensitive administrative actions such as:

* changing applicant status
* selecting/rejecting applicants
* changing recruitment dates
* creating/deleting administrators
* modifying recruitment rounds
* modifying application records

==================================================
6. AUTHENTICATION ARCHITECTURE
==============================

THIS IS CRITICAL.

The application must have TWO DISTINCT AUTHENTICATION EXPERIENCES:

A. APPLICANT AUTHENTICATION
B. ADMIN/RECRUITER AUTHENTICATION

They must NOT be treated as the same public signup form.

---

## APPLICANT ENTRY

Create a clearly labelled:

"Applicant Login"

and

"Applicant Sign Up"

flow.

Applicant signup should collect appropriate information such as:

* full name
* email
* password
* phone
* roll number
* branch
* year

After successful signup:

1. Create the Supabase Auth account.
2. Create the corresponding profile.
3. Assign role = applicant.
4. Redirect to applicant dashboard/profile/application flow.
5. Do NOT grant admin privileges.

Applicants must only be able to access applicant functionality.

---

## ADMIN ENTRY

Create a completely separate:

"Admin Login"

entry point.

Example route/flow:

/admin/login

This page must be visually distinct from applicant login while remaining consistent with the main branding.

There must NOT be a normal public:

"Create Admin Account"

button available to everyone.

Do NOT allow a user to select:

[ Applicant ]
[ Admin ]

during normal signup.

A malicious user must never be able to obtain admin privileges by changing frontend values, URLs, request payloads, or role fields.

---

## ADMIN PROVISIONING

Use an invite-only / controlled admin provisioning model.

Recommended hierarchy:

super_admin
↓
admin
↓
recruiter
↓
applicant

Only authorized administrators should be able to create/invite other administrators.

For the initial super_admin account:

Use a secure bootstrap mechanism appropriate to the Supabase project.

Do not hard-code an admin password into source code.

Do not expose the service-role key.

Do not implement a frontend-only admin verification system.

---

## ADMIN LOGIN

When an administrator logs into /admin/login:

1. Authenticate with Supabase Auth.
2. Retrieve their server-enforced role.
3. Verify that the role is one of:

   * recruiter
   * admin
   * super_admin
4. If the account is not privileged:

   * deny access
   * show a clear authorization error
   * do not expose admin dashboard data
5. If authorized:

   * load appropriate admin dashboard
   * apply permissions based on role.

---

## ROLE-BASED ADMIN ACCESS

recruiter:

* view assigned recruitment data
* evaluate applications
* conduct interviews
* update allowed evaluation fields
* view relevant applicant information

admin:

* all recruiter capabilities
* manage applicants
* manage recruitment rounds
* manage domains
* manage announcements
* manage achievements
* manage projects
* view analytics
* manage recruiters

super_admin:

* all admin capabilities
* manage administrators
* manage roles
* manage sensitive configuration
* view audit logs
* manage recruitment cycles
* perform high-level administrative operations

==================================================
7. AUTHENTICATION SECURITY
==========================

Implement:

* persistent authenticated sessions
* logout
* password reset
* email verification where appropriate
* protected routes
* role-aware route guards
* session restoration on refresh
* unauthorized access handling
* expired-session handling
* loading states during authentication
* clear authentication errors

Never rely only on frontend route guards.

Use Supabase Row Level Security for actual data protection.

Even if someone manually calls Supabase APIs outside the UI, unauthorized access must still be rejected.

==================================================
8. ROW LEVEL SECURITY
=====================

Implement proper RLS policies.

Applicants should:

* read their own profile
* update their own profile
* create their own application
* read their own application
* update their own draft application
* read their own notifications
* upload their own permitted files

Applicants must NOT:

* read another applicant's application
* read evaluator notes
* read private admin data
* modify another user's status
* modify roles
* access admin analytics
* access audit logs
* access other applicants' private documents

Recruiters should only access records required for recruitment duties.

Admins should have broader access according to role.

Super_admin should have the highest administrative privileges.

Public users should only access records explicitly marked as public, such as:

* published achievements
* published projects
* active domains
* published announcements
* public recruitment information

==================================================
9. APPLICATION WORKFLOW
=======================

Build the application process as a real workflow.

Applicant:

1. Create account.
2. Complete profile.
3. Select recruitment cycle.
4. Select domain preferences.
5. Answer recruitment questions.
6. Save draft.
7. Review application.
8. Submit application.
9. Receive confirmation.
10. Track application status.

Important:

An applicant must be able to save a draft and return later.

Do not submit incomplete required fields.

After final submission:

* prevent unauthorized edits
* preserve submitted timestamp
* update status to "submitted"
* create notification
* optionally trigger confirmation email through a secure backend function

==================================================
10. APPLICATION VALIDATION
==========================

Implement both client-side and backend validation.

Validate:

* required fields
* email
* phone
* roll number
* URLs
* year
* branch
* domain selection
* duplicate submissions
* recruitment deadline
* application status

The backend must not trust client-side validation.

If the recruitment cycle is closed:

Applicants must not be able to submit a new application even if they manipulate the frontend.

==================================================
11. DUPLICATE APPLICATION PREVENTION
====================================

An applicant must not be able to submit multiple applications for the same recruitment cycle unless explicitly allowed by the recruitment configuration.

Enforce this at database level.

Do not rely only on checking from React.

Use an appropriate unique constraint/index.

==================================================
12. ADMIN DASHBOARD
===================

Build a real admin dashboard using Supabase data.

It should display live data such as:

* total applicants
* submitted applications
* pending reviews
* shortlisted applicants
* interviews scheduled
* selected applicants
* rejected applicants
* applications by branch
* applications by year
* applications by preferred domain
* application status distribution
* recent applications
* recruitment activity

Do not hard-code statistics.

Every statistic must be calculated from actual backend data.

==================================================
13. APPLICATION REVIEW
======================

Admins/recruiters should be able to:

* search applications
* filter by year
* filter by branch
* filter by domain
* filter by status
* open application details
* review answers
* review portfolio/GitHub links
* change status if permitted
* add internal notes
* score applicants
* schedule interviews
* shortlist applicants

Every sensitive status change should optionally create an audit log.

==================================================
14. APPLICANT DASHBOARD
=======================

Applicant dashboard should show:

* profile completion
* current recruitment cycle
* application status
* submitted date
* preferred domains
* upcoming interview/round information
* notifications
* relevant announcements

Applicants must never see:

* internal reviewer notes
* evaluator identity unless intentionally exposed
* private scores unless explicitly configured
* other applicants
* admin-only analytics

==================================================
15. RECRUITMENT ROUND MANAGEMENT
================================

Admins should be able to create recruitment rounds.

Examples:

Round 1
Screening

Round 2
Technical / Practical

Round 3
Interview

The system should support:

* round title
* description
* date/time
* location
* meeting URL
* active/inactive
* eligible applicants
* assigned interviewer
* evaluation form
* round result

Do not hard-code these rounds if the existing application is designed to support configurable recruitment.

==================================================
16. INTERVIEW MANAGEMENT
========================

Implement:

* interviewer assignment
* scheduling
* time/date
* location
* meeting link
* interview status
* evaluator feedback
* score
* round result

Prevent obvious double-booking where applicable.

Show appropriate states in both admin and applicant views.

==================================================
17. FILE UPLOADS
================

Use Supabase Storage.

Potential uploads:

* profile image
* resume/CV if the existing UI requires it
* certificates
* project documentation
* other recruitment documents

Create appropriate storage buckets and access policies.

Private applicant files must NOT be publicly accessible.

Use secure authenticated access.

Validate:

* file type
* file size
* ownership
* upload permissions

Do not place sensitive files in a public bucket merely to make URLs easier.

==================================================
18. PUBLIC WEBSITE CMS
======================

Allow authorized admins to manage:

Achievements
Projects
Announcements
Domains
Recruitment information

Admin operations:

CREATE
READ
UPDATE
DELETE

Public website should show only content that is marked/published as public.

Examples:

* published = true
* active = true
* featured = true

Respect display_order where the UI already uses ordering.

==================================================
19. ACHIEVEMENT SHOWCASE
========================

The achievements section should be data-driven.

Admins can:

* add achievement
* edit achievement
* delete achievement
* upload image
* set year
* set category
* feature/unfeature
* reorder

The public website should automatically reflect changes without requiring code changes.

==================================================
20. PROJECT SHOWCASE
====================

Same concept for club projects.

Admins can:

* create
* edit
* delete
* publish
* feature
* upload project image
* attach GitHub URL
* attach demo URL
* assign year/category

Public pages should use real database data.

==================================================
21. ANNOUNCEMENTS
=================

Admins should be able to create announcements.

Support:

* title
* content
* category/type
* publish/unpublish
* publish date
* expiry date

Public users/applicants should see only active published announcements.

==================================================
22. NOTIFICATION SYSTEM
=======================

Create a notification system for important recruitment events.

Examples:

* application successfully submitted
* application shortlisted
* interview scheduled
* recruitment round updated
* application status changed
* important announcement

Applicants should be able to mark notifications as read.

Implement notifications through the database.

Use Realtime where useful so the UI can update without refresh.

==================================================
23. REALTIME
============

Use Supabase Realtime selectively.

Potential examples:

* applicant status updates
* notification updates
* admin dashboard activity
* application review updates
* interview scheduling changes

Do not add Realtime unnecessarily to every query.

Use it where it meaningfully improves the experience.

==================================================
24. EDGE FUNCTIONS
==================

Use Supabase Edge Functions when a task requires:

* privileged access
* secrets
* external API calls
* email sending
* secure administrative operations
* server-side validation beyond ordinary RLS
* generating sensitive data
* audit-sensitive workflows

Potential functions:

* create-admin-invite
* submit-application
* update-application-status
* schedule-interview
* send-application-confirmation
* send-status-notification

Names may differ based on the final implementation.

Do not place secrets in browser code.

==================================================
25. EMAIL / EXTERNAL SERVICES
=============================

If the application already has email functionality in the UI:

Implement it through a secure backend mechanism.

Do not expose email provider API keys in client code.

Use Supabase secrets / Edge Functions.

If an external service is not currently connected, build the interface cleanly so it can be connected without rewriting the application architecture.

==================================================
26. ERROR HANDLING
==================

Every important backend operation must have:

* loading state
* success state
* validation error
* authorization error
* network error
* unexpected server error

Never silently fail.

Never leave buttons spinning indefinitely.

Use useful user-facing messages.

Examples:

"Your application was submitted successfully."

"You do not have permission to access this page."

"Your application could not be submitted because the recruitment cycle has closed."

"The selected time slot is no longer available."

"Your session has expired. Please log in again."

Avoid exposing raw database errors to users.

==================================================
27. ROUTING
===========

Use clear route separation.

Suggested structure:

/
/about
/achievements
/projects
/domains
/recruitment
/apply
/login
/signup
/applicant
/applicant/profile
/applicant/application
/applicant/status
/applicant/notifications

ADMIN:

/admin
/admin/login
/admin/dashboard
/admin/applicants
/admin/applications
/admin/interviews
/admin/rounds
/admin/domains
/admin/achievements
/admin/projects
/admin/announcements
/admin/analytics
/admin/audit
/admin/settings

Adjust the routes to match the existing application architecture.

Do not create duplicate pages when existing screens can be reused.

==================================================
28. ADMIN LOGIN UX
==================

Make the separation extremely clear.

Public/applicant experience:

"Applicant Portal"

"Login as Applicant"

"Create Applicant Account"

Administrative experience:

"Club Admin Portal"

"Admin Login"

"Admin access is restricted to authorized PICT Robotics Club personnel."

Do NOT display an unrestricted public admin registration form.

Do NOT ask applicants to choose an account type during signup.

Do NOT create a frontend-only dropdown:

Role: Applicant / Admin

and trust that selection.

The role must originate from the backend.

==================================================
29. ADMIN SECURITY EDGE CASES
=============================

Test the following:

1. Applicant enters /admin.
2. Applicant manually navigates to /admin/dashboard.
3. Applicant changes their local storage/session values.
4. Applicant modifies a request attempting to set role = admin.
5. Applicant attempts to read another applicant's data.
6. Applicant attempts to update someone else's application.
7. Applicant attempts to modify application status.
8. Applicant attempts to access evaluator notes.
9. Unauthenticated visitor attempts to access admin routes.
10. Recruiter attempts a super_admin operation.
11. Admin attempts an operation available only to super_admin.
12. Non-admin attempts admin API operations directly.

ALL inappropriate attempts must be rejected.

Do not rely solely on UI hiding.

==================================================
30. SESSION MANAGEMENT
======================

Implement:

* session persistence
* session restoration
* logout
* auth state listener
* protected route handling
* role loading state
* redirect after login
* redirect after logout

Avoid race conditions where the dashboard renders before user role information is loaded.

Do not briefly display privileged content to unauthorized users while role loading occurs.

==================================================
31. DATABASE CONSTRAINTS
========================

Use database-level constraints wherever appropriate.

Examples:

* unique email handled by Auth
* unique roll number where appropriate
* unique application per applicant + recruitment cycle
* valid status constraints
* foreign keys
* not-null constraints
* timestamps
* check constraints
* appropriate indexes

Do not depend exclusively on JavaScript validation.

==================================================
32. DATABASE PERFORMANCE
========================

Create indexes for commonly queried fields such as:

* applicant_id
* recruitment_cycle_id
* status
* domain_id
* year
* branch
* submitted_at
* scheduled_at
* created_at

Avoid unnecessary N+1 queries.

Avoid downloading entire applicant datasets when only summary statistics are needed.

Paginate large admin tables.

==================================================
33. ADMIN SEARCH
================

Implement search efficiently.

Search applicant information such as:

* name
* email
* roll number

Combine with filters such as:

* year
* branch
* domain
* application status
* recruitment cycle

Do not load all applications into the browser solely to perform search filtering.

Prefer backend/database filtering.

==================================================
34. DATA CONSISTENCY
====================

When performing multi-step operations, make sure partial failures do not leave the application in an inconsistent state.

Example:

Application submission should not result in:

status = submitted

while required application records were never saved.

Use appropriate transactional/server-side patterns where needed.

==================================================
35. FRONTEND/BACKEND CONTRACT
=============================

Every frontend action must clearly correspond to an actual backend action.

For every:

* submit
* save
* edit
* delete
* approve
* reject
* shortlist
* schedule
* publish
* unpublish
* upload
* login
* logout
* signup

verify:

1. Correct user.
2. Correct authorization.
3. Correct database operation.
4. Correct UI state.
5. Correct error handling.
6. Correct persistence.

==================================================
36. NO FAKE SUCCESS
===================

This rule is mandatory.

Never show:

"Success"

unless the backend operation actually completed successfully.

Never update the UI optimistically in a way that makes a failed backend operation appear successful.

If optimistic UI is used, reconcile it with actual backend state and revert on failure.

==================================================
37. REFRESH TEST
================

Test every major flow with a full browser refresh.

The following information must survive refresh:

* authenticated session
* applicant profile
* application draft
* submitted application
* application status
* notifications
* public CMS data
* admin dashboard data

Do not rely on React state for persistent information.

==================================================
38. LOGOUT / LOGIN TEST
=======================

Test:

Applicant:

signup
→ logout
→ login
→ profile remains
→ application remains

Admin:

login
→ logout
→ login
→ admin dashboard remains functional

Role must be derived from actual backend records.

==================================================
39. EMPTY STATES
================

Handle empty database states elegantly.

Examples:

No applications yet.

No achievements published.

No upcoming interviews.

No announcements.

No notifications.

No projects available.

Do not use fake data just to fill empty states.

Use appropriate empty-state UI.

==================================================
40. LOADING STATES
==================

Every backend-driven view should have a proper loading state.

Avoid blank screens.

Avoid flashing incorrect information.

Use skeletons/spinners appropriate to the existing design system.

==================================================
41. ACCESSIBILITY
=================

Preserve or improve accessibility.

Ensure:

* forms have labels
* buttons have clear states
* keyboard navigation works
* errors are understandable
* focus states exist
* destructive actions have confirmation
* sufficient contrast
* interactive elements are usable without relying only on color

==================================================
42. RESPONSIVENESS
==================

All backend-driven states must work on:

* desktop
* tablet
* mobile

Do not break the existing visual hierarchy while integrating data.

==================================================
43. ADMIN DESTRUCTIVE ACTIONS
=============================

For destructive operations:

* show confirmation
* clearly state what will be deleted
* prevent accidental deletion
* respect authorization

For important administrative actions, write audit logs.

==================================================
44. AUDIT TRAIL
===============

Record meaningful administrative events.

Example:

Admin X changed application Y:

submitted
→ shortlisted

Store:

* actor
* action
* entity
* timestamp
* relevant metadata

Do not expose the full audit log to applicants.

==================================================
45. ANALYTICS
=============

Admin analytics must use actual database data.

Potential metrics:

* total applicants
* applications by branch
* applications by year
* applications by domain
* application funnel
* submission trend
* status distribution
* interview completion
* selection distribution

Do not fabricate percentages.

If there is insufficient data, show:

"Insufficient data"

rather than invented statistics.

==================================================
46. SECURITY REVIEW
===================

Before declaring the implementation complete, perform a security review.

Specifically verify:

* no service_role key in frontend
* no private credentials in source
* no unrestricted admin signup
* correct role enforcement
* RLS enabled
* applicants cannot read each other
* applicants cannot modify roles
* applicants cannot update statuses
* private files remain private
* admin-only tables are protected
* recruiter permissions are restricted
* super_admin permissions are restricted
* database constraints exist
* authorization is enforced server-side

==================================================
47. BACKEND SCHEMA / MIGRATIONS
===============================

Because this application requires relational data, do NOT stop at simple key-value persistence.

Create a proper SQL schema/migration representation for:

* tables
* enums/check constraints
* indexes
* foreign keys
* RLS policies
* storage policies if appropriate
* triggers/functions where needed

Keep the schema organized and maintainable.

If Figma Make cannot directly execute a particular database migration operation, generate the exact SQL migration required and integrate the application against the intended schema rather than silently replacing it with mock storage.

Do not claim a database migration succeeded unless it actually succeeded.

==================================================
48. SEED DATA
=============

Use realistic development seed data only when useful for testing.

Clearly mark it as seed/demo data.

Never confuse demo data with actual applicant records.

Do not fabricate real college achievements or claim they are actual records unless they already exist in the provided project data.

==================================================
49. TEST MATRIX
===============

Before completion, test at minimum:

AUTHENTICATION

[ ] Applicant signup
[ ] Applicant login
[ ] Applicant logout
[ ] Applicant password reset
[ ] Session restoration
[ ] Admin login
[ ] Unauthorized admin access rejection
[ ] Role resolution
[ ] Recruiter login
[ ] Super admin authorization

APPLICANT

[ ] Profile creation
[ ] Profile edit
[ ] Application creation
[ ] Draft saving
[ ] Draft retrieval
[ ] Required-field validation
[ ] Domain preference selection
[ ] Application submission
[ ] Duplicate application prevention
[ ] Status display
[ ] Notification display

ADMIN

[ ] Applicant listing
[ ] Search
[ ] Filters
[ ] Application review
[ ] Status update
[ ] Evaluation
[ ] Interview scheduling
[ ] Recruitment round creation
[ ] Achievement CRUD
[ ] Project CRUD
[ ] Announcement CRUD
[ ] Analytics
[ ] Audit logs

STORAGE

[ ] File upload
[ ] File access
[ ] Unauthorized file access rejection
[ ] File validation

SECURITY

[ ] RLS policies
[ ] Applicant isolation
[ ] Admin authorization
[ ] Role escalation prevention
[ ] Private data protection

PERSISTENCE

[ ] Refresh after login
[ ] Refresh after application draft
[ ] Refresh after submission
[ ] Logout/login
[ ] Cross-session persistence

==================================================
50. DEBUGGING REQUIREMENT
=========================

Do not stop after generating code.

Run through every major flow mentally and through the available application/test environment.

Look for:

* undefined variables
* invalid Supabase queries
* incorrect table names
* mismatched column names
* broken foreign keys
* authorization failures
* missing RLS policies
* loading deadlocks
* race conditions
* stale UI
* incorrect redirects
* incorrect role handling
* broken mobile states
* broken error states

Fix issues you find.

==================================================
51. NO PLACEHOLDER FUNCTIONALITY
================================

Do not leave code such as:

TODO
IMPLEMENT LATER
MOCK THIS
COMING SOON

for functionality explicitly required in this prompt.

Do not create buttons that do nothing.

If a feature cannot be fully implemented because an external credential/service is genuinely unavailable, isolate that dependency cleanly and implement everything that can be implemented without it.

Clearly identify the exact missing dependency rather than pretending the feature works.

==================================================
52. PRESERVE THE CURRENT DESIGN
===============================

The backend implementation must not destroy the existing visual design.

Preserve:

* existing palette
* typography
* cards
* navigation
* animations
* spacing
* responsive behavior
* visual hierarchy
* robotics-club identity

Only alter UI where necessary to show real backend states or improve functionality.

==================================================
53. FINAL ARCHITECTURE
======================

The desired architecture is conceptually:

Figma Make Frontend
|
v
Supabase Client
|
+----------------------+
|                      |
v                      v
Supabase Auth             PostgreSQL
|
v
RLS Policies
|
+----------------+----------------+
|                |                |
v                v                v
Applications      Profiles        Recruitment
|
+--------------------------+
|                          |
v                          v
Storage                    Edge Functions
|                          |
v                          v
Private files             Secure operations
|
v
Notifications /
Email / APIs

==================================================
54. FINAL ACCEPTANCE CRITERIA
=============================

Do NOT consider the task complete merely because:

* the UI looks good
* buttons animate
* mock data appears
* forms submit visually
* login screens exist

The application is complete only when the important workflows are genuinely connected to backend persistence and authorization.

The final system must satisfy:

1. Real applicant authentication.
2. Real admin authentication.
3. Completely separate applicant and admin entry points.
4. No public unrestricted admin signup.
5. Secure role-based access.
6. Real Supabase persistence.
7. Real application submission.
8. Real application status management.
9. Real recruitment-cycle management.
10. Real interview management.
11. Real admin dashboard data.
12. Real achievements/projects/announcement CMS.
13. Secure file storage.
14. RLS protection.
15. Persistent sessions.
16. Proper error handling.
17. Proper loading states.
18. Responsive UI.
19. No fake success states.
20. No hard-coded production data.
21. No exposed privileged credentials.
22. Auditability of sensitive admin operations.
23. Database-level duplicate prevention.
24. Backend authorization independent of frontend controls.
25. Correct behavior after refresh and relogin.

==================================================
55. IMPORTANT FINAL INSTRUCTION
===============================

Work incrementally.

Do not rewrite the entire application blindly.

First understand the existing Figma Make project.

Then implement the backend architecture.

Then connect authentication.

Then connect applicant functionality.

Then connect admin functionality.

Then connect CMS/content functionality.

Then connect storage.

Then implement security and RLS.

Then test every workflow.

Then fix any issues.

After each major implementation step, verify that previously working functionality still works.

Do not replace real backend behavior with placeholders simply to make the UI appear functional.

Your objective is:

"Make the existing PICT Robotics Club website function as a real, secure, persistent recruitment platform backed by Supabase."

Treat data integrity, authorization, security, and correctness as first-class requirements—not optional enhancements.
