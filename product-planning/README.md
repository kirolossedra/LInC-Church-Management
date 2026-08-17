# LINC One Product Planning

This directory is the authoritative product-planning workspace for LINC One.

It is separate from `documentation/` because documentation describes the product/technical system, while this directory records product history, milestones, initiatives, priorities, dependencies, and planning evidence.

## Planning ontology

### Role experiences

A role experience is a product surface organized around a distinct actor and purpose.

Current key distinction:

- **Pastor** — ministry leadership, scheduling, people development, pastoral notes, group ministry, selected NextGen oversight, Tutorial Builder, Bezalel-assisted ministry actions.
- **Administrator** — operational governance and delegated administration across authorized domains such as assessments, landing media, attendance, archives, NextGen QA, people access, and audit/accountability.

Pastor and Administrator must not be merged merely because both have privileged access.

### Product capabilities

Examples:
- Spiritual Assessments
- NextGen
- Attendance

### Strategic initiatives

Examples:
- Bezalel AI Platform
- Backend Security & Service Boundary
- Codebase Maintainability
- Forms Platform Evolution
- Communications Expansion
- Backend Portability & Team Scalability

### Operational work

Examples:
- #21 B2 blocker
- #20 refactoring
- #8 autofill

Operational priority does not automatically make a group of issues a milestone.

## Historical interpretation correction

The early May `AdminDashboard` was assessment-result management and belongs under the **Spiritual Assessment** capability.

The distinct **Administrator** product surface begins on July 22 with `AdministratorPanel` and `/administrator`. It later gains the Chief/administrator delegated-authority model.

The **Pastor** product surface is separate and begins in early May with Pastor-specific scheduling/calendar operations.

## Evidence policy

Use:
- `repository_evidence`
- `product_owner_confirmed`
- `derived_analysis`
- `unknown_product_owner_clarification_required`

Repository/GitHub evidence and the Product Owner are the only authoritative sources for product history and intent.

## Current Product Owner direction

- Priority order: #21, #20, #8.
- #8 is the lowest priority and an enhancement to already functional forms.
- #26/#27 are related and deferred.
- #11 is SMS feasibility/NPO-value research.
- #16 Spring is planned strategically but deprioritized and Azure-NPO-credit gated.
- Bezalel is a new platform-wide direction intended to expand into additional areas over time.
- Pastor and Administrator are different roles with different purposes and must be modeled separately.

## Structure

```text
product-planning/
├── README.md
├── product-audit.md
├── github-milestones.md
├── roadmap/
│   ├── README.md
│   ├── roadmap.yaml
│   ├── milestones.yaml
│   ├── initiatives.yaml
│   ├── issue-mapping.yaml
│   ├── backlog.yaml
│   ├── linc-one-role-capability-gantt.png
│   └── linc-one-role-capability-gantt.svg
└── analytics/
    ├── weekly-velocity.yaml
    └── velocity-methodology.md
```

## Future strategic directions added at the August 16 baseline

The Product Owner added four future directions, all entering the roadmap on **2026-08-16** with **no committed deadline**:

- **French Localization** → `M13 French Localization v1`
- **Mission Trip Management** → `M14 Mission Trip Management v1`
- **Mobile App Expansion** → `M15 Mobile App v1`
- **SaaS Transformation** → `M16 Multi-Tenant Foundation` → `M17 SaaS Launch v1`

The existing **SMS Feasibility** initiative remains active and now has a decision milestone:

- **SMS Feasibility** → `M18 SMS Feasibility Decision`

### Mobile App dependency

`DEP-APPLE-NPO` records the first confirmed external action: ask the **Media Manager** to initiate the **Apple Developer Program NPO waiver process**.

### SaaS structure

Multi-tenancy is modeled as a prerequisite/sub-stage inside SaaS Transformation:

```text
SaaS Transformation
    ↓
Multi-Tenant Foundation
    ↓
SaaS Launch v1
```

No detailed first-release scope or completion dates are invented. Those remain open for Product Owner definition.
