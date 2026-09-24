The updated dashboard is in index.html.

- Overview shows each signed-in user's pending, approved, rejected, and cancelled requests, including decision details and rejection reasons.
- Rejected requests have a separate dashboard log. Request history is retained instead of expiring after 45 days.
- Approval writes the tracker before recording the approved decision. LA applications become AL when approved. A failed save leaves the request pending.
- Notifications include request submissions and decisions. Approved-request notifications are visible to all users by default, subject to the super admin's audience settings.
- The bell shows a red dot for unread notifications. Opening the panel does not mark them read. Use Mark as read or Mark all read.
- Settings → People & access → choose a person → Notifications controls notification access and audience: all users, own requests, or own plus selected users. Activity-log access is separate and shows all users' recorded changes.
- Existing workforce, attendance, and settings logging is retained. Request submissions, decisions, and cancellations also appear in the activity log. Automatic activity expiry is disabled for future saves; previously deleted history cannot be recovered.

Validation: all eight JavaScript blocks parse. Automated checks passed for audiences, numeric/string user IDs, account/team read-state isolation, unread indicators, explicit read actions, decision notifications, save-before-approval ordering, failed saves and refreshes, and escaping of request-history content. Live Supabase integration and browser rendering were not verified; the local browser launch was blocked by the environment.

Backend limitations: only the HTML was supplied. Notification audience restrictions are dashboard display controls, not server-enforced authorization. Existing shared-settings APIs still deliver request records to the client. Server-side filtering requires the Supabase schema/RPC source. Read status is per account and team in the current browser, not synced across devices. Tracker saves and request-status saves are separate operations; a backend transaction is needed to guarantee atomic decisions between simultaneous approvers. If the tracker saves but the request-status update fails, the dashboard reports this and the request remains pending for reconciliation.
