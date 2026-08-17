# Roadmap Model

## Milestone rule

A milestone is a meaningful state change in **one coherent product outcome**.

Do not define milestones from:
- week boundaries;
- commit volume;
- arbitrary date ranges;
- unrelated features being implemented together.

## Role model

### Pastor != Administrator

They are separate role experiences.

Pastor access and Pastor workflows are modeled independently from Administrator access and operational authorities.

### Early “AdminDashboard” != Administrator role

The original `AdminDashboard` was an assessment-review dashboard. It is classified under Spiritual Assessments.

The distinct Administrator line begins with the later `AdministratorPanel` and `/administrator` route.

## Object types

```text
Role Experience
├── Pastor
└── Administrator

Product Capability
├── Spiritual Assessment
├── NextGen
└── Attendance

Platform Initiative
├── Backend Security & Service Boundary
└── Bezalel AI Platform

Operational / Supporting Work
├── blockers
├── refactors
├── defects
└── isolated enhancements
```

A feature may interact with more than one object without forcing them into the same milestone.

## Date rule

Historical dates use repository evidence.

Future dates remain unset unless:
- the Product Owner commits a deadline, or
- scope and uncertainty support a defensible forecast.

Unknown-root-cause blockers do not receive invented completion dates.

## Future roadmap structure added at the August 16 baseline

```text
French Localization
└── M13 French Localization v1

Mission Trip Management
└── M14 Mission Trip Management v1

Mobile App Expansion
├── DEP-APPLE-NPO
└── M15 Mobile App v1

SaaS Transformation
├── M16 Multi-Tenant Foundation
└── M17 SaaS Launch v1

SMS Feasibility
└── M18 SMS Feasibility Decision
```

All six future milestones have `target_date: null`.

For future work, `planning_start_date: 2026-08-16` means the item entered the Product Owner roadmap at that baseline. It must not be interpreted as a delivery commitment or guaranteed engineering start date.
