# Changelog

## 3.9.0 (23 Sep 2026)

### Supabase cloud mode
- Sign in with email and password to work on workbooks stored in a private Supabase Storage bucket. This works in any modern browser.
- On first sign-in, you can upload your existing Excel files or create blank ones.
- Saves are refused, with a clear message, if someone else saved the same file since you loaded it.
- The first save of each day backs up the previous version to `backups/YYYY-MM-DD/`.
- Every save is recorded in a `save_log` table.
- The session is remembered, so a reload reopens straight into the dashboard. A Sign out link is in the sidebar.
- `supabase/setup.sql` creates the bucket, the member allowlist, the access rules and the save log.

## 3.8.0 (22 Sep 2026)

### Reports
- The selection line and Explore row stay pinned while scrolling.
- "All reports" is removed from Explore; Team composition is the default.
- Charts support multi-select with Ctrl+click. Selected bars are highlighted and the rest are dimmed instead of disappearing.
- Quick insights is replaced by an **Age bands** chart.
- The "Copy all tables / charts" buttons are removed. Each chart keeps its own Copy table / Copy chart.

### Attendance report
- The summary boxes are replaced by an **Attendance timeline**: people out per day, stacked by leave type.
- The timeline has its own filters: date range (presets or custom), leave types, day / week / month grouping, hide weekends, and a single-employee search.

### Attendance grid
- Leave-type filter chips (AL, CL, SL, UL, AB, half day, LA, RJ, late, remote) with counts, multi-select, and faded non-matching codes.

### Overview attendance card
- Today / History & upcoming toggle.
- Boxes for on leave, on half day and late comings.
- Real / pseudo names toggle.
- Client column in all tables.

### Setup
- **Choose folder and create files** creates blank workforce and attendance workbooks when you don't have them yet.
- New employees' dates are saved with a proper date format in brand-new workbooks.

## 3.7.7.2
- Baseline version.
