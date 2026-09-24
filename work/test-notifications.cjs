const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('outputs/index.html','utf8');
const elements=new Map(), storage=new Map();
function node(tag='div',props={},...kids){return {tag,...props,kids,style:{},isConnected:true,hidden:false,setAttribute(k,v){this[k]=v;},addEventListener(){},replaceChildren(...x){this.kids=x;},append(...x){this.kids.push(...x);}};}
let user={id:1,name:'Alice',role:'user',permissions:{_notificationAudience:{mode:'own'}}};
const rights={'notifications.view':true,'activity.view':false};
const request={id:'r1',byId:'1',by:'Alice',name:'Employee',code:'LA',dates:['2026-09-25'],status:'pending',at:'2026-09-24T12:00:00Z'};
const ctx={console,Date,Set,Map,JSON,String,Array,Object,Promise,PERM:{can:k=>!!rights[k],isSuper:()=>user.role==='superadmin'},CLOUD:{SUPABASE_CONFIG:{url:'team-a'},user:()=>user},BE:{dir:()=>({name:'Team'}),userName:()=>user.name,ACT_VERBS:{},actDetails:e=>e.details?.note||''},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},el:id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);},document:{hidden:false},setTimeout(){},setInterval(){},addEventListener(){},h:node,toast(){},mountDrawer(){},closeDrawer(){},loadTeamSettings:async()=>{},api:async()=>({items:[]})};
ctx.window=ctx;ctx.TD_SETTINGS={leave_requests:[request,{...request,id:'r2',byId:2,by:'Bob'}]};
vm.createContext(ctx);const start=html.indexOf('// Read state is separate'),end=html.indexOf('/* ---------- header: Start / Stop',start);vm.runInContext(html.slice(start,end),ctx);
const run=x=>vm.runInContext(x,ctx);
(async()=>{
assert.equal(run('notificationRequestEvents().length'),1,'own-only audience');
user.permissions._notificationAudience={mode:'selected',users:[2]};assert.equal(run('notificationRequestEvents().length'),2,'selected IDs normalize');
user.permissions._notificationAudience={mode:'all'};assert.equal(run('notificationRequestEvents().length'),2,'all audience');
rights['notifications.view']=false;assert.equal(run('notificationRequestEvents().length'),0,'notification permission');rights['notifications.view']=true;
user.permissions._notificationAudience={mode:'own'};
await run('bellCheck()');assert.equal(run('unreadCount()'),1);assert.equal(elements.get('bellN').hidden,false,'red dot');
run('openBell()');assert.equal(run('unreadCount()'),1,'opening does not read');await Promise.resolve();await Promise.resolve();
run('markNotificationsRead([notificationItems[0].id])');assert.equal(run('unreadCount()'),0);assert.equal(elements.get('bellN').hidden,true);
request.status='rejected';request.decidedAt='2026-09-24T13:00:00Z';request.decidedBy='Manager';request.reason='Schedule conflict';
await run('bellCheck()');assert.equal(run('unreadCount()'),1,'decision is separate unread event');assert(run('notificationItems[0].detail').includes('Schedule conflict'));
run('markNotificationsRead(notificationItems.map(it=>it.id))');assert.equal(run('unreadCount()'),0);
user={...user,id:2,name:'Bob',permissions:{_notificationAudience:{mode:'own'}}};await run('bellCheck()');assert.equal(run('unreadCount()'),1,'separate account read state');
ctx.CLOUD.SUPABASE_CONFIG.url='team-b';assert.equal(run('notificationReads().size'),0,'separate team state');
// Extract and exercise the actual approval implementation with controlled persistence outcomes.
let list=[{...request,status:'pending',code:'LA'}],saveResult=true,appliedCode,order=[];
const approval={...ctx,S:{status:'ready',ctx:{},saving:false,changes:[],rows:[{name:'before'}],undo:[],ver:0},canDecide:()=>true,inMyScope:()=>true,reqList:()=>list,resolvePerson:()=>({name:'Employee'}),LOG_TYPES:['LA','AL','SL'],snapshot:()=>[{name:'before'}],applyApproved:(p,c)=>{appliedCode=c;approval.S.changes.push({});order.push('apply');},save:async()=>{order.push('save');if(saveResult)approval.S.changes=[];return saveResult;},saveRequests:async fn=>{order.push('decision');list=fn(list);},clearPending:async()=>{},render(){},notifyReq(){},reqDatesText:()=>'',myId:()=> 'admin',renderApprovalRequests(){}};
approval.window=approval;approval.loadTeamSettings=async()=>{};approval.BE={...ctx.BE,nowText:()=>'',appendActivity:()=>{},userName:()=> 'Admin'};
vm.createContext(approval);vm.runInContext(html.slice(html.indexOf('let requestDecisionBusy ='),html.indexOf('function openRejectBox(id)')),approval);
await approval.approveRequest('r1','LA');assert.equal(appliedCode,'AL');assert.equal(list[0].status,'approved');assert.deepEqual(order,['apply','save','decision']);assert(list[0].trackerSavedAt);
list=[{...request,status:'pending'}];saveResult=false;order=[];approval.S.changes=[];await approval.approveRequest('r1','AL');assert.equal(list[0].status,'pending');assert(!order.includes('decision'));assert.equal(approval.S.changes.length,0);
approval.loadTeamSettings=async()=>{throw Error('offline');};order=[];await approval.approveRequest('r1','AL');assert.equal(order.length,0,'failed refresh never applies');
// Real history renderer: numeric requester ID, scope, escaped rejection reason.
const hosts=new Map(['cardMyRequests','cardRejectedRequests'].map(id=>[id,{hidden:false,shadowRoot:{innerHTML:'',querySelectorAll:()=>[]}}]));
const history={window:{requestNotificationVisible:r=>String(r.byId)==='1',PERM:{can:()=>true}},document:{getElementById:id=>hosts.get(id)},myId:()=> '1',reqList:()=>[{...request,byId:1,reason:'<script>bad</script>'},{...request,id:'r2',byId:2}],ATT_CSS:'',esc:x=>String(x).replaceAll('<','&lt;').replaceAll('>','&gt;'),reqDatesText:()=>'',reqWhen:()=>''};
vm.createContext(history);vm.runInContext(fs.readFileSync('work/request-history.js','utf8'),history);history.renderRequestHistory();assert(hosts.get('cardMyRequests').shadowRoot.innerHTML.includes('Your requests · 0 pending'));assert(hosts.get('cardRejectedRequests').shadowRoot.innerHTML.includes('Rejected request log · 1'));assert(hosts.get('cardRejectedRequests').shadowRoot.innerHTML.includes('&lt;script&gt;'));
console.log('PASS: audience permissions, own/selected/all, account/team read isolation, red dot, explicit read controls, unread decisions, save-before-approval, LA conversion, failed save/refresh, and escaped scoped history.');
})().catch(e=>{console.error(e);process.exitCode=1;});
