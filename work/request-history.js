function renderRequestHistory() {
  const me = myId();
  const own = reqList().filter(r => me && String(r.byId) === me).sort((a,b) => (b.at || '').localeCompare(a.at || ''));
  const rejected = reqList().filter(r => r.status === 'rejected' && (String(r.byId) === me || window.requestNotificationVisible?.(r))).sort((a,b) => (b.decidedAt || '').localeCompare(a.decidedAt || ''));
  const row = r => `<div class="request-history-row"><div><b>${esc(r.name)}</b><div class="sm">${esc(r.code)} · ${esc(reqDatesText(r.dates || []))}</div><div class="sm muted">Requested by ${esc(r.by)} · ${esc(reqWhen(r.at))}</div>${r.note ? `<div class="sm">Note: ${esc(r.note)}</div>` : ''}${r.decidedBy ? `<div class="sm muted">${esc(r.status)} by ${esc(r.decidedBy)} · ${esc(reqWhen(r.decidedAt))}</div>` : ''}${r.reason ? `<div class="sm">Reason: ${esc(r.reason)}</div>` : ''}</div><span class="pill ${r.status === 'approved' ? 'ok' : ''}">${r.status === 'pending' ? 'Pending approval' : esc(r.status[0].toUpperCase() + r.status.slice(1))}</span>${r.status === 'pending' && String(r.byId) === me ? `<button class="btn sm" data-cancel="${esc(r.id)}">Cancel request</button>` : ''}</div>`;
  const draw = (id, title, description, items, visible) => {
    const host = document.getElementById(id); if (!host) return;
    host.hidden = !visible; const root = host.shadowRoot || host.attachShadow({mode:'open'});
    if (!visible) { root.innerHTML = ''; return; }
    root.innerHTML = `<style>${ATT_CSS}.request-history-row { display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line); } .request-history-row>div { flex:1 1 240px;min-width:0;overflow-wrap:anywhere; }</style><div class="card"><h2>${esc(title)}</h2><div class="sub">${esc(description)}</div><div style="max-height:360px;overflow:auto">${items.length ? items.map(row).join('') : '<div class="empty">No requests to show.</div>'}</div></div>`;
    root.querySelectorAll('[data-cancel]').forEach(b => { b.onclick = async () => { b.disabled = true; try { await cancelRequest(b.dataset.cancel); } finally { renderRequestHistory(); } }; });
  };
  draw('cardMyRequests', `Your requests · ${own.filter(r => r.status === 'pending').length} pending`, 'Track your submitted requests, approvals and rejections. Pending and rejected requests do not enter the tracker.', own, !!me);
  draw('cardRejectedRequests', `Rejected request log · ${rejected.length}`, 'Rejected requests are kept here with the decision and reason. Visibility follows your notification access.', rejected, !!me && (!!rejected.length || !!window.PERM?.can('notifications.view')));
}
