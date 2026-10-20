# Plastic-Free Day Tracker

A Nuxt 4 school dashboard for weekly plastic-free lunches and plastic items saved. Anyone can create a class and edit its weekly totals. School progress, class rankings, XP, levels, and badges update from shared server data.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Without a database connection, local development stores data in `data/school.json` and starts with five clearly marked sample classes. Use **Remove sample data** to clear those records while keeping classes you create.

## Checks

```bash
npm test
npm run typecheck
npm run build
npm run test:visual
```

The visual check uses an installed Microsoft Edge browser and writes desktop and mobile screenshots to `.qa/`. It checks a local JSON store, leaving the deployed database untouched.

## Deployment

The Vercel project is `plastictrackerstandrews`, with a dedicated Neon Postgres database in Sydney. Vercel supplies `DATABASE_URL`; Nuxt's server routes create their tables on first use. A new database starts empty, with no sample school totals. Without `DATABASE_URL`, a Vercel deployment returns an error instead of silently losing writes. Set `DATA_FILE` only when choosing a different local JSON store.

Class names must match `/^[0-9][a-zA-Z]{1,3}$/`; names are stored in uppercase. Weekly entries can be added, edited, or deleted for the current or a past Monday-starting week. XP is earned at 2 per lunch and 3 per plastic item saved.
