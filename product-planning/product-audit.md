# LINC One Product Audit

**Planning baseline:** 2026-08-16  
**Repository:** `kirolossedra/LInC-Church-Management`

## Executive finding

The repository does not describe one linear product. It contains parallel role experiences, ministry/product capabilities, and platform initiatives.

The most important role distinction is:

> **Pastor and Administrator are separate product actors with different purposes, routes, access models, and operational domains.**

This is supported both by current code and by history.

---

## 1. Pastor vs Administrator — code-level distinction

### Pastor

Current Pastor access is resolved through the Pastor authorization flow and used to protect:

- `/calendar`
- `/pastor/people-notes`
- `/guide`

The current `PastorDashboard` is a ministry-leadership workspace combining:

- calendar and meeting management;
- meeting requests;
- availability/unavailability;
- participants;
- People Development;
- people-development meeting schedules;
- NextGen QA oversight;
- Tutorial Builder;
- Pastor Bezalel assistant.

The backend also has explicit Pastor authorization separate from Administrator authority.

### Administrator

`/administrator` mounts `AdministratorPanel` independently.

The current Administrator system has its own access/session model:

- Firebase email/password authentication;
- Chief and administrator roles;
- pending/active/suspended statuses;
- Chief approval and suspension;
- granular authorities for:
  - assessment forms,
  - carousel,
  - attendance,
  - archives,
  - NextGen QA,
  - people access.

The current Administrator UI is organized as a command center with:

- administrator hierarchy;
- Spiritual Program operations;
- landing-media management;
- attendance administration;
- archives;
- NextGen QA;
- people-access operations;
- audit history/accountability.

This is operational governance, not Pastor ministry work.

---

## 2. Why early May is NOT the start of the Administrator product line

The May 5 repository bootstrap created a file called `AdminDashboard`, but its purpose was:

> managing assessments and displaying results.

The code reads assessment submissions and exposes that assessment-review surface through `/dashboard`.

Therefore it is classified as **Assessment Review / Spiritual Assessment administration**, not the later Administrator role.

Using the word “Admin” in a historical filename is not sufficient evidence that the current Administrator product capability existed.

---

## 3. Pastor timeline

### Start — May 6

Pastor-specific functionality is directly present by May 6.

Repository history includes Pastor-oriented slot availability/blocking and meeting/calendar operations.

### Pastor Scheduling Workspace v1 — May 7

By May 7 the Pastor role can manage the pastoral scheduling loop, including meeting editing and availability/calendar behavior.

This is a coherent role milestone separate from the public booking experience.

### Expansion into ministry operations

Later Pastor work adds:

- broader Pastor view;
- people management/development;
- group structures;
- NextGen question/feedback oversight;
- group meeting scheduling;
- combined communication;
- Tutorial Builder;
- Bezalel.

### Pastor Ministry Workspace v2 — July 30

Issues #6, #7 and #9 fit together here because all three belong to the Pastor's people/group ministry workflow:

- #6 — Pastor People Development view;
- #7 — Pastor-managed group meeting calendar;
- #9 — Pastor combined post to multiple groups.

This is a meaningful Pastor-role expansion, not a generic “operations expansion” phase.

---

## 4. Administrator timeline

### Prototype start — July 22

The distinct `AdministratorPanel.tsx` is created on July 22 local project time.

The `/administrator` route and Administrator Panel entry are added immediately afterward.

The first real panel implementation is narrow:

- landing-page carousel visibility;
- image upload/order/text;
- a dedicated administrator password.

This establishes a separate Administrator surface, but it is not yet the mature delegated-administration model.

### Administrator Delegation v1 — July 29

By July 29 the Administrator architecture contains:

- Firebase email/password sign-in;
- first account becomes Chief;
- additional administrators require Chief approval;
- active/pending/suspended states;
- delegated authorities;
- assessment-form, carousel, and attendance authorities.

This is the first strong milestone for the modern Administrator role.

### Administrator evolution — August

The domain expands to include:

- command-center organization;
- LInC Archives and B2 storage;
- NextGen QA authority;
- people-access authority;
- modern attendance administration;
- backend authorization;
- audit/accountability history.

### Administrator Operations & Accountability v2 — August 16

The mature state at the baseline is materially broader than the July prototype and includes delegated operations plus accountability.

---

## 5. Spiritual Assessment capability

### Spiritual Assessment MVP — May 5

The initial assessment flow and assessment-review dashboard belong together.

This milestone deliberately does **not** include the later Administrator product line.

Later evolution includes:

- multiple/YAML-driven forms;
- form organization;
- backend assessment/admin linkage;
- form modularization;
- #8 future autofill efficiency.

---

## 6. NextGen

### NextGen Participation v1 — May 22

NextGen is already a distinct program surface with participant activities and Pastor question visibility.

### NextGen Portal v2 — August 11

NextGen later becomes a substantially stronger authenticated portal with redesigned QA/member workflows and file capability.

NextGen remains its own product capability even though Pastor and Administrator both interact with selected NextGen operations.

---

## 7. Attendance

Attendance begins as its own bilingual operational capability in May.

Later Administrator attendance tooling and backend security do not mean Attendance “belongs” to Administration; Administration is one privileged operator of the Attendance capability.

This distinction is important:

```text
Attendance = product capability
Administrator = role that can operate/manage Attendance
```

---

## 8. Bezalel

Bezalel is a platform-level strategic initiative.

Its first integrations do not make it subordinate to Calendar, NextGen, or Pastor. The Product Owner has confirmed Bezalel will expand into other LINC One areas over time.

### Bezalel AI Platform v1 — August 11

This milestone marks the initial platform introduction.

Future milestones should be defined by concrete next Bezalel outcomes/surfaces when the Product Owner specifies them.

---

## 9. Backend / security service boundary

The Hono backend is a cross-cutting platform boundary.

### Backend Platform v1 — July 24

A deployed, frontend-connected Hono backend becomes operational.

### Server-Mediated Core Operations v1 — August 15

A broad set of sensitive operations has moved behind backend authentication/authorization/validation.

This is one coherent platform outcome despite touching multiple product domains, because the common milestone is the **server-side trust boundary**.

---

## 10. Current work

### #21 — Admin/B2 storage blocker
- Administrator-domain production blocker.
- Investigation not started.
- Root cause unknown.
- No target date assigned.

### #20 — Organization/refactoring
- Cross-cutting maintainability initiative.
- Substantially progressed but incomplete.
- Not an Administrator or Pastor milestone.

### #8 — assessment autofill
- Spiritual Assessment efficiency enhancement.
- Lowest of the three current priorities.
- Existing forms are functional.

The three are intentionally not aggregated into one milestone or completion percentage.

---

## 11. Milestone set at baseline

1. Spiritual Assessment MVP — May 5
2. Pastor Scheduling Workspace v1 — May 7
3. NextGen Participation v1 — May 22
4. Attendance Operations v1 — May 24
5. Backend Platform v1 — July 24
6. Administrator Delegation v1 — July 29
7. Pastor Ministry Workspace v2 — July 30
8. LINC One Platform Launch — August 11
9. NextGen Portal v2 — August 11
10. Bezalel AI Platform v1 — August 11
11. Server-Mediated Core Operations v1 — August 15
12. Administrator Operations & Accountability v2 — August 16

These milestones can overlap because the product lines evolve in parallel.

---

## 12. New future initiatives entering planning on August 16, 2026

These are **Product Owner Confirmed** and have **no clear deadline**.

### M13 / INIT-FRENCH — French Localization

**Planning start:** 2026-08-16  
**Target:** unset

Goal: introduce French localization across LINC One.

The exact first-release surfaces are intentionally unspecified until the Product Owner defines them. The first milestone is therefore **French Localization v1**, meaning the first usable French-localized release across the selected surfaces.

### M14 / INIT-MISSION-TRIPS — Mission Trip Management

**Planning start:** 2026-08-16  
**Target:** unset

Goal: establish Mission Trip Management as a new major LINC One product capability family.

The first milestone is **Mission Trip Management v1**, defined as the first usable end-to-end mission-trip management workflow. Detailed workflow scope remains open.

### M15 / INIT-MOBILE — Mobile App Expansion

**Planning start:** 2026-08-16  
**Target:** unset

Goal: expand LINC One from web into a mobile application.

The first milestone is **Mobile App v1**.

Confirmed external dependency / next action:

> Ask the **Media Manager** to initiate the **Apple Developer Program NPO waiver process**.

This action is tracked as `DEP-APPLE-NPO`; it is not itself a product milestone.

### M16 + M17 / INIT-SAAS — SaaS Transformation

**Planning start:** 2026-08-16  
**Target:** unset

Goal: transform LINC One into a reusable multi-organization SaaS platform.

This initiative is intentionally decomposed into meaningful product-state milestones:

1. **M16 — Multi-Tenant Foundation**  
   LINC One can support isolated organizations/churches within the shared platform.

2. **M17 — SaaS Launch v1**  
   First usable multi-organization SaaS form of LINC One.

`M17` depends on `M16`.

Detailed tenant onboarding, pricing/billing, provisioning, organization branding, and tenant-admin scope are **not inferred**.

## 13. Existing SMS initiative promoted to a decision milestone

### M18 / INIT-SMS — SMS Feasibility Decision

The existing SMS work remains an **investigation**, not implementation.

The next meaningful milestone is:

> Complete provider, pricing, quota, and nonprofit/NPO-benefit investigation and decide whether/how SMS should proceed.

No SMS implementation milestone is created until the Product Owner decides to proceed.

## 14. Forecasting rule for the new directions

No target dates are assigned to:

- French Localization v1
- Mission Trip Management v1
- Mobile App v1
- Multi-Tenant Foundation
- SaaS Launch v1
- SMS Feasibility Decision

Their `planning_start_date: 2026-08-16` means they entered the roadmap on that date; it does not claim implementation began that day.
