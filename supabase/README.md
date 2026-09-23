# Supabase setup (passcode sign-in)

The team's workbook is stored in your Supabase database. People sign in with a **passcode** only.

- **Admin passcode:** opens the dashboard with admin rights. The admin can manage everyone's passcodes, see sign-in and save history, download daily backups, and replace the workbook.
- **User passcodes:** open the dashboard to view and edit the data. Users can't see or change passcodes.

## One-time setup (admin)

1. **Create a project.** At [supabase.com](https://supabase.com), click **New project** and pick a region near your team (for example Mumbai). The free plan is enough.
2. **Choose your admin passcode.** Open [`setup.sql`](setup.sql) in a text editor. At the very bottom, replace `CHANGE-ME-2468` with your own admin passcode (at least 4 characters; longer is safer).
3. **Run the setup.** In Supabase, go to **SQL Editor** → **New query**, paste the whole file, and click **Run**. It should finish with "Success. No rows returned".
4. **Copy the project details.** In **Project Settings** → **API**, copy the **Project URL** and the **anon public** key.
5. **Put them in the dashboard.** Open `index.html` in a text editor, find `const SUPABASE_CONFIG`, paste the URL and key between the quotes, and save. Now the start screen shows only the passcode box. (If you skip this, each person types the URL and key the first time; the browser remembers them.)
6. **Put your workbook online.**
   1. Open `index.html` and sign in with the admin passcode.
   2. Click **Upload my workbook** and choose your Excel file. It needs a workforce sheet and a sheet named **Attendance Tracker**.
   3. Or click **Create a blank workbook** to start fresh.
7. **Add your team.** In the sidebar, click **Manage passcodes**, then add each person with a name and passcode. **New** suggests a random 6-digit code. Give each person their own passcode.

## Managing passcodes (admin only)

In the sidebar, click **Manage passcodes**:

| Task | How |
|---|---|
| See passcodes | **Show** reveals one; **Show all passcodes** reveals every one |
| Add a person | Fill in name, role (User or Admin) and passcode, then **Add person** |
| Change a passcode or name | **Edit**, change it, **Save**. The old passcode stops working immediately and that person is signed out. |
| Change your own admin passcode | **Edit** on your own row |
| Stop someone signing in | **Disable** (reversible with **Enable**) or **Delete** |

Rules the database enforces:
- Passcodes need at least 4 characters and must all be different.
- There must always be at least one active admin, and you can't delete yourself.

The panel also shows recent sign-ins (including wrong-passcode attempts), recent saves, and the daily backups.

## Security notes

- **All checks run in the database.** The dashboard can't read the tables directly; every request goes through functions that check the passcode session first. Only the admin functions return passcodes.
- **Passcodes are stored readable** so the admin can see them, as requested. Anyone with access to your Supabase account (the owner login) can see them too, so protect that account with a strong password and two-factor sign-in.
- **Guessing is limited.** After 10 wrong passcodes from one network within 10 minutes, sign-in is blocked from that network for 10 minutes. Use passcodes of 6 or more characters.
- **Sessions last 12 hours** of inactivity, then the passcode is asked again. **Sign out** ends the session at once.
- **The anon key is safe to put in the file.** It only allows calling these functions. Never put the **service_role** key in the dashboard.

## How saving works

- **One workbook, both sheets.** Employee changes and attendance changes are saved into the same workbook.
- **Simultaneous saves are caught.** If two people save at the same moment, the database accepts the first and refuses the second with a message, so nobody silently overwrites anyone. The dashboard reloads the latest version.
- **Daily backups.** The first save of each day keeps a backup of the previous version for 30 days. The admin can download any backup from **Manage passcodes** → **Daily backups**, and restore it with **Replace workbook…**.
- **Download a copy anytime.** Admins can use **Download current workbook** to get the file for Excel.

## Forgot the admin passcode?

In Supabase, go to **SQL Editor** and run:

```sql
update public.td_users set passcode = 'NEW-PASSCODE' where role = 'admin' and name = 'Admin';
```
