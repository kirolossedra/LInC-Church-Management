# Administrator Panel Architecture

The administrator panel is organized by responsibility instead of keeping authentication, Firebase normalization, feature state, and all UI in one component.

## Structure

- `AdministratorPanel.tsx` — feature orchestration and administrator-page state.
- `AdminAccessScreens.tsx` — loading, sign-in, pending-approval, and suspended-access screens.
- `admin.constants.ts` — Firebase paths, limits, authority defaults, and assessment definitions.
- `admin.types.ts` — shared administrator, assessment, and carousel types.
- `admin.utils.ts` — normalization, parsing, image conversion, and display helpers.
- `hooks/useAdministratorAccess.ts` — Firebase Authentication, Chief initialization, administrator subscriptions, permissions, activation, and suspension.
- `components/` — presentational sections for hierarchy, assessment controls, carousel management, and attendance access.
- `attendance/` — the attendance feature boundary, including its UI, types, utilities, and responsive styles.

## Design rules

1. Firebase paths and limits belong in `admin.constants.ts`.
2. Realtime Database values must be normalized before entering UI state.
3. Authentication and permission state belongs in `useAdministratorAccess`.
4. Presentational sections receive data and callbacks through typed props.
5. Attendance implementation details stay inside the `attendance/` feature folder.
