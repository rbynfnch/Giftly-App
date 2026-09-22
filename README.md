# Giftly

Personal gifting management PWA. React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase.

## Setup

```sh
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Apply `supabase/migrations/0001_init.sql` in your Supabase project's SQL Editor before signing up — it creates the `users`/`networks`/`network_members`/`groups`/`people` tables, their RLS policies, and the triggers that set up a new user's default network. See `supabase/local-rls-test/README.md` to exercise the migration and its RLS policies against a local Postgres instance without touching the live project.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — typecheck and build for production
- `npm run lint` — lint with oxlint
- `npm run preview` — preview the production build
