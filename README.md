# LINC Pastor Dashboard

A bilingual English/Arabic church administration platform for LINC Ministries' Leadership Development Program (2026–2028).

The application uses a React/TypeScript/Vite frontend, Firebase Authentication and Realtime Database, and an incremental Cloudflare Workers backend. Sensitive participant meeting-invitation delivery has been moved out of the browser and now runs through a Hono API and Brevo. Other legacy EmailJS and Google integration paths remain in use where explicitly documented.

## Project hierarchy

```text
LInC-Church-Management/
├── .github/
│   └── workflows/
│       └── backend-tests.yml
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   └── firebaseAuth.ts
│   │   ├── emails/
│   │   │   └── meetingInvitation.email.ts
│   │   ├── middleware/
│   │   │   ├── authentication.middleware.ts
│   │   │   └── authorization.middleware.ts
│   │   ├── routes/
│   │   │   └── meetingInvitations.routes.ts
│   │   ├── schemas/
│   │   │   └── meetingInvitation.schema.ts
│   │   ├── services/
│   │   │   └── brevo.service.ts
│   │   └── index.ts
│   ├── test/
│   │   └── index.spec.ts
│   ├── .dev.vars
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── wrangler.jsonc
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
│   │           └── # Reserved for later email extraction
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
│   │   ├── gmail.ts
│   │   └── meetingInvitations.ts
│   ├── App.tsx
│   ├── firebase.ts
│   ├── main.tsx
│   └── types.ts
├── .env
├── .env.example
├── netlify.toml
├── package.json
├── tsconfig.json
└── vite.config.ts
```

> `backend/src/middleware/authorization.middleware.ts` exists from the initial backend work, but the active meeting-invitation route does not perform a Firebase Realtime Database role lookup. It authenticates the already signed-in Firebase user only.

## Table of contents

- [Major Refactor Completed](#major-refactor-completed)
- [AI Assistant Removal](#ai-assistant-removal)
- [Pastor Dashboard Relocation](#pastor-dashboard-relocation)
- [Current Pastor Module Structure](#current-pastor-module-structure)
- [Hooks Introduced](#hooks-introduced)
- [Calendar Modules Introduced](#calendar-modules-introduced)
- [Meeting Request Modules Introduced](#meeting-request-modules-introduced)
- [NextGen Modules Introduced](#nextgen-modules-introduced)
- [People Development Modules Introduced](#people-development-modules-introduced)
- [Dashboard Integration](#dashboard-integration)
- [Current Feature Set](#current-feature-set)
- [Authentication and Authorization](#authentication-and-authorization)
- [Current Architecture](#current-architecture)
- [Backend/API Layer](#backendapi-layer)
- [Email and External Services](#email-and-external-services)
- [Firebase Data Areas](#firebase-data-areas)
- [Security Notes](#security-notes)
- [Tech Stack](#tech-stack)
- [Build Corrections Completed](#build-corrections-completed)
- [Getting Started](#getting-started)
- [Firebase Rules](#firebase-rules)
- [Local Development](#local-development)
- [Production Build and Deployment](#production-build-and-deployment)
- [Scripts](#scripts)
- [Admin Access](#admin-access)
- [Remaining Refactor Work](#remaining-refactor-work)
- [Refactor Principles](#refactor-principles)
- [License](#license)
- [Created by](#created-by)

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

Controls meeting data, meeting-editor state, participant selection, authenticated backend invitations, creation, updates, and deletion.

### Responsibilities

- Subscribes to meetings
- Tracks meeting-editor visibility
- Tracks the currently edited meeting
- Stores the meeting form state
- Tracks selected participants
- Controls the participant dropdown
- Tracks meeting-save loading state
- Tracks whether participant invitations were sent successfully
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
- Builds a recipient list from selected participants
- Filters out participants without usable email addresses
- Calls `sendMeetingInvitationsViaBackend(...)` once with the complete meeting and recipient batch
- Uses the current interface locale to request English or Arabic invitation content
- Keeps requester cancellation communication on the existing EmailJS path for now
- Deletes meetings

### Participant invitation path

The participant invitation path no longer builds or sends the email through EmailJS in the browser.

```text
Pastor saves Add Event
        ↓
useMeetings.ts validates and saves the meeting
        ↓
Selected participants are converted into recipient objects
        ↓
src/services/meetingInvitations.ts
        ↓
Authenticated POST to the Cloudflare Worker
        ↓
Brevo sends the invitation
```

The hook sends:

```ts
{
  locale,
  recipients,
  meeting: {
    title,
    date,
    startTime,
    endTime,
    location,
    meetLink,
  },
}
```

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

### EmailJS still present in this hook

`sendMeetingStatusEmailViaEmailJs(...)` remains imported for requester cancellation messages when deleting a meeting created from a public request. That import does not mean Add Event participant invitations still use EmailJS.

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
- Send participant invitations through the authenticated Cloudflare Worker and Brevo
- Preserve public booking metadata
- Notify requesters about cancellations through the existing EmailJS status-email path
- Track acknowledgement when meeting details change
- Display upcoming meetings
- View meetings for a selected day

The active participant-invitation flow is:

```text
Add Event form
   ↓
useMeetings.ts
   ↓
src/services/meetingInvitations.ts
   ↓
POST /api/v1/meeting-invitations
   ↓
Firebase ID-token verification
   ↓
Backend-generated bilingual email
   ↓
Brevo transactional email API
```

Some older Google Calendar/Meet integration code remains in the project service layer. It is not the active participant-invitation transport used by the refactored Pastor Dashboard.

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

The React application already persists the signed-in Firebase session. The new backend invitation flow reuses that session; it does not display another login form.

## Frontend route access

The current frontend reads the `admins/` Realtime Database area and resolves access in `App.tsx`. Existing values include legacy roles such as:

```text
superadmin
pastor
```

The current Pastor Dashboard route continues to use the existing client-side access model.

## Backend invitation authentication

For participant meeting invitations, the frontend calls:

```ts
const firebaseIdToken = await auth.currentUser.getIdToken();
```

and sends:

```http
Authorization: Bearer <firebase-id-token>
```

The Worker verifies the Firebase ID token with Google's public Firebase signing keys before allowing the Brevo request.

The backend checks:

- RS256 signature
- Firebase project audience
- Firebase issuer
- token expiration and not-before claims through `jose`
- issued-at time
- authentication time
- non-empty Firebase subject/UID

The backend then exposes the verified user in Hono request context.

## Current authorization boundary

The active meeting-invitation endpoint verifies that the caller is a valid signed-in Firebase user. It does **not** currently perform an additional backend lookup of the `pastor` role.

This was intentional for the current incremental migration:

```text
Existing frontend pastor access remains unchanged
        +
Backend rejects anonymous requests
```

`backend/src/middleware/authorization.middleware.ts` exists from an earlier authorization experiment, but it is not mounted on the active invitation route.

## Role direction

The long-term role model may still evolve toward:

```text
Pastor
General Admin
Testing Admin
```

The legacy `superadmin` naming remains in the current frontend and can be cleaned up separately without changing the meeting-invitation transport.

# Current Architecture

## Active hybrid architecture

```text
React frontend on Netlify
   ├── Firebase client SDK for authentication and application data
   ├── Existing EmailJS paths for selected legacy notifications
   └── Authenticated API client for participant meeting invitations
             ↓
Cloudflare Worker backend
   ├── Hono routing and CORS
   ├── Firebase ID-token verification
   ├── Zod request validation
   ├── Bilingual email construction
   └── Brevo API delivery
             ↓
Firebase / Brevo / selected Google services
```

The application is no longer purely client-driven. It is now a hybrid system with the first production backend workflow implemented.

## Incremental three-tier direction

```text
React frontend
   ↓
Cloudflare Worker API
   ↓
Firebase and external providers
```

The backend migration is intentionally incremental. Only participant meeting invitations have moved to Brevo through the Worker so far.

Future candidates include:

- requester confirmation and cancellation emails
- People Development assignment notifications
- meeting-request decisions
- audit logging
- booking-conflict transactions
- confidential People Development operations
- file validation
- secure Google Calendar/Meet creation

# Backend/API Layer

The first production backend workflow is implemented in:

```text
backend/
```

The backend foundation is tracked under GitHub issue `#12`.

Current production endpoints:

```text
Frontend: https://lincministry.com
Worker:   https://linc-backend.linc-ministry.workers.dev
```

The Worker is currently hosted on the Cloudflare Workers free plan and is deployed separately from the Netlify frontend.

## Backend stack

- Cloudflare Workers
- Hono
- TypeScript
- Zod
- `jose`
- Brevo transactional email API
- Vitest
- `@cloudflare/vitest-pool-workers`
- Wrangler

## Backend file responsibilities

### `backend/src/index.ts`

The Worker entry point:

- creates the Hono application
- declares Worker bindings
- configures CORS for API routes
- preserves the root health response
- preserves the Brevo test route
- mounts the meeting-invitation route

Current public root response:

```text
GET /
→ Hello Hono!
```

Current API route mount:

```text
/api/v1/meeting-invitations
```

### `backend/src/auth/firebaseAuth.ts`

Verifies Firebase ID tokens using `jose`.

It uses Google's Firebase public JSON Web Key Set:

```text
https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
```

Verification is tied to the configured Firebase project:

```text
churchmeeting
```

The function returns a normalized authenticated-user object:

```ts
{
  uid,
  email,
  emailVerified,
  name,
  picture,
  signInProvider,
}
```

Token revocation checking is not currently implemented. The verifier validates the signed token presented for the request but does not call Firebase Admin to check whether the session was explicitly revoked after issuance.

### `backend/src/middleware/authentication.middleware.ts`

Reads:

```http
Authorization: Bearer <token>
```

The middleware:

1. rejects a missing or malformed bearer token with `401`
2. verifies the token through `verifyFirebaseIdToken(...)`
3. stores the authenticated user in Hono context
4. stores the verified raw token in context for possible later use
5. allows the request to continue

The frontend user does not sign in again. Firebase refreshes its browser session normally, and the frontend obtains the current ID token when making the API request.

### `backend/src/middleware/authorization.middleware.ts`

This file was created during the first backend authorization experiment. It can read `admins/<normalized-email>` from Firebase Realtime Database and accept only the exact value `pastor`.

It is **not active** on the meeting-invitation route.

The current endpoint requires a verified Firebase account but preserves the existing frontend pastor-access model.

### `backend/src/schemas/meetingInvitation.schema.ts`

Defines the complete request contract with Zod.

The route accepts:

```ts
{
  locale: 'en' | 'ar',
  recipients: [
    {
      email: string,
      name: string,
    },
  ],
  meeting: {
    title: string,
    date: 'YYYY-MM-DD',
    startTime: 'HH:mm',
    endTime: 'HH:mm',
    location: string,
    meetLink: string,
  },
}
```

Validation includes:

- strict objects with no unknown properties
- English or Arabic locale only
- at least one recipient
- maximum of 50 recipients
- valid recipient email addresses
- recipient names between 1 and 120 characters
- meeting title between 1 and 200 characters
- real calendar date validation
- 24-hour `HH:mm` time validation
- end time strictly after start time
- location length limit
- empty meeting link or valid URL
- meeting-link length limit

Invalid requests return a structured `400 VALIDATION_ERROR`.

### `backend/src/emails/meetingInvitation.email.ts`

Builds the bilingual participant invitation.

The builder is a pure function. It does not call Firebase, Brevo, React, or any network service.

Responsibilities include:

- English subject and body
- Arabic subject and RTL body
- localized date formatting
- localized time formatting
- location fallback
- optional online meeting link
- HTML escaping for user-controlled values
- plain-text email fallback

English subject format:

```text
Meeting Invitation: <meeting title>
```

Arabic subject format:

```text
دعوة لاجتماع: <meeting title>
```

### `backend/src/services/brevo.service.ts`

Contains the reusable Brevo delivery client.

It sends to:

```text
https://api.brevo.com/v3/smtp/email
```

The Brevo API key is added only by the Worker:

```http
api-key: <BREVO_API_KEY>
```

The browser never receives this key.

The service accepts already-built email content and is responsible for:

- sender details
- recipient details
- subject
- HTML content
- text content
- provider response parsing
- provider message ID extraction
- provider failure conversion into `BrevoRequestError`

### `backend/src/routes/meetingInvitations.routes.ts`

Implements:

```http
POST /api/v1/meeting-invitations
```

The route sequence is:

```text
Firebase authentication middleware
        ↓
JSON parsing
        ↓
Zod validation
        ↓
Recipient loop
        ↓
Bilingual email builder
        ↓
Brevo service
        ↓
Structured complete/partial/failure response
```

The route does not accept arbitrary email HTML or an arbitrary subject from the browser. The backend constructs the invitation from validated meeting data, which prevents the endpoint from becoming a general-purpose email relay.

### `src/services/meetingInvitations.ts`

This is the frontend API client.

It:

1. reads `auth.currentUser`
2. obtains the current Firebase ID token
3. sends the meeting invitation request to the Worker
4. attaches the bearer token
5. parses the structured backend response
6. returns `true` or `false` to `useMeetings.ts`

Default backend URL:

```text
https://linc-backend.linc-ministry.workers.dev
```

Optional frontend override:

```text
VITE_BACKEND_BASE_URL
```

Trailing slashes are removed before building the endpoint URL.

## CORS configuration

The Worker currently permits these origins:

```text
https://lincministry.com
http://localhost:5173
```

Allowed request headers:

```text
Content-Type
Authorization
```

Allowed methods:

```text
GET
POST
OPTIONS
```

Preflight cache duration:

```text
86400 seconds
```

A request from an unrelated browser origin does not receive the allowed-origin CORS response.

## API responses

### Success

```http
201 Created
```

```json
{
  "success": true,
  "data": {
    "requestedCount": 2,
    "sentCount": 2,
    "failedCount": 0,
    "sent": [],
    "failed": []
  }
}
```

Each successful recipient entry may include Brevo's message ID.

### Partial delivery

```http
207 Multi-Status
```

Used when at least one recipient succeeds and at least one fails.

### Complete delivery failure

```http
502 Bad Gateway
```

Used when no invitation can be sent.

### Authentication failure

```http
401 Unauthorized
```

Used when the Firebase bearer token is missing, invalid, or expired.

### Invalid request

```http
400 Bad Request
```

Used for malformed JSON or Zod validation failures.

## Brevo test endpoint

The Worker still contains:

```http
POST /api/v1/email/test
```

Body:

```json
{
  "sandbox": true
}
```

Behavior:

- recipient is fixed server-side through `BREVO_TEST_RECIPIENT`
- `sandbox: true` asks Brevo to drop the message instead of delivering it
- `sandbox: false` performs a real send to the fixed test recipient
- the endpoint returns the provider message ID where available

This endpoint was useful for confirming Worker-to-Brevo connectivity. It should eventually be removed or restricted after backend validation is complete.

## Worker bindings and secrets

### Non-secret Wrangler variables

Configured in `backend/wrangler.jsonc`:

```text
FIREBASE_PROJECT_ID
FIREBASE_DATABASE_URL
```

Current values:

```text
FIREBASE_PROJECT_ID=churchmeeting
FIREBASE_DATABASE_URL=https://churchmeeting-default-rtdb.firebaseio.com
```

`FIREBASE_DATABASE_URL` is not required by the active invitation route because the role-lookup middleware is not mounted.

### Local backend secrets

Stored in:

```text
backend/.dev.vars
```

Expected local bindings:

```text
BREVO_API_KEY
BREVO_SENDER_EMAIL
BREVO_SENDER_NAME
BREVO_TEST_RECIPIENT
```

`.dev.vars` is ignored by `backend/.gitignore` and must not be committed.

### Production Worker secrets

The same sensitive values are configured as Cloudflare Worker secrets:

```text
BREVO_API_KEY
BREVO_SENDER_EMAIL
BREVO_SENDER_NAME
BREVO_TEST_RECIPIENT
```

The Brevo sender currently uses the verified sender account configured in Brevo.

## Frontend-to-backend invitation flow

```text
Pastor is already signed into Firebase
        ↓
Pastor opens Add Event
        ↓
Pastor selects one or more participants
        ↓
Pastor submits the meeting form
        ↓
Meeting is created or updated in Firebase
        ↓
useMeetings.ts creates validated recipient objects
        ↓
meetingInvitations.ts calls currentUser.getIdToken()
        ↓
POST request reaches Cloudflare Worker
        ↓
Worker verifies Firebase token
        ↓
Worker validates meeting and recipients
        ↓
Worker builds English or Arabic email
        ↓
Worker calls Brevo using the secret API key
        ↓
Brevo returns delivery acceptance/message ID
        ↓
Frontend receives success or failure
```

## Why this avoids the original Brevo frontend problem

The earlier Brevo approach was rejected because the email operation was attempted directly from client-side browser code.

The current architecture changes the trust boundary:

```text
Before
Browser → Brevo

Now
Browser → authenticated Worker → Brevo
```

The Brevo API key exists only in Worker secrets. The browser can neither read nor submit the key.

This solves the client-side API-key exposure and browser-side provider-call problem. It does not guarantee that Brevo can never restrict the account for reputation, unusual traffic, quota, or policy reasons.

## Backend testing

Backend tests run with Vitest and the Cloudflare Workers test pool.

Current tests cover:

- root route returns `Hello Hono!`
- invalid test-email body returns `400 VALIDATION_ERROR`
- successful mocked Brevo sandbox request returns success

Run:

```bash
cd backend
npm test
```

Watch mode:

```bash
npm run test:watch
```

The current suite does not yet provide complete route coverage for:

- Firebase token verification failures
- meeting-invitation schema edge cases
- English and Arabic email output
- complete Brevo failure
- partial recipient failure
- CORS behavior

These are recommended next tests.

## Continuous integration

Workflow:

```text
.github/workflows/backend-tests.yml
```

The workflow runs when backend files or the workflow itself change.

It performs:

```text
Checkout
   ↓
Node.js setup
   ↓
npm ci in backend/
   ↓
npm test
```

The workflow validates the backend but does not deploy it.

## Separate deployment systems

The repository has two independent production deployment paths.

### Frontend

```text
Git push
   ↓
Netlify build
   ↓
npm run build
   ↓
Published frontend
```

### Backend

```text
cd backend
npx wrangler deploy
   ↓
Published Cloudflare Worker
```

Deploying Netlify does not deploy the Worker. Deploying the Worker does not rebuild the Netlify frontend.

Both deployments must include their corresponding changes for an end-to-end feature migration.

## Netlify secrets-scan configuration

Netlify detected the public Firebase project ID inside:

```text
backend/wrangler.jsonc
```

because the same value is also configured as:

```text
VITE_FIREBASE_PROJECT_ID
```

The project therefore uses:

```text
SECRETS_SCAN_OMIT_KEYS=VITE_FIREBASE_PROJECT_ID
```

This prevents Netlify from treating the public Firebase project identifier as a leaked secret.

The value is not marked as a secret and applies to the required deploy contexts.

## Operational verification

After changing the invitation workflow:

1. deploy the Worker with `npx wrangler deploy`
2. publish the Netlify frontend
3. hard-refresh `lincministry.com`
4. create an Add Event meeting
5. select a participant with a valid email
6. save the meeting
7. inspect Brevo Transactional Logs
8. inspect the recipient inbox and spam folder

A Netlify production deployment can succeed while the Worker remains on an older version, so Brevo logs are the final provider-side confirmation that the backend route was reached.


---

# Email and External Services

## Brevo

Brevo is now the active transport for **participant meeting invitations created through Add Event**.

Current verified sender configuration:

```text
Sender email: lincministry.ca@gmail.com
Sender name:  Linc ministry
```

The browser sends validated meeting and recipient data to the Cloudflare Worker. The Worker builds the bilingual content and calls Brevo with the secret API key.

Custom-domain authentication has not yet been configured. Because the sender is a Gmail address delivered through Brevo, invitation messages can still be classified as spam even when Brevo accepts the transaction.

The browser does not contain:

- the Brevo API key
- arbitrary HTML for the provider
- arbitrary sender details
- direct Brevo request code

## EmailJS

EmailJS remains in the project for legacy workflows that have not yet moved to the backend.

Current examples include:

- requester status and cancellation messages in calendar workflows
- People Development assignment notifications
- other older client-side email paths

Email successes and failures may still be written to:

```text
emailJsSendLogs/
```

for workflows that continue to use EmailJS.

The presence of an EmailJS import in `useMeetings.ts` is currently caused by requester cancellation behavior. It does not mean Add Event participant invitations still use EmailJS.

## Google APIs

The project still contains Google API integration code for:

- Gmail
- Google Calendar
- Google Meet creation

The legacy integration is located primarily in:

```text
src/services/gmail.ts
```

That service contains both older Google behavior and active/legacy utilities. It should eventually be separated into focused email and calendar services.

## Active transport summary

| Workflow | Current transport |
|---|---|
| Add Event participant invitations | Cloudflare Worker → Brevo |
| Requester cancellation/status messages | EmailJS |
| People Development assignment notifications | EmailJS |
| Legacy Google/Gmail/Calendar paths | Present where still referenced |

The application therefore currently uses multiple transports during the incremental migration.

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

The application now has a backend boundary for participant meeting invitations, but significant logic still runs in the browser.

## Improved areas

- Brevo API key is stored only in Cloudflare Worker secrets
- participant invitation payloads are validated server-side
- participant invitation HTML is generated server-side
- invitation requests require a valid Firebase ID token
- CORS is restricted to the production frontend and local Vite origin
- the endpoint cannot accept arbitrary email HTML or arbitrary sender information
- local backend secrets are excluded through `.dev.vars`

## Current limitations

- the active invitation route authenticates the Firebase user but does not independently verify the `pastor` role
- the Brevo test endpoint remains available
- Firebase ID-token revocation is not checked through Firebase Admin
- some EmailJS credentials/configuration and email flows still exist client-side
- several administrative operations still depend heavily on Firebase client rules
- booking conflict prevention is not yet enforced as a backend transaction
- confidential People Development data still requires careful Firebase rules
- Base64 file storage remains in Realtime Database
- legacy OAuth behavior should still be reviewed
- hard-coded/default role provisioning remains in `App.tsx`

Important areas requiring continued review include:

- public meeting-request writes
- public availability reads
- booking race conditions
- duplicate booking prevention
- predictable or identifier-based access controls
- confidential People Development notes
- attendance information
- Base64 files stored in Realtime Database
- remaining client-side email configuration
- browser-side administrative migrations

The sample Firebase rules in this README are development examples only. They must not be treated as a complete production security policy.

# Tech Stack

## Frontend

- React 19
- TypeScript
- Vite 8
- Tailwind CSS
- Firebase Authentication
- Firebase Realtime Database
- Firebase Firestore initialization
- EmailJS for remaining legacy email paths
- Google Calendar/Gmail integration code
- Motion for React
- Lucide React
- date-fns
- React Router

## Backend

- Cloudflare Workers
- Hono
- TypeScript
- Zod
- `jose`
- Brevo transactional email API
- Wrangler
- Vitest
- `@cloudflare/vitest-pool-workers`

## Delivery and CI

- Netlify for frontend builds and hosting
- Cloudflare Workers for backend hosting
- GitHub Actions for backend tests

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

### Frontend

- Node.js 20 or newer
- npm
- Firebase project
- Firebase Authentication
- Firebase Realtime Database
- EmailJS account/configuration for remaining legacy workflows
- Google Cloud project when using the legacy Google Calendar/Gmail integrations

### Backend

- Cloudflare account
- Wrangler access to the `linc-backend` Worker
- Brevo account
- verified Brevo sender
- Firebase project ID
- local `.dev.vars` file for development

## Repository installation

```bash
git clone <repository-url>
cd LInC-Church-Management
npm install
```

Install backend dependencies separately:

```bash
cd backend
npm install
```

The frontend and backend use separate `package.json` files and separate dependency installations.

## Frontend environment configuration

Create the local frontend environment file:

```bash
cp .env.example .env
```

Common frontend variables include:

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase application ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID |
| `VITE_BACKEND_BASE_URL` | Optional override for the Cloudflare Worker base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_GOOGLE_REDIRECT_URI` | Google OAuth redirect URI |
| `VITE_GEMINI_API_KEY` | Legacy/optional AI configuration |
| `VITE_OPENROUTER_API_KEY` | Legacy/optional AI configuration |

The AI variables are not required by the active Pastor Dashboard after the AI assistant removal.

`VITE_BACKEND_BASE_URL` is optional because the frontend client falls back to:

```text
https://linc-backend.linc-ministry.workers.dev
```

## Backend local configuration

Create:

```text
backend/.dev.vars
```

with:

```text
BREVO_API_KEY=<local-brevo-api-key>
BREVO_SENDER_EMAIL=<verified-sender-email>
BREVO_SENDER_NAME=<sender-name>
BREVO_TEST_RECIPIENT=<fixed-test-recipient>
```

Do not commit `.dev.vars`.

Non-secret Worker configuration is stored in:

```text
backend/wrangler.jsonc
```

Current non-secret variables include:

```text
FIREBASE_PROJECT_ID
FIREBASE_DATABASE_URL
```

## Production secret configuration

The production Worker requires these Cloudflare secrets:

```text
BREVO_API_KEY
BREVO_SENDER_EMAIL
BREVO_SENDER_NAME
BREVO_TEST_RECIPIENT
```

They must be configured in Cloudflare, not committed to the repository.

## Netlify secrets scan

Netlify must include:

```text
SECRETS_SCAN_OMIT_KEYS=VITE_FIREBASE_PROJECT_ID
```

because the public Firebase project identifier also appears in `backend/wrangler.jsonc`.

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

## Frontend development

From the repository root:

```bash
npm run dev
```

The frontend normally runs at:

```text
http://localhost:5173
```

That origin is already allowed by the Worker's CORS configuration.

## Backend development

From the repository root:

```bash
cd backend
npm run dev
```

Wrangler starts the local Worker and loads local bindings from `.dev.vars`.

## Run frontend and backend together

Use separate terminals.

### Terminal 1

```bash
npm run dev
```

### Terminal 2

```bash
cd backend
npm run dev
```

When testing a non-production Worker URL, set:

```text
VITE_BACKEND_BASE_URL=<local-or-preview-worker-url>
```

and restart Vite so the frontend receives the updated environment variable.

# Production Build and Deployment

## Frontend production build

From the repository root:

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

## Frontend deployment

Frontend changes are published through Netlify.

A successful Netlify build does not deploy the Worker.

## Backend tests before deployment

```bash
cd backend
npm test
```

## Backend deployment

```bash
cd backend
npx wrangler deploy
```

A successful Wrangler deployment publishes the Worker separately from Netlify.

## End-to-end deployment order

For a change that modifies both frontend and backend:

```text
1. Run backend tests
2. Deploy Worker
3. Push/publish frontend
4. Wait for Netlify Published status
5. Hard-refresh production frontend
6. Trigger the workflow
7. Verify provider logs
```

Provider-side verification for participant invitations is performed in Brevo Transactional Logs.

# Scripts

## Frontend scripts

Run from the repository root.

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Run TypeScript validation and build production assets |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint when configured |

## Backend scripts

Run from `backend/`.

| Command | Description |
|---|---|
| `npm run dev` | Start the local Cloudflare Worker with Wrangler |
| `npm test` | Run the backend Vitest suite once |
| `npm run test:watch` | Run backend tests in watch mode |
| `npx wrangler deploy` | Deploy the Worker to Cloudflare |

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

The Pastor Dashboard refactor and the first backend email migration are complete, but additional cleanup remains.

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

### Remaining email migrations

Move the remaining client-side EmailJS workflows behind the Worker incrementally:

```text
requesterConfirmation.routes.ts
requesterCancellation.routes.ts
peopleDevelopmentNotification.routes.ts
```

Priority candidates:

1. requester confirmation/status emails
2. requester cancellation emails
3. People Development assignment notifications
4. operational email logging

Each migration should preserve the existing frontend behavior and move only the sensitive provider operation to the backend.

### Backend test expansion

Add automated coverage for:

- missing bearer token
- invalid Firebase token
- valid authenticated invitation request
- malformed JSON
- invalid calendar dates
- invalid time ranges
- more than 50 recipients
- English email content
- Arabic RTL email content
- HTML escaping
- complete Brevo failure
- partial-recipient failure
- CORS preflight behavior

### Test endpoint cleanup

After production validation is stable, remove or restrict:

```text
POST /api/v1/email/test
```

### Authorization decision

The current endpoint authenticates an existing Firebase account but does not perform a backend role lookup.

A future authorization change should be treated as a separate design decision rather than being bundled into email transport migration.

### Calendar styling

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
- legacy placeholder behavior

### Dependency cleanup

After active imports are verified, remove:

- unused OpenAI dependencies
- unused AI environment variables
- unused AI translation strings
- obsolete calendar files
- unused duplicate booking components
- dead Google/OAuth utilities
- dead authorization experiments that are intentionally abandoned

### Additional backend candidates

Potential later migrations include:

- meeting-request decisions
- booking conflict transactions
- audit logging
- confidential People Development operations
- file upload validation
- secure Google Calendar/Meet creation
- administrative configuration

# Refactor Principles

The project now follows these boundaries:

| Responsibility | Location |
|---|---|
| Page composition | `PastorDashboard.tsx` |
| Stateful React orchestration | `hooks/` |
| Visual rendering | Feature components |
| Frontend Firebase subscriptions and writes | `*.firebase.ts` |
| Frontend business workflows | `*.actions.ts` |
| Pure calculations and filtering | `*.selectors.ts`, `*.utils.ts`, `*.slots.ts` |
| Shared types | `*.types.ts` |
| Shared constants | `*.constants.ts` |
| Frontend API clients | `src/services/` |
| Backend routing | `backend/src/routes/` |
| Backend authentication | `backend/src/auth/`, `backend/src/middleware/` |
| Backend validation | `backend/src/schemas/` |
| Backend email builders | `backend/src/emails/` |
| External provider clients | `backend/src/services/` |
| Worker configuration | `backend/wrangler.jsonc` |
| Local Worker secrets | `backend/.dev.vars` |
| Backend automated tests | `backend/test/` |
| Backend CI | `.github/workflows/backend-tests.yml` |
| Frontend routing and existing role guards | `App.tsx` |

## Incremental migration rule

The backend is introduced one workflow at a time:

```text
Preserve existing frontend behavior
        ↓
Create a narrow validated API contract
        ↓
Reuse the existing Firebase session
        ↓
Move the sensitive provider call to the Worker
        ↓
Test locally
        ↓
Deploy Worker and frontend independently
        ↓
Verify provider logs
```

This approach avoids a risky all-at-once rewrite while still moving secrets and provider calls out of the browser.

## Separation rule

The meeting invitation implementation follows:

```text
Frontend form state
        ≠
Frontend API client
        ≠
Backend route
        ≠
Backend schema
        ≠
Email content builder
        ≠
Brevo transport
```

Each layer can be tested or replaced without rebuilding every other layer.

This structure prevents another single 3,000-line component and provides a practical path toward a broader three-tier architecture.

# License

Private — LINC Ministries

---

# Created by

T-TLabs
