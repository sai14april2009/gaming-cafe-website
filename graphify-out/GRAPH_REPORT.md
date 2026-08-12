# Graph Report - .  (2026-08-11)

## Corpus Check
- 97 files · ~57,742 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 663 nodes · 1129 edges · 97 communities (40 shown, 57 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Avatar & Navigation
- UI Input & Sidebar
- App Routing & Admin
- Package Dependencies
- Booking Interface & Slots
- Alert Dialog Components
- Badge & Checkbox UI
- Command Palette UI
- Dashboard & Bookings
- Cafe Details & Registration
- Menubar UI
- Cafe Editor & Steam
- Context Menu UI
- Dropdown Menu UI
- Radix UI Dependencies
- Reviews & Ratings
- Carousel UI
- Form Components
- CLAUDE.md Schema & Auth
- CLAUDE.md Project Config
- Module Group 20
- Module Group 21
- Module Group 22
- Module Group 23
- Module Group 24
- Module Group 25
- Module Group 26
- Module Group 27
- Module Group 28
- Module Group 29
- Module Group 30
- Module Group 31
- Module Group 32
- Module Group 33
- Module Group 34
- Module Group 36
- Module Group 38
- Module Group 39
- Module Group 40
- Module Group 41
- Module Group 42
- Module Group 43
- Module Group 44
- Module Group 45
- Module Group 46
- Module Group 47
- Module Group 48
- Module Group 49
- Module Group 50
- Module Group 51
- Module Group 52
- Module Group 53
- Module Group 54
- Module Group 55
- Module Group 56
- Module Group 57
- Module Group 58
- Module Group 59
- Module Group 60
- Module Group 61
- Module Group 62
- Module Group 63
- Module Group 64
- Module Group 65
- Module Group 66
- Module Group 67
- Module Group 68
- Module Group 69
- Module Group 70
- Module Group 71
- Module Group 72
- Module Group 73
- Module Group 74
- Module Group 75
- Module Group 76
- Module Group 77
- Module Group 78
- Module Group 79
- Module Group 80
- Module Group 81
- Module Group 82
- Module Group 83
- Module Group 84
- Module Group 85
- Module Group 86
- Module Group 90
- Module Group 92
- Module Group 93
- Module Group 94
- Module Group 96

## God Nodes (most connected - your core abstractions)
1. `cn()` - 223 edges
2. `supabase` - 20 edges
3. `toLocalDateString()` - 18 edges
4. `Button()` - 17 edges
5. `useAuth()` - 17 edges
6. `Supabase Backend (Postgres + Auth)` - 11 edges
7. `SystemsManager()` - 9 edges
8. `buttonVariants` - 9 edges
9. `GameSpot (Gaming Cafe Booking Website)` - 9 edges
10. `crossesMidnight()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `@supabase/supabase-js Dependency` --implements--> `Supabase Backend (Postgres + Auth)`  [INFERRED]
  package.json → CLAUDE.md
- `Vercel SPA Rewrite Configuration` --implements--> `Vercel Hosting (gaming-cafe-website.vercel.app)`  [INFERRED]
  vercel.json → CLAUDE.md
- `Radix UI Component Library` --implements--> `Tailwind v4 + shadcn/ui Styling`  [INFERRED]
  package.json → CLAUDE.md
- `README - Gaming Cafe Booking Website` --references--> `GameSpot (Gaming Cafe Booking Website)`  [INFERRED]
  README.md → CLAUDE.md
- `package.json (@figma/my-make-file)` --references--> `Figma Make Scaffold Origin`  [EXTRACTED]
  package.json → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Supabase Database Schema (All Tables)** — claude_md_table_profiles, claude_md_table_cafes, claude_md_table_cafe_hours, claude_md_table_gaming_systems, claude_md_table_bookings, claude_md_table_walk_in_sessions, claude_md_table_repair_slots, claude_md_table_reviews, claude_md_table_review_replies [EXTRACTED 1.00]
- **Double-Booking Prevention System (DB Constraints + App-Level Checks)** — claude_md_double_booking_prevention, claude_md_bookings_no_overlap, claude_md_walk_in_no_overlap, claude_md_get_booked_slots_rpc, claude_md_cross_table_trigger [EXTRACTED 1.00]
- **Market Expansion Strategy (India -> Korea -> China)** — claude_md_market_phase1_india, claude_md_market_phase2_korea, claude_md_market_phase3_china [EXTRACTED 1.00]

## Communities (97 total, 57 thin omitted)

### Community 0 - "UI Avatar & Navigation"
Cohesion: 0.09
Nodes (33): Avatar(), AvatarFallback(), AvatarImage(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage() (+25 more)

### Community 1 - "UI Input & Sidebar"
Cohesion: 0.07
Nodes (35): Input(), Separator(), Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup() (+27 more)

### Community 2 - "App Routing & Admin"
Cohesion: 0.11
Nodes (19): ADMIN_EMAILS, AdminApprovals(), AdminCafe, BookingConfirm(), BookingData, PlayerInfo, SlotAssignment, BrowseCafes() (+11 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.07
Nodes (29): devDependencies, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-react, name, vite, peerDependencies (+21 more)

### Community 4 - "Booking Interface & Slots"
Cohesion: 0.14
Nodes (19): AdvancedBookingInterface(), AdvancedBookingInterfaceProps, SystemBookingState, TimeSlotState, ClosedSlotMarker(), ClosedSlotMarkerProps, formatHour(), ConflictInfo (+11 more)

### Community 5 - "Alert Dialog Components"
Cohesion: 0.10
Nodes (17): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogTitle() (+9 more)

### Community 6 - "Badge & Checkbox UI"
Cohesion: 0.10
Nodes (10): Badge(), badgeVariants, Checkbox(), HoverCardContent(), Progress(), ResizableHandle(), ResizablePanelGroup(), Slider() (+2 more)

### Community 7 - "Command Palette UI"
Cohesion: 0.12
Nodes (14): Command(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator(), CommandShortcut(), Dialog() (+6 more)

### Community 8 - "Dashboard & Bookings"
Cohesion: 0.19
Nodes (13): BookingsList(), BookingsListProps, toToday(), GamingSystem, RepairSlot, RepairSlotsManager(), RepairSlotsManagerProps, RevenueStats() (+5 more)

### Community 9 - "Cafe Details & Registration"
Cohesion: 0.20
Nodes (14): DbCafe, DbCafeDetails(), DbGamingSystem, formatTimeHint(), RegisterCafe(), RegisterCafeProps, gameImages, CafeHoursSchedule (+6 more)

### Community 10 - "Menubar UI"
Cohesion: 0.12
Nodes (11): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarRadioItem(), MenubarSeparator(), MenubarShortcut() (+3 more)

### Community 11 - "Cafe Editor & Steam"
Cohesion: 0.15
Nodes (13): AMENITY_SUGGESTIONS, CafeEditor(), CafeEditorProps, formatTimeHint(), SteamGame, GamingSystem, LiveItem, LiveSessions() (+5 more)

### Community 12 - "Context Menu UI"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 13 - "Dropdown Menu UI"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 14 - "Radix UI Dependencies"
Cohesion: 0.13
Nodes (15): class-variance-authority, next-themes, dependencies, class-variance-authority, next-themes, @radix-ui/react-dropdown-menu, @radix-ui/react-slider, @radix-ui/react-switch (+7 more)

### Community 15 - "Reviews & Ratings"
Cohesion: 0.17
Nodes (10): CATEGORIES, CategoryKey, computeOverall(), DbReviewsSection(), DbReviewsSectionProps, formatDate(), ratingsToColumns(), Reply (+2 more)

### Community 16 - "Carousel UI"
Cohesion: 0.19
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 17 - "Form Components"
Cohesion: 0.20
Nodes (11): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+3 more)

### Community 18 - "CLAUDE.md Schema & Auth"
Cohesion: 0.22
Nodes (13): Review Eligibility Tradeoff (False-Denial > False-Award), has_visited_cafe() DB Function, Midnight-Crossing Schedule Fix, Review Section Overhaul (5-Category Verified Reviews), Supabase Backend (Postgres + Auth), cafe_hours Table, cafes Table, gaming_systems Table (+5 more)

### Community 19 - "CLAUDE.md Project Config"
Cohesion: 0.18
Nodes (12): Admin Email Allowlist (Hardcoded in Root.tsx), Figma Make Scaffold Origin, GameSpot (Gaming Cafe Booking Website), Steam Search API Proxy (api/steam-search.ts), Tailwind v4 + shadcn/ui Styling, Vercel Hosting (gaming-cafe-website.vercel.app), Vite + React + TypeScript Stack, package.json (@figma/my-make-file) (+4 more)

### Community 20 - "Module Group 20"
Cohesion: 0.24
Nodes (8): BookingCard(), cancellationText(), formatDate(), hasEnded(), MyBookings(), nowHHMM(), Tab, to12h()

### Community 21 - "Module Group 21"
Cohesion: 0.20
Nodes (11): bookings_no_overlap Exclusion Constraint, Cross-Table Walk-in/Booking DB Trigger (Phase 2), Zero Tolerance Double-Booking Prevention, get_booked_slots() RPC Function, Proportional Walk-in Pricing, RLS Lockdown on bookings Table, bookings Table, walk_in_sessions Table (+3 more)

### Community 22 - "Module Group 22"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 23 - "Module Group 23"
Cohesion: 0.18
Nodes (6): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerTitle()

### Community 24 - "Module Group 24"
Cohesion: 0.18
Nodes (7): SelectContent(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator(), SelectTrigger()

### Community 25 - "Module Group 25"
Cohesion: 0.18
Nodes (7): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle()

### Community 26 - "Module Group 26"
Cohesion: 0.22
Nodes (9): NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle (+1 more)

### Community 27 - "Module Group 27"
Cohesion: 0.22
Nodes (9): Business Model (Commissions + SaaS + Premium Listings), Sri Sai Kumar Ojjela (Founder), GameOrbit Company Vision, Group Booking Constraint Algorithm, Phase 1 - India Market, Phase 2 - South Korea Market (PC Bangs), Phase 3 - China Market, Marketing Campaign Feature (Phase 2+) (+1 more)

### Community 28 - "Module Group 28"
Cohesion: 0.43
Nodes (5): ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 29 - "Module Group 29"
Cohesion: 0.40
Nodes (5): Day Is Not A Data Primitive (Key Principle), iCafeCloud (Korean PC Bang Software), Option 3: Session-First Day-Agnostic Model, Oracle Simphony (Enterprise Hospitality POS), Smart Transition Buffer (Slot Compression)

### Community 30 - "Module Group 30"
Cohesion: 0.40
Nodes (3): AccordionContent(), AccordionItem(), AccordionTrigger()

### Community 31 - "Module Group 31"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 32 - "Module Group 32"
Cohesion: 0.40
Nodes (3): InputOTP(), InputOTPGroup(), InputOTPSlot()

## Knowledge Gaps
- **159 isolated node(s):** `config`, `name`, `private`, `version`, `type` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `UI Avatar & Navigation` to `UI Input & Sidebar`, `Alert Dialog Components`, `Badge & Checkbox UI`, `Command Palette UI`, `Menubar UI`, `Cafe Editor & Steam`, `Context Menu UI`, `Dropdown Menu UI`, `Carousel UI`, `Form Components`, `Module Group 22`, `Module Group 23`, `Module Group 24`, `Module Group 25`, `Module Group 26`, `Module Group 28`, `Module Group 30`, `Module Group 31`, `Module Group 32`, `Module Group 33`?**
  _High betweenness centrality (0.325) - this node is a cross-community bridge._
- **Why does `Button()` connect `Cafe Editor & Steam` to `UI Avatar & Navigation`, `UI Input & Sidebar`, `App Routing & Admin`, `Module Group 34`, `Booking Interface & Slots`, `Alert Dialog Components`, `Dashboard & Bookings`, `Cafe Details & Registration`, `Reviews & Ratings`, `Carousel UI`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Radix UI Dependencies` to `Package Dependencies`, `Module Group 39`, `Module Group 40`, `Module Group 41`, `Module Group 42`, `Module Group 43`, `Module Group 44`, `Module Group 45`, `Module Group 46`, `Module Group 47`, `Module Group 48`, `Module Group 49`, `Module Group 50`, `Module Group 51`, `Module Group 52`, `Module Group 53`, `Module Group 54`, `Module Group 55`, `Module Group 56`, `Module Group 57`, `Module Group 58`, `Module Group 59`, `Module Group 60`, `Module Group 61`, `Module Group 62`, `Module Group 63`, `Module Group 64`, `Module Group 65`, `Module Group 66`, `Module Group 67`, `Module Group 68`, `Module Group 69`, `Module Group 70`, `Module Group 71`, `Module Group 72`, `Module Group 73`, `Module Group 74`, `Module Group 75`, `Module Group 76`, `Module Group 77`, `Module Group 78`, `Module Group 79`, `Module Group 80`, `Module Group 81`, `Module Group 82`, `Module Group 83`, `Module Group 84`, `Module Group 85`, `Module Group 86`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `config`, `name`, `private` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Avatar & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.08780487804878048 - nodes in this community are weakly interconnected._
- **Should `UI Input & Sidebar` be split into smaller, more focused modules?**
  _Cohesion score 0.06585365853658537 - nodes in this community are weakly interconnected._
- **Should `App Routing & Admin` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._