const fs = require('fs');
const path = 'outputs/index.html';
let s = fs.readFileSync(path, 'utf8');
function replace(a,b) { if (!s.includes(a)) throw Error('Missing anchor: '+a.slice(0,80)); s=s.replace(a,b); }
replace('<div id="pageSummary">', '<div id="pageSummary"><section id="cardApprovalRequests" style="grid-column:1 / -1;min-width:0" aria-label="Approval requests" hidden></section>');
replace("canDecide() && S.status === 'ready' ? reqList()", "canDecide() ? reqList()");
replace('function requestsCardHtml() {', `function renderApprovalRequests() {
  const host = document.getElementById('cardApprovalRequests'); if (!host) return;
  const admin = window.PERM && (!PERM.online() || ['admin', 'superadmin'].includes(CLOUD.user()?.role));
  host.hidden = !(admin || canDecide());
  if (host.hidden) { host.replaceChildren(); return; }
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const pending = reqList().filter(r => r.status === 'pending' && inMyScope(r)).sort((a,b) => (a.at || '').localeCompare(b.at || ''));
  const ready = S.status === 'ready' && !!S.ctx;
  root.innerHTML = \`<style>\${ATT_CSS}
    .request-row { display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding:14px 0; border-bottom:1px solid var(--line); }
    .request-row:last-child { border-bottom:0; } .request-details { flex:1 1 260px; min-width:0; overflow-wrap:anywhere; }
    .request-details span { display:block; } .request-actions { display:flex; flex-wrap:wrap; gap:6px; }
    .request-heading { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:8px; }
    </style><div class="card"><div class="request-heading"><h2>Approval requests · \${pending.length} pending</h2><span class="grow"></span><button class="btn sm" data-refresh>Refresh</button></div>
    <div class="sub">Review user log requests before they are added to the tracker. Requests shown follow your current employee filters.</div>
    \${!canDecide() ? '<p class="sm">Ask a super admin to enable “Approve or reject leave” for your account to process these requests.</p>' : !ready ? '<p class="sm">Connect the attendance tracker in Settings → Save & sync to approve requests.</p>' : ''}
    \${pending.length ? '<div style="max-height:420px;overflow:auto">' + pending.map(r => \`<div class="request-row"><div class="request-details"><b>\${esc(r.name)}</b><span>\${esc(r.code)} · \${esc(reqDatesText(r.dates || []))}</span><span class="sm muted">Requested by \${esc(r.by)} · \${esc(reqWhen(r.at))}</span>\${r.note ? '<span class="sm">Note: ' + esc(r.note) + '</span>' : ''}</div>
    \${canDecide() ? \`<div class="request-actions"><select aria-label="Approve leave type for \${esc(r.name)}" \${!ready ? 'disabled' : ''}>\${LOG_TYPES.map(c => \`<option value="\${c}"\${c === r.code ? ' selected' : ''}>\${c}</option>\`).join('')}</select><button class="btn sm primary" data-approve="\${esc(r.id)}" \${!ready || S.saving ? 'disabled' : ''}>Approve</button><button class="btn sm" data-reject="\${esc(r.id)}">Reject</button></div>\` : ''}</div>\`).join('') + '</div>' : '<div class="empty">No pending requests in your current employee filters.</div>'}</div>\`;
  root.querySelector('[data-refresh]').onclick = async e => { e.target.disabled = true; try { await window.loadTeamSettings(); notifyReq(); } finally { renderApprovalRequests(); } };
  root.querySelectorAll('[data-approve]').forEach(b => { b.onclick = async () => { b.disabled = true; try { await approveRequest(b.dataset.approve, b.parentElement.querySelector('select').value); } finally { renderApprovalRequests(); } }; });
  root.querySelectorAll('[data-reject]').forEach(b => { b.onclick = () => openRejectBox(b.dataset.reject); });
}
function requestsCardHtml() {`);
replace("  if (!canDecide()) { toast('Only people", "  if (S.status !== 'ready' || !S.ctx) { toast('Connect the attendance tracker before approving requests.'); return; }\n  if (!canDecide()) { toast('Only people");
replace("function openRejectBox(id) {", "function openRejectBox(id) {\n  if (!canDecide()) return;");
replace('go, requestsToDecide:', 'go, renderApprovalRequests, requestsToDecide:');
replace('function updateReqBadge() {', 'function updateReqBadge() {\n  window.ATT?.renderApprovalRequests();');
replace("  show('#cardComing',", "  window.ATT?.renderApprovalRequests();\n  show('#cardComing',");
replace('if (state.view === "summary") { renderComing();', 'if (state.view === "summary") { window.ATT?.renderApprovalRequests(); renderComing();');
replace("addEventListener('att:requests', updateReqBadge);", "addEventListener('att:requests', updateReqBadge);\naddEventListener('att:data', updateReqBadge);");
fs.writeFileSync(path,s);
const scripts = [...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
scripts.forEach((code,i)=>{try { new (require('vm').Script)(code); } catch(e) {throw Error('Script '+i+': '+e.message);} });
console.log('Updated HTML; all '+scripts.length+' script blocks parse successfully.');
