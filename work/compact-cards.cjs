const fs=require('fs');
let html=fs.readFileSync('outputs/index.html','utf8');
function replace(a,b){if(!html.includes(a))throw Error('Missing anchor: '+a.slice(0,70));html=html.replace(a,b);}
replace('<div id="pageSummary"><section id="cardMyRequests"', '<div id="pageSummary"><div class="request-cards"><section id="cardMyRequests"');
replace('aria-label="Approval requests" hidden></section>        <div', 'aria-label="Approval requests" hidden></section></div>        <div');
replace('</style>', `.request-cards { grid-column:1 / -1; display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)); gap:12px; align-items:stretch; min-width:0; }
.request-cards > section { grid-column:auto !important; min-width:0; }
.request-cards:not(:has(> section:not([hidden]))) { display:none; }
</style>`);
replace('function renderRequestHistory() {', `const REQUEST_CARD_CSS = ":host {height:100%;font-size:13px;} .card {height:100%;max-height:260px;display:flex;flex-direction:column;padding:12px 14px;border-radius:10px;} .card h2 {font-size:13px;} .card .sub {font-size:11px;line-height:1.4;margin-bottom:6px;} .card .empty {padding:10px 0;min-height:0;font-size:12px;} .card > div[style] {min-height:0;}";
function renderRequestHistory() {`);
replace('${ATT_CSS}.request-history-row', '${ATT_CSS}${REQUEST_CARD_CSS}.request-history-row');
replace('gap:12px;padding:12px 0;border-bottom:1px solid var(--line); } .request-history-row', 'gap:8px;padding:8px 0;border-bottom:1px solid var(--line); } .request-history-row');
replace('max-height:360px;overflow:auto">${items.length', 'max-height:180px;overflow:auto">${items.length');
replace('Track your submitted requests, approvals and rejections. Pending and rejected requests do not enter the tracker.', 'Your pending requests and decisions.');
replace('Rejected requests are kept here with the decision and reason. Visibility follows your notification access.', 'Decision history and rejection reasons.');
replace('root.innerHTML = `<style>${ATT_CSS}\n    .request-row', 'root.innerHTML = `<style>${ATT_CSS}${REQUEST_CARD_CSS}\n    .request-row');
replace('gap:10px; padding:14px 0; border-bottom', 'gap:8px; padding:8px 0; border-bottom');
replace('gap:10px; margin-bottom:8px;', 'gap:6px; margin-bottom:6px;');
replace('Review user log requests before they are added to the tracker. Requests shown follow your current employee filters.', 'Approve logs before they reach the tracker.');
replace('max-height:420px;overflow:auto">\' + pending.map', 'max-height:180px;overflow:auto">\' + pending.map');
replace('No pending requests in your current employee filters.', 'No pending requests in your filters.');
for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new(require('vm').Script)(m[1]);
fs.writeFileSync('outputs/index.html',html);
console.log('Compact responsive request cards applied; all script blocks parse.');
