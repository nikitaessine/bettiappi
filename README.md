## Quick Bets with Friends

Track friendly bets with friends. No accounts, no payments, just a lightweight ledger of who won and who lost.

**Important:** This app is for tracking only. It does **not** process payments, escrow funds, or provide gambling services. Use it responsibly with people you trust.

### Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase Postgres
- **Validation**: Zod
- **Deployment**: Vercel (web) + Supabase (DB)

### Features

- Create bets and share unique links
- Head-to-head (`H2H`) or multi-participant (`MULTI`) modes
- Per-device identity via localStorage (token + display name)
- Creator-only controls to lock/unlock and resolve bets
- Automatic ledger entries on resolve
- Public leaderboard based on net winnings

---

### 1. Supabase setup

1. **Create a Supabase project**
   - Go to the Supabase dashboard and create a new project.
   - Note your **Project URL** and **anon key** from the API settings.

2. **Apply the SQL migration**
   - Open the SQL editor in Supabase.
   - Copy the contents of `supabase/migrations/0001_quick_bets_schema.sql`.
   - Run it once against your database.

   This will:

   - Create the `participants`, `bets`, `bet_participants`, and `ledger_entries` tables.
   - Enable RLS and allow **public SELECT only** (no anon writes).
   - Create the `leaderboard` view.
   - Create the `resolve_bet` RPC function used when resolving bets.

3. **Confirm RLS**
   - In the Supabase UI, open each table and ensure:
     - Row Level Security is **enabled**.
     - Only the `SELECT` policy is present for anon (no `INSERT`, `UPDATE`, or `DELETE` policies).
   - The Next.js API uses the **service role key** to bypass RLS for writes on the server side only.

---

### 2. Environment variables

Create a `.env.local` file at the project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Notes:

- `NEXT_PUBLIC_*` variables are exposed to the browser and are **read-only** thanks to RLS.
- `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed to the browser. It is used only in API route handlers.

---

### 3. Install dependencies

From the project root (e.g. in Git Bash):

```bash
npm install
```

This installs:

- Next.js, React, TypeScript
- Tailwind CSS + PostCSS
- Supabase JS client
- Zod for validation
- `uuid` and `qrcode.react` for identity/QR functionality

**If `npm install` fails on Windows** (EPERM, ERR_INVALID_ARG_TYPE, or cleanup errors), use **pnpm** instead:

```bash
# One-time: install pnpm globally
npm install -g pnpm

# In the project folder
cd /c/Users/YourUser/Desktop/bettiappi   # or your path
rm -rf node_modules package-lock.json
pnpm install
pnpm run dev
```

pnpm uses a different layout and often avoids the Windows npm bugs.

---

### 4. Run locally

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

Core routes:

- `/` – Landing page
- `/create` – Create a bet
- `/b/[code]` – Bet detail page
- `/leaderboard` – Leaderboard

---

### 5. Deploy to Vercel

1. Push this project to a Git repository (GitHub, GitLab, etc.).
2. In Vercel, create a new project from that repository.
3. In Vercel project settings, under **Environment Variables**, add:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. Trigger a deployment. Vercel will detect Next.js automatically.
5. After deploy, visit your Vercel URL and verify:

   - You can create a bet via `/create`.
   - The bet link opens `/b/[code]` where others can accept/decline.
   - As creator, you can lock/unlock and resolve the bet.
   - Resolved bets show up on `/leaderboard`.

---

### 6. Identity and security model

- **Identity**
  - On first visit, the app creates a random `participant_token` and stores it in `localStorage`.
  - Users choose a display name, which is also stored locally and synced to Supabase via `/api/identity/upsert`.
  - No email/password or external login is used.

- **Security**
  - The browser uses the **anon key** and can only read from tables/views.
  - All writes (creating bets, responding, locking, resolving) go through Next.js API route handlers using the **service role key** server-side.
  - RLS ensures anon clients cannot write directly to tables.
  - `creator_token` on bets is matched against the caller’s `participant_token` for creator-only actions.

Clearing `localStorage` effectively creates a new identity. This is acceptable for this MVP.

---

### 7. Where core logic lives

- **Supabase clients**
  - `lib/supabaseClient.ts`: anon client for server components and (if desired) client-side reads.
  - `lib/supabaseAdmin.ts`: service-role client for API route handlers.

- **Identity helper**
  - `lib/identity.ts`: manages `participant_token` and `participant_name` in `localStorage`.

- **API routes (`app/api`)**
  - `identity/upsert` – Upsert participant by token/name.
  - `bets/create` – Create bet and add creator as accepted participant.
  - `bets/[code]/respond` – Accept/decline a bet.
  - `bets/[code]/lock` – Lock/unlock a bet (creator only).
  - `bets/[code]/resolve` – Resolve a bet using the `resolve_bet` RPC and return settlement.

- **Pages (`app`)**
  - `page.tsx` – Landing + CTAs + disclaimers.
  - `create/page.tsx` – Create bet form, local identity, share link, QR code.
  - `b/[code]/page.tsx` – Server component fetching bet + participants + settlement, passes to `BetDetailClient`.
  - `b/[code]/BetDetailClient.tsx` – Client interactions (accept/decline, lock/unlock, resolve, copy link, identity modal).
  - `leaderboard/page.tsx` – Reads from `leaderboard` view and renders aggregate stats.

---

### 8. Disclaimers

This project is intended as a **friendly, non-monetary ledger**. If you adapt it:

- Do **not** add real-money processing without proper legal, compliance, and security review.
- Make sure to keep a clear disclaimer in the UI and documentation that no payments are handled.

