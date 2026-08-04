# NextGen Activities

`src/pages/NextGenActivities.tsx` is the route-level coordinator. It selects the active activity and composes the feature modules in this directory.

## Responsibilities

- `nextGenActivities.firebase.ts`: Firebase paths, reads, subscriptions, transactions, and writes.
- `useNextGenIdentity.ts`: registration, approved-identifier access, certificate state, and logout.
- `useNextGenQuestions.ts`: question form state, live question data, and peer voting.
- `useNextGenSurvey.ts`: survey answers, completion subscription, and submission state.
- `nextGenActivities.types.ts`: shared domain contracts.
- `nextGenActivities.constants.ts`: paths, categories, and bilingual survey definitions.
- `nextGenActivities.utils.ts`: deterministic normalization, filtering, sorting, and survey helpers.
- `nextGenCertificate.ts`: browser-side PDF certificate generation.
- `NextGen*Section.tsx` / `NextGen*Panel.tsx`: presentation and user interaction.

Firebase operations should remain outside presentational components. Deterministic behavior belongs in utilities with unit tests. The route page should coordinate modules rather than own feature implementation.
