# Velocity Methodology

## Important separation

Velocity analysis measures **engineering activity/capacity patterns**. It does **not** define milestones.

The previous model attached every week to a single product phase. That has been removed because several capabilities often evolved in parallel within the same week.

## Weekly activity

Week 1 starts on repository creation date 2026-04-29. Weekly commit counts remain useful for:

- identifying bursty versus quiet delivery;
- comparing recent activity with historical activity;
- understanding capacity concentration.

They must not be used to conclude that all work in a week belonged to one product outcome.

## Engineering Activity Index

```text
EAI_week = round(100 × commits_in_week / maximum_weekly_commits)
```

This remains an activity index only.

## Milestone velocity

Future milestone forecasting should compare **similar coherent outcomes**, not raw commit counts.

Example:

- a storage-root-cause investigation should be estimated from technical uncertainty and comparable fixes;
- a NextGen product overhaul should be compared with prior product-scale feature delivery;
- a refactor epic should not be averaged together with a user-facing enhancement.

## No composite current-progress score

There is no longer a `(0 + 70 + 0) / 3` current milestone score because #21, #20, and #8 are not one milestone.

Issue-level status can still be tracked individually.
