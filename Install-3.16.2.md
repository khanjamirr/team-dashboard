Team Dashboard 3.16.2

1. In Supabase → SQL Editor, run **supabase-request-fix.sql** against your existing database. It adds the request-saving function and keeps your current users, permissions, workbook and request history.
2. Replace the GitHub site's **index.html** with the supplied index.html.
3. Reload the dashboard. Test with a user who has Attendance → Log leave and at least one permitted leave type. Confirm that a request appears as pending, then approve or reject it using an account granted approval rights under Overview → Request Center.

**setup.sql** is the complete supplied setup plus this update, for keeping in your GitHub repository (for example, supabase/setup.sql). You only need to run the smaller migration for the existing installation. For a new database, replace the bootstrap CHANGE-ME passcode in setup.sql before running it.

Cause fixed: the old shared-settings function only allowed client_not_needed, so saving leave_requests returned ADMIN_ONLY. The new function authenticates the session, validates leave type/date inputs, assigns requester and decision identity on the server, allows owner cancellation, and requires att.approve for approval/rejection. It locks the request store and checks the expected request state to prevent stale decisions or lost unrelated submissions.

Verification: all HTML JavaScript blocks parse; targeted client tests passed. No live database migration or PostgreSQL execution was performed in this environment. Test the workflow after running the SQL.

Scope: this migration fixes request writes. Notification audiences and workforce filters still operate in the dashboard; the existing get-settings/get-workbook APIs do not enforce those display restrictions on the server. The workbook save and request decision remain separate operations; this patch does not make Excel-file saving and approval one atomic transaction. Read receipts remain browser-local.
