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
    if (r.status !== 'pending') events.push({...common,id:'request:'+r.id+':'+r.status+':'+r.decidedAt,time:r.decidedAt,title:r.status === 'approved' ? 'Request approved'+(r.trackerSavedAt ? ' · saved to tracker' : '') : r.status === 'rejected' ? 'Request rejected' : 'Request cancelled',detail:detail+' · '+(r.decidedBy || r.by)+(r.reason ? ' · Reason: '+r.reason : ''),type:'request'});
    return events;
  });
};
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
    await loadTeamSettings(true);
    let activity=[];activityError='';
    if (PERM.can('activity.view')) {
      try { const d=await api('GET','/api/activity'); activity=(d.items || []).filter(it=>!String(it.action || '').startsWith('request-')).map(activityNotification); }
      catch(e) { activityError='Activity could not be loaded: '+e.message; }
    }
    if (owner !== notificationKey()) return;
    // Recheck access after asynchronous reads so changed permissions take effect.
    notificationItems=[...notificationRequestEvents(),...(PERM.can('activity.view')?activity:[])].sort((a,b)=>(Date.parse(b.time)||0)-(Date.parse(a.time)||0));
    bellShow(unreadCount());drawNotifications();window.ATT?.renderApprovalRequests();
  } catch(e) { activityError='Notifications could not be refreshed: '+e.message;drawNotifications(); }
  finally { bellBusy=false; }
}
window.refreshNotifications=()=>{
  if (notificationOwner !== notificationKey()) notificationItems=[];
  const allowedIds=new Set(notificationRequestEvents().map(it=>it.id));
  notificationItems=notificationItems.filter(it=>it.type==='request'?allowedIds.has(it.id):PERM.can('activity.view'));
  bellShow(unreadCount());drawNotifications();bellCheck();
};
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
