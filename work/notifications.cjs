const fs=require('fs');
let s=fs.readFileSync('work/before-notifications.html','utf8').replace(/\r\n/g,'\n');
function sub(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,80));s=s.replace(a,b);}
sub("{ name: 'Notifications', items: [['activity.view', 'See the activity bell (every change)']] }", "{ name: 'Notifications', items: [['notifications.view', 'Open notifications and receive request updates'], ['activity.view', 'See the activity log for all users']] }");
sub('const PERM_VERSION = 6;', 'const PERM_VERSION = 7;');
sub('const q = { ...p };', "const q = { ...p };\n    if (q._v < 7) q['notifications.view'] = true;");
sub("const pick = keys => Object.fromEntries([['_v', PERM_VERSION], ...PERM_KEYS.map(k => [k, keys.includes(k)])]);", "const pick = keys => Object.fromEntries([['_v', PERM_VERSION], ...PERM_KEYS.map(k => [k, k === 'notifications.view' || keys.includes(k)])]);");
sub("[['_v', 6], ...PERM.keys", "[['_v', 7], ...PERM.keys");
sub("show('#btnBell', PERM.can('activity.view'));", "show('#btnBell', PERM.can('notifications.view') || PERM.can('activity.view'));\n  window.refreshNotifications?.();");
sub('drawEditor(editor, u, id => drawPeople(pane, id));', 'drawEditor(editor, u, id => drawPeople(pane, id), users);');
sub('function drawEditor(box, u, reload) {', 'function drawEditor(box, u, reload, users = []) {');
sub('  /* fixed filters for this person */', `  const audience = u?.permissions?._notificationAudience || { mode: 'all', users: [] };
  const audienceMode = h('select', { class: 'input', 'aria-label': 'Whose request notifications this person can see' },
    ...[['all','All users'],['own','Only their own requests'],['selected','Their own + selected users']].map(([value,label]) => h('option',{value,selected:audience.mode === value},label)));
  const audienceChecks = users.map(person => ({ id: String(person.id), ...checkLine(person.name, (audience.users || []).map(String).includes(String(person.id))) }));
  const audienceList = h('div', {class:'rmod-items',hidden:audienceMode.value !== 'selected'}, ...audienceChecks.map(c => c.el));
  audienceMode.onchange = () => { audienceList.hidden = audienceMode.value !== 'selected'; };
  const audienceBox = h('div', {class:'rmod-extra'}, h('label',{},'Request notifications from',audienceMode), audienceList,
    h('p',{class:'rmod-note'},'Applies to request notifications and rejected-request history. Their own requests are always included. All users receive approved-request notifications by default. Activity log access is separate.'));
  /* fixed filters for this person */`);
sub("g.name === 'Filters' ? fixedBox : null);", "g.name === 'Filters' ? fixedBox : g.name === 'Notifications' ? audienceBox : null);");
sub('...rightsNow(), ...link, ...(fixed', "...rightsNow(), ...link, _notificationAudience: { mode: audienceMode.value, users: audienceChecks.filter(c => c.box.checked).map(c => c.id) }, ...(fixed");
sub('fixedBox.hidden = sup;', 'fixedBox.hidden = sup; audienceBox.hidden = sup;');
// Keep request history, and normalize legacy numeric requester IDs.
sub("  const cutoff = Date.now() - 45 * 86400000;\n  const next = change(reqList().map(r => ({ ...r }))).filter(r => r.status === 'pending' || (Date.parse(r.decidedAt || r.at) || 0) > cutoff);", "  const next = change(reqList().map(r => ({ ...r })));");
s=s.replaceAll('r.byId === me', 'String(r.byId) === me');
sub(".slice(0, 12) : [];", " : [];");
// Return an explicit success result; request status changes only after a real write.
sub('      await adopt(ctx); notify(); if (S.act) S.act.items = null;\n      break;', '      await adopt(ctx); notify(); if (S.act) S.act.items = null;\n      S.saving = false; render(); return true;');
sub("  const p = resolvePerson(req.name);", "  if (!inMyScope(req)) { toast('This request is outside your employee filters.'); return; }\n  if (S.saving) { toast('Wait for the tracker save to finish.'); return; }\n  if (S.changes.length) { toast('Save or undo your pending tracker edits before approving a request.'); return; }\n  const p = resolvePerson(req.name);");
sub("  const ok = applyApproved(p, use, req.dates,", "  const previous = snapshot(), undoLength = S.undo.length;\n  const ok = applyApproved(p, use, req.dates,");
sub("  if (ok === false) return;\n  try {\n    await saveRequests", "  if (ok === false) return;\n  if (await save() !== true) {\n    if (S.changes.length) { S.rows = previous; S.changes = []; S.undo.length = undoLength; S.ver++; await clearPending(); render(); }\n    toast('Approval was not completed. The request is still pending.'); return;\n  }\n  try {\n    await saveRequests");
s=s.replaceAll("decidedBy: BE.userName(), decidedAt:", "decidedBy: BE.userName(), decidedById: myId(), decidedAt:");
sub("      await saveRequests(l => l.map(r => r.id === id ? { ...r, status: 'rejected'", "      if (!canDecide() || !inMyScope(cur)) { toast('You no longer have access to decide this request.'); return; }\n      await saveRequests(l => l.map(r => r.id === id ? { ...r, status: 'rejected'");
sub("    await saveRequests(l => l.map(r => r.id === id ? { ...r, status: 'cancelled'", "    if (String(cur.byId) !== myId()) { toast('Only the requester can cancel this request.'); return; }\n    await saveRequests(l => l.map(r => r.id === id ? { ...r, status: 'cancelled'");
sub("    toast('Request cancelled.');", "    await BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'request-cancelled', name: cur.name, key: cur.empId || '', details: { note: 'Cancelled request ' + cur.code + ' · ' + reqDatesText(cur.dates) } }]);\n    toast('Request cancelled.');");
// Overview rejection dialogs must not be mounted inside the hidden Attendance page.
sub("function closeModal() { $('#modalRoot')?.remove(); }", "function closeModal() { $('#modalRoot')?.remove(); document.getElementById('attModalPortal')?.remove(); }");
sub('  ROOT.appendChild(v); return v;', `  if (active()) ROOT.appendChild(v);
  else { const portal = document.createElement('div'); portal.id = 'attModalPortal'; document.body.append(portal); const shadow = portal.attachShadow({mode:'open'}); const style = document.createElement('style'); style.textContent = ATT_CSS; shadow.append(style, v); }
  return v;`);
sub("  const host = document.getElementById('cardApprovalRequests'); if (!host) return;", "  renderRequestHistory();\n  const host = document.getElementById('cardApprovalRequests'); if (!host) return;");
sub('go, renderApprovalRequests, requestsToDecide:', 'go, renderApprovalRequests, renderRequestHistory, requestsToDecide:');
sub('<section id="cardApprovalRequests"', '<section id="cardMyRequests" style="grid-column:1 / -1;min-width:0" aria-label="Your requests" hidden></section><section id="cardRejectedRequests" style="grid-column:1 / -1;min-width:0" aria-label="Rejected request log" hidden></section><section id="cardApprovalRequests"');
sub('function renderApprovalRequests() {', fs.readFileSync('work/request-history.js','utf8')+'\nfunction renderApprovalRequests() {');
const a=s.indexOf("const BELL_SEEN ="), b=s.indexOf('/* ---------- header: Start / Stop',a);
if(a<0||b<0)throw Error('bell anchors');
s=s.slice(0,a)+fs.readFileSync('work/bell.js','utf8')+'\n\n'+s.slice(b);
// Keep the audit independent of notification visibility and preserve existing history.
sub('const ACT_SHEET = "Activity Log", ACT_DAYS = 30, ACT_MAX = 20000;', 'const ACT_SHEET = "Activity Log", ACT_DAYS = Infinity, ACT_MAX = Infinity;');
sub('const since = now - 30 * 86400000;', 'const since = -Infinity;');
sub('Entries older than 30 days are removed automatically.', 'History is retained for all users; notification audience settings do not filter this audit log.');
sub('Nothing recorded here in the past 30 days.', 'No activities recorded yet.');
sub('if (window.PERM && !PERM.canWrite()) { LOGQ.length = 0; return; }', 'if (window.PERM && !PERM.canWrite()) return;');
sub('catch (e) { console.warn("Activity Log sheet was not updated:", e); taken = []; }', 'catch (e) { throw new Error("Save stopped because the Activity Log could not be updated: " + e.message); }');
sub('const more = Array.isArray(extra) ? extra : [];', 'const more = (Array.isArray(extra) ? extra : []).map(stampActivity);');
sub('function appendActivity(entries) {', `function stampActivity(e) {
  const u = typeof CLOUD !== 'undefined' ? CLOUD.user() : null;
  return { ...e, eventId: e.eventId || crypto.randomUUID(), ...(u && e.user === u.name && !e.userId ? { userId: String(u.id) } : {}) };
}
function appendActivity(entries) {`);
sub('LOGQ.push({ ...e });', 'LOGQ.push(stampActivity(e));');
sub('  scheduleLogFlush();\n  return Promise.resolve();', "  scheduleLogFlush();\n  window.dispatchEvent(new CustomEvent('activity:changed'));\n  return Promise.resolve();");
// Do not let opening or refreshing the audit silently mark notifications read.
s=s.replace('openActivity(body).then(items => { if (items && window.bellSeen) window.bellSeen(items); })','openActivity(body)');
sub('window.loadTeamSettings = async () => {', 'window.loadTeamSettings = async (strict = false) => {');
sub('catch (e) { window.TD_SETTINGS = window.TD_SETTINGS || {}; }', 'catch (e) { if (strict) throw e; window.TD_SETTINGS = window.TD_SETTINGS || {}; }');
s=s.replaceAll('await window.loadTeamSettings();', 'await window.loadTeamSettings(true);');
sub('try { await window.loadTeamSettings(true); } catch { }', "try { await window.loadTeamSettings(true); } catch (e) { toast('Could not refresh requests: ' + e.message); return; }");
sub('const use = LOG_TYPES.includes(code) ? code : req.code;', "const requestedCode = LOG_TYPES.includes(code) ? code : req.code;\n  const use = requestedCode === 'LA' ? 'AL' : requestedCode;");
sub('async function approveRequest(id, code) {', `let requestDecisionBusy = false;
async function approveRequest(id, code) {
  if (requestDecisionBusy) { toast('Another request decision is being saved.'); return; }
  requestDecisionBusy = true;
  try { return await approveRequestOnce(id, code); }
  finally { requestDecisionBusy = false; renderApprovalRequests(); }
}
async function approveRequestOnce(id, code) {`);
sub("    const why = $('#rj-why', m).value.trim().slice(0, 200); closeModal();", "    if (requestDecisionBusy) { toast('Another request decision is being saved.'); return; }\n    requestDecisionBusy = true;\n    const why = $('#rj-why', m).value.trim().slice(0, 200); closeModal();");
sub("} catch (e) { toast('Could not reject: ' + e.message); }", "} catch (e) { toast('Could not reject: ' + e.message); } finally { requestDecisionBusy = false; renderApprovalRequests(); }");
sub("status: 'approved', code: use,", "status: 'approved', trackerSavedAt: new Date().toISOString(), code: use,");
// Request lifecycle remains auditable even if the workbook log flush is delayed.
sub('return activityWindow([...await actRead(zip, loc), ...LOGQ], null, Date.now() + 60000);', `const requestEvents = window.requestAuditEntries ? window.requestAuditEntries() : [];
  return activityWindow([...await actRead(zip, loc), ...LOGQ, ...requestEvents], null, Date.now() + 60000);`);
sub('function renderRequestHistory() {', `window.requestAuditEntries = () => reqList().flatMap(r => {
  const common = {name:r.name,key:r.empId || '',att:'attendance',details:{note:r.code + ' · ' + reqDatesText(r.dates || [])}};
  const events = [{...common,eventId:'request:'+r.id+':pending',time:r.at,user:r.by,userId:r.byId,action:'request-submitted'}];
  if (r.status !== 'pending') events.push({...common,eventId:'request:'+r.id+':'+r.status+':'+r.decidedAt,time:r.decidedAt,user:r.decidedBy || r.by,userId:r.decidedById || r.byId,action:'request-'+r.status,details:{note:common.details.note+(r.reason ? ' · Reason: '+r.reason : '')}});
  return events;
});
function renderRequestHistory() {`);
sub('"overwrite": "Overwrote newer changes", "settings": "Changed settings"', '"request-submitted": "Submitted request", "request-approved": "Approved request", "request-rejected": "Rejected request", "request-cancelled": "Cancelled request", "overwrite": "Overwrote newer changes", "settings": "Changed settings"');
fs.writeFileSync('outputs/index.html',s);
for(const [i,m] of [...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())try{new(require('vm').Script)(m[1]);}catch(e){throw Error('Script '+i+': '+e.message);}
console.log('All scripts parse.');
