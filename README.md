# LINC Pastor Dashboard

A bilingual English/Arabic church administration platform for LINC Ministries' Leadership Development Program (2026–2028).

The application is built with React, TypeScript, Vite, Firebase, EmailJS, and selected Google integrations. It includes spiritual-gifts assessments, pastoral calendar management, public meeting booking, meeting-request decisions, People Development workflows, NextGen administration, attendance tools, congregation group notes, and bilingual public pages.

The project is currently a client-driven Firebase application. Firebase provides authentication and persistent data services, while much of the business logic still runs in the React client. The current refactor is separating the application into focused UI components, hooks, Firebase modules, selectors, action modules, and email modules so that the application can later move cleanly toward a three-tier architecture:

```text
Frontend → Backend/API → Database
```

---

## Major Refactor Completed

The Pastor Dashboard originally existed as one very large calendar component containing UI rendering, Firebase subscriptions, state management, email generation, file handling, meeting workflows, People Development workflows, NextGen workflows, and meeting-request decisions.

The refactor completed today reorganized that implementation into focused modules without intentionally removing user-facing functionality.

### Dashboard size reduction

```text
Before hook integration: 3,210 lines
After hook integration:  1,603 lines
Net reduction:            1,607 lines
Reduction:                approximately 50%
```

The removed lines were primarily moved into focused modules rather than deleted from the project. The dashboard now acts more like a page-level coordinator instead of containing every implementation detail directly.

---

# AI Assistant Removal

The previous calendar implementation included an experimental AI booking assistant. That feature was removed completely from the active Pastor Dashboard flow.

## Removed AI functionality

The following AI-specific behavior was removed:

- OpenAI/OpenRouter imports from the calendar implementation
- AI assistant state variables
- AI modal visibility state
- AI prompt handling
- AI response parsing
- OpenRouter request logic
- AI-generated booking suggestions
- AI-specific Firebase mutations
- AI assistant buttons and modal UI
- Bot-related icons and visual controls
- References to the deleted `AIBookingAssistant` component

The obsolete component was deleted:

```text
src/components/AIBookingAssistant.tsx
```

AI references were also removed from the active booking/calendar files that previously depended on the assistant.

## Why the AI assistant was removed

The AI assistant was not part of the essential scheduling workflow and made the calendar component significantly harder to maintain. It mixed experimental AI behavior with core scheduling, Firebase, and pastoral administration logic.

Removing it produced several benefits:

- Reduced complexity in the calendar workflow
- Removed an unnecessary external runtime dependency from the active path
- Reduced the number of failure points during booking and scheduling
- Made the dashboard easier to split into focused modules
- Prevented AI-specific logic from affecting normal meeting management
- Prepared the application for a cleaner backend/API architecture later

## Legacy AI configuration still present

Some unused AI-related configuration may still remain outside the active Pastor Dashboard implementation, including:

- Legacy translation strings
- Environment-variable placeholders
- The `openai` package dependency
- Other old configuration references

These were intentionally left for a later configuration and dependency cleanup. They are not part of the active Pastor Dashboard workflow.

---

# Pastor Dashboard Relocation

The original large calendar implementation was moved from:

```text
src/components/Calendar.tsx
```

to:

```text
src/components/pastor/PastorDashboard.tsx
```

The component was renamed from the generic `Calendar` name to:

```tsx
export default function PastorDashboard()
```

This change reflects the component's actual responsibility. It is not only a calendar; it coordinates meetings, booking requests, NextGen administration, People Development, availability, participant notifications, and pastoral workflows.

The protected `/calendar` route in `App.tsx` was updated to render:

```tsx
<PastorDashboard />
```

instead of the old:

```tsx
<Calendar />
```

The route itself was preserved so existing navigation continues to work.

---

# Current Pastor Module Structure

The Pastor Dashboard is now organized under:

```text
src/components/pastor/
```

The current structure is designed around clear responsibility boundaries.

```text
src/components/pastor/
├── PastorDashboard.tsx
├── calendar/
├── meeting-requests/
├── nextgen/
├── people-development/
├── hooks/
└── email/
```

The `email/` folder currently exists as a future extraction target. Some email workflows still live inside hooks or feature modules and can be moved there later.

---

# Hooks Introduced

The following hooks were created in:

```text
src/components/pastor/hooks/
```

```text
hooks/
├── index.ts
├── useAvailability.ts
├── useCalendarMonth.ts
├── useMeetingRequests.ts
├── useMeetings.ts
├── useNextGen.ts
├── useParticipants.ts
└── usePeopleDevelopment.ts
```

These hooks hold React state, subscriptions, derived values, and controller behavior. They do not replace the existing Firebase, action, selector, and UI modules. Instead, they coordinate those modules for the dashboard.

---

## `useParticipants.ts`

### Purpose

Loads and normalizes participant records from the Firebase Realtime Database path:

```text
form/
```

### Responsibilities

- Subscribes to assessment/form submissions
- Extracts participant names from differently shaped stored responses
- Extracts email addresses
- Extracts the user's linked identifier
- Handles nested response structures
- Normalizes lookup keys
- Generates safe internal member keys
- Deduplicates records that share the same identifier
- Preserves all Firebase source keys associated with a participant
- Extracts the participant's primary spiritual gift
- Extracts the participant's People Development group
- Sorts participants alphabetically
- Provides loading and error state

### Returned data

The hook returns:

```ts
{
  participants,
  loading,
  error,
}
```

### Why it exists

The original dashboard contained a large Firebase listener and recursive parsing logic directly inside the component. Moving that logic into a hook gives the dashboard a clean participant collection while keeping all parsing rules together.

---

## `usePeopleDevelopment.ts`

### Purpose

Acts as the React controller for the complete People Development feature.

### Responsibilities

- Subscribes to People Development member records
- Subscribes to assignments
- Subscribes to personal notes
- Controls whether the People Development section is expanded
- Tracks the participant search term
- Handles drag-and-drop member assignment
- Handles dropdown-based member assignment
- Tracks assignment drafts for every ministry group
- Tracks uploaded PDF files
- Validates assignment attachments
- Rejects unsupported file types
- Enforces the configured PDF size limit
- Converts selected PDF files to Base64
- Posts assignments to Firebase
- Sends assignment-notification emails through EmailJS
- Logs email successes and failures to Firebase
- Controls the assignment-calendar popup
- Controls the personal-note popup
- Saves strengths, weaknesses, and other personal notes
- Deletes complete People Development posts
- Removes individual attachments
- Deletes empty assignments after their final attachment is removed
- Produces group labels in English or Arabic
- Calculates the selected person's assigned group
- Provides all state and callbacks required by the People Development UI components

### Groups supported

The feature currently supports ten bilingual service/development groups:

- Pastors
- Prophets
- Evangelists
- Teachers
- Apostles
- Helpers
- Mercy
- Facilitators
- Services
- Giving

### Important note

This hook is intentionally large because it coordinates an entire feature. However, it is still better than placing the same logic in `PastorDashboard.tsx`.

The email-notification portion can later be moved to:

```text
src/components/pastor/email/
```

without changing the dashboard again.

---

## `useNextGen.ts`

### Purpose

Coordinates all NextGen administration state and actions used by the Pastor Dashboard.

### Responsibilities

- Subscribes to submitted NextGen questions
- Subscribes to NextGen registrations
- Subscribes to aggregate survey results
- Tracks loading and error state for survey results
- Controls the visibility of:
  - NextGen questions
  - NextGen registrations
  - NextGen survey results
- Tracks registration search text
- Tracks the selected registration-status filter
- Approves registration requests
- Rejects registration requests
- Updates whether a submitted question is selected
- Tracks the currently updating registration
- Tracks the currently updating question
- Calculates the number of pending registrations
- Produces bilingual error messages

### TypeScript build correction

The project uses:

```text
verbatimModuleSyntax
```

Therefore, NextGen interfaces and type aliases must use type-only imports:

```ts
import type {
  NextGenQuestion,
  NextGenRegistration,
  NextGenRegistrationStatusFilter,
  NextGenSurveyAggregateResults,
} from '../nextgen';
```

This correction resolved four Netlify TypeScript build errors.

---

## `useMeetingRequests.ts`

### Purpose

Coordinates pending public meeting-request state and decision handling.

### Responsibilities

- Subscribes to Firebase meeting requests
- Controls whether the request section is expanded
- Tracks decision-processing state
- Finds a request by ID
- Processes accept/reject decisions through the meeting-request action module
- Prevents duplicate decisions while an update is in progress
- Displays the existing translated failure message when processing fails

### Relationship to other modules

The hook does not directly implement all meeting-request business logic. It delegates the decision workflow to:

```text
src/components/pastor/meeting-requests/
```

This keeps the hook focused on React state and orchestration.

---

## `useMeetings.ts`

### Purpose

Controls meeting data, meeting-editor state, participant invitations, creation, updates, and deletion.

### Responsibilities

- Subscribes to meetings
- Tracks meeting-editor visibility
- Tracks the currently edited meeting
- Stores the meeting form state
- Tracks selected participants
- Controls the participant dropdown
- Tracks meeting-save loading state
- Tracks whether participant emails were sent successfully
- Opens a blank meeting form
- Opens a meeting form for a selected calendar date
- Opens an existing meeting for editing
- Resets and closes the editor
- Builds display titles for requester meetings
- Reads requester reasons
- Reads acknowledgement status
- Validates that the meeting end time is after the start time
- Creates new meetings
- Updates existing meetings
- Preserves booking-request fields during edits
- Resets acknowledgement when finalized details change
- Synchronizes updated date/time details back to the source booking request
- Sends participant invitations through EmailJS
- Logs invitation sends to Firebase
- Sends cancellation emails to booking requesters
- Deletes meetings

### Preserved request fields

When editing a meeting created from a public booking request, the hook preserves:

```text
requestName
requestEmail
requestReason
sourceRequestId
requesterLocale
requesterLanguage
```

### Meeting acknowledgement behavior

When the pastor changes finalized meeting details such as the date, time, location, or meeting link, the existing acknowledgement state is reset so the requester can acknowledge the new details.

---

## `useAvailability.ts`

### Purpose

Coordinates pastor availability, unavailability, selected-day details, and individual slot blocking.

### Responsibilities

- Subscribes to availability records
- Subscribes to unavailability records
- Tracks availability/unavailability modal state
- Tracks editing records
- Controls availability and unavailability forms
- Creates availability
- Updates availability
- Deletes availability
- Creates unavailability
- Updates unavailability
- Deletes unavailability
- Builds repeated availability dates
- Tracks the selected calendar day
- Calculates available slot blocks
- Detects meetings and pending requests that occupy a slot
- Calculates slot status
- Returns translated slot labels
- Blocks an individual slot
- Unblocks a slot
- Splits a larger unavailability block when only one subsection is reopened
- Produces selected-day meetings and availability blocks
- Calculates the number of dates affected by the current availability form

### TypeScript build correction

The `Unavailability` type does not include an `updatedAt` property in the argument accepted by:

```ts
createUnavailability(...)
```

Three unsupported `updatedAt` properties were removed from the slot-block creation and split-block operations. This resolved three Netlify TypeScript errors.

---

## `useCalendarMonth.ts`

### Purpose

Contains the monthly calendar navigation and derived month values.

### Responsibilities

- Stores the currently displayed month
- Calculates all days in the current month
- Calculates the number of leading blank cells before the first day
- Produces the localized month label
- Provides the English or Arabic `date-fns` locale
- Navigates to the previous month
- Navigates to the next month
- Returns to the current month

### Why it exists

Month navigation is a small but independent React responsibility. Keeping it out of the dashboard reduces repeated `date-fns` calculations and keeps the page component focused on layout.

---

## `hooks/index.ts`

### Purpose

Provides one clean barrel import for all Pastor Dashboard hooks.

Instead of importing every hook from a separate path, the dashboard can use:

```ts
import {
  useAvailability,
  useCalendarMonth,
  useMeetingRequests,
  useMeetings,
  useNextGen,
  useParticipants,
  usePeopleDevelopment,
} from './hooks';
```

The file also exports the hooks' public TypeScript interfaces and return types.

---

# Calendar Modules Introduced

The calendar feature was split into focused modules under:

```text
src/components/pastor/calendar/
```

The calendar folder contains the shared types, constants, Firebase functions, form helpers, slot calculations, email functions, and utility functions used by the dashboard and hooks.

```text
calendar/
├── calendar.constants.ts
├── calendar.email.ts
├── calendar.firebase.ts
├── calendar.forms.ts
├── calendar.slots.ts
├── calendar.types.ts
├── calendar.utils.ts
└── index.ts
```

---

## `calendar.types.ts`

Defines the calendar-specific data structures used by the dashboard.

Primary types include:

- `Availability`
- `Unavailability`
- `AvailabilityForm`
- `UnavailabilityForm`
- `PastorSlotStatus`

These types prevent the dashboard and hooks from relying on loosely structured objects.

---

## `calendar.constants.ts`

Contains reusable scheduling constants and time-option collections.

Examples include:

- Meeting time options
- Full-day time options
- Booking-window time options
- Slot block duration

Centralizing these values prevents inconsistent scheduling rules across components.

---

## `calendar.utils.ts`

Contains pure formatting and conversion helpers.

Examples include:

- Converting a time string to a numeric hour
- Converting a numeric hour back to a time string
- Formatting individual hours
- Formatting time ranges
- Building time-option collections
- Detecting overlapping time ranges

These helpers contain no React or Firebase state.

---

## `calendar.slots.ts`

Contains pure calendar-slot and availability calculations.

Responsibilities include:

- Producing normalized date strings
- Calculating availability blocks for a day
- Calculating unavailability blocks
- Checking whether a slot is inside availability
- Checking whether a slot is booked
- Finding blocking unavailability
- Calculating the pastor-facing slot status
- Returning translation keys for slot statuses
- Building fixed slot-block hours
- Finding meetings and pending requests for a selected date

This module is the central source of truth for calendar slot calculations.

---

## `calendar.forms.ts`

Contains reusable form initialization and form-related calculations.

Responsibilities include:

- Creating a fresh availability form
- Creating a fresh unavailability form
- Building all dates represented by an availability form
- Toggling weekday selections
- Handling single-date and repeated-range availability modes

---

## `calendar.firebase.ts`

Contains the Firebase Realtime Database operations used by the calendar.

Responsibilities include:

- Subscribing to meetings
- Subscribing to meeting requests
- Subscribing to availability
- Subscribing to unavailability
- Creating records
- Updating records
- Deleting records
- Removing local `id` fields before saving Firebase payloads

### Meeting ID build correction

The shared helper originally required every object to contain a mandatory string ID. However, the project-level `Meeting` type allows:

```ts
id?: string
```

The helper was corrected to accept an optional ID, and `saveMeeting` now explicitly validates that the meeting has an ID before building a Firebase path.

This prevents updates to:

```text
meetings/undefined
```

and satisfies the TypeScript compiler.

---

## `calendar.email.ts`

Contains calendar email builders and status-email functions.

It supports requester-facing meeting status communication, including cancellation and finalized meeting information.

Some participant invitation email logic still lives in `useMeetings.ts` and is a future extraction candidate.

---

## `calendar/index.ts`

Exports the calendar module's public API through one import path.

---

# Meeting Request Modules Introduced

Meeting-request functionality was moved into:

```text
src/components/pastor/meeting-requests/
```

```text
meeting-requests/
├── MeetingRequestsSection.tsx
├── meetingRequests.actions.ts
├── meetingRequests.types.ts
├── meetingRequests.utils.ts
└── index.ts
```

---

## `MeetingRequestsSection.tsx`

Renders the pending request panel.

It receives request data and callbacks from the dashboard/hook rather than directly owning Firebase subscriptions.

---

## `meetingRequests.actions.ts`

Contains the accept/reject business workflow.

Responsibilities include:

- Finding the selected request
- Updating request status
- Creating the corresponding meeting when accepted
- Sending the appropriate requester communication
- Preserving the source request relationship
- Recording decision metadata

---

## `meetingRequests.types.ts`

Contains meeting-request-specific action and decision types.

---

## `meetingRequests.utils.ts`

Contains pure request lookup and formatting helpers.

---

## `meeting-requests/index.ts`

Exports the public meeting-request API.

---

# NextGen Modules Introduced

NextGen administration was moved into:

```text
src/components/pastor/nextgen/
```

```text
nextgen/
├── NextGenQuestionsSection.tsx
├── NextGenRegistrationsSection.tsx
├── NextGenSurveyResultsSection.tsx
├── nextgen.actions.ts
├── nextgen.constants.ts
├── nextgen.firebase.ts
├── nextgen.types.ts
├── nextgen.utils.ts
└── index.ts
```

---

## `NextGenQuestionsSection.tsx`

Displays submitted NextGen questions and allows the pastor to select or deselect questions.

---

## `NextGenRegistrationsSection.tsx`

Displays NextGen registration requests.

Supported behavior includes:

- Search
- Status filtering
- Approve
- Reject
- Per-registration loading state

---

## `NextGenSurveyResultsSection.tsx`

Displays aggregate survey results without exposing which participant selected which answer.

It receives pre-aggregated results and renders percentages/counts for pastoral review.

---

## `nextgen.firebase.ts`

Contains Firebase subscriptions and record updates for:

- Questions
- Registrations
- Survey results

---

## `nextgen.actions.ts`

Contains NextGen workflows such as:

- Registration approval
- Registration rejection
- Question selection updates

---

## `nextgen.utils.ts`

Contains pure filtering, normalization, and aggregate-result helpers.

---

## `nextgen.constants.ts`

Contains shared NextGen configuration values.

---

## `nextgen.types.ts`

Defines NextGen registration, question, survey, filter, and aggregate-result types.

---

# People Development Modules Introduced

People Development was moved into:

```text
src/components/pastor/people-development/
```

```text
people-development/
├── README.md
├── PeopleAssignmentsCalendarModal.tsx
├── PeopleDevelopmentGroupPanel.tsx
├── PeopleDevelopmentSection.tsx
├── PeoplePersonalNoteModal.tsx
├── index.ts
├── peopleDevelopment.actions.ts
├── peopleDevelopment.constants.ts
├── peopleDevelopment.firebase.ts
├── peopleDevelopment.selectors.ts
├── peopleDevelopment.types.ts
├── peopleDevelopment.utils.ts
└── peopleDevelopmentEmail.ts
```

---

## `PeopleDevelopmentSection.tsx`

Renders the complete People Development feature area.

It receives state and callbacks from `usePeopleDevelopment.ts`.

---

## `PeopleDevelopmentGroupPanel.tsx`

Renders one service/development group.

Responsibilities include:

- Showing assigned members
- Accepting dropped participants
- Providing assignment controls
- Displaying recent posts
- Opening the assignment calendar
- Opening personal-note tools
- Supporting group selection controls

---

## `PeoplePersonalNoteModal.tsx`

Provides the private pastor-facing note form for a selected participant.

The modal supports note categories such as strengths and weaknesses.

---

## `PeopleAssignmentsCalendarModal.tsx`

Displays group assignments organized by month and date.

It supports:

- Month navigation
- Date selection
- Viewing posts for a selected date
- Deleting posts
- Removing individual attachments

---

## `peopleDevelopment.types.ts`

Defines People Development data structures, including:

- Group IDs
- Members
- Participants
- Assignments
- Attachments
- Personal notes
- Personal-note types

---

## `peopleDevelopment.constants.ts`

Contains:

- The Firebase People Development root path
- Maximum PDF attachment size
- The ten bilingual group definitions

---

## `peopleDevelopment.utils.ts`

Contains pure helper functions for:

- Normalizing group IDs
- Normalizing personal-note types
- Extracting stored group assignments
- Returning bilingual group labels
- Formatting file sizes
- Reading files as Base64
- Validating email addresses
- Truncating email content

---

## `peopleDevelopment.firebase.ts`

Contains People Development Firebase subscriptions and mutations.

Responsibilities include:

- Subscribing to member records
- Subscribing to assignments
- Subscribing to personal notes
- Creating assignments
- Deleting assignments
- Creating personal notes
- Deleting personal notes
- Performing multi-path Firebase updates

---

## `peopleDevelopment.actions.ts`

Contains higher-level workflows:

- Assigning a participant to a group
- Saving a personal note
- Posting a group assignment
- Removing an assignment
- Removing a personal note

---

## `peopleDevelopment.selectors.ts`

Contains pure derived-data functions:

- Finding a participant's group
- Filtering participants by group
- Building group assignment collections
- Grouping assignments by date/month
- Filtering personal notes
- Searching participants
- Deduplicating valid email recipients

---

## `peopleDevelopmentEmail.ts`

Builds the bilingual HTML email sent when a new group assignment is posted.

It creates the email body but does not directly manage React state.

---

## `people-development/index.ts`

Exports the feature's UI components, actions, constants, selectors, types, utilities, Firebase functions, and email builder.

A duplicate exported type name was resolved by aliasing the Firebase-specific member-map type.

---

# Dashboard Integration

After all hooks were introduced, `PastorDashboard.tsx` was rewritten to initialize and consume them.

The dashboard now coordinates:

```text
useParticipants
      ↓
useMeetings
      ↓
useMeetingRequests
      ↓
useAvailability
      ↓
useNextGen
      ↓
usePeopleDevelopment
      ↓
useCalendarMonth
```

The hooks are not strictly executed in the visual order above, but their data relationships follow this model:

- Participants are shared with meetings and People Development
- Meetings and meeting requests are shared with slot calculations
- Locale and translation functions are shared across all hooks
- Feature components receive their state and callbacks from the hooks
- Firebase and business logic remain in feature-specific modules

The resulting dashboard primarily contains:

- Page composition
- Feature-section rendering
- Calendar rendering
- Modal rendering
- Prop connections
- Styling

---

# Current Feature Set

## Spiritual Gifts Assessment

- Bilingual English/Arabic assessment
- RTL layout support
- Questions covering faith journey, spiritual gifts, ministry alignment, and personal vision
- Automatic score calculation
- Primary and secondary gift identification
- Ministry recommendations
- Persistent Firebase submissions
- Results available to authorized administrative users

---

## Admin Dashboard

- Review trainee submissions
- View gift-score breakdowns
- Search and filter participants
- Access assessment details
- Review ministry alignment data
- Display score visualizations

---

## Pastor Dashboard

The Pastor Dashboard now combines several focused administration features:

- Monthly scheduling calendar
- Meeting creation and editing
- Participant invitations
- Public booking-request decisions
- Availability management
- Unavailability management
- Individual slot blocking
- NextGen registration review
- NextGen question review
- NextGen aggregate survey results
- People Development groups
- Group assignments and PDF attachments
- Personal pastor notes
- Bilingual UI behavior

---

## Calendar and Meeting Management

- Interactive monthly calendar
- Previous/next month navigation
- Localized month and day labels
- Create meetings
- Edit meetings
- Delete meetings
- Select participants
- Send EmailJS invitations
- Preserve public booking metadata
- Notify requesters about cancellations
- Track acknowledgement when meeting details change
- Display upcoming meetings
- View meetings for a selected day

Some older Google Calendar/Meet integration code remains in the project service layer, but the active invitation flow used by the refactored Pastor Dashboard currently sends through EmailJS.

---

## Public Meeting Booking

- Public booking page
- Interactive date and time selection
- Color-coded slot states
- Request form containing:
  - Name
  - Email
  - Meeting reason
- Pending request storage in Firebase
- Pastor-facing request queue
- Accept/reject processing
- Request status tracking

### Slot meaning

- Light red: infeasible or unavailable
- Light green: available
- Gray/occupied state: existing meeting or pending request
- Pastor-blocked state: explicitly unavailable

---

## Meeting Request Management

- Pending count
- Expandable request section
- Accept/reject decisions
- Accepted request conversion into a calendar meeting
- Request-to-meeting source relationship
- Status metadata
- Requester communication where configured

---

## People Development

- Ten service/development groups
- Participant assignment by drag-and-drop
- Participant assignment by dropdown
- Bilingual group labels
- Assignment posts
- PDF attachments
- Assignment calendar
- Email notifications to valid group members
- Firebase email-send logs
- Strength/weakness personal notes
- Post deletion
- Individual attachment deletion
- Automatic deletion of empty posts

---

## NextGen Administration

- Pending registration count
- Search registrations
- Filter registration status
- Approve registrations
- Reject registrations
- Review submitted questions
- Select/deselect questions
- View aggregate survey results
- Protect individual voting choices from the aggregate pastor view

---

## Pastor Guide

- Bilingual guide page
- Authentication guidance
- Assessment review instructions
- Calendar instructions
- Booking-request instructions

The guide should be reviewed periodically because the application structure and active email workflows have changed.

---

## Attendance

The project also contains an attendance page with:

- Protected attendance interface
- Participant management
- Sunday-based attendance recording
- Individual attendance analysis
- Calendar and chart views

This feature is outside the current Pastor Dashboard refactor.

---

## Congregation Group Notes

The project includes a congregation-facing group-notes page that supports:

- Identifier-based access
- Bilingual group information
- Assignment/note viewing
- Uploaded file viewing

This feature is outside the current Pastor Dashboard refactor.

---

# Authentication and Authorization

The application uses Firebase Authentication with:

- Google Sign-In
- Email/password authentication

The current application recognizes staff roles such as:

```text
superadmin
pastor
```

The long-term role design is intended to evolve toward:

```text
Pastor
General Admin
Testing Admin
```

### Intended role responsibilities

#### Pastor

- Pastoral decisions
- Meeting-request decisions
- People Development decisions
- Confidential personal notes
- Pastoral calendar management

#### General Admin

- Content administration
- Configuration
- Bilingual public content
- Read-only Pastor views where appropriate
- No authority over explicitly pastoral decisions

#### Testing Admin

- Staging and testing controls
- Test data
- Feature verification
- Non-production administration

The legacy `superadmin` role remains in the current application and is planned for later cleanup.

---

# Current Architecture

## Active architecture

```text
React UI
   ↓
Hooks and feature actions
   ↓
Firebase client SDK / EmailJS / selected Google services
   ↓
Firebase Realtime Database and external APIs
```

This is still primarily a two-tier/client-driven architecture.

## Target architecture

```text
React frontend
   ↓
Backend/API
   ↓
Firebase or another database
```

A future backend layer should eventually own:

- Authorization enforcement
- Meeting-request decisions
- Email delivery
- Audit logging
- File validation
- Public booking conflict prevention
- Secure Google Calendar/Meet creation
- People Development notifications
- Administrative configuration
- Sensitive-data access

The current module split makes that migration easier because Firebase calls, actions, selectors, hooks, and UI are no longer concentrated in one file.

---

# Email and External Services

## EmailJS

The active Pastor Dashboard uses EmailJS for:

- Participant meeting invitations
- People Development assignment notifications
- Some requester status communications

Email successes and failures may be written to:

```text
emailJsSendLogs/
```

in Firebase for operational auditing.

## Google APIs

The project still contains Google API integration code for:

- Gmail
- Google Calendar
- Google Meet creation

The legacy integration is located primarily in:

```text
src/services/gmail.ts
```

That service contains both older Google behavior and active/legacy utilities. It should be separated later into focused email and calendar services.

## Important implementation reality

The README previously described all meeting invitations as Gmail API operations and all meetings as automatically creating real Google Meet links. That description is no longer universally accurate.

The current refactored Pastor Dashboard primarily uses EmailJS for participant invitations. Google Calendar/Meet behavior may still be used by other or legacy paths, but it is not the sole active email path.

---

# Firebase Data Areas

The application currently uses several Firebase Realtime Database roots, including:

```text
form/
meetings/
meetingRequests/
availability/
unavailability/
admins/
nextGenUsers/
nextGenQuestions/
nextGenSurveyResults/
peopleDevelopment/
emailJsSendLogs/
```

Additional roots may exist for attendance, congregation notes, and other features.

The exact security rules should be reviewed against the current database structure before production use.

---

# Security Notes

The application currently performs significant logic in the browser. This means Firebase rules and backend validation are essential.

Important areas requiring continued review include:

- Public meeting-request writes
- Public availability reads
- Booking race conditions
- Duplicate booking prevention
- Predictable or identifier-based access controls
- Confidential People Development notes
- Attendance information
- Base64 files stored in Realtime Database
- Client-side email credentials/configuration
- Hard-coded role provisioning
- Legacy OAuth implicit-flow behavior
- Browser-side administrative migrations

The sample Firebase rules in this README are development examples only. They must not be treated as a complete production security policy.

---

# Tech Stack

- React 19
- TypeScript
- Vite 8
- Tailwind CSS
- Firebase Authentication
- Firebase Realtime Database
- Firebase Firestore initialization
- EmailJS
- Google Calendar API integration
- Gmail API integration
- Motion for React
- Lucide React
- date-fns
- React Router

---

# Updated Project Structure

```text
kiroform/
├── src/
│   ├── components/
│   │   ├── AssessmentForm.tsx
│   │   ├── BookMeeting.tsx
│   │   ├── Layout.tsx
│   │   ├── PageTitle.tsx
│   │   └── pastor/
│   │       ├── PastorDashboard.tsx
│   │       ├── calendar/
│   │       │   ├── calendar.constants.ts
│   │       │   ├── calendar.email.ts
│   │       │   ├── calendar.firebase.ts
│   │       │   ├── calendar.forms.ts
│   │       │   ├── calendar.slots.ts
│   │       │   ├── calendar.types.ts
│   │       │   ├── calendar.utils.ts
│   │       │   └── index.ts
│   │       ├── hooks/
│   │       │   ├── index.ts
│   │       │   ├── useAvailability.ts
│   │       │   ├── useCalendarMonth.ts
│   │       │   ├── useMeetingRequests.ts
│   │       │   ├── useMeetings.ts
│   │       │   ├── useNextGen.ts
│   │       │   ├── useParticipants.ts
│   │       │   └── usePeopleDevelopment.ts
│   │       ├── meeting-requests/
│   │       │   ├── MeetingRequestsSection.tsx
│   │       │   ├── meetingRequests.actions.ts
│   │       │   ├── meetingRequests.types.ts
│   │       │   ├── meetingRequests.utils.ts
│   │       │   └── index.ts
│   │       ├── nextgen/
│   │       │   ├── NextGenQuestionsSection.tsx
│   │       │   ├── NextGenRegistrationsSection.tsx
│   │       │   ├── NextGenSurveyResultsSection.tsx
│   │       │   ├── nextgen.actions.ts
│   │       │   ├── nextgen.constants.ts
│   │       │   ├── nextgen.firebase.ts
│   │       │   ├── nextgen.types.ts
│   │       │   ├── nextgen.utils.ts
│   │       │   └── index.ts
│   │       ├── people-development/
│   │       │   ├── README.md
│   │       │   ├── PeopleAssignmentsCalendarModal.tsx
│   │       │   ├── PeopleDevelopmentGroupPanel.tsx
│   │       │   ├── PeopleDevelopmentSection.tsx
│   │       │   ├── PeoplePersonalNoteModal.tsx
│   │       │   ├── index.ts
│   │       │   ├── peopleDevelopment.actions.ts
│   │       │   ├── peopleDevelopment.constants.ts
│   │       │   ├── peopleDevelopment.firebase.ts
│   │       │   ├── peopleDevelopment.selectors.ts
│   │       │   ├── peopleDevelopment.types.ts
│   │       │   ├── peopleDevelopment.utils.ts
│   │       │   └── peopleDevelopmentEmail.ts
│   │       └── email/
│   │           └── # Reserved for future email-service extraction
│   ├── i18n/
│   │   ├── index.tsx
│   │   └── translations.ts
│   ├── pages/
│   │   ├── AdminDashboard.tsx
│   │   ├── AttendancePage.tsx
│   │   ├── BookingCalendar.tsx
│   │   ├── CongregationGroupNotes.tsx
│   │   ├── GuidePage.tsx
│   │   ├── LandingPage.tsx
│   │   ├── NextGenActivities.tsx
│   │   ├── PeopleNotesPage.tsx
│   │   ├── PrivacyPolicy.tsx
│   │   └── TermsOfService.tsx
│   ├── services/
│   │   └── gmail.ts
│   ├── types.ts
│   ├── App.tsx
│   ├── firebase.ts
│   └── main.tsx
├── .env
├── .env.example
├── netlify.toml
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

# Build Corrections Completed

The production build runs:

```bash
tsc -b && vite build
```

This is stricter than syntax-only transpilation and checks project-wide TypeScript rules.

The following build issues were corrected during the refactor.

## Optional meeting ID

Problem:

```text
Meeting.id was optional, but a Firebase helper required a mandatory string ID.
```

Correction:

- The generic payload helper now accepts an optional ID
- `saveMeeting` validates the ID before writing
- Invalid `meetings/undefined` paths are prevented

## Meeting editor update ID

Problem:

```text
editingMeeting.id had type string | undefined
```

Correction:

```ts
const editingMeetingId = editingMeeting.id;

if (!editingMeetingId) {
  throw new Error('Cannot update a meeting without an ID.');
}
```

## Unused helper

An unused number-normalization helper was removed from the dashboard to satisfy `noUnusedLocals`.

## NextGen type-only imports

Four NextGen types were changed to `import type` because `verbatimModuleSyntax` is enabled.

## Unsupported unavailability timestamps

Three unsupported `updatedAt` properties were removed from `createUnavailability` calls because the current `Unavailability` type does not contain that field.

---

# Getting Started

## Prerequisites

- Node.js 20 or newer
- npm
- Firebase project
- Firebase Authentication
- Firebase Realtime Database
- EmailJS account/configuration for active email workflows
- Google Cloud project when using the legacy Google Calendar/Gmail integrations

---

## Installation

```bash
git clone <repository-url>
cd kiroform
npm install
```

---

## Environment configuration

Create the local environment file:

```bash
cp .env.example .env
```

Common variables include:

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase application ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_GOOGLE_REDIRECT_URI` | Google OAuth redirect URI |
| `VITE_GEMINI_API_KEY` | Legacy/optional AI configuration |
| `VITE_OPENROUTER_API_KEY` | Legacy/optional AI configuration |

The AI variables are not required by the active Pastor Dashboard after the AI assistant removal.

EmailJS configuration currently exists in application code and should eventually be moved to environment-backed configuration or a backend service.

---

# Firebase Rules

The following is only a simplified development example:

```json
{
  "rules": {
    "form": {
      ".read": "auth != null",
      ".write": true
    },
    "meetings": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "meetingRequests": {
      ".read": true,
      ".write": true
    },
    "availability": {
      ".read": true,
      ".write": "auth != null"
    },
    "unavailability": {
      ".read": true,
      ".write": "auth != null"
    },
    "admins": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "peopleDevelopment": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

Production rules must be designed around actual roles, data sensitivity, and public booking requirements.

---

# Local Development

Start the Vite development server:

```bash
npm run dev
```

The configured port may vary depending on `vite.config.ts`.

---

# Production Build

```bash
npm run build
```

The build performs:

```text
TypeScript project validation
        ↓
Vite production compilation
        ↓
dist/ output
```

Netlify uses the same `npm run build` command from `netlify.toml`.

---

# Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Run TypeScript validation and build production assets |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint when configured |

---

# Admin Access

Administrative access is currently resolved through Firebase authentication and the `admins/` database area, with legacy default provisioning logic in `App.tsx`.

Known legacy default accounts include:

```text
georgejoseph5000@gmail.com
georgtawadrous@gmail.com
```

Role and account management should eventually move out of hard-coded client logic and into a secure administrative backend.

---

# Remaining Refactor Work

The current refactor significantly improved the Pastor Dashboard, but additional cleanup remains.

## Recommended next extractions

### Calendar UI components

Move the remaining large JSX sections into focused components such as:

```text
PastorMonthCalendar.tsx
CalendarDayModal.tsx
MeetingEditorModal.tsx
AvailabilityModal.tsx
UnavailabilityModal.tsx
UpcomingMeetingsSection.tsx
PastorDashboardToolbar.tsx
```

This can reduce `PastorDashboard.tsx` from approximately 1,603 lines toward a target of roughly 500–700 lines.

### Email services

Move email creation and sending into:

```text
src/components/pastor/email/
```

Suggested modules:

```text
meetingInvitationEmail.ts
peopleDevelopmentNotificationEmail.ts
emailJsLogger.ts
```

### Styling

Move the large inline dashboard `<style>` block into a stylesheet or focused styling module.

### Legacy service cleanup

Review:

```text
src/services/gmail.ts
```

and separate:

- Gmail behavior
- Google Calendar behavior
- Google Meet behavior
- EmailJS behavior
- Legacy placeholder behavior

### Dependency cleanup

After active imports are verified, remove:

- Unused OpenAI dependencies
- Unused AI environment variables
- Unused AI translation strings
- Obsolete calendar files
- Unused duplicate booking components
- Dead Google/OAuth utilities

### Backend migration

Move privileged workflows from the browser into a backend/API, especially:

- Role enforcement
- Meeting acceptance/rejection
- Email sending
- File upload validation
- Booking conflict transactions
- Audit logging
- Confidential People Development operations

---

# Refactor Principles

The project now follows these boundaries:

| Responsibility | Location |
|---|---|
| Page composition | `PastorDashboard.tsx` |
| Stateful React orchestration | `hooks/` |
| Visual rendering | Feature components |
| Firebase subscriptions and writes | `*.firebase.ts` |
| Business workflows | `*.actions.ts` |
| Pure calculations and filtering | `*.selectors.ts`, `*.utils.ts`, `*.slots.ts` |
| Shared types | `*.types.ts` |
| Shared constants | `*.constants.ts` |
| Email HTML builders | Email modules |
| Routing and role guards | `App.tsx` |

This structure prevents the creation of another single 3,000-line component and makes each area easier to test, replace, and eventually move behind an API.

---

# License

Private — LINC Ministries

---

# Created by

T-TLabs
