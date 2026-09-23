# Changelog

## 3.11.0 (23 Sep 2026)

### Settings (replaces "Manage passcodes")
- One **Settings** button in the header, with sections: People & access, Mandatory fields, Save & sync, Activity log, Workbook & backups, Tools and Preferences.
- Save & sync, Tools, Activity, Theme, "Set your name" and "Linked files" moved into Settings. The header now shows only All employees, Start/Stop auto-sync and Settings.
- Admin-only sections appear only for the admin passcode.

### Rights per person
- For each passcode the admin ticks which pages it can open (Overview, Employees, Attendance, Action center, Reports) and what it can change: edit, add or delete employees, fill in bulk, mark attendance, **approve or reject leave**, mark holidays for everyone, see the activity log, use the distance tool, download the workbook.
- Presets: Full access, Editor, Leave approver, View only.
- Without "Approve leave", people can mark LA (leave applied) but not AL, CL, SL or RJ.
- Admins always have every right. Passcodes created before 3.11 keep full user rights until changed.
- The database refuses saves from passcodes with no editing right.

### Mandatory fields
- The admin chooses which fields Action items checks. Phone is no longer mandatory by default.

### Activity log in the workbook
- Every change is written to an **Activity Log** sheet in the same workbook (newest first). Entries older than 30 days are removed automatically.
- The "Choose a folder" text-file option is removed. Activity kept only in a browser by earlier versions is not moved into the sheet.

### Saving and conflicts
- **Start / Stop auto-sync** button in the header. (The old Auto-save toggle could not actually be switched off.)
- When someone else saved attendance first, you are asked once: Overwrite with my changes, Load latest, or Not now (stops auto-sync). No more repeating errors.
- An overwrite is forced through in Supabase and still keeps the daily backup.
- Saves to different records at the same moment are merged automatically.
- Employee edits: if someone else saved the same person first, choose Overwrite or Load theirs.
- Online requests time out instead of leaving the dashboard on "Saving…".

### Start screen and Overview
- Minimal sign-in: passcode and Sign in only.
- On this computer, one workbook with both sheets. The two-file option is removed.
- The Action center summary is removed from the Overview.

### Fixes
- Workbooks saved without a shared-strings part (by some tools) no longer end up with unreadable names in the Attendance Tracker after a save.

### Upgrading
- Run `supabase/setup.sql` again in the SQL Editor (safe to rerun; passcodes and the workbook are kept).

## 3.10.3 (23 Sep 2026)
- The Supabase project URL and anon key are built in: the start screen asks only for the passcode, on every computer.

## 3.10.2 (23 Sep 2026)
- The Supabase project URL is built into the file.
- The anon key is asked for only once per computer, then remembered. It can also be pasted into `SUPABASE_CONFIG` so nobody is ever asked.
- After that, the start screen shows only the passcode box. A wrong key brings the key box back with a clear message.

## 3.10.1 (23 Sep 2026)
- The Supabase Project URL is now read from the anon key. A mistyped URL is corrected automatically, and the URL box can be left empty.
- Clearer "could not reach Supabase" message showing the address that was tried.

## 3.10.0 (23 Sep 2026)

### Passcode sign-in (Supabase)
- Sign in with a passcode only. The admin passcode gives admin rights; user passcodes open the dashboard.
- **Manage passcodes** (admin only):
  - see, add, edit, disable and delete passcodes;
  - changing a passcode signs that person out;
  - the last admin is always protected.
- Admin history: recent sign-ins (including wrong attempts), recent saves, and 30 days of daily backups to download.
- Admins can download the current workbook or replace it (for example to restore a backup).
- Brute-force protection: 10 wrong passcodes from one network lock it out for 10 minutes. Sessions last 12 hours.
- The workbook is stored in the database, with version-checked saves, so simultaneous saves never overwrite each other.
- `supabase/setup.sql` was rewritten. All access goes through checked database functions, and the tables themselves are locked.

### One workbook, two sheets
- Workforce and attendance can live in one workbook: a workforce sheet plus an "Attendance Tracker" sheet.
- Saving employees no longer disturbs attendance, and attendance saves keep the latest employee changes.
- **Select workbook** on the start screen opens a single workbook. Starting fresh creates one `Team Dashboard.xlsx` with both sheets.
- Two separate files still work for local use.

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

## Fix: recovery/save loop and sign-out (2026-09-23)

- Recover attendance edits only when loading a file, never after a successful save or discard.
- Clear recovery data after saving and serialize recovery writes so an older write cannot recreate a cleared draft.
- Allow sign-out with a confirmed browser recovery copy; offline logout times out after three seconds.
- Remove the shared OneDrive folder section and stop starting its watcher.
- Refresh the open Save & sync panel as save state changes and display save errors.

Validation: all nine inline scripts parse; isolated regression checks cover successful and failed saves, no repeat auto-save, recovery on load, ordered recovery clearing, offline sign-out, cancelled sign-out, and removed shared-folder UI. Live Supabase and real Excel file writes were not exercised.
