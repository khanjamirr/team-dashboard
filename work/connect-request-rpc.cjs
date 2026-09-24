const fs=require('fs'),vm=require('vm');let s=fs.readFileSync('outputs/index.html','utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,80));s=s.replace(a,b);}
replace("  const setShared = (key, value) => rpc('td_set_shared_setting', { p_token: tok(), p_key: key, p_value: value });", "  const setShared = (key, value) => rpc('td_set_shared_setting', { p_token: tok(), p_key: key, p_value: value });\n  const saveLeaveRequest = (request, expected) => rpc('td_save_leave_request', { p_token: tok(), p_request: request, p_expected: expected });");
replace('user, getSettings, setSetting, setShared, admin,', 'user, getSettings, setSetting, setShared, saveLeaveRequest, admin,');
replace("    ADMIN_ONLY: 'Only the super admin can do that, or someone they gave that right to.',", "    ADMIN_ONLY: 'Only the super admin can do that, or someone they gave that right to.',\n    REQUEST_CONFLICT: 'This request changed while you were working. Refresh Request Center before trying again.',\n    REQUEST_NOT_OWNER: 'Only the person who submitted this request can cancel it.',\n    BAD_REQUEST: 'The request is invalid. Check the employee, leave type and dates.',\n    INVALID_REQUEST_STORE: 'The saved request list needs administrator attention.',");
replace("  const next = change(reqList().map(r => ({ ...r })));\n  await window.saveSharedSetting('leave_requests', next);", `  const before = reqList().map(r => ({ ...r }));
  const next = change(before.map(r => ({ ...r })));
  if (window.PERM && PERM.online()) {
    const originals = new Map(before.map(r => [r.id, r]));
    const updates = next.filter(r => JSON.stringify(r) !== JSON.stringify(originals.get(r.id)));
    if (updates.length !== 1 || before.some(r => !next.some(n => n.id === r.id))) throw new Error('Only one request can be changed at a time.');
    let saved;
    try { saved = await CLOUD.saveLeaveRequest(updates[0], originals.get(updates[0].id) || null); }
    catch (e) {
      if (/function|schema cache|not set up/i.test(e.message || '')) throw new Error('The request database update is missing. Ask the super admin to run supabase-request-fix.sql, then try again.');
      throw e;
    }
    const current = reqList();
    window.TD_SETTINGS = { ...window.TD_SETTINGS, leave_requests: current.some(r => r.id === saved.id) ? current.map(r => r.id === saved.id ? saved : r) : [...current, saved] };
  } else await window.saveSharedSetting('leave_requests', next);`);
s=s.replaceAll('3.16.1','3.16.2');
for(const m of s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);
fs.writeFileSync('outputs/index.html',s);
const original=fs.readFileSync('C:/Users/800701683/.codex/attachments/e8d0a01e-66b0-47c8-9cac-8f6286fc5c6b/Pasted text.txt','utf8');
const patch=fs.readFileSync('outputs/supabase-request-fix.sql','utf8');
fs.writeFileSync('outputs/setup.sql',original+'\n\n'+patch);
console.log('HTML 3.16.2 connected to request RPC; scripts parse. Full setup.sql includes original setup plus migration.');
