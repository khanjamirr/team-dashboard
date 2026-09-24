const fs=require('fs');let s=fs.readFileSync('outputs/index.html','utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing anchor '+a.slice(0,80));s=s.replace(a,b);}
replace('<div class="request-cards">','<section class="request-cards" aria-labelledby="requestCenterTitle"><h2 id="requestCenterTitle">Request Center</h2>');
replace('aria-label="Approval requests" hidden></section></div>', 'aria-label="Approval requests" hidden></section></section>');
replace('.request-cards > section {', '#requestCenterTitle {grid-column:1 / -1;margin:0;font-size:15px;font-weight:650;}\n.request-cards > section {');
replace("['att.approve', 'Approve or reject leave (AL, CL, SL, RJ)'], ", '');
replace("  { name: 'Notifications',", "  { name: 'Request Center', items: [['requests.own', 'See Your requests'], ['requests.rejected', 'See Rejected request log (within notification audience)'], ['requests.approvals', 'See Approval requests'], ['att.approve', 'Approve or reject leave requests and edit approved leave']] },\n  { name: 'Notifications',");
replace('const PERM_VERSION = 7;', 'const PERM_VERSION = 8;');
replace("[['_v', 7], ...PERM.keys", "[['_v', 8], ...PERM.keys");
replace("k === 'notifications.view' || keys.includes(k)", "['notifications.view', 'requests.own', 'requests.rejected'].includes(k) || (k === 'requests.approvals' && keys.includes('att.approve')) || keys.includes(k)");
replace("    if (q._v < 7) q['notifications.view'] = true;", "    if (q._v < 7) q['notifications.view'] = true;\n    if (q._v < 8) { q['requests.own'] = true; q['requests.rejected'] = true; q['requests.approvals'] = !!q['att.approve']; }");
replace("own, !!me);", "own, !!me && can('requests.own'));");
replace("rejected, !!me && (!!rejected.length || !!window.PERM?.can('notifications.view')));", "rejected, !!me && can('requests.rejected') && (!!rejected.length || !!window.PERM?.can('notifications.view')));");
replace("  const admin = window.PERM && (!PERM.online() || ['admin', 'superadmin'].includes(CLOUD.user()?.role));\n  host.hidden = !(admin || canDecide());", "  host.hidden = !can('requests.approvals');");
// Apply the same visibility choices to request cards in Attendance.
replace("  const decide = requestsToDecide(), me = myId();", "  const decide = can('requests.approvals') ? requestsToDecide() : [], me = myId();");
replace("  const mine = me ? reqList()", "  const mine = me && can('requests.own') ? reqList()");
replace("  if (!decide.length && !mine.length && !needsApproval()) return '';", "  if (!decide.length && !mine.length && !(can('requests.own') && needsApproval())) return '';");
replace("  const decideHtml = canDecide() ?", "  const decideHtml = can('requests.approvals') && canDecide() ?");
replace("  const mineHtml = (mine.length || needsApproval()) ?", "  const mineHtml = can('requests.own') && (mine.length || needsApproval()) ?");
for(const m of s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new(require('vm').Script)(m[1]);
fs.writeFileSync('outputs/index.html',s);console.log('Request Center named; individual card rights added; all scripts parse.');
