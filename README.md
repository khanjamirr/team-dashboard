# Team Dashboard

A single-file HTML dashboard for managing a team's workforce and attendance directly in two Excel workbooks. It runs entirely in the browser. There is no server, nothing to install, and no data leaves the computer: the page reads and writes the `.xlsx` files you select.

## Quick start

1. Download `index.html`.
2. Open it in **Microsoft Edge** or **Google Chrome** on a computer. Other browsers can't edit local files.
3. On the setup screen, either:
   - select your existing **workforce** and **attendance** workbooks, or
   - click **Choose folder and create files** to start fresh. The dashboard creates `Team Workforce.xlsx` and `Team Attendance.xlsx` in the folder you pick and saves everything there.
4. Allow editing when the browser asks. Your file choices are remembered in this browser.

## Features

- **Overview:** headcount by status, an attendance card with a Today / History & upcoming toggle, boxes for on leave, half day and late comings, real or pseudo names, and a client column.
- **Employees:** searchable and filterable table, add and edit employees, bulk fill, saved filters with a default view.
- **Attendance:** monthly grid with click-to-set day codes, leave-type filter chips, "Who's out", people view, month builder from the workforce file, holidays.
- **Action center:** data health checks and pending items.
- **Reports:** frozen header, click-to-filter bar charts with multi-select (Ctrl+click), age bands, tenure, clients, locations, joiners and leavers, plus an attendance timeline with its own filters (date range, leave types, day / week / month grouping, hide weekends, single employee). Every chart has Copy table and Copy chart buttons.

## The two workbooks

**Workforce file.** One sheet with a header row. Column names the dashboard recognises:

`Emp Code`, `Employee Name`, `Status`, `Designation`, `Client`, `Sub Client/Type`, `Phone`, `WhatsApp`, `Gender`, `DOB`, `DOJ`, `Left Date`, `Notice Period`, `Current Area`, `Distance to Office`, `Cab`, `Status2` (work mode), `Column1` (language), `Asset?`, `Dual Monitor`, `From City`, `From State`, `Remarks`, `Pseudo Names`.

Similar names are usually detected too (for example `Employee ID`, `Date of Joining`).

**Attendance file.** A sheet named **`Attendance Tracker`**:

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

## Sharing with a team through OneDrive

The page can only open files that exist on the computer, so each person needs the workbooks synced locally:

1. In OneDrive on the web, open the shared folder and choose **Add shortcut to My files**.
2. In File Explorer, right-click both workbooks and choose **Always keep on this device**.
3. Open `index.html` in Edge or Chrome and select the files from that OneDrive folder.

This is not live co-editing. Each save rewrites the file and OneDrive syncs it a few seconds later:

- Close the workbook in Excel desktop while anyone is using the dashboard. Whichever program saves last wins, and OneDrive may create a conflict copy.
- Avoid two people saving within the same few seconds. When the attendance file changes underneath you, use **Reload** before continuing.
- It works best when one person updates at a time.

## Customising

These values live near the top of the relevant script blocks in `index.html`:

| What | Where |
|---|---|
| Title and version | `const APP = { title, version, released }` |
| Column names | `const CFG = { key, name, status, … }` |
| Office address for distance estimates | `const GOOGLE_OFFICE = '…'` |

## Privacy

- Employee data stays in your Excel files and in the browser's private storage (for backups and the activity log). Nothing is uploaded.
- The only network calls are the optional distance tool, which looks up addresses via OpenStreetMap's Photon service, and "open in Google Maps" links.
- **Never commit your workbooks to this repository.** `.gitignore` blocks `.xlsx`, `.xlsm`, `.xls` and `.csv` files to help prevent that.

## Browser support

| Browser | Support |
|---|---|
| Edge / Chrome (Windows, macOS, Linux desktop) | Full |
| Firefox, Safari, mobile browsers | Not supported (no File System Access API) |

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
