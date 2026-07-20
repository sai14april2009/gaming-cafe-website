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
*Last updated: 2026-07-18*

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
- 🔲 Dashboard redesign — Gaming Systems tab shows full day slot grid per system (IN PROGRESS)
- 🔲 "Live Now" tab — separate tab for active/upcoming sessions with timer controls
- 🔲 Walk-in RESERVED status — future walk-in slots show as yellow RESERVED on customer page
- 🔲 Slot grid respects café opening hours (currently hardcoded 8AM-10PM — BUG)
- 🔲 Owner cancel booking + refund note
- 🔲 My Bookings page for customers (/my-bookings)
- 🔲 Edit/delete own review (customer)
- 🔲 Photos in reviews
- 🔲 RevenueStats fix (shows empty/mock data)
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

## 4. CURRENT TECHNICAL STATE (as of 2026-07-18)

**Stack:** React + TypeScript + Vite + Tailwind + shadcn/ui + React Router + Supabase
**Live:** gaming-cafe-website.vercel.app
**GitHub:** github.com/sai14april2009/gaming-cafe-website
**Local dev:** D:\PROJECT - PROTOTYPE OF ADVANCED INTERNET CAFE BOOKING\

**Supabase project ID:** zvgfmjzrnzallkwgrgqb
**Admin emails (hardcoded):** srisaikumar.ojjela@gmail.com, sai14april2009@gmail.com, alekhya.ojjela@gmail.com

### DB tables (RLS enabled on all)
- `profiles`
- `cafes`
- `gaming_systems`
- `bookings` — columns: `id, user_id, cafe_id, system_id, booking_date, start_time, end_time, num_people, total_price, status, players, created_at`
- `reviews`
- `repair_slots` — columns: `id, system_id, cafe_id, repair_date, start_hour, end_hour, reason, created_at`
- `walk_in_sessions` — columns: `id, system_id, cafe_id, status (scheduled/active/ended), slots (integer[]), session_date, start_time, end_time, started_at, ended_at, created_at`

### Completed (as of 2026-07-18)
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

### Known bugs / in progress
- **BUG: Slot grid hardcoded 8AM-10PM** — should respect café's actual opening_time and closing_time from DB. Currently `todaySlots = Array.from({ length: 15 }, (_, i) => i + 8)` in SystemsManager.tsx. Must be fixed before dashboard redesign.
- **IN PROGRESS: Dashboard Gaming Systems tab redesign** — see Section 8 for full spec
- Walk-in sessions currently use a Live System Status grid in the Gaming Systems tab. This is being redesigned — see Section 8.

### Remaining backlog
**Critical:**
- Dashboard redesign (Section 8)
- Opening hours bug fix
- Owner cancel booking + refund note

**Important:**
- My Bookings page for customers
- Edit/delete own review
- Buffer system (Smart Transition Buffer)

**Nice to have:**
- Photos in reviews
- RevenueStats fix
- Image upload for cafe cover
- Custom SMTP
- Mobile responsiveness

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
Overview | Cafe Details | Gaming Systems | Live Now | Bookings

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


