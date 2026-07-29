export const ATTENDANCE_RESPONSIVE_STYLES = `
  .attendance-page-root,
  .attendance-page-root * {
    box-sizing: border-box;
    min-width: 0;
  }

  .attendance-page-root {
    max-width: 100vw;
    overflow-x: hidden;
  }

  .attendance-page-root div,
  .attendance-page-root span,
  .attendance-page-root p,
  .attendance-page-root button {
    overflow-wrap: anywhere;
  }

  .attendance-page-root input,
  .attendance-page-root button {
    max-width: 100%;
  }

  .attendance-page-root svg {
    flex-shrink: 0;
    max-width: 100%;
  }

  @media (max-width: 640px) {
    html,
    body {
      max-width: 100%;
      overflow-x: hidden;
    }

    body {
      margin: 0;
    }

    .attendance-page-root {
      padding: 12px !important;
    }

    .attendance-page-root > div {
      max-width: 100% !important;
    }

    .attendance-access-card,
    .attendance-main-card,
    .attendance-page-root section {
      border-radius: 20px !important;
      padding: 18px 14px !important;
    }

    .attendance-page-root h1 {
      font-size: 24px !important;
      line-height: 1.2 !important;
    }

    .attendance-page-root h2 {
      font-size: 21px !important;
      line-height: 1.25 !important;
      flex-wrap: wrap;
    }

    .attendance-page-root h3 {
      font-size: 17px !important;
      line-height: 1.25 !important;
      flex-wrap: wrap;
    }

    .attendance-page-root p {
      font-size: 14px !important;
    }

    .attendance-page-root button {
      white-space: normal !important;
    }

    .attendance-section-header {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 12px !important;
      margin-bottom: 20px !important;
    }

    .attendance-calendar-card {
      border-radius: 18px !important;
      padding: 12px !important;
    }

    .attendance-calendar-header {
      gap: 8px !important;
      margin-bottom: 12px !important;
    }

    .attendance-calendar-header button {
      width: 38px !important;
      height: 38px !important;
      min-height: 38px !important;
      padding: 0 !important;
      flex: 0 0 38px;
    }

    .attendance-month-label {
      font-size: 18px !important;
      line-height: 1.2 !important;
    }

    .attendance-weekday-grid,
    .attendance-calendar-grid {
      gap: 4px !important;
    }

    .attendance-weekday-grid div {
      font-size: 11px !important;
      padding: 6px 0 !important;
    }

    .attendance-calendar-grid button {
      min-height: 42px !important;
      border-radius: 12px !important;
      font-size: 16px !important;
      padding: 0 !important;
    }

    .attendance-person-grid-row {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }

    .attendance-person-action,
    .attendance-analysis-stat-card {
      width: 100% !important;
      min-width: 0 !important;
    }

    .attendance-person-identity {
      align-items: center !important;
      gap: 12px !important;
    }

    .attendance-person-photo {
      width: 68px !important;
      height: 68px !important;
      flex-basis: 68px !important;
    }

    .attendance-photo-editor {
      align-items: center !important;
      flex-direction: column !important;
      text-align: center !important;
    }

    .attendance-photo-preview {
      width: 132px !important;
      height: 132px !important;
    }

    .attendance-modal-overlay {
      padding: 10px !important;
    }

    .attendance-modal-card {
      width: 100% !important;
      max-width: 100% !important;
      max-height: calc(100vh - 20px) !important;
      border-radius: 20px !important;
      padding: 18px 14px !important;
    }

    .attendance-page-root svg[width="360"],
    .attendance-page-root svg[width="520"] {
      width: 100% !important;
      height: auto !important;
    }

    .attendance-person-edit-modal {
      width: 100% !important;
      max-width: 100% !important;
      max-height: calc(100dvh - 20px) !important;
      border-radius: 20px !important;
    }

    .attendance-person-edit-modal-header {
      padding: 16px 14px !important;
    }

    .attendance-person-edit-modal-body {
      padding: 14px !important;
    }

    .attendance-person-edit-modal .attendance-photo-editor {
      margin-bottom: 22px !important;
    }

    .attendance-camera-actions {
      width: 100% !important;
      justify-content: center !important;
    }

    .attendance-live-camera {
      padding: 12px !important;
      border-radius: 18px !important;
    }

    .attendance-live-camera video {
      max-height: 48vh !important;
      border-radius: 14px !important;
    }
  }
`;

