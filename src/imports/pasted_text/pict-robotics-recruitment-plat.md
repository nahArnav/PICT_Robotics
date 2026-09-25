Design a polished, high-fidelity, clickable MVP in Figma for the official website and recruitment management platform of the PICT Robotics Club.

This is NOT just a college club landing page.

It is a unified platform with two purposes:

1. PUBLIC CLUB WEBSITE
Showcase the Robotics Club, its engineering work, achievements, projects, teams and identity.

2. RECRUITMENT MANAGEMENT SYSTEM
Make recruitment of First Year (FY) and Second Year (SY) students organized, trackable and easy to manage for both applicants and Robotics Club coordinators.

The final product should feel like it belongs to a serious technical organization that builds real robots — not like a generic college website.

Do NOT focus on backend implementation or code architecture.

Focus on:
- UI/UX
- information architecture
- reusable components
- responsive layouts
- applicant flows
- recruitment management flows
- clickable prototype interactions
- visual consistency
- realistic content

==================================================
CORE PRODUCT IDEA
==================================================

The core recruitment workflow is:

Applicant
→ Registration/Application
→ Recruitment Round
→ Task/Test
→ Evaluation
→ Interview
→ Final Decision

FY and SY recruitment should be visually handled as separate recruitment tracks but inside the same system.

The MVP should convincingly demonstrate how the entire recruitment process can replace:

- Google Forms
- spreadsheets
- scattered WhatsApp updates
- manually maintained interview lists
- separate score sheets
- manually tracking shortlisted candidates

==================================================
VISUAL DIRECTION
==================================================

The visual identity should be:

- sophisticated
- modern
- engineering-focused
- slightly futuristic
- clean
- premium
- technical
- youthful without looking childish
- memorable without becoming flashy

Avoid:

- generic Bootstrap-style dashboards
- generic college website aesthetics
- excessive gradients
- excessive glassmorphism
- cyberpunk/neon gaming aesthetics
- huge amounts of black
- overly rounded childish cards
- unnecessary 3D objects
- random floating shapes
- stock-photo-heavy layouts

The design should feel like:

"Robotics + engineering + systems thinking + modern product design"

Use subtle visual inspiration from:

- PCB traces
- robotics schematics
- coordinate systems
- circuit networks
- sensor paths
- mechanical drawings
- grids
- nodes
- line-following paths
- technical labels

These elements should remain subtle and should never interfere with usability.

==================================================
COLOUR PALETTE
==================================================

Use ONLY this supplied palette as the main brand palette:

Persian Indigo
#360568

Tekhelet
#5B2A86

Glaucous
#7785AC

Light Teal
#9AC6C5

Celadon
#A5E6BA

Also create appropriate neutral shades such as:
- warm off-white
- very light grey
- charcoal text
- muted border colours

Do not introduce random blue or green brand colours.

Colour roles:

PRIMARY DARK
#360568

PRIMARY
#5B2A86

SECONDARY / INFORMATION
#7785AC

SOFT ACCENT
#9AC6C5

HIGHLIGHT / POSITIVE CTA
#A5E6BA

Recommended hierarchy:

60% neutral/off-white surfaces

25% Persian Indigo + Tekhelet

10% Glaucous + Light Teal

5% Celadon highlights

Use Celadon selectively so that important CTA buttons and positive actions stand out.

Example primary CTA:

Celadon background
#A5E6BA

Dark Persian Indigo text
#360568

Example primary dark button:

#360568 background
white text

==================================================
TYPOGRAPHY
==================================================

Use a strong contemporary sans-serif system.

Recommended combination:

Display/headings:
Space Grotesk or similar geometric modern sans-serif

Body/UI:
Inter or similar highly readable sans-serif

Use strong typographic contrast.

Homepage hero:
large expressive typography.

Dashboard:
compact and functional typography.

Avoid decorative fonts.

==================================================
FIGMA DESIGN SYSTEM
==================================================

Create reusable Figma components and variants.

Use Auto Layout everywhere.

Use Variables / Styles for:

- colours
- spacing
- typography
- radii
- shadows

Suggested spacing system:

4
8
12
16
24
32
48
64
96

Use approximately:

Card radius:
12–16 px

Button radius:
8–12 px

Avoid excessive pill-shaped interfaces.

Create components for:

Navbar
Sidebar
Button
Icon Button
Input
Textarea
Select
Checkbox
Radio
Tabs
Badge
Status Chip
Avatar
Project Card
Achievement Card
Member Card
Metric Card
Applicant Card
Applicant Row
Recruitment Stage
Progress Stepper
Timeline Item
Task Card
Interview Card
Announcement Card
Filter Bar
Search Bar
Modal
Drawer
Dropdown
Empty State
Toast
Table
Pagination
Breadcrumbs

Include component states:

default
hover
active
disabled
selected
error
success

==================================================
LAYOUT SYSTEM
==================================================

Desktop frame:
1440 px

Use a 12-column grid.

Maximum main content width:
approximately 1200–1280 px.

Dashboard sidebar:
approximately 240–260 px.

Mobile frame:
390 px.

Tablet considerations:
768–1024 px.

Use responsive Auto Layout.

The public website should feel spacious.

The dashboard should feel denser and more information-efficient.

==================================================
FIGMA FILE ORGANIZATION
==================================================

Organize the design into pages:

00 — Cover

01 — Foundations

02 — Components

03 — Public Website

04 — Applicant Experience

05 — Admin Dashboard

06 — Prototype Flows

07 — Mobile

==================================================
PUBLIC WEBSITE
==================================================

Create these primary public screens:

1. Home
2. About
3. Projects
4. Project Detail
5. Achievements
6. Team
7. Recruitment
8. Gallery

Focus highest fidelity on:

Home
Projects
Achievements
Recruitment

==================================================
HOME PAGE
==================================================

Create an impressive robotics-focused homepage.

-----------------------------------
NAVBAR
-----------------------------------

Left:
PICT Robotics Club logo placeholder

Navigation:

Home
About
Projects
Achievements
Team
Recruitment
Gallery

Right side:

Recruitment 2026

When logged in:
Dashboard

Navbar should initially feel integrated with the hero and transition into a slightly translucent/sticky navbar while scrolling.

-----------------------------------
HERO
-----------------------------------

Suggested headline:

ENGINEERING MACHINES.
BUILDING INNOVATORS.

or another similarly concise engineering-focused headline.

Supporting text:

A student-driven community at PICT building robots, autonomous systems, embedded solutions and competitive engineering projects.

Primary CTA:

Explore Our Work

Secondary CTA:

Join Robotics Club

Create a custom abstract robotics visual on the right side.

Ideas:

- robotic path
- connected sensor nodes
- circuit traces
- schematic-style robot diagram
- coordinate grid
- animated line-following path

Add small technical labels around the visual:

CONTROL

VISION

EMBEDDED

MECHANICAL

AUTONOMY

The hero should look excellent before scrolling.

-----------------------------------
CLUB METRICS
-----------------------------------

Create a clean metrics strip.

Example placeholder metrics:

10+
Years

50+
Members

30+
Projects

25+
Podiums

Use large numbers and minimal supporting text.

-----------------------------------
WHAT WE BUILD
-----------------------------------

Create cards for:

Autonomous Robotics

Embedded Systems

Computer Vision

Electronics

Mechanical Design

Control Systems

Programming

Competitive Robotics

Each card should include:

icon
domain name
short one-line description

Cards should have understated hover behaviour.

-----------------------------------
FEATURED PROJECTS
-----------------------------------

Create an editorial project showcase rather than a generic card grid.

Show approximately 3 featured projects.

Each:

project image
name
category
year
technology tags
one-sentence description

Include:

View Project →

Create alternating compositions so the section feels visually dynamic.

-----------------------------------
ACHIEVEMENT FEATURE
-----------------------------------

Create one large achievement spotlight.

Include:

competition name
position
year
project/robot
team
competition image

Example visual hierarchy:

02
PLACE

or

RUNNER-UP

Use large typography.

CTA:

Explore All Achievements →

-----------------------------------
CLUB TIMELINE
-----------------------------------

Create a horizontally scrolling or vertical interactive timeline.

Years:

2021
2022
2023
2024
2025
2026

Each year can show:

projects
competition wins
club milestones

-----------------------------------
RECRUITMENT CTA
-----------------------------------

This should be one of the strongest sections.

Suggested copy:

THINK.
BUILD.
BREAK.
IMPROVE.

Recruitment for FY & SY students.

Two options:

FY Recruitment

SY Recruitment

Include status:

APPLICATIONS OPEN

Deadline

View Recruitment →

-----------------------------------
FOOTER
-----------------------------------

PICT Robotics Club

Navigation

Projects
Achievements
Recruitment
Team

Social links:

Instagram
LinkedIn
GitHub
YouTube

Use a dark Persian Indigo background.

==================================================
PROJECTS PAGE
==================================================

Create a clean project archive.

Top:

PROJECTS

Supporting description.

Filters:

All
Autonomous
Embedded
Vision
Mechanical
Software

Secondary filter:

Year

Search field.

Use large project cards.

Each project contains:

image
project name
category
year
technology chips
short summary

Clicking project opens project detail.

==================================================
PROJECT DETAIL
==================================================

Create a technical case-study style page.

Sections:

Project Hero

Overview

Problem

Approach

System Architecture

Hardware

Software

Gallery

Team

Competition / Result

Do not design it like a blog article.

Make it feel like an engineering portfolio case study.

==================================================
ACHIEVEMENTS PAGE
==================================================

Create a visually strong archive.

Header:

ACHIEVEMENTS

Subtitle such as:

Built. Tested. Competed.

Create year filters.

Example:

2026
2025
2024
2023
All

Achievement items should include:

Competition
Year
Position
Robot/project
Team
Image
Description

Use a timeline/grid hybrid.

Major achievements should visually stand out from smaller achievements.

==================================================
TEAM PAGE
==================================================

Create:

Leadership

Core Team

Members

Provide filters by:

Software
Mechanical
Electronics
Embedded
Vision

Member card:

portrait
name
role
domain
LinkedIn
GitHub

Add:

Previous Teams

Academic year selector.

==================================================
RECRUITMENT LANDING PAGE
==================================================

This is a critical screen.

Header:

BUILD WITH US.

Recruitment 2026

Explain the recruitment philosophy briefly.

Show two prominent cards:

FY RECRUITMENT

For first-year students.

Learn, explore and build foundations.

Button:
Apply for FY

Status:
OPEN


SY RECRUITMENT

For second-year students.

Work deeper in technical domains and club projects.

Button:
Apply for SY

Status:
OPEN

Below this show:

Recruitment Process

Registration
→
Application
→
Technical Round
→
Task
→
Interview
→
Selection

Create a visual recruitment timeline.

Also include:

Eligibility

Important Dates

FAQs

Contact Recruitment Team

==================================================
APPLICANT AUTH FLOW
==================================================

Create:

Sign In

Create Account

College Email Verification

Minimal interface.

Use clean split-screen or centered layouts.

==================================================
APPLICATION FORM
==================================================

Design a multi-step application form.

Progress header:

1 Personal Details
2 Technical Profile
3 Domain Preference
4 Questions
5 Review

PERSONAL DETAILS

Name
PICT email
phone
branch
division
year

TECHNICAL PROFILE

Skills
Programming languages
Projects
GitHub
LinkedIn

DOMAIN PREFERENCE

Software
Electronics
Mechanical
Embedded
Computer Vision

Allow:

Primary preference
Secondary preference

QUESTIONS

Why do you want to join Robotics Club?

Tell us about something you have built.

What technical skill would you like to learn?

REVIEW

Show all entered details before final submission.

CTA:

Submit Application

Provide:

Save Draft

Autosaved indicator.

==================================================
APPLICANT DASHBOARD
==================================================

Create a polished dashboard.

Desktop sidebar:

Overview
Application
Tasks
Interview
Announcements
Result

Top:

Welcome back, [Name]

FY Recruitment 2026

Status badge:

IN PROGRESS

Main component:

Recruitment Progress

Application
✓

Technical Round
✓

Task Round
CURRENT

Interview
LOCKED

Final Result
LOCKED

Make this component extremely clear and visually appealing.

==================================================
DASHBOARD OVERVIEW
==================================================

Include:

CURRENT ROUND

Task Round

Deadline:
24 September • 11:59 PM


APPLICATION ID

RC-FY-0241


CURRENT STATUS

Task Assigned


UPCOMING

Technical Interview
Pending Qualification

-----------------------------------

ANNOUNCEMENTS

Examples:

Task Round instructions released

Deadline updated

Interview information

-----------------------------------

CURRENT TASK

Build a Line Following Robot Simulation

Due:
24 Sep

Button:
View Task

==================================================
TASK SCREEN
==================================================

Show:

Task title

Deadline

Instructions

Resources

Submission requirements

Submission fields:

GitHub URL
Drive URL
Notes

Status:

NOT SUBMITTED

After submission:

SUBMITTED

Submitted:
22 Sep • 8:42 PM

Allow:

Edit Submission

before deadline.

==================================================
INTERVIEW SCREEN
==================================================

When unlocked:

TECHNICAL INTERVIEW

Date

Time

Venue

Panel

Instructions

Example:

26 September 2026

4:20 PM

Robotics Lab

Panel 03

Status:

CONFIRMED

Optionally create:

Choose Interview Slot

showing several slot cards.

==================================================
RESULT SCREEN
==================================================

Design states:

Result Pending

Selected

Waitlisted

Not Selected

Create the selected state tastefully.

Avoid excessive confetti.

Example:

WELCOME TO
PICT ROBOTICS CLUB

Your recruitment process is complete.

CTA:

Continue →

==================================================
ADMIN DASHBOARD
==================================================

This is the second-most important area.

The experience must feel significantly better than managing spreadsheets.

Sidebar:

Overview

Applicants

Recruitment

Tasks

Interviews

Evaluations

Announcements

Content

Analytics

Settings

Top bar:

Search

Notifications

Admin avatar

Campaign selector:

FY Recruitment 2026

==================================================
ADMIN OVERVIEW
==================================================

Metrics:

TOTAL APPLICANTS
324

FY
221

SY
103

SHORTLISTED
126

INTERVIEWS
48

SELECTED
—

Create charts:

Recruitment Funnel

Applicants by Branch

Domain Preferences

FY vs SY

Use supplied colours.

Avoid rainbow charts.

==================================================
RECRUITMENT FUNNEL
==================================================

Create a clear visual funnel:

324
Applications

↓

258
Technical Round

↓

162
Task Round

↓

82
Interview

↓

—
Selected

Clicking stage should conceptually filter applicants.

==================================================
APPLICANTS PAGE
==================================================

This screen is extremely important.

Create a professional applicant table.

Top:

Applicants

324 total

Search applicant...

Filters:

FY/SY

Branch

Domain

Current Stage

Status

Table columns:

checkbox

Applicant

Year

Branch

Primary Domain

Current Stage

Score

Interview

Status

Actions

Example applicant:

Aarav Shah

FY

IT

Software

Task Round

82

—

In Progress

Create realistic example records.

==================================================
BULK ACTIONS
==================================================

When several applicants are selected show floating/sticky bulk action bar.

Example:

23 applicants selected

Move Stage

Assign Interview

Shortlist

Reject

Send Announcement

The interaction should feel extremely efficient.

==================================================
APPLICANT DETAIL
==================================================

Clicking applicant opens a full page or large right-side drawer.

Header:

Applicant name

Application ID

FY / SY

Current Stage

Status

Tabs:

Profile

Application

Task

Scores

Interview

Notes

PROFILE:

branch
division
phone
email
GitHub
LinkedIn

DOMAIN PREFERENCES

Primary:
Software

Secondary:
Computer Vision

APPLICATION ANSWERS

Display clearly.

INTERNAL NOTES

Visible only to admins.

==================================================
RECRUITMENT PIPELINE
==================================================

Create admin screen:

Recruitment
→ FY Recruitment 2026

Header:

FY Recruitment 2026

Status:
IN PROGRESS

Dates

Applicant count

Create pipeline cards:

Registration
324

Technical Round
258

Task Round
162

Interview
82

Final Selection

Allow cards to conceptually be reordered.

Add:

+ Add Stage

This demonstrates that future coordinators can configure recruitment without developers.

==================================================
INTERVIEW MANAGEMENT
==================================================

Create a scheduling dashboard.

Views:

Calendar

Schedule

Panels

Today's Interviews

Show time slots.

Example:

4:00
Aarav Shah
Panel 1

4:20
Riya Mehta
Panel 1

4:40
Karan Joshi
Panel 2

Allow:

Assign Interview

Reschedule

Change Panel

==================================================
INTERVIEW EVALUATION
==================================================

Create interviewer-specific evaluation screen.

Applicant summary on left.

Scoring on right.

Rubric:

Technical Fundamentals
8 / 10

Problem Solving
9 / 10

Practical Understanding
7 / 10

Learning Ability
9 / 10

Communication
4 / 5

Team Fit
4 / 5

Internal notes field.

Final recommendation:

Strong Yes

Yes

Maybe

No

Button:

Submit Evaluation

This information should visually appear clearly PRIVATE / INTERNAL.

==================================================
ANNOUNCEMENT MANAGEMENT
==================================================

Create simple admin interface.

New Announcement

Title

Message

Audience:

All Applicants

FY

SY

Task Round

Interview Round

Selected Candidates

Button:

Publish

Show recently published announcements.

==================================================
ADMIN CONTENT MANAGEMENT
==================================================

Create simplified CMS screen.

Manage:

Projects

Achievements

Team

Gallery

Homepage Highlights

Use CRUD-style content cards/table.

This screen only needs enough fidelity to demonstrate that the public website can be maintained without editing code.

==================================================
MVP PRIORITY
==================================================

Prioritize these screens above everything else:

1. Homepage
2. Recruitment Landing Page
3. Application Form
4. Applicant Dashboard
5. Applicant Task Page
6. Applicant Interview Page
7. Admin Overview
8. Applicant Management Table
9. Applicant Detail
10. Recruitment Pipeline
11. Interview Management
12. Interview Evaluation
13. Projects
14. Achievements

These should receive the highest visual polish.

Other pages can reuse the same design system.

==================================================
PROTOTYPE FLOWS
==================================================

Create clickable prototype connections for FOUR major flows.

FLOW 1 — PUBLIC VISITOR

Homepage
→ Projects
→ Project Detail
→ Achievements
→ Recruitment

FLOW 2 — APPLICANT

Recruitment
→ FY Recruitment
→ Sign Up
→ Application
→ Submit
→ Applicant Dashboard
→ Task
→ Submit Task
→ Interview
→ Result

FLOW 3 — RECRUITMENT ADMIN

Admin Overview
→ Applicants
→ Select Applicants
→ Move to Task Round
→ Open Applicant
→ Review Submission
→ Assign Interview
→ Interview Schedule

FLOW 4 — INTERVIEWER

Today's Interviews
→ Applicant
→ Review Profile
→ Evaluation
→ Submit Evaluation

==================================================
MICROINTERACTIONS
==================================================

Prototype subtle interactions such as:

Navbar hover

Buttons

Project card hover

Applicant row hover

Dashboard sidebar active state

Filter selection

Dropdowns

Recruitment stage progress

Modal opening

Drawer opening

Task submission state

Table bulk selection

Interview slot selection

Do not over-animate.

==================================================
MOBILE MVP
==================================================

Create responsive mobile versions of:

Homepage

Recruitment Landing

Application Form

Applicant Dashboard

Task Submission

Interview Details

Do NOT prioritize mobile admin dashboard.

Admin is primarily desktop/tablet oriented.

==================================================
ACCESSIBILITY
==================================================

Maintain strong contrast.

Do not use colour alone to communicate status.

Combine:

colour
icon
text

Use readable text sizes.

Inputs should have labels.

Buttons should have clear visual hierarchy.

==================================================
REALISTIC COPY
==================================================

Do not fill the screens with Lorem Ipsum.

Use realistic Robotics Club content.

Use realistic applicant names, engineering project titles, competition names, domains and recruitment instructions.

Keep copy concise.

==================================================
IMPORTANT UX PRINCIPLE
==================================================

The recruitment process should always answer three questions for an applicant:

1. Where am I in the process?
2. What do I need to do next?
3. When do I need to do it?

The admin interface should always answer:

1. How many applicants are at each stage?
2. Who requires action?
3. How can I perform that action quickly?

==================================================
FINAL EXPERIENCE
==================================================

The public website should communicate:

"We build serious engineering projects."

The applicant interface should communicate:

"This recruitment process is organized and transparent."

The admin interface should communicate:

"This is dramatically easier than Google Forms and spreadsheets."

Use the supplied palette consistently:

#360568
#5B2A86
#7785AC
#9AC6C5
#A5E6BA

Build this as a coherent Figma product system rather than as unrelated individual screens.