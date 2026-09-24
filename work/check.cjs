const fs=require('fs'), vm=require('vm'), assert=require('assert');
const s=fs.readFileSync('outputs/index.html','utf8');
const code=s.slice(s.indexOf('function renderApprovalRequests()'),s.indexOf('function requestsCardHtml()'));
let role='admin', allowed=true;
const root={innerHTML:'',querySelector:()=>({}),querySelectorAll:()=>[]};
const host={hidden:true,shadowRoot:root,replaceChildren(){root.innerHTML='';}};
const ctx={document:{getElementById:()=>host},window:{PERM:{}},PERM:{online:()=>true},CLOUD:{user:()=>({role})},canDecide:()=>allowed,reqList:()=>[{id:'a',status:'pending',name:'<User>',by:'Requester',at:'2026-09-24',code:'AL',dates:['2026-09-25'],note:'<note>'},{id:'b',status:'approved'}],inMyScope:()=>true,S:{status:'ready',ctx:{}},ATT_CSS:'',esc:x=>String(x).replaceAll('<','&lt;').replaceAll('>','&gt;'),reqDatesText:()=> '25 Sep · 1 day',reqWhen:x=>x,LOG_TYPES:['AL','SL']};
vm.createContext(ctx);vm.runInContext(code,ctx);
function draw(){ctx.renderApprovalRequests();return root.innerHTML;}
assert.match(draw(),/Approval requests · 1 pending/);
assert.match(root.innerHTML,/data-approve="a"/);
assert.match(root.innerHTML,/&lt;note&gt;/);
role='superadmin';assert.match(draw(),/data-reject="a"/);
ctx.S.status='idle';assert.match(draw(),/data-approve="a" disabled/);assert.match(root.innerHTML,/1 pending/);
allowed=false;role='admin';assert.match(draw(),/enable “Approve or reject leave”/);assert(!root.innerHTML.includes('data-approve='));
role='user';draw();assert(host.hidden);assert.equal(root.innerHTML,'');
console.log('Passed: admin/super-admin visibility, pending-only count, escaped content, disconnected tracker, permission gating, and ordinary user exclusion.');
