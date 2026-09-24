const fs=require('fs'),vm=require('vm'),assert=require('assert');
const s=fs.readFileSync('outputs/index.html','utf8');
const start=s.indexOf('async function saveRequests(change)'),end=s.indexOf('const reqWhen',start);
let calls=[],local=0;
const ctx={PERM:{online:()=>true},loadTeamSettings:async()=>{},TD_SETTINGS:{leave_requests:[]},reqList:()=>ctx.TD_SETTINGS.leave_requests,render(){},notifyReq(){},saveSharedSetting:async()=>local++,CLOUD:{saveLeaveRequest:async(r,expected)=>{calls.push({r,expected});return {...r,byId:'42',by:'Server user',at:'server-time'};}}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(s.slice(start,end),ctx);
(async()=>{
await ctx.saveRequests(a=>[...a,{id:'a',status:'pending',by:'client'}]);assert.equal(calls[0].expected,null);assert.equal(ctx.TD_SETTINGS.leave_requests[0].by,'Server user');assert.equal(local,0);
await ctx.saveRequests(a=>a.map(r=>({...r,status:'cancelled'})));assert.equal(calls[1].expected.status,'pending');assert.equal(ctx.TD_SETTINGS.leave_requests[0].status,'cancelled');
await assert.rejects(()=>ctx.saveRequests(a=>[...a,{id:'b'},{id:'c'}]),/one request/);
await assert.rejects(()=>ctx.saveRequests(()=>[]),/one request/);
ctx.CLOUD.saveLeaveRequest=async()=>{throw Error('REQUEST_CONFLICT');};await assert.rejects(()=>ctx.saveRequests(a=>[...a,{id:'b',status:'pending'}]),/REQUEST_CONFLICT/);assert.equal(ctx.TD_SETTINGS.leave_requests.length,1);
ctx.CLOUD.saveLeaveRequest=async()=>{throw Error('schema cache function missing');};await assert.rejects(()=>ctx.saveRequests(a=>[...a,{id:'b'}]),/supabase-request-fix.sql/);
console.log('PASS: single-request RPC, server-returned identity, expected-state updates, no shared-settings fallback, rejected multi-edits/deletions, conflict preservation, migration error message.');
})().catch(e=>{console.error(e);process.exitCode=1;});
