# Administrator Attendance

This feature is rendered only through the Administrator Panel and remains protected by the `manageAttendance` allocation.

## Structure

- `AttendanceManagement.tsx`: feature coordinator and top-level navigation.
- `useAttendanceManagement.ts`: people subscription, editor/camera lifecycle, and mutations.
- `useAttendanceAnalytics.ts`: derived Sunday, person, histogram, and timeline analytics.
- `attendance.copy.ts`: bilingual interface copy.
- `attendance.types.ts`: shared domain contracts.
- `attendance.utils.ts`: deterministic normalization, calendar, and attendance-date helpers.
- `AttendancePeoplePanel.tsx`: searchable people management list.
- `AttendancePersonModal.tsx` and `AttendancePersonEditor.tsx`: person editing and photo capture.
- `AttendanceRecordingPanel.tsx`: Sunday selection and attendance recording.
- `AttendanceAnalysisPanel.tsx` and `AttendanceAnalysisCharts.tsx`: summary analysis and charts.
- `AttendancePersonalAnalysisModal.tsx`: detailed individual attendance analysis.

Firebase access remains centralized in the controller hook. Presentation components receive the controller contract and do not access Firebase directly.
