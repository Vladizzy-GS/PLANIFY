# PLANIFY-GS — Architecture & Logic Reference

This document is the authoritative source for understanding the PLANIFY-GS codebase. It is intended for AI assistants (Claude) and developers to fully understand the system before making changes.

---

## 1. What is PLANIFY-GS?

PLANIFY-GS is a **team scheduling and management platform** for a company with multiple branches (cities). Features:
- **Horaire (Schedule)**: A full calendar (Day / Week / Month) showing employee events with city-based travel tracking.
- **Tâches (Tasks)**: Task management with overdue/upcoming views.
- **Priorités (Priorities)**: Priority task tracking with status workflow.
- **Fournisseurs (Suppliers/Map)**: Supplier map using Leaflet.
- **Alertes (Alerts)**: Alert notification system.
- **Assistant IA**: AI chat assistant.
- **Tableau Admin**: Admin dashboard (admin only).
- **Paramètres**: Settings.

---

## 2. Tech Stack

- **Framework**: Next.js 15 (App Router, force-dynamic pages)
- **Language**: TypeScript + React 19
- **Auth + DB**: Supabase (PostgreSQL + Auth)
- **State**: Zustand 5 (no SSR – all `'use client'` stores)
- **Styling**: Inline React styles + CSS variables in `app/globals.css`
- **Map**: Leaflet + react-leaflet
- **Theme**: CSS `data-theme` attribute on `<html>` (`dark` default / `light` toggle)

---

## 3. File Structure

```
planify-gs/
├── app/
│   ├── globals.css                    # CSS variables (dark + light themes)
│   ├── (app)/
│   │   ├── layout.tsx                 # Server layout: fetches profile, employees, branches, badges → passes to AppShell
│   │   ├── AppShell.tsx               # Client sidebar: nav, employee list, progress %, déplacements, theme toggle
│   │   ├── schedule/
│   │   │   ├── page.tsx               # Server: fetches events, employees, branches → ScheduleClient
│   │   │   └── ScheduleClient.tsx     # Full calendar (WeekView / DayView / MonthView) + EventModal
│   │   ├── tasks/
│   │   │   ├── page.tsx
│   │   │   └── TasksClient.tsx        # Event task cards + Priority cards
│   │   ├── priorities/
│   │   │   ├── page.tsx
│   │   │   └── PrioritiesClient.tsx
│   │   ├── alerts/
│   │   │   ├── page.tsx
│   │   │   └── AlertsClient.tsx
│   │   ├── map/
│   │   │   ├── page.tsx
│   │   │   ├── MapClient.tsx
│   │   │   └── LeafletMap.tsx
│   │   ├── ai/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   ├── dashboard/             # Admin-only dashboard
│   │   │   └── settings/              # Admin settings
│   │   └── settings/
│   │       └── page.tsx
├── stores/
│   ├── useCalendarStore.ts            # calMode, wkStart, dayView, monView, calEvents, branches
│   ├── useSessionStore.ts             # role, myEmployeeId, selectedEmployeeId, isAdmin
│   └── useTasksStore.ts              # Tasks UI layout (colRatio, section visibility) — persisted
├── types/
│   └── database.ts                    # All DB types: Event, Employee, Branch, Priority, Alert, Profile, Supplier
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # createClient() for browser
│   │   └── server.ts                  # createClient() for server (async)
│   └── utils/
│       └── dates.ts                   # Date helpers: todayStr, addDays, eventVisibleOn, formatHour, isoWeek, etc.
```

---

## 4. Database Models (`types/database.ts`)

### `Event`
The core scheduling object:
```typescript
{
  id: string
  employee_id: string          // FK → employees.id
  title: string
  start_date: string           // YYYY-MM-DD
  end_date: string             // YYYY-MM-DD
  start_hour: number           // 0–23 (ignored if all_day)
  end_hour: number             // 0–23 (ignored if all_day)
  color: string                // hex color for display
  all_day: boolean
  priority_level: 'Faible' | 'Moyen' | 'Élevé'
  repeat_rule: 'Aucune' | 'Chaque semaine' | 'Chaque mois' | 'Chaque année'
  repeat_end_date: string | null
  branch_ids: string[]         // FK[] → branches.id — THIS IS THE CITY/LOCATION FIELD
  done: boolean
  assigned_by: string | null
  alert_linked: boolean
  linked_priority_id: string | null
  created_at: string
  updated_at: string
}
```
**Key rule**: `branch_ids` is how you know WHERE an event is. If `branch_ids` is non-empty, the event is a travel/movement (déplacement).

### `Branch`
A city/branch location:
```typescript
{
  id: string
  name: string         // "Montréal", "Drummondville"
  short_code: string   // "MTL", "SD", "SSM", "SQB" — displayed as badges
  color: string        // hex color used for badges
  address: string | null
  lat: number | null
  lng: number | null
}
```

### `Employee`
```typescript
{
  id: string
  name: string
  initials: string       // e.g. "SV"
  email: string | null
  phone: string | null
  role_title: string | null
  avatar_gradient: string  // CSS gradient string for avatar
  is_active: boolean
}
```

### `Priority`
```typescript
{
  id: string
  title: string
  description: string | null
  status: 'À faire' | 'En cours' | 'Terminé'
  due_date: string | null
  employee_id: string | null
  linked_event_id: string | null
}
```

### `Alert`
```typescript
{
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  is_read: boolean
  is_system: boolean
  employee_id: string | null
  created_at: string
}
```

---

## 5. State Management (Zustand Stores)

### `useCalendarStore`
Global calendar view state. Used by BOTH `AppShell` and `ScheduleClient`.
```typescript
{
  calMode: 'week' | 'day' | 'month'
  wkStart: string      // Monday YYYY-MM-DD of current week view
  dayView: string      // YYYY-MM-DD of current day view
  monView: string      // First day of current month YYYY-MM-01
  showWeekends: boolean
  schedFilter: 'all' | 'undone' | 'done' | 'high' | 'medium'
  calEvents: Event[]   // Live events from ScheduleClient, synced on every change
  branches: Branch[]   // Branches from ScheduleClient or AppShell layout

  // Actions
  setCalMode, setWkStart, setDayView, setMonView, toggleWeekends, setSchedFilter, goToToday
  setCalEvents(events)  // Called by ScheduleClient on every events state change
  setBranches(branches) // Called by ScheduleClient on mount, and AppShell on mount
}
```
**Important**: `calEvents` and `branches` are populated by `ScheduleClient` via `useEffect` whenever the page loads or events change. `AppShell` reads them to compute déplacements and week progress.

### `useSessionStore`
```typescript
{
  role: UserRole | null
  myEmployeeId: string | null      // The logged-in employee's own ID
  selectedEmployeeId: string | null // Admin can select a different employee to view
  isAdmin: boolean
}
```

### `useTasksStore`
Persisted to localStorage (`planify-tasks-ui`). Stores tasks page layout preferences only.

---

## 6. Key Features — Logic

### 6.1 Calendar (Schedule)

**Data flow**:
1. `schedule/page.tsx` (server) fetches all events + employees + branches from Supabase
2. Passes to `ScheduleClient` as `initialEvents`, `employees`, `branches`
3. `ScheduleClient` stores events in local `useState`
4. Syncs `events` → `useCalendarStore.calEvents` via `useEffect` (for AppShell)
5. Syncs `branches` → `useCalendarStore.branches` via `useEffect` (for AppShell)

**Employee filtering**:
- Admin: shows selected employee's events (`selectedEmployeeId` from session store)
- Employee: shows only own events (`myEmployeeId`)
- If no employee selected (admin): shows ALL events

**View modes**:
- `week`: WeekView with 7 columns (Mon–Sun) or 5 (Mon–Fri if weekends off)
- `day`: DayView single column
- `month`: MonthView grid

**Hour grid**:
- Default: `startHour=8`, `endHour=17`
- Grid renders `endHour - startHour + 1` rows so the end-hour label is VISIBLE
- +/- buttons adjust start/end hour (min 0, max 23)
- Events position: `top = (event.start_hour - startHour) * ROW_H`
- Events are clipped at `endHour` (events starting >= endHour are hidden)

**City tags on day headers**:
For each day column, WeekView shows colored branch `short_code` badges (e.g., "SD", "SSM") for any event visible that day that has `branch_ids.length > 0`.

**Event display in WeekView**:
- All-day events (JRNÉE row): `☐/☑ Title` with checkbox showing done status
- Timed events: `☐/☑ Hh–Hh · Title` in colored border card

### 6.2 Déplacements (Sidebar)

Located at the bottom of the AppShell sidebar. Shows **travel events** for the current calendar view period.

**Logic**:
1. Reads `calMode`, `wkStart`, `dayView`, `monView` from `useCalendarStore`
2. Reads `calEvents`, `branches` from `useCalendarStore`
3. Filters events by selected employee (admin) or own employee
4. Filters to events with `branch_ids.length > 0` (only travel events)
5. Filters to events visible in the current date range (based on calMode)
6. Deduplicates by event ID
7. Shows each event as: `[day label] [event title] [branch badges]`
8. Badge changes: `JOUR` / `SEM` / `MOIS` based on `calMode`
9. Collapsible with ▾/▸ arrow

**When populated**: Only when user is on the /schedule page (ScheduleClient syncs events to store). On other pages, shows "Aucun déplacement".

### 6.3 Week Progress %

In the AppShell sidebar, the "Semaine X%" bar shows completion of events for the **current week**.

**Logic**:
1. Gets `calEvents` and `wkStart` from `useCalendarStore`
2. Filters by selected employee
3. Gets all events visible in the 7-day window starting `wkStart`
4. `progress = Math.round((doneCount / totalCount) * 100)`
5. Animated progress bar (CSS transition)

### 6.4 Light / Dark Mode

**Toggle**: "Mode clair" / "Mode sombre" button at bottom of sidebar.

**Implementation**:
1. `isDark` state in AppShell, initialized from `localStorage.getItem('planify-theme')`
2. `useEffect` applies `document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')`
3. Persists preference to `localStorage`
4. CSS variables in `globals.css` are overridden for `[data-theme="light"]`
5. Components using `var(--bg-base)`, `var(--text-primary)`, `var(--border-subtle)` etc. automatically switch

**CSS variables**:
- Dark (default): `--bg-base: #0a0a12`, `--text-primary: #e8e8f0`, etc.
- Light: `--bg-base: #f0f0f8`, `--text-primary: #0d0d1a`, etc.

### 6.5 Access Control (Admin vs Employee)

**Rule: Admin sees/can do everything. Employee sees only own data.**

| Feature | Admin | Employee |
|---------|-------|----------|
| Employee list | Sees all, can switch view | Hidden |
| Schedule | Can see any employee's events | Own events only |
| Create events | For any employee | For themselves |
| Delete events | Any event | Own events only |
| Tableau Admin | ✓ | ✗ |
| ADMIN badge | ✓ | ✗ |

**Technical implementation**:
- `role` comes from `profiles` table in Supabase
- `isAdmin = role === 'admin'`
- `viewEmpId = isAdmin ? selectedEmployeeId : myEmployeeId`
- Event filtering uses `viewEmpId`

### 6.6 Event Modal (Creating/Editing)

Fields:
- **Title** (required)
- **Employee** (admin only, select who the event belongs to)
- **Start date / End date** (required)
- **All-day toggle** (hides hour fields if enabled)
- **Start hour / End hour** (0–23 selects, only if not all-day)
- **Color** (10 preset hex colors)
- **Priority level**: Faible / Moyen / Élevé
- **Repeat rule**: Aucune / Chaque semaine / Chaque mois / Chaque année
- **Repeat end date** (if repeating)
- **Branches** (multi-select buttons — this is the CITY/LOCATION selector)
- **Done** checkbox

**Save logic**: INSERT or UPDATE `events` table via Supabase client. On success, updates local `events` state, which triggers `setCalEvents` sync.

---

## 7. Recurring Events Logic

Function `eventVisibleOn(ev, date)` in `lib/utils/dates.ts`:
- If not repeating: checks `start_date <= date <= end_date`
- `Chaque semaine`: checks same weekday, within repeat window
- `Chaque mois`: checks same day-of-month
- `Chaque année`: checks same month+day

---

## 8. Known Behaviors & Rules

1. **Events must have an `employee_id`** — events without employee won't be filterable
2. **`branch_ids` = city** — always use this array to represent location. Do NOT add a separate `city` text field.
3. **Progress % only counts events in current week view** (based on `wkStart`)
4. **Déplacements only works on /schedule page** — on other pages calEvents is empty
5. **Theme persists via localStorage** key `'planify-theme'`
6. **`schedFilter`** ('all'/'undone'/'done'/'high'/'medium') applies to ALL views including déplacements badge filtering

---

## 9. Adding New Features — Checklist

When adding a feature that involves city/location:
- [ ] Use `branch_ids: string[]` on the Event (NOT a text city field)
- [ ] Show branch badges using `short_code` and `color` from `Branch` type
- [ ] Update `calEvents` in the store if events are modified

When adding a feature that needs to be visible in AppShell sidebar:
- [ ] Add state to `useCalendarStore` or `useSessionStore`
- [ ] Sync from the relevant page component via `useEffect`
- [ ] Read in `AppShell.tsx` via store hook

When adding new pages:
- [ ] Create `app/(app)/[page]/page.tsx` (server component)
- [ ] Create `app/(app)/[page]/PageClient.tsx` (client component)
- [ ] Add to NAV array in `AppShell.tsx`
- [ ] Apply employee filtering: admin sees all, employee sees own

---

## 10. Supabase Tables Summary

| Table | Key fields |
|-------|-----------|
| `profiles` | `id (auth.uid)`, `role`, `employee_id`, `display_name` |
| `employees` | `id`, `name`, `initials`, `avatar_gradient`, `is_active` |
| `events` | `id`, `employee_id`, `title`, `start_date`, `end_date`, `start_hour`, `end_hour`, `all_day`, `color`, `branch_ids[]`, `done`, `repeat_rule`, `repeat_end_date` |
| `branches` | `id`, `name`, `short_code`, `color`, `address`, `lat`, `lng` |
| `priorities` | `id`, `title`, `status`, `due_date`, `employee_id`, `linked_event_id` |
| `alerts` | `id`, `title`, `message`, `type`, `is_read`, `is_system`, `employee_id` |
| `suppliers` | (for map) |

---

## 11. Common Pitfalls

- Do NOT use `new Date()` directly for date strings — always use `todayStr()` / `localDate()` / `dateStr()` from `lib/utils/dates.ts` to avoid timezone issues.
- Do NOT hardcode dark mode colors (`#0a0a12`, `rgba(255,255,255,...)`) in new components — use CSS variables (`var(--bg-base)`, `var(--text-primary)`, etc.) so light mode works.
- Do NOT add business logic to AppShell — it should only read from stores, not fetch data.
- The schedule page uses `force-dynamic` — it refetches on every request.
