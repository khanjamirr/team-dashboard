
/* =====================================================================
   v3.11 SETTINGS: one place for everything that used to sit in the header (Save & sync, Tools, More)
   and in "Manage passcodes". Admin-only sections appear only for the admin passcode.
   ===================================================================== */
(() => {
const el = id => document.getElementById(id);
const fill = (node, ...kids) => node.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
for (const id of ['btnActivity', 'btnWho', 'btnTheme', 'btnLogout']) { const b = el(id); if (b) b.hidden = true; }   // their jobs now live in Settings
document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && el('cleanFilters')) el('cleanFilters').open = true; }, true);

/* ---------- team settings (mandatory fields, ...) ---------- */
const LOCAL_KEY = 'td_settings_v1';
window.loadTeamSettings = async () => {
  try { window.TD_SETTINGS = PERM.online() ? ((await CLOUD.getSettings()) || {}) : JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); }
  catch (e) { window.TD_SETTINGS = window.TD_SETTINGS || {}; }
};
/* lists that anyone with an editing right may change (needs setup.sql from 3.12; the admin can still save without it) */
async function saveSharedSetting(key, value) {
  if (PERM.online()) {
    try { await CLOUD.setShared(key, value); }
    catch (e) {
      if (!/not set up|function|schema cache/i.test(e.message || '')) throw e;
      if (!PERM.isSuper()) throw new Error('Ask the super admin to run the latest supabase/setup.sql once, then try again.');
      await CLOUD.setSetting(key, value);
    }
  } else { const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); all[key] = value; localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); }
  window.TD_SETTINGS = { ...window.TD_SETTINGS, [key]: value };
}
window.saveSharedSetting = saveSharedSetting;
window.setClientNotNeeded = async (person, on) => {
  await loadTeamSettings();   // start from the latest list so two people don't undo each other
  const cur = Array.isArray(TD_SETTINGS.client_not_needed) ? TD_SETTINGS.client_not_needed : [];
  const same = x => (x.key && x.key === person.key) || (x.id && person.id && String(x.id) === String(person.id));
  const next = on ? [...cur.filter(x => !same(x)), { key: person.key, id: person.id == null ? '' : String(person.id), name: person.name }] : cur.filter(x => !same(x));
  await saveSharedSetting('client_not_needed', next);
  BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'settings', att: 'attendance', key: person.id || '', name: person.name, details: { note: on ? 'Marked as not needing a client' : 'Removed from “no client needed”' } }]);
  try { if (window.ATT && ATT.refresh) ATT.refresh(); dispatchEvent(new CustomEvent('att:data')); } catch { }
};
async function saveTeamSetting(key, value, note) {
  if (PERM.online()) await CLOUD.setSetting(key, value);
  else { const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); all[key] = value; localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); }
  window.TD_SETTINGS = { ...window.TD_SETTINGS, [key]: value };
  if (note) BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'settings', key: '', name: note.name, details: { note: note.text } }]);
}

/* ---------- rights on screen ---------- */
window.applyAccess = () => {
  if (el('app').hidden) return;
  for (const t of document.querySelectorAll('.tab[data-view]')) t.hidden = !PERM.canView(t.dataset.view);
  const show = (sel, on) => document.querySelectorAll(sel).forEach(x => { x.hidden = !on; });
  show('#btnAdd', PERM.can('emp.add'));
  show('#btnFill', PERM.can('emp.bulk'));
  show('.atab[data-atab="fill"]', PERM.can('emp.bulk'));
  show('.atab[data-atab="health"]', PERM.canView('attendance') && PERM.can('act.health'));
  show('.atab[data-atab="actions"]', PERM.can('act.items'));
  show('.atab[data-atab="review"]', PERM.can('act.review'));
  show('#cardAttendance', PERM.canView('attendance') && PERM.can('ov.attendance'));
  window.ATT?.renderApprovalRequests();
  show('#cardComing', PERM.can('ov.coming'));
  show('#cardWatch', PERM.can('ov.watch'));
  show('#btnAddField', PERM.can('emp.fields'));
  show('#btnBell', PERM.can('notifications.view') || PERM.can('activity.view'));
  window.refreshNotifications?.();
  document.body.classList.toggle('no-report-export', !PERM.can('rep.export'));
  /* v3.14: each report group has its own right */
  const rg = el('reportGroup');
  if (rg) {
    const need = { team: 'rep.team', growth: 'rep.growth', location: 'rep.location', attendance: 'rep.attendance' };
    for (const o of rg.options) { const ok = PERM.can(need[o.value] || 'page.reports') && (o.value !== 'attendance' || PERM.canView('attendance')); o.hidden = o.disabled = !ok; }
    if (rg.selectedOptions[0] && rg.selectedOptions[0].disabled) { const f = [...rg.options].find(o => !o.disabled); if (f) { rg.value = f.value; if (typeof state !== 'undefined' && state.view === 'reports' && state.schema) { renderCharts(); attSync(); window.placeSavedFilters?.(); } } }
  }
  if (typeof state !== 'undefined' && state.schema && state.view === 'actions') syncActionTabs();
  if (typeof state !== 'undefined' && state.schema && !PERM.canView(state.view)) setView(PERM.firstView());
  renderSyncButtons();
};
setInterval(async () => { if (PERM.online() && !el('app').hidden && !document.hidden) { await CLOUD.refreshMe(); applyAccess(); } }, 60000);

/* ---------- v3.15: leave requests waiting for a manager: badge on Attendance, refreshed every 45 seconds ---------- */
function updateReqBadge() {
  window.ATT?.renderApprovalRequests();
  const t = document.querySelector('.tab[data-view="attendance"]'); if (!t) return;
  let b = t.querySelector('.tabn.req'); const n = window.ATT && ATT.requestsToDecide ? ATT.requestsToDecide() : 0;
  if (!b) { b = h('span', { class: 'tabn req', title: 'Leave requests waiting for your approval' }); t.append(b); }
  b.textContent = String(n); b.hidden = !n;
}
let reqPolling = false;
async function pollRequests() {
  if (reqPolling || !PERM.online() || el('app').hidden || document.hidden || typeof state === 'undefined' || !state.schema) return;
  reqPolling = true;
  try {
    const before = JSON.stringify((window.TD_SETTINGS || {}).leave_requests || []);
    await loadTeamSettings();
    if (JSON.stringify((window.TD_SETTINGS || {}).leave_requests || []) !== before && window.ATT && ATT.redraw) ATT.redraw();
  } catch { } finally { reqPolling = false; updateReqBadge(); }
}
setInterval(pollRequests, 45000);
addEventListener('att:requests', updateReqBadge);
addEventListener('att:data', updateReqBadge);
addEventListener('att:sync', updateReqBadge);
setTimeout(updateReqBadge, 3000);

/* ---------- v3.14: activity bell (top right, every page) ---------- */
// Read state is separate for each signed-in account and team on this browser.
const notificationKey = () => 'td_notification_reads_v2:' + JSON.stringify([CLOUD.SUPABASE_CONFIG?.url || localStorage.getItem('td_supabase_url') || BE.dir()?.name || 'local', CLOUD.user()?.id ?? BE.userName()]);
const notificationReads = () => { try { const a = JSON.parse(localStorage.getItem(notificationKey()) || '[]'); return new Set(Array.isArray(a) ? a : []); } catch { return new Set(); } };
const notificationPermission = () => PERM.can('notifications.view');
window.requestNotificationVisible = r => {
  if (!notificationPermission()) return false;
  if (PERM.isSuper()) return true;
  const u = CLOUD.user(), me = String(u?.id ?? '');
  if (me && String(r.byId) === me) return true;
  const audience = u?.permissions?._notificationAudience || {mode:'all'};
  return audience.mode === 'all' || (audience.mode === 'selected' && (audience.users || []).map(String).includes(String(r.byId)));
};
const notificationRequestEvents = () => {
  const all = (window.TD_SETTINGS || {}).leave_requests || [];
  return (Array.isArray(all) ? all : []).filter(requestNotificationVisible).flatMap(r => {
    const detail = `${r.name} · ${r.code} · ${(r.dates || []).join(', ')}`;
    const common = {requestId:r.id, user:r.by, userId:r.byId, name:r.name};
    const events = [{...common,id:'request:'+r.id+':pending',time:r.at,title:'Request submitted',detail:detail+' · Requested by '+r.by,type:'request'}];
    if (r.status !== 'pending') events.push({...common,id:'request:'+r.id+':'+r.status+':'+r.decidedAt,time:r.decidedAt,title:r.status === 'approved' ? 'Request approved · saved to tracker' : r.status === 'rejected' ? 'Request rejected' : 'Request cancelled',detail:detail+' · '+(r.decidedBy || r.by)+(r.reason ? ' · Reason: '+r.reason : ''),type:'request'});
    return events;
  });
const activityNotification = it => ({id:'activity:'+(it.eventId || JSON.stringify([it.time,it.user,it.action,it.key,it.name,it.details])),time:it.time,title:(BE.ACT_VERBS[it.action] || it.action || 'Activity')+' · '+(it.name || ''),detail:(it.user || 'Unknown user')+' · '+BE.actDetails(it),type:'activity'});
let notificationItems = [], notificationOwner = '', notificationBody = null, bellBusy = false, activityError = '';
function bellShow(n) {
  const b=el('bellN'), btn=el('btnBell'); if (!b || !btn) return;
  b.hidden=!n; b.textContent=''; b.style.cssText='width:9px;min-width:9px;height:9px;padding:0;top:1px;right:1px;border-radius:50%;background:#e34948';
  btn.title=n ? `${n} unread notifications` : 'Notifications';
  btn.setAttribute('aria-label', n ? `Notifications: ${n} unread` : 'Notifications');
}
function unreadCount() { const read=notificationReads(); return notificationItems.filter(it=>!read.has(it.id)).length; }
function markNotificationsRead(ids) {
  const read=notificationReads(); ids.forEach(id=>read.add(id));
  try { localStorage.setItem(notificationKey(),JSON.stringify([...read])); }
  catch { toast('Could not save read status in this browser.',true); return; }
  bellShow(unreadCount()); drawNotifications();
}
function drawNotifications() {
  if (!notificationBody?.isConnected) return;
  const read=notificationReads(), unread=unreadCount();
  const allRead=h('button',{class:'btn mini',disabled:!unread,onclick:()=>markNotificationsRead(notificationItems.map(it=>it.id))},'Mark all read');
  notificationBody.replaceChildren(
    h('div',{class:'activity-controls'},h('b',{},`${unread} unread`),h('span',{class:'spacer'}),allRead,h('button',{class:'btn mini',onclick:()=>bellCheck()},'Refresh')),
    h('p',{class:'set-hint'},'Read status is saved for your account on this browser. Opening this panel does not mark notifications as read.'),
    ...(activityError ? [h('p',{class:'err',role:'status'},activityError)] : []),
    notificationItems.length ? h('ul',{class:'act'},...notificationItems.map(it=>h('li',{style:read.has(it.id)?'':'border-left:3px solid var(--danger);padding-left:12px'},
      h('div',{class:'line'},h('b',{},it.title),h('span',{class:'time'},new Date(it.time).toLocaleString())),
      h('p',{},it.detail),read.has(it.id)?h('span',{class:'hint'},'Read'):h('button',{class:'btn mini',onclick:()=>markNotificationsRead([it.id])},'Mark as read')))) : h('div',{class:'empty'},'No notifications to show.'),
    PERM.can('activity.view') ? h('button',{class:'btn',onclick:()=>openActivity(notificationBody)},'Open activity log · all users') : null);
}
async function bellCheck() {
  if (bellBusy || el('app').hidden || document.hidden) return;
  const owner=notificationKey();
  if (notificationOwner !== owner) { notificationOwner=owner; notificationItems=[]; activityError=''; }
  if (!notificationPermission() && !PERM.can('activity.view')) { notificationItems=[];bellShow(0);drawNotifications();return; }
  bellBusy=true;
  try {
    await loadTeamSettings();
    let activity=[];activityError='';
    if (PERM.can('activity.view')) {
      try { const d=await api('GET','/api/activity'); activity=(d.items || []).map(activityNotification); }
      catch(e) { activityError='Activity could not be loaded: '+e.message; }
    }
    if (owner !== notificationKey()) return;
    // Recheck access after asynchronous reads so changed permissions take effect.
    notificationItems=[...notificationRequestEvents(),...(PERM.can('activity.view')?activity:[])].sort((a,b)=>(Date.parse(b.time)||0)-(Date.parse(a.time)||0));
    bellShow(unreadCount());drawNotifications();window.ATT?.renderRequestHistory();
  } catch(e) { activityError='Notifications could not be refreshed: '+e.message;drawNotifications(); }
  finally { bellBusy=false; }
}
window.refreshNotifications=()=>{ bellShow(unreadCount());bellCheck(); };
window.openBell=()=>{
  if (!notificationPermission() && !PERM.can('activity.view')) { toast('Notification access is disabled for your account.',true);return; }
  notificationBody=h('div',{class:'body'},h('div',{class:'empty'},'Loading notifications…'));
  mountDrawer(h('aside',{class:'drawer activity-drawer',role:'dialog','aria-modal':'true','aria-label':'Notifications'},h('header',{},h('h2',{},'Notifications'),h('button',{class:'btn ghost',onclick:closeDrawer,'aria-label':'Close'},'✕')),notificationBody));
  bellCheck();
};
el('btnBell').addEventListener('click',()=>window.openBell());
setTimeout(bellCheck,4000);
setInterval(bellCheck,45000);
addEventListener('att:requests',bellCheck);
addEventListener('att:sync',bellCheck);
addEventListener('activity:changed',bellCheck);
addEventListener('focus',bellCheck);
addEventListener('storage',e=>{if(e.key===notificationKey()){bellShow(unreadCount());drawNotifications();}});


/* ---------- header: Start / Stop auto-sync, Save now, Settings ---------- */
const attS = () => { try { return window.ATT && ATT.state ? ATT.state() : null; } catch { return null; } };
function renderSyncButtons() {
  const b = el('btnAutoSync'), sv = el('btnSaveNow'); if (!b || !sv) return;
  const a = attS(), ready = a && a.status === 'ready' && a.ctx;
  if (!ready || !PERM.canWrite()) { b.hidden = true; sv.hidden = true; return; }
  const n = a.changes.length;
  b.hidden = !PERM.can('sync.auto');
  b.className = 'btn ghost autosync ' + (a.autoErr ? 'as-warn' : a.auto ? 'as-on' : 'as-off');
  b.textContent = a.auto ? 'Stop auto-sync' : 'Start auto-sync';
  b.title = a.autoErr ? 'Auto-sync needs you: ' + a.autoErr + '.' : a.auto ? 'Auto-sync is on: attendance changes save a moment after you make them. Click to stop.' : 'Auto-sync is off: attendance changes wait until you press Save now. Click to start.';
  const showSave = a.saving || (n > 0 && (!a.auto || !!a.autoErr));
  sv.hidden = !showSave || !PERM.can('sync.save'); sv.disabled = !!a.saving;
  sv.textContent = a.saving ? 'Saving…' : 'Save now (' + n + ')';
}
el('btnAutoSync').addEventListener('click', () => { const a = attS(); if (!a) return; ATT.setAutoSync(!a.auto); toast(a.auto ? 'Auto-sync started. Attendance changes save by themselves.' : 'Auto-sync stopped. Press Save now when you are ready.'); renderSyncButtons(); });
el('btnSaveNow').addEventListener('click', async () => { await ATT.save(); renderSyncButtons(); });
addEventListener('att:sync', renderSyncButtons);

let lastIssue = '';
setInterval(() => {
  if (el('app').hidden) return;
  renderSyncButtons();
  const a = attS();
  const issue = (a && a.autoErr) || (a && a.status !== 'ready' && a.status !== 'idle' && a.status !== 'loading' ? 'Attendance: ' + (a.msg || a.status) : '') || (typeof state !== 'undefined' && !state.online ? 'Workforce connection unavailable' : '') || (window.GD && GD.error) || '';
  if (issue && issue !== lastIssue && !/auto-sync is stopped/i.test(issue)) toast(issue, true);
  lastIssue = issue;
}, 1000);
window.addEventListener('beforeunload', e => { if ((typeof employeePending !== 'undefined' && employeePending) || (!window.dashboardSigningOut && window.ATT && ATT.dirty()) || (window.GD && GD.busy)) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('focus', () => { if (typeof poll === 'function') poll(); });

/* ---------- the Settings dialog ---------- */
const when = t => t ? new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const download = (name, bytes) => { const a = h('a', { href: URL.createObjectURL(new Blob([bytes], { type: XLSX })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
const pickXlsx = () => new Promise(res => { const i = Object.assign(document.createElement('input'), { type: 'file', accept: '.xlsx,.xlsm' }); i.onchange = () => res(i.files[0] || null); i.click(); });
/* a button that asks \"Are you sure?\" in place, because pop-up dialogs would sit behind Settings */
function confirmButton(label, sure, fn, cls = 'btn danger') {
  const b = h('button', { class: cls, type: 'button' }, label); let armed = false, t = null;
  b.addEventListener('click', async () => {
    if (!armed) { armed = true; b.textContent = sure; b.classList.add('armed'); t = setTimeout(() => { armed = false; b.textContent = label; b.classList.remove('armed'); }, 4000); return; }
    clearTimeout(t); armed = false; b.textContent = label; b.classList.remove('armed'); await fn();
  });
  return b;
}
const checkLine = (text, checked, attrs = {}) => { const c = h('input', { type: 'checkbox', checked, ...attrs }); return { box: c, el: h('label', { class: 'chk-line' }, c, h('span', {}, text)) }; };

const MODULES = [
  { id: 'people', name: 'People & access', show: () => PERM.online() && PERM.isSuper(), draw: drawPeople },
  { id: 'fields', name: 'Mandatory fields', show: () => PERM.isSuper() || PERM.can('set.fields'), draw: drawFields },
  { id: 'sync', name: 'Save & sync', show: () => PERM.can('sync.view'), draw: drawSync },
  { id: 'workbook', name: 'Workbook & backups', show: () => PERM.can('set.workbook') || PERM.can('workbook.download'), draw: drawWorkbook },
  { id: 'tools', name: 'Tools', show: () => PERM.can('tools.distance'), draw: drawTools },
  { id: 'prefs', name: 'Preferences', show: () => true, draw: drawPrefs },
];
let current = null, ticker = null;
/* v3.12: Settings is a page in the left menu (no longer a dialog) */
window.openSettings = id => { if (id) current = id; if (state.view !== 'settings') setView('settings'); else drawSettingsPage(); };
window.drawSettingsPage = () => {
  const host = el('pageSettings'); if (!host || typeof state === 'undefined' || state.view !== 'settings') return;
  clearInterval(ticker); ticker = null;
  const mods = MODULES.filter(m => m.show());
  const mod = mods.find(m => m.id === current) || mods[0];
  current = mod.id;
  const u = CLOUD.user(), who = PERM.online() ? ('Signed in as ' + u.name + ' · ' + (PERM.roleNames[u.role] || 'User')) : 'Excel file on this computer';
  const pane = h('div', { class: 'set-pane' });
  fill(host, h('div', { class: 'set-page' },
    h('nav', { class: 'set-nav', 'aria-label': 'Settings sections' }, h('p', { class: 'set-who' }, who), ...mods.map(m => h('button', { class: 'set-nav-item', type: 'button', 'aria-current': m === mod ? 'page' : null, onclick: () => { current = m.id; drawSettingsPage(); } }, m.name))),
    h('section', { class: 'set-main', 'aria-labelledby': 'setModTitle' }, h('h3', { class: 'set-title', id: 'setModTitle' }, mod.name), pane)));
  Promise.resolve().then(() => mod.draw(pane)).catch(e => fill(pane, h('p', { class: 'err' }, e.message || String(e))));
};
const onSettings = () => typeof state !== 'undefined' && state.view === 'settings';

/* ----- People & access (admin, online) ----- */
function rightsSummary(u) {
  const role = PERM.roleNames[u.role] || 'User';
  if (u.role === 'superadmin') return 'Super admin · every right';
  const p = PERM.upgrade(u.permissions || {});
  if (!p._v) return role + ' · full access';
  for (const [name, preset] of Object.entries(PERM.presets)) if (PERM.keys.every(k => !!p[k] === !!preset[k])) return role + ' · ' + name;
  return role + ' · custom (' + PERM.keys.filter(k => p[k]).length + ' rights)';
}
async function drawPeople(pane, selectId) {
  fill(pane, h('p', { class: 'set-hint' }, 'Loading people…'));
  const users = await CLOUD.admin.users(), me = CLOUD.user();
  const list = h('div', { class: 'ppl-list' }), editor = h('div', { class: 'ppl-editor' });
  const select = u => {
    list.querySelectorAll('.ppl-item').forEach(b => b.setAttribute('aria-current', b.dataset.id === String(u ? u.id : 'new') ? 'true' : 'false'));
    drawEditor(editor, u, id => drawPeople(pane, id), users);
  };
  for (const u of users) list.append(h('button', { class: 'ppl-item' + (u.active ? '' : ' off'), type: 'button', 'data-id': String(u.id), onclick: () => select(u) },
    h('b', {}, u.name + (u.id === me.id ? ' (you)' : '')), h('small', {}, rightsSummary(u) + (u.active ? '' : ' · can’t sign in'))));
  fill(pane, 
    h('p', { class: 'set-hint' }, 'Everyone signs in with their own passcode. Choose what each person can open and change. Admins can do everything, including these settings.'),
    h('div', { class: 'ppl' }, h('div', { class: 'ppl-side' }, h('button', { class: 'btn primary', type: 'button', onclick: () => select(null) }, 'Add person'), list), editor));
  select(users.find(u => u.id === selectId) || users.find(u => u.id === me.id) || users[0] || null);
}
/* filters: what the super admin can fix for a person */
const FILTER_NAMES = { status: 'Status', desig: 'Designation', client: 'Client', mode: 'Work mode' };
function currentFilters() {
  return { fields: typeof chosenFilterFields === 'function' ? chosenFilterFields() : undefined, q: (state.filters && state.filters.q) || '',
    sel: Object.fromEntries(Object.entries((state.filters && state.filters.sel) || {}).map(([k, v]) => [k, [...v]]).filter(([, v]) => v.length)) };
}
function filterText(f) {
  if (!f) return '';
  const label = k => FILTER_NAMES[k] || (typeof XDIMS !== 'undefined' && XDIMS[k] ? XDIMS[k].label : null) || (k.startsWith('field:') ? ((state.idx[k.slice(6)] != null && state.cols[state.idx[k.slice(6)]].label) || k.slice(6)) : k);
  const parts = Object.entries(f.sel || {}).filter(([, v]) => v && v.length).map(([k, v]) => label(k) + ': ' + v.join(', '));
  if (f.q) parts.unshift('search “' + f.q + '”');
  return parts.join(' · ') || 'no filters (everyone)';
}
window.filterText = filterText;
function drawEditor(box, u, reload, users = []) {
  const me = CLOUD.user(), isNew = !u, self = u && u.id === me.id;
  const err = h('p', { class: 'err', role: 'alert' });
  const name = h('input', { class: 'input', value: u ? u.name : '', 'aria-label': 'Name', autocomplete: 'off' });
  const code = h('input', { class: 'input', type: isNew ? 'text' : 'password', value: u ? u.passcode : CLOUD.admin.genCode(), 'aria-label': 'Passcode', autocomplete: 'off', spellcheck: 'false' });
  const eye = h('button', { class: 'btn', type: 'button', onclick: () => { code.type = code.type === 'password' ? 'text' : 'password'; eye.textContent = code.type === 'password' ? 'Show' : 'Hide'; } }, isNew ? 'Hide' : 'Show');
  const fresh = h('button', { class: 'btn', type: 'button', onclick: () => { code.value = CLOUD.admin.genCode(); code.type = 'text'; eye.textContent = 'Hide'; } }, 'New');
  const curRole = u ? u.role : 'user';
  const role = h('select', { class: 'input', 'aria-label': 'Role' }, ...['user', 'admin', 'superadmin'].map(r => h('option', { value: r, selected: curRole === r }, PERM.roleNames[r])));
  const active = checkLine('Can sign in', u ? u.active : true);
  /* optional link to an employee in the workforce sheet */
  const empOpts = (typeof state !== 'undefined' && state.schema ? state.rows : []).map(r => ({ code: String(gs(r, 'key_column') || ''), name: gs(r, 'name_column').trim() })).filter(x => x.code && x.name).sort((a, b) => a.name.localeCompare(b.name));
  const labelOf = x => x.name + ' · ' + x.code;
  const curEmp = u && u.permissions && u.permissions._emp ? empOpts.find(x => x.code === String(u.permissions._emp)) || { code: String(u.permissions._emp), name: u.permissions._empName || '' } : null;
  const emp = h('input', { class: 'input', list: 'setEmpList', value: curEmp ? labelOf(curEmp) : '', placeholder: 'Not linked', 'aria-label': 'Linked employee (optional)', autocomplete: 'off' });
  const empList = h('datalist', { id: 'setEmpList' }, ...empOpts.map(x => h('option', { value: labelOf(x) })));
  const empPick = () => { const v = emp.value.trim(); if (!v) return null; return empOpts.find(x => labelOf(x) === v) || empOpts.find(x => x.code === v) || empOpts.find(x => x.name.toLowerCase() === v.toLowerCase()); };
  const start = u && u.permissions && u.permissions._v ? PERM.upgrade(u.permissions) : u ? PERM.presets['Full access'] : PERM.presets['Editor'];
  const audience = u?.permissions?._notificationAudience || { mode: 'all', users: [] };
  const audienceMode = h('select', { class: 'input', 'aria-label': 'Whose request notifications this person can see' },
    ...[['all','All users'],['own','Only their own requests'],['selected','Their own + selected users']].map(([value,label]) => h('option',{value,selected:audience.mode === value},label)));
  const audienceChecks = users.map(person => ({ id: String(person.id), ...checkLine(person.name, (audience.users || []).map(String).includes(String(person.id))) }));
  const audienceList = h('div', {class:'rmod-items',hidden:audienceMode.value !== 'selected'}, ...audienceChecks.map(c => c.el));
  audienceMode.onchange = () => { audienceList.hidden = audienceMode.value !== 'selected'; };
  const audienceBox = h('div', {class:'rmod-extra'}, h('label',{},'Request notifications from',audienceMode), audienceList,
    h('p',{class:'rmod-note'},'Applies to request notifications and rejected-request history. Their own requests are always included. All users receive approved-request notifications by default. Activity log access is separate.'));
  /* fixed filters for this person */
  let fixed = u && u.permissions && u.permissions._filters ? u.permissions._filters : null;
  const fsum = h('p', { class: 'rmod-note' });
  const drawFixed = () => { fsum.textContent = fixed ? 'Fixed filters: ' + filterText(fixed) : 'No fixed filters: they start with everyone shown.'; };
  drawFixed();
  /* v3.14.1: the super admin picks the fixed filters right here, value by value */
  const dims = (() => {
    const out = [], rows = (typeof state !== 'undefined' && state.schema) ? state.rows : [];
    const add = (k, label) => {
      const m = new Map();
      for (const r of rows) { let v; try { v = dimVal(k, r); } catch { v = ''; } v = String(v ?? '').trim(); if (v) m.set(v, (m.get(v) || 0) + 1); }
      if (m.size) out.push({ k, label, values: [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) });
    };
    for (const [k, label] of Object.entries(FILTER_NAMES)) add(k, label);
    if (typeof XDIMS !== 'undefined') for (const [k, d] of Object.entries(XDIMS)) add(k, d.label);
    return out;
  })();
  const editor = h('div', { class: 'ff-editor', hidden: true });
  const fq = h('input', { class: 'input', type: 'search', placeholder: 'Search text (optional), e.g. a name or ID', 'aria-label': 'Fixed search text', value: (fixed && fixed.q) || '' });
  const pickers = {};
  const readEditor = () => {
    const sel = {}; for (const [k, set] of Object.entries(pickers)) { const on = [...set.boxes].filter(b => b.checked).map(b => b.value); if (on.length) sel[k] = on; }
    const q = fq.value.trim();
    fixed = q || Object.keys(sel).length ? { fields: fixed && fixed.fields, q, sel } : null;
    for (const [k, set] of Object.entries(pickers)) set.count.textContent = (sel[k] ? sel[k].length : 0) ? sel[k].length + ' of ' + set.boxes.length : 'Any';
    drawFixed();
  };
  const fillEditor = () => {
    fq.value = (fixed && fixed.q) || '';
    const cur = (fixed && fixed.sel) || {};
    for (const [k, set] of Object.entries(pickers)) { const chosen = new Set(cur[k] || []); for (const b of set.boxes) b.checked = chosen.has(b.value); set.count.textContent = chosen.size ? chosen.size + ' of ' + set.boxes.length : 'Any'; }
  };
  if (!dims.length) editor.append(h('p', { class: 'rmod-note' }, 'Open the workbook first to choose filter values here.'));
  else {
    fq.addEventListener('input', readEditor);
    editor.append(h('label', { class: 'ff-q' }, h('span', {}, 'Search'), fq),
      h('div', { class: 'ff-grid' }, ...dims.map(d => {
        const boxes = d.values.map(([v, n]) => h('input', { type: 'checkbox', value: v }));
        const count = h('small', { class: 'ff-count' }, 'Any');
        pickers[d.k] = { boxes, count };
        boxes.forEach(b => b.addEventListener('change', readEditor));
        const all = h('button', { class: 'linkbtn', type: 'button', onclick: () => { boxes.forEach(b => { b.checked = true; }); readEditor(); } }, 'All');
        const none = h('button', { class: 'linkbtn', type: 'button', onclick: () => { boxes.forEach(b => { b.checked = false; }); readEditor(); } }, 'Any');
        return h('details', { class: 'ff-dim', open: !!(fixed && fixed.sel && fixed.sel[d.k] && fixed.sel[d.k].length) || null },
          h('summary', {}, h('b', {}, d.label), count),
          h('div', { class: 'ff-tools' }, all, h('span', {}, '·'), none, h('small', {}, 'None ticked = no limit')),
          h('div', { class: 'ff-list' }, ...d.values.map(([v, n], i) => h('label', { class: 'chk-line' }, boxes[i], h('span', {}, v), h('small', {}, String(n))))));
      })));
    fillEditor();
  }
  const editBtn = h('button', { class: 'btn mini primary', type: 'button', onclick: () => { editor.hidden = !editor.hidden; editBtn.textContent = editor.hidden ? 'Choose filters here' : 'Hide filter choices'; if (!editor.hidden) fillEditor(); } }, 'Choose filters here');
  const fixedBox = h('div', { class: 'rmod-extra' }, fsum,
    h('div', { class: 'set-actions flat' },
      editBtn,
      h('button', { class: 'btn mini', type: 'button', onclick: () => { fixed = currentFilters(); if (!fixed.q && !Object.keys(fixed.sel).length) fixed = null; drawFixed(); fillEditor(); } }, 'Use the filters on my screen now'),
      h('button', { class: 'btn mini', type: 'button', onclick: () => { fixed = null; drawFixed(); fillEditor(); } }, 'Clear')),
    editor,
    h('p', { class: 'rmod-note' }, 'They start with these filters every time they sign in. Without “Change the filters” they can’t change or clear them.'));
  /* rights, one card per module: the module's page on top, what they can do in it underneath */
  const boxes = {}, syncs = [];
  const isSuper = () => role.value === 'superadmin';
  const modules = PERM.groups.map(g => {
    const items = g.items.map(([k, label]) => { const c = checkLine(label, !!start[k], { 'data-k': k }); boxes[k] = c.box; return c; });
    const subItems = ((g.sub && g.sub.items) || []).map(([k, label]) => { const c = checkLine(label, !!start[k], { 'data-k': k }); boxes[k] = c.box; return c; });
    const subBox = subItems.length ? h('div', { class: 'rmod-sub' }, h('p', { class: 'rmod-subt' }, g.sub.title),
      h('div', { class: 'rmod-subtools' }, h('button', { class: 'linkbtn', type: 'button', onclick: () => { subItems.forEach(c => { if (!c.box.disabled) c.box.checked = true; }); } }, 'All'), ' · ', h('button', { class: 'linkbtn', type: 'button', onclick: () => { subItems.forEach(c => { if (!c.box.disabled) c.box.checked = false; }); } }, 'None')),
      h('div', { class: 'rmod-chips' }, ...subItems.map(c => c.el)),
      h('p', { class: 'rmod-note' }, 'Only these types appear in the Type list of Log leave. A ticked type can be logged even without “Approve or reject leave” or “Mark and edit attendance”; changing a day that already holds approved leave still needs “Approve or reject leave”.')) : null;
    let head;
    if (g.page) { const c = checkLine('', !!start[g.page], { 'data-k': g.page, 'aria-label': 'Can open ' + g.name }); boxes[g.page] = c.box; head = h('label', { class: 'rmod-head' }, c.box, h('b', {}, g.name), h('small', {}, 'can open this page')); }
    else head = h('div', { class: 'rmod-head' }, h('b', {}, g.name));
    const card = h('div', { class: 'rmod' + (g.name === 'Filters' ? ' rmod-wide' : '') }, head, items.length ? h('div', { class: 'rmod-items' }, ...items.map(c => c.el)) : null, subBox, g.name === 'Filters' ? fixedBox : g.name === 'Notifications' ? audienceBox : null);
    const sync = () => { const off = g.page && !boxes[g.page].checked; card.classList.toggle('off', !!off); for (const c of items) c.box.disabled = isSuper() || !!off; for (const c of subItems) c.box.disabled = isSuper() || !!off; if (g.page) boxes[g.page].disabled = isSuper(); };
    if (g.page) boxes[g.page].addEventListener('change', sync);
    syncs.push(sync);
    return card;
  });
  const presets = h('div', { class: 'rights-presets' }, h('span', {}, 'Start from:'), ...Object.entries(PERM.presets).map(([n, p]) => h('button', { class: 'btn mini', type: 'button', onclick: () => { for (const k of PERM.keys) boxes[k].checked = !!p[k]; syncs.forEach(f => f()); } }, n)));
  const superNote = h('p', { class: 'set-hint' }, 'Super admins have every right, and only they can manage people, rights and fixed filters.');
  const roleNote = h('p', { class: 'set-hint' }, 'Admins and users get exactly the rights ticked below; only a super admin can change them.');
  const rights = h('div', { class: 'rights' }, h('h4', {}, 'What they can do'), superNote, roleNote, presets, h('div', { class: 'rmods' }, ...modules));
  const syncRole = () => { const sup = isSuper(); rights.classList.toggle('is-admin', sup); superNote.hidden = !sup; roleNote.hidden = sup; presets.hidden = sup; fixedBox.hidden = sup; audienceBox.hidden = sup; syncs.forEach(f => f()); };
  role.addEventListener('change', () => { if (isNew && role.value === 'admin') { for (const k of PERM.keys) boxes[k].checked = !!PERM.presets['Admin'][k]; } syncRole(); });
  syncRole();
  const rightsNow = () => Object.fromEntries([['_v', 7], ...PERM.keys.map(k => [k, boxes[k].checked])]);
  const save = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
    err.textContent = ''; save.disabled = true; save.textContent = 'Saving…';
    try {
      const nm = name.value.trim(), pc = code.value.trim(), linked = empPick();
      if (linked === undefined) throw new Error('Pick the linked employee from the list, or leave it empty.');
      const link = linked ? { _emp: linked.code, _empName: linked.name } : {};
      const perms = isSuper() ? link : { ...rightsNow(), ...link, _notificationAudience: { mode: audienceMode.value, users: audienceChecks.filter(c => c.box.checked).map(c => c.id) }, ...(fixed ? { _filters: fixed } : {}) };
      const r = await CLOUD.admin.save(u ? u.id : null, nm, pc, role.value, active.box.checked, perms);
      if (self) { CLOUD.admin.selfUpdated(nm); await CLOUD.refreshMe(); applyAccess(); }
      BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'settings', key: '', name: nm, details: { note: (isNew ? 'Added ' : 'Updated access for ') + nm + ' · ' + rightsSummary({ role: role.value, permissions: perms }) + (fixed && !isSuper() ? ' · fixed filters: ' + filterText(fixed) : '') + (active.box.checked ? '' : ' · sign-in disabled') } }]);
      toast(isNew ? 'Added ' + nm + '. Give them their passcode.' : 'Saved. ' + (u.passcode !== pc ? 'The new passcode works now; the old one has stopped.' : 'Their rights apply within a minute.'));
      await reload(r && r.id);
    } catch (e) { err.textContent = e.message; save.disabled = false; save.textContent = isNew ? 'Add person' : 'Save changes'; }
  } }, isNew ? 'Add person' : 'Save changes');
  const del = !isNew && !self ? confirmButton('Delete', 'Click again to delete', async () => {
    try { await CLOUD.admin.remove(u.id); toast(u.name + ' deleted. Their passcode no longer works.'); await reload(null); } catch (e) { err.textContent = e.message; }
  }) : null;
  fill(box,
    h('h4', { class: 'ppl-name' }, isNew ? 'New person' : u.name),
    h('div', { class: 'ppl-row' },
      h('label', {}, 'Name', name),
      h('label', {}, 'Passcode', h('div', { class: 'pc-wrap' }, code, eye, fresh)),
      h('label', {}, 'Role', role),
      h('label', {}, 'Linked employee (optional)', emp, empList)),
    active.el,
    u && u.last_login ? h('p', { class: 'set-hint' }, 'Last signed in ' + when(u.last_login) + '.') : null,
    rights,
    h('div', { class: 'set-actions' }, save, h('span', { class: 'spacer' }), del),
    err);
  if (isNew) name.focus();
}

/* ----- fixed filters: applied when someone signs in; locked unless they may change filters ----- */
window.applyFixedFilters = () => {
  const f = PERM.fixedFilters(), locked = !PERM.can('filters.custom');
  if (f) {
    state.filters = { fields: Array.isArray(f.fields) ? f.fields.filter(k => typeof k === 'string') : undefined, q: f.q || '', sel: Object.fromEntries(Object.entries(f.sel || {}).map(([k, v]) => [k, new Set(v)])), inited: true };
    const q = el('fq'); if (q) q.value = f.q || '';
  } else if (locked) { state.filters = { q: '', sel: {}, inited: true }; const q = el('fq'); if (q) q.value = ''; }
  document.body.classList.toggle('filters-locked', locked);
};

/* ----- Mandatory fields ----- */
async function drawFields(pane) {
  if (!state.schema) { fill(pane, h('p', { class: 'set-hint' }, 'Open the workbook first.')); return; }
  const chosen = new Set(requiredCols().map(x => x[0]));
  const cols = state.cols.filter(c => !c.auto && c.name !== state.schema.tenure_column);
  const q = h('input', { class: 'input', type: 'search', placeholder: 'Find a field…', 'aria-label': 'Find a field', style: 'max-width:260px' });
  const count = h('span', { class: 'req-count' });
  const list = h('div', { class: 'req-list' });
  const draw = () => {
    const t = q.value.trim().toLowerCase();
    fill(list, ...cols.filter(c => !t || (c.label + ' ' + c.name).toLowerCase().includes(t)).map(c => {
      const l = checkLine(c.label + (c.label !== c.name ? ' (' + c.name + ')' : ''), chosen.has(c.name));
      l.box.addEventListener('change', () => { if (l.box.checked) chosen.add(c.name); else chosen.delete(c.name); count.textContent = chosen.size + ' mandatory'; });
      return l.el;
    }));
    count.textContent = chosen.size + ' mandatory';
  };
  q.addEventListener('input', draw); draw();
  const err = h('p', { class: 'err', role: 'alert' });
  const save = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
    err.textContent = ''; save.disabled = true;
    try {
      const names = cols.map(c => c.name).filter(n => chosen.has(n));
      await saveTeamSetting('required_fields', names, { name: 'Mandatory fields', text: 'Mandatory fields: ' + (names.map(n => state.cols[state.idx[n]].label).join(', ') || 'none') });
      renderAll(); toast('Saved. Action items now check ' + (names.length ? names.length + ' field' + (names.length === 1 ? '' : 's') : 'no fields') + '.');
    } catch (e) { err.textContent = e.message; }
    save.disabled = false;
  } }, 'Save mandatory fields');
  const reset = h('button', { class: 'btn', type: 'button', onclick: () => { chosen.clear(); requiredDefaultCols().forEach(n => chosen.add(n)); draw(); } }, 'Use the defaults');
  const okList = Array.isArray(TD_SETTINGS.client_not_needed) ? TD_SETTINGS.client_not_needed : [];
  const okCard = h('div', { class: 'set-card', style: 'margin-top:22px' }, h('h4', {}, 'People who don’t need a client · ' + okList.length),
    h('p', { class: 'set-hint' }, 'These tracker people are never flagged for a missing client. Add people from Action center > Attendance data health > Fix people with “No client needed”.'),
    okList.length ? h('ul', { class: 'td-hist' }, ...okList.map(x => h('li', {}, h('b', {}, x.name || x.key), x.id ? ' · ' + x.id + ' ' : ' ',
      h('button', { class: 'linkbtn', type: 'button', onclick: async () => { try { await window.setClientNotNeeded(x, false); drawFields(pane); } catch (e) { err.textContent = e.message; } } }, 'Flag again')))) : null);
  fill(pane,
    h('p', { class: 'set-hint' }, 'Active, New and OJT people with an empty mandatory field are listed in Action center > Action items. Fields that aren’t ticked are never flagged. This applies to everyone.'),
    h('div', { class: 'activity-controls' }, q, count), list,
    h('div', { class: 'set-actions' }, save, reset), err, okCard);
}

/* ----- Save & sync ----- */
function drawSync(pane) {
  const draw = () => {
    const a = attS(), ready = a && a.status === 'ready' && a.ctx, n = ready ? a.changes.length : 0;
    const rows = typeof syncRowsBody === 'function' ? syncRowsBody() : [];
    const toggle = h('button', { class: 'btn ' + (ready && a.auto ? '' : 'primary'), type: 'button', disabled: !ready || !PERM.canWrite() || !PERM.can('sync.auto'), onclick: () => { ATT.setAutoSync(!a.auto); draw(); } }, ready && a.auto ? 'Stop auto-sync' : 'Start auto-sync');
    const saveNow = h('button', { class: 'btn', type: 'button', disabled: !ready || !n || a.saving || !PERM.can('sync.save'), onclick: async () => { await ATT.save(); draw(); } }, ready && a.saving ? 'Saving…' : 'Save now' + (n ? ' (' + n + ')' : ''));
    const undo = h('button', { class: 'btn', type: 'button', disabled: !ready || !a.undo.length || !PERM.can('sync.save'), onclick: () => { ATT.undo(); draw(); } }, 'Undo');
    fill(pane, 
      h('p', { class: 'set-hint' }, 'Employee changes are saved the moment you press Save. Attendance changes are saved by auto-sync a moment after you make them. If someone else saved attendance in between, you are asked once whether to overwrite their version or load it; nothing is overwritten without asking.'),
      h('div', { class: 'set-card' }, h('h4', {}, 'Status'), ...rows),
      h('div', { class: 'set-card' }, h('h4', {}, 'Auto-sync is ' + (ready && a.auto ? 'on' : 'off')), ready && a.autoErr ? h('p', { class: 'err' }, 'Needs you: ' + a.autoErr + '.') : null,
        h('div', { class: 'set-actions flat' }, toggle, saveNow, undo)));
  };
  draw();
  ticker = setInterval(() => { if (!pane.isConnected || !onSettings()) { clearInterval(ticker); return; } if (current === 'sync' && !pane.contains(document.activeElement)) draw(); }, 1500);
}

/* ----- Workbook & backups ----- */
async function drawWorkbook(pane) {
  const err = h('p', { class: 'err', role: 'alert' });
  const run = async fn => { err.textContent = ''; try { await fn(); } catch (e) { err.textContent = e.message; } };
  if (!PERM.online()) {
    fill(pane, 
      h('p', { class: 'set-hint' }, 'The dashboard is working on “' + (state.file || 'your workbook') + '” on this computer. Changes save straight into that file; recovery copies are kept in this browser.'),
      h('div', { class: 'set-actions flat' }, h('button', { class: 'btn', type: 'button', onclick: () => el('btnLogout').click() }, 'Open a different workbook')), err);
    return;
  }
  const dl = h('button', { class: 'btn', type: 'button', onclick: () => run(async () => download(state.file || 'Team Dashboard.xlsx', await CLOUD.admin.download())) }, 'Download current workbook');
  if (!PERM.can('set.workbook')) { fill(pane, h('p', { class: 'set-hint' }, 'Download a copy of the team workbook to open in Excel. Changes made in the copy are not sent back.'), h('div', { class: 'set-actions flat' }, dl), err); return; }
  fill(pane, h('p', { class: 'set-hint' }, 'Loading history…'));
  const hist = await CLOUD.admin.history();
  const list = (items, fmt, empty) => items.length ? h('ul', { class: 'td-hist' }, ...items.map(x => h('li', {}, ...fmt(x)))) : h('p', { class: 'set-hint' }, empty);
  const replace = confirmButton('Replace workbook…', 'Click again, then choose the file', () => run(async () => {
    if (window.ATT && ATT.dirty()) throw new Error('Save your attendance changes first.');
    const f = await pickXlsx(); if (!f) return;
    await CLOUD.admin.replace(f); toast('Workbook replaced. Today’s backup keeps the previous version.');
  }), 'btn');
  fill(pane, 
    h('p', { class: 'set-hint' }, 'The team workbook is stored online. The first save of each day keeps a backup for 30 days. To restore one, download it and use Replace workbook.'),
    h('div', { class: 'set-actions flat' }, dl, replace), err,
    h('div', { class: 'set-grid' },
      h('div', { class: 'set-card' }, h('h4', {}, 'Daily backups (30 days)'), list(hist.backups, b => [h('b', {}, String(b.day)), ` · ${Math.round(b.size / 1024)} KB · v${b.version} `, h('button', { class: 'linkbtn', type: 'button', onclick: () => run(async () => download(String(b.name).replace(/\.xlsx$/i, '') + ' backup ' + b.day + '.xlsx', await CLOUD.admin.backup(b.name, b.day))) }, 'Download')], 'No backups yet. The first save of each day keeps one.')),
      h('div', { class: 'set-card' }, h('h4', {}, 'Recent sign-ins'), list(hist.logins.slice(0, 25), l => [h('span', { class: l.ok ? '' : 'bad' }, l.ok ? l.name : 'Wrong passcode'), ' · ' + when(l.at) + (l.ip ? ' · ' + l.ip : '')], 'None yet.')),
      h('div', { class: 'set-card' }, h('h4', {}, 'Recent saves'), list(hist.saves.slice(0, 25), x => [h('b', {}, x.saved_by || '?'), ' · ' + when(x.at) + ' · v' + x.version], 'None yet.'))));
}

/* ----- Tools ----- */
function drawTools(pane) {
  fill(pane, 
    h('div', { class: 'set-card' }, h('h4', {}, 'Distance from the office'),
      h('p', { class: 'set-hint' }, 'Estimates how far each person’s current area is from the office, without a Google account. ' + ((window.GD && (GD.error || GD.status)) || '')),
      h('button', { class: 'btn', type: 'button', onclick: () => openDistanceTool() }, 'Calculate approximate distances')));
}

/* ----- Preferences ----- */
function drawPrefs(pane) {
  const cur = document.documentElement.getAttribute('data-theme') || 'system';
  const setTheme = t => { if (t === 'system') { document.documentElement.removeAttribute('data-theme'); try { localStorage.removeItem('td_theme'); } catch { } } else { document.documentElement.setAttribute('data-theme', t); lsSet('td_theme', t); } drawPrefs(pane); };
  const seg = h('div', { class: 'seg-set', role: 'group', 'aria-label': 'Theme' }, ...[['light', 'Light'], ['dark', 'Dark'], ['system', 'Match this computer']].map(([v, l]) => h('button', { type: 'button', 'aria-pressed': cur === v ? 'true' : 'false', onclick: () => setTheme(v) }, l)));
  const parts = [h('div', { class: 'set-card' }, h('h4', {}, 'Theme'), seg)];
  if (!PERM.online()) {
    const nm = h('input', { class: 'input', value: BE.userName() === 'You' ? '' : BE.userName(), placeholder: 'Your name', 'aria-label': 'Your name', maxlength: '60', style: 'max-width:260px' });
    parts.push(h('div', { class: 'set-card' }, h('h4', {}, 'Your name in the activity log'),
      h('div', { class: 'set-actions flat' }, nm, h('button', { class: 'btn', type: 'button', onclick: async () => { const n = nm.value.trim(); if (!n) return; BE.setUser(n); await BE.kvSet('att:user', n); toast('Your changes are now logged as ' + n + '.'); } }, 'Save name'))));
  } else {
    parts.push(h('div', { class: 'set-card' }, h('h4', {}, 'Signed in as ' + CLOUD.user().name),
      h('p', { class: 'set-hint' }, 'Your changes are logged under this name. Only the admin can change names and passcodes.'),
      h('button', { class: 'btn', type: 'button', onclick: () => CLOUD.signOut() }, 'Sign out')));
  }
  fill(pane, ...parts);
}
})();
