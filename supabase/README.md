# Supabase setup

With Supabase, the two workbooks live in a private online bucket instead of on each person's computer. Everyone signs in with their own account and works on the same data from any browser, including Firefox, Safari and phones.

## One-time setup (project owner)

1. **Create a project.** Sign in at [supabase.com](https://supabase.com), click **New project**, and pick a region close to your team (for example Mumbai). The free plan is enough.
2. **Run the setup script.**
   1. Open **SQL Editor** → **New query**.
   2. Paste the contents of [`setup.sql`](setup.sql).
   3. Replace `you@yourcompany.com` with your email, and add your colleagues' emails.
   4. Click **Run**.
3. **Create the user accounts.**
   1. Go to **Authentication** → **Users** → **Add user** → **Create new user**.
   2. Enter each person's email and a password, and tick **Auto Confirm User**.
   3. Recommended: under **Authentication** → **Sign In / Providers**, turn off **Allow new users to sign up**, so only people you add can create accounts.
4. **Copy the project details.** In **Project Settings** → **API**, copy the **Project URL** and the **anon public** key.
5. **Put them in the dashboard.** You can do this either way:
   - **In the file:** open `index.html` in a text editor, find `const SUPABASE_CONFIG`, paste the URL and key between the quotes, and save. Everyone who gets this file only needs to type their email and password.
   - **On screen:** leave the file as it is. Each person types the Project URL and key the first time they sign in, and the browser remembers them.

## First sign-in

1. Open `index.html`, then fill in the **Supabase · shared online** box and click **Sign in**.
2. If the files aren't in Supabase yet, the dashboard asks what to do for each one:
   - **Upload my existing file** moves your current Excel data online.
   - **Create blank** starts fresh.
3. From then on, it opens straight into the dashboard.

## How saving works

- **Every save uploads the workbook to the bucket.** A reload or the next check picks up other people's changes.
- **Simultaneous saves are caught.** If someone else saved the same file since you loaded it, your save is refused with a message instead of overwriting their work. The latest version loads, and you redo your change.
- **Daily backups.** The first save of each day copies the previous version to `backups/YYYY-MM-DD/` in the bucket. Restore by downloading a copy from **Storage** in the Supabase dashboard.
- **Save log.** Every save is recorded in the `save_log` table: who saved which file, and when.
- **Local backups too.** Recovery copies are also kept in each browser, as before.

## Getting your Excel files out

In the Supabase dashboard, open **Storage** → **team-dashboard** and download either workbook at any time. They're normal `.xlsx` files.

## Is the anon key safe in the file?

Yes. The anon key is designed to be public. Access to the data is controlled by the rules in `setup.sql`: only signed-in users whose email is in `dashboard_members` can read or save the files. Never put the **service_role** key in the dashboard.
