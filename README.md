# YMG Ops

Internal tools app — Lead Feed, Leaderboard, and Call Intake. One login,
one app, dynamic role-based access.

Full design and decision record: `docs/tools/PLAN.md` and
`docs/tools/MEMORY.md` in the [ymg-org](https://github.com/pavan-ymg) monorepo.

## Stack

Next.js 16 + React 19, Drizzle ORM, Auth.js v5 (email + password), Neon
Postgres, Resend.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the real values
npm run dev
```

## Database

```bash
npm run db:generate   # create a migration from schema.ts changes
npm run db:migrate    # apply migrations
npm run db:seed       # seed the permission catalogue + starter roles,
                       # and bootstrap the first super admin
npm run db:studio     # browse the database
```
