# Plastic-Free Day Tracker

A Nuxt 4 school dashboard for weekly plastic-free lunches and plastic items saved. Anyone can view school progress, class rankings, XP, levels, and badges. Each class has its own password for weekly edits and class management.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Without a database connection, local development stores data in `data/school.json` and starts empty. Existing local sample data from earlier versions can be claimed; remove the ignored JSON file to start fresh.

## Class Access

Create a class using a valid name and a password of 10 to 128 characters. Creation signs you in. Sign in later to add, edit, or delete weekly entries, change the class password, or delete the class. Password changes revoke other sessions; class deletion also removes its entries. Sessions use HTTP-only cookies and expire after 14 days. Five incorrect password attempts lock sign-in for 15 minutes.

The dashboard and all class progress remain public without sign-in. Password hashes and sessions are not returned by the dashboard API. Classes created before password protection show a **Claim class** action. The first person to claim one sets its password and becomes signed in; later visitors must sign in with that password. Class members should coordinate who claims their class first.

## Principal Access

Set `ADMIN_BOOTSTRAP_PASSWORD` in the deployment environment before the first principal sign-in. The app stores a salted password hash in its dedicated tracker database on first sign-in; it never exposes the password through public APIs. The principal can edit any class's weekly entries, reset class passwords (revoking class sessions), delete classes, change the school goal, and change the principal password. Principal sessions use a separate HTTP-only cookie and expire after eight hours. Five incorrect sign-in attempts lock principal sign-in for 15 minutes. After changing the principal password, the database hash takes precedence over the bootstrap environment variable.

## Checks

```bash
npm test
npm run typecheck
npm run build
npm run test:visual
```

The visual check uses an installed Microsoft Edge browser and writes desktop and mobile screenshots to `.qa/`. It exercises public viewing, class claiming, class access, principal controls, password changes, and deletion against an isolated local JSON store, leaving the deployed database untouched.

## Deployment

The Vercel project is `plastictrackerstandrews`, with a dedicated Neon Postgres database in Sydney. Vercel supplies `DATABASE_URL`; Nuxt's server routes migrate their tables on first use. Without `DATABASE_URL`, a Vercel deployment returns an error instead of silently losing writes. Set `DATA_FILE` only when choosing a different local JSON store.

The one-time `scripts/enable-self-claim.mjs` migration is scoped to existing classes 5C, 5H, and 5P in the dedicated tracker database. It verifies their temporary passwords before clearing them and revoking sessions. It does not change classes whose passwords have since changed.

Class names must match `/^[0-9][a-zA-Z]{1,3}$/`; names are stored in uppercase. Weekly entries can be added, edited, or deleted for the current or a past Monday-starting week. XP is earned at 2 per lunch and 3 per plastic item saved.
