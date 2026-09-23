# Team Dashboard

A single-file HTML dashboard for managing a team's workforce and attendance in one Excel workbook (a workforce sheet and an Attendance Tracker sheet). It runs entirely in the browser, with nothing to install. The workbook can be a file on your computer, or stored in your Supabase database with passcode sign-in for the whole team.

## Quick start

Open `index.html` in a browser.

**A. Passcode sign-in with Supabase (recommended for teams).** The workbook lives in your Supabase database. Everyone signs in with their own passcode, and one admin passcode manages all the others. Works in any modern browser. Set it up once with [supabase/README.md](supabase/README.md).

**B. An Excel workbook on this computer.** Requires Edge or Chrome on a computer. On the start screen, click **Open an Excel file instead**, then **Choose workbook** (one Excel file with a workforce sheet and an **Attendance Tracker** sheet), or **Start with a blank workbook**.

## Features

- **Overview:** headcount by status, an attendance card with a Today / History & upcoming toggle, boxes for on leave, half day and late comings, real or pseudo names, and a client column.
- **Employees:** searchable and filterable table, add and edit employees, bulk fill, saved filters with a default view.
- **Attendance:** monthly grid with click-to-set day codes, leave-type filter chips, "Who's out", people view, month builder from the workforce file, holidays.
- **Action center:** data health checks and pending items.
- **Reports:** frozen header, click-to-filter bar charts with multi-select (Ctrl+click), age bands, tenure, clients, locations, joiners and leavers, plus an attendance timeline with its own filters (date range, leave types, day / week / month grouping, hide weekends, single employee). Every chart has Copy table and Copy chart buttons.

## The workbook

One Excel workbook with a workforce sheet and an Attendance Tracker sheet. The dashboard adds a third sheet, **Activity Log**, with every change from the past 30 days (newest first).

**Workforce sheet.** Any sheet name except "Attendance Tracker", with a header row. Column names the dashboard recognises:

`Emp Code`, `Employee Name`, `Status`, `Designation`, `Client`, `Sub Client/Type`, `Phone`, `WhatsApp`, `Gender`, `DOB`, `DOJ`, `Left Date`, `Notice Period`, `Current Area`, `Distance to Office`, `Cab`, `Status2` (work mode), `Column1` (language), `Asset?`, `Dual Monitor`, `From City`, `From State`, `Remarks`, `Pseudo Names`.

Similar names are usually detected too (for example `Employee ID`, `Date of Joining`).

**Attendance sheet.** A sheet named **`Attendance Tracker`**:

| Row / column | Content |
|---|---|
| Row 1 | Title or legend |
| Row 2 | Headers, including `Recruiter Name` |
| A | Month (first day of the month, as a date) |
| B, C, D | Emp ID, Name, Client |
| E–AI | Days 1–31 |
| AJ, AK, AL | Total Leaves, Unapproved Leaves, Upcoming Leaves (formulas the dashboard rewrites) |
| AM | Regularizations |

Day codes: `AL` approved, `CL` casual, `SL` sick, `UL` unplanned, `AB` absent, `HD1`/`HD2` half day, `LA` applied, `RJ` rejected, `L` late, `C` cab late, `R` remote, `WO` week off, `H` holiday, `P` present, `M` moved, `NA`/`X` not applicable. A blank day counts as present.

The dashboard edits only the sheet data it needs. Styles, pivots, other sheets and formulas elsewhere in the workbooks are kept.

## Sharing with a team

**Best option: Supabase with passcodes.** See [supabase/README.md](supabase/README.md). Everyone signs in with their own passcode and works on the same online workbook:
- If two people save at the same moment, the second save is refused, so nobody silently overwrites anyone.
- The first save each day keeps a backup for 30 days.
- The admin manages passcodes, each person's rights and the mandatory fields in **Settings**.
- If someone else saved attendance first, you choose: overwrite with your changes, load theirs, or decide later.

**Alternative: OneDrive-synced files.** The page can only open files that exist on the computer, so each person needs the workbooks synced locally:

1. In OneDrive on the web, open the shared folder and choose **Add shortcut to My files**.
2. In File Explorer, right-click both workbooks and choose **Always keep on this device**.
3. Open `index.html` in Edge or Chrome and select the files from that OneDrive folder.

With OneDrive this is not live co-editing:

- Close the workbook in Excel desktop while anyone is using the dashboard. Whichever program saves last wins, and OneDrive may create a conflict copy.
- It works best when one person updates at a time.

## Settings

Click **Settings** in the header.

| Section | Who sees it | What it does |
|---|---|---|
| People & access | Admin (online) | Passcodes, roles and each person's rights: pages, employee editing, attendance, leave approval, holidays, activity, tools, download |
| Mandatory fields | Admin | Which fields Action items checks for Active, New and OJT people |
| Save & sync | Everyone | File status, Start/Stop auto-sync, Save now, Undo |
| Activity log | Admin, or with the right | The Activity Log sheet: past 30 days, filter by area, search |
| Workbook & backups | Admin, or with the download right | Download, replace, daily backups, sign-ins and saves |
| Tools | With the right | Approximate distance from the office |
| Preferences | Everyone | Theme, your name (local files) or Sign out |

## Customising

These values live near the top of the relevant script blocks in `index.html`:

| What | Where |
|---|---|
| Title and version | `const APP = { title, version, released }` |
| Column names | `const CFG = { key, name, status, … }` |
| Office address for distance estimates | `const GOOGLE_OFFICE = '…'` |
| Supabase project and workbook name | `const SUPABASE_CONFIG = { url, anonKey, workbookFile }` |

## Privacy

- **Local mode:** employee data stays in your Excel files and in the browser's private storage (for backups and the activity log). Nothing is uploaded.
- **Supabase mode:** the workbook is stored in your own Supabase database. Only someone with a valid passcode can read or save it, and only the admin can see or change passcodes.
- **Other network calls:** the optional distance tool looks up addresses via OpenStreetMap's Photon service, and "open in Google Maps" links open in a new tab.
- **Never commit your workbooks to this repository.** `.gitignore` blocks `.xlsx`, `.xlsm`, `.xls` and `.csv` files.
- **Never put the Supabase `service_role` key in `index.html`.** Only the anon key belongs there.

## Browser support

| Browser | Supabase mode | Local Excel files |
|---|---|---|
| Edge / Chrome (desktop) | Yes | Yes |
| Firefox, Safari, mobile browsers | Yes | No (no File System Access API) |

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
