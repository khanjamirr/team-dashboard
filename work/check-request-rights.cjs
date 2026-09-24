const fs=require('fs'),vm=require('vm'),assert=require('assert');
const s=fs.readFileSync('outputs/index.html','utf8'),start=s.indexOf('const PERM_GROUPS ='),end=s.indexOf('\n})();',start);
let user={role:'admin',permissions:{_v:8}};
const ctx={window:{},CLOUD:{mode:()=> 'cloud',user:()=>user}};vm.createContext(ctx);vm.runInContext(s.slice(start,end),ctx);
const p=ctx.window.PERM;
assert.equal(new Set(p.keys).size,p.keys.length);
for(const role of ['user','admin']){user.role=role;for(const key of ['requests.own','requests.rejected','requests.approvals','att.approve']){user.permissions={_v:8,[key]:true};assert(p.can(key));user.permissions[key]=false;assert(!p.can(key));}}
user.role='superadmin';assert(p.can('requests.approvals'));assert(p.can('att.approve'));
assert.equal(p.upgrade({_v:7,'att.approve':true})['requests.approvals'],true);
assert.equal(p.upgrade({_v:7,'att.approve':false})['requests.approvals'],false);
console.log('Passed: unique rights, individual grants/revocations for users and admins, super-admin access, legacy migration.');
