# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Gaming Cafe Booking Website ("GameSpot") — a Vite + React + TypeScript SPA where customers browse gaming cafes, book gaming systems by the hour, and cafe owners manage their cafe (systems, live walk-in sessions, bookings, repairs) from a dashboard. Backend is Supabase (Postgres + Auth). Originally scaffolded from a Figma Make export.

## Commands

- `npm i` — install dependencies
- `npm run dev` — start the Vite dev server
- `npm run build` — production build (`vite build`)

There is no lint or test script configured in `package.json` — don't assume `npm test`/`npm run lint` exist.

## Environment

Supabase credentials are required at runtime via Vite env vars, read in `src/supabase.ts`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

There is no `.env.example` in the repo — check with the user for local credentials if `npm run dev` fails to reach Supabase.

## Architecture

### Entry / routing

- `src/main.tsx` mounts the app, wrapping the router in `AuthProvider` (`src/app/context/AuthContext.tsx`), which owns Supabase auth session state and the current user's `profiles` row (`user`, `profile`, `signOut()` via `useAuth()`).
- `src/app/routes.tsx` defines all routes with `react-router`'s `createBrowserRouter`. `Root.tsx` (`src/app/components/Root.tsx`) is the layout shell (header/nav/`Outlet`) shown on `/`, `/games`, `/hardware`, and cafe detail pages.
- `Root.tsx` also hardcodes an `ADMIN_EMAILS` allowlist that gates the `/admin` (`AdminApprovals`) link/route — there's no `role: "admin"` in the DB, admin-ness is purely this email list.
- `vercel.json` rewrites all non-`/api` paths to `index.html` (SPA hosting on Vercel), and `api/*.ts` are Vercel serverless/edge functions (e.g. `api/steam-search.ts` proxies the Steam store search API to dodge CORS; `api/ping.ts` is a health check).

### Two parallel data models: mock vs Supabase-backed

This is the most important thing to understand before touching booking/cafe-detail code. The codebase has **two parallel implementations** of the same features, and they are not interchangeable:

- **Mock/local data path**: `src/app/data/mockData.ts` defines the `GamingCafe`/`GamingSystem`/`TimeSlot` types and static sample data. Consumed by `BrowseCafes`, `CafeDetails`, `SearchByGame`, `FilterByHardware`, `CafeCard`, `GamingSystemSelector`, `ReviewsSection`, `BookingConfirm`/`BookingsList` (the non-`Db`-prefixed components). This path does not hit Supabase for cafe/system data.
- **Supabase-backed path**: components prefixed `Db*` (`DbCafeDetails`, `DbReviewsSection`) plus the owner-dashboard components (`Dashboard`, `CafeEditor`, `SystemsManager`, `LiveSessions`, `RepairSlotsManager`, `RevenueStats`, `RegisterCafe`, `AdminApprovals`) query Supabase tables directly with `supabase.from(...)`.
- Routing exposes both: `/cafe/:id` → mock `CafeDetails`, `/cafe/db/:id` → real `DbCafeDetails`. `BrowseCafes` (the actual homepage) links into the mock flow; the DB flow is reached via cafe cards backed by real data fetched separately, or directly by ID.
- `AdvancedBookingInterface` is shared by both paths — it's fed a converted list of systems (mock `GamingSystem[]` shape) regardless of where the data originated, and always queries `bookings`/`repair_slots`/`walk_in_sessions` live from Supabase to compute slot availability, not from the mock `timeSlots` field.
- When changing booking/cafe logic, check whether you're editing the mock demo path, the DB path, or (for slot availability/booking submission) the shared `AdvancedBookingInterface` — a fix in one does not apply to the other.

### Supabase schema (inferred — no migrations/SQL in repo)

There are no `.sql` files or a `supabase/` migrations directory checked in; the schema only exists as inferred from `supabase.from(...)` calls scattered across components. Known tables and key columns (grep for `.from("<table>")` to find all usages before changing shape):

- `profiles` — `id` (= auth user id), `email`, `full_name`, `role` (`"owner"` gates `/dashboard`; anything else is a regular customer)
- `cafes` — `owner_id`, `name`, `description`, `city`, `address`, `phone`, `email`, `price_per_hour`, `opening_time`/`closing_time` (`"HH:MM"` strings), `image_url`, `is_approved`, `amenities` (array), `games` (array)
- `gaming_systems` — `cafe_id`, `name`, `type` (`"PC" | "Console"`), `gpu`, `cpu`, `ram`, `console`
- `bookings` — `cafe_id`, `system_id`, `booking_date`, `start_time`/`end_time` (`"HH:MM"`), `status` (`"confirmed"` is the only status filtered on), `players` (JSON array of `{name, phone}`)
- `walk_in_sessions` — `cafe_id`, `system_id`, `session_date`, `slots` (int[] of hours), `start_time`/`end_time` (**integer hour**, not a string — different convention from `bookings`), `status` (`"scheduled" | "active" | "ended"`), `started_at`/`ended_at`
- `repair_slots` — `cafe_id`, `system_id`, `repair_date`, `start_hour`/`end_hour` (int), `reason`

Note the two different time representations in play: `bookings` uses `"HH:MM"` strings, while `walk_in_sessions`/`repair_slots` use integer hours. Slot-availability code (`AdvancedBookingInterface`) has to normalize between them — watch for this when editing availability logic.

### Walk-in sessions vs online bookings

Cafe owners can start ad-hoc "walk-in" sessions for a system from the dashboard (`LiveSessions.tsx`) in addition to customers' pre-booked online reservations (`bookings` table). A walk-in session is `"scheduled"` (reserved, not yet started) or `"active"` (customer physically playing, timer running) before being marked `"ended"`. `LiveSessions` polls a `setInterval` clock (`now` state, ticks every second) to auto-end sessions past their `end_time` and to compute a live progress bar and pro-rated price (`calculatePrice`, based on elapsed minutes within the current hour, not a flat per-hour charge). When starting/extending a walk-in session, availability must be cross-checked against `bookings` for the same system/hour to avoid double-booking a slot that's already reserved online.

### UI components

`src/app/components/ui/` is a shadcn/ui-style primitives library (Radix UI + Tailwind, `class-variance-authority` for variants) — treat these as generated/vendored building blocks, not app logic. `src/app/components/figma/ImageWithFallback.tsx` is a Figma-Make-specific image component. Styling is Tailwind v4 (`@tailwindcss/vite` plugin, config-less — tokens live in `src/styles/theme.css`/`globals.css`).

## Notes from the Figma Make scaffold

- `vite.config.ts` includes a custom `figma-asset-resolver` plugin resolving `figma:asset/...` imports to `src/assets/`, and the React + Tailwind Vite plugins are required by the Make tooling even where Tailwind classes aren't the primary styling mechanism — don't remove them.
- Do not add `.css`, `.tsx`, or `.ts` to `assetsInclude` in `vite.config.ts`.
# GameOrbit / GameSpot — Project Brain
*Paste this entire file at the start of any new chat so the AI has full context immediately.*
*Last updated: 2026-07-26*

---

## 1. THE REAL VISION (don't lose this)

This is **not** "a gaming cafe booking website." The current build (GameSpot, this repo) is the **MVP prototype** for a much bigger company called **GameOrbit**.

Our core goal is NOT helping users discover gaming cafés — it's to become the **booking infrastructure** for gaming cafés.

Think of it like:
- Airbnb → for stays
- BookMyShow → for movies
- **GameOrbit → for gaming cafés**

We are not a directory/discovery site (that's the trap — don't build "Yelp for cafes"). We are building **precision booking at the PC/system level** — book the exact machine, with exact specs, exact games installed, in real time. Like booking a specific theatre seat, but for a gaming PC.

### Founder
Sri Sai Kumar Ojjela, 17, India. Currently studying for JEE; will go full-time on this after ~6 months. Plans to eventually find a technical co-founder. This MVP is being built solo via AI-assisted ("vibe") coding to validate the idea first.

### Market strategy (do not deviate from this sequencing)
- **Phase 1 — India**: validate product, build café network, prove demand. India has <1,000 dedicated gaming cafés — this is the testing ground, not the end goal.
- **Phase 2 — South Korea**: ~18,000-20,000 PC bangs, $7B+ market. High-performance culture, proves product quality.
- **Phase 3 — China**: 100,000-185,000+ cafés, $20B+ ecosystem. The real scale target.
- Roughly a 3-year horizon to shift focus toward Korea/China.

### Business model (future, not urgent now)
- Booking commissions
- SaaS subscription for café owners
- Premium listings / promotions
- Marketing campaign feature for café owners (Phase 2+): owners can send emails/SMS to customers who have visited their store

### Why this wins (the moat)
1. **Precision over approximation** — others help you find a café, we let you book the exact machine.
2. **Two-sided lock-in** — gamers depend on us for experience, cafés depend on us for operations (live PC tracking, walk-in sync, analytics, dynamic pricing).
3. **Data advantage** — over time we learn demand patterns, preferred setups, peak times → better pricing/recommendations.
4. **High switching cost** — once a café integrates and has booking history/data with us, leaving is costly.
5. **Walk-in + online sync** — no competitor tracks walk-ins in real time alongside online bookings. This is a unique moat.
6. **Proportional walk-in pricing** — no competitor does this. We charge walk-in customers only for the time they actually play, not rounded up to a full hour. This builds trust.

---

## 2. HARD PRODUCT RULES (from café owner validation — never compromise on these)

1. **Zero tolerance for double-booking.** Two people must never be able to book the same system at the same time.
2. **Buffer time between sessions.** See Rule 8 for full Smart Transition Buffer design.
3. **Booking conflicts must be visually impossible to create** — booked slots show as unavailable in real time.
4. **Group booking constraint algorithm** (implemented in AdvancedBookingInterface.tsx):
   - Party size X, each wanting Y hours → must select exactly X × Y total slots
   - At most X systems can share the same time slot simultaneously
   - At most Y slots on any single system
5. **Owners need full visibility into bookings**: name, phone, system, time — so they can call the customer if needed.
6. **Owners need manual control over system availability** — mark under repair, start walk-in sessions, end sessions.
7. **All time slots are 1-hour boundaries. No exceptions.** Whether online booking or walk-in, the system always works in full hour slots. A walk-in starting at 9:18 AM on the 9:00 AM slot plays until 10:00 AM (end of slot), not until 10:18 AM.
8. **Smart Transition Buffer ("Slot Compression") — finalized design:**
   - Buffer is NEVER carved from the current customer's session
   - Buffer only activates when the NEXT consecutive slot is already booked in advance
   - If next slot is empty, buffer is irrelevant — owner has natural gap
   - Last-minute bookings are BLOCKED within (buffer + 5 minutes) of an ongoing session
   - Current customer gets advance notification if next slot is booked
   - Flexible buffer with minimum booking restrictions:
     * 10 min buffer → minimum 1 hour booking
     * 15 min buffer → minimum 2 hour booking
     * 20 min buffer → minimum 3 hour booking
     * 25 min buffer → minimum 4 hour booking
     * Maximum buffer = 25 minutes
   - Owner sets buffer via timer UI in dashboard (steps of 5 min, min 10, max 25)
   - Status: DESIGNED, NOT YET BUILT
9. **Walk-in cutoff rule:** If current time is within 20 minutes of a slot's end AND the next slot is already booked online — owner CANNOT start a walk-in on that slot. Hard block with clear error message. If next slot is free, show a soft warning only (owner can proceed).
10. **Walk-in consecutive slots only:** Owner can only select consecutive time slots for a walk-in. Non-consecutive selection shows warning: "Please select only consecutive slots."
11. **Proportional walk-in pricing:** Walk-in customers are charged only for the time they actually play within their slots. Formula: minutes_played = (end_of_slot_in_minutes) - (actual_start_minute). Price = (minutes_played / 60) × hourly_rate. First slot is proportional, subsequent slots are full price.

---

## 3. MVP FEATURE SCOPE

- ✅ Customer auth & login
- ✅ Café owner registration → admin approval → public listing
- ✅ Owner dashboard (details, gaming systems, bookings, revenue tabs)
- ✅ Solo vs Group booking flow with slot-selection algorithm
- ✅ Booking confirmation with player details (name + phone per player)
- ✅ Booked slots reflected as unavailable in real time (double-booking prevention)
- ✅ Login required before booking (all 3 entry points protected)
- ✅ Contextual inline error messages for slot conflicts
- ✅ Owner sees full booking details: system name, player name, phone, time
- ✅ Repair slots — owner marks specific system+time as under repair
- ✅ Walk-in sessions — owner starts walk-in, timer runs, OCCUPIED shows on customer page
- ✅ Walk-in conflict popup — 3-option resolution (move, cancel+refund, call+reschedule)
- ✅ Walk-in proportional pricing — price breakdown shown before start, amount shown at end
- ✅ Walk-in 20-minute cutoff restriction — hard block when <20 min left and next slot booked
- ✅ "Live Now" tab — active/upcoming walk-ins AND online bookings, with timer controls
- ✅ Walk-in RESERVED status — scheduled walk-ins show amber RESERVED on customer page
- ✅ Slot grid respects café opening hours (reads opening_time/closing_time from DB)
- ✅ DB-level double-booking prevention (`bookings_no_overlap` exclusion constraint)
- ✅ Advanced Booking tab with 7-day date picker — owner sees future bookings
- 🔲 Dashboard redesign — Gaming Systems tab shows full day slot grid per system (IN PROGRESS)
- ✅ Owner cancel booking + refund note (2026-07-23)
- ✅ My Bookings page for customers (/my-bookings) (2026-07-24)
- ✅ Edit/delete own review (customer) (2026-07-25)
- ✅ Review section overhaul — verified-booker gate, 5 category sub-ratings, threaded replies, "Cafe Owner" reply badge (2026-07-26, see Section 10)
- 🔲 Photos in reviews (deferred — needs Supabase Storage)
- ✅ RevenueStats — excludes cancelled from revenue totals; fixed UTC upcoming-count bug; shows cancelled in recent list (2026-07-24)
- 🔲 Image upload for cafe cover (currently URL paste only)
- 🔲 Buffer system implementation (Smart Transition Buffer)
- 🔲 Filter in booking interface (PC/Console, GPU) — Phase 2
- 🔲 Filter in Gaming Systems tab (Free now / Occupied now / Free at X time) — Phase 2
- 🔲 Hardware autocomplete + case-insensitive FilterByHardware
- 🔲 Custom SMTP (Resend/SendGrid) before real users
- 🔲 Mobile responsiveness check
- 🔲 Customer data collection (name, phone, email, city) for analytics — Phase 2
- 🔲 Marketing campaign feature for café owners — Phase 2

---

## 4. CURRENT TECHNICAL STATE (as of 2026-07-26)

**Stack:** React + TypeScript + Vite + Tailwind + shadcn/ui + React Router + Supabase
**Live:** gaming-cafe-website.vercel.app
**GitHub:** github.com/sai14april2009/gaming-cafe-website
**Local dev:** D:\PROJECT - PROTOTYPE OF ADVANCED INTERNET CAFE BOOKING\

**Supabase project ID:** zvgfmjzrnzallkwgrgqb
**Admin emails (hardcoded):** srisaikumar.ojjela@gmail.com, sai14april2009@gmail.com, alekhya.ojjela@gmail.com

**Security (as of 2026-07-23):** Availability is now **secure by default**. Customer data
(names/phones in `bookings.players`) is **no longer exposed** — the `bookings` table is locked
down with RLS so the anon key can't read it. Availability queries go through the
`get_booked_slots()` RPC (occupancy only), **not** direct table reads. Full detail in the
"Security hardening" subsection of Section 4. When adding a new surface that needs slot
availability, call the RPC — do NOT `select` from `bookings` as anon/unauthenticated, it will
return 0 rows.

### DB tables (RLS enabled on all)
- `profiles`
- `cafes`
- `gaming_systems`
- `bookings` — columns: `id, user_id (NOT NULL as of 2026-07-24), cafe_id, system_id, booking_date, start_time, end_time, num_people, total_price, status, players, cancellation_reason, created_at`
- `reviews` — columns: `id, cafe_id, user_id, user_name, rating, comment, created_at, rating_systems, rating_internet, rating_cleanliness, rating_staff, rating_value` (the 5 nullable category sub-ratings added 2026-07-26; overall `rating` = rounded avg of the filled ones). INSERT gated to verified bookers via `has_visited_cafe()`; SELECT/UPDATE/DELETE author-scoped. See Section 10.
- `review_replies` — columns: `id, review_id (FK→reviews ON DELETE CASCADE), user_id, user_name, comment, created_at`. Flat 2-level threading (review→replies). Added 2026-07-26. SELECT public; INSERT by verified booker of the review's cafe OR that cafe's owner; UPDATE/DELETE author-scoped. See Section 10.
- `repair_slots` — columns: `id, system_id, cafe_id, repair_date, start_hour, end_hour, reason, created_at`
- `walk_in_sessions` — columns: `id, system_id, cafe_id, status (scheduled/active/ended), slots (integer[]), session_date, start_time, end_time, started_at, ended_at, created_at`

### DB-level double-booking guards (LIVE — both applied 2026-07-22)
Postgres exclusion constraints, so Product Rule #1 holds even under a race condition
or a bug in the UI. Both need the `btree_gist` extension (already installed).

- **`bookings_no_overlap`** on `bookings` — `EXCLUDE USING gist (system_id =, booking_date =, int4range(start_hour, end_hour, '[)') &&) WHERE (status = 'confirmed')`.
  Hours are parsed out of the `"HH:MM"` text columns with `split_part`. Note the scope: only `confirmed` rows are guarded, so ending or cancelling a booking releases its slot.
- **`walk_in_no_overlap`** on `walk_in_sessions` — `EXCLUDE USING gist (system_id =, session_date =, int4range(start_time, end_time, '[)') &&) WHERE (status <> 'ended')`.
  `start_time`/`end_time` are already integers here. `ended` rows are excluded so historical overlaps (created before the UI guard existed) don't block the constraint.
- **Not covered: walk-in vs online booking.** Exclusion constraints are single-table, so that direction is enforced only by app-level checks (now on every write path). See Section 9 for the Phase 2 trigger.

### Security hardening — bookings table lockdown (LIVE, 2026-07-23)
Before this, the `bookings` table had two `public` RLS policies (`Anyone can view
bookings` / `Anyone can insert bookings`). Because the anon key ships in the client
bundle, **anyone could read every customer's name + phone from the `players` jsonb, or
insert bookings while logged out.** Closed in two halves:

- **`get_booked_slots(p_system_ids uuid[], p_date date)`** — `SECURITY DEFINER`, `stable`,
  returns `TABLE(system_id uuid, start_time text, end_time text)` for `confirmed` bookings
  only. **No `user_id`, `players`, or price.** Availability reads go through this RPC, not
  the table, so logged-out visitors still see which slots are taken without seeing PII.
  `execute` granted to `anon, authenticated`. Both availability call sites use it:
  `AdvancedBookingInterface` (the grid) and `BookingConfirm` (the pre-insert re-check).
- **RLS lockdown on `bookings`** — the two `public` policies were dropped and replaced with
  three scoped policies (RLS confirmed enabled):
  - `Owners view their cafe bookings` — SELECT, `authenticated`, `EXISTS cafe where owner_id = auth.uid()`
  - `Customers view their own bookings` — SELECT, `authenticated`, `user_id = auth.uid()`
  - `Customers insert their own bookings` — INSERT, `authenticated`, `user_id = auth.uid() AND NOT (owner of that cafe)`
  - The pre-existing `Cafe owners can update their cafe's bookings` (UPDATE) was left intact —
    the dashboard's status writes (cancel, complete, add-hour) depend on it.

**Verified against real data (role simulation + live anon fetch):**

| Actor | Direct read of `bookings` | Availability via RPC | Insert |
|-------|---------------------------|----------------------|--------|
| anon (logged out) | **0 rows** (was 15 w/ PII) | ✅ works | ❌ blocked (42501) |
| owner | all their cafe's rows (15) | ✅ | ❌ own-cafe blocked (42501) |
| customer | **only their own** (2 of 15) | ✅ | ✅ their own allowed |

Where it lives: **code half = commit `0892dbf6`** (the two RPC call-site swaps); **DB half =
Supabase migration `lock_down_bookings_rls`** plus the `get_booked_slots` function migration.
The SQL is NOT in the repo (no migrations dir — schema is inferred); it lives only in
Supabase's migration history. To reproduce on another project, re-create the function and the
three policies.

**Pattern — customer-facing "my own X" queries need an explicit `.eq("user_id", user.id)`.**
Do NOT rely on RLS alone to scope a "my bookings"-style page. The founder/test account is
both a customer AND a cafe owner, so the `bookings` SELECT policies OR together: the owner
policy returns that account's *whole cafe's* rows on top of its own. RLS scopes a *pure*
customer correctly, but an owner-customer sees far more. Always add the explicit
`.eq("user_id", user.id)` filter (a strict subset of what RLS allows, so it can't leak) —
e.g. `MyBookings.tsx`. Verified: with the filter the owner-customer sees only their own 8
rows, not all 11 on their cafe.

### Completed (as of 2026-07-22)
- Full auth, profiles, browse cafes, advanced booking flow
- Café registration → Admin approval → public listing
- Owner dashboard with Overview, Cafe Details, Gaming Systems, Bookings tabs
- Steam game search via Vercel edge function
- Reviews system
- RLS on all tables
- Supabase auto-pause prevented via cron-job.org
- vercel.json fixed for /api/ routes
- Bookings save with all columns (user_id, cafe_id, system_id, players jsonb)
- BookingsList shows full booking detail including player name + phone
- Double-booking prevention via real DB fetch in AdvancedBookingInterface
- Login required before booking (all 3 entry points)
- Contextual inline slot conflict error messages
- Repair slots: owner UI in Bookings tab, customers see purple REPAIR
- Walk-in sessions: slot selector, timer (progress bar + end time), Add 1 Hour, End Session
- Walk-in conflict popup: 3-option resolution (move / cancel+refund / call+reschedule)
- Walk-in OCCUPIED slots show orange on customer booking page
- Walk-in proportional pricing: price breakdown before start, amount to collect at session end
- Walk-in 20-minute cutoff: hard block when <20 min left AND next slot booked online
- Walk-in soft warning when <20 min left but next slot free
- Walk-in next-slot suggestion when next slot is free

#### Added 2026-07-19 → 2026-07-22
- Dashboard tabs restructured: Overview | Cafe Details | Gaming Systems | Live Now | Advanced Booking | Booking History
- Online bookings shown in Live Now with +Add 1 Hour (extra-hour price collection popup) and End Session (marks `completed`)
- RLS UPDATE policy added on `bookings` so owners can modify customer-owned rows; `bookings_status_check` widened to allow `completed`
- **DB exclusion constraint `bookings_no_overlap`** — true server-side double-booking prevention (btree_gist + int4range on hour range, `where status = 'confirmed'`). Product Rule #1 is now enforced by Postgres, not just the UI.
- **Opening-hours bug FIXED** — slot grids derive from the café's `opening_time`/`closing_time` in SystemsManager + DbCafeDetails. First slot rounds up when opening has minutes (6:29 → 7:00); last slot must END by closing (21:32 → last slot starts 20:00).
- Group bookings save ALL selected systems (was saving only the first)
- Non-consecutive slots split into separate DB rows (were stored as one contiguous block)
- Availability re-checked immediately before insert (closes the race window)
- **Local-date helper `src/app/utils/date.ts`** — replaces `toISOString().split("T")[0]`, which shifted IST bookings after midnight to the wrong day. Use `toLocalDateString()` for ALL `booking_date`/`session_date`/`repair_date` values.
- Player-to-slot assignments persisted: one booking row per (system + player + consecutive run), so `players[0]` is the actual person at that machine
- ₹ currency everywhere (was `$` on customer pages, `₹` on dashboard) + `IndianRupee` icons
- Walk-in `scheduled` slots show amber RESERVED, distinct from orange OCCUPIED (`active`)
- RevenueStats reads `num_people` (the column `party_size` never existed)
- **Advanced Booking tab now has a 7-day date picker with per-day count badges** — future bookings were previously invisible in every dashboard surface
- Date-switch race guard in AdvancedBookingInterface; `convertedSystems` memoised so the grid no longer resets and wipes selections
- Past slots/dates blocked in the grid AND validated at submit (covers tabs left open past midnight)
- Booking History scoped to days before today (no more duplicate listings across tabs)
- BookingsList queries scoped per tab (7-day window / 200 most recent) instead of fetching every booking ever taken
- Stale walk-ins from previous days auto-closed on Live Now load

#### Walk-in / RESERVED audit — 2026-07-22
Audited every walk-in path against online bookings. Confirmed clean: **zero** walk-in ↔
online-booking collisions across all 37 sessions, RESERVED correctly blocks online booking
in both the grid and the pre-insert re-check, and slot buttons are disabled for
booked/occupied/reserved. Bugs found and fixed:
- **Walk-in "+Add 1 Hour" ignored other walk-ins** (`LiveSessions.handleAddHour`) — checked only online bookings, so extending a walk-in could swallow a slot held by a RESERVED session. Its online-booking twin `handleAddBookingHour` had always checked both; the walk-in version was missing half the check.
- **"Start Now" on a RESERVED session could cause a physical double-booking** (`LiveSessions.handleActivate`) — it just flipped status to `active` with no checks. An early arrival left the session attached to its reserved slot while the customer physically used a different hour that still showed FREE online. Now: on time → starts; exactly one hour early → offers to claim the current hour too (proportional pricing already charges only minutes played); otherwise blocked.
- **No re-check before creating a walk-in** (`SystemsManager.createWalkInSession`) — the disabled slot buttons read state fetched at load. Now re-verifies against live bookings AND walk-ins immediately before insert, mirroring BookingConfirm.
- **No-show reservations never expired** — the auto-end check only handled `active`, so an unstarted reservation held its slot indefinitely. Now closed quietly once its last slot passes.
- **`walk_in_no_overlap` DB constraint applied** (see above), and functionally verified: a deliberate overlapping insert is rejected with `exclusion_violation`.
- Historical note: the 7 overlapping sessions on hour 9 (2026-07-15) predate the disabled-button guard and are all `ended`. They pollute analytics but are not a live fault.

### Known bugs / in progress
- **IN PROGRESS: Dashboard Gaming Systems tab redesign** — see Section 8 for full spec
- Walk-in sessions currently use a Live System Status grid in the Gaming Systems tab. This is being redesigned — see Section 8.
- **KNOWN GAP (from the Gaming Systems merge, Stage 1 — 2026-07-27):** after merging the
  Advanced Booking tab into the date-aware Gaming Systems grid, **cancelled bookings no longer
  persist a browsable refund reminder** — the owner only sees it at cancel time (in the confirm
  dialog + the cancel modal's cancelled state). Once a slot frees, there's no list surface that
  keeps showing "remember to refund X". **Fast-follow:** a **"Pending Refunds" view** listing
  cancelled-but-unacknowledged bookings, which also pairs with the planned apology-popup and
  cancellation-fee-ledger work.
- ~~**Gaming Systems + Live Now tabs are today-only**~~ — **Gaming Systems now has the 7-day
  date picker as of Stage 1 (2026-07-27).** Live Now is still today-only (future-day management
  there is out of scope for now).
- **RevenueStats counts cancelled bookings** in Total Revenue, and `upcomingBookings` compares a UTC-parsed `booking_date` against `now`, so today's later bookings are not counted as upcoming.
- **Exclusion constraint only covers `status = 'confirmed'`** — ending or cancelling a booking releases its slot from the DB-level guard. Low impact today (past hours are filtered from the grid), but relevant if booking editing is added.
- Mock demo data still ships alongside real data — the homepage lists 7 sample cafés (`mockData.ts`) next to real DB cafés. Decide whether to drop them before real users.

### Remaining backlog
**Critical:**
- Dashboard redesign (Section 8)

**Done 2026-07-23 — Owner cancel booking + refund note (Advanced Booking tab):**
Owner expands a booking row → "Cancel Booking" (shown for `confirmed` bookings only) →
`window.confirm` → writes `status='cancelled', cancellation_reason='owner_cancelled'`
with the same error + 0-rows/RLS handling as `SystemsManager`. A refund reminder is shown
in the detail view for any cancelled booking. The slot frees automatically — `get_booked_slots`
RPC and the `bookings_no_overlap` constraint both filter `status='confirmed'` (verified by
rolled-back simulation). New nullable column `bookings.cancellation_reason` (migration
`add_cancellation_reason_to_bookings`). The two walk-in cancel writes in `SystemsManager`
now populate it too — `cancellation_reason='walkin_conflict_refund'` at `:441` ("Cancel
Online Booking & Refund") and `'customer_agreed_reschedule'` at `:496` ("Customer Agreed —
Request Sent") — so all three write paths (owner-cancel, walk-in-conflict, reschedule) are
covered; the column is no longer half-populated.

**Important:**
- ~~My Bookings page for customers~~ **DONE 2026-07-24** (commit `df6f807e` — see `MyBookings.tsx`)
- ~~Edit/delete own review~~ **DONE 2026-07-25** (commit `5033ce8b` + migration `reviews_update_own_policy`)
- ~~Review section overhaul (verified-booker + categories + threaded replies + owner badge)~~ **DONE 2026-07-26** — migrations `review_overhaul_schema` + `review_overhaul_policies`, `DbReviewsSection.tsx` rewrite. See Section 10.
- Buffer system (Smart Transition Buffer)
- Date picker for Gaming Systems / Live Now tabs (future-day visibility)

**Nice to have:**
- Photos in reviews (see Section 10 — deferred until Storage bucket added)
- RevenueStats: exclude cancelled from revenue, fix upcoming count
- Image upload for cafe cover
- Custom SMTP
- Mobile responsiveness
- Remove mock café data path

---

## 5. WORKING STYLE / PROCESS NOTES

- Founder is **not a developer** — step-by-step instructions, exact commands, exact file locations always.
- Founder works on **Windows with PowerShell** — PowerShell-compatible commands only.
- Local dev path: `D:\PROJECT - PROTOTYPE OF ADVANCED INTERNET CAFE BOOKING\`
- Founder pushes to GitHub regularly; Vercel auto-deploys from main.
- Local files were lost once (accidental deletion of Downloads folder) — GitHub is the source of truth.
- Budget conscious: stay on free tiers (Supabase free, Vercel free) as long as possible.
- Always verify code before pushing — founder checks screenshots and tests before confirming.
- AI should proactively suggest updating PROJECT_BRAIN every few sessions.

---

## 6. HOW TO USE THIS FILE

- Paste this entire file at the start of any new chat for full context.
- Update Section 4 most frequently (it's the changelog).
- Sections 1-3 (vision, rules, scope) should rarely change — any change is a significant pivot.
- AI should flag when new decisions should be added here.

---

## 7. OFFLINE WALK-IN POLICY (designed, partially built)

### The core problem
If a walk-in customer sits at a PC at 3:00 PM, and another customer has that PC booked online at 4:00 PM, the owner needs to know before it becomes a conflict.

### What's built
- Owner can start a walk-in session on any system from the Gaming Systems tab
- Walk-in slots show as OCCUPIED (orange) on customer booking page in real time
- Conflict detection popup appears if walk-in selection overlaps with online booking
- Three resolution options: Move to another system / Cancel online booking + refund / Call customer to reschedule
- Waiting for reschedule state implemented
- Proportional pricing calculated and shown to owner

### Walk-in pricing rules
- Walk-ins pay the café directly (cash/UPI) — NOT through GameOrbit
- GameOrbit takes NO commission on walk-ins in Phase 1
- Price = proportional to actual time played within the slot boundary
- Example: customer arrives 9:20 AM, slot ends 10:00 AM, rate ₹60/hr → customer pays ₹40

### Status colors
- 🟢 FREE — available for booking or walk-in
- 🟠 OCCUPIED — walk-in currently playing
- 🟡 RESERVED — walk-in pre-selected for future slot (owner marked it, not yet active)
- 🔴 BOOKED — confirmed online booking
- 🟣 REPAIR — system under maintenance

### Future walk-in sessions (RESERVED status)
If owner selects future slots for a walk-in (customer waiting), those slots show as RESERVED (yellow/amber) on customer page — distinct from BOOKED (red) because:
- RESERVED can be cancelled instantly by owner
- BOOKED has a paying customer with a confirmation
Customers see the difference and aren't misled

---

## 8. DASHBOARD REDESIGN SPEC (in progress — next build target)

### Current problem
The Gaming Systems tab shows a "Live System Status" grid + a separate "Manage Systems" section. The live status cards don't show the full day's slot picture, and the walk-in flow requires too many taps.

### New design — Gaming Systems tab
Each system card shows a **full day slot grid** directly:

```
Gaming System 1 (PS4)                              [Delete]
────────────────────────────────────────────────────────────
6AM  7AM  8AM  9AM  10AM  11AM  12PM  1PM  2PM  3PM ...
[🟢][🟢][🔴][🟠][🟢 ][🟢 ][🟢 ][🟡][🟢][🟢]
```

- Owner sees entire day at a glance for every system
- Clicking a green slot opens an inline walk-in selection UI on that card
- After confirming walk-in, view refreshes (state refresh, not full page) showing updated slots
- No "Start Walk-in Session" button needed — clicking a slot IS the action
- Opening hours from DB determine which slots are shown (fixes hardcoded bug)

### New "Live Now" tab (beside Gaming Systems)
Shows only systems with active or upcoming sessions today:

```
🟠 System 1 — OCCUPIED
   Walk-in session • Ends 10:00 PM
   ████████░░  [progress bar]
   [+ Add 1 Hour]  [■ End Session]

🟡 System 2 — RESERVED
   Walk-in starts at 8:00 PM
   [▶ Start Now]  [✕ Cancel]
```

- Timer controls (Add 1 Hour, End Session, Start Now) ONLY in this tab
- Gaming Systems tab is for seeing status + starting walk-ins
- Live Now tab is for managing active sessions

### Walk-in selection rules (in slot grid)
1. **Consecutive slots only** — non-consecutive shows warning: "Select only consecutive slots. X:XX PM is missing between your selections."
2. **20-minute cutoff** — hard block if <20 min left in current slot AND next slot is online-booked
3. **Proportional pricing preview** — shown inline as slots are selected
4. **Next slot suggestion** — if next slot after selection is free, suggest adding it
5. **Opening hours respected** — only show slots within café's opening_time to closing_time

### Dashboard tabs (final order)
Overview | Cafe Details | Gaming Systems | Live Now | Advanced Booking | Booking History
*(shipped 2026-07-19: "Bookings" was renamed "Booking History" and "Advanced Booking" added)*

### Files to create/modify
- `SystemsManager.tsx` — full rewrite with slot grid view
- New `LiveSessions.tsx` — new "Live Now" tab component
- `Dashboard.tsx` — add "Live Now" tab

### Phase 2 addition (not now)
Filter bar in Gaming Systems tab: [Free Now] [Occupied Now] [Free at specific time]
For large cafés with 30-50 systems.

---

## 9. FUTURE FEATURES (Phase 2+)

### Customer data & marketing
- Collect: name (✅ already at booking), phone (✅ already), email (✅ via auth), city (collect at signup as dropdown)
- Location collected passively — city from signup, specific café city from bookings
- Never ask for GPS — customers distrust it
- Marketing campaigns: owners can send emails/SMS to customers who visited their café
  * Basic (free): 1 campaign/month, up to 100 customers
  * Premium (paid): unlimited campaigns, segmentation, open rate analytics
  * Frequency cap: max 2 messages/customer/week from any café
  * Opt-in required at signup
  * Owners can only market to their own past customers, not the full GameOrbit database
- This becomes GameOrbit's second revenue stream after booking commissions

### Pre-set walk-in only slots
Based on SevenRooms pattern: café owners can designate specific systems as "walk-in only" during peak hours. Online customers cannot book those systems during those times. Protects walk-in revenue during busy periods.

### Per-system buffer override
Currently buffer is one setting for the whole café. Phase 2: each system can have its own buffer time (e.g. VR stations need 30 min, regular PCs need 10 min).

### DB hardening: cross-table walk-in ↔ booking trigger
**Decision 2026-07-22: deferred to Phase 2 — app-level checks are sufficient for Phase 1.**

`bookings_no_overlap` and `walk_in_no_overlap` each guard their own table, but Postgres
exclusion constraints cannot span two tables, so a walk-in overlapping an *online booking*
is prevented only in application code (`BookingConfirm` pre-insert re-check,
`SystemsManager.createWalkInSession` pre-insert re-check, `LiveSessions.handleAddHour` /
`handleAddBookingHour`). Audited 2026-07-22: zero such collisions in real data.

To close it properly in Phase 2, add `BEFORE INSERT OR UPDATE` triggers on **both** tables
that reject a row overlapping the other table on the same `system_id` + date. Do it when
booking editing/rescheduling lands, since that multiplies the write paths that must stay
correct. Revisit sooner if any collision is ever observed in production.

### Security follow-ups from the 2026-07-23 bookings lockdown
Not blocking, but do before the features that touch them:
- **RESOLVED 2026-07-24 — the 5 legacy NULL-`user_id` rows.** Investigated: all were
  pre-auth-enforcement test bookings on the test cafe (names `guest`/`guest2`/`player friday`,
  placeholder phone `1234567890`, no email), created Jul 1–3, unattributable to any auth user
  (phone maps ambiguously to 2 test accounts, name matches none). Deleted after a JSON backup
  (scoped `where user_id is null and cafe_id = <test cafe>`, 5 rows, table 15 → 10), then
  `user_id` was made **NOT NULL** (migration `bookings_user_id_not_null`) so attribution is now
  DB-guaranteed — verified a NULL insert is rejected with SQLSTATE 23502 even bypassing RLS.
  `BookingConfirm.handleConfirm` also gained an early `if (!user)` guard (clean "please log in"
  message instead of a raw DB error).
- **UPDATE policy role inconsistency (minor cleanup)** — `Cafe owners can update their cafe's
  bookings` is scoped to role `{public}` while the three new policies use `{authenticated}`.
  Not a hole (its `auth.uid()` owner-check fails for anon), just inconsistent; re-create it as
  `to authenticated` when convenient.

---

## 10. REVIEW SECTION OVERHAUL (BUILT 2026-07-26)

**Status: LIVE.** Applied as migrations `review_overhaul_schema` + `review_overhaul_policies`
(DB) and a full rewrite of `DbReviewsSection.tsx` (code). Verified by role simulation before
commit — see the matrix at the end of this section. Reviews/replies tables are empty (0 rows)
at build time, so the section renders its empty state until real completed sessions accrue.

**One deviation from the original plan — the eligibility rule was loosened** (founder's call):
verified = **`status IN ('completed','confirmed') AND booking_date < today` (IST)**, i.e. a
non-cancelled booking whose day has already passed — NOT strict `completed`-only. Reason:
only 1 booking is `completed` (that status is set manually via Live Now "End Session"), so
strict would gate out nearly everyone. The helper is named **`has_visited_cafe(uuid)`**
(SECURITY DEFINER), not `has_completed_booking_at_cafe`.

### Locked decisions

1. **Only verified bookers can write a review.** Verified = `has_visited_cafe(cafe_id)` =
   the user has a booking on this cafe with `status IN ('completed','confirmed')` AND
   `booking_date < today` (IST). (Loosened from the original strict `completed`-only — see
   the deviation note above.)
2. **Owners cannot review their own cafe.** They can only reply to others' reviews.
   Enforced in the INSERT policy `with_check`.
3. **The one existing test review has already been deleted** by the founder (verified
   2026-07-26: `select count(*) from reviews = 0`).
4. **Replies are restricted** to verified bookers of that cafe + the cafe owner.
   Not "any signed-in user" (rejected the YouTube-open model). Also enforced at RLS.
5. **5 sub-rating categories** (see below). Overall star rating = rounded average of
   the categories the customer filled in. Categories are optional individually —
   customer can rate 3 of 5 if they only care about those — but at least one
   category is required to submit.

### Eligibility tradeoff (accepted, deliberate decision)

The gate is `status IN ('completed','confirmed') AND booking_date < today`. This means a
**confirmed booking whose date has passed counts as eligible even if the customer never
attended** (a no-show). This is a deliberate, accepted tradeoff:

- **(a) False-DENIAL is worse than false-AWARD.** A real attendee wrongly blocked from
  reviewing is both more likely and more harmful than a no-show wrongly allowed to review.
  We optimize against the harmful, common case.
- **(b) Fake-booking-for-reviews is economically irrational at our scale.** Booking a paid
  slot purely to leave a review costs real money/effort, so gaming the badge this way
  doesn't pay off for anyone at current volumes.
- **(c) The badge wording is truthful.** It says **"Verified booking"**, NOT "attendance" —
  so it reflects exactly what is checked (a real, past, non-cancelled booking), and promises
  nothing about physically showing up.

**KNOWN LIMITATION to revisit at volume:** at large booking counts, no-show false-awards
accumulate and could erode badge credibility. If/when that becomes material, reconsider an
attendance-based signal — e.g. a `checked_in_at` timestamp set when the owner starts the
session in Live Now — and gate on that instead of (or in addition to) past-date confirmed.

### The 5 categories (gaming-cafe specific)

| # | Category | What it rates |
|---|---|---|
| 1 | **Gaming Systems** | Hardware quality — CPU/GPU, monitor, peripherals, chair. This is the core product. |
| 2 | **Internet Speed** | Latency, stability, bandwidth. Non-negotiable for online gaming; deserves its own line, not lumped under amenities. |
| 3 | **Cleanliness & Comfort** | Physical space, keyboard/desk hygiene, temperature, lighting. Gamers sit 2–4+ hours. |
| 4 | **Staff & Service** | Helpfulness, responsiveness when something breaks, quick issue resolution. Unlike Airbnb self-check-in, cafes are staffed. |
| 5 | **Value** | Worth the price paid? Aggregates the other four against price. |

If trimming ever needed, priority order is: **Gaming Systems > Internet Speed > Value
> Cleanliness > Staff & Service**. Top 3 covers the most decision-critical signal.

### Schema changes (APPLIED — migration `review_overhaul_schema`)

```sql
-- 1. Category sub-rating columns on reviews (all nullable, all 1..5)
alter table public.reviews
  add column if not exists rating_systems     smallint check (rating_systems     between 1 and 5),
  add column if not exists rating_internet    smallint check (rating_internet    between 1 and 5),
  add column if not exists rating_cleanliness smallint check (rating_cleanliness between 1 and 5),
  add column if not exists rating_staff       smallint check (rating_staff       between 1 and 5),
  add column if not exists rating_value       smallint check (rating_value       between 1 and 5);

-- 2. Threaded replies (flat 2-level: review -> replies)
create table if not exists public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id   uuid not null references auth.users(id)     on delete cascade,
  user_name text not null,
  comment   text not null,
  created_at timestamp without time zone default now()
);
alter table public.review_replies enable row level security;
```

### RLS changes (APPLIED — migration `review_overhaul_policies`)

**Helper function `has_visited_cafe`** (`SECURITY DEFINER`; also called from the UI via
`supabase.rpc("has_visited_cafe", { p_cafe_id })` to gate the "Write a Review" button):
```sql
create or replace function public.has_visited_cafe(p_cafe_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b
    where b.user_id = auth.uid()
      and b.cafe_id = p_cafe_id
      and b.status in ('completed','confirmed')          -- loosened (see deviation note)
      and b.booking_date < (now() at time zone 'Asia/Kolkata')::date
  );
$$;
revoke all on function public.has_visited_cafe(uuid) from public;
grant execute on function public.has_visited_cafe(uuid) to authenticated;
```

**Reviews INSERT policy** (replaced the old `Users can insert reviews`):
```sql
create policy "Verified bookers can insert reviews"
on public.reviews for insert to authenticated
with check (
  auth.uid() = user_id
  and public.has_visited_cafe(cafe_id)
  and not exists (select 1 from public.cafes c where c.id = cafe_id and c.owner_id = auth.uid())
);
```
Existing SELECT / UPDATE / DELETE policies on `reviews` stay as-is (all author-scoped) —
so edit/delete-own-review (Section: commit `5033ce8b`) still works alongside this.
Replies' policies use `has_visited_cafe(r.cafe_id)` in the same shape.

**Review replies policies:**
```sql
create policy "Anyone can view replies"
  on public.review_replies for select using (true);

create policy "Verified bookers or cafe owner can reply"
  on public.review_replies for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.reviews r
      where r.id = review_id
        and (
          public.has_completed_booking_at_cafe(r.cafe_id)
          or exists (select 1 from public.cafes c where c.id = r.cafe_id and c.owner_id = auth.uid())
        )
    )
  );

create policy "Users can update own reply"
  on public.review_replies for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own reply"
  on public.review_replies for delete to authenticated
  using (auth.uid() = user_id);
```

### UI (planned — `DbReviewsSection.tsx`)

- **Gate "Write a Review"** on `has_completed_booking_at_cafe` RPC. Non-eligible users
  see: *"Only customers who've completed a session at this cafe can leave a review."*
- **Owner** viewing their own cafe never sees "Write a Review" — they see "Reply" affordances only.
- **Review form**: 5 category star-rows instead of the single row. Overall rating computed live.
- **Review card**: overall stars + per-category breakdown (compact row of 5 mini-ratings);
  **Verified booking** badge on every review (since gate guarantees it — cheap trust signal);
  **Reply** button → inline reply composer (verified bookers + owner only).
- **Owner badge**: any reply where `reply.user_id === cafe.owner_id` gets a distinctive
  **"Cafe Owner"** pill (purple, matching brand). Any review with such a reply shows a
  **"Cafe owner replied"** marker at the top of the review card — highly visible trust signal.
- **YouTube-style toggle**: replies collapsed by default under a **"View N replies"** button.

### Verification (DONE 2026-07-26 — role simulation, all rolled back)

| Actor | Review INSERT | Reply INSERT |
|---|---|---|
| Verified booker (`2e4d7d4c`, past booking) | ✅ | ✅ |
| Future-only booking (`3cc63011`, not eligible) | ❌ | ❌ |
| Cafe owner (`0d41c503`) | ❌ (owner block) | ✅ |
| Anon | ❌ | ❌ |

Each test seeded a review as superuser, switched role via `set_config`, attempted both
inserts inside caught sub-blocks, then RAISEd to roll back. Confirmed 0 reviews / 0 replies
persisted afterward.

### What's deferred / rejected

- **Photos in reviews** — requires Supabase Storage bucket + upload + moderation.
  Deferred until Storage is set up (a whole other decision).
- **Helpful votes, sort/filter, keyword chips** — rejected for now. All require
  review volume (>20/cafe) to earn their keep. Revisit post-launch.
- **Report/flag abuse** — needed before real scale, not before.


