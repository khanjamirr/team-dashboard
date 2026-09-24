
"use strict";
/* =====================================================================
   ATTENDANCE MODULE - the former stand-alone Attendance Dashboard, now a page of
   this dashboard. Runs in its own scope with its own shadow DOM so nothing leaks
   either way. It reads and saves the attendance workbook through the same folder
   connection, backups and activity log as the Team workbook.
   ===================================================================== */
window.ATT = (() => {
"use strict";
let ROOT = null;
const ATT_CSS = ":host {\n  display: block; color: var(--ink); font-size: 14px; line-height: 1.45;\n  /* palette and surfaces come from the Team Dashboard theme, so light / dark follow it automatically */\n  --line: var(--grid); --line-2: var(--axis); --ink-3: var(--muted);\n  --blue: var(--c-blue); --orange: var(--c-orange); --aqua: var(--c-aqua); --yellow: var(--c-yellow);\n  --magenta: var(--c-magenta); --green: var(--c-green); --violet: var(--c-violet); --red: var(--c-red);\n  --accent-soft: color-mix(in srgb, var(--accent) 13%, var(--surface));\n  --good-ink: var(--good); --crit: var(--danger); --crit-ink: var(--danger); --warn: var(--c-yellow); --gray: var(--c-gray);\n  --wknd: color-mix(in srgb, var(--ink) 5%, var(--surface)); --today: var(--accent);\n  --shadow: 0 1px 2px rgba(20,40,110,.06), 0 6px 18px -10px rgba(20,40,110,.18);\n}\n* { box-sizing: border-box; }\n[hidden] { display: none !important; }\nbutton, input, select, textarea { font: inherit; color: inherit; }\nbutton { cursor: pointer; }\n.num { font-variant-numeric: tabular-nums; }\n.muted { color: var(--ink-3); } .sm { font-size: 12px; }\n.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }\n.linkbtn { all: unset; color: var(--accent); cursor: pointer; text-decoration: underline; }\n\n/* ---------- section chrome (the Team Dashboard already provides the sidebar and page header) ---------- */\n.topbar { position: sticky; top: 0; z-index: 8; display: flex; align-items: center; gap: 10px; padding: 8px 0 10px; background: var(--bg); flex-wrap: wrap; }\n.subnav { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--surface); border: 1px solid var(--line); flex-wrap: wrap; }\n.subnav button.tab { display: inline-flex; align-items: center; gap: 7px; border: 0; background: transparent; padding: 6px 12px; border-radius: 8px; color: var(--ink-2); font-weight: 500; }\n.subnav button.tab:hover { background: var(--wash); }\n.subnav button.tab[aria-current=\"page\"] { background: var(--accent-soft); color: var(--ink); font-weight: 650; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent); }\n.subnav button.tab svg { width: 16px; height: 16px; flex: none; }\n.subnav .badge { font-size: 11px; background: var(--crit); color: #fff; border-radius: 10px; padding: 0 6px; min-width: 18px; text-align: center; }\n.scope { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-2); font-size: 12px; font-weight: 600; }\n.scope select { max-width: 250px; font-weight: 500; }\n.fileline { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0 0 14px; }\n.syncbtn { font-weight: 600; }\n.syncbtn.s-ok { color: var(--ink); }\n.syncbtn.s-dirty { color: #9a6700; border-color: color-mix(in srgb, var(--warn) 55%, var(--line)); background: color-mix(in srgb, var(--warn) 16%, transparent); }\n.syncbtn.s-warn { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 45%, var(--line)); background: color-mix(in srgb, var(--danger) 10%, transparent); }\n.syncbtn.s-busy { color: var(--ink-2); }\n.filechip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px; font-size: 12px; color: var(--ink-2); max-width: 340px; background: var(--surface); }\n.filechip svg { width: 14px; height: 14px; flex: none; }\n.filechip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }\n.pill.ok { background: color-mix(in srgb, var(--c-aqua) 16%, var(--surface)); color: var(--ink); }\n.pill.dirty { background: color-mix(in srgb, var(--warn) 28%, var(--surface)); color: var(--ink); }\n.grow { flex: 1; }\n.gate { text-align: center; padding: 34px 24px; }\n.gate .filelist { text-align: left; }\n.filelist { display: flex; flex-direction: column; gap: 6px; margin: 12px 0 14px; max-height: 260px; overflow: auto; }\n.fileopt { display: flex; align-items: center; gap: 10px; justify-content: space-between; width: 100%; text-align: left; padding: 9px 12px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface); }\n.fileopt:hover { background: var(--wash); border-color: var(--accent); }\n.fileopt span { display: inline-flex; align-items: center; gap: 8px; } .fileopt svg { width: 16px; height: 16px; }\n.rosterline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }\n.form label.chk, label.chk { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }\n\n/* ---------- controls ---------- */\n.btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line-2); background: var(--surface); padding: 6px 12px; border-radius: 8px; font-weight: 550; line-height: 1.3; white-space: nowrap; }\n.btn:hover:not(:disabled) { background: var(--surface-2); }\n.btn:disabled { opacity: .45; cursor: not-allowed; }\n.btn.primary { background: linear-gradient(135deg, var(--band-2, var(--accent)), var(--band-3, var(--accent))); border-color: transparent; color: var(--accent-ink, #fff); }\n.btn.primary:hover:not(:disabled) { filter: brightness(1.12); }\n.btn.danger { color: var(--crit-ink); border-color: color-mix(in srgb, var(--crit) 45%, var(--line-2)); }\n.btn.danger.armed { background: var(--crit); color: #fff; border-color: var(--crit); }\n.btn.ghost { border-color: transparent; background: transparent; }\n.btn.sm { padding: 3px 8px; font-size: 12px; border-radius: 6px; }\n.btn svg { width: 16px; height: 16px; }\ninput[type=text], input[type=search], input[type=number], input[type=date], select, textarea { border: 1px solid var(--line-2); background: var(--surface); border-radius: 8px; padding: 6px 10px; min-width: 0; }\ninput:focus-visible, select:focus-visible, button:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }\n.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }\n.toolbar label { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-2); font-size: 13px; }\n.seg { display: inline-flex; border: 1px solid var(--line-2); border-radius: 8px; overflow: hidden; }\n.seg button { border: 0; background: var(--surface); padding: 5px 10px; font-size: 13px; color: var(--ink-2); }\n.seg button + button { border-left: 1px solid var(--line-2); }\n.seg button[aria-pressed=\"true\"] { background: var(--accent-soft); color: var(--ink); font-weight: 600; }\n\n/* ---------- cards / tiles ---------- */\n.card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; box-shadow: var(--shadow); min-width: 0; }\n.card h2 { font-size: 14px; margin: 0 0 2px; font-weight: 650; } .card .sub { color: var(--ink-3); font-size: 12px; margin-bottom: 12px; }\n.grid { display: grid; gap: 14px; } .g6 { grid-template-columns: repeat(6, 1fr); } .g2 { grid-template-columns: 1.5fr 1fr; } .g2e { grid-template-columns: 1fr 1fr; }\n@media (max-width: 1250px) { .g6 { grid-template-columns: repeat(3, 1fr); } .g2, .g2e { grid-template-columns: 1fr; } }\n@media (max-width: 800px) { .g6 { grid-template-columns: repeat(2, 1fr); } }\n.tile { padding: 14px 16px; }\n.tile .lbl { font-size: 12px; color: var(--ink-3); font-weight: 600; letter-spacing: .02em; }\n.tile .val { font-size: 28px; font-weight: 680; line-height: 1.15; margin-top: 4px; font-variant-numeric: tabular-nums; }\n.tile .delta { font-size: 12px; margin-top: 4px; color: var(--ink-3); }\n.delta .up, .delta .down { font-weight: 650; } .delta .up { color: var(--crit-ink); } .delta .down { color: var(--good-ink); }\n.tile.click { cursor: pointer; } .tile.click:hover { border-color: var(--accent); }\n\n/* ---------- charts ---------- */\n.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--ink-2); margin: 0 0 8px; }\n.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }\nsvg.chart { width: 100%; height: auto; display: block; overflow: visible; }\nsvg.chart text { fill: var(--ink-3); font-size: 11px; font-family: inherit; }\nsvg.chart .grid { stroke: var(--line); stroke-width: 1; }\nsvg.chart .hit { fill: transparent; } svg.chart .hit:hover { fill: color-mix(in srgb, var(--ink) 5%, transparent); }\n.hbar { display: grid; grid-template-columns: minmax(90px, 34%) 1fr 44px; align-items: center; gap: 10px; padding: 4px 0; font-size: 13px; border-radius: 6px; }\n.hbar.link { cursor: pointer; } .hbar.link:hover { background: var(--surface-2); }\n.hbar .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.hbar .trk { height: 12px; background: transparent; position: relative; }\n.hbar .fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--blue); border-radius: 0 4px 4px 0; min-width: 2px; }\n.hbar .v { text-align: right; font-weight: 600; }\n.tip { position: fixed; z-index: 100; pointer-events: none; background: var(--ink); color: var(--surface); padding: 6px 9px; border-radius: 6px; font-size: 12px; max-width: 280px; box-shadow: var(--shadow); opacity: 0; transition: opacity .08s; line-height: 1.4; }\n.tip.on { opacity: 1; } .tip b { font-weight: 650; }\n\n/* ---------- lists ---------- */\n.list { display: flex; flex-direction: column; }\n.li { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-bottom: 1px solid var(--line); }\n.li:last-child { border-bottom: 0; }\n.li .main-t { flex: 1; min-width: 0; } .li .main-t b { font-weight: 600; } .li .main-t .sm { display: block; }\n.tag { display: inline-block; font-size: 11px; font-weight: 650; padding: 1px 7px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--line); color: var(--ink-2); }\n.tag.crit { background: color-mix(in srgb, var(--orange) 16%, var(--surface)); border-color: color-mix(in srgb, var(--orange) 40%, var(--line)); color: var(--ink); }\n.empty { padding: 26px 10px; text-align: center; color: var(--ink-3); }\n\n/* ---------- attendance grid ---------- */\n.gridwrap { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); overflow: auto; max-height: calc(100vh - 230px); box-shadow: var(--shadow); }\ntable.att { border-collapse: separate; border-spacing: 0; font-size: 12px; min-width: 100%; }\ntable.att th, table.att td { padding: 0; height: 30px; border-bottom: 1px solid var(--line); text-align: center; background: var(--surface); }\ntable.att thead th { position: sticky; top: 0; z-index: 3; height: 40px; font-weight: 600; color: var(--ink-2); background: var(--surface-2); }\ntable.att th.d small { display: block; font-weight: 500; color: var(--ink-3); font-size: 10px; line-height: 1; margin-top: 2px; }\ntable.att .wk { background: var(--wknd); } table.att thead th.wk { background: var(--wknd); }\ntable.att .tdy { box-shadow: inset 2px 0 0 var(--today), inset -2px 0 0 var(--today); }\ntable.att thead th.tdy { color: var(--today); }\ntable.att .c-name { position: sticky; left: 0; z-index: 2; text-align: left; padding: 0 10px; min-width: 190px; max-width: 220px; border-right: 1px solid var(--line); }\ntable.att thead .c-name { z-index: 4; }\ntable.att .c-name b { display: block; font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.15; }\ntable.att .c-name span { display: block; font-size: 11px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.15; }\ntable.att td.c-name { cursor: pointer; } table.att td.c-name:hover b { color: var(--accent); }\ntable.att .c-id { min-width: 84px; color: var(--ink-3); padding: 0 6px; }\ntable.att td.cell { min-width: 34px; width: 34px; cursor: pointer; position: relative; padding: 2px; }\ntable.att td.cell:hover .chip { outline: 2px solid var(--accent); outline-offset: -1px; }\ntable.att td.cell.selected { box-shadow: inset 0 0 0 2px var(--accent); }\ntable.att td.beyond { background: var(--surface-2); }\ntable.att .c-tot { min-width: 54px; font-weight: 650; padding: 0 6px; }\ntable.att .c-act { min-width: 74px; padding: 0 4px; }\ntable.att tbody tr:hover td:not(.cell) { background: var(--surface-2); }\ntable.att tbody tr:hover td.wk:not(.cell) { background: var(--wknd); }\n.note-dot { position: absolute; top: 2px; right: 2px; width: 0; height: 0; border-left: 6px solid transparent; border-top: 6px solid var(--red); }\n\n.chip { display: flex; align-items: center; justify-content: center; height: 24px; border-radius: 4px; font-weight: 650; font-size: 11px; letter-spacing: .01em;\n  --c: var(--gray); background: color-mix(in srgb, var(--c) 24%, var(--surface)); border: 1px solid color-mix(in srgb, var(--c) 55%, var(--surface)); color: var(--ink); }\n.cat-approved { --c: var(--blue); } .cat-sick { --c: var(--aqua); } .cat-unplanned { --c: var(--orange); } .cat-half { --c: var(--yellow); }\n.cat-applied { --c: var(--violet); } .cat-late { --c: var(--magenta); } .cat-remote { --c: var(--green); }\n.cat-off { --c: var(--gray); } .cat-off.chip { background: color-mix(in srgb, var(--gray) 14%, var(--surface)); border-color: transparent; color: var(--ink-3); font-weight: 600; }\n.cat-moved.chip, .cat-na.chip, .cat-present.chip { --c: var(--gray); background: transparent; border-style: dashed; color: var(--ink-3); font-weight: 600; }\n.cat-na.chip { border-color: transparent; opacity: .7; }\n.cat-unknown.chip { --c: var(--red); background: transparent; border: 1px dashed var(--red); }\n.cat-applied.chip { background: transparent; border: 1.5px solid var(--violet); }\n.cat-half.chip { background: linear-gradient(135deg, color-mix(in srgb, var(--yellow) 45%, var(--surface)) 50%, color-mix(in srgb, var(--yellow) 12%, var(--surface)) 50%); }\n.sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -2px; margin-right: 6px; background: color-mix(in srgb, var(--c) 30%, var(--surface)); border: 1px solid var(--c); }\n\n/* ---------- popover / modal ---------- */\n.pop { position: fixed; z-index: 60; background: var(--surface); border: 1px solid var(--line-2); border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,.22); padding: 10px; width: 262px; }\n.pop h4 { margin: 0 0 6px; font-size: 12px; color: var(--ink-3); font-weight: 600; }\n.pop input { width: 100%; margin-bottom: 8px; }\n.pop .codes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }\n.pop .codes button { border: 0; background: transparent; padding: 0; text-align: center; }\n.pop .codes button .chip { height: 30px; font-size: 12px; } .pop .codes button:hover .chip, .pop .codes button.sel .chip { outline: 2px solid var(--accent); }\n.pop .foot { display: flex; justify-content: space-between; margin-top: 8px; gap: 6px; }\n.veil { position: fixed; inset: 0; background: rgba(10,10,10,.45); z-index: 70; display: grid; place-items: center; padding: 20px; }\n.modal { background: var(--surface); border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.35); width: min(760px, 100%); max-height: calc(100vh - 40px); display: flex; flex-direction: column; border: 1px solid var(--line); }\n.modal.wide { width: min(940px, 100%); }\n.modal header { padding: 16px 20px 8px; display: flex; align-items: center; gap: 10px; } .modal header h3 { margin: 0; font-size: 16px; flex: 1; }\n.modal .body { padding: 8px 20px 12px; overflow: auto; }\n.modal footer { padding: 12px 20px 16px; display: flex; gap: 8px; align-items: center; border-top: 1px solid var(--line); }\n.form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 14px; }\n.form .full { grid-column: 1 / -1; }\n.form label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: var(--ink-2); }\n.form label input, .form label select { font-weight: 400; color: var(--ink); font-size: 14px; }\n.err { color: var(--crit-ink); font-size: 13px; margin-top: 6px; }\n.dayedit { display: grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap: 6px; }\n.dayedit label { font-size: 10px; align-items: stretch; gap: 2px; text-align: center; }\n.dayedit input { padding: 4px; text-align: center; text-transform: uppercase; font-size: 13px; }\n.dayedit label.wk input { background: var(--wknd); } .dayedit label.off input { opacity: .35; }\n\n/* ---------- misc ---------- */\n.toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--surface); padding: 10px 16px; border-radius: 10px; z-index: 120; box-shadow: var(--shadow); font-weight: 550; max-width: 90vw; }\n.toast button { margin-left: 12px; background: transparent; border: 0; color: inherit; text-decoration: underline; font-weight: 600; }\n.welcome { max-width: 640px; margin: 6vh auto 0; text-align: center; }\n.welcome .drop { border: 2px dashed var(--line-2); border-radius: 16px; padding: 42px 24px; background: var(--surface); }\n.welcome .drop.over { border-color: var(--accent); background: var(--accent-soft); }\n.welcome h2 { margin: 0 0 6px; font-size: 22px; } .welcome p { color: var(--ink-2); margin: 6px 0 16px; }\n.steps { text-align: left; margin: 20px auto 0; max-width: 460px; color: var(--ink-2); font-size: 13px; }\n.kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; font-size: 13px; }\n.issue { border: 1px solid var(--line); border-radius: 10px; margin-bottom: 10px; background: var(--surface); }\n.issue > summary { list-style: none; display: flex; align-items: center; gap: 10px; padding: 11px 14px; cursor: pointer; }\n.issue > summary::-webkit-details-marker { display: none; }\n.issue > summary .ttl { flex: 1; } .issue > summary .ttl b { font-weight: 650; } .issue > summary .ttl span { display: block; font-size: 12px; color: var(--ink-3); }\n.issue .inner { padding: 4px 14px 12px; border-top: 1px solid var(--line); }\n.issue .inner table { width: 100%; border-collapse: collapse; font-size: 13px; } .issue .inner td, .issue .inner th { padding: 5px 8px; border-bottom: 1px solid var(--line); text-align: left; }\n.score { width: 56px; height: 56px; }\n.people-layout { display: grid; grid-template-columns: 260px 1fr; gap: 14px; align-items: start; }\n.people-list { max-height: calc(100vh - 190px); overflow: auto; padding: 8px; }\n.people-list .p { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; width: 100%; min-width: 0; padding: 7px 10px; border: 0; background: transparent; border-radius: 8px; text-align: left; }\n.people-list .p > span, .people-list .p > small { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.people-list .p > small { font-size: 11.5px; line-height: 1.3; }\n.people-list .p:hover { background: var(--surface-2); } .people-list .p[aria-current=\"true\"] { background: var(--accent-soft); font-weight: 600; }\n.people-list .p small { color: var(--ink-3); }\n@media (max-width: 1000px) { .people-layout { grid-template-columns: 1fr; } .people-list { max-height: 240px; } }\nkbd { border: 1px solid var(--line-2); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; font-size: 11px; background: var(--surface-2); }\n\n.people-layout > div { min-width: 0; }\n\ntable.att tbody tr { height: 46px; }\n\n/* blank cells: present (P) on weekdays, week off (WO) on Saturday / Sunday. Shown faintly because nothing is stored in Excel. */\n.chip.implied { background: transparent; border-color: transparent; color: var(--ink-3); font-weight: 600; opacity: .5; }\n.chip.implied.p { opacity: .38; }\ntable.att td.cell:hover .chip.implied { opacity: 1; }\n.grid-note { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }\n.stchips { display: flex; flex-wrap: wrap; gap: 6px 16px; }\n.stchips label.chk { flex-direction: row; align-items: center; gap: 6px; font-weight: 500; font-size: 13px; color: var(--ink); }\n\n/* Left / Moved, and the activity log */\n.chip.implied.gone { background:transparent; color:var(--muted); opacity:.5; border:1px dashed var(--line); }\ntr.gone .c-name span { color:var(--orange, #b45309); }\n.act-list { max-width:100%; }\n.act-day { padding:10px 16px 6px; font-size:12px; font-weight:700; color:var(--ink-2); text-transform:uppercase; letter-spacing:.04em; background:var(--surface-2); border-top:1px solid var(--line); border-bottom:1px solid var(--line); }\n.act-day:first-child { border-top:0; }\n.act-item { padding:10px 16px; border-bottom:1px solid var(--line); }\n.act-item:last-child { border-bottom:0; }\n.act-line { display:flex; justify-content:space-between; gap:12px; align-items:baseline; }\n.act-line .linkbtn { font-weight:700; }\n.chgs { display:flex; flex-wrap:wrap; gap:4px 6px; margin-top:6px; align-items:center; }\n.cchg { display:inline-flex; gap:5px; align-items:baseline; font-size:12px; padding:2px 8px; border:1px solid var(--line); border-radius:999px; background:var(--surface-2); }\n.cchg i { color:var(--muted); font-style:normal; }\n.xbadge, .wbadge { margin-left:6px; font-size:10px; font-weight:700; letter-spacing:.04em; padding:1px 6px; border-radius:6px; vertical-align:1px; }\n.xbadge { background:color-mix(in srgb, var(--orange, #d97706) 20%, var(--surface)); color:var(--ink); border:1px solid color-mix(in srgb, var(--orange, #d97706) 55%, var(--surface)); }\n.wbadge { background:color-mix(in srgb, var(--blue, #2563eb) 16%, var(--surface)); color:var(--ink); border:1px solid color-mix(in srgb, var(--blue, #2563eb) 45%, var(--surface)); }\n\n.marktbl { width:100%; min-width:0 !important; } .marktbl th, .marktbl td { text-align:left; } .marktbl td.num { text-align:right; } .marktbl th:last-child { text-align:right; }\n\n/* ---------- v3.3: health tabs, Fix people, auto-save ---------- */\n.btn.sm.on { background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 45%, var(--line-2)); }\n.htabs { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--surface); border: 1px solid var(--line); margin-bottom: 14px; flex-wrap: wrap; }\n.htab { border: 0; background: transparent; padding: 6px 14px; border-radius: 8px; color: var(--ink-2); font-weight: 500; }\n.htab:hover { background: var(--wash); }\n.htab[aria-selected=\"true\"] { background: var(--accent-soft); color: var(--ink); font-weight: 650; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent); }\n.htab b { font-size: 11px; background: var(--crit); color: #fff; border-radius: 10px; padding: 0 6px; margin-left: 4px; }\n.tag.ok { background: color-mix(in srgb, var(--c-aqua) 16%, var(--surface)); border-color: color-mix(in srgb, var(--c-aqua) 40%, var(--line)); color: var(--ink); }\n.tag.warn { background: color-mix(in srgb, var(--warn) 28%, var(--surface)); border-color: color-mix(in srgb, var(--warn) 55%, var(--line)); color: var(--ink); }\n.warn-t { color: var(--orange); font-size: 12px; }\n.fixtools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }\n.fchip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line-2); background: var(--surface); border-radius: 999px; padding: 3px 11px; font-size: 12.5px; color: var(--ink-2); }\n.fchip b { font-variant-numeric: tabular-nums; font-size: 11px; background: var(--surface-2); border-radius: 10px; padding: 0 6px; }\n.fchip.on { background: var(--accent-soft); color: var(--ink); border-color: color-mix(in srgb, var(--accent) 45%, var(--line-2)); font-weight: 650; }\n.fixwrap { border: 1px solid var(--line); border-radius: 10px; overflow: auto; max-height: calc(100vh - 360px); min-height: 160px; background: var(--surface); }\ntable.fixtbl { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 860px; font-size: 13px; }\ntable.fixtbl th { position: sticky; top: 0; z-index: 2; background: var(--surface-2); text-align: left; padding: 8px 10px; font-weight: 600; color: var(--ink-2); border-bottom: 1px solid var(--line); font-size: 12px; }\ntable.fixtbl td { padding: 6px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }\ntable.fixtbl tr.on td { background: color-mix(in srgb, var(--accent) 6%, var(--surface)); }\ntable.fixtbl td input[type=text] { width: 100%; padding: 4px 8px; }\ntable.fixtbl td input:disabled { opacity: .6; }\ntable.fixtbl td [data-fix-state] { margin-top: 3px; }\n.fixbar { position: sticky; bottom: 0; z-index: 4; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 12px -16px -16px; padding: 10px 16px; background: var(--surface); border-top: 1px solid var(--line); border-radius: 0 0 12px 12px; box-shadow: 0 -6px 14px -10px rgba(20,40,110,.25); }\n\n/* holiday: click a day number to mark it for everyone */\ntable.att thead th.hd { cursor: pointer; }\ntable.att thead th.hd:hover { background: var(--accent-soft); color: var(--ink); }\n@media (max-width: 1250px) { .who3 { grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important; } .who3 > .card:first-child { grid-column: 1 / -1; } }\n@media (max-width: 760px) { .who3 { grid-template-columns: minmax(0,1fr) !important; } }\n.dlbl { font-size: 10px; font-weight: 650; fill: var(--ink-2); pointer-events: none; }\ntable.rtab { width: 100%; border-collapse: collapse; font-size: 12.5px; }\ntable.rtab th, table.rtab td { padding: 6px 10px; border-bottom: 1px solid var(--line); text-align: left; }\ntable.rtab th { font-size: 11px; color: var(--ink-3); font-weight: 650; background: var(--surface-2, transparent); position: sticky; top: 0; }\ntable.rtab td.n, table.rtab th.n { text-align: right; font-variant-numeric: tabular-nums; }\ntable.rtab tr.tot td { font-weight: 700; border-top: 2px solid var(--line-2); }\n.rtab-wrap { max-height: 420px; overflow: auto; border: 1px solid var(--line); border-radius: 10px; margin-top: 8px; }\n.xf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 12px; }\n.fld-list { list-style: none; margin: 0 0 10px; padding: 0; border: 1px solid var(--line); border-radius: 10px; }\n.fld-list li { display: flex; gap: 10px; align-items: center; padding: 8px 12px; border-top: 1px solid var(--line); }\n.fld-list li:first-child { border-top: 0; }\n.fld-fill { max-height: 50vh; overflow: auto; border: 1px solid var(--line); border-radius: 10px; }\n.fld-fill table { width: 100%; border-collapse: collapse; }\n.fld-fill td, .fld-fill th { padding: 5px 10px; border-bottom: 1px solid var(--line); text-align: left; font-size: 12.5px; }\n.fld-fill input { width: 100%; }\n";
/* ==========================================================================
   ZIP SHIM: gives the engine the few zip calls it needs (file / remove / generate),
   on top of the Team Dashboard's own zip reader/writer. Untouched parts are copied
   byte-for-byte (still compressed); only the parts we change are re-deflated.
   ========================================================================== */
const ZipShim = {
  async loadAsync(bytes) {
    const z = await BE._internals.Zip.open(bytes), td = new TextDecoder('utf-8'), te = new TextEncoder();
    const pending = new Map(), removed = new Set();
    const has = p => !removed.has(p) && (pending.has(p) || !!z.find(p));
    const api = {
      get files() { const o = {}; for (const e of z.entries) if (!removed.has(e.name)) o[e.name] = true; for (const k of pending.keys()) o[k] = true; return o; },
      file(path, data) {
        if (data === undefined) {
          if (!has(path)) return null;
          return { async: async type => { const u = pending.has(path) ? pending.get(path) : await z.get(path); return type === 'string' ? td.decode(u) : u; } };
        }
        removed.delete(path); pending.set(path, typeof data === 'string' ? te.encode(data) : data); return api;
      },
      remove(path) { pending.delete(path); if (z.find(path)) removed.add(path); },
      async generateAsync() {
        z.entries = z.entries.filter(e => !removed.has(e.name));
        for (const [p, u] of pending) await z.set(p, u);
        return new Uint8Array(await z.build().arrayBuffer());
      },
    };
    return api;
  },
};

/* ==========================================================================
   XLSX ENGINE
   Reads the "Attendance Tracker" sheet straight out of the .xlsx package and
   writes it back by patching ONLY the parts that must change. Pivot tables,
   the data model, charts, images, comments on other sheets, styles, and every
   other worksheet are copied through untouched.
   ========================================================================== */
const Engine = (() => {
  const SHEET_NAME = 'Attendance Tracker';
  const DAY_COL0 = 5;            // column E = day 1
  const COL_TOTAL = 36, COL_UL = 37, COL_UPC = 38, COL_REG = 39; // AJ, AK, AL, AM
  const DEF_STYLE = { A: 96, B: 3, C: 3, D: 2, day: 2, calc: 93 };

  const colName = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const colNum = s => { let n = 0; for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64; return n; };

  const decode = s => s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, g) => {
    if (g === 'amp') return '&'; if (g === 'lt') return '<'; if (g === 'gt') return '>';
    if (g === 'quot') return '"'; if (g === 'apos') return "'";
    return g[1] === 'x' ? String.fromCodePoint(parseInt(g.slice(2), 16)) : String.fromCodePoint(parseInt(g.slice(1), 10));
  });
  const encode = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const attr = (s, name) => { const m = s.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"')); return m ? decode(m[1]) : null; };

  /* ---- Excel date helpers (1900 system, first-of-month serials) ---- */
  const serialToDate = n => new Date(Math.round((n - 25569) * 86400000));            // UTC date
  const dateToSerial = d => Math.round(d.getTime() / 86400000) + 25569;
  const monthSerial = (y, m0) => dateToSerial(new Date(Date.UTC(y, m0, 1)));
  const daysInMonth = serial => { const d = serialToDate(serial); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); };

  /* ---- The three formula columns, replicated exactly (COUNTIF is case-insensitive, no trimming) ---- */
  const upper = v => (v == null ? '' : String(v).toUpperCase());
  function calc(days, variant) {
    let ul = 0, al = 0, sl = 0, cl = 0, ab = 0, hd = 0, la = 0;
    for (const v of days) {
      const u = upper(v);
      if (u === 'UL') ul++; else if (u === 'AL') al++; else if (u === 'SL') sl++;
      else if (u === 'CL') cl++; else if (u === 'AB') ab++;
      else if (u === 'HD1' || u === 'HD2') hd++;
      if (u === 'LA') la++;
    }
    const total = ul + al + sl + cl + ab + 0.5 * hd;
    const upc = variant === 'AL' ? al : la;
    return { total, ul, upc };
  }
  function formulas(r, variant) {
    const rg = `E${r}:AI${r}`;
    return {
      total: `COUNTIF(${rg},"UL")+COUNTIF(${rg},"AL")+COUNTIF(${rg},"SL")+COUNTIF(${rg},"CL")+COUNTIF(${rg},"AB") + 0.5*(COUNTIF(${rg},"HD1")+COUNTIF(${rg},"HD2"))`,
      ul: `COUNTIF(${rg},"UL")`,
      upc: `COUNTIF(${rg},"${variant === 'AL' ? 'AL' : 'LA'}")`,
    };
  }

  /* ---- Reading ---- */
  async function readText(zip, path) { const f = zip.file(path); if (!f) throw new Error('Missing part: ' + path); return f.async('string'); }


  async function sheetParts(zip, sheetPath) {
    const relPath = sheetPath.replace(/worksheets\/([^/]+)$/, 'worksheets/_rels/$1.rels');
    const out = { tablePath: null, commentsPath: null, vmlPath: null, relPath };
    if (!zip.file(relPath)) return out;
    const rx = await readText(zip, relPath); const dir = sheetPath.replace(/[^/]+$/, '');
    const resolve = t => { const parts = (t.startsWith('/') ? t.slice(1) : dir + t).split('/'); const o = []; for (const p of parts) { if (p === '..') o.pop(); else if (p !== '.') o.push(p); } return o.join('/'); };
    for (const m of rx.matchAll(/<Relationship\b[^>]*>/g)) {
      const ty = attr(m[0], 'Type') || '', tg = attr(m[0], 'Target');
      if (/\/table$/.test(ty)) out.tablePath = resolve(tg); else if (/\/comments$/.test(ty)) out.commentsPath = resolve(tg); else if (/\/vmlDrawing$/.test(ty)) out.vmlPath = resolve(tg);
    }
    return out;
  }

  function parseSharedStrings(xml) {
    const list = [], plain = [];
    const re = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g;
    let m;
    while ((m = re.exec(xml))) {
      const inner = (m[1] || '').replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
      let text = '';
      const tre = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g; let t;
      while ((t = tre.exec(inner))) text += decode(t[1] || '');
      list.push(text); plain.push(!/<r[ >]/.test(inner));
    }
    return { list, plain };
  }

  function readRowCells(rawRow, sst) {
    const out = {}; if (!rawRow) return out;
    const cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let cm;
    while ((cm = cre.exec(rawRow))) {
      const ref = attr(cm[1], 'r'); if (!ref) continue; const cn = colNum(ref.replace(/\d+/g, '')), t = attr(cm[1], 't'), inner = cm[2] || '';
      const vm = inner.match(/<v>([\s\S]*?)<\/v>/); let val = null;
      if (t === 's' && vm) val = sst.list[parseInt(vm[1], 10)];
      else if (t === 'inlineStr') { let s = ''; for (const m of inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) s += decode(m[1]); val = s; }
      else if (vm) val = decode(vm[1]);
      if (val != null) out[cn] = val;
    }
    return out;
  }
  async function load(bytes) {
    const zip = await ZipShim.loadAsync(bytes);
    const wbXml = await readText(zip, 'xl/workbook.xml');
    const relsXml = await readText(zip, 'xl/_rels/workbook.xml.rels');
    let rid = null;
    for (const m of wbXml.matchAll(/<sheet\b[^>]*>/g)) { if (attr(m[0], 'name') === SHEET_NAME) rid = attr(m[0], 'r:id'); }
    if (!rid) throw new Error(`This workbook has no sheet named "${SHEET_NAME}".`);
    let target = null;
    for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) { if (attr(m[0], 'Id') === rid) target = attr(m[0], 'Target'); }
    if (!target) throw new Error('Could not locate the tracker sheet inside the workbook.');
    const sheetPath = target.startsWith('/') ? target.slice(1) : 'xl/' + target;
    const sheetXml = await readText(zip, sheetPath);
    const sstXml = zip.file('xl/sharedStrings.xml') ? await readText(zip, 'xl/sharedStrings.xml') : '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"></sst>';
    const sst = parseSharedStrings(sstXml);

    const a = sheetXml.indexOf('<sheetData>'), b = sheetXml.indexOf('</sheetData>');
    if (a < 0 || b < 0) throw new Error('Unexpected sheet layout.');
    const prefix = sheetXml.slice(0, a), suffix = sheetXml.slice(b + '</sheetData>'.length);
    const body = sheetXml.slice(a + '<sheetData>'.length, b);

    // shared-formula masters (to learn which variant of "Upcoming Leaves" each row used)
    const masters = {};
    for (const m of body.matchAll(/<f t="shared" ref="[^"]+" si="(\d+)">([^<]*)<\/f>/g)) masters[m[1]] = decode(m[2]);

    let rawRow1 = '', rawRow2 = '', sstRefs = 0;
    const rows = [];
    let skippedBlank = 0;
    const rowRe = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g; let rm;
    while ((rm = rowRe.exec(body))) {
      const r = parseInt(attr(rm[1], 'r'), 10);
      if (r === 1) { rawRow1 = rm[0]; continue; }
      if (r === 2) { rawRow2 = rm[0]; continue; }
      const content = rm[2] || '';
      const row = { r0: r, month: null, empId: null, name: '', client: '', days: new Array(31).fill(null), reg: null, styles: {}, variant: 'LA' };
      const cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let cm;
      while ((cm = cre.exec(content))) {
        const ref = attr(cm[1], 'r'); const cn = colNum(ref.replace(/\d+/g, ''));
        const s = attr(cm[1], 's'), t = attr(cm[1], 't'); const inner = cm[2] || '';
        if (s != null) row.styles[cn] = parseInt(s, 10);
        const vm = inner.match(/<v>([\s\S]*?)<\/v>/);
        let val = null;
        if (t === 's' && vm) { val = sst.list[parseInt(vm[1], 10)]; sstRefs++; }
        else if (t === 'inlineStr') { const tm = inner.match(/<t\b[^>]*>([\s\S]*?)<\/t>/); val = tm ? decode(tm[1]) : ''; }
        else if (t === 'str' && vm) val = decode(vm[1]);
        else if (vm && (t == null || t === 'n')) val = parseFloat(vm[1]);
        else if (vm && t === 'b') val = vm[1] === '1';
        if (cn === COL_UPC) {
          const fm = inner.match(/<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/);
          if (fm) { let ftxt = fm[2] ? decode(fm[2]) : null; if (ftxt == null) { const si = attr(fm[1], 'si'); ftxt = si != null ? masters[si] : null; } if (ftxt && /"AL"/.test(ftxt)) row.variant = 'AL'; }
          continue;
        }
        if (cn === COL_TOTAL || cn === COL_UL) continue;
        if (val === '' || val == null) continue;
        if (cn === 1) row.month = typeof val === 'number' ? val : null;
        else if (cn === 2) row.empId = val;
        else if (cn === 3) row.name = String(val);
        else if (cn === 4) row.client = String(val);
        else if (cn >= DAY_COL0 && cn < DAY_COL0 + 31) row.days[cn - DAY_COL0] = val;
        else if (cn === COL_REG) row.reg = typeof val === 'number' ? val : parseFloat(val);
        else if (cn > COL_REG) (row.x || (row.x = {}))[cn] = val;   // v3.14: extra fields after AM
      }
      const empty = row.month == null && !row.name && !row.client && row.empId == null && row.days.every(d => d == null) && row.reg == null;
      if (empty) { skippedBlank++; continue; }
      rows.push(row);
    }

    // cell notes (comments) -> row.notes[dayIndex] = text
    const parts = await sheetParts(zip, sheetPath);
    if (parts.commentsPath && zip.file(parts.commentsPath)) {
      const cx = await readText(zip, parts.commentsPath); const byR0 = new Map(rows.map(r => [r.r0, r]));
      for (const m of cx.matchAll(/<comment\b[^>]*?ref="([A-Z]+)(\d+)"[\s\S]*?<\/comment>/g)) {
        const cn = colNum(m[1]), row = byR0.get(parseInt(m[2], 10)); if (!row || cn < DAY_COL0 || cn >= DAY_COL0 + 31) continue;
        let txt = ''; for (const t of m[0].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) txt += decode(t[1]);
        txt = txt.replace(/^[^\n]{1,40}:\s*\n/, '').trim();
        (row.notes = row.notes || {})[cn - DAY_COL0] = txt;
      }
    }
    if (!/Recruiter Name/.test(rawRow2) && rows.length === 0) throw new Error('The tracker sheet looks empty or has a different layout than expected.');
    /* v3.14: row 2 holds the headings; anything after AM is a field added from the dashboard (or in Excel) */
    const headers = readRowCells(rawRow2, sst), extraCols = [];
    for (const [cn, v] of Object.entries(headers)) if (+cn > COL_REG && String(v ?? '').trim()) extraCols.push({ cn: +cn, name: String(v).trim() });
    extraCols.sort((a, b) => a.cn - b.cn);
    const byCn = new Map(extraCols.map(c => [c.cn, c.name]));
    for (const row of rows) { row.extra = {}; if (row.x) { for (const [cn, v] of Object.entries(row.x)) { const nm = byCn.get(+cn); if (nm) row.extra[nm] = v; } delete row.x; } }
    const headerNames = Object.values(headers).map(v => String(v ?? '').trim()).filter(Boolean);
    return { zip, bytes, sheetPath, prefix, suffix, rawRow1, rawRow2, sst, sstXml, sstRefs, rows, skippedBlank, extraCols, headerNames };
  }

  /* ---- Writing ---- */
  async function build(ctx, rows, fieldNames = []) {
    const zip = await ZipShim.loadAsync(ctx.bytes);      // start clean from the last saved bytes
    /* v3.14: extra fields after AM. Existing ones keep their column; new ones are added after the last one. */
    const extra = (ctx.extraCols || []).map(c => ({ ...c }));
    let nextCol = Math.max(COL_REG, ...extra.map(c => c.cn)) + 1; const addedCols = [];
    for (const nm of fieldNames) if (nm && !extra.some(c => c.name.toLowerCase() === String(nm).toLowerCase())) { const c = { cn: nextCol++, name: String(nm) }; extra.push(c); addedCols.push(c); }
    const lastColNum = Math.max(COL_REG, ...extra.map(c => c.cn)), lastCol = colName(lastColNum);
    // shared-strings: reuse existing plain strings, append new ones
    const map = new Map(); ctx.sst.list.forEach((s, i) => { if (ctx.sst.plain[i] && !map.has(s)) map.set(s, i); });
    let nextIdx = ctx.sst.list.length; const added = [];
    const sIdx = s => { let i = map.get(s); if (i == null) { i = nextIdx++; map.set(s, i); added.push(s); } return i; };
    let newRefs = 0;
    const strCell = (ref, s, val) => { newRefs++; return `<c r="${ref}"${s != null ? ` s="${s}"` : ''} t="s"><v>${sIdx(String(val))}</v></c>`; };
    const numCell = (ref, s, val) => `<c r="${ref}"${s != null ? ` s="${s}"` : ''}><v>${val}</v></c>`;
    const emptyCell = (ref, s) => `<c r="${ref}" s="${s}"/>`;

    const rowsXml = [];
    const rowMap = new Map();      // old row number -> new row number
    rows.forEach((row, i) => {
      const r = i + 3; if (row.r0 != null) rowMap.set(row.r0, r);
      const st = c => row.styles[c];
      const cells = [];
      // A month
      cells.push(numCell('A' + r, st(1) ?? DEF_STYLE.A, row.month));
      // B empId
      if (row.empId != null && row.empId !== '') cells.push(typeof row.empId === 'number' ? numCell('B' + r, st(2) ?? DEF_STYLE.B, row.empId) : strCell('B' + r, st(2) ?? DEF_STYLE.B, row.empId));
      else if (st(2) != null && st(2) !== DEF_STYLE.B) cells.push(emptyCell('B' + r, st(2)));
      // C name
      cells.push(strCell('C' + r, st(3) ?? DEF_STYLE.C, row.name));
      // D client
      if (row.client) cells.push(strCell('D' + r, st(4) ?? DEF_STYLE.D, row.client));
      else if (st(4) != null && st(4) !== DEF_STYLE.D) cells.push(emptyCell('D' + r, st(4)));
      // days
      for (let d = 0; d < 31; d++) {
        const cn = DAY_COL0 + d, ref = colName(cn) + r, v = row.days[d];
        if (v != null && v !== '') cells.push(typeof v === 'number' ? numCell(ref, st(cn) ?? DEF_STYLE.day, v) : strCell(ref, st(cn) ?? DEF_STYLE.day, v));
        else if (st(cn) != null && st(cn) !== DEF_STYLE.day) cells.push(emptyCell(ref, st(cn)));
      }
      // calculated columns
      const c = calc(row.days, row.variant), f = formulas(r, row.variant);
      cells.push(`<c r="AJ${r}" s="${st(COL_TOTAL) ?? DEF_STYLE.calc}"><f>${encode(f.total)}</f><v>${c.total}</v></c>`);
      cells.push(`<c r="AK${r}" s="${st(COL_UL) ?? DEF_STYLE.calc}"><f>${encode(f.ul)}</f><v>${c.ul}</v></c>`);
      cells.push(`<c r="AL${r}" s="${st(COL_UPC) ?? DEF_STYLE.calc}"><f>${encode(f.upc)}</f><v>${c.upc}</v></c>`);
      if (row.reg != null && !Number.isNaN(row.reg)) cells.push(numCell('AM' + r, st(COL_REG) ?? DEF_STYLE.calc, row.reg));
      else cells.push(emptyCell('AM' + r, st(COL_REG) ?? DEF_STYLE.calc));
      for (const c of extra) {
        const v = row.extra ? row.extra[c.name] : null, ref = colName(c.cn) + r;
        if (v != null && v !== '') cells.push(typeof v === 'number' ? numCell(ref, st(c.cn) ?? st(4) ?? DEF_STYLE.D, v) : strCell(ref, st(c.cn) ?? st(4) ?? DEF_STYLE.D, v));
        else if (st(c.cn) != null && st(c.cn) !== DEF_STYLE.D) cells.push(emptyCell(ref, st(c.cn)));
      }
      rowsXml.push(`<row r="${r}">${cells.join('')}</row>`);
    });
    const last = rows.length + 2;

    // ---- worksheet ----
    let prefix = ctx.prefix
      .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:${lastCol}${last}"/>`)
      .replace(/(<pane\b[^>]*?)topLeftCell="[^"]*"/, '$1topLeftCell="G3"')
      .replace(/(<selection pane="bottomRight"[^>]*?)activeCell="[^"]*"/, '$1activeCell="C3"')
      .replace(/(<selection pane="bottomRight"[^>]*?)sqref="[^"]*"/, '$1sqref="C3"');
    /* new field headings go into row 2, styled like the AM heading */
    let row2 = ctx.rawRow2;
    if (addedCols.length) {
      const hs = (row2.match(/<c r="AM2"[^>]*?\ss="(\d+)"/) || [])[1];
      const cellsXml = addedCols.map(c => `<c r="${colName(c.cn)}2"${hs ? ` s="${hs}"` : ''} t="inlineStr"><is><t>${encode(c.name)}</t></is></c>`).join('');
      if (!row2) row2 = `<row r="2">${cellsXml}</row>`;
      else if (/\/>$/.test(row2) && !/<\/row>$/.test(row2)) row2 = row2.replace(/\s*\/>$/, '>') + cellsXml + '</row>';
      else row2 = row2.replace(/<\/row>$/, cellsXml + '</row>');
      row2 = row2.replace(/^<row\b([^>]*?)\sspans="[^"]*"/, '<row$1');
    }
    const sheetXml = prefix + '<sheetData>' + ctx.rawRow1 + row2 + rowsXml.join('') + '</sheetData>' + ctx.suffix;
    zip.file(ctx.sheetPath, sheetXml);

    // ---- shared strings ----
    let sstXml = ctx.sstXml;
    if (added.length) sstXml = sstXml.replace('</sst>', added.map(s => `<si><t${/^\s|\s$|[\r\n]/.test(s) ? ' xml:space="preserve"' : ''}>${encode(s)}</t></si>`).join('') + '</sst>');
    const cnt = parseInt(attr(sstXml.match(/<sst\b[^>]*>/)[0], 'count') || '0', 10);
    const uniq = nextIdx;
    sstXml = sstXml.replace(/<sst\b([^>]*)>/, (m, a) => '<sst' + a.replace(/\scount="[^"]*"/, ` count="${Math.max(0, cnt - ctx.sstRefs + newRefs)}"`).replace(/\suniqueCount="[^"]*"/, ` uniqueCount="${uniq}"`) + '>');
    zip.file('xl/sharedStrings.xml', sstXml);
    /* v3.11: a workbook saved without a shared-strings part (some tools do this) gets one registered, or Excel can't read the names */
    { let wr = await readText(zip, 'xl/_rels/workbook.xml.rels');
      if (!/sharedStrings\.xml"/.test(wr)) { const ids = [...wr.matchAll(/Id="rId(\d+)"/g)].map(m => +m[1]); wr = wr.replace('</Relationships>', `<Relationship Id="rId${Math.max(0, ...ids) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`); zip.file('xl/_rels/workbook.xml.rels', wr); }
      let ct = await readText(zip, '[Content_Types].xml');
      if (!/sharedStrings\.xml"/.test(ct)) { ct = ct.replace('</Types>', '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'); zip.file('[Content_Types].xml', ct); } }

    // ---- sheet relationships: table, comments, vml ----
    const { tablePath, commentsPath, vmlPath, relPath } = await sheetParts(zip, ctx.sheetPath); let tableName = null;
    if (tablePath && zip.file(tablePath)) {
      let tx = await readText(zip, tablePath);
      tableName = attr(tx.match(/<table\b[^>]*>/)[0], 'name');
      tx = tx.replace(/(<table\b[^>]*?\sref=")[^"]*(")/, `$1A2:${lastCol}${last}$2`).replace(/<sortState\b[\s\S]*?<\/sortState>/, '');
      tx = tx.replace(/(<autoFilter\b[^>]*?\sref=")[^"]*(")/, `$1A2:${lastCol}${last}$2`);
      /* v3.14: a table needs one tableColumn per column; add the new fields */
      const tcM = tx.match(/<tableColumns\b[^>]*>([\s\S]*?)<\/tableColumns>/);
      if (tcM) {
        const have = [...tcM[1].matchAll(/<tableColumn\b[^>]*?\sid="(\d+)"/g)].map(m => +m[1]);
        let add = '', id = Math.max(0, ...have);
        for (let cn = have.length + 1; cn <= lastColNum; cn++) { const c = extra.find(x => x.cn === cn); add += `<tableColumn id="${++id}" name="${encode(c ? c.name : 'Column' + cn).replace(/"/g, '&quot;')}"/>`; }
        if (add) tx = tx.replace(/<tableColumns\b[^>]*>[\s\S]*?<\/tableColumns>/, m => m.replace(/\scount="\d+"/, ` count="${have.length + add.split('<tableColumn ').length - 1}"`).replace('</tableColumns>', add + '</tableColumns>'));
      }
      zip.file(tablePath, tx);
    }

    // ---- comments (notes) follow their rows; notes on deleted rows are dropped ----
    if (commentsPath && zip.file(commentsPath)) {
      let cx = await readText(zip, commentsPath);
      const keepKeys = new Set();
      cx = cx.replace(/<comment\b[^>]*?ref="([A-Z]+)(\d+)"[\s\S]*?<\/comment>/g, (m, col, r) => {
        const nr = rowMap.get(parseInt(r, 10)); if (!nr) return '';
        keepKeys.add(`${colNum(col) - 1}:${parseInt(r, 10) - 1}`);
        return m.replace(/ref="[A-Z]+\d+"/, `ref="${col}${nr}"`);
      });
      if (!/<comment\b(?!s|L)/.test(cx)) {
        // every note was on a deleted row: an empty comment list is invalid, so detach the notes parts entirely
        zip.remove(commentsPath); if (vmlPath) zip.remove(vmlPath);
        let rx = await readText(zip, relPath); rx = rx.replace(/<Relationship\b[^>]*\/(?:comments|vmlDrawing)"[^>]*\/>/g, ''); zip.file(relPath, rx);
        let sx = await readText(zip, ctx.sheetPath); sx = sx.replace(/<legacyDrawing\b[^>]*\/>/, ''); zip.file(ctx.sheetPath, sx);
        let ct = await readText(zip, '[Content_Types].xml'); ct = ct.replace(new RegExp('<Override\\b[^>]*PartName="/' + commentsPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*/>'), ''); zip.file('[Content_Types].xml', ct);
      } else {
      zip.file(commentsPath, cx);
      if (vmlPath && zip.file(vmlPath)) {
        let vx = await readText(zip, vmlPath);
        vx = vx.replace(/<v:shape\b[\s\S]*?<\/v:shape>/g, sh => {
          const rr = sh.match(/<x:Row>(\d+)<\/x:Row>/), cc = sh.match(/<x:Column>(\d+)<\/x:Column>/);
          if (!rr || !cc) return sh;
          const nr = rowMap.get(parseInt(rr[1], 10) + 1);
          if (!nr) return '';
          return sh.replace(/<x:Row>\d+<\/x:Row>/, `<x:Row>${nr - 1}</x:Row>`);
        });
        zip.file(vmlPath, vx);
      }
      }
    }

    // ---- workbook: force recalculation, drop the (now stale) calc chain ----
    let wx = await readText(zip, 'xl/workbook.xml');
    if (/<calcPr\b/.test(wx)) wx = wx.replace(/<calcPr\b([^>]*?)\/>/, (m, a) => /fullCalcOnLoad/.test(a) ? m : `<calcPr${a} fullCalcOnLoad="1"/>`);
    zip.file('xl/workbook.xml', wx);
    if (zip.file('xl/calcChain.xml')) {
      zip.remove('xl/calcChain.xml');
      let wr = await readText(zip, 'xl/_rels/workbook.xml.rels');
      wr = wr.replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g, ''); zip.file('xl/_rels/workbook.xml.rels', wr);
      let ct = await readText(zip, '[Content_Types].xml');
      ct = ct.replace(/<Override\b[^>]*calcChain[^>]*\/>/g, ''); zip.file('[Content_Types].xml', ct);
    }

    // ---- pivot caches fed by this sheet: widen/shrink range and refresh when Excel opens the file ----
    for (const path of Object.keys(zip.files).filter(p => /^xl\/pivotCache\/pivotCacheDefinition\d+\.xml$/.test(p))) {
      let px = await readText(zip, path); let touched = false;
      px = px.replace(/<worksheetSource\b[^>]*\/>/g, ws => {
        const isSheet = attr(ws, 'sheet') === SHEET_NAME, isTable = tableName && attr(ws, 'name') === tableName;
        if (!isSheet && !isTable) return ws;
        touched = true;
        if (isSheet) { const ref = attr(ws, 'ref'); if (ref) ws = ws.replace(/ref="([A-Z]+\d+):([A-Z]+)\d+"/, `ref="$1:$2${last}"`); }
        return ws;
      });
      if (touched && !/refreshOnLoad=/.test(px)) px = px.replace(/<pivotCacheDefinition\b/, '<pivotCacheDefinition refreshOnLoad="1"');
      if (touched) zip.file(path, px);
    }

    return zip.generateAsync();
  }

  async function hasTracker(bytes) {
    try { const zip = await ZipShim.loadAsync(bytes); const wb = await readText(zip, 'xl/workbook.xml'); for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) if (attr(m[0], 'name') === SHEET_NAME) return true; } catch (e) { /* not a readable workbook */ }
    return false;
  }

  return { load, build, hasTracker, calc, colName, colNum, serialToDate, dateToSerial, monthSerial, daysInMonth, DAY_COL0 };
})();

/* ==========================================================================
   APP CORE: state, helpers, data model, file handling
   ========================================================================== */
const CODES = {
  AL: { label: 'Approved Leave', cat: 'approved' }, CL: { label: 'Casual Leave', cat: 'approved' },
  SL: { label: 'Sick Leave', cat: 'sick' }, UL: { label: 'Unplanned Leave', cat: 'unplanned' }, AB: { label: 'Absent', cat: 'unplanned' },
  HD1: { label: 'Half day, 1st half', cat: 'half' }, HD2: { label: 'Half day, 2nd half', cat: 'half' },
  LA: { label: 'Leave application (pending)', cat: 'applied' },
  RJ: { label: 'Leave request rejected (attendance not recorded)', cat: 'rejected' },
  L: { label: 'Late coming', cat: 'late' }, C: { label: 'Cab late', cat: 'late' },
  R: { label: 'Remote', cat: 'remote' }, P: { label: 'Present', cat: 'present' },
  WO: { label: 'Week off', cat: 'off' }, H: { label: 'Holiday', cat: 'off' },
  M: { label: 'Moved', cat: 'moved' }, X: { label: 'Date not applicable for the month', cat: 'na' }, NA: { label: 'Not applicable', cat: 'na' },
};
const CATS = { approved: 'Approved leave', sick: 'Sick leave', unplanned: 'Unplanned / absent', half: 'Half day', applied: 'Leave applied (pending)', rejected: 'Leave request rejected', late: 'Late / cab late', remote: 'Remote', off: 'Week off / holiday', moved: 'Moved', na: 'Not applicable', present: 'Present', unknown: 'Unrecognised' };
const PICK = ['WO', 'H', 'AL', 'CL', 'SL', 'UL', 'AB', 'HD1', 'HD2', 'LA', 'RJ', 'L', 'C', 'R', 'M', 'P', 'X', 'NA'];
const LEAVE_CATS = new Set(['approved', 'sick', 'unplanned', 'half']);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const $ = (s, r = ROOT) => r.querySelector(s);
const $$ = (s, r = ROOT) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const up = v => (v == null ? '' : String(v).toUpperCase());
const fmt = n => (Math.round(n * 10) / 10).toLocaleString('en-US');
const catOf = v => { if (v == null || v === '') return null; const c = CODES[String(v).trim().toUpperCase()]; return c ? c.cat : 'unknown'; };
const labelOf = v => { const c = CODES[String(v).trim().toUpperCase()]; return c ? c.label : 'Unrecognised code'; };
const personKey = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
const monthLabel = s => { const d = Engine.serialToDate(s); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
const monthShort = s => MONTHS[Engine.serialToDate(s).getUTCMonth()];
const monthYear = s => Engine.serialToDate(s).getUTCFullYear();
const dateOf = (ms, i) => { const d = Engine.serialToDate(ms); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), i + 1)); };
const dow = (ms, i) => dateOf(ms, i).getUTCDay();
const isoDate = d => d.toISOString().slice(0, 10);
const longDate = d => `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const now0 = new Date();
const TODAY = new Date(Date.UTC(now0.getFullYear(), now0.getMonth(), now0.getDate()));
const TODAY_MS = Engine.monthSerial(TODAY.getUTCFullYear(), TODAY.getUTCMonth());
const TODAY_IDX = TODAY.getUTCDate() - 1;

function clientGroup(c) {
  const s = String(c || '').trim().toLowerCase();
  if (!s) return 'Unassigned';
  if (/^(eb\b|employbridge|eb\s*\/)/.test(s)) return 'Employbridge';
  if (/^(mgr|billed mgr|manager)/.test(s)) return 'Managers';
  if (/matrix|motion recruitment/.test(s)) return 'Matrix';
  if (/^bench/.test(s)) return 'Bench';
  if (/^proj/.test(s)) return 'Projected';
  if (/^(mrs)/.test(s)) return 'MRS';
  return String(c).trim();
}

/* ------------ state ------------ */
const S = {
  ctx: null, rows: [], handle: null, fileName: '', mtime: 0, ver: 0, uid: 1, inFolder: true,
  changes: [], undo: [], saving: false, auto: true, autoErr: '', autoRetry: 0, autoAt: null, autoBusy: false, lastChange: 0, lastBackup: 0, base: [], links: new Map(), mode: 'app', visible: false, act: { items: null, loading: false, err: '' },
  status: 'idle', msg: '', candidates: [], picking: false, diskChanged: false, folder: '', stale: true,
  ui: {
    view: 'who', period: null, client: 'all', scope: 'all', showUnmatched: false, health: { tab: 'checks', f: 'all', q: '', all: false }, card: { date: null, past: 7, next: 15, kind: 'all', view: 'today', names: 'real' },
    grid: { month: null, q: '', client: 'all', filter: 'all', status: 'all', kinds: [] },
    who: { start: isoDate(TODAY), days: 7, show: { leave: true, applied: true, late: false, remote: false } },
    people: { sel: null, q: '' },
    act: { wb: 'att', user: 'all', via: 'all', type: 'all', q: '', shown: 100 },
    thr: { month: { ul: 2, total: 5 }, long: { ul: 5, total: 15 } },
  },
};

/* Blank means present (P), unless it is a Saturday or Sunday (week off). Only days up to today count in the current month. */
const impliedCode = (ms, i) => { const w = dow(ms, i); return w === 0 || w === 6 ? 'WO' : 'P'; };
function presentDays(row) {
  if (row.month > TODAY_MS) return 0;
  const dim = Engine.daysInMonth(row.month), last = row.month === TODAY_MS ? Math.min(dim - 1, TODAY_IDX) : dim - 1; let n = 0;
  for (let i = 0; i <= last; i++) { const v = row.days[i]; if (v == null || v === '') { if (impliedCode(row.month, i) === 'P' && trackedOn(row, i)) n++; } else if (['P', 'R', 'L', 'C'].includes(String(v).trim().toUpperCase())) n++; }
  return n;
}
function rowStats(row) {
  if (row._s) return row._s;
  const c = {};
  for (const v of row.days) { if (v == null || v === '') continue; const u = up(v); c[u] = (c[u] || 0) + 1; }
  const x = Engine.calc(row.days, row.variant);
  return row._s = {
    codes: c, total: x.total, ul: x.ul, upc: x.upc,
    present: presentDays(row), approved: (c.AL || 0) + (c.CL || 0), sick: c.SL || 0, unpl: (c.UL || 0) + (c.AB || 0),
    half: (c.HD1 || 0) + (c.HD2 || 0), applied: c.LA || 0, late: (c.L || 0) + (c.C || 0), remote: c.R || 0,
  };
}
function agg(rows) {
  const a = { n: rows.length, total: 0, approved: 0, sick: 0, unpl: 0, half: 0, applied: 0, late: 0, people: new Set() };
  for (const r of rows) { const s = rowStats(r); a.total += s.total; a.approved += s.approved; a.sick += s.sick; a.unpl += s.unpl; a.half += s.half; a.applied += s.applied; a.late += s.late; a.people.add(personKey(r.name)); }
  a.headcount = a.people.size; return a;
}
const rowCode = (row, i) => row.days[i];
const isLeaveCode = v => LEAVE_CATS.has(catOf(v));

/* ------------ link to the Team roster (Team Dashboard data) ------------ */
const nameTokens = n => String(n || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
const idKey = v => (v == null ? '' : String(v).trim().toLowerCase());
function rosterRows() { try { return (state.schema && state.rows) || []; } catch { return []; } }
function rosterVer() { try { return state.version; } catch { return null; } }
function rosterIndex() {
  const rows = rosterRows();
  if (rosterIndex.c && rosterIndex.c.rows === rows && rosterIndex.c.n === rows.length && rosterIndex.c.v === rosterVer()) return rosterIndex.c;
  const byId = new Map(), byName = new Map(), byTok = new Map(), add = (m, k, r) => { if (!k) return; (m.get(k) || m.set(k, []).get(k)).push(r); };
  for (const r of rows) { add(byId, idKey(gs(r, 'key_column')), r); const nm = personKey(gs(r, 'name_column')); add(byName, nm, r); add(byTok, nameTokens(nm), r); }
  return rosterIndex.c = { rows, n: rows.length, v: rosterVer(), byId, byName, byTok, memo: new Map() };
}
/* Workforce statuses that get attendance rows. "Resign" covers Resigned / Resignation. Left and Moved people are gone. */
const TRACKED_RE = /^(active|resign\w*|projected|bench|manager|new)$/i;
const rosterStatus = r => gs(r, 'status_column').trim();
const isTracked = r => TRACKED_RE.test(rosterStatus(r));
const isGone = r => isInactive(r) && !/^resign/i.test(rosterStatus(r));
const pickRoster = l => { if (!l || !l.length) return null; if (l.length === 1) return l[0]; const a = l.filter(r => !isGone(r)); return a.length ? a[0] : l[0]; };
/* Left and Moved people are not tracked. Left needs a Left Date (the last day they were here); a Moved person needs no date. */
const goneKind = r => (/^moved/i.test(rosterStatus(r)) ? 'moved' : isGone(r) ? 'left' : null);
const dateSerial = r => { try { const v = g(r, colName('left_column')); return typeof v === 'number' ? Math.floor(v) : null; } catch { return null; } };
const dojSerial = r => { try { const v = g(r, colName('doj_column')); return typeof v === 'number' ? Math.floor(v) : null; } catch { return null; } };
const serialParts = v => { const d = Engine.serialToDate(v); return { ms: Engine.monthSerial(d.getUTCFullYear(), d.getUTCMonth()), i: d.getUTCDate() - 1 }; };
const linkTarget = (ix, lk) => (lk.code && pickRoster(ix.byId.get(idKey(lk.code)))) || (lk.rname && pickRoster(ix.byName.get(personKey(lk.rname)))) || null;
/* A link made by hand comes first, then Emp ID, then the exact name, then the same words in any order. Returns { row, how } or null. */
function rosterMatch(empId, name) {
  const ix = rosterIndex(); if (!ix.n) return null;
  const mk = idKey(empId) + '|' + personKey(name); if (ix.memo.has(mk)) return ix.memo.get(mk);
  let res = null, r; const lk = S.links.get(personKey(name));
  if (lk && (r = linkTarget(ix, lk))) res = { row: r, how: 'link' };                       // linked by hand: wins over everything
  else if (idKey(empId) && (r = pickRoster(ix.byId.get(idKey(empId))))) res = { row: r, how: 'id' };
  else if ((r = pickRoster(ix.byName.get(personKey(name))))) res = { row: r, how: 'name' };
  else { const l = ix.byTok.get(nameTokens(name)); if (l && l.length === 1) res = { row: l[0], how: 'words' }; }
  ix.memo.set(mk, res); return res;
}
const hasRoster = () => rosterIndex().n > 0;
/* The newest row decides (old rows sometimes carry a copied, wrong Emp ID). Older rows are only used when the newest one finds nothing. */
const rosterOfPerson = p => { for (let k = p.rows.length - 1; k >= 0; k--) { const m = rosterMatch(p.rows[k].empId, p.name); if (m) return m; } return rosterMatch([...p.ids][0], p.name) || null; };
/* Has this tracker row's person left the team (or moved)? Cached on the row until the row or the workforce data changes. */
function departure(row) {
  if (!hasRoster()) return null; const ix = rosterIndex();
  if (row._dp && row._dp.ix === ix) return row._dp.v;
  let v = null; const m = rosterMatch(row.empId, row.name), kind = m && goneKind(m.row);
  if (kind) { const lv = kind === 'left' ? dateSerial(m.row) : null; v = { kind, roster: m.row, dated: lv != null, ...(lv != null ? serialParts(lv) : {}) }; }
  row._dp = { ix, v }; return v;
}
/* false for days after a Left person's last day, and for today onwards for a Moved person (or a Left person with no date) */
function trackedOn(row, i) {
  const dp = departure(row); if (!dp) return true;
  if (dp.dated) return row.month < dp.ms || (row.month === dp.ms && i <= dp.i);
  return row.month < TODAY_MS || (row.month === TODAY_MS && i < TODAY_IDX);
}
/* The status boxes and filters at the top of the Team Dashboard drive every attendance view (grid, who's out, people, Overview card, Reports).
   People the workforce file does not know have no status, so they only show when asked for ("Not in the workforce file"). */
const hostSig = () => { try { if(state.view === 'reports'){const f0=state.filters;return 'reports:'+reportScope.revision+'|'+(f0.q||'')+'|'+Object.keys(f0.sel).sort().map(k=>k+'='+[...f0.sel[k]].sort().join(',')).join(';');}if(state.view === 'actions')return 'unfiltered:actions'; const f = state.filters; return (f.q || '') + '|' + Object.keys(f.sel).sort().map(k => k + '=' + [...f.sel[k]].sort().join(',')).join(';'); } catch { return ''; } };
const curSig = () => hostSig() + '|' + rosterVer() + (S.ui.showUnmatched ? 'u' : '');
const hostSummary = () => { try { return filterSummary() || 'All statuses'; } catch { return ''; } };
function inScope(r) {
  try { if(state.view === "actions")return true;if(state.view === "reports"){const match=rowRoster(r),f0=state.filters,filtered=!!f0.q||Object.values(f0.sel).some(v=>v.size);return match?(passes(match)&&reportPass(match)):!filtered&&!reportScope.cohort&&!Object.values(reportScope.sel).some(v=>v.size);} } catch {}
  if (!hasRoster()) return true;
  const x = rosterMatch(r.empId, r.name); if (!x) return !!S.ui.showUnmatched;
  try { return passes(x.row); } catch { return true; }
}

/* derived indexes (cached per data version, roster version and scope). D() follows the Team scope, D(true) is everything. */
function D(all = false) {
  const key = S.ver + '|' + (all ? 'all' : curSig()) + '|' + rosterRows().length;
  const slot = all ? 'ca' : 'cs'; if (D[slot] && D[slot].key === key) return D[slot];
  const rows = all ? S.rows : S.rows.filter(inScope);
  const byMonth = new Map(), people = new Map(), clients = new Set();
  for (const r of rows) {
    if (!byMonth.has(r.month)) byMonth.set(r.month, []); byMonth.get(r.month).push(r);
    const k = personKey(r.name); let p = people.get(k);
    if (!p) people.set(k, p = { key: k, name: r.name.trim(), rows: [], ids: new Set(), latest: null });
    p.rows.push(r); if (r.empId != null && r.empId !== '') p.ids.add(String(r.empId));
    if (!p.latest || r.month >= p.latest.month) p.latest = r;
    clients.add(clientGroup(r.client));
  }
  const months = [...byMonth.keys()].filter(m => m != null).sort((a, b) => a - b);
  for (const p of people.values()) p.rows.sort((a, b) => a.month - b.month);
  return D[slot] = { key, rows, byMonth, people, months, latestMonth: months[months.length - 1], clients: [...clients].sort() };
}

/* ------------ mutations with undo + change log ------------ */
function snapshot() { return S.rows.map(r => ({ ...r, days: r.days.slice(), extra: { ...(r.extra || {}) } })); }
/* v3.14: fields added to the tracker (columns after AM). New ones wait in S.newFields until the next save writes them. */
const attFieldNames = () => { const out = [...((S.ctx && S.ctx.extraCols) || []).map(c => c.name)]; for (const n of (S.newFields || [])) if (!out.some(x => x.toLowerCase() === n.toLowerCase())) out.push(n); return out; };
/* v3.11: rights. Approving or rejecting leave (AL, CL, SL, RJ) needs "Approve leave"; other codes need "Edit attendance". */
const can = k => !window.PERM || PERM.can(k);
const APPROVAL_CODES = new Set(['AL', 'CL', 'SL', 'RJ']);
const attCanWrite = () => can('att.log') || can('att.edit') || can('att.approve') || can('att.holidays');
const LOG_TYPES = ['AL', 'CL', 'SL', 'UL', 'AB', 'HD1', 'HD2', 'LA', 'R', 'L', 'C'];
/* v3.14.2: the super admin ticks which leave types each passcode may pick in Log leave */
const logTypeAllowed = c => { if (!window.PERM || !PERM.online()) return true; return can('log.' + c); };
const canLog = () => (can('att.log') || can('att.edit') || can('att.approve')) && LOG_TYPES.some(logTypeAllowed);
let APPROVE_CTX = false;   // v3.15: true while a manager's approval of a leave request is applied
let LOG_CTX = false;   // true while a "Log leave" change is applied: the Log leave right is enough for non-approval codes
function codeAllowed(oldC, newC) {
  const o = oldC == null ? '' : String(oldC).trim().toUpperCase(), n = newC == null ? '' : String(newC).trim().toUpperCase();
  if (o === n) return true;
  if (APPROVE_CTX) return can('att.approve');
  /* in Log leave, a type the super admin ticked may be logged; replacing approved leave or a holiday still needs the usual right */
  if (LOG_CTX && LOG_TYPES.includes(n) && logTypeAllowed(n)) { if (APPROVAL_CODES.has(o)) return can('att.approve'); if (o === 'H') return can('att.edit') || can('att.holidays'); return true; }
  if (APPROVAL_CODES.has(n) || APPROVAL_CODES.has(o)) return can('att.approve');
  if (n === 'H' || o === 'H') return can('att.edit') || can('att.holidays');
  return can('att.edit') || (LOG_CTX && can('att.log'));
}
const permError = msg => Object.assign(new Error(msg), { perm: true });
const allowedInLog = (o, n) => { const was = LOG_CTX; LOG_CTX = true; try { return codeAllowed(o, n); } finally { LOG_CTX = was; } };
function mutate(desc, fn, opts = {}) {
  if (S.saving) { toast("Saving to Excel. Please wait a moment."); return false; }
  if (!(can('att.edit') || (opts.cells && can('att.approve')) || (opts.holiday && can('att.holidays')) || (opts.log && can('att.log')) || (opts.fields && can('att.fields')))) { toast('Your passcode can view attendance but not change this. Ask the admin for the right in Settings.'); return false; }
  S.undo.push({ rows: snapshot(), log: S.changes.length, nf: (S.newFields || []).length });
  if (S.undo.length > 60) S.undo.shift();
  const before = S.rows.length;
  let res;
  LOG_CTX = !!opts.log;
  try { res = fn(); }
  catch (e) {
    LOG_CTX = false;
    if (!e.perm) throw e;
    const u = S.undo.pop(); S.rows = u.rows; for (const r of S.rows) { r._s = null; r._dp = null; } S.ver++; render();
    toast(e.message); return false;
  }
  LOG_CTX = false;
  for (const r of S.rows) { r._s = null; r._dp = null; }
  S.ver++;
  if (res !== false) { S.changes.push({ t: new Date(), desc }); S.lastChange = Date.now(); schedulePendingSave(); }
  else S.undo.pop();
  render();
  return res;
}
function undo() {
  if (S.saving) return;
  const u = S.undo.pop(); if (!u) return;
  S.rows = u.rows.map(r => ({ ...r, _s: null, _dp: null })); S.changes.length = u.log; if (S.newFields && u.nf != null) S.newFields.length = Math.min(S.newFields.length, u.nf); S.ver++; S.lastChange = Date.now(); render(); toast('Undone');
  if (S.changes.length) schedulePendingSave(); else clearPending();
}
function newRow(month, name, opts = {}) {
  const days = new Array(31).fill(null); const dim = Engine.daysInMonth(month);
  if (opts.weekends !== false) for (let i = 0; i < dim; i++) { const w = dow(month, i); if (w === 0 || w === 6) days[i] = 'WO'; }
  return { uid: S.uid++, r0: null, month, empId: opts.empId ?? null, name, client: opts.client || '', days, reg: null, styles: {}, variant: 'LA', extra: {} };
}
function setDay(row, i, code) {
  if (!codeAllowed(row.days[i], code)) throw permError(APPROVAL_CODES.has(String(code || '').toUpperCase()) || APPROVAL_CODES.has(String(row.days[i] || '').toUpperCase()) ? 'Only people with the "Approve leave" right can set or change AL, CL, SL or RJ. Mark the day as LA (leave applied) instead.' : 'Your passcode can’t change attendance. Ask the admin for the right in Settings.');
  row.days[i] = code === '' ? null : code;
}
const rowLabel = r => `${r.name.trim()} · ${monthLabel(r.month)}`;

/* ------------ toast / tooltip (live inside the attendance section's own shadow root) ------------ */
let toastTimer;
function toast(msg, action) {
  if (!active() && typeof window.toast === 'function') { try { window.toast(msg, false); return; } catch { } }   // the attendance page is hidden: use the host's toast
  $('#toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.id = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = esc(msg) + (action ? `<button data-act="${action.act}">${esc(action.label)}</button>` : '');
  ROOT.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), action ? 8000 : 4200);
}
const tipEl = () => $('#tip') || (() => { const d = document.createElement('div'); d.id = 'tip'; d.className = 'tip'; ROOT.appendChild(d); return d; })();
function wireTips() {
  ROOT.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip]'); const t = tipEl();
    if (!el || $('#pop') || $('#modalRoot')) { t.classList.remove('on'); return; }
    t.innerHTML = el.dataset.tip; t.classList.add('on'); placeTip(e);
  });
  ROOT.addEventListener('mousemove', e => { if (e.target.closest('[data-tip]') && !$('#pop') && !$('#modalRoot')) placeTip(e); });
  ROOT.addEventListener('mouseout', e => { if (!e.relatedTarget || !e.relatedTarget.closest?.('[data-tip]')) tipEl().classList.remove('on'); });
}
function placeTip(e) { const t = tipEl(); const w = t.offsetWidth, h = t.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; t.style.left = Math.max(4, x) + 'px'; t.style.top = Math.max(4, y) + 'px'; }

/* ------------ finding, loading and saving the workbook (through the Team Dashboard's folder) ------------ */
const kv = { get: k => BE.kvGet('att:' + k).catch(() => null), set: (k, v) => BE.kvSet('att:' + k, v).catch(() => { }) };
/* The attendance UI lives in one shadow root that the host moves between pages. Mode says which page it is on:
   app = the Attendance page, health = Action center > Attendance data health, reports = Reports > Attendance. */
const active = () => { try { return S.visible && !document.getElementById('app').hidden; } catch { return false; } };
const APP_VIEWS = ['who', 'grid', 'people'];
/* v3.12: Who's out and the grid / People views each need their own right */
const viewAllowed = v => v === 'who' ? can('att.who') : (v === 'grid' || v === 'people') ? can('att.grid') : true;
const viewOf = () => { if (S.mode === 'health') return 'health'; if (S.mode === 'reports') return 'reports'; let v = APP_VIEWS.includes(S.ui.view) ? S.ui.view : 'grid'; if (!viewAllowed(v)) v = APP_VIEWS.find(viewAllowed) || v; return v; };
const CARD_KEY = 'att_card_ui_v1';
try { const c = JSON.parse(localStorage.getItem(CARD_KEY) || '{}'); for (const k of ['past', 'next']) if (c[k] >= 1 && c[k] <= 90) S.ui.card[k] = c[k]; if (['all', 'approved', 'applied', 'sick', 'unplanned', 'half'].includes(c.kind)) S.ui.card.kind = c.kind; if (['today', 'history'].includes(c.view)) S.ui.card.view = c.view; if (['real', 'pseudo'].includes(c.names)) S.ui.card.names = c.names; } catch { }
const saveCardUi = () => { try { const { past, next, kind, view, names } = S.ui.card; localStorage.setItem(CARD_KEY, JSON.stringify({ past, next, kind, view, names })); } catch { } };
const notify = () => { try { window.dispatchEvent(new CustomEvent('att:data')); } catch { } };

/* ------------ refresh safety net: unsaved edits survive a reload until they reach Excel ------------
   Every edit is mirrored into this browser's storage (debounced) so that refreshing the page - even by
   accident, even while an auto-save is still waiting to run - does not lose it. As soon as the edits are
   actually saved to Excel (or undone away), the mirrored copy is cleared. On the next load, if the file on
   disk still matches the moment the mirror was taken, the edits are restored automatically; otherwise
   (someone saved or changed the file since) the stale mirror is discarded rather than risking a bad merge. */
const PENDING_KEY = 'pending_v1';
let pendingTimer = null;
let pendingWrites = Promise.resolve();
function queuePending(value) {
  const write = pendingWrites.then(() => BE.kvSet('att:' + PENDING_KEY, value));
  pendingWrites = write.catch(e => console.error(e));
  return write;
}
function schedulePendingSave() { clearTimeout(pendingTimer); pendingTimer = setTimeout(() => persistPending().catch(console.error), 400); }
function flushPendingNow() { clearTimeout(pendingTimer); return persistPending(); }
async function persistPending() {
    if (!S.ctx || !S.changes.length) { await clearPending(); return; }
    const rows = S.rows.map(r => ({ uid: r.uid, r0: r.r0, month: r.month, empId: r.empId, name: r.name, client: r.client, days: r.days.slice(), reg: r.reg, styles: { ...r.styles }, variant: r.variant, extra: { ...(r.extra || {}) } }));
    await queuePending({ fileName: S.fileName, mtime: S.mtime, savedAt: Date.now(), n: S.changes.length, rows, fields: (S.newFields || []).slice() });
}
async function clearPending() { clearTimeout(pendingTimer); await queuePending(null); }
async function prepareSignOut() {
  const auto = S.auto; S.auto = false;
  try { await flushPendingNow(); }
  catch (e) { S.auto = auto; throw e; }
}
async function restorePendingIfAny() {
  let pending; try { pending = await kv.get(PENDING_KEY); } catch { pending = null; }
  if (!pending || !pending.rows || !pending.rows.length) return;
  if (pending.fileName !== S.fileName || pending.mtime !== S.mtime) { await clearPending(); return; }   // the file moved on since then: too risky to merge
  const diskRows = snapshot();
  S.rows = pending.rows.map(r => ({ ...r, extra: r.extra || {}, _s: null, _dp: null }));
  S.newFields = Array.isArray(pending.fields) ? pending.fields.slice() : [];
  S.uid = Math.max(S.uid, ...S.rows.map(r => (r.uid || 0) + 1));
  S.undo = [{ rows: diskRows, log: 0 }];
  S.changes = [{ t: new Date(), desc: `Restored ${pending.n || 1} unsaved change${(pending.n || 1) === 1 ? '' : 's'} from before the page reloaded` }];
  S.ver++;
  toast(`Restored ${pending.n || 1} unsaved change${(pending.n || 1) === 1 ? '' : 's'} you made just before the page reloaded.`, { act: 'undo', label: 'Undo' });
  schedulePendingSave();
}

async function adopt(ctx, { recover = false } = {}) {
  ctx.rows.forEach(r => { r.uid = S.uid++; if (!r.extra) r.extra = {}; });
  S.newFields = [];
  S.ctx = ctx; S.rows = ctx.rows; S.changes = []; S.undo = []; S.ver++; S.diskChanged = false; S.base = snapshot();
  const d = D(true);
  const has = ms => d.byMonth.has(ms);
  S.ui.period = S.ui.period && (S.ui.period === 'all' || S.ui.period.startsWith('y:') || has(parseInt(S.ui.period.slice(2), 10))) ? S.ui.period : 'm:' + d.latestMonth;
  if (!S.ui.grid.month || !has(S.ui.grid.month)) S.ui.grid.month = has(TODAY_MS) ? TODAY_MS : d.latestMonth;
  if (!has(TODAY_MS)) S.ui.who.start = isoDate(dateOf(d.latestMonth, 0));
  if (recover) await restorePendingIfAny();
}
/* v3.10: when workforce and attendance share one workbook, a workforce save changes the file but not the
   attendance sheet. The attendance "version" is then the CRC of its sheet part, read from the zip directory. */
const sigCache = { key: null, val: null };
async function attSig(f, sheetPath) {
  if (!BE.single()) return f.lastModified;
  const key = f.lastModified + ':' + f.size + ':' + sheetPath;
  if (sigCache.key === key) return sigCache.val;
  const z = await BE._internals.Zip.open(new Uint8Array(await f.arrayBuffer())), e = z.find(sheetPath);
  sigCache.key = key; sigCache.val = 'crc:' + (e ? e.crc + ':' + e.usize : 'none');
  return sigCache.val;
}
async function loadFrom(handle, name, inFolder) {
  const f = await handle.getFile(); const u8 = new Uint8Array(await f.arrayBuffer());
  const ctx = await Engine.load(u8);
  S.handle = handle; S.fileName = name; S.mtime = await attSig(f, ctx.sheetPath); S.inFolder = inFolder;
  await adopt(ctx, { recover: true }); S.status = 'ready'; S.picking = false; S.msg = '';
  try { await syncExternal(ctx, f); } catch (e) { console.error(e); }
}
async function scanFolder() {
  const roster = BE.fileName();
  S.candidates = (await BE.listWorkbooks()).filter(f => BE.single() || f.name !== roster);   // one shared workbook: the roster file is also the attendance file
  return S.candidates;
}
/* Called when the Team Dashboard opens its workbook: look in the same folder for the attendance workbook. */
async function connect() {
  const dir = BE.dir(); if (!dir) { S.status = 'idle'; render(); return; }
  const fk = dir.name + '|' + BE.fileName();
  if (S.folderKey === fk && S.ctx) { await checkDisk(); render(); notify(); return; }   // same folder as before: keep what is on screen (and any unsaved edits)
  if (S.folderKey && S.ctx) { S.ctx = null; S.rows = []; S.handle = null; S.changes = []; S.undo = []; S.ver++; }
  S.folderKey = fk; S.folder = dir.name;
  S.status = 'loading'; S.msg = ''; render();
  try {
    await loadLinks();
    const files = await scanFolder();
    let name = await kv.get('file'); if (name && !files.some(f => f.name === name)) name = null;
    if (name) { await loadFrom(await dir.getFileHandle(name), name, true); }
    else {
      const ext = await kv.get('handle');
      if (ext) {
        let perm = 'prompt'; try { perm = await ext.queryPermission({ mode: 'readwrite' }); } catch { }
        if (perm === 'granted') await loadFrom(ext, ext.name, false); else { S.extName = ext.name; S.status = 'reconnect'; }
      } else {
        const order = [...files.filter(f => /attend|leave|tracker/i.test(f.name)), ...files.filter(f => !/attend|leave|tracker/i.test(f.name))].slice(0, 12);
        for (const f of order) {
          const fh = await dir.getFileHandle(f.name); const u8 = new Uint8Array(await (await fh.getFile()).arrayBuffer());
          if (await Engine.hasTracker(u8)) { await loadFrom(fh, f.name, true); await kv.set('file', f.name); break; }
        }
        if (S.status !== 'ready') S.status = 'pick';
      }
    }
  } catch (e) { console.error(e); S.status = S.ctx ? 'ready' : 'error'; S.msg = e.message || String(e); }
  render(); notify();
}
async function chooseFolderFile(name) {
  S.status = 'loading'; render();
  try { await loadFrom(await BE.dir().getFileHandle(name), name, true); await kv.set('file', name); await kv.set('handle', null); toast(`Loaded ${S.rows.length.toLocaleString()} attendance rows from ${name}`); }
  catch (e) { S.status = S.ctx ? 'ready' : 'pick'; S.picking = !!S.ctx; toast(/no sheet named/i.test(e.message) ? `“${name}” has no “Attendance Tracker” sheet.` : 'Could not open it: ' + e.message); }
  render(); notify();
}
async function pickExternalHandle() {
  const [h] = await showOpenFilePicker({ types: [{ description: 'Excel workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'] } }], multiple: false });
  return h;
}
/* from the connect screen: just remember the choice, the Attendance page loads it once the workforce file is open */
async function chooseFileEarly() {
  if (!window.showOpenFilePicker) return null;
  try { const h = await pickExternalHandle(); await kv.set('handle', h); await kv.set('file', null); S.folderKey = null; return h.name; } catch (e) { if (e.name !== 'AbortError') console.error(e); return null; }
}
async function browseExternal() {
  if (!window.showOpenFilePicker) return;
  try {
    const h = await pickExternalHandle();
    S.status = 'loading'; render(); await loadFrom(h, h.name, false); await kv.set('handle', h); await kv.set('file', null);
    toast(`Loaded ${S.rows.length.toLocaleString()} attendance rows from ${h.name}`);
  } catch (e) { S.status = S.ctx ? 'ready' : 'pick'; if (e.name !== 'AbortError') toast(/no sheet named/i.test(e.message) ? 'That workbook has no “Attendance Tracker” sheet.' : 'Could not open the file: ' + e.message); }
  render(); notify();
}
async function reconnectExternal() {
  try { const h = await kv.get('handle'); if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') { toast('Permission was not granted'); return; } S.status = 'loading'; render(); await loadFrom(h, h.name, false); }
  catch (e) { S.status = 'pick'; toast('Could not reopen: ' + e.message); }
  render(); notify();
}
async function reloadFromDisk() { try { await loadFrom(S.handle, S.fileName, S.inFolder); render(); notify(); return true; } catch (e) { toast('Could not reload: ' + e.message); return false; } }
async function checkDisk() {
  if (!S.handle || S.saving || S.status !== 'ready') return;
  try {
    const f = await S.handle.getFile(); if (await attSig(f, S.ctx.sheetPath) === S.mtime) return;
    if (!S.changes.length) { if (await reloadFromDisk()) toast(BE.single() ? 'Attendance was changed by someone else, so the dashboard reloaded it.' : 'The attendance workbook was changed in Excel, so the dashboard reloaded it.'); }
    else if (!S.diskChanged) { S.diskChanged = true; render(); }
  } catch { }
}

const stamp = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
function downloadBytes(bytes, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
/* Auto-save: a few seconds after the last edit the changes are written to the Excel file by themselves (like the Employees page does).
   It never asks questions: if the file changed on disk, is open in Excel, or needs permission it waits and shows why, and Save to Excel still works by hand. */
const AUTO_MS = 1000, AUTO_KEY = 'td_autosync_v1';
S.auto = (() => { try { return localStorage.getItem(AUTO_KEY) !== 'off'; } catch { return true; } })();
/* v3.11: Start / Stop auto-sync really switches it (it used to stay on) and is remembered on this computer */
const setAuto = on => {
  S.auto = !!on; try { localStorage.setItem(AUTO_KEY, S.auto ? 'on' : 'off'); } catch { }
  if (S.auto) { S.autoErr = ''; S.autoRetry = 0; S.conflictAsked = false; }
  render(); try { dispatchEvent(new CustomEvent('att:sync')); } catch { }
};
async function autoTick() {
  if (!S.auto || S.status !== 'ready' || !S.ctx || S.saving || S.autoBusy || !S.changes.length) return;
  if (Date.now() - S.lastChange < AUTO_MS || Date.now() < S.autoRetry) return;
  S.autoBusy = true; try { await save({ auto: true }); } catch (e) { console.error(e); } S.autoBusy = false;
}
async function save(opts = {}) {
  if (S.saving || !S.ctx) return;
  const auto = !!opts.auto;
  if (!auto) S.autoErr = '';
  if (!S.changes.length && auto) return;
  if (!attCanWrite()) { if (!auto) toast('Your passcode can view attendance but not change it.'); return; }
  S.saving = true; render();
  let force = !!opts.force;
  try {
    for (let attempt = 0; ; attempt++) {
      const base = S.fileName.replace(/\.(xlsx|xlsm)$/i, '');
      if ((await S.handle.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await S.handle.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('Permission to write to the file was not granted.');
      if (S.inFolder && await BE.isLocked(S.fileName)) throw Object.assign(new Error('The attendance workbook is open in Excel. Close it there, then Save again. Nothing was changed.'), { busy: true });
      if (S.handle.cloud) await S.handle.meta(true);
      const f = await S.handle.getFile(), fSig = await attSig(f, S.ctx.sheetPath);
      /* v3.11: someone else saved attendance since this was loaded. Ask once what to do; never keep erroring. */
      if (S.mtime && fSig !== S.mtime && !force) {
        if (auto && S.conflictAsked) { S.autoErr = 'someone else changed attendance. Choose Save now to decide'; S.autoRetry = Date.now() + 60000; break; }
        S.conflictAsked = true;
        const who = S.handle.cloud && S.handle._meta && S.handle._meta.by ? S.handle._meta.by : '';
        const n = S.changes.length;
        const choice = await choiceDialog({
          title: 'Attendance was changed by someone else',
          text: `${who || 'Someone'} saved attendance after you opened it, and you have ${n} unsaved change${n === 1 ? '' : 's'}. ` +
            'Overwrite saves your version of the attendance sheet in place of theirs: their attendance changes since then are replaced (the workforce sheet is not touched, and a backup is kept). Load latest shows their version and discards your unsaved changes.',
          buttons: [{ label: 'Not now', value: 'later' }, { label: 'Load latest', value: 'reload' }, { label: 'Overwrite with my changes', value: 'overwrite', kind: 'danger armed' }] });
        if (choice === 'reload') { S.changes = []; await clearPending(); S.saving = false; S.conflictAsked = false; await reloadFromDisk(); toast('Loaded the latest attendance.'); return; }
        if (choice !== 'overwrite') { S.saving = false; setAuto(false); S.autoErr = 'auto-sync is stopped because someone else changed attendance. Save now to choose again'; render(); toast('Auto-sync stopped. Nothing was overwritten. Use Save now when you’re ready.'); return; }
        force = true;
      }
      /* backups live in the workforce folder's team-dashboard-data/backups. Auto-saves make one at most every 10 minutes, so a busy hour does not push the older backups out. */
      if (!auto || Date.now() - S.lastBackup > 600000) { try { await BE.backup(S.ctx.bytes, S.fileName); S.lastBackup = Date.now(); } catch (e) { if (!auto) downloadBytes(S.ctx.bytes, `${base}_backup_${stamp()}.xlsx`); else console.error(e); } }
      const n = S.changes.length, diff = diffRows(S.base, S.rows, r => 'u' + r.uid);
      /* in a shared workbook, build on top of the latest file so the workforce sheet's newest edits are kept */
      const out = await Engine.build(BE.single() ? await Engine.load(new Uint8Array(await f.arrayBuffer())) : S.ctx, S.rows, attFieldNames());
      if (!force && !S.handle.cloud && (await S.handle.getFile()).lastModified !== f.lastModified) { if (attempt < 2) continue; throw new Error('The workbook changed during saving. Try again in a moment.'); }
      const entries = entriesFromDiff(diff, { user: BE.userName(), time: BE.nowText(), external: false });
      /* v3.14: new tracker fields and their values are logged too */
      for (const nm of (S.newFields || [])) entries.push({ time: BE.nowText(), user: BE.userName(), action: 'settings', att: S.fileName, key: '', name: 'Attendance tracker', details: { note: 'Added the field “' + nm + '” (a new column after AM)' } });
      { const baseBy = new Map(S.base.map(r => [r.uid, r])), per = {};
        for (const r of S.rows) { const o = baseBy.get(r.uid), a = (o && o.extra) || {}, b = r.extra || {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if ((a[k] ?? null) !== (b[k] ?? null)) (per[k] = per[k] || []).push(r.name.trim()); }
        for (const [k, names] of Object.entries(per)) entries.push({ time: BE.nowText(), user: BE.userName(), action: 'att-edit', att: S.fileName, key: '', name: k, details: { note: k + ' filled or changed for ' + names.length + (names.length === 1 ? ' row: ' : ' rows: ') + names.slice(0, 6).join(', ') + (names.length > 6 ? ' +' + (names.length - 6) + ' more' : '') } }); }
      if (force) entries.unshift({ time: BE.nowText(), user: BE.userName(), action: 'overwrite', att: S.fileName, key: '', name: 'Attendance', details: { note: 'Saved over attendance changes someone else had made (a backup of their version is kept)' } });
      try { await BE.writeBlob(S.handle, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), entries, { force }); }
      catch (e) { if ((e.code === 'CONFLICT' || e.status === 409) && attempt < 2) { await new Promise(r => setTimeout(r, 400 + attempt * 600)); continue; } throw e; }   // the workforce sheet moved on: rebuild on top of it
      const f2 = await S.handle.getFile();
      const ctx = await Engine.load(out);
      S.mtime = await attSig(f2, ctx.sheetPath);
      await writeSnap(ctx.rows, f2.lastModified + ':' + f2.size);           // so this save is not mistaken for an Excel edit next time
      S.autoErr = ''; S.autoRetry = 0; S.conflictAsked = false; if (auto) S.autoAt = new Date(); else toast(`Saved ${n} change${n === 1 ? '' : 's'} to ${S.fileName}`);
      if (force && !S.auto) setAuto(true);
      await clearPending();
      S.newFields = [];
      await adopt(ctx); notify(); if (S.act) S.act.items = null;
      S.saving = false; render(); return true;
    }
  } catch (e) {
    if (!e.busy && e.status !== 423) console.error(e);
    if (auto) {
      const why = e.message && (e.busy || e.status === 423) ? 'the workbook is open in Excel. Close it there and this saves by itself' : /NoModification|InvalidState|NotReadable|busy|lock/i.test(e.name + e.message) ? 'the workbook is open in Excel. Close it there and this saves by itself' : /permission/i.test(e.message) ? 'the browser needs your permission. Press Save now once' : e.message;
      if (!S.autoErr) toast('Auto-sync is waiting: ' + why + '.'); S.autoErr = why; S.autoRetry = Date.now() + 20000; S.saving = false; render(); return;
    }
    S.autoRetry = Date.now() + 15000;   // a failed hand save: auto-sync waits a bit before trying again
    toast(e.message && (e.busy || e.status === 423) ? e.message : /NoModification|InvalidState|NotReadable|busy|lock/i.test(e.name + e.message) ? 'Could not write: close the workbook in Excel first, then Save again.' : 'Save failed: ' + e.message);
  }
  S.saving = false; render();
}
/* v3.11: a dialog with several choices, shown over the whole page wherever the person is */
function choiceDialog({ title, text, buttons }) {
  return new Promise(res => {
    const v = document.createElement('div'); v.className = 'td-choice-veil';
    v.innerHTML = `<div class="td-choice" role="alertdialog" aria-modal="true" aria-labelledby="tdChoiceT" aria-describedby="tdChoiceX"><h3 id="tdChoiceT">${esc(title)}</h3><p id="tdChoiceX">${esc(text)}</p><div class="td-choice-btns">${buttons.map((b, i) => `<button class="btn ${b.kind || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    const done = i => { v.remove(); document.removeEventListener('keydown', key, true); res(i == null ? null : buttons[i].value); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(0); } };
    v.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) done(+b.dataset.i); });
    document.addEventListener('keydown', key, true); (document.querySelector('dialog[open]') || document.body).appendChild(v); v.querySelector('[data-i="0"]').focus();
  });
}
window.tdChoice = choiceDialog;
/* a small dialog for the host page (used when the attendance page is not showing, e.g. from an employee's drawer) */
function hostDialog({ title, text, ok, cancel = 'Cancel', input = null, value = '' }) {
  return new Promise(res => {
    const v = document.createElement('div'); v.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:grid;place-items:center;padding:16px';
    v.innerHTML = `<div role="dialog" aria-modal="true" aria-label="${esc(title)}" style="background:var(--surface);color:var(--ink);border:1px solid var(--border);border-radius:14px;padding:20px;width:min(440px,100%);box-shadow:0 20px 60px rgba(0,0,0,.35)"><h3 style="margin:0 0 8px;font-size:17px">${esc(title)}</h3><p style="margin:0 0 14px;color:var(--ink-2);line-height:1.5">${esc(text)}</p>${input ? `<input type="text" maxlength="60" style="width:100%;box-sizing:border-box;margin-bottom:14px" value="${esc(value)}" placeholder="${esc(input)}" aria-label="${esc(input)}">` : ''}<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" data-r="0">${esc(cancel)}</button><button class="btn primary" data-r="1">${esc(ok)}</button></div></div>`;
    const inp = v.querySelector('input'), done = r => { v.remove(); document.removeEventListener('keydown', key, true); res(r === 1 ? (inp ? inp.value.trim() : true) : (inp ? null : false)); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(0); } else if (e.key === 'Enter' && (!e.target.closest || !e.target.closest('button'))) { e.preventDefault(); done(1); } };
    v.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) done(+b.dataset.r); else if (e.target === v) done(0); });
    document.addEventListener('keydown', key, true); document.body.appendChild(v); (inp || v.querySelector('[data-r="1"]')).focus();
  });
}
/* the name shown next to your changes in the activity log (kept on this computer) */
async function ensureUser() {
  if (BE.userName() !== 'You' || S.askedName) { if (S.namePromise) await S.namePromise; return; } S.askedName = true;
  S.namePromise = askFirst(); await S.namePromise; S.namePromise = null;
}
async function askFirst() {
  const n = await hostDialog({ title: 'Your name for the activity log', text: 'Activity is stored in this browser for this workbook pair. Type your name so your changes are recorded under it.', input: 'Your name', ok: 'Save name', cancel: 'Use “You”' });
  if (n) { BE.setUser(n); await kv.set('user', n); updateWho(); }
}
async function askName() {
  const n = await hostDialog({ title: 'Your name for the activity log', text: 'Changes you save from now on are recorded under this name.', input: 'Your name', value: BE.userName() === 'You' ? '' : BE.userName(), ok: 'Save name' });
  if (n) { BE.setUser(n); await kv.set('user', n); updateWho(); if (S.act) render(); }
}
function updateWho() { const b = document.getElementById('btnWho'); if (b) { const n = BE.userName(); b.textContent = n === 'You' ? 'Set your name' : n; b.title = 'Your name in the activity log: ' + n + '. Click to change.'; } }
function confirmBox(title, text, okLabel) {
  if (!active()) return hostDialog({ title, text, ok: okLabel });
  return new Promise(res => {
    const v = document.createElement('div'); v.className = 'veil'; v.style.zIndex = 200;
    v.innerHTML = `<div class="modal" style="width:min(460px,100%)" role="dialog" aria-modal="true"><header><h3>${esc(title)}</h3></header><div class="body"><p>${esc(text)}</p></div><footer><span class="grow"></span><button class="btn" data-r="0">Cancel</button><button class="btn danger armed" data-r="1">${esc(okLabel)}</button></footer></div>`;
    v.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { v.remove(); res(b.dataset.r === '1'); } else if (e.target === v) { v.remove(); res(false); } });
    ROOT.appendChild(v); v.querySelector('[data-r="0"]').focus();
  });
}
window.addEventListener('beforeunload', e => { if (S.changes.length && !window.dashboardSigningOut) { flushPendingNow().catch(console.error); e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.hidden && S.changes.length) flushPendingNow().catch(console.error); });
window.addEventListener('pagehide', () => { if (S.changes.length) flushPendingNow().catch(console.error); });


/* ==========================================================================
   ACTIVITY: who changed which record (past 30 days)
   Changes saved from this dashboard are logged cell by cell under the user's name. Changes made directly in Excel are
   found by comparing the sheet with a copy remembered from the last time the dashboard looked (att-snapshot.json).
   ========================================================================== */
const norm = v => (v == null ? '' : String(v));
const dayShort = (ms, i) => { const d = dateOf(ms, i); return `${d.getUTCDate()} ${WEEKDAYS[d.getUTCDay()]}`; };
const blankOr = v => { const t = norm(v).trim(); return t || '(blank)'; };
function keyed(rows, kf) { const m = new Map(), n = new Map(); for (const r of rows) { const b = kf(r), c = (n.get(b) || 0) + 1; n.set(b, c); m.set(c > 1 ? b + '#' + c : b, r); } return m; }
const contentKey = r => r.month + '|' + (idKey(r.empId) || 'n:' + personKey(r.name));
function diffRows(oldRows, newRows, kf) {
  const a = keyed(oldRows, kf), b = keyed(newRows, kf), out = [];
  for (const [k, r] of b) {
    const o = a.get(k); if (!o) { out.push({ kind: 'add', row: r }); continue; }
    const fields = {}, cells = [];
    if (norm(o.name).trim() !== norm(r.name).trim()) fields.Name = [o.name, r.name];
    if (idKey(o.empId) !== idKey(r.empId)) fields['Emp ID'] = [o.empId, r.empId];
    if (norm(o.client).trim() !== norm(r.client).trim()) fields.Client = [o.client, r.client];
    if (o.month !== r.month) fields.Month = [o.month == null ? '' : monthLabel(o.month), r.month == null ? '' : monthLabel(r.month)];
    if (norm(o.reg) !== norm(r.reg)) fields.Regularizations = [o.reg, r.reg];
    for (let i = 0; i < 31; i++) if (norm(o.days[i]) !== norm(r.days[i])) cells.push([i, o.days[i] ?? null, r.days[i] ?? null]);
    if (Object.keys(fields).length || cells.length) out.push({ kind: 'edit', row: r, fields, cells });
  }
  for (const [k, o] of a) if (!b.has(k)) out.push({ kind: 'delete', row: o });
  return out;
}
/* One log entry per changed row; very large batches (a whole new month, say) are summarised per month. */
function entriesFromDiff(list, { user, time, external }) {
  const pre = (external ? 'external-' : '') + 'att-', out = [], base = { time, user, att: S.fileName };
  const ml = ms => (ms == null ? '' : monthLabel(ms));
  const many = (kind, verb, cap) => {
    const xs = list.filter(x => x.kind === kind); if (!xs.length) return xs;
    if (xs.length <= cap) { for (const x of xs) out.push({ ...base, action: pre + kind, key: x.row.empId ?? '', name: norm(x.row.name).trim(), ms: x.row.month, details: { note: `${ml(x.row.month)} · ${verb}` } }); return []; }
    const by = new Map(); for (const x of xs) (by.get(x.row.month) || by.set(x.row.month, []).get(x.row.month)).push(x);
    for (const [ms, l] of by) out.push({ ...base, action: pre + kind, key: '', name: `${l.length} employee${l.length === 1 ? '' : 's'}`, ms, details: { note: `${ml(ms)} · ${l.length} rows ${verb}: ` + l.slice(0, 15).map(x => norm(x.row.name).trim()).join(', ') + (l.length > 15 ? ` and ${l.length - 15} more` : '') } });
    return [];
  };
  many('add', 'row added', 25); many('delete', 'row removed', 25);
  const ed = list.filter(x => x.kind === 'edit');
  if (ed.length > 60) {
    const by = new Map(); for (const x of ed) (by.get(x.row.month) || by.set(x.row.month, []).get(x.row.month)).push(x);
    for (const [ms, l] of by) out.push({ ...base, action: pre + 'edit', key: '', name: `${l.length} rows`, ms, details: { note: `${ml(ms)} · ${l.reduce((a, x) => a + x.cells.length, 0)} day entries changed in ${l.length} rows (too many to list one by one)` } });
  } else for (const x of ed) {
    const parts = x.cells.slice(0, 8).map(c => `${dayShort(x.row.month, c[0])}: ${blankOr(c[1])} → ${blankOr(c[2])}`);
    if (x.cells.length > 8) parts.push(`+${x.cells.length - 8} more days`);
    for (const [k, v] of Object.entries(x.fields)) parts.push(`${k}: ${blankOr(v[0])} → ${blankOr(v[1])}`);
    out.push({ ...base, action: pre + 'edit', key: x.row.empId ?? '', name: norm(x.row.name).trim(), ms: x.row.month, details: { note: `${ml(x.row.month)} · ` + parts.join(' · '), cells: x.cells.map(c => [c[0], c[1], c[2]]), fields: x.fields } });
  }
  return out;
}
const SNAP = 'att-snapshot.json', SNAP_MAX = 30000;
const snapRows = rows => rows.map(r => ({ m: r.month, i: r.empId ?? null, n: r.name, c: r.client || '', r: r.reg ?? null, d: r.days.map(norm).join('|') }));
const fromSnap = s => s.rows.map(x => ({ month: x.m, empId: x.i, name: x.n, client: x.c, reg: x.r, days: x.d.split('|').map(v => (v === '' ? null : v)) }));
async function writeSnap(rows, sig) { if (rows.length > SNAP_MAX) return; try { await BE.writeData(SNAP, JSON.stringify({ v: 1, file: S.fileName, sig, rows: snapRows(rows) })); } catch (e) { console.error(e); } }
const pad2 = n => String(n).padStart(2, '0');
const fmtTime = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
async function lastModifiedBy(bytes) {
  try { const z = await ZipShim.loadAsync(bytes), f = z.file('docProps/core.xml'); if (!f) return ''; const t = await f.async('string'); const m = /<cp:lastModifiedBy>([^<]*)<\/cp:lastModifiedBy>/.exec(t); return m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim() : ''; } catch { return ''; }
}
async function syncExternal(ctx, f) {
  if (BE.isCloud()) return;   // v3.11: online, every attendance change is logged by the person who saved it
  const sig = f.lastModified + ':' + f.size;
  let old = null; try { const t = await BE.readData(SNAP); old = t && JSON.parse(t); } catch { }
  if (!old || old.v !== 1 || old.file !== S.fileName || !Array.isArray(old.rows)) { await writeSnap(ctx.rows, sig); return; }   // first time: just remember how it looks now
  if (old.sig === sig) return;
  const list = diffRows(fromSnap(old), ctx.rows, contentKey);
  await writeSnap(ctx.rows, sig);
  if (!list.length) return;
  const who = await lastModifiedBy(ctx.bytes);
  await BE.appendActivity(entriesFromDiff(list, { user: who ? who + ' (in Excel)' : 'Someone in Excel', time: fmtTime(f.lastModified), external: true }));
  if (S.act) S.act.items = null;
}


/* ==========================================================================
   LINKS: tie a name in the tracker to a person in the workforce file by hand
   (e.g. “Chanchal Soni” in the tracker = “Chanchal Bharat Soni” in the workforce file).
   Kept in team-dashboard-data/att-links.json next to the workforce file, so everyone using the folder shares them.
   ========================================================================== */
const LINKS = 'att-links.json';
async function loadLinks() {
  const m = new Map(); try { const t = await BE.readData(LINKS), j = t && JSON.parse(t); for (const x of (j && j.links) || []) if (x && x.k) m.set(x.k, x); } catch (e) { console.error(e); }
  S.links = m; resetMatch();
}
const saveLinks = () => BE.writeData(LINKS, JSON.stringify({ v: 1, links: [...S.links.values()] }));
function resetMatch() { rosterIndex.c = null; S.ver++; for (const r of S.rows) r._dp = null; }
const wordsOf = n => String(n || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
function lev1(a, b) {   // are the words at most one typo apart?
  if (a === b) return true; if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
}
/* 0..1: how alike two names are. “Chanchal Soni” against “Chanchal Bharat Soni” scores high because every word of the shorter one is in the longer. */
function nameScore(a, b) {
  const ta = wordsOf(a), tb = wordsOf(b); if (!ta.length || !tb.length) return 0;
  let hit = 0; for (const x of ta) if (tb.some(y => x === y || (x.length > 3 && y.length > 3 && lev1(x, y)))) hit++;
  return (hit / Math.min(ta.length, tb.length)) * 0.75 + (hit / Math.max(ta.length, tb.length)) * 0.25;
}
async function addLink(trackerName, rr, rewrite) {
  const tname = String(trackerName).trim().replace(/\s+/g, ' '), k = personKey(tname), code = gs(rr, 'key_column').trim(), rname = gs(rr, 'name_column').trim();
  S.links.set(k, { k, tname, code, rname, by: BE.userName(), at: isoDate(TODAY) });
  try { await saveLinks(); } catch (e) { toast('The link works for now but could not be saved in this browser: ' + e.message); }
  await BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'att-link', key: code, name: rname, att: S.fileName || 'attendance', details: { note: `Linked the tracker name “${tname}” to “${rname}” (${code || 'no Emp Code'}) in the workforce file` } }]);
  resetMatch();
  if (rewrite) mutate(`Renamed ${tname} to match the workforce (${rname}, ${code})`, () => { for (const r of S.rows) if (personKey(r.name) === k) { r.name = rname; const id = parseId(code); if (id != null) r.empId = id; } });
  if (S.act) S.act.items = null; render(); notify();
  toast(`Linked “${tname}” to “${rname}”.${rewrite ? ' The tracker rows were renamed. Review, then Save to Excel.' : ''}`);
}
/* several links at once (the "Fix people" screen): one file write, one log entry per link */
async function addLinks(pairs) {
  if (!pairs.length) return;
  const logs = [];
  for (const { name, rr } of pairs) {
    const tname = String(name).trim().replace(/\s+/g, ' '), k = personKey(tname), code = gs(rr, 'key_column').trim(), rname = gs(rr, 'name_column').trim();
    S.links.set(k, { k, tname, code, rname, by: BE.userName(), at: isoDate(TODAY) });
    logs.push({ time: BE.nowText(), user: BE.userName(), action: 'att-link', key: code, name: rname, att: S.fileName || 'attendance', details: { note: `Linked the tracker name “${tname}” to “${rname}” (${code || 'no Emp Code'}) in the workforce file` } });
  }
  try { await saveLinks(); } catch (e) { toast('The links work for now but could not be saved in this browser: ' + e.message); }
  try { await BE.appendActivity(logs); } catch (e) { console.error(e); }
  resetMatch(); if (S.act) S.act.items = null;
}
async function removeLink(k) {
  const lk = S.links.get(k); if (!lk) return; S.links.delete(k);
  try { await saveLinks(); } catch (e) { toast('Could not save: ' + e.message); }
  await BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'att-unlink', key: lk.code, name: lk.rname, att: S.fileName || 'attendance', details: { note: `Removed the link between the tracker name “${lk.tname}” and “${lk.rname}”` } }]);
  resetMatch(); if (S.act) S.act.items = null; render(); notify(); toast('Link removed.');
}

/* ==========================================================================
   VIEWS
   ========================================================================== */
const ICON = {
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  heart: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
};
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

const VIEW_TITLES = { who: 'Who’s out', grid: 'Attendance', people: 'People', activity: 'Activity', health: 'Data health', reports: 'Reports' };
const SCOPE_LABELS = { all: 'Everyone in the tracker', active: 'Current workforce (Active, Resign, Projected, Bench, Manager, New)', roster: 'In the Team roster (any status)', unmatched: 'Not found in the Team roster' };

/* ---------- render shell ---------- */
function render() {
  const root = ROOT && $('#app'); if (!root) return;
  if (!active()) { S.stale = true; return; }
  S.stale = false; S.sig = curSig();
  if (S.status !== 'ready' || !S.ctx || S.picking) { root.innerHTML = gateHtml(); root.dataset.mode = ''; return; }
  const view = viewOf(), gw = $('.gridwrap'); const keep = { y: window.scrollY, gl: gw?.scrollLeft || 0, gt: gw?.scrollTop || 0, view: $('#view')?.dataset.v };
  if (!$('#view') || root.dataset.mode !== S.mode) { root.innerHTML = shellHtml(); root.dataset.mode = S.mode; }
  updateChrome();
  const v = $('#view'); v.dataset.v = view; v.innerHTML = D().rows.length ? VIEWS[view]() : emptyScopeHtml();
  if(S.mode==='reports'){window.installAttendanceReportCopies?.();const sc=$('.tl-scroll');if(sc){if(render.tlKey===sc.dataset.key&&render.tlLeft!=null)sc.scrollLeft=render.tlLeft;else{const tl=sc.querySelector('line[stroke-dasharray]');sc.scrollLeft=tl?Math.max(0,+tl.getAttribute('x1')-sc.clientWidth*0.7):sc.scrollWidth;}render.tlKey=sc.dataset.key;render.tlLeft=sc.scrollLeft;sc.addEventListener('scroll',()=>{render.tlLeft=sc.scrollLeft;},{passive:true});}}
  if (keep.view === view) { const g = $('.gridwrap'); if (g) { g.scrollLeft = keep.gl; g.scrollTop = keep.gt; } if (S.mode === 'app') window.scrollTo(0, keep.y); } else if (S.mode === 'app') window.scrollTo(0, 0);
  if (view === 'grid' && S.ui.scrollToday) { S.ui.scrollToday = false; const t = $('.gridwrap th.tdy'); const g = $('.gridwrap'); if (t && g) g.scrollLeft = Math.max(0, t.offsetLeft - 260); }
}
const fileSize = n => (n / 1024 / 1024 >= 1 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
function gateHtml() {
  const wrap = inner => `<div class="welcome">${inner}</div>`;
  if (S.status === 'loading') return wrap(`<div class="card gate"><h2>Looking for the attendance workbook…</h2><p>Checking the Excel files in “${esc(S.folder)}”.</p></div>`);
  if (S.status === 'reconnect') return wrap(`<div class="card gate"><h2>Reconnect to ${esc(S.extName || 'the attendance workbook')}</h2><p>The browser needs your permission again before it can read and save this file.</p><button class="btn primary" data-act="reconnect">Reconnect</button> <button class="btn" data-act="change-file">Choose another file</button></div>`);
  if (S.status === 'error') return wrap(`<div class="card gate"><h2>The attendance workbook could not be opened</h2><p class="err">${esc(S.msg)}</p><button class="btn primary" data-act="retry">Try again</button> <button class="btn" data-act="change-file">Choose another file</button></div>`);
  if (S.status === 'idle') return wrap(`<div class="card gate"><h2>Connect both workbooks first</h2><p>Use Linked files to select both workbooks together.</p></div>`);
  const files = S.candidates, wf = BE.fileName();
  return wrap(`<div class="card gate"><h2>${S.ctx ? 'Choose the attendance file' : 'Choose your attendance file'}</h2>
    <p>Two workbooks power this dashboard: the <b>workforce file</b> (${esc(wf || 'already open')}) supplies the employees, and the <b>attendance file</b> is where days and leave are recorded. Pick the attendance file from anywhere on this computer. The dashboard remembers it, reads employee names, IDs and details from the workforce file, and saves changes back into the attendance file.</p>
    <button class="btn primary" data-act="browse" style="font-size:15px;padding:9px 18px">${ic('folder')} Choose attendance file…</button>${S.ctx ? ' <button class="btn ghost" data-act="cancel-pick">Cancel</button>' : ''}
    ${files.length ? `<p class="sm muted" style="margin:18px 0 6px">…or use a workbook from the workforce folder “${esc(S.folder)}”:</p><div class="filelist">${files.map(f => `<button class="fileopt" data-act="use-file" data-n="${esc(f.name)}"><span>${ic('file')} ${esc(f.name)}</span><small>${fileSize(f.size)}</small></button>`).join('')}</div>` : ''}
    <p class="sm muted" style="margin-top:14px">Only the “Attendance Tracker” sheet is touched. Pivots, the data model and other sheets stay exactly as they are. Backups stay in browser private storage.</p></div>`);
}
function emptyScopeHtml() {
  if (!S.rows.length) return `<div class="card"><div class="empty"><b>The attendance file is empty.</b><br>${hasRoster() ? 'Start a month to create one row per employee from the workforce file, then click any day to mark leave.' : 'Add your employees first (Employees tab → + Add employee), then come back and start a month.'}<br><button class="btn primary" style="margin-top:10px" data-act="new-month" ${hasRoster() ? '' : 'disabled'}>Start a month</button></div></div>`;
  return `<div class="card"><div class="empty">Nobody in the attendance tracker matches the status boxes and filters at the top (${esc(hostSummary())}).<br><button class="btn" style="margin-top:10px" data-act="scope-all">Back to Active + New</button></div></div>`;
}
function scopeCounts() {
  const key = S.ver + '|' + rosterVer() + '|' + rosterRows().length; if (scopeCounts.c && scopeCounts.c.key === key) return scopeCounts.c;
  const c = { key, all: 0, active: 0, roster: 0, unmatched: 0 };
  for (const p of D(true).people.values()) { c.all++; const m = rosterOfPerson(p); if (!m) c.unmatched++; else { c.roster++; if (isTracked(m.row)) c.active++; } }
  return scopeCounts.c = c;
}
function shellHtml() {
  if (S.mode === 'reports') return `<div id="view"></div>`;
  const tab = (id, icon, label, extra = '') => `<button class="tab" data-act="nav" data-v="${id}">${ic(icon)}<span>${label}</span>${extra}</button>`;
  const left = S.mode === 'health' ? `<h2 style="margin:0;font-size:16px">Attendance data health</h2>` : `<nav class="subnav" aria-label="Attendance sections">${can('att.who') ? tab('who', 'clock', 'Who’s out') : ''}${can('att.grid') ? tab('grid', 'grid', 'Attendance') + tab('people', 'users', 'People') : ''}</nav>`;
  return `<div class="topbar">
      ${left}
      <span class="grow"></span>
      ${can('att.fields') || attFieldNames().length ? `<button class="btn" data-act="att-fields" id="btnAttFields" title="Extra fields in the attendance tracker (columns after AM)">${ic('plus')} Fields</button>` : ''}
      <button class="btn" data-act="undo" id="btnUndo">${ic('undo')} Undo</button>
      <button class="btn ghost syncbtn" data-act="sync-panel" id="btnSync" title="Save to Excel, file connections and shared-copy status">${ic('save')} <span id="syncBtnText">Save &amp; sync</span></button>
    </div>
    <div class="fileline" id="fileline"></div>
    <div id="view"></div>`;
}
function updateChrome() {
  if (S.mode === 'reports') return;
  $$('.subnav .tab[data-v]').forEach(b => { if (b.dataset.v === viewOf()) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  const n = S.changes.length;
  $('#btnUndo').disabled = !S.undo.length;
  const sb = $('#btnSync');
  if (sb) {
    const cls = S.saving ? 's-busy' : n ? 's-dirty' : (S.diskChanged || (S.auto && S.autoErr)) ? 's-warn' : 's-ok';
    const txt = S.saving ? 'Saving…' : n ? `${n} unsaved change${n > 1 ? 's' : ''}${S.auto ? '' : ' · auto-sync off'}` : S.diskChanged ? (BE.isCloud() ? 'Changed by someone else' : 'File changed in Excel') : S.autoErr ? 'Sync needs you' : 'All changes saved';
    sb.className = 'btn ghost syncbtn ' + cls; $('#syncBtnText', sb).textContent = txt;
  }
  const d = D(true); const sc = scopeCounts();
  $('#fileline').innerHTML = `${S.diskChanged ? `<span class="pill dirty">${BE.isCloud() ? 'Someone else changed attendance' : 'File changed in Excel'}</span><button class="btn sm" data-act="reload">Load latest (discards your unsaved edits)</button><button class="btn sm" data-act="save">Save and choose</button>` : ''}<span class="sm muted num">${S.rows.length.toLocaleString()} rows · ${d.people.size} people${d.months.length ? ' · ' + monthLabel(d.months[0]) + ' – ' + monthLabel(d.latestMonth) : ' · no months yet'}</span><span class="grow"></span>${S.mode === 'app' ? `<span class="filechip" title="Change this with the status boxes and filters at the top of the page (they work on every page)">Showing: ${esc(hostSummary())} · ${D().people.size} people</span>` : ''}${S.mode === 'app' && hasRoster() && sc.unmatched ? `<button class="btn sm ${S.ui.showUnmatched ? 'on' : ''}" data-act="toggle-unmatched" title="People in the tracker who are not in the workforce file have no status, so they are hidden unless you include them">${S.ui.showUnmatched ? 'Hide' : 'Include'} not in workforce (${sc.unmatched})</button>` : ''}`;
  try { for (const v of ['attendance', 'actions']) document.querySelector(`.tab[data-view="${v}"]`)?.classList.toggle('dirty', n > 0); } catch { }
}

/* ---------- shared bits ---------- */
const impliedChip = (ms, i, row) => {
  if (row && !trackedOn(row, i)) return `<div class="chip implied gone" title="Not tracked: ${departure(row).kind === 'left' ? 'left the team' : 'moved out of the team'}">·</div>`;
  const c = impliedCode(ms, i); return `<div class="chip implied ${c === 'WO' ? 'wo' : 'p'}" title="${c === 'WO' ? 'Week off (Saturday / Sunday)' : 'Present (blank means present)'}">${c}</div>`; };
const rowRoster = r => { const m = rosterMatch(r.empId, r.name); return m ? m.row : null; };
const chip = (v, extra = '') => `<div class="chip cat-${catOf(v)} ${extra}">${esc(String(v).trim() || String(v))}</div>`;
function periodRows() {
  const p = S.ui.period; let rows;
  if (p === 'all') rows = D().rows; else if (p.startsWith('y:')) rows = D().rows.filter(r => monthYear(r.month) === +p.slice(2)); else rows = D().byMonth.get(+p.slice(2)) || [];
  return S.ui.client === 'all' ? rows : rows.filter(r => clientGroup(r.client) === S.ui.client);
}
function periodLabel() { const p = S.ui.period; return p === 'all' ? 'All time' : p.startsWith('y:') ? 'Year ' + p.slice(2) : monthLabel(+p.slice(2)); }
function monthOptions(sel, withPeriods) {
  const d = D(); let h = '';
  if (withPeriods) { h += `<option value="all"${sel === 'all' ? ' selected' : ''}>All time</option>`; [...new Set(d.months.map(monthYear))].sort((a, b) => b - a).forEach(y => h += `<option value="y:${y}"${sel === 'y:' + y ? ' selected' : ''}>Year ${y}</option>`); }
  [...d.months].reverse().forEach(m => h += `<option value="${withPeriods ? 'm:' : ''}${m}"${(withPeriods ? 'm:' + m : String(m)) === String(sel) ? ' selected' : ''}>${monthLabel(m)}</option>`);
  return h;
}
const clientOptions = sel => `<option value="all">All client groups</option>` + D().clients.map(c => `<option${c === sel ? ' selected' : ''}>${esc(c)}</option>`).join('');
function gridYearOptions(selMs) {
  const years = new Set(D().months.map(monthYear));
  years.add(TODAY.getUTCFullYear()); years.add(monthYear(selMs));
  return [...years].sort((a, b) => b - a).map(y => `<option value="${y}"${y === monthYear(selMs) ? ' selected' : ''}>${y}</option>`).join('');
}
function gridMonthOptions(selMs) {
  const y = monthYear(selMs);
  return MONTHS.map((nm, i) => { const ms = Engine.monthSerial(y, i); return `<option value="${ms}"${ms === selMs ? ' selected' : ''}>${nm}</option>`; }).join('');
}
function niceMax4(v) { for (const s of [1, 2, 3, 4, 5, 8, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500, 1000]) if (s * 4 >= v) return s * 4; return Math.ceil(v / 4) * 4; }
function niceMax(v) { if (v <= 0) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p; return 10 * p; }
function hbars(items, { link = false, reportKind = '', color = 'var(--blue)', unit = '' } = {}) {
  if (!items.length) return '<div class="empty">Nothing to show for this selection.</div>';
  const max = Math.max(...items.map(i => i.v), 0.0001);
  const total=items.reduce((a,i)=>a+i.v,0);
  return items.map(i => `<div class="hbar${link ? ' link' : ''}" ${S.mode==='reports' && (reportKind||link) ? `role="button" tabindex="0" data-act="report-select" data-kind="${reportKind||'person'}" data-value="${esc(reportKind?i.label:i.k)}" style="cursor:pointer"` : link ? `data-act="person" data-k="${esc(i.k)}"` : ''} data-tip="${esc((i.tip || i.label + ': ' + fmt(i.v)) + ' · ' + (total ? (i.v/total*100).toFixed(1) : '0.0') + '% of total shown')}"><span class="nm">${esc(i.label)}</span><span class="trk"><span class="fill" style="width:${(i.v / max * 100).toFixed(1)}%;background:${color}"></span></span><span class="v num">${fmt(i.v)}${unit}</span></div>`).join('');
}
const SERIES = [
  { k: 'approved', name: 'Approved (AL, CL)', c: 'var(--blue)', f: s => s.approved },
  { k: 'unpl', name: 'Unplanned / absent (UL, AB)', c: 'var(--orange)', f: s => s.unpl },
  { k: 'sick', name: 'Sick (SL)', c: 'var(--aqua)', f: s => s.sick },
  { k: 'half', name: 'Half days (HD1, HD2 = 0.5)', c: 'var(--yellow)', f: s => s.half * 0.5 },
];
/* stacked columns per month, from any list of {month, rows} */
function stackChart(series, { selectable = false, sel = null, height = 240 } = {}) {
  if (!series.length) return '<div class="empty">No data.</div>';
  const W = Math.max(640,series.length*65), H = height, l = 34, r = 6, t = 28, b = 38, n = series.length;
  const vals = series.map(m => SERIES.map(s => m.rows.reduce((a, x) => a + s.f(rowStats(x)), 0)));
  const grandTotal=vals.flat().reduce((a,v)=>a+v,0);
  const max = niceMax4(Math.max(...vals.map(v => v.reduce((a, b) => a + b, 0)), 1)); const band = (W - l - r) / n, bw = Math.min(band * 0.64, 34);
  const y = v => t + (H - t - b) * (1 - v / max);
  let g = '', bars = '', xl = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4; g += `<line class="grid" x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
  series.forEach((m, i) => {
    const x0 = l + band * i + (band - bw) / 2; let acc = 0; const tot = vals[i].reduce((a, b) => a + b, 0);
    const tip = `<b>${monthLabel(m.month)}</b><br>` + SERIES.map((s, j) => `${s.name}: ${fmt(vals[i][j])}`).join('<br>') + `<br><b>Total ${fmt(tot)}</b> (${grandTotal?(tot/grandTotal*100).toFixed(1):"0.0"}% of leave days shown) · ${new Set(m.rows.map(r => personKey(r.name))).size} people`;
    const hit = `<rect class="hit" x="${l + band * i}" y="${t}" width="${band}" height="${H - t - b}" data-tip="${esc(tip)}" ${selectable ? `data-act="pick-month" data-m="${m.month}" role="button" tabindex="0" aria-label="Select ${monthLabel(m.month)}" style="cursor:pointer"` : ''}/>`;
    let segs = ''; SERIES.forEach((s, j) => { const v = vals[i][j]; if (v <= 0) return; const h = y(acc) - y(acc + v); segs += `<rect x="${x0}" y="${y(acc + v)}" width="${bw}" height="${Math.max(h, 1)}" rx="2" fill="${s.c}" stroke="var(--surface)" stroke-width="2" pointer-events="none"/>`; acc += v; });
    if (tot > 0) segs += `<text class="dlbl" x="${x0 + bw / 2}" y="${y(tot) - 5}" text-anchor="middle">${fmt(tot)}</text>`;   // v3.14: total on top of every bar
    bars += segs + hit;
    const isSel = sel === m.month; const jan = monthShort(m.month) === 'Jan' || i === 0;
    xl += `<text x="${x0 + bw / 2}" y="${H - b + 14}" text-anchor="middle" ${isSel ? 'style="fill:var(--ink);font-weight:700"' : ''}>${monthShort(m.month)}</text>` + (jan ? `<text x="${x0 + bw / 2}" y="${H - b + 26}" text-anchor="middle">${monthYear(m.month)}</text>` : '') + (isSel ? `<rect x="${x0}" y="${H - b + 30}" width="${bw}" height="3" rx="1.5" fill="var(--accent)"/>` : '');
  });
  return `<div class="legend">${SERIES.map(s => `<span><i style="background:${s.c}"></i>${s.name}</span>`).join('')}</div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Leave days per month, stacked by type">${g}${bars}${xl}</svg>`;
}
function dailyChart(month, rows) {
  const dim = Engine.daysInMonth(month), W = 640, H = 190, l = 28, r = 6, t = 24, b = 34; const band = (W - l - r) / dim, bw = Math.min(band * .66, 16);
  const cnt = [], who = [];
  for (let i = 0; i < dim; i++) { const names = rows.filter(x => isLeaveCode(x.days[i])).map(x => x.name.trim()); cnt.push(names.length); who.push(names); }
  const max = niceMax4(Math.max(...cnt, 1)); const y = v => t + (H - t - b) * (1 - v / max); let g = '', bars = '', xl = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4; g += `<line class="grid" x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
  for (let i = 0; i < dim; i++) {
    const x0 = l + band * i + (band - bw) / 2, w = dow(month, i), wk = w === 0 || w === 6, isT = month === TODAY_MS && i === TODAY_IDX;
    const tip = `<b>${longDate(dateOf(month, i))}</b><br>${cnt[i]} out (${rows.length?(cnt[i]/rows.length*100).toFixed(1):"0.0"}% of tracked rows)${who[i].length ? '<br>' + who[i].slice(0, 10).map(esc).join('<br>') + (who[i].length > 10 ? `<br>+${who[i].length - 10} more` : '') : ''}`;
    if (cnt[i]) bars += `<text class="dlbl" x="${x0 + bw / 2}" y="${y(cnt[i]) - 4}" text-anchor="middle" style="font-size:${band >= 18 ? 10 : 8}px">${cnt[i]}</text>`;
    bars += `<rect x="${x0}" y="${y(cnt[i])}" width="${bw}" height="${Math.max(y(0) - y(cnt[i]), cnt[i] ? 1 : 0)}" rx="2" fill="${wk ? 'var(--gray)' : 'var(--blue)'}" ${isT ? 'stroke="var(--ink)" stroke-width="1.5"' : ''} pointer-events="none"/><rect class="hit" x="${l + band * i}" y="${t}" width="${band}" height="${H - t - b}" data-tip="${esc(tip)}" ${S.mode==='reports' ? `data-act="report-select" data-kind="day" data-value="${month}:${i}" role="button" tabindex="0" aria-label="Select people out on ${longDate(dateOf(month,i))}" style="cursor:pointer"` : ''}/>`;

    if (dim <= 31 && (i % 2 === 0 || band > 20)) xl += `<text x="${x0 + bw / 2}" y="${H - b + 13}" text-anchor="middle" ${isT ? 'style="fill:var(--ink);font-weight:700"' : ''}>${i + 1}</text>`;
    xl += `<text x="${x0 + bw / 2}" y="${H - b + 25}" text-anchor="middle" style="font-size:9px${wk ? ';opacity:.6' : ''}">${WEEKDAYS[w][0]}</text>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="People out per day">${g}${bars}${xl}</svg><div class="sm muted" style="margin-top:4px">Hover over a bar for the percentage. Grey bars are weekends. Today is outlined.</div>`;
}

/* ---------- OVERVIEW ---------- */
window.resetAttendanceReport=()=>{S.ui.client='all';S.ui.period='all';};
function selectAttendanceReport(kind,value){
 if(state.view!=='reports')return;
 if(kind==='client'){
   S.ui.client='all';
   const rows=S.rows.filter(r=>clientGroup(r.client)===value).map(rowRoster).filter(Boolean);
   reportCohort('Client group: '+value,rows);return;
 }
 let rows=S.rows,label=value;
 if(kind==='person'){rows=rows.filter(r=>personKey(r.name)===value);label='Employee: '+(rows[0]?.name||value);}
 if(kind==='period'){
   S.ui.period=value;
   if(value==='all'){reportScope.cohort=null;reportScope.label='';reportChanged();return;}
   rows=rows.filter(r=>value.startsWith('y:')?monthYear(r.month)===+value.slice(2):r.month===+value.slice(2));label='Attendance period: '+periodLabel();
 }
 if(kind==='metric'){
   rows=periodRows();label=value;
   if(value==='LEAVE DAYS')rows=rows.filter(r=>rowStats(r).total>0);
   if(value==='UNPLANNED / ABSENT')rows=rows.filter(r=>rowStats(r).unpl>0);
   if(value==='AWAITING APPROVAL (LA)')rows=rows.filter(r=>rowStats(r).applied>0);
   if(value==='LATE / CAB LATE')rows=rows.filter(r=>rowStats(r).late>0);
   if(value==='OUT TODAY')rows=S.rows.filter(r=>r.month===TODAY_MS&&isLeaveCode(r.days[TODAY_IDX]));
 }
 if(kind==='mix'){const spec=SERIES.find(s=>s.name===value);rows=periodRows().filter(r=>spec&&spec.f(rowStats(r))>0);label='Leave type: '+value;}
 if(kind==='tl'){const bk=tlBuckets[+value];if(!bk)return;const u=tlUi();reportCohort('Timeline: '+(u.by==='day'?'out on '+longDate(bk.start):longDate(bk.start)+' – '+longDate(bk.end)),[...bk.people].map(rowRoster).filter(Boolean));return;}
 if(kind==='day'){const [m,i]=value.split(':').map(Number);rows=rows.filter(r=>r.month===m&&isLeaveCode(r.days[i]));label='Out on '+longDate(dateOf(m,i));}
 reportCohort(label,rows.map(rowRoster).filter(Boolean));
}

/* Attendance timeline with its own filters: date range, leave types, grouping, weekends, one employee. */
const TL_SERIES = [
  { k: 'approved', name: 'Approved (AL, CL)', short: 'Approved', c: 'var(--blue)', codes: ['AL', 'CL'] },
  { k: 'unpl', name: 'Unplanned / absent (UL, AB)', short: 'Unplanned', c: 'var(--orange)', codes: ['UL', 'AB'] },
  { k: 'sick', name: 'Sick (SL)', short: 'Sick', c: 'var(--aqua)', codes: ['SL'] },
  { k: 'half', name: 'Half day (HD1, HD2)', short: 'Half day', c: 'var(--yellow)', codes: ['HD1', 'HD2'] },
  { k: 'la', name: 'Pending application (LA)', short: 'Pending (LA)', c: 'var(--c-violet, #4a3aa7)', codes: ['LA'] },
  { k: 'late', name: 'Late / cab late (L, C)', short: 'Late', c: 'var(--c-magenta, #e87ba4)', codes: ['L', 'C'] },
  { k: 'remote', name: 'Remote (R)', short: 'Remote', c: 'var(--c-green, #008300)', codes: ['R'] },
];
const TL_DEFAULT = () => ({ range: 'period', from: '', to: '', kinds: ['approved', 'unpl', 'sick', 'half'], by: 'day', hideWk: false, q: '' });
const TL_RANGES = { period: 'Report period', last7: 'Last 7 days', last30: 'Last 30 days', last90: 'Last 90 days', month: 'This month', next30: 'Next 30 days', custom: 'Custom dates…' };
let tlBuckets = [];
const tlUi = () => S.ui.tl || (S.ui.tl = TL_DEFAULT());
const isoToDate = iso => { const d = new Date(iso + 'T00:00:00Z'); return isNaN(d) ? null : d; };
function tlRange(periodRowsList) {
  const u = tlUi(), day = 86400000, T = TODAY.getTime();
  if (u.range === 'last7') return [new Date(T - 6 * day), TODAY];
  if (u.range === 'last30') return [new Date(T - 29 * day), TODAY];
  if (u.range === 'last90') return [new Date(T - 89 * day), TODAY];
  if (u.range === 'next30') return [TODAY, new Date(T + 29 * day)];
  if (u.range === 'month') return [dateOf(TODAY_MS, 0), dateOf(TODAY_MS, Engine.daysInMonth(TODAY_MS) - 1)];
  if (u.range === 'custom') { let a = isoToDate(u.from), b = isoToDate(u.to); if (a && b) { if (a > b) [a, b] = [b, a]; return [a, b]; } }
  const ms = [...new Set(periodRowsList.map(r => r.month))].sort((x, y) => x - y);
  if (!ms.length) return null;
  return [dateOf(ms[0], 0), dateOf(ms[ms.length - 1], Engine.daysInMonth(ms[ms.length - 1]) - 1)];
}
function tlRows() {
  const u = tlUi(), q = (u.q || '').trim().toLowerCase();
  let rows = D().rows; if (S.ui.client !== 'all') rows = rows.filter(r => clientGroup(r.client) === S.ui.client);
  if (q) rows = rows.filter(r => (r.name + ' ' + (r.empId ?? '')).toLowerCase().includes(q));
  return rows;
}
function attTimelineData(periodRowsList) {
  const u = tlUi(), range = tlRange(periodRowsList); if (!range) return { buckets: [], range: null };
  const rows = tlRows(), byMonth = new Map(); for (const r of rows) { if (!byMonth.has(r.month)) byMonth.set(r.month, []); byMonth.get(r.month).push(r); }
  const series = TL_SERIES.filter(s => u.kinds.includes(s.k)), buckets = [], index = new Map();
  const [from, to] = range, maxDays = 800;
  for (let t = from.getTime(), n = 0; t <= to.getTime() && n < maxDays; t += 86400000, n++) {
    const dt = new Date(t), w = dt.getUTCDay(), wk = w === 0 || w === 6; if (u.hideWk && wk) continue;
    const ms = Engine.monthSerial(dt.getUTCFullYear(), dt.getUTCMonth()), i = dt.getUTCDate() - 1, mr = byMonth.get(ms) || [];
    let key, label, start = dt;
    if (u.by === 'week') { const back = (w + 6) % 7; start = new Date(t - back * 86400000); key = isoDate(start); label = start.getUTCDate() + ' ' + MONTHS[start.getUTCMonth()]; }
    else if (u.by === 'month') { key = 'm' + ms; start = dateOf(ms, 0); label = MONTHS[dt.getUTCMonth()] + ' ' + String(dt.getUTCFullYear()).slice(2); }
    else { key = isoDate(dt); label = String(i + 1); }
    let b = index.get(key);
    if (!b) { b = { key, label, start, end: dt, c: series.map(() => 0), names: new Map(), people: new Set(), tracked: 0, wk, future: true, today: false, days: 0, ms, i }; index.set(key, b); buckets.push(b); }
    b.end = dt; b.days++; b.tracked = Math.max(b.tracked, mr.length);
    if (!(dt > TODAY)) b.future = false; if (dt.getTime() === TODAY.getTime()) b.today = true;
    for (const r of mr) {
      const v = up(String(r.days[i] ?? '').trim()), j = series.findIndex(s => s.codes.includes(v)); if (j < 0) continue;
      b.c[j]++; const nm = r.name.trim(); b.names.set(nm, (b.names.get(nm) || 0) + 1); b.people.add(r);
    }
  }
  buckets.forEach(b => b.total = b.c.reduce((a, x) => a + x, 0));
  return { buckets, range, series };
}
function tlFilterBar(range) {
  const u = tlUi(), chip = s => `<button class="lf" data-act="tl-kind" data-k="${s.k}" aria-pressed="${u.kinds.includes(s.k)}"><i class="tl-dot" style="background:${s.c}"></i>${esc(s.short)}</button>`;
  const seg = ['day', 'week', 'month'].map(v => `<button data-act="tl-by" data-v="${v}" aria-pressed="${u.by === v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('');
  const custom = u.range === 'custom' ? `<input type="date" data-bind="tl-from" value="${esc(u.from || (range ? isoDate(range[0]) : ''))}" aria-label="From date"><span class="sm muted">to</span><input type="date" data-bind="tl-to" value="${esc(u.to || (range ? isoDate(range[1]) : ''))}" aria-label="To date">` : '';
  const changed = JSON.stringify({ ...u }) !== JSON.stringify(TL_DEFAULT());
  return `<div class="tl-filters">
      <label class="sm muted">Dates <select data-bind="tl-range">${Object.entries(TL_RANGES).map(([k, l]) => `<option value="${k}"${u.range === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>${custom}
      <span class="sm muted">Group by</span><div class="seg" role="group" aria-label="Group bars by">${seg}</div>
      <label class="sm muted tl-chk"><input type="checkbox" data-bind="tl-wk" ${u.hideWk ? 'checked' : ''}> Hide weekends</label>
      <input type="search" data-bind="tlq" placeholder="Employee name or ID" value="${esc(u.q || '')}" style="width:190px" aria-label="Show one employee">
      ${changed ? '<button class="btn sm" data-act="tl-reset">Reset filters</button>' : ''}
    </div>
    <div class="tl-filters" role="group" aria-label="Leave types to show"><span class="sm muted">Show</span>${TL_SERIES.map(chip).join('')}</div>`;
}
function attTimelineCard(periodRowsList) {
  const u = tlUi(), { buckets, range, series } = attTimelineData(periodRowsList); tlBuckets = buckets;
  const head = `<div style="display:flex;gap:12px;align-items:baseline;flex-wrap:wrap"><h2 style="margin:0">Attendance timeline</h2><span class="grow"></span><span class="sm muted" id="tlSummary"></span></div>`;
  const unitDay = u.by === 'day';
  const sub = `<div class="sub">${range ? esc(longDate(range[0]) + ' – ' + longDate(range[1])) + ' · ' : ''}${unitDay ? 'People out each day' : 'Days taken per ' + u.by + ' (one person out one day = 1)'}, by type${u.q ? ' · employee “' + esc(u.q) + '”' : ''}. Hover a bar for names, click it to filter all reports.</div>`;
  window.attendanceTimelineExport = null;
  if (!buckets.length || !series.length) return `<div class="card" style="margin-bottom:14px">${head}${sub}${tlFilterBar(range)}<div class="empty">${!series.length ? 'Pick at least one type to show.' : 'No attendance rows for these dates.'}</div></div>`;
  const step = u.by === 'month' ? 44 : u.by === 'week' ? 26 : buckets.length > 200 ? 7 : buckets.length > 70 ? 9 : buckets.length > 35 ? 14 : 20;
  const bw = Math.max(4, Math.round(step * 0.68)), l = 34, r = 12, t = 22, b = 40, H = 228;
  const lblSize = step >= 20 ? 10 : step >= 14 ? 9 : step >= 9 ? 7.5 : 6;
  const W = l + r + buckets.length * step, max = niceMax4(Math.max(1, ...buckets.map(x => x.total)));
  const y = v => t + (H - t - b) * (1 - v / max);
  let g = '', bars = '', xl = '', todayX = null, prevM = null, lastMX = -1e9;
  for (let k = 0; k <= 4; k++) { const v = max * k / 4; g += `<line class="grid" x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
  buckets.forEach((bk, n) => {
    const x = l + n * step;
    if (unitDay && bk.wk) bars += `<rect x="${x}" y="${t}" width="${step}" height="${H - t - b}" fill="var(--line)" opacity=".45" pointer-events="none"/>`;
    let acc = 0; bk.c.forEach((v, j) => { if (!v) return; const hh = y(acc) - y(acc + v); bars += `<rect x="${x + (step - bw) / 2}" y="${y(acc + v)}" width="${bw}" height="${Math.max(hh, 1)}" rx="1.5" fill="${series[j].c}" ${bk.future ? 'opacity=".45"' : ''} pointer-events="none"/>`; acc += v; });
    if (bk.total) bars += `<text class="dlbl" x="${x + step / 2}" y="${y(bk.total) - 4}" text-anchor="middle" style="font-size:${lblSize}px">${bk.total}</text>`;
    const when = unitDay ? longDate(bk.start) : longDate(bk.start) + ' – ' + longDate(bk.end);
    const names = [...bk.names.entries()].sort((a, c) => c[1] - a[1] || a[0].localeCompare(c[0]));
    const tip = `<b>${esc(when)}</b>${bk.today && unitDay ? ' (today)' : bk.future ? ' (planned)' : ''}<br>` + (unitDay ? `${bk.total} out of ${bk.tracked} tracked (${bk.tracked ? (bk.total / bk.tracked * 100).toFixed(1) : '0.0'}%)` : `${bk.total} days · ${bk.people.size} people`)
      + series.map((s, j) => bk.c[j] ? `<br>${esc(s.name)}: ${bk.c[j]}` : '').join('') + (names.length ? '<br>' + names.slice(0, 8).map(([nm, c]) => esc(nm) + (unitDay ? '' : ' ×' + c)).join('<br>') + (names.length > 8 ? `<br>+${names.length - 8} more` : '') : '') + (bk.total ? '<br><i>Click to filter reports to these people</i>' : '');
    bars += `<rect class="hit" x="${x}" y="${t}" width="${step}" height="${H - t - b}" data-tip="${esc(tip)}" ${bk.total ? `data-act="report-select" data-kind="tl" data-value="${n}" role="button" tabindex="0" aria-label="${esc(when)}: ${bk.total}" style="cursor:pointer"` : ''}/>`;
    if (bk.today) todayX = x + step / 2;
    const m = Engine.monthSerial(bk.start.getUTCFullYear(), bk.start.getUTCMonth());
    if (u.by !== 'month' && m !== prevM && prevM !== null && x - lastMX < 62) { prevM = m; }
    if (u.by !== 'month' && m !== prevM) { lastMX = x; xl += `<line x1="${x}" x2="${x}" y1="${t}" y2="${H - b + 26}" stroke="var(--line-2)" stroke-width="1"/><text x="${x + 3}" y="${H - b + 26}" style="font-weight:650;fill:var(--ink-2)">${MONTHS[bk.start.getUTCMonth()]} ${bk.start.getUTCFullYear()}</text>`; prevM = m; }
    const every = u.by !== 'day' || step >= 14 ? 1 : step >= 9 ? 3 : 7;
    const dayNum = bk.start.getUTCDate();
    if (u.by !== 'day' || dayNum % every === 0 || dayNum === 1) xl += `<text x="${x + step / 2}" y="${H - b + 12}" text-anchor="middle" style="font-size:9.5px${bk.today ? ';fill:var(--ink);font-weight:700' : ''}">${esc(u.by === 'week' ? String(dayNum) : bk.label)}</text>`;
  });
  if (todayX != null) xl += `<line x1="${todayX}" x2="${todayX}" y1="${t - 4}" y2="${H - b}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="3 3" pointer-events="none"/><text x="${todayX + 4}" y="${t + 4}" style="font-size:10px;font-weight:700;fill:var(--ink)">Today</text>`;
  const past = buckets.filter(x => !x.future && !(unitDay && x.wk)), avg = past.length ? past.reduce((a, x) => a + x.total, 0) / past.length : 0, peak = past.reduce((p, x) => (!p || x.total > p.total ? x : p), null);
  const people = new Set(); buckets.forEach(bk => bk.people.forEach(r => people.add(personKey(r.name))));
  const unitName = unitDay ? 'working day' : u.by;
  const summary = past.length ? `Average <b>${fmt(Math.round(avg * 10) / 10)}</b> per ${unitName} · <b>${people.size}</b> people in total` + (peak && peak.total ? ` · busiest <b>${esc(unitDay ? longDate(peak.start) : peak.label)}</b> (${peak.total})` : '') : `<b>${people.size}</b> people in total`;
  window.attendanceTimelineExport = { title: 'Attendance timeline · ' + (range ? isoDate(range[0]) + ' to ' + isoDate(range[1]) : ''), headers: [unitDay ? 'Date' : u.by === 'week' ? 'Week starting' : 'Month', ...series.map(s => s.name), 'Total', 'People'], rows: buckets.map(bk => [u.by === 'month' ? bk.label : isoDate(bk.start), ...bk.c, bk.total, bk.people.size]) };
  return `<div class="card" style="margin-bottom:14px">${head.replace('<span class="sm muted" id="tlSummary"></span>', `<span class="sm muted">${summary}</span>`)}${sub}${tlFilterBar(range)}
    ${asTables() ? rtable(window.attendanceTimelineExport, ['People']) : `<div class="tl-scroll" data-key="${esc(u.range + u.from + u.to + u.by + u.hideWk)}" style="overflow-x:auto;overflow-y:hidden;padding-bottom:4px"><svg class="chart tl" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="width:${W}px;max-width:none;min-width:${W}px" role="img" aria-label="Attendance timeline">${g}${bars}${xl}</svg></div>`}</div>`;
}
/* v3.14: one switch on the Reports page shows every chart as its table */
const asTables = () => { try { return !!window.REPORT_TABLES; } catch { return false; } };
function rtable(exp, noSum = []) {
  if (!exp || !exp.rows || !exp.rows.length) return '<div class="empty">No data for this selection.</div>';
  const num = v => typeof v === 'number' && Number.isFinite(v);
  const cols = exp.headers.map((hd, j) => j > 0 && exp.rows.every(r => r[j] == null || r[j] === '' || num(r[j])));
  const sums = exp.headers.map((hd, j) => cols[j] && !noSum.includes(hd) ? exp.rows.reduce((a, r) => a + (num(r[j]) ? r[j] : 0), 0) : null);
  const cell = (v, j) => `<td class="${cols[j] ? 'n' : ''}">${num(v) ? fmt(v) : esc(v ?? '')}</td>`;
  return `<div class="rtab-wrap"><table class="rtab"><thead><tr>${exp.headers.map((hd, j) => `<th class="${cols[j] ? 'n' : ''}">${esc(hd)}</th>`).join('')}</tr></thead><tbody>${exp.rows.map(r => `<tr>${r.map(cell).join('')}</tr>`).join('')}${exp.rows.length > 1 && sums.some(s => s != null) ? `<tr class="tot"><td>Total</td>${sums.slice(1).map((s, j) => `<td class="${cols[j + 1] ? 'n' : ''}">${s == null ? '' : fmt(s)}</td>`).join('')}</tr>` : ''}</tbody></table></div>`;
}
function reportsView() {
  const d = D(), rows = periodRows(), a = agg(rows), p = S.ui.period, isMonth = p.startsWith('m:');
  const timelineHtml = attTimelineCard(rows);
  const thr = S.ui.thr[isMonth ? 'month' : 'long'];
  let prev = null; if (isMonth) { const i = d.months.indexOf(+p.slice(2)); if (i > 0) { const pr = d.byMonth.get(d.months[i - 1]); prev = { a: agg(S.ui.client === 'all' ? pr : pr.filter(r => clientGroup(r.client) === S.ui.client)), label: monthLabel(d.months[i - 1]) }; } }
  const dl = (cur, old, label) => { if (!prev) return `<div class="delta">&nbsp;</div>`; const x = cur - old; const cls = x > 0 ? 'up' : x < 0 ? 'down' : ''; return `<div class="delta"><span class="${cls}">${x > 0 ? '▲' : x < 0 ? '▼' : '='} ${x > 0 ? '+' : ''}${fmt(x)}</span> vs ${prev.label.slice(0, 3)}</div>`; };
  const todayRows = (d.byMonth.get(TODAY_MS) || []).filter(r => S.ui.client === 'all' || clientGroup(r.client) === S.ui.client);
  const out = todayRows.filter(r => isLeaveCode(r.days[TODAY_IDX])), hasToday = todayRows.length > 0;
  const pending = pendingApplications();
  const tile = (lbl, val, sub, act = '') => `<div class="card tile click" role="button" tabindex="0" data-act="report-select" data-kind="metric" data-value="${esc(lbl)}"><div class="lbl">${lbl}</div><div class="val">${val}</div>${sub}</div>`;
  const tiles = [
    tile('PEOPLE TRACKED', a.headcount, `<div class="delta">${a.n} attendance rows</div>`),
    tile('LEAVE DAYS', fmt(a.total), dl(a.total, prev?.a.total)),
    tile('UNPLANNED / ABSENT', fmt(a.unpl), dl(a.unpl, prev?.a.unpl)),
    tile('AWAITING APPROVAL (LA)', a.applied, `<div class="delta">${pending.length} for days ahead · ${staleApplications().length} older never actioned</div>`, 'data-act="nav" data-v="who"'),
    tile('LATE / CAB LATE', a.late, dl(a.late, prev?.a.late)),
    tile('OUT TODAY', hasToday ? out.length : '–', `<div class="delta">${longDate(TODAY)}</div>`, 'data-act="nav" data-v="who"'),
  ].join('');

  const monthly = d.months.map(m => ({ month: m, rows: (d.byMonth.get(m) || []).filter(r => S.ui.client === 'all' || clientGroup(r.client) === S.ui.client) }));
  const byPerson = new Map(); rows.forEach(r => { const k = personKey(r.name); const o = byPerson.get(k) || { k, label: r.name.trim(), v: 0, u: 0, late: 0, la: 0 }; const s = rowStats(r); o.v += s.total; o.u += s.unpl; o.late += s.late; o.la += s.applied; byPerson.set(k, o); });
  const ppl = [...byPerson.values()];
  const top = ppl.filter(x => x.v > 0).sort((x, y) => y.v - x.v).slice(0, 10).map(x => ({ ...x, tip: `<b>${esc(x.label)}</b><br>${fmt(x.v)} leave days<br>${fmt(x.u)} unplanned · ${x.late} late` }));
  const byClient = new Map(); rows.forEach(r => { const g = clientGroup(r.client); const o = byClient.get(g) || { label: g, v: 0, people: new Set() }; o.v += rowStats(r).total; o.people.add(personKey(r.name)); byClient.set(g, o); });
  const cl = [...byClient.values()].filter(x => x.v > 0).sort((x, y) => y.v - x.v).slice(0, 9).map(x => ({ ...x, tip: `<b>${esc(x.label)}</b><br>${fmt(x.v)} leave days<br>${x.people.size} people · ${fmt(x.v / x.people.size)} per person` }));
  const flags = ppl.map(x => { const f = []; if (x.u >= thr.ul) f.push(['crit', `${fmt(x.u)} unplanned`]); if (x.v >= thr.total) f.push(['', `${fmt(x.v)} leave days`]); return { x, f }; }).filter(o => o.f.length).sort((a, b) => b.x.u - a.x.u || b.x.v - a.x.v);

  window.attendanceExportData=[
 ...(window.attendanceTimelineExport ? [window.attendanceTimelineExport] : []),
 {title:'Leave days by month',headers:['Month',...SERIES.map(s=>s.name),'Total'],rows:monthly.map(m=>{const v=SERIES.map(s=>m.rows.reduce((a,r)=>a+s.f(rowStats(r)),0));return [monthLabel(m.month),...v,v.reduce((a,b)=>a+b,0)];})},
 {title:'Most leave days · '+periodLabel(),headers:['Employee','Leave days','Unplanned','Late'],rows:top.map(x=>[x.label,x.v,x.u,x.late])},
 {title:'Leave days by client group',headers:['Client group','Leave days','People'],rows:cl.map(x=>[x.label,x.v,x.people.size])},
 {title:'Needs attention · '+periodLabel(),headers:['Employee','Unplanned','Leave days','Late','Applications'],rows:flags.map(o=>[o.x.label,o.x.u,o.x.v,o.x.late,o.x.la])}
 ];
 if(isMonth){const m=+p.slice(2);window.attendanceExportData.push({title:'People out each day · '+periodLabel(),headers:['Date','People out'],rows:Array.from({length:Engine.daysInMonth(m)},(_,i)=>[isoDate(dateOf(m,i)),rows.filter(r=>isLeaveCode(r.days[i])).length])});}
 else window.attendanceExportData.push({title:'Leave mix',headers:['Leave type','Days'],rows:SERIES.map(s=>[s.name,rows.reduce((a,r)=>a+s.f(rowStats(r)),0)])});
  const EX = pre => (window.attendanceExportData || []).find(x => x.title.startsWith(pre));
  const T = asTables();
  return `<div class="toolbar">
      <label>Period <select data-bind="period">${monthOptions(p, true)}</select></label>
      <label>Client group <select data-bind="oclient">${clientOptions(S.ui.client)}</select></label>
      <span class="grow"></span><span class="sm muted">${isMonth && +p.slice(2) === TODAY_MS ? '<b>This month is still in progress</b>, so it will read low against full months. ' : ''}Leave days follow the sheet’s “Total Leaves” formula (UL, AL, SL, CL, AB + 0.5 per half day).</span>
    </div>
    ${timelineHtml}
    <div class="grid g2" style="margin-bottom:14px">
      <div class="card"><h2>Leave days by month</h2><div class="sub">Click a month to focus the whole dashboard on it.</div>${T ? rtable(EX('Leave days by month')) : stackChart(monthly, { selectable: true, sel: isMonth ? +p.slice(2) : null })}</div>
      <div class="card"><h2>Most leave days · ${esc(periodLabel())}</h2><div class="sub">Top 10 people. Click a bar to filter all reports to that person.</div>${T ? rtable(EX('Most leave days')) : hbars(top, { link: true })}</div>
    </div>
    <div class="grid g2e" style="margin-bottom:14px">
      <div class="card"><h2>${isMonth ? 'People out each day · ' + esc(periodLabel()) : 'Leave days by client group'}</h2><div class="sub">${isMonth ? 'Approved, sick, unplanned and half-day absences.' : 'Sum over the selected period.'}</div>${T ? rtable(isMonth ? EX('People out each day') : EX('Leave days by client group'), ['People']) : isMonth ? dailyChart(+p.slice(2), rows) : hbars(cl, { reportKind:'client', color: 'var(--aqua)' })}</div>
      <div class="card"><h2>${isMonth ? 'Leave days by client group' : 'Leave mix'}</h2><div class="sub">${isMonth ? 'Total leave days per group this month.' : 'Days by type across the period.'}</div>${T ? rtable(isMonth ? EX('Leave days by client group') : EX('Leave mix'), ['People']) : isMonth ? hbars(cl, { reportKind:'client', color: 'var(--aqua)' }) : hbars(SERIES.map(s => ({ label: s.name, v: rows.reduce((t, r) => t + s.f(rowStats(r)), 0) })), { reportKind:'mix', color: 'var(--blue)' })}</div>
    </div>
    <div class="card"><div style="display:flex;gap:12px;align-items:baseline;flex-wrap:wrap"><h2 style="margin:0">Needs attention · ${esc(periodLabel())}</h2><span class="grow"></span>
      <label class="sm muted">Flag unplanned ≥ <input type="number" min="1" style="width:56px;padding:2px 6px" value="${thr.ul}" data-bind="thr-ul"></label>
      <label class="sm muted">or leave days ≥ <input type="number" min="1" style="width:56px;padding:2px 6px" value="${thr.total}" data-bind="thr-total"></label></div>
      <div class="sub" style="margin-top:2px">People whose absences in this period cross the thresholds.</div>
      ${flags.length ? `<div class="list">${flags.slice(0, 12).map(o => `<div class="li"><div class="main-t"><b>${esc(o.x.label)}</b><span class="sm muted">${o.x.late ? o.x.late + ' late arrivals · ' : ''}${o.x.la ? o.x.la + ' leave applications' : 'no pending applications'}</span></div>${o.f.map(([c, t]) => `<span class="tag ${c}">${t}</span>`).join('')}<button class="btn sm" data-act="person" data-k="${esc(o.x.k)}">Open</button></div>`).join('')}</div>${flags.length > 12 ? `<div class="sm muted" style="padding:6px">+${flags.length - 12} more. Raise the thresholds to narrow the list.</div>` : ''}` : '<div class="empty">Nobody crosses the thresholds in this period.</div>'}
    </div>`;
}

/* ---------- WHO'S OUT ---------- */
function pendingApplications(all = false) {
  const out = [];
  for (const r of (all ? S.rows : D().rows)) for (let i = 0; i < 31; i++) { if (up(r.days[i]) !== 'LA') continue; if (i >= Engine.daysInMonth(r.month)) continue; const dt = dateOf(r.month, i); if (dt >= TODAY) out.push({ r, i, dt }); }
  return out.sort((a, b) => a.dt - b.dt || a.r.name.localeCompare(b.r.name));
}
function staleApplications(all = false) {
  const out = [];
  for (const r of (all ? S.rows : D().rows)) for (let i = 0; i < Engine.daysInMonth(r.month); i++) { if (up(r.days[i]) !== 'LA') continue; const dt = dateOf(r.month, i); if (dt < TODAY) out.push({ r, i, dt }); }
  return out.sort((a, b) => b.dt - a.dt || a.r.name.localeCompare(b.r.name));
}
const laRow = (x, older) => !can('att.approve') ? `<div class="li"><div class="main-t"><b>${esc(x.r.name.trim())}</b><span class="sm muted">${longDate(x.dt)}</span></div><span class="tag">Awaiting approval</span></div>` : `<div class="li"><div class="main-t"><b>${esc(x.r.name.trim())}</b><span class="sm muted">${longDate(x.dt)}</span></div>${['AL', 'CL', 'SL'].map(c => `<button class="btn sm" data-act="resolve-la" data-r="${x.r.uid}" data-d="${x.i}" data-c="${c}" title="Approve as ${CODES[c].label}">${c}</button>`).join('')}<button class="btn sm" data-act="resolve-la" data-r="${x.r.uid}" data-d="${x.i}" data-c="UL" title="Mark as unplanned leave">UL</button><button class="btn sm danger" data-act="resolve-la" data-r="${x.r.uid}" data-d="${x.i}" data-c="" title="Reject request · record RJ in tracker">✕</button></div>`;
/* One request group per employee and uninterrupted run of application dates.
   Only recorded off days, or blank weekend cells, may bridge a gap. */
const applicationPerson = r => String(r.empId ?? '').trim() ? 'id:' + String(r.empId).trim().toLowerCase() : 'name:' + personKey(r.name);
function applicationGroups(entries) {
  const byPerson = new Map();
  for (const x of entries) { const key = applicationPerson(x.r); if (!byPerson.has(key)) byPerson.set(key, []); byPerson.get(key).push(x); }
  const groups = [];
  for (const [key, list] of byPerson) {
    list.sort((a,b) => a.dt - b.dt);
    let group;
    for (const x of list) {
      let adjacent = !!group;
      if (group) {
        const prev = group[group.length - 1];
        if (x.dt <= prev.dt) adjacent = false;
        for (let t = prev.dt.getTime() + 86400000; adjacent && t < x.dt.getTime(); t += 86400000) {
          const dt = new Date(t), ms = Engine.monthSerial(dt.getUTCFullYear(), dt.getUTCMonth()), i = dt.getUTCDate() - 1;
          const rows = S.rows.filter(r => applicationPerson(r) === key && r.month === ms);
          adjacent = rows.length === 1 && (catOf(rows[0].days[i]) === 'off' || ((rows[0].days[i] == null || rows[0].days[i] === '') && impliedCode(ms,i) === 'WO'));
        }
      }
      if (!adjacent) { group = []; groups.push(group); }
      group.push(x);
    }
  }
  return groups.sort((a,b) => a[0].dt - b[0].dt || a[0].r.name.localeCompare(b[0].r.name));
}
function applicationList(entries) {
  return applicationGroups(entries).map(group => {
    if (group.length === 1) return laRow(group[0]);
    const first = group[0], last = group[group.length - 1], cells = group.map(x => x.r.uid + ':' + x.i).join(',');
    return '<div class="la-group"><div class="li"><div class="main-t"><b>' + esc(first.r.name.trim()) + '</b><span class="sm muted">' + longDate(first.dt) + ' – ' + longDate(last.dt) + ' · ' + group.length + ' requested days</span></div>' + (can('att.approve') ? '' : '<span class="tag">Awaiting approval</span>') + '</div>' + (!can('att.approve') ? '' : '<div class="la-bulk"><span class="sm muted">Approve all:</span>' + ['AL','CL','SL','UL'].map(c => '<button class="btn sm" data-act="resolve-la-group" data-cells="' + cells + '" data-c="' + c + '" title="Approve all ' + group.length + ' requested days as ' + esc(CODES[c].label) + '">' + c + '</button>').join('') + '<button class="btn sm danger" data-act="resolve-la-group" data-cells="' + cells + '" data-c="RJ">Reject all</button></div>') + '<details><summary>Review individual dates (' + group.length + ')</summary>' + group.map(x => laRow(x)).join('') + '</details></div>';
  }).join('');
}
function resolveApplications(cells, code) {
  if (!['AL','CL','SL','UL','RJ'].includes(code)) return;
  const entries = cells.map(cell => { const [uid, index] = cell.split(':'); const r = rowByUid(uid), i = Number(index); return {r, i}; });
  if (!entries.length || entries.some(x => !x.r || !Number.isInteger(x.i) || x.i < 0 || x.i >= Engine.daysInMonth(x.r.month) || up(x.r.days[x.i]) !== 'LA') || new Set(entries.map(x => applicationPerson(x.r))).size !== 1 || new Set(cells).size !== cells.length) { toast('These requests have changed. Review the refreshed list.'); render(); return; }
  const dates = entries.map(x => longDate(dateOf(x.r.month,x.i))).join(', ');
  mutate(entries[0].r.name.trim() + ' · ' + entries.length + ' application(s) ' + (code === 'RJ' ? 'rejected (RJ)' : 'approved as ' + code) + ' · ' + dates, () => { for (const x of entries) setDay(x.r, x.i, code); }, { cells: true });
}
function bindLeaveDates(from, to) {
  let manualTo = false;
  const sync = () => { if (!manualTo) to.value = from.value; };
  from.addEventListener('input', sync); from.addEventListener('change', sync);
  to.addEventListener('input', () => { manualTo = true; });
  to.addEventListener('change', () => { manualTo = true; });
}
// Render all filtered timeline rows, including rows outside the scroll viewport.
async function copyWhoPicture(button) {
 const table=ROOT.querySelector('[data-picture-timeline]');
 if(!table){toast('No timeline entries to copy.');return;}
 button.disabled=true;
 try {
   const rows=[...table.rows], columns=rows[0].cells.length;
   const measure=document.createElement('canvas').getContext('2d');measure.font='600 13px Segoe UI, sans-serif';
   const nameWidth=Math.max(240,...rows.slice(1).map(r=>measure.measureText(r.cells[0].querySelector('b')?.textContent||r.cells[0].textContent).width+28));
   const cellWidth=48, rowHeight=44, top=64, width=Math.ceil(nameWidth+(columns-1)*cellWidth+24),height=top+rows.length*rowHeight+16;
   const scale=Math.min(2,16000/width,16000/height,Math.sqrt(24000000/(width*height)));
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
   const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
   ctx.fillStyle='#243449';ctx.font='600 17px Segoe UI, sans-serif';ctx.fillText('Attendance · Who’s out',12,24);
   ctx.font='12px Segoe UI, sans-serif';ctx.fillStyle='#53647b';
   const show=Object.entries(S.ui.who.show).filter(([,v])=>v).map(([k])=>({leave:'Leaves',applied:'Applied (LA)',late:'Late',remote:'Remote'})[k]).join(', ');
   ctx.fillText(S.ui.who.start+' · '+S.ui.who.days+' days · '+show,12,45);
   rows.forEach((row,i)=>[...row.cells].forEach((cell,j)=>{
     const x=12+(j?nameWidth+(j-1)*cellWidth:0),y=top+i*rowHeight,w=j?cellWidth:nameWidth;
     ctx.fillStyle=i===0?'#eff4f3':cell.classList.contains('wk')?'#f3f4f6':'#ffffff';ctx.fillRect(x,y,w,rowHeight);
     ctx.strokeStyle='#dde4ed';ctx.lineWidth=.6;ctx.strokeRect(x,y,w,rowHeight);
     ctx.save();ctx.beginPath();ctx.rect(x+3,y+2,w-6,rowHeight-4);ctx.clip();
     ctx.textAlign=j?'center':'left';ctx.fillStyle='#243449';ctx.font='12px Segoe UI, sans-serif';
     if(i===0){const lines=cell.innerText.trim().split(/\n/).filter(Boolean);lines.forEach((t,n)=>ctx.fillText(t,j?x+w/2:x+10,y+13+n*13));}
     else if(j===0){ctx.font='600 13px Segoe UI, sans-serif';ctx.fillText(cell.querySelector('b')?.textContent||cell.textContent,x+10,y+17);ctx.font='11px Segoe UI, sans-serif';ctx.fillStyle='#60718a';ctx.fillText(cell.querySelector('span')?.textContent||'',x+10,y+33);}
     else if(cell.textContent.trim()) {const chip=cell.firstElementChild;ctx.fillStyle=chip?getComputedStyle(chip).backgroundColor:'#e1ecfb';ctx.fillRect(x+4,y+10,w-8,24);ctx.fillStyle='#19364d';ctx.font='600 12px Segoe UI, sans-serif';ctx.fillText(cell.textContent.trim(),x+w/2,y+26);}
     ctx.restore();
   }));
   const blobPromise=new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image could not be created.')),'image/png'));
   try {
     if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('Clipboard unavailable');
     await navigator.clipboard.write([new ClipboardItem({'image/png':blobPromise})]);toast('Timeline copied as a picture.');
   } catch {
     const blob=await blobPromise,url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Attendance-'+S.ui.who.start+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Clipboard unavailable. Timeline downloaded as a PNG instead.');
   }
 } catch(e){toast('Could not create picture: '+e.message);} finally {button.disabled=false;}
}

function whoView() {
  const w = S.ui.who, start = new Date(w.start + 'T00:00:00Z'); const dates = [];
  for (let k = 0; k < w.days; k++) dates.push(new Date(start.getTime() + k * 86400000));
  const d = D(); const groups = { leave: c => LEAVE_CATS.has(c), applied: c => c === 'applied', late: c => c === 'late', remote: c => c === 'remote' };
  const show = c => Object.entries(w.show).some(([k, on]) => on && groups[k](c));
  const people = new Map(); const perDay = dates.map(() => ({ out: 0, la: 0 }));
  dates.forEach((dt, j) => {
    const ms = Engine.monthSerial(dt.getUTCFullYear(), dt.getUTCMonth()), i = dt.getUTCDate() - 1;
    for (const r of d.byMonth.get(ms) || []) {
      const v = r.days[i], c = catOf(v); if (!c) continue;
      if (LEAVE_CATS.has(c)) perDay[j].out++; if (c === 'applied') perDay[j].la++;
      if (!show(c)) continue; const k = personKey(r.name);
      const o = people.get(k) || { name: r.name.trim(), k, cells: new Array(dates.length).fill(null), first: j }; o.cells[j] = { r, i, v }; people.set(k, o);
    }
  });
  const list = [...people.values()].sort((a, b) => a.first - b.first || a.name.localeCompare(b.name));
  const peak = perDay.reduce((m, x, j) => x.out > perDay[m].out ? j : m, 0);
  const pend = pendingApplications(), stale = staleApplications();
  const dayOut = (dt) => { const ms = Engine.monthSerial(dt.getUTCFullYear(), dt.getUTCMonth()); return (d.byMonth.get(ms) || []).filter(r => isLeaveCode(r.days[dt.getUTCDate() - 1])).length; };
  const tomorrow = new Date(TODAY.getTime() + 86400000);
  const chk = (k, l) => `<label><input type="checkbox" data-bind="who-show" data-k="${k}" ${w.show[k] ? 'checked' : ''}> ${l}</label>`;
  const head = dates.map((dt, j) => { const wk = dt.getUTCDay() === 0 || dt.getUTCDay() === 6, isT = isoDate(dt) === isoDate(TODAY); return `<th class="d ${wk ? 'wk' : ''} ${isT ? 'tdy' : ''}" style="min-width:44px" data-tip="${longDate(dt)}<br>${perDay[j].out} out · ${perDay[j].la} applied">${dt.getUTCDate()}<small>${WEEKDAYS[dt.getUTCDay()]}</small><small style="color:${perDay[j].out ? 'var(--ink)' : 'var(--ink-3)'};font-weight:650">${perDay[j].out || '·'}</small></th>`; }).join('');
  const body = list.map(o => `<tr><td class="c-name" data-act="person" data-k="${esc(o.k)}"><b>${esc(o.name)}</b><span>${esc(o.cells.find(Boolean).r.client || '—')}</span></td>${o.cells.map((c, j) => { const wk = dates[j].getUTCDay() % 6 === 0, isT = isoDate(dates[j]) === isoDate(TODAY); return c ? `<td class="cell ${wk ? 'wk' : ''} ${isT ? 'tdy' : ''}" data-act="cell" data-r="${c.r.uid}" data-d="${c.i}" data-tip="${esc(cellTip(c.r, c.i))}">${chip(c.v)}</td>` : `<td class="${wk ? 'wk' : ''} ${isT ? 'tdy' : ''}"></td>`; }).join('')}</tr>`).join('');
  return `${requestsCardHtml()}<div class="grid g6" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">
      <div class="card tile"><div class="lbl">OUT TODAY</div><div class="val">${dayOut(TODAY)}</div><div class="delta">${longDate(TODAY)}</div></div>
      <div class="card tile"><div class="lbl">OUT TOMORROW</div><div class="val">${dayOut(tomorrow)}</div><div class="delta">${longDate(tomorrow)}</div></div>
      <div class="card tile"><div class="lbl">BUSIEST DAY IN WINDOW</div><div class="val">${perDay[peak].out}</div><div class="delta">${longDate(dates[peak])}</div></div>
      <div class="card tile"><div class="lbl">PENDING APPLICATIONS</div><div class="val">${new Set(pend.map(x => applicationPerson(x.r))).size}</div><div class="delta">${(() => { const n = new Set(pend.map(x => applicationPerson(x.r))).size; return (n === 1 ? 'person' : 'people') + ' waiting for approval · ' + pend.length + ' day' + (pend.length === 1 ? '' : 's'); })()}</div></div></div>
    <div class="toolbar"><label>From <input type="date" value="${w.start}" data-bind="who-start"></label>
      <div class="seg" role="group" aria-label="Window length">${[7, 14, 21, 30].map(n => `<button data-act="who-days" data-n="${n}" aria-pressed="${w.days === n}">${n} days</button>`).join('')}</div>
      <button class="btn" data-act="who-today">Today</button><button class="btn" data-act="who-picture">Copy as picture</button><span class="sm muted">Show:</span>${chk('leave', 'Leaves')}${chk('applied', 'Applied (LA)')}${chk('late', 'Late')}${chk('remote', 'Remote')}
      <span class="grow"></span>${canLog() ? `<button class="btn primary" data-act="log-leave">${ic('plus')} Log leave</button>` : ''}</div>
    <div class="grid who3" style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start">
      <div class="card" style="padding:0;overflow:hidden;min-width:0">${list.length ? `<div class="gridwrap" style="border:0;box-shadow:none;max-height:calc(100vh - 330px)"><table class="att" data-picture-timeline><thead><tr><th class="c-name">Team member</th>${head}</tr></thead><tbody>${body}</tbody></table></div>` : `<div class="empty">Nothing recorded in this window (${longDate(dates[0])} to ${longDate(dates[dates.length - 1])}). The sheet may not have entries this far ahead yet.<br><button class="btn sm" style="margin-top:10px" data-act="who-back">Show the last 14 days instead</button></div>`}</div>
      <div class="card" style="min-width:0"><h2>Applications ahead · ${pend.length}</h2><div class="sub">${can('att.approve') ? 'Approve each date or a consecutive group. ✕ records RJ (rejected) in the tracker; it does not record attendance.' : 'Leave applied for and waiting for someone with the Approve leave right.'}</div>
        ${pend.length ? `<div class="list" style="max-height:calc(100vh - 380px);min-height:220px;overflow:auto">${applicationList(pend)}</div>` : '<div class="empty">No pending applications from today onward.</div>'}</div>
        <div class="card" style="min-width:0"><h2>Applications never closed · ${stale.length}</h2><div class="sub">These dates have passed but the cell still says LA, so they are not counted as leave. ${can('att.approve') ? 'Pick what actually happened.' : 'Someone with the Approve leave right needs to close them.'}</div>
        ${stale.length ? `<div class="list" style="max-height:calc(100vh - 380px);min-height:220px;overflow:auto">${applicationList(stale)}</div>` : '<div class="empty">Nothing outstanding. Every past application has been closed.</div>'}</div></div>`;
}

/* ---------- ATTENDANCE GRID ---------- */
function cellTip(r, i) {
  const v = r.days[i]; const note = r.notes && r.notes[i] ? '<br><i>' + esc(r.notes[i].replace(/\r/g, '')) + '</i>' : '';
  const dt = dateOf(r.month, i);
  return `<b>${esc(r.name.trim())}</b><br>${longDate(dt)}<br>${v == null ? (!trackedOn(r, i) ? 'Blank · not tracked (' + (departure(r).kind === 'left' ? 'left the team' : 'moved') + ')' : impliedCode(r.month, i) === 'WO' ? 'Blank · week off (Sat / Sun)' : 'Blank · counts as present (P)') : esc(String(v).trim()) + ' · ' + esc(labelOf(v))}${note}`;
}
function gridTable(rows, { mode = 'month', month = null, hl = null } = {}) {
  const dim = mode === 'month' ? Engine.daysInMonth(month) : 31; let head = '';
  for (let i = 0; i < dim; i++) {
    if (mode === 'month') { const w = dow(month, i), isT = month === TODAY_MS && i === TODAY_IDX; head += `<th class="d hd ${w % 6 === 0 ? 'wk' : ''} ${isT ? 'tdy' : ''}" data-act="day-head" data-ms="${month}" data-d="${i}" data-tip="${esc(longDate(dateOf(month, i)))}<br>Click to mark this day as a holiday (H) for everyone">${i + 1}<small>${WEEKDAYS[w][0]}</small></th>`; }
    else head += `<th class="d">${i + 1}</th>`;
  }
  const body = rows.map(r => {
    const s = rowStats(r), rdim = Engine.daysInMonth(r.month); let cells = '';
    for (let i = 0; i < dim; i++) {
      const w = dow(r.month, i), wk = w % 6 === 0 && i < rdim, isT = r.month === TODAY_MS && i === TODAY_IDX; const v = r.days[i];
      if (i >= rdim) { cells += `<td class="beyond">${v != null ? chip(v) : ''}</td>`; continue; }
      cells += `<td class="cell ${wk ? 'wk' : ''} ${isT ? 'tdy' : ''} ${v == null ? 'empty' : ''}" data-act="cell" data-r="${r.uid}" data-d="${i}" data-tip="${esc(cellTip(r, i))}">${v != null ? chip(v, hl && !hl.has(cellCode(v)) ? 'faded' : '') : impliedChip(r.month, i, r)}${r.notes && r.notes[i] ? '<span class="note-dot"></span>' : ''}</td>`;
    }
    const wr = mode === 'month' && hasRoster() ? rowRoster(r) : null;
    const dp = mode === 'month' ? departure(r) : null, dpText = dp && dp.dated ? ' ' + longDate(dateOf(dp.ms, dp.i)).replace(/^\w+ /, '') : '';
    const first = mode === 'month' ? `<b>${esc(r.name.trim() || '(no name)')}</b><span>${esc(r.client || '—')}${hasRoster() ? ' · ' + (wr ? esc(rosterStatus(wr) || 'no status') + esc(dpText) : `not in workforce · <span class="linkbtn" data-act="link-person" data-k="${esc(personKey(r.name))}">link</span>`) : ''}</span>` : `<b>${monthLabel(r.month)}</b><span>${esc(r.client || '—')}</span>`;
    return `<tr${dp ? ' class="gone"' : ''}><td class="c-name" data-act="${mode === 'month' ? 'person' : 'edit-row'}" data-k="${esc(personKey(r.name))}" data-r="${r.uid}">${first}</td><td class="c-id sm">${r.empId ?? '<span class="muted">—</span>'}</td>${cells}
      <td class="c-tot num" data-tip="Total Leaves (sheet formula)">${fmt(s.total)}</td><td class="c-tot num" data-tip="Unapproved Leaves (UL)">${s.ul || '<span class="muted">0</span>'}</td><td class="c-tot num" data-tip="Upcoming Leaves">${s.upc || '<span class="muted">0</span>'}</td><td class="c-tot num muted" data-tip="Days present so far: blank weekdays count as P, plus P, R, L and C. Not stored in Excel.">${s.present}</td>
      <td class="c-act"><button class="btn sm ghost" data-act="edit-row" data-r="${r.uid}" title="Edit row">${ic('edit')}</button><button class="btn sm ghost" data-act="del-row" data-r="${r.uid}" title="Delete row">${ic('trash')}</button></td></tr>`;
  }).join('');
  return `<table class="att"><thead><tr><th class="c-name">${mode === 'month' ? 'Employee' : 'Month'}</th><th class="c-id">Emp ID</th>${head}<th class="c-tot" data-tip="Total Leaves">Total</th><th class="c-tot" data-tip="Unapproved Leaves (UL)">UL</th><th class="c-tot" data-tip="Upcoming Leaves">Upcoming</th><th class="c-tot" data-tip="Days present so far: blank weekdays count as P, plus P, R, L and C. Not stored in Excel.">Present</th><th class="c-act"></th></tr></thead><tbody>${body || `<tr><td colspan="${dim + 7}" class="empty" style="height:auto">No rows match.</td></tr>`}</tbody></table>`;
}
/* Leave-type filter for the attendance grid: pick one or more types to see only the people who have them this month */
const LEAVE_FILTERS = [
  { k: 'AL', label: 'Approved', codes: ['AL'] }, { k: 'CL', label: 'Casual', codes: ['CL'] }, { k: 'SL', label: 'Sick', codes: ['SL'] },
  { k: 'UL', label: 'Unplanned', codes: ['UL'] }, { k: 'AB', label: 'Absent', codes: ['AB'] }, { k: 'HD', label: 'Half day', codes: ['HD1', 'HD2'] },
  { k: 'LA', label: 'Pending', codes: ['LA'] }, { k: 'RJ', label: 'Rejected', codes: ['RJ'] },
  { k: 'L', label: 'Late / cab late', codes: ['L', 'C'] }, { k: 'R', label: 'Remote', codes: ['R'] },
];
const cellCode = v => (v == null ? '' : String(v).trim().toUpperCase());
const leaveFilterCodes = kinds => new Set(LEAVE_FILTERS.filter(f => kinds.includes(f.k)).flatMap(f => f.codes));
const rowHasCodes = (r, codes) => r.days.some(v => codes.has(cellCode(v)));
const rowCodeDays = (r, codes) => r.days.reduce((a, v) => a + (codes.has(cellCode(v)) ? (/^HD/.test(cellCode(v)) ? 0.5 : 1) : 0), 0);
function gridBaseRows() {
  const g = S.ui.grid, q = g.q.trim().toLowerCase();
  let rows = (D().byMonth.get(g.month) || []).slice();
  if (q) rows = rows.filter(r => (r.name + ' ' + (r.empId ?? '') + ' ' + r.client).toLowerCase().includes(q));
  if (g.client !== 'all') rows = rows.filter(r => clientGroup(r.client) === g.client);
  if (g.status !== 'all' && hasRoster()) rows = rows.filter(r => { const w = rowRoster(r); return (w ? rosterStatus(w) || 'No status' : 'Not in workforce') === g.status; });
  return rows;
}
function leaveFilterBar(base) {
  const g = S.ui.grid, kinds = g.kinds || [];
  const btns = LEAVE_FILTERS.map(f => {
    const codes = new Set(f.codes), n = base.filter(r => rowHasCodes(r, codes)).length, on = kinds.includes(f.k);
    const tip = f.codes.map(c => c + ' = ' + CODES[c].label).join('<br>') + '<br>' + n + (n === 1 ? ' person has' : ' people have') + ' this in the month.<br>Click to filter, click again to remove. Pick several to see anyone with any of them.';
    return `<button class="lf" data-act="grid-kind" data-k="${f.k}" aria-pressed="${on}" data-tip="${esc(tip)}" ${!n && !on ? 'disabled' : ''}><span class="chip cat-${catOf(f.codes[0])}">${f.codes.join('/')}</span>${esc(f.label)} <b class="num">${n}</b></button>`;
  }).join('');
  return `<div class="lf-bar" role="group" aria-label="Filter by leave type"><span class="sm muted">Leave type</span>${btns}${kinds.length ? `<button class="btn sm" data-act="grid-kind-clear">Clear</button>` : ''}</div>`;
}
function gridRows() {
  const g = S.ui.grid;
  let rows = gridBaseRows();
  if (g.kinds && g.kinds.length) { const codes = leaveFilterCodes(g.kinds); rows = rows.filter(r => rowHasCodes(r, codes)); }
  if (g.filter === 'leave') rows = rows.filter(r => rowStats(r).total > 0); else if (g.filter === 'ul') rows = rows.filter(r => rowStats(r).ul > 0); else if (g.filter === 'la') rows = rows.filter(r => rowStats(r).applied > 0);
  if (g.sort === 'name') rows.sort((a, b) => a.name.trim().localeCompare(b.name.trim())); else if (g.sort === 'leaves') rows.sort((a, b) => rowStats(b).total - rowStats(a).total);
  else if (g.sort === 'kind' && g.kinds && g.kinds.length) { const codes = leaveFilterCodes(g.kinds); rows.sort((a, b) => rowCodeDays(b, codes) - rowCodeDays(a, codes) || a.name.trim().localeCompare(b.name.trim())); }
  return rows;
}
function statusOptionsHtml(g) {
  return '';   // the status boxes at the top of the page do this now
}
function gridView() {
  const g = S.ui.grid, rows = gridRows(), tot = rows.reduce((a, r) => a + rowStats(r).total, 0);
  const kinds = g.kinds || [], hl = kinds.length ? leaveFilterCodes(kinds) : null, kindDays = hl ? rows.reduce((a, r) => a + rowCodeDays(r, hl), 0) : 0;
  const kindNames = LEAVE_FILTERS.filter(f => kinds.includes(f.k)).map(f => f.label.toLowerCase() + ' (' + f.codes.join('/') + ')').join(' or ');
  const legend = ['AL', 'CL', 'SL', 'UL', 'AB', 'HD1', 'LA', 'RJ', 'L', 'C', 'R', 'WO', 'H'].map(c => `<span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:32px">${chip(c)}</span><span class="sm muted">${CODES[c].label}</span></span>`).join('');
  return `${can('att.who') ? '' : requestsCardHtml()}<div class="toolbar">
      <label>Year <select data-bind="gyear">${gridYearOptions(g.month)}</select></label>
      <label>Month <select data-bind="gmonth">${gridMonthOptions(g.month)}</select></label>
      <input type="search" placeholder="Search name, ID or client" value="${esc(g.q)}" data-bind="gq" style="width:230px">
      <select data-bind="gclient">${clientOptions(g.client)}</select>${statusOptionsHtml(g)}
      <select data-bind="gfilter"><option value="all">All employees</option><option value="leave"${g.filter === 'leave' ? ' selected' : ''}>With leave this month</option><option value="ul"${g.filter === 'ul' ? ' selected' : ''}>With unplanned leave</option><option value="la"${g.filter === 'la' ? ' selected' : ''}>With pending applications</option></select>
      <select data-bind="gsort"><option value="file">File order</option><option value="name"${g.sort === 'name' ? ' selected' : ''}>Sort: name</option><option value="leaves"${g.sort === 'leaves' ? ' selected' : ''}>Sort: most leaves</option>${kinds.length ? `<option value="kind"${g.sort === 'kind' ? ' selected' : ''}>Sort: most of chosen type</option>` : ''}</select>
      <span class="grow"></span>
      ${hasRoster() && gonePlan().list.length ? `<button class="btn" data-act="mark-gone" data-tip="Left / Moved people whose remaining days are not marked yet">${ic('users')} Mark Left / Moved <span class="badge">${gonePlan().list.length}</span></button>` : ''}
      <button class="btn" data-act="holiday" data-tip="Mark a whole day as a holiday (H) for everyone in one go">${ic('cal')} Add holiday</button>
      <button class="btn" data-act="new-month">${ic('cal')} Start / update month</button>
      <button class="btn" data-act="log-leave">${ic('plus')} Log leave</button>
      <button class="btn primary" data-act="add-row">${ic('plus')} Add employee</button></div>
    ${leaveFilterBar(gridBaseRows())}
    <div class="sm muted" style="margin-bottom:8px"><b class="num">${rows.length}</b> employees${hl ? ` with ${esc(kindNames)} · <b class="num">${fmt(kindDays)}</b> days of that type (other codes faded)` : ''} · <b class="num">${fmt(tot)}</b> leave days · <b>Click any day</b> to set its code, or a day number at the top to mark a holiday for everyone. A blank day counts as present (P), and blank Saturdays / Sundays are week offs.</div>
    <div class="gridwrap">${gridTable(rows, { month: g.month, hl })}</div>
    <div style="display:flex;gap:6px 16px;flex-wrap:wrap;margin-top:12px">${legend}</div>`;
}

/* ---------- PEOPLE ---------- */
function peopleSub(x) {
  if (!hasRoster()) return clientGroup(x.latest.client);
  const m = rosterOfPerson(x); if (!m) return 'not in roster';
  return gs(m.row, 'designation_column') || clientGroup(x.latest.client);
}
function rosterLine(p) {
  if (!hasRoster()) return '';
  const m = rosterOfPerson(p);
  if (!m) return `<div class="rosterline"><span class="tag crit">Not found in Team roster</span><span class="sm muted">No Emp Code or name match. If they are in the workforce file under a fuller or different name, link them.</span><button class="btn sm primary" data-act="link-person" data-k="${esc(p.key)}">Link to workforce…</button></div>`;
  const r = m.row, bits = [gs(r, 'designation_column'), gs(r, 'client_column'), gs(r, 'phone_column')].filter(Boolean).map(esc).join(' · ');
  const st = gs(r, 'status_column');
  return `<div class="rosterline"><span class="tag ${isInactive(r) ? 'crit' : ''}">${esc(st || 'Team roster')}</span><span class="sm">${bits}</span>${m.how === 'link' ? `<span class="sm muted" title="This tracker name was linked to the workforce person, so the different spelling still matches">linked to workforce</span><button class="btn sm ghost" data-act="unlink" data-k="${esc(personKey(p.name))}">Unlink</button>` : m.how !== 'id' ? `<span class="sm muted" title="No Emp ID match, so the name was used">matched by name</span>` : ''}<button class="btn sm" data-act="open-emp" data-k="${esc(p.key)}">Open employee record</button></div>`;
}
function peopleView() {
  const d = D(), pu = S.ui.people, q = pu.q.trim().toLowerCase();
  let list = [...d.people.values()].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = q ? list.filter(p => (p.name + ' ' + [...p.ids].join(' ')).toLowerCase().includes(q)) : list;
  if (!pu.sel || !d.people.has(pu.sel)) { const lm = (d.byMonth.get(d.latestMonth) || []).slice().sort((a, b) => rowStats(b).total - rowStats(a).total)[0]; pu.sel = lm ? personKey(lm.name) : (filtered[0]?.key || list[0]?.key); }
  const p = d.people.get(pu.sel);
  const side = `<div class="card people-list"><input type="search" placeholder="Search ${list.length} people" value="${esc(pu.q)}" data-bind="pq" style="width:100%;margin-bottom:6px">${filtered.map(x => `<button class="p" data-act="person" data-k="${esc(x.key)}" ${x.key === pu.sel ? 'aria-current="true"' : ''}><span>${esc(x.name)}</span><small>${esc(peopleSub(x))}</small></button>`).join('') || '<div class="empty">No match</div>'}</div>`;
  if (!p) return `<div class="people-layout">${side}<div class="empty">No people found.</div></div>`;
  const all = agg(p.rows), yr = monthYear(d.latestMonth), yrRows = p.rows.filter(r => monthYear(r.month) === yr), ya = agg(yrRows);
  const series = p.rows.map(r => ({ month: r.month, rows: [r] }));
  const ids = [...p.ids]; const last = p.latest; const cur = p.rows.find(r => r.month === TODAY_MS) || last;
  const missingMonths = d.months.filter(m => m >= p.rows[0].month && !p.rows.some(r => r.month === m));
  return `<div class="people-layout">${side}<div>
      <div class="card" style="margin-bottom:14px"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h2 style="font-size:20px;margin:0">${esc(p.name)}</h2>
        <div class="sm muted">${ids.length ? 'ID ' + ids.map(esc).join(', ') : 'No employee ID recorded'} · ${esc(last.client || 'No client')} · ${p.rows.length} months tracked (${monthLabel(p.rows[0].month)} – ${monthLabel(last.month)})</div>${rosterLine(p)}</div>
        <button class="btn" data-act="log-leave" data-k="${esc(p.key)}">${ic('plus')} Log leave</button></div></div>
      <div class="grid g6" style="grid-template-columns:repeat(6,1fr);margin-bottom:14px">
        <div class="card tile"><div class="lbl">PRESENT · ${monthShort(cur.month).toUpperCase()}</div><div class="val">${rowStats(cur).present}</div><div class="delta">blank = present</div></div>
        <div class="card tile"><div class="lbl">LEAVE DAYS ${yr}</div><div class="val">${fmt(ya.total)}</div></div>
        <div class="card tile"><div class="lbl">LEAVE DAYS ALL TIME</div><div class="val">${fmt(all.total)}</div></div>
        <div class="card tile"><div class="lbl">UNPLANNED / ABSENT</div><div class="val">${fmt(all.unpl)}</div></div>
        <div class="card tile"><div class="lbl">LATE / CAB LATE</div><div class="val">${all.late}</div></div>
        <div class="card tile"><div class="lbl">PENDING APPLICATIONS</div><div class="val">${pendingApplications().filter(x => personKey(x.r.name) === p.key).length}</div></div></div>
      <div class="card" style="margin-bottom:14px"><h2>Leave days by month</h2><div class="sub">${missingMonths.length ? `No row for ${missingMonths.length} month${missingMonths.length > 1 ? 's' : ''} in between (${missingMonths.slice(0, 4).map(monthLabel).join(', ')}${missingMonths.length > 4 ? '…' : ''}).` : 'Every month since joining has a row.'}</div>${stackChart(series, { height: 200 })}</div>
      <div class="card" style="padding:0;overflow:hidden"><div style="padding:14px 16px 6px"><h2>Month by month</h2><div class="sub" style="margin-bottom:0">Click a day to change it.</div></div><div class="gridwrap" style="border:0;border-radius:0;box-shadow:none;max-height:none">${gridTable([...p.rows].reverse(), { mode: 'multi' })}</div></div></div></div>`;
}

/* ---------- LEFT / MOVED: what still has to be marked in the tracker ---------- */
/* Left (with a Left Date): the days after that date become NA. Moved: the days after the chosen "last day in this team" become M.
   Only blank weekdays are touched; week offs, holidays and anything already filled in stay as they are. */
function gonePlan(dates = null) {
  const key = S.ver + '|' + rosterVer() + '|' + rosterRows().length; if (!dates && gonePlan.c && gonePlan.c.key === key) return gonePlan.c;
  const list = [], nodate = [];
  if (hasRoster()) for (const p of D(true).people.values()) {
    const hit = rosterOfPerson(p); if (!hit) continue; const rr = hit.row, kind = goneKind(rr); if (!kind) continue;
    let lv = dateSerial(rr);
    if (kind === 'left' && lv == null) { nodate.push({ p, rr }); continue; }
    if (kind === 'moved') lv = dates && dates[rr.id] != null ? dates[rr.id] : (lv ?? Engine.dateToSerial(TODAY) - 1);   // no date: they were here until yesterday
    const cut = serialParts(lv), code = kind === 'left' ? 'NA' : 'M', cells = [];
    for (const r of p.rows) {
      if (r.month < cut.ms) continue; const dim = Engine.daysInMonth(r.month);
      for (let i = r.month === cut.ms ? cut.i + 1 : 0; i < dim; i++) { const v = r.days[i]; if (v != null && v !== '') continue; const w = dow(r.month, i); if (w === 0 || w === 6) continue; cells.push({ r, i }); }
    }
    if (cells.length) list.push({ p, rr, kind, code, lv, cells });
  }
  list.sort((a, b) => a.p.name.localeCompare(b.p.name)); nodate.sort((a, b) => a.p.name.localeCompare(b.p.name));
  const res = { key, list, nodate }; if (!dates) gonePlan.c = res; return res;
}
const serialText = v => { const d = Engine.serialToDate(v); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

/* ---------- DATA HEALTH ---------- */
function rosterGaps() {
  const key = S.ver + '|' + rosterVer() + '|' + rosterRows().length; if (rosterGaps.c && rosterGaps.c.key === key) return rosterGaps.c;
  const d = D(true), lm = d.latestMonth, lmRows = d.byMonth.get(lm) || [], recent = new Set(d.months.slice(-2));
  const notInRoster = [...d.people.values()].filter(p => recent.has(p.latest.month) && !rosterOfPerson(p)).sort((a, b) => a.name.localeCompare(b.name));
  const seen = new Set();
  for (const r of lmRows) { const m = rosterMatch(r.empId, r.name); if (m) seen.add(m.row.id); }
  const sync = [];
  for (const r of S.rows) { const m = rosterMatch(r.empId, r.name); if (!m) continue; const name = gs(m.row, 'name_column').trim().replace(/\s+/g, ' '), id = gs(m.row, 'key_column').trim(); if (!name && !id) continue; if ((name && r.name !== name) || (id && idKey(r.empId) !== idKey(id))) sync.push({ r, name: name || r.name, id: id || r.empId }); }
  const missing = rosterRows().filter(r => isTracked(r) && !seen.has(r.id)).sort((a, b) => gs(a, 'name_column').localeCompare(gs(b, 'name_column')));
  return rosterGaps.c = { key, lm, notInRoster, missing, sync };
}

function healthIssues() {
  if (healthIssues.c && healthIssues.c.ver === S.ver + '|' + rosterVer() + '|' + clientOkList().length) return healthIssues.c.v;
  const issues = [], rows = S.rows;
  // 1 codes
  const fixable = [], unknown = [];
  rows.forEach(r => r.days.forEach((v, i) => {
    if (v == null || v === '') return; const s = String(v), c = s.trim().toUpperCase();
    if (i >= Engine.daysInMonth(r.month)) return;
    if (!CODES[c]) unknown.push({ r, i, v }); else if (s !== c) fixable.push({ r, i, v, to: c });
  }));
  issues.push({ id: 'codes-fix', sev: 'low', count: fixable.length, title: 'Codes with stray spaces or odd capitalisation', sub: 'e.g. “Al” or “C ” instead of “AL” / “C”. Harmless to read, but they can slip past filters.', fixLabel: `Tidy ${fixable.length} code${fixable.length === 1 ? '' : 's'}`, fix: 'fix-codes', items: fixable.slice(0, 40).map(x => ({ r: x.r, i: x.i, text: `“${x.v}” → ${x.to}` })) });
  issues.push({ id: 'codes-bad', sev: 'high', count: unknown.length, title: 'Unrecognised attendance codes', sub: 'Not in your legend, so they are not counted anywhere. Open the row and pick the right code.', items: unknown.slice(0, 40).map(x => ({ r: x.r, i: x.i, text: `“${x.v}” (not a known code)` })) });
  // 2 missing IDs
  const idByName = new Map(); rows.forEach(r => { if (r.empId != null && r.empId !== '') { const k = personKey(r.name); (idByName.get(k) || idByName.set(k, new Map()).get(k)).set(String(r.empId), r.empId); } });
  const missing = rows.filter(r => r.empId == null || r.empId === '');
  const fillable = missing.filter(r => idByName.get(personKey(r.name))?.size === 1);
  const stillMissing = new Map(); missing.filter(r => !fillable.includes(r)).forEach(r => { const k = personKey(r.name); stillMissing.set(k, r.name.trim()); });
  issues.push({ id: 'ids', sev: 'med', count: missing.length, title: 'Rows without an Employee ID', sub: `${fillable.length} can be filled automatically from the same person’s other months. ${stillMissing.size} people have no ID anywhere (Emp ID must be typed in).`, fixLabel: fillable.length ? `Fill ${fillable.length} from other months` : null, fix: 'fix-ids', items: [...stillMissing.entries()].slice(0, 40).map(([k, n]) => ({ k, text: `${n} has no ID in any month` })) });
  // 3 names
  const messy = rows.filter(r => r.name !== r.name.trim().replace(/\s+/g, ' '));
  issues.push({ id: 'names', sev: 'low', count: messy.length, title: 'Names with extra spaces', sub: 'Trailing or double spaces make the same person look like two people in pivots.', fixLabel: `Trim ${messy.length}`, fix: 'fix-names', items: messy.slice(0, 40).map(r => ({ r, text: `“${r.name}”` })) });
  // 4 ID conflicts
  const conflicts = []; const nameIds = new Map(), idNames = new Map();
  rows.forEach(r => { if (r.empId == null || r.empId === '') return; const k = personKey(r.name), id = String(r.empId); (nameIds.get(k) || nameIds.set(k, new Set()).get(k)).add(id); (idNames.get(id) || idNames.set(id, new Set()).get(id)).add(r.name.trim()); });
  nameIds.forEach((s, k) => { if (s.size > 1) conflicts.push({ k, text: `${D(true).people.get(k)?.name || k} has ${s.size} different IDs: ${[...s].join(', ')}` }); });
  idNames.forEach((s, id) => { if (s.size > 1) conflicts.push({ k: personKey([...s][0]), text: `ID ${id} is used by ${s.size} names: ${[...s].join(', ')}` }); });
  issues.push({ id: 'conflicts', sev: 'high', count: conflicts.length, title: 'Conflicting IDs and names', sub: 'One person with several IDs, or one ID shared by several people.', items: conflicts.slice(0, 40) });
  // 5 duplicates
  const seen = new Map(), dups = []; rows.forEach(r => { const k = r.month + '|' + personKey(r.name); if (seen.has(k)) dups.push({ r, text: `${rowLabel(r)} appears more than once` }); else seen.set(k, r); });
  issues.push({ id: 'dups', sev: 'high', count: dups.length, title: 'Duplicate rows (same person, same month)', sub: 'Leave would be double counted in pivots.', items: dups.slice(0, 40) });
  const stl = staleApplications(true);
  issues.push({ id: 'stale', sev: 'med', count: stl.length, title: 'Leave applications (LA) for dates that have already passed', sub: 'LA should become AL / CL / SL (or be cleared) once decided. Until then these days are not counted as leave anywhere.', fixLabel: 'Review & close them', fix: 'review-la', items: [] });
  // 6 upcoming formula variant
  const varRows = rows.filter(r => r.variant === 'AL'); const mon = [...new Set(varRows.map(r => monthLabel(r.month)))];
  issues.push({ id: 'variant', sev: 'med', count: varRows.length, title: '“Upcoming Leaves” formula counts AL instead of LA', sub: `${mon.join(', ')}: these rows count Approved Leave in the Upcoming Leaves column, while every other month counts Leave Applications (LA).`, fixLabel: `Switch ${varRows.length} rows to count LA`, fix: 'fix-variant', items: [] });
  // 7 beyond month
  const beyond = []; rows.forEach(r => { const dim = Engine.daysInMonth(r.month); for (let i = dim; i < 31; i++) { const v = r.days[i]; if (v != null && v !== '' && !['X', 'NA'].includes(up(v).trim())) beyond.push({ r, i, text: `${rowLabel(r)} has “${v}” in day ${i + 1}, which is past the end of the month` }); } });
  issues.push({ id: 'beyond', sev: 'med', count: beyond.length, title: 'Entries after the last day of the month', sub: 'Days 29–31 that do not exist in that month but hold a code.', items: beyond.slice(0, 40) });
  // 8 no client (v3.12: people marked "No client needed" are not flagged)
  const noClient = rows.filter(r => !r.client && !clientNotNeeded(personKey(r.name), [r.empId])); const nc = new Set(noClient.map(r => personKey(r.name)));
  issues.push({ id: 'client', sev: 'low', count: noClient.length, title: 'Rows with no client', sub: `${nc.size} people. They appear as “Unassigned” in client charts.`, items: [] });
  // 9 client label variants
  const variants = new Map(); rows.forEach(r => { if (!r.client) return; const g = clientGroup(r.client); (variants.get(g) || variants.set(g, new Map()).get(g)).set(r.client, (variants.get(g).get(r.client) || 0) + 1); });
  const multi = [...variants.entries()].filter(([g, m]) => m.size > 1);
  issues.push({ id: 'variants', sev: 'info', count: multi.length, title: 'Client names written several ways', sub: 'The dashboard groups these for charts (shown below). The workbook itself is not changed.', items: multi.map(([g, m]) => ({ text: `${g}: ` + [...m.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} (${c})`).join(' · ') })) });
  // 10-12 cross-checks with the Team roster
  if (hasRoster()) {
    const gp = rosterGaps(), lm = gp.lm;
    issues.push({ id: 'roster-none', sev: 'med', count: gp.notInRoster.length, title: 'People in the tracker who are not in the Team roster', sub: 'Seen in the last two months of the tracker, but no Emp Code or name match in the Team workbook. Often a spelling difference (for example “Chanchal Soni” in the tracker and “Chanchal Bharat Soni” in the workforce file): use “Link to workforce…” to tie the two together. Otherwise it is a new joiner who was never added there, or someone who has left.', items: gp.notInRoster.slice(0, 40).map(p => ({ k: p.key, link: true, text: `${p.name} · ${p.latest.client || 'no client'} · last row ${monthLabel(p.latest.month)}${p.ids.size ? ' · ID ' + [...p.ids][0] : ' · no ID'}` })) });
    issues.push({ id: 'roster-missing', sev: 'med', count: gp.missing.length, title: `In the workforce file (Active, Resign, Projected, Bench, Manager, New) but missing from ${monthLabel(lm)}`, sub: 'These people have no row in the latest month, so their leave cannot be recorded or counted. “Track attendance” adds them to the tracker with their ID and details from the workforce file and saves straight into the Excel file (a backup is made first).', fixLabel: `Track all ${gp.missing.length} and save`, fix: 'fix-add-roster', items: gp.missing.slice(0, 40).map(r => ({ track: r.id, text: `${gs(r, 'name_column')} · ${gs(r, 'designation_column') || 'no designation'} · ${gs(r, 'client_column') || 'no client'}` })) });
    issues.push({ id: 'roster-sync', sev: 'med', count: gp.sync.length, title: 'Names or Emp IDs that differ from the workforce file', sub: 'The workforce file is the source for names and IDs. The button rewrites these rows to match it (spelling, missing IDs). Review, Undo if needed, then Save.', fixLabel: `Update ${gp.sync.length} row${gp.sync.length === 1 ? '' : 's'} from the workforce`, fix: 'fix-sync-roster', items: gp.sync.slice(0, 40).map(x => ({ r: x.r, text: `${rowLabel(x.r)}: ${x.r.name.trim()} (${x.r.empId ?? 'no ID'}) → ${x.name} (${x.id})` })) });
    const liveLinks = [...S.links.values()].filter(l => S.rows.some(r => personKey(r.name) === l.k));
    issues.push({ id: 'links', sev: 'info', count: liveLinks.length, title: 'Tracker names linked to a different workforce name', sub: 'Nothing is wrong. Each of these names is spelled differently in the tracker and the workforce file, so a link tells the dashboard they are the same person. A link is created when you apply a match in “Fix people in one place” (or link one name yourself) and is remembered in this browser for these workbooks. Use the button to make the tracker use the workforce spelling instead, or Unlink to undo one.', fixLabel: `Use the workforce spelling for ${liveLinks.length}`, fix: 'rename-linked', items: liveLinks.map(l => ({ unlink: l.k, text: `“${l.tname}” in the tracker = “${l.rname}” in the workforce file${l.code ? ' (' + l.code + ')' : ''} · linked by ${l.by || 'someone'} on ${l.at || ''}` })) });
    const gn = gonePlan();
    issues.push({ id: 'roster-left', sev: 'med', count: gn.list.length, title: 'Left / Moved people whose days are not marked yet', sub: 'Their workforce status is Left (with a Left Date) or Moved, so their attendance is not tracked any more. The button marks their remaining days NA (Left) or M (Moved) in the tracker. They are also left out of new months.', fixLabel: `Mark ${gn.list.length} as Left / Moved`, fix: 'mark-gone', items: gn.list.slice(0, 40).map(x => ({ k: x.p.key, text: `${x.p.name} · ${x.kind === 'left' ? 'Left ' + serialText(x.lv) : 'Moved'} · ${x.cells.length} day${x.cells.length === 1 ? '' : 's'} to mark as ${x.code}` })) });
    issues.push({ id: 'left-nodate', sev: 'low', count: gn.nodate.length, fillPreset: 'left-date', fillIds: gn.nodate.map(x => x.rr.id), title: 'Marked Left in the workforce file but without a Left Date', sub: 'Without the date the dashboard cannot tell which days to mark. Use “Fill in one place…” to type all the Left Dates in one table and save once, or open one person. (They are not added to new months either way. Moved people need no date.)', items: gn.nodate.slice(0, 40).map(x => ({ k: x.p.key, emp: true, text: `${x.p.name} · status ${rosterStatus(x.rr)}` })) });
  }
  healthIssues.c = { ver: S.ver + '|' + rosterVer() + '|' + clientOkList().length, v: issues }; return issues;
}
function healthView() {
  const h = S.ui.health, np = hasRoster() ? fixRows().list.length : 0;
  const tb = (t, l, n) => `<button class="htab" role="tab" data-act="health-tab" data-t="${t}" aria-selected="${h.tab === t}">${l}${n != null ? ` <b>${n}</b>` : ''}</button>`;
  return `<div class="htabs" role="tablist">${tb('checks', 'Checks')}${hasRoster() ? tb('people', 'Fix people in one place', np) : ''}</div>` + (h.tab === 'people' && hasRoster() ? fixPeopleView() : checksView());
}
const FIXF = { ids: 'noid', client: 'noclient', 'roster-none': 'unlinked', 'roster-sync': 'differs' };
function checksView() {
  const issues = healthIssues(); const act = issues.filter(i => i.count);
  const sev = { high: 'Fix first', med: 'Worth fixing', low: 'Tidy-up', info: 'FYI' };
  const li = i => `<details class="issue"><summary><span class="tag ${i.sev === 'high' ? 'crit' : ''}">${sev[i.sev]}</span><div class="ttl"><b>${esc(i.title)}</b><span>${esc(i.sub)}</span></div><b class="num" style="font-size:18px">${i.count}</b>${i.fix && i.fixLabel ? `<button class="btn sm primary" data-act="${i.fix}">${esc(i.fixLabel)}</button>` : ''}${FIXF[i.id] && i.count && hasRoster() ? `<button class="btn sm ${i.fix && i.fixLabel ? '' : 'primary'}" data-act="open-fix" data-f="${FIXF[i.id]}">Fix in one place…</button>` : ''}${i.fillPreset && i.count && typeof openFill === 'function' ? `<button class="btn sm primary" data-act="open-fill" data-i="${i.id}">Fill in one place…</button>` : ''}</summary>
      ${i.items.length ? `<div class="inner"><table>${i.items.map(x => `<tr><td>${esc(x.text)}</td><td style="text-align:right;white-space:nowrap">${x.unlink ? `<button class="btn sm" data-act="unlink" data-k="${esc(x.unlink)}">Unlink</button>` : x.link ? `<button class="btn sm primary" data-act="link-person" data-k="${esc(x.k)}">Link to workforce…</button> <button class="btn sm" data-act="person" data-k="${esc(x.k)}">Open person</button>` : x.track != null ? `<button class="btn sm primary" data-act="track-one" data-id="${esc(x.track)}">Track attendance</button> <button class="btn sm" data-act="link-roster" data-id="${esc(x.track)}" title="They are already in the tracker under a different spelling">Link to a tracker name…</button>` : x.emp ? `<button class="btn sm" data-act="open-emp" data-k="${esc(x.k)}">Open in workforce</button>` : x.r ? `<button class="btn sm" data-act="edit-row" data-r="${x.r.uid}">Open row</button>` : x.k ? `<button class="btn sm" data-act="person" data-k="${esc(x.k)}">Open person</button>` : ''}</td></tr>`).join('')}</table>${i.count > i.items.length && i.items.length >= 40 ? `<div class="sm muted" style="padding-top:6px">Showing the first ${i.items.length}.</div>` : ''}</div>` : ''}</details>`;
  return `<div class="card" style="margin-bottom:14px;display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:260px"><h2 style="font-size:16px">${act.length ? `${act.length} thing${act.length > 1 ? 's' : ''} worth a look` : 'Your tracker looks clean'}</h2><div class="sub" style="margin:0">Checked ${S.rows.length.toLocaleString()} rows and ${(S.rows.length * 31).toLocaleString()} day cells. One-click fixes are applied to the dashboard first, so you can review them and Undo before saving to Excel.</div></div></div>
    ${act.map(li).join('') || '<div class="empty">Nothing to fix.</div>'}
    ${issues.filter(i => !i.count).length ? `<div class="sm muted" style="margin-top:10px">Passed: ${issues.filter(i => !i.count).map(i => esc(i.title)).join(' · ')}</div>` : ''}`;
}

/* ---------- ACTIVITY (past 30 days) ---------- */
const ACT_VERBS = { 'att-link': 'linked', 'att-unlink': 'unlinked', 'att-edit': 'updated attendance for', 'att-add': 'added to the tracker:', 'att-delete': 'removed from the tracker:', attendance: 'saved attendance changes to',
  add: 'added', edit: 'edited', delete: 'deleted', bulk: 'updated', 'add-column': 'added a column', login: 'signed in', download: 'downloaded a copy of the Excel file',
  'external-edit': 'changed', 'external-add': 'added', 'external-delete': 'removed', 'external-columns': 'changed the columns', 'external-summary': 'changed' };
const isExt = it => /^external-/.test(it.action || '');
const isAtt = it => !!it.att || it.action === 'attendance' || /att-/.test(it.action || '');
const actType = it => (String(it.action || '').replace(/^external-/, '').replace(/^att-/, '') || 'other');
const actVerb = it => ACT_VERBS[it.action] || ACT_VERBS[String(it.action).replace(/^external-/, '')] || String(it.action || '').replace(/^external-/, '').replace(/-/g, ' ');
async function loadActivity() {
  const A = S.act; if (A.loading) return; A.loading = true; A.err = ''; render();
  try { A.items = await BE.readActivity(); } catch (e) { A.items = []; A.err = e.message || String(e); }
  A.loading = false; render();
}
function actFiltered(skipUser) {
  const u = S.ui.act, q = u.q.trim().toLowerCase();
  return (S.act.items || []).filter(it => (u.wb === 'all' || (u.wb === 'att') === isAtt(it)) && (skipUser || u.user === 'all' || it.user === u.user)
    && (u.via === 'all' || (u.via === 'excel') === isExt(it)) && (u.type === 'all' || actType(it) === u.type)
    && (!q || (String(it.name || '') + ' ' + (it.key ?? '') + ' ' + (it.user || '') + ' ' + ((it.details && it.details.note) || '')).toLowerCase().includes(q)));
}
function actDetail(it) {
  const d = it.details || {}, cell = v => (v == null || String(v).trim() === '' ? '<i>(blank)</i>' : `<b>${esc(String(v).trim())}</b>`);
  if (Array.isArray(d.cells) && d.cells.length) {
    const cs = d.cells.map(([i, a, b]) => `<span class="cchg"><b>${esc(dayShort(it.ms, i))}</b> ${cell(a)} → ${cell(b)}</span>`).join('');
    const fs = Object.entries(d.fields || {}).map(([k, v]) => `<span class="cchg">${esc(k)}: ${cell(v[0])} → ${cell(v[1])}</span>`).join('');
    return `<div class="chgs"><span class="muted sm">${esc(monthLabel(it.ms))}</span>${cs}${fs}</div>`;
  }
  if (!isAtt(it) && (it.action === 'edit' || it.action === 'external-edit')) {
    const label = c => { try { return state.idx[c] != null ? state.cols[state.idx[c]].label : c; } catch { return c; } };
    const val = (c, v) => { try { return v == null || String(v) === '' ? '<i>(blank)</i>' : `<b>${esc(state.idx[c] != null && state.cols[state.idx[c]].type === 'date' ? fmtDate(v) : String(v))}</b>`; } catch { return cell(v); } };
    const ch = Object.entries(d).filter(([c, v]) => c !== 'note' && v && typeof v === 'object' && 'to' in v);
    if (ch.length) return `<div class="chgs">${ch.slice(0, 8).map(([c, v]) => `<span class="cchg">${esc(label(c))}: ${val(c, v.from)} → ${val(c, v.to)}</span>`).join('')}${ch.length > 8 ? `<span class="muted sm">+${ch.length - 8} more</span>` : ''}</div>`;
  }
  return d.note ? `<div class="chgs"><span class="muted sm">${esc(d.note)}</span></div>` : '';
}
function activityView() {
  const A = S.act, u = S.ui.act;
  if (A.items == null && !A.loading) setTimeout(loadActivity, 0);
  const me = BE.userName(), head = `<div class="toolbar"><h2 style="margin:0;font-size:16px">Activity · past 30 days</h2><span class="grow"></span>
      <span class="sm muted">Your changes are logged as <b>${esc(me)}</b></span><button class="btn sm" data-act="ask-name">${me === 'You' ? 'Set your name' : 'Change name'}</button>
      <button class="btn sm" data-act="act-refresh">Refresh</button><button class="btn sm" data-act="act-csv"${A.items && A.items.length ? '' : ' disabled'}>Download CSV</button></div>`;
  if (A.items == null) return head + '<div class="card"><div class="empty">Loading activity…</div></div>';
  const all = actFiltered(true), items = actFiltered(false), users = [...new Set((S.act.items || []).filter(it => u.wb === 'all' || (u.wb === 'att') === isAtt(it)).map(i => i.user || 'Unknown'))].sort();
  const sel = (b, val, opts) => `<select data-bind="${b}">${opts.map(([v, l]) => `<option value="${esc(v)}"${val === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const emp = new Set(items.filter(it => it.name && !/^\d+ (rows|employee)/.test(it.name)).map(it => personKey(it.name)));
  const days = items.reduce((a, it) => a + ((it.details && it.details.cells && it.details.cells.length) || 0), 0);
  const tile = (l, v) => `<div class="card tile"><div class="lbl">${l}</div><div class="val">${v}</div></div>`;
  let list = '', last = '';
  const today = isoDate(TODAY), yest = isoDate(new Date(TODAY.getTime() - 86400000));
  for (const it of items.slice(0, u.shown)) {
    const dk = String(it.time || '').slice(0, 10);
    if (dk !== last) { last = dk; const dd = new Date(dk + 'T00:00:00Z'); list += `<div class="act-day">${dk === today ? 'Today' : dk === yest ? 'Yesterday' : isNaN(dd) ? esc(dk) : longDate(dd)}</div>`; }
    const person = isAtt(it) && it.name ? D(true).people.get(personKey(it.name)) : null;
    const nm = it.name ? (person ? `<button class="linkbtn" data-act="person" data-k="${esc(person.key)}">${esc(it.name)}</button>` : `<b>${esc(it.name)}</b>`) : '';
    list += `<div class="act-item"><div class="act-line"><span><b>${esc(it.user || 'Unknown')}</b>${isExt(it) ? '<span class="xbadge" title="Made directly in Excel, not in the dashboard. The name is who last saved the file in Excel.">IN EXCEL</span>' : ''}${isAtt(it) ? '' : '<span class="wbadge" title="Workforce workbook">WORKFORCE</span>'} ${esc(actVerb(it))} ${nm}${it.key !== '' && it.key != null && isAtt(it) && !/^\d+ /.test(it.name || '') ? ` <span class="muted sm">${esc(it.key)}</span>` : ''}</span><span class="muted sm">${esc(String(it.time || '').slice(11, 16))}</span></div>${actDetail(it)}</div>`;
  }
  const more = items.length > u.shown ? `<div style="text-align:center;padding:10px"><button class="btn" data-act="act-more">Show more (${items.length - u.shown} remaining)</button></div>` : '';
  return head + `<div class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">${tile('CHANGES', items.length)}${tile('PEOPLE WHO CHANGED THINGS', new Set(items.map(i => i.user)).size)}${tile('EMPLOYEES AFFECTED', emp.size)}${tile('DAY ENTRIES CHANGED', days)}</div>
    <div class="toolbar">${sel('awb', u.wb, [['att', 'Attendance workbook'], ['wf', 'Workforce workbook'], ['all', 'Both workbooks']])}${sel('auser', u.user, [['all', 'Everyone'], ...users.map(x => [x, x])])}${sel('avia', u.via, [['all', 'Dashboard and Excel'], ['dash', 'Made in the dashboard'], ['excel', 'Made directly in Excel']])}${sel('atype', u.type, [['all', 'All changes'], ['edit', 'Edits'], ['add', 'Added'], ['delete', 'Removed'], ['link', 'Links']])}
      <input type="search" placeholder="Search employee, ID or user" value="${esc(u.q)}" data-bind="aq" style="width:290px"><span class="grow"></span><span class="sm muted">${items.length} of ${all.length}${u.user !== 'all' ? ' for ' + esc(u.user) : ''}</span></div>
    ${A.err ? `<div class="card err" style="margin-bottom:12px">${esc(A.err)}</div>` : ''}
    <div class="card" style="padding:0">${items.length ? `<div class="act-list">${list}</div>${more}` : `<div class="empty">${(S.act.items || []).length ? 'Nothing matches these filters.' : 'No recorded activity in the past 30 days yet.'}</div>`}</div>
    <p class="sm muted" style="margin-top:12px">Every save from this dashboard is logged with the day-by-day change and the name above. Changes made directly in Excel are found the next time the dashboard opens the file and are credited to whoever last saved it in Excel, so if several people saved in between only the last one is named. History starts when tracking began: earlier edits cannot be recovered from the file (use Excel or OneDrive version history for those). The log lives in this browser’s private storage for this workbook pair.</p>`;
}

const VIEWS = { reports: reportsView, who: whoView, grid: gridView, people: peopleView, activity: activityView, health: healthView };

/* ==========================================================================
   FIX PEOPLE - link names, Emp IDs and clients for many people in one table, then apply once
   (Attendance data health > Fix people). Everything is pre-filled from the workforce file.
   ========================================================================== */
const FIX = { edits: new Map(), opts: null, byLabel: null, limit: 200 };
const rName = rr => gs(rr, 'name_column').trim().replace(/\s+/g, ' ');
const rCode = rr => gs(rr, 'key_column').trim();
const rClient = rr => gs(rr, 'client_column').trim();

/* every workforce person as a pickable label ("Chanchal Bharat Soni · 800712345") */
function fixOptions() {
  const key = S.ver + '|' + rosterVer() + '|' + rosterRows().length; if (FIX.opts && FIX.opts.key === key) return FIX.opts;
  const byLabel = new Map(), labelOf = new Map(), seen = new Set();
  for (const rr of rosterRows()) {
    const nm = rName(rr); if (!nm) continue;
    let l = `${nm} · ${rCode(rr) || 'no code'}`; if (seen.has(l)) l += ` · ${rosterStatus(rr) || 'no status'}`; let n = 2; while (seen.has(l)) l = l.replace(/ #\d+$/, '') + ' #' + n++;
    seen.add(l); byLabel.set(l, rr); labelOf.set(rr.id, l);
  }
  return FIX.opts = { key, byLabel, labelOf, labels: [...byLabel.keys()].sort((a, b) => a.localeCompare(b)) };
}

/* v3.12: people who work without a client. Shared with the whole team (Settings > Mandatory fields lists them). */
const clientOkList = () => (window.TD_SETTINGS && Array.isArray(window.TD_SETTINGS.client_not_needed) ? window.TD_SETTINGS.client_not_needed : []);
function clientNotNeeded(key, ids) {
  const L = clientOkList(); if (!L.length) return false;
  const want = new Set((ids || []).filter(v => v != null && v !== '').map(idKey));
  return L.some(x => (x.key && x.key === key) || (x.id && want.has(idKey(x.id))));
}
/* the tracker people that still need something: no workforce match, no Emp ID, no client, or a different name / ID than the workforce file */
function fixRows() {
  const key = S.ver + '|' + rosterVer() + '|' + rosterRows().length + '|' + (S.ui.health.all ? 1 : 0) + '|' + clientOkList().length;
  if (fixRows.c && fixRows.c.key === key) return fixRows.c;
  const d = D(true), recent = new Set(d.months.slice(-2)), cands = rosterRows().filter(r => rName(r));
  const usedBy = new Map(); for (const p of d.people.values()) { const m = rosterOfPerson(p); if (m && !usedBy.has(m.row.id)) usedBy.set(m.row.id, p.name); }
  const list = [], byKey = new Map();
  for (const p of d.people.values()) {
    if (!S.ui.health.all && !recent.has(p.latest.month)) continue;
    const m = rosterOfPerson(p), rr = m ? m.row : null;
    const noId = p.rows.some(r => r.empId == null || r.empId === ''), noClient = p.rows.some(r => !r.client) && !clientNotNeeded(p.key, [...p.ids]);
    const nm = p.name.trim().replace(/\s+/g, ' ');
    const diffName = !!rr && m.how !== 'link' && !!rName(rr) && nm !== rName(rr), diffId = !!rr && !!rCode(rr) && idKey(p.latest.empId) !== idKey(rCode(rr));
    const tags = []; if (!rr) tags.push('unlinked'); if (noId) tags.push('noid'); if (noClient) tags.push('noclient'); if (diffName || diffId) tags.push('differs');
    if (!tags.length) continue;
    let sugg = null;
    if (!rr) {
      let best = null, second = 0;
      for (const c of cands) { if (usedBy.has(c.id)) continue; let sc = nameScore(p.name, rName(c)); if (sc < 0.5) continue; if (isTracked(c)) sc += 0.01; if (!best || sc > best.score) { second = best ? best.score : 0; best = { rr: c, score: sc }; } else if (sc > second) second = sc; }
      if (best && best.score >= 0.6) sugg = { rr: best.rr, score: best.score, sure: best.score >= 0.85 && best.score - second >= 0.1 };
    }
    const x = { p, key: p.key, rr, how: m ? m.how : null, sugg, noId, noClient, diffName, diffId, tags, gone: rr ? goneKind(rr) : null };
    list.push(x); byKey.set(x.key, x);
  }
  list.sort((a, b) => (a.tags.includes('unlinked') === b.tags.includes('unlinked') ? 0 : a.tags.includes('unlinked') ? -1 : 1) || a.p.name.localeCompare(b.p.name));
  return fixRows.c = { key, list, byKey, usedBy };
}

/* what the row is set to do: the edit (created from the pre-filled suggestion the first time) */
function fixDefaults(x, e) {
  const t = e.rr;
  if (!e.idTouched) e.id = t && rCode(t) && (x.noId || idKey(x.p.latest.empId) !== idKey(rCode(t))) ? rCode(t) : '';
  if (!e.clientTouched) e.client = x.noClient && t && rClient(t) ? rClient(t) : '';
}
function fixEdit(x) {
  let e = FIX.edits.get(x.key);
  if (!e) {
    e = { rr: x.rr || (x.sugg ? x.sugg.rr : null), id: '', idTouched: false, client: '', clientTouched: false, rename: false, on: false };
    fixDefaults(x, e);
    e.on = x.rr ? !!(e.id || e.client) : !!(x.sugg && x.sugg.sure);   // matched people: fill from the workforce file. Unmatched: only the confident suggestions start ticked.
    FIX.edits.set(x.key, e);
  }
  return e;
}
/* the concrete changes a row would make */
function fixOps(x, e) {
  const t = e.rr, ops = { link: null, id: null, client: null, rename: false };
  if (t && (!x.rr || t.id !== x.rr.id)) ops.link = t;
  const idv = parseId(e.id); if (idv != null && x.p.rows.some(r => idKey(r.empId) !== idKey(idv))) ops.id = idv;
  const cl = e.client.trim(); if (cl && x.noClient) ops.client = cl;
  if (e.rename && t && rName(t) && (rName(t) !== x.p.name.trim().replace(/\s+/g, ' ') || (rCode(t) && x.p.rows.some(r => idKey(r.empId) !== idKey(rCode(t)))))) ops.rename = true;
  return ops;
}
const fixAny = o => !!(o.link || o.id != null || o.client || o.rename);
function fixTotals() {
  const R = fixRows(), t = { rows: 0, link: 0, id: 0, client: 0, rename: 0 };
  for (const x of R.list) { const e = fixEdit(x); if (!e.on) continue; const o = fixOps(x, e); if (!fixAny(o)) continue; t.rows++; if (o.link) t.link++; if (o.id != null) t.id++; if (o.client) t.client++; if (o.rename) t.rename++; }
  return t;
}
const fixSummary = t => t.rows ? `${t.rows} ${t.rows === 1 ? 'person' : 'people'} ticked: ${[t.link && `${t.link} to link`, t.id && `${t.id} Emp ID${t.id === 1 ? '' : 's'}`, t.client && `${t.client} client${t.client === 1 ? '' : 's'}`, t.rename && `${t.rename} to rename`].filter(Boolean).join(' · ')}` : 'Nothing ticked yet. Tick the people you want to fix.';

function fixRowHtml(x) {
  const e = fixEdit(x), O = fixOptions(), R = fixRows(), o = fixOps(x, e), t = e.rr;
  const how = { link: 'linked', id: 'matched by Emp ID', name: 'matched by name', words: 'matched by name words' }[x.how] || '';
  const other = t && R.usedBy.get(t.id) && R.usedBy.get(t.id) !== x.p.name && (!x.rr || x.rr.id !== t.id) ? R.usedBy.get(t.id) : '';
  const cur = [...x.p.ids][0];
  let state;
  if (x.rr && (!t || t.id === x.rr.id)) state = `<span class="tag ok">${how}</span>`;
  else if (t && x.sugg && t.id === x.sugg.rr.id) state = x.sugg.sure ? '<span class="tag">likely</span>' : '<span class="tag warn">possible</span>';
  else if (t) state = '<span class="tag">chosen</span>';
  else state = '<span class="tag crit">not linked</span>';
  if (x.gone) state += ` <span class="tag">${x.gone === 'left' ? 'Left' : 'Moved'}</span>`;
  const clientEditable = x.noClient;
  return `<tr data-fk="${esc(x.key)}" class="${e.on ? 'on' : ''}">
    <td><input type="checkbox" data-fix="on" aria-label="Apply to ${esc(x.p.name)}" ${e.on ? 'checked' : ''}></td>
    <td><b>${esc(x.p.name)}</b><div class="sm muted">${esc(cur ?? 'no Emp ID')} · ${esc(x.p.latest.client || 'no client')} · last row ${monthLabel(x.p.latest.month)}</div></td>
    <td><input type="text" list="fixRoster" data-fix="rr" value="${esc(t ? O.labelOf.get(t.id) || '' : '')}" placeholder="Type a name from the workforce file" autocomplete="off" aria-label="Workforce person for ${esc(x.p.name)}"><div class="sm" data-fix-state>${state}${other ? ` <span class="warn-t">also matched to “${esc(other)}”</span>` : ''}</div></td>
    <td><input type="text" data-fix="id" value="${esc(e.id)}" placeholder="${esc(x.noId || !cur ? 'Emp ID' : String(cur))}" ${!x.noId && !e.id && !x.diffId ? 'title="Already has an Emp ID"' : ''} inputmode="numeric" aria-label="Emp ID for ${esc(x.p.name)}"></td>
    <td><input type="text" list="fixClients" data-fix="client" value="${esc(clientEditable ? e.client : (x.p.latest.client || ''))}" placeholder="Client" ${clientEditable ? '' : 'disabled title="Already has a client"'} aria-label="Client for ${esc(x.p.name)}">${clientEditable && attCanWrite() ? `<button class="linkbtn sm" data-act="fix-noclient" data-k="${esc(x.key)}" title="Keep ${esc(x.p.name)} without a client and stop listing them here">No client needed</button>` : ''}</td>
    <td style="text-align:center"><input type="checkbox" data-fix="rename" ${e.rename ? 'checked' : ''} ${t && (x.diffName || (t && rName(t) !== x.p.name.trim().replace(/\s+/g, ' ')) || x.diffId) ? '' : 'disabled'} title="Rewrite this person’s name and Emp ID in the tracker to match the workforce file" aria-label="Use the workforce name for ${esc(x.p.name)}"></td>
  </tr>`;
}

function fixPeopleView() {
  if (!hasRoster()) return `<div class="card"><div class="empty">The workforce file has no employees to match against.</div></div>`;
  const R = fixRows(), h = S.ui.health, q = h.q.trim().toLowerCase(), O = fixOptions();
  const n = f => R.list.filter(x => f === 'all' || x.tags.includes(f)).length;
  const shown = R.list.filter(x => (h.f === 'all' || x.tags.includes(h.f)) && (!q || (x.p.name + ' ' + [...x.p.ids].join(' ')).toLowerCase().includes(q)));
  const chip = (f, l) => `<button class="fchip ${h.f === f ? 'on' : ''}" data-act="fix-filter" data-f="${f}">${l} <b>${n(f)}</b></button>`;
  const clients = [...new Set(S.rows.map(r => r.client).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const t = fixTotals(), rows = shown.slice(0, FIX.limit);
  return `<div class="card fix">
    <h2 style="font-size:16px;margin:0 0 2px">Fix people in one place</h2>
    <div class="sub" style="margin:0 0 10px">One row per tracker person who still needs something. The table is pre-filled from the workforce file: the best name match (marked <span class="tag">likely</span>), the Emp ID and the client. Change anything, tick the people you want, then apply once. Names, Emp IDs and clients are written into the tracker rows, the name links are remembered in this browser for these workbooks.</div>
    <div class="fixtools">${chip('all', 'Everyone')}${chip('unlinked', 'Not linked')}${chip('noid', 'Missing Emp ID')}${chip('noclient', 'Missing client')}${chip('differs', 'Name / ID differs')}
      <span class="grow"></span><input type="search" data-bind="hq" placeholder="Search name or ID" value="${esc(h.q)}" style="width:200px"><label class="chk sm"><input type="checkbox" data-bind="hall" ${h.all ? 'checked' : ''}> include people not seen in the last 2 months</label></div>
    ${rows.length ? `<div class="fixwrap"><table class="fixtbl"><thead><tr><th style="width:34px"><input type="checkbox" data-act="fix-tick-all" aria-label="Tick everyone shown" ${shown.length && shown.every(x => FIX.edits.get(x.key)?.on) ? 'checked' : ''}></th><th>In the tracker</th><th>Workforce person (link)</th><th style="width:130px">Emp ID</th><th style="width:150px">Client</th><th style="width:70px;text-align:center" title="Rewrite the tracker name and Emp ID to match the workforce file">Rename</th></tr></thead><tbody>${rows.map(fixRowHtml).join('')}</tbody></table></div>
      ${shown.length > rows.length ? `<div class="sm muted" style="margin-top:8px">Showing ${rows.length} of ${shown.length}. <button class="linkbtn" data-act="fix-more">Show ${Math.min(200, shown.length - rows.length)} more</button></div>` : ''}`
      : `<div class="empty">${R.list.length ? 'Nobody matches this filter.' : 'Every person in the tracker is linked to the workforce file and has an Emp ID and a client. Nothing to fix.'}</div>`}
    <datalist id="fixRoster">${O.labels.map(l => `<option value="${esc(l)}"></option>`).join('')}</datalist><datalist id="fixClients">${clients.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>
    <div class="fixbar"><span id="fixSum" class="sm">${esc(fixSummary(t))}</span><span class="grow"></span>
      <button class="btn sm" data-act="fix-suggest" title="Tick every row that has a likely match or something to fill in from the workforce file">Tick all likely</button>
      <button class="btn sm" data-act="fix-untick">Untick all</button>
      <button class="btn" data-act="fix-apply" id="fixApply" ${t.rows ? '' : 'disabled'}>Apply to tracker</button>
      <button class="btn primary" data-act="fix-apply-save" id="fixApplySave" ${t.rows ? '' : 'disabled'}>Apply and save to Excel</button></div>
  </div>`;
}

/* ---- live editing inside the table (no re-render, so focus stays where it is) ---- */
function fixInput(el, ev) {
  const tr = el.closest('tr'), x = tr && fixRows().byKey.get(tr.dataset.fk); if (!x) return;
  const e = fixEdit(x), k = el.dataset.fix, O = fixOptions(), isChange = ev.type === 'change';
  const cb = () => tr.querySelector('[data-fix="on"]');
  if (k === 'on') { e.on = el.checked; }
  else if (k === 'rr') {
    const v = el.value.trim(), hit = O.byLabel.get(el.value) || O.byLabel.get(v);
    if (hit) { e.rr = hit; e.on = true; fixDefaults(x, e); }
    else if (!v && isChange) { e.rr = null; fixDefaults(x, e); }
    else if (isChange) { el.value = e.rr ? O.labelOf.get(e.rr.id) || '' : ''; toast('Pick a name from the list of workforce people.'); }
    else return;
  }
  else if (k === 'id') { e.id = el.value; e.idTouched = true; e.on = true; }
  else if (k === 'client') { e.client = el.value; e.clientTouched = true; e.on = true; }
  else if (k === 'rename') { e.rename = el.checked; if (e.rename) e.on = true; }
  fixRefreshRow(tr, x, e); fixRefreshBar();
}
function fixRefreshRow(tr, x, e) {
  const ff = tr.getRootNode().activeElement;   // shadow root: activeElement lives on the root
  const set = (k, v) => { const i = tr.querySelector(`[data-fix="${k}"]`); if (i && i !== ff && i.value !== v) i.value = v; };
  const O = fixOptions(); set('rr', e.rr ? O.labelOf.get(e.rr.id) || '' : ''); set('id', e.id); if (x.noClient) set('client', e.client);
  tr.classList.toggle('on', !!e.on); const c = tr.querySelector('[data-fix="on"]'); if (c) c.checked = !!e.on;
  const r = tr.querySelector('[data-fix="rename"]'), t = e.rr; if (r) { r.disabled = !(t && (x.diffName || rName(t) !== x.p.name.trim().replace(/\s+/g, ' ') || x.diffId)); if (r.disabled) { r.checked = false; e.rename = false; } }
  const tmp = document.createElement('tbody'); tmp.innerHTML = fixRowHtml(x); const st = tmp.querySelector('[data-fix-state]'), cur = tr.querySelector('[data-fix-state]'); if (st && cur) cur.innerHTML = st.innerHTML;
}
function fixRefreshBar() {
  const t = fixTotals(), s = $('#fixSum'); if (s) s.textContent = fixSummary(t);
  for (const id of ['fixApply', 'fixApplySave']) { const b = $('#' + id); if (b) b.disabled = !t.rows || S.saving; }
  const all = $('[data-act="fix-tick-all"]'); if (all) { const R = fixRows(); const shown = $$('.fixtbl tbody tr'); all.checked = shown.length > 0 && shown.every(tr => FIX.edits.get(tr.dataset.fk)?.on); }
}

/* ---- apply ---- */
async function fixApply(saveNow) {
  const R = fixRows(), plan = [];
  for (const x of R.list) { const e = fixEdit(x); if (!e.on) continue; const o = fixOps(x, e); if (fixAny(o)) plan.push({ x, e, o }); }
  if (!plan.length) { toast('Nothing to apply. Tick the people you want to fix, or fill in a workforce name, Emp ID or client.'); return; }
  if (saveNow && S.changes.length && !(await confirmBox('Save your other changes too?', `The attendance tracker already has ${S.changes.length} unsaved change${S.changes.length === 1 ? '' : 's'}. They are saved together with these fixes.`, 'Apply and save'))) return;
  const links = plan.filter(p => p.o.link).map(p => ({ name: p.x.p.name, rr: p.o.link }));
  await addLinks(links);
  const byKey = new Map(plan.map(p => [p.x.key, p])); let nId = 0, nCl = 0, nRn = 0; const idDone = new Set(), clDone = new Set(), rnDone = new Set();
  mutate(`Fixed ${plan.length} ${plan.length === 1 ? 'person' : 'people'} in one go (${links.length} links, names, Emp IDs, clients)`, () => {
    for (const r of S.rows) {
      const p = byKey.get(personKey(r.name)); if (!p) continue; const { o } = p;
      if (o.client && !r.client) { r.client = o.client; clDone.add(p.x.key); }
      if (o.id != null && idKey(r.empId) !== idKey(o.id)) { r.empId = o.id; idDone.add(p.x.key); }
      if (o.rename) { const t = p.e.rr, id = parseId(rCode(t)); if (rName(t) && r.name !== rName(t)) { r.name = rName(t); rnDone.add(p.x.key); } if (o.id == null && id != null && idKey(r.empId) !== idKey(id)) { r.empId = id; idDone.add(p.x.key); } }
    }
    nId = idDone.size; nCl = clDone.size; nRn = rnDone.size;
    if (!nId && !nCl && !nRn) return false;
  });
  for (const p of plan) FIX.edits.delete(p.x.key);
  fixRows.c = null; notify(); render();
  const bits = [links.length && `${links.length} linked`, nId && `${nId} Emp ID${nId === 1 ? '' : 's'} set`, nCl && `${nCl} client${nCl === 1 ? '' : 's'} filled`, nRn && `${nRn} renamed`].filter(Boolean).join(', ');
  if (saveNow && S.changes.length) { await save(); toast(`Fixed ${plan.length} ${plan.length === 1 ? 'person' : 'people'}: ${bits}.${S.changes.length ? '' : ' Saved to Excel.'}`); }
  else toast(`Fixed ${plan.length} ${plan.length === 1 ? 'person' : 'people'}: ${bits}.${S.changes.length ? (S.auto ? ' Saving to Excel in a few seconds.' : ' Review, then Save to Excel.') : ''}`, S.changes.length ? { act: 'undo', label: 'Undo' } : undefined);
}

/* ==========================================================================
   EDITORS, ACTIONS, EVENTS, INIT
   ========================================================================== */
const rowByUid = u => S.rows.find(r => r.uid === +u);
function insertRow(row) {
  let idx = -1; for (let i = S.rows.length - 1; i >= 0; i--) if (S.rows[i].month === row.month) { idx = i; break; }
  if (idx >= 0) { S.rows.splice(idx + 1, 0, row); return; }
  const nx = S.rows.findIndex(r => r.month > row.month); if (nx >= 0) S.rows.splice(nx, 0, row); else S.rows.push(row);
}
const parseId = v => { v = String(v ?? '').trim(); if (!v) return null; return /^\d{1,15}$/.test(v) ? Number(v) : v; };
const knownCode = v => !!CODES[String(v).trim().toUpperCase()];

/* ---------- employees come from the workforce file ---------- */
function pseudoPerson(rr) { const nm = gs(rr, 'name_column').trim(); return { key: personKey(nm), name: nm, rows: [], ids: new Set([gs(rr, 'key_column').trim()]), latest: { client: gs(rr, 'client_column') }, roster: rr }; }
function resolvePerson(name) {
  const d = D(true), direct = d.people.get(personKey(name)); if (direct) return direct;
  if (!hasRoster()) return null;
  const m = rosterMatch(null, name); if (!m) return null;
  return personForRoster(m.row) || pseudoPerson(m.row);
}
/* name, Emp ID and client for a new row: the workforce file wins, the tracker's own values are the fallback */
function identityOf(p) {
  const rr = p.roster || (rosterOfPerson(p) || {}).row;
  if (rr) return { name: gs(rr, 'name_column').trim() || p.name, empId: parseId(gs(rr, 'key_column')), client: gs(rr, 'client_column') || (p.latest && p.latest.client) || '' };
  return { name: p.name, empId: [...p.ids][0] != null ? parseId([...p.ids][0]) : null, client: (p.latest && p.latest.client) || '' };
}
function employeeNames() {
  const out = new Map();
  if (hasRoster()) for (const r of rosterRows()) { if (isGone(r)) continue; const nm = gs(r, 'name_column').trim(); if (nm) out.set(personKey(nm), { name: nm, hint: `${gs(r, 'key_column')} · ${rosterStatus(r) || 'no status'}` }); }
  for (const p of D(true).people.values()) if (!out.has(p.key)) out.set(p.key, { name: p.name, hint: hasRoster() ? 'tracker only, not in workforce' : [...p.ids][0] || '' });
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- modal infra ---------- */
function closeModal() { $('#modalRoot')?.remove(); document.getElementById('attModalPortal')?.remove(); }
function openModal({ title, body, footer, wide }) {
  closeModal();
  const v = document.createElement('div'); v.className = 'veil'; v.id = 'modalRoot';
  v.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h3>${esc(title)}</h3><button class="btn ghost sm" data-close aria-label="Close">${ic('x')}</button></header><div class="body">${body}</div><footer>${footer}</footer></div>`;
  v.addEventListener('mousedown', e => { if (e.target === v) v._down = true; }); v.addEventListener('click', e => { if (e.target === v && v._down) closeModal(); if (e.target.closest('[data-close]')) closeModal(); });
  if (active()) ROOT.appendChild(v);
  else { const portal = document.createElement('div'); portal.id = 'attModalPortal'; document.body.append(portal); const shadow = portal.attachShadow({mode:'open'}); const style = document.createElement('style'); style.textContent = ATT_CSS; shadow.append(style, v); }
  return v;
}

/* ---------- day-cell popover ---------- */
function closePop() { $('#pop')?.remove(); $$('td.selected').forEach(t => t.classList.remove('selected')); }
function openPop(td) {
  closePop(); tipEl().classList.remove('on'); const row = rowByUid(td.dataset.r), i = +td.dataset.d; if (!row) return; td.classList.add('selected');
  const cur = row.days[i] == null ? '' : String(row.days[i]).trim().toUpperCase();
  const p = document.createElement('div'); p.className = 'pop'; p.id = 'pop';
  p.innerHTML = `<h4>${esc(row.name.trim())} · ${longDate(dateOf(row.month, i))}</h4>
    <input type="text" id="popIn" placeholder="Type a code, then Enter" autocomplete="off" value="${esc(cur)}" aria-label="Attendance code">
    <div class="codes">${PICK.map(c => `<button data-code="${c}" class="${c === cur ? 'sel' : ''}" title="${esc(CODES[c].label)}">${chip(c)}</button>`).join('')}<button data-code="" title="Clear the cell. Blank means present (P), or week off on Sat / Sun"><div class="chip cat-present">Clear</div></button></div>
    <div class="foot"><span class="sm muted" id="popMsg">${cur ? esc(labelOf(cur)) : (impliedCode(row.month, i) === 'WO' ? 'Blank: week off (Sat / Sun)' : 'Blank: counts as present (P)')}</span><button class="btn sm" data-edit="${row.uid}">Edit row…</button></div>`;
  ROOT.appendChild(p);
  const r = td.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight; let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.bottom + 6; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6); p.style.left = x + 'px'; p.style.top = y + 'px';
  const inp = $('#popIn', p); inp.focus(); inp.select();
  const apply = code => {
    const old = row.days[i]; const nv = code === '' ? null : code; if ((old ?? null) === nv) { closePop(); return; }
    closePop(); mutate(`${row.name.trim()} · ${longDate(dateOf(row.month, i))}: ${old ?? 'blank'} → ${nv ?? 'blank'}`, () => setDay(row, i, code), { cells: true });
  };
  p.addEventListener('click', e => { const b = e.target.closest('[data-code]'); if (b) apply(b.dataset.code); const ed = e.target.closest('[data-edit]'); if (ed) { closePop(); openRowEditor(+ed.dataset.edit); } });
  inp.addEventListener('input', () => { const v = inp.value.trim().toUpperCase(); $('#popMsg', p).textContent = !v ? 'Enter clears the cell (blank = present)' : knownCode(v) ? labelOf(v) : 'Unknown code'; });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = inp.value.trim().toUpperCase(); if (!v || knownCode(v)) apply(v); else $('#popMsg', p).textContent = `“${v}” isn’t in your legend`; } });
}

/* ---------- row editor (add / edit / delete) ---------- */
function openRowEditor(uid, preset = {}) {
  const row = uid ? rowByUid(uid) : null; const d = D(true);
  const base = row || { month: preset.month ?? S.ui.grid.month ?? d.latestMonth, name: '', empId: null, client: '', days: new Array(31).fill(null), reg: null };
  const months = new Set(d.months); const nx = d.latestMonth ? (() => { const dt = Engine.serialToDate(d.latestMonth); return [1, 2].map(k => Engine.monthSerial(dt.getUTCFullYear(), dt.getUTCMonth() + k)); })() : []; nx.forEach(m => months.add(m)); months.add(base.month);
  const mlist = [...months].sort((a, b) => b - a);
  const names = employeeNames(); const clients = [...new Set(S.rows.map(r => r.client).filter(Boolean))].sort();
  const dayInputs = () => { const dim = Engine.daysInMonth(+$('#f-month').value); return Array.from({ length: 31 }, (_, i) => { const w = dow(+$('#f-month').value, i); return `<label class="${i >= dim ? 'off' : w % 6 === 0 ? 'wk' : ''}">${i + 1}<span class="muted" style="font-size:9px">${i < dim ? WEEKDAYS[w] : '–'}</span><input type="text" list="codelist" data-day="${i}" value="${esc(days[i] ?? '')}" ${i >= dim ? 'tabindex="-1"' : ''} maxlength="4" autocomplete="off"></label>`; }).join(''); };
  let days = base.days.slice();
  const m = openModal({
    title: row ? `Edit row · ${rowLabel(row)}` : 'Add employee row', wide: true,
    body: `<div class="form">
      <label>Month<select id="f-month">${mlist.map(x => `<option value="${x}" ${x === base.month ? 'selected' : ''}>${monthLabel(x)}</option>`).join('')}</select></label>
      <label>${hasRoster() ? 'Employee (from the workforce file)' : 'Recruiter name'}<input type="text" id="f-name" list="namelist" value="${esc(base.name)}" autocomplete="off" placeholder="Start typing a name to pick from the workforce"></label>
      <label>Emp ID<input type="text" id="f-id" value="${esc(base.empId ?? '')}" autocomplete="off"></label>
      <div class="full sm" id="f-src"></div>
      <label>Client<input type="text" id="f-client" list="clientlist" value="${esc(base.client)}" autocomplete="off"></label>
      <label>Regularizations<input type="number" id="f-reg" min="0" step="1" value="${base.reg ?? ''}"></label>
      ${attFieldNames().length ? `<div class="full"><b style="font-size:12px;color:var(--ink-2)">Extra fields</b><div class="xf-grid" style="margin-top:6px">${attFieldNames().map((n, k) => `<label>${esc(n)}<input type="text" data-xf="${k}" value="${esc((base.extra || {})[n] ?? '')}" autocomplete="off" ${can('att.edit') || can('att.fields') ? '' : 'disabled'}></label>`).join('')}</div></div>` : ''}
      <div class="full"><div style="display:flex;align-items:center;gap:8px;margin:2px 0 6px"><b style="font-size:12px;color:var(--ink-2)">Daily codes</b><span class="grow"></span><button class="btn sm" id="f-wo" type="button">Fill weekends with WO</button><button class="btn sm" id="f-clr" type="button">Clear all days</button></div><div class="dayedit" id="f-days"></div>
      <div class="sm muted" style="margin-top:6px">Leave empty for a normal working day. Codes: ${['AL', 'CL', 'SL', 'UL', 'AB', 'HD1', 'HD2', 'LA', 'L', 'C', 'R', 'WO', 'H', 'M', 'P', 'X', 'NA'].join(', ')}.</div></div></div>
      <datalist id="namelist">${names.map(n => `<option value="${esc(n.name)}">${esc(n.hint)}</option>`).join('')}</datalist><datalist id="clientlist">${clients.map(n => `<option value="${esc(n)}">`).join('')}</datalist><datalist id="codelist">${PICK.map(c => `<option value="${c}">`).join('')}</datalist>
      <div class="err" id="f-err" role="alert"></div>`,
    footer: `${row ? `<button class="btn danger" id="f-del">${ic('trash')} Delete this row</button>` : ''}<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn primary" id="f-save">${row ? 'Save changes' : 'Add row'}</button>`,
  });
  const draw = () => { $('#f-days', m).innerHTML = dayInputs(); };
  draw();
  m.addEventListener('input', e => { if (e.target.dataset.day != null) days[+e.target.dataset.day] = e.target.value.trim().toUpperCase() || null; });
  $('#f-month', m).addEventListener('change', draw);
  $('#f-wo', m).onclick = () => { const ms = +$('#f-month', m).value, dim = Engine.daysInMonth(ms); for (let i = 0; i < dim; i++) { const w = dow(ms, i); if (w % 6 === 0 && (days[i] == null || days[i] === '')) days[i] = 'WO'; } draw(); };
  $('#f-clr', m).onclick = () => { days = new Array(31).fill(null); draw(); };
  /* name, Emp ID and client come from the workforce file */
  const src = () => {
    const nm = $('#f-name', m).value.trim(), box = $('#f-src', m); if (!hasRoster() || !nm) { box.innerHTML = ''; return null; }
    const w = rosterMatch($('#f-id', m).value.trim() || null, nm);
    if (!w) { box.innerHTML = `<span class="tag crit">Not in the workforce file</span> <span class="muted">You can still save it, but Data health will flag it. Pick a name from the list to fill the ID and client automatically.</span>`; return null; }
    const r = w.row, wn = gs(r, 'name_column').trim(), wid = gs(r, 'key_column').trim();
    const same = wn === nm && idKey(wid) === idKey($('#f-id', m).value);
    box.innerHTML = `<span class="tag">${esc(rosterStatus(r) || 'Workforce')}</span> <span class="muted">${esc([gs(r, 'designation_column'), gs(r, 'client_column')].filter(Boolean).join(' · '))}</span>${same ? '' : ` <button class="btn sm" type="button" id="f-use">Use workforce name and ID (${esc(wn)} · ${esc(wid)})</button>`}`;
    return r;
  };
  let auto = null;
  const fill = r => { auto = { id: gs(r, 'key_column').trim(), client: gs(r, 'client_column') }; $('#f-name', m).value = gs(r, 'name_column').trim(); $('#f-id', m).value = gs(r, 'key_column').trim(); if (!row || !$('#f-client', m).value) $('#f-client', m).value = gs(r, 'client_column') || $('#f-client', m).value; src(); };
  $('#f-name', m).addEventListener('change', e => { const w = rosterMatch(null, e.target.value); if (!w && auto) { if ($('#f-id', m).value === auto.id) $('#f-id', m).value = ''; if ($('#f-client', m).value === auto.client) $('#f-client', m).value = ''; auto = null; } if (w && (!row || !$('#f-id', m).value || auto)) fill(w.row); else if (!row) { const p = d.people.get(personKey(e.target.value)); if (p) { if (!$('#f-id', m).value) $('#f-id', m).value = [...p.ids][0] ?? ''; if (!$('#f-client', m).value) $('#f-client', m).value = p.latest.client || ''; } src(); } else src(); });
  m.addEventListener('click', e => { if (e.target.id === 'f-use') { const w = rosterMatch($('#f-id', m).value.trim() || null, $('#f-name', m).value); if (w) fill(w.row); } });
  $('#f-id', m).addEventListener('change', src); src();
  if (!row) { const ms = +$('#f-month', m).value; if (days.every(x => x == null)) { const dim = Engine.daysInMonth(ms); for (let i = 0; i < dim; i++) if (dow(ms, i) % 6 === 0) days[i] = 'WO'; draw(); } $('#f-month', m).addEventListener('change', () => { if (days.every(x => x == null || x === 'WO')) { days = new Array(31).fill(null); const ms2 = +$('#f-month', m).value, dim = Engine.daysInMonth(ms2); for (let i = 0; i < dim; i++) if (dow(ms2, i) % 6 === 0) days[i] = 'WO'; draw(); } }); $('#f-name', m).focus(); }
  const del = $('#f-del', m);
  if (del) del.onclick = () => { if (!del.classList.contains('armed')) { del.classList.add('armed'); del.textContent = 'Click again to confirm delete'; setTimeout(() => { del.classList.remove('armed'); del.innerHTML = `${ic('trash')} Delete this row`; }, 4000); return; } closeModal(); deleteRows([row.uid]); };
  $('#f-save', m).onclick = () => {
    const err = t => { $('#f-err', m).textContent = t; };
    const name = $('#f-name', m).value.replace(/\s+/g, ' ').trim(), ms = +$('#f-month', m).value, dim = Engine.daysInMonth(ms);
    if (!name) return err('Please enter the recruiter name.');
    if (S.rows.some(r => r !== row && r.month === ms && personKey(r.name) === personKey(name))) return err(`${name} already has a row for ${monthLabel(ms)}. Edit that one instead.`);
    const bad = []; days.forEach((v, i) => { if (v != null && v !== '' && !knownCode(v) && !(row && row.days[i] === v)) bad.push(`day ${i + 1}: “${v}”`); });
    if (bad.length) return err('Not in your legend: ' + bad.slice(0, 4).join(', ') + '. Use a listed code or leave it empty.');
    const stray = days.map((v, i) => (i >= dim && v != null && v !== '' && !(row && row.days[i] === v)) ? i + 1 : 0).filter(Boolean); if (stray.length) return err(`${monthLabel(ms)} has only ${dim} days, but day ${stray[0]} has an entry.`);
    const f = { name, empId: parseId($('#f-id', m).value), client: $('#f-client', m).value.trim(), reg: $('#f-reg', m).value === '' ? null : Number($('#f-reg', m).value), month: ms, days: days.slice() };
    const fn = attFieldNames(); if (fn.length) { const ex = { ...((row && row.extra) || {}) }; $$('[data-xf]', m).forEach(inp => { const nm = fn[+inp.dataset.xf], v = inp.value.trim(); if (v === '') delete ex[nm]; else ex[nm] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v; }); f.extra = ex; }
    closeModal();
    if (row) mutate(`Edited ${rowLabel(row)}`, () => { Object.assign(row, f); });
    else mutate(`Added ${name} · ${monthLabel(ms)}`, () => { const nr = newRow(ms, name, { weekends: false }); Object.assign(nr, f); insertRow(nr); });
    if (!row) { S.ui.grid.month = ms; if (S.ui.view === 'grid') render(); }
  };
  m.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.target.list) $('#f-save', m).click(); });
}
/* ---------- v3.14: attendance fields manager: add a field, fill it for a month ---------- */
function openFieldsManager(sel) {
  const names = attFieldNames(), canAdd = can('att.fields'), canFill = can('att.fields') || can('att.edit');
  const d = D(), month = S.ui.grid.month || d.latestMonth, fieldSel = sel && names.includes(sel) ? sel : names[0];
  const monthRows = (d.byMonth.get(month) || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const pendingNote = n => (S.newFields || []).some(x => x.toLowerCase() === n.toLowerCase()) ? ' <span class="tag">added · saves with the next sync</span>' : '';
  const list = names.length ? `<ul class="fld-list">${names.map(n => { const filled = S.rows.filter(r => r.extra && r.extra[n] != null && r.extra[n] !== '').length; return `<li><b>${esc(n)}</b>${pendingNote(n)}<span class="grow"></span><span class="sm muted">${filled} of ${S.rows.length} rows filled</span></li>`; }).join('')}</ul>` : '<div class="empty" style="padding:14px">No extra fields yet.</div>';
  const add = canAdd ? `<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin:6px 0 14px"><label style="flex:1;min-width:220px">New field name<input type="text" id="xf-new" maxlength="60" placeholder="e.g. Shift, Laptop returned, Manager" autocomplete="off"></label><button class="btn primary" id="xf-add" type="button">${ic('plus')} Add field</button></div><div class="sm muted" style="margin:-6px 0 14px">It becomes a new column after AM in the “Attendance Tracker” sheet, for every month.</div>` : '<div class="sm muted" style="margin-bottom:12px">Only people with the “Add fields to the attendance tracker” right can add fields.</div>';
  const fill = names.length && canFill ? `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 8px"><b style="font-size:13px">Fill in</b><select id="xf-pick">${names.map(n => `<option${n === fieldSel ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select><span class="sm muted">for ${monthLabel(month)} · ${monthRows.length} people (follows the filters at the top)</span></div>
    <div class="fld-fill"><table><thead><tr><th>Employee</th><th>Client</th><th>${esc(fieldSel)}</th></tr></thead><tbody>${monthRows.map(r => `<tr><td>${esc(r.name.trim())}</td><td class="sm muted">${esc(r.client || '')}</td><td><input type="text" data-xfr="${r.uid}" value="${esc((r.extra || {})[fieldSel] ?? '')}" aria-label="${esc(fieldSel)} for ${esc(r.name.trim())}"></td></tr>`).join('')}</tbody></table></div>` : '';
  const m = openModal({ title: 'Attendance tracker fields', wide: true,
    body: `${add}${list}${fill}<div class="err" id="xf-err" role="alert"></div>`,
    footer: `<span class="grow"></span><button class="btn" data-close>Close</button>${fill ? '<button class="btn primary" id="xf-save" type="button">Save values</button>' : ''}` });
  const err = t => { $('#xf-err', m).textContent = t; };
  $('#xf-add', m)?.addEventListener('click', () => {
    const nm = ($('#xf-new', m).value || '').replace(/\s+/g, ' ').trim();
    if (!nm) return err('Enter a name for the field.');
    if (/^[=+@-]/.test(nm)) return err('A field name can’t start with =, +, - or @.');
    const taken = [...((S.ctx && S.ctx.headerNames) || []), ...attFieldNames()].some(x => x.toLowerCase() === nm.toLowerCase());
    if (taken) return err(`The tracker already has a column called “${nm}”.`);
    const ok = mutate(`Added the field “${nm}” to the attendance tracker`, () => { (S.newFields || (S.newFields = [])).push(nm); }, { fields: true });
    if (ok !== false) { toast(`Added “${nm}”. It is written to Excel with the next save.`); openFieldsManager(nm); }
  });
  $('#xf-new', m)?.addEventListener('keydown', e => { if (e.key === 'Enter') $('#xf-add', m).click(); });
  $('#xf-pick', m)?.addEventListener('change', e => openFieldsManager(e.target.value));
  $('#xf-save', m)?.addEventListener('click', () => {
    const changes = [];
    $$('[data-xfr]', m).forEach(inp => { const r = rowByUid(inp.dataset.xfr); if (!r) return; const v = inp.value.trim(), old = (r.extra || {})[fieldSel]; const nv = v === '' ? null : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v; if ((old ?? null) !== nv) changes.push([r, nv]); });
    if (!changes.length) { closeModal(); return; }
    closeModal();
    mutate(`${fieldSel}: filled for ${changes.length} ${changes.length === 1 ? 'person' : 'people'} · ${monthLabel(month)}`, () => { for (const [r, v] of changes) { r.extra = { ...(r.extra || {}) }; if (v == null) delete r.extra[fieldSel]; else r.extra[fieldSel] = v; } }, { fields: true });
  });
}
function deleteRows(uids) {
  const rs = uids.map(rowByUid).filter(Boolean); if (!rs.length) return;
  mutate(rs.length === 1 ? `Deleted ${rowLabel(rs[0])}` : `Deleted ${rs.length} rows`, () => { S.rows = S.rows.filter(r => !uids.includes(r.uid)); });
  toast(`Deleted ${rs.length === 1 ? rowLabel(rs[0]) : rs.length + ' rows'}. Nothing is written to Excel until you Save.`, { act: 'undo', label: 'Undo' });
}
function confirmDelete(uid) {
  const r = rowByUid(uid); if (!r) return; const s = rowStats(r);
  confirmBox('Delete this row?', `${rowLabel(r)} will be removed from the tracker${s.total ? ` (it holds ${fmt(s.total)} leave days)` : ''}. It is only written to Excel when you Save, and you can Undo until then.`, 'Delete row').then(ok => { if (ok) deleteRows([uid]); });
}

/* ---------- log leave ---------- */
function openLogLeave(preKey) {
  const d = D(true); const names = employeeNames();
  if (!canLog()) { toast('Your passcode can’t log leave. Ask the admin for the right in Settings.'); return; }
  const linked = window.PERM && PERM.linkedEmp && PERM.linkedEmp();
  const linkedName = linked ? ((rosterRows().find(r => idKey(gs(r, 'key_column')) === idKey(linked.code)) && gs(rosterRows().find(r => idKey(gs(r, 'key_column')) === idKey(linked.code)), 'name_column').trim()) || linked.name) : '';
  const pre = preKey ? d.people.get(preKey)?.name : linkedName;
  /* v3.14.2: the Type list shows exactly the leave types the super admin ticked for this passcode */
  const codesAllowed = LOG_TYPES.filter(logTypeAllowed);
  if (!codesAllowed.length) { toast('No leave types are allowed for your passcode. Ask the admin in Settings.'); return; }
  const openedAt = new Date();
  const today = isoDate(new Date(Date.UTC(openedAt.getFullYear(), openedAt.getMonth(), openedAt.getDate())));
  const m = openModal({
    title: 'Log leave',
    body: `<style>.cbx{position:relative}.cbx-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:5;max-height:260px;overflow:auto;background:var(--surface);border:1px solid var(--line-2);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:4px}.cbx-opt{display:flex;justify-content:space-between;gap:12px;width:100%;border:0;background:transparent;text-align:left;padding:7px 10px;border-radius:7px;font-size:13px;color:var(--ink);font-weight:500}.cbx-opt small{color:var(--ink-3);font-weight:400}.cbx-opt.on,.cbx-opt:hover{background:var(--accent-soft)}.cbx-empty{padding:10px;color:var(--ink-3);font-size:12px}.cbx-caret{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--ink-3);padding:4px 6px}</style>
      <div class="form"><div class="full" style="display:flex;flex-direction:column;gap:4px"><span style="font-size:12px;font-weight:600;color:var(--ink-2)">Employee</span><div class="cbx"><input type="text" id="l-name" value="${esc(pre || '')}" placeholder="Pick or type a name" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="l-list" aria-label="Employee" style="width:100%;padding-right:32px"><button type="button" class="cbx-caret" id="l-caret" tabindex="-1" aria-label="Show all employees">▾</button><div class="cbx-list" id="l-list" role="listbox" hidden></div></div></div>
      <label>Type<select id="l-code">${codesAllowed.map(c => `<option value="${c}" ${c === 'LA' && (!can('att.approve') || !codesAllowed.includes('AL')) ? 'selected' : ''}>${c} · ${CODES[c].label}</option>`).join('')}</select></label><span></span>
      <label>From<input type="date" id="l-from" value="${today}"></label><label>To<input type="date" id="l-to" value="${today}"></label>
      <label class="full" style="flex-direction:row;align-items:center;gap:8px;font-weight:500"><input type="checkbox" id="l-skip" checked> Keep week offs and holidays (don’t overwrite WO / H)</label>
      ${needsApproval() ? `<label class="full">Note for your manager (optional)<input type="text" id="l-note" maxlength="200" placeholder="e.g. family function, doctor’s appointment" autocomplete="off"></label><div class="full sm" style="padding:8px 10px;border-radius:8px;background:var(--accent-soft)">This leave goes to a manager for approval first. It is added to attendance only after they approve it.</div>` : ''}</div>
      <div id="l-prev" class="sm" style="margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div><div class="err" id="l-err"></div>`,
    footer: `<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn primary" id="l-go">${needsApproval() ? 'Send for approval' : 'Apply'}</button>`,
  });
  const plan = () => {
    const name = $('#l-name', m).value, p = resolvePerson(name), from = new Date($('#l-from', m).value + 'T00:00:00Z'), to = new Date($('#l-to', m).value + 'T00:00:00Z');
    if (!p) return { err: name.trim() ? 'No employee with that name in the workforce file or the tracker.' : 'Pick an employee.' };
    if (isNaN(from) || isNaN(to)) return { err: 'Choose both dates.' }; if (to < from) return { err: '“To” is before “From”.' }; if ((to - from) / 86400000 > 92) return { err: 'That range is longer than 3 months. Split it up.' };
    const code = $('#l-code', m).value, skip = $('#l-skip', m).checked; const set = [], skipped = [], blocked = [], create = new Set(); let overwrite = 0;
    for (let t = from; t <= to; t = new Date(t.getTime() + 86400000)) {
      const ms = Engine.monthSerial(t.getUTCFullYear(), t.getUTCMonth()), i = t.getUTCDate() - 1; const row = p.rows.find(r => r.month === ms);
      const cur = row ? row.days[i] : (t.getUTCDay() % 6 === 0 ? 'WO' : null);
      if (skip && catOf(cur) === 'off') { skipped.push(t); continue; }
      if (row && !allowedInLog(cur, code)) { blocked.push(t); continue; }   // e.g. already approved leave, without the Approve leave right
      if (!row) create.add(ms); if (cur != null && String(cur).trim().toUpperCase() !== code) overwrite++; set.push({ ms, i, t });
    }
    return { p, code, set, skipped, blocked, create: [...create], overwrite };
  };
  const show = () => { const pl = plan(); $('#l-err', m).textContent = pl.err || ''; $('#l-go', m).disabled = !!pl.err || !pl.set.length; $('#l-prev', m).innerHTML = pl.err ? 'Fill in the form to see a preview.' : `<b>${pl.set.length}</b> day${pl.set.length === 1 ? '' : 's'} will be set to <b>${pl.code}</b>${pl.skipped.length ? `, <b>${pl.skipped.length}</b> skipped (week off / holiday)` : ''}${pl.blocked && pl.blocked.length ? `, <b>${pl.blocked.length}</b> left as they are (already approved or decided leave, which needs the Approve leave right to change)` : ''}${pl.overwrite ? `, replacing <b>${pl.overwrite}</b> existing entr${pl.overwrite === 1 ? 'y' : 'ies'}` : ''}.${pl.create.length ? `<br>A new row will be created for ${pl.create.map(monthLabel).join(', ')}.` : ''}`; };
  bindLeaveDates($('#l-from', m), $('#l-to', m));
  /* employee dropdown: every name, filtered as you type */
  { const inp = $('#l-name', m), list = $('#l-list', m); let cur = -1, shown = [];
    const open = all => {
      const q = all ? '' : inp.value.trim().toLowerCase();
      shown = names.filter(n => !q || n.name.toLowerCase().includes(q) || String(n.hint).toLowerCase().includes(q)).slice(0, 200); cur = -1;
      list.innerHTML = shown.length ? shown.map((n, i) => `<button type="button" class="cbx-opt" role="option" data-i="${i}"><span>${esc(n.name)}</span><small>${esc(n.hint)}</small></button>`).join('') : '<div class="cbx-empty">No employee with that name.</div>';
      list.hidden = false; inp.setAttribute('aria-expanded', 'true');
    };
    const close = () => { list.hidden = true; inp.setAttribute('aria-expanded', 'false'); };
    const choose = i => { if (!shown[i]) return; inp.value = shown[i].name; close(); show(); };
    const mark = () => list.querySelectorAll('.cbx-opt').forEach((b, i) => { b.classList.toggle('on', i === cur); if (i === cur) b.scrollIntoView({ block: 'nearest' }); });
    inp.addEventListener('focus', () => open(true)); inp.addEventListener('input', () => open(false));
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) open(true); cur = Math.min(shown.length - 1, cur + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cur = Math.max(0, cur - 1); mark(); }
      else if (e.key === 'Enter' && !list.hidden && cur >= 0) { e.preventDefault(); choose(cur); }
      else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); close(); }
    });
    list.addEventListener('mousedown', e => { e.preventDefault(); const b = e.target.closest('[data-i]'); if (b) choose(+b.dataset.i); });
    $('#l-caret', m).addEventListener('mousedown', e => { e.preventDefault(); if (list.hidden) { inp.focus(); open(true); } else close(); });
    inp.addEventListener('blur', () => setTimeout(close, 120));
  }
  m.addEventListener('input', show); m.addEventListener('change', show); show(); if (!pre) $('#l-name', m).focus(); else $('#l-code', m).focus();
  $('#l-go', m).onclick = () => {
    const pl = plan(); if (pl.err) return;
    if (needsApproval()) { const note = ($('#l-note', m) || {}).value || ''; closeModal(); sendLeaveRequest(pl, note); return; }
    closeModal();
    mutate(`Logged ${pl.code} for ${pl.p.name} · ${pl.set.length} day${pl.set.length === 1 ? '' : 's'} (${longDate(pl.set[0].t)}${pl.set.length > 1 ? ' – ' + longDate(pl.set[pl.set.length - 1].t) : ''})`, () => {
      const idn = identityOf(pl.p); for (const s of pl.set) { let row = S.rows.find(r => r.month === s.ms && personKey(r.name) === pl.p.key); if (!row) { row = newRow(s.ms, idn.name, { empId: idn.empId, client: idn.client }); insertRow(row); } setDay(row, s.i, pl.code); }
    }, { cells: true, log: true });
  };
}

/* ---------- v3.15: leave requests. Leave logged by someone without "Log leave straight into attendance" waits for a
   manager (anyone with "Approve or reject leave") and only reaches the tracker once approved. Requests are kept in the
   shared team settings in Supabase (key leave_requests), not in the workbook. ---------- */
const needsApproval = () => !!(window.PERM && PERM.online() && !can('att.direct'));
const canDecide = () => can('att.approve');
const reqList = () => { const l = (window.TD_SETTINGS || {}).leave_requests; return Array.isArray(l) ? l : []; };
const myId = () => { try { const u = CLOUD.user(); return u && u.id != null ? String(u.id) : ''; } catch { return ''; } };
/* a manager sees the requests for the people inside their own filters (everyone when they have no filters) */
function inMyScope(r) { try { const x = rosterMatch(r.empId ?? null, r.name); if (x) return passes(x.row); } catch { } return true; }
const requestsToDecide = () => canDecide() ? reqList().filter(r => r.status === 'pending' && inMyScope(r)) : [];
const notifyReq = () => { try { window.dispatchEvent(new CustomEvent('att:requests')); } catch { } };
async function saveRequests(change) {
  await window.loadTeamSettings(true);                      // start from the latest list so two people don't undo each other
  const next = change(reqList().map(r => ({ ...r })));
  await window.saveSharedSetting('leave_requests', next);
  render(); notifyReq();
}
const reqWhen = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
function reqDatesText(dates) {
  const ds = dates.map(x => new Date(x + 'T00:00:00Z')).sort((a, b) => a - b); if (!ds.length) return '';
  const span = Math.round((ds[ds.length - 1] - ds[0]) / 86400000) + 1;
  const range = ds.length === 1 ? longDate(ds[0]) : longDate(ds[0]) + ' – ' + longDate(ds[ds.length - 1]);
  return range + ' · ' + ds.length + ' day' + (ds.length === 1 ? '' : 's') + (ds.length > 1 && span !== ds.length ? ' (week offs skipped)' : '');
}
async function sendLeaveRequest(pl, note) {
  const idn = identityOf(pl.p);
  const req = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), status: 'pending', at: new Date().toISOString(), by: BE.userName(), byId: myId(),
    name: idn.name || pl.p.name, key: pl.p.key, empId: idn.empId ?? null, client: idn.client || '', code: pl.code, dates: pl.set.map(s => isoDate(s.t)), note: String(note || '').slice(0, 200) };
  try {
    await saveRequests(l => [...l, req]);
    BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'settings', att: S.fileName, key: req.empId || '', name: req.name, details: { note: 'Asked for approval: ' + req.code + ' · ' + reqDatesText(req.dates) + (req.note ? ' · “' + req.note + '”' : '') } }]);
    toast(`Sent for approval: ${req.code} for ${req.name}. It is added to attendance once a manager approves it.`);
  } catch (e) { toast('Could not send the request: ' + e.message + ' Nothing was changed.'); }
}
function applyApproved(p, code, dates, desc) {
  APPROVE_CTX = true;
  try {
    return mutate(desc, () => {
      const idn = identityOf(p);
      for (const iso of dates) {
        const t = new Date(iso + 'T00:00:00Z'), ms = Engine.monthSerial(t.getUTCFullYear(), t.getUTCMonth()), i = t.getUTCDate() - 1;
        let row = S.rows.find(r => r.month === ms && personKey(r.name) === p.key);
        if (!row) { row = newRow(ms, idn.name, { empId: idn.empId, client: idn.client }); insertRow(row); }
        setDay(row, i, code);
      }
    }, { cells: true });
  } finally { APPROVE_CTX = false; }
}
async function approveRequest(id, code) {
  if (S.status !== 'ready' || !S.ctx) { toast('Connect the attendance tracker before approving requests.'); return; }
  if (!canDecide()) { toast('Only people with “Approve or reject leave” can approve requests.'); return; }
  try { await window.loadTeamSettings(true); } catch (e) { toast('Could not refresh requests: ' + e.message); return; }
  const req = reqList().find(r => r.id === id);
  if (!req || req.status !== 'pending') { toast('This request was already handled by someone else.'); render(); notifyReq(); return; }
  if (!inMyScope(req)) { toast('This request is outside your employee filters.'); return; }
  if (S.saving) { toast('Wait for the tracker save to finish.'); return; }
  if (S.changes.length) { toast('Save or undo your pending tracker edits before approving a request.'); return; }
  const p = resolvePerson(req.name); if (!p) { toast(`${req.name} is no longer in the workforce file or the tracker.`); return; }
  const requestedCode = LOG_TYPES.includes(code) ? code : req.code;
  const use = requestedCode === 'LA' ? 'AL' : requestedCode;
  const previous = snapshot(), undoLength = S.undo.length;
  const ok = applyApproved(p, use, req.dates, `Approved ${use} for ${req.name} · ${reqDatesText(req.dates)} (asked by ${req.by})`);
  if (ok === false) return;
  if (await save() !== true) {
    if (S.changes.length) { S.rows = previous; S.changes = []; S.undo.length = undoLength; S.ver++; await clearPending(); render(); }
    toast('Approval was not completed. The request is still pending.'); return;
  }
  try {
    await saveRequests(l => l.map(r => r.id === id ? { ...r, status: 'approved', code: use, asked: req.code, decidedBy: BE.userName(), decidedById: myId(), decidedAt: new Date().toISOString() } : r));
    BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'settings', att: S.fileName, key: req.empId || '', name: req.name, details: { note: 'Approved ' + use + (use !== req.code ? ' (asked for ' + req.code + ')' : '') + ' · ' + reqDatesText(req.dates) + ' · asked by ' + req.by } }]);
    toast(`Approved. ${req.name}'s ${use} is now in attendance.`);
  } catch (e) { toast('Approved in attendance, but the request list could not be updated: ' + e.message); }
}
function openRejectBox(id) {
  if (!canDecide()) return;
  const req = reqList().find(r => r.id === id); if (!req) return;
  const m = openModal({ title: 'Reject leave request',
    body: `<p style="margin:0 0 10px">${esc(req.name)} · <b>${esc(req.code)}</b> · ${esc(reqDatesText(req.dates))}</p><label style="display:flex;flex-direction:column;gap:4px">Reason (shown to ${esc(req.by)})<textarea id="rj-why" rows="3" maxlength="200" style="width:100%;resize:vertical"></textarea></label>`,
    footer: `<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn danger" id="rj-go">Reject request</button>` });
  $('#rj-why', m).focus();
  $('#rj-go', m).onclick = async () => {
    const why = $('#rj-why', m).value.trim().slice(0, 200); closeModal();
    try {
      await window.loadTeamSettings(true); const cur = reqList().find(r => r.id === id);
      if (!cur || cur.status !== 'pending') { toast('This request was already handled by someone else.'); render(); return; }
      if (!canDecide() || !inMyScope(cur)) { toast('You no longer have access to decide this request.'); return; }
      await saveRequests(l => l.map(r => r.id === id ? { ...r, status: 'rejected', reason: why, decidedBy: BE.userName(), decidedById: myId(), decidedAt: new Date().toISOString() } : r));
      BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'settings', att: S.fileName, key: req.empId || '', name: req.name, details: { note: 'Rejected ' + req.code + ' · ' + reqDatesText(req.dates) + ' · asked by ' + req.by + (why ? ' · “' + why + '”' : '') } }]);
      toast('Request rejected. Nothing was added to attendance.');
    } catch (e) { toast('Could not reject: ' + e.message); }
  };
}
async function cancelRequest(id) {
  const ok = await confirmBox('Cancel this request?', 'It is withdrawn and will not reach attendance.', 'Cancel request'); if (!ok) return;
  try {
    await window.loadTeamSettings(true); const cur = reqList().find(r => r.id === id);
    if (!cur || cur.status !== 'pending') { toast('A manager already handled this request.'); render(); return; }
    if (String(cur.byId) !== myId()) { toast('Only the requester can cancel this request.'); return; }
    await saveRequests(l => l.map(r => r.id === id ? { ...r, status: 'cancelled', decidedBy: BE.userName(), decidedById: myId(), decidedAt: new Date().toISOString() } : r));
    await BE.appendActivity([{ time: BE.nowText(), user: BE.userName(), action: 'request-cancelled', name: cur.name, key: cur.empId || '', details: { note: 'Cancelled request ' + cur.code + ' · ' + reqDatesText(cur.dates) } }]);
    toast('Request cancelled.');
  } catch (e) { toast('Could not cancel: ' + e.message); }
}
window.requestAuditEntries = () => reqList().flatMap(r => {
  const common = {name:r.name,key:r.empId || '',att:'attendance',details:{note:r.code + ' · ' + reqDatesText(r.dates || [])}};
  const events = [{...common,eventId:'request:'+r.id+':pending',time:r.at,user:r.by,userId:r.byId,action:'request-submitted'}];
  if (r.status !== 'pending') events.push({...common,eventId:'request:'+r.id+':'+r.status+':'+r.decidedAt,time:r.decidedAt,user:r.decidedBy || r.by,userId:r.decidedById || r.byId,action:'request-'+r.status,details:{note:common.details.note+(r.reason ? ' · Reason: '+r.reason : '')}});
  return events;
};
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

function renderApprovalRequests() {
  renderRequestHistory();
  const host = document.getElementById('cardApprovalRequests'); if (!host) return;
  const admin = window.PERM && (!PERM.online() || ['admin', 'superadmin'].includes(CLOUD.user()?.role));
  host.hidden = !(admin || canDecide());
  if (host.hidden) { host.replaceChildren(); return; }
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const pending = reqList().filter(r => r.status === 'pending' && inMyScope(r)).sort((a,b) => (a.at || '').localeCompare(b.at || ''));
  const ready = S.status === 'ready' && !!S.ctx;
  root.innerHTML = `<style>${ATT_CSS}
    .request-row { display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding:14px 0; border-bottom:1px solid var(--line); }
    .request-row:last-child { border-bottom:0; } .request-details { flex:1 1 260px; min-width:0; overflow-wrap:anywhere; }
    .request-details span { display:block; } .request-actions { display:flex; flex-wrap:wrap; gap:6px; }
    .request-heading { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:8px; }
    </style><div class="card"><div class="request-heading"><h2>Approval requests · ${pending.length} pending</h2><span class="grow"></span><button class="btn sm" data-refresh>Refresh</button></div>
    <div class="sub">Review user log requests before they are added to the tracker. Requests shown follow your current employee filters.</div>
    ${!canDecide() ? '<p class="sm">Ask a super admin to enable “Approve or reject leave” for your account to process these requests.</p>' : !ready ? '<p class="sm">Connect the attendance tracker in Settings → Save & sync to approve requests.</p>' : ''}
    ${pending.length ? '<div style="max-height:420px;overflow:auto">' + pending.map(r => `<div class="request-row"><div class="request-details"><b>${esc(r.name)}</b><span>${esc(r.code)} · ${esc(reqDatesText(r.dates || []))}</span><span class="sm muted">Requested by ${esc(r.by)} · ${esc(reqWhen(r.at))}</span>${r.note ? '<span class="sm">Note: ' + esc(r.note) + '</span>' : ''}</div>
    ${canDecide() ? `<div class="request-actions"><select aria-label="Approve leave type for ${esc(r.name)}" ${!ready ? 'disabled' : ''}>${LOG_TYPES.map(c => `<option value="${c}"${c === r.code ? ' selected' : ''}>${c}</option>`).join('')}</select><button class="btn sm primary" data-approve="${esc(r.id)}" ${!ready || S.saving ? 'disabled' : ''}>Approve</button><button class="btn sm" data-reject="${esc(r.id)}">Reject</button></div>` : ''}</div>`).join('') + '</div>' : '<div class="empty">No pending requests in your current employee filters.</div>'}</div>`;
  root.querySelector('[data-refresh]').onclick = async e => { e.target.disabled = true; try { await window.loadTeamSettings(true); notifyReq(); } finally { renderApprovalRequests(); } };
  root.querySelectorAll('[data-approve]').forEach(b => { b.onclick = async () => { b.disabled = true; try { await approveRequest(b.dataset.approve, b.parentElement.querySelector('select').value); } finally { renderApprovalRequests(); } }; });
  root.querySelectorAll('[data-reject]').forEach(b => { b.onclick = () => openRejectBox(b.dataset.reject); });
}
function requestsCardHtml() {
  const decide = requestsToDecide(), me = myId();
  const mine = me ? reqList().filter(r => String(r.byId) === me).sort((a, b) => (b.at || '').localeCompare(a.at || '')) : [];
  if (!decide.length && !mine.length && !needsApproval()) return '';
  const typeSel = r => `<select data-req-code aria-label="Leave type to approve">${LOG_TYPES.map(c => `<option value="${c}"${c === r.code ? ' selected' : ''}>${c}</option>`).join('')}</select>`;
  const who = r => `<b>${esc(r.name)}</b><span class="sm muted">${esc(r.code)} · ${esc(CODES[r.code] ? CODES[r.code].label : '')} · ${esc(reqDatesText(r.dates || []))}</span><span class="sm muted">Asked by ${esc(r.by)} · ${esc(reqWhen(r.at))}${r.note ? ' · “' + esc(r.note) + '”' : ''}</span>`;
  const decideHtml = canDecide() ? `<div style="min-width:0"><h2>Waiting for your approval · ${decide.length}</h2><div class="sub">Logged leave is added to attendance only after you approve it. You can change the type before approving.</div>
      ${decide.length ? `<div class="list" style="max-height:320px;overflow:auto">${decide.map(r => `<div class="li" style="flex-wrap:wrap;gap:6px"><div class="main-t" style="flex:1 1 260px">${who(r)}</div>${typeSel(r)}<button class="btn sm primary" data-act="req-approve" data-id="${esc(r.id)}">Approve</button><button class="btn sm" data-act="req-reject" data-id="${esc(r.id)}">Reject</button></div>`).join('')}</div>` : '<div class="empty">No leave requests are waiting.</div>'}</div>` : '';
  const badge = r => r.status === 'pending' ? '<span class="tag">Waiting for approval</span>' : r.status === 'approved' ? `<span class="tag ok">Approved${r.asked && r.asked !== r.code ? ' as ' + esc(r.code) : ''}</span>` : r.status === 'rejected' ? '<span class="tag crit">Rejected</span>' : '<span class="tag">Cancelled</span>';
  const mineHtml = (mine.length || needsApproval()) ? `<div style="min-width:0"><h2>Your leave requests · ${mine.filter(r => r.status === 'pending').length} waiting</h2><div class="sub">${needsApproval() ? 'Leave you log is sent to a manager first. It shows in attendance once approved.' : 'Requests you sent earlier.'}</div>
      ${mine.length ? `<div class="list" style="max-height:320px;overflow:auto">${mine.map(r => `<div class="li" style="flex-wrap:wrap;gap:6px"><div class="main-t" style="flex:1 1 240px"><b>${esc(r.name)}</b><span class="sm muted">${esc(r.code)} · ${esc(reqDatesText(r.dates || []))}</span>${r.status !== 'pending' && r.decidedBy ? `<span class="sm muted">${r.status === 'cancelled' ? 'Cancelled' : (r.status === 'approved' ? 'Approved' : 'Rejected') + ' by ' + esc(r.decidedBy)} · ${esc(reqWhen(r.decidedAt))}${r.reason ? ' · “' + esc(r.reason) + '”' : ''}</span>` : ''}</div>${badge(r)}${r.status === 'pending' ? `<button class="btn sm" data-act="req-cancel" data-id="${esc(r.id)}">Cancel</button>` : ''}</div>`).join('')}</div>` : '<div class="empty">You have not sent any leave requests yet. Use Log leave to send one.</div>'}</div>` : '';
  return `<div class="card" style="margin-bottom:14px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px">${decideHtml}${mineHtml}</div></div>`;
}

/* ---------- a tracker row built from a workforce person ---------- */
/* Emp ID, name and client come from the workforce file. Before the Date of Joining, and after the Left Date, the days are NA (as the tracker already does). */
function newRosterRow(ms, rr, opts = {}) {
  const nr = newRow(ms, gs(rr, 'name_column').trim(), { empId: parseId(gs(rr, 'key_column')), client: gs(rr, 'client_column'), weekends: opts.weekends !== false });
  const dim = Engine.daysInMonth(ms), doj = dojSerial(rr);
  if (doj != null && doj > ms) for (let i = 0; i < Math.min(dim, doj - ms); i++) if (nr.days[i] !== 'WO') nr.days[i] = 'NA';
  const lv = goneKind(rr) === 'left' ? dateSerial(rr) : null;
  if (lv != null) { const c = serialParts(lv); if (c.ms === ms) for (let i = c.i + 1; i < dim; i++) if (nr.days[i] !== 'WO') nr.days[i] = 'NA'; }
  if (opts.p) for (let i = 0; i < dim; i++) if (nr.days[i] == null && impliedCode(ms, i) === 'P') nr.days[i] = 'P';
  return nr;
}

/* ---------- "Track attendance": put a workforce person into the attendance workbook and save ---------- */
/* Months a person is added to: this month and any later month already in the tracker (or the tracker's latest month if it has not reached this month yet). */
function trackTargets(rr) {
  const d = D(true), latest = d.latestMonth ?? TODAY_MS, from = Math.min(TODAY_MS, latest), doj = dojSerial(rr);
  const ms = d.months.filter(m => m >= from), all = ms.length ? ms : [latest];
  const ok = all.filter(m => doj == null || doj < m + Engine.daysInMonth(m));
  return ok.length ? ok : doj != null ? [serialParts(doj).ms] : all;
}
const rosterRowById = id => rosterRows().find(r => String(r.id) === String(id));
function trackPlan(rrs) {
  const d = D(true), plan = []; let gone = 0;
  for (const rr of rrs) {
    if (goneKind(rr)) { gone++; continue; }
    const nm = gs(rr, 'name_column').trim(); if (!nm) continue;
    for (const ms of trackTargets(rr)) if (!(d.byMonth.get(ms) || []).some(x => { const m = rosterMatch(x.empId, x.name); return (m && m.row.id === rr.id) || personKey(x.name) === personKey(nm); })) plan.push({ rr, ms });
  }
  return { plan, gone };
}
async function trackRoster(rrs) {
  if (S.status !== 'ready' || !S.ctx) { toast('The attendance workbook is not connected yet. Open the Attendance page and choose it first.'); return false; }
  const { plan, gone } = trackPlan(rrs);
  if (!plan.length) { toast(gone && gone === rrs.length ? 'Left and Moved people are not tracked.' : 'Already in the attendance tracker.'); return false; }
  const people = [...new Set(plan.map(x => x.rr))], months = [...new Set(plan.map(x => x.ms))].sort((a, b) => a - b);
  const nm = people.length === 1 ? gs(people[0], 'name_column').trim() : people.length + ' employees', ml = months.map(monthLabel).join(', ');
  if (S.changes.length && !(await confirmBox('Save your other changes too?', `The attendance tracker already has ${S.changes.length} unsaved change${S.changes.length === 1 ? '' : 's'}. Tracking ${nm} saves everything together.`, 'Track and save'))) return false;
  mutate(`Started tracking ${nm} · ${ml}`, () => { for (const { rr, ms } of plan) insertRow(newRosterRow(ms, rr)); });
  S.ui.grid.month = months[0]; S.ui.grid.status = 'all'; S.ui.grid.q = '';
  await save();
  if (S.changes.length) { toast(`${nm} ${people.length === 1 ? 'was' : 'were'} added in the dashboard but not saved to Excel yet. Fix the problem above, then press Save to Excel on the Attendance page.`, false); return false; }
  toast(`${nm} ${people.length === 1 ? 'is' : 'are'} now tracked: added to ${S.fileName} for ${ml} and saved.`);
  return true;
}

/* ---------- link a tracker name to a workforce person (or the other way round) ---------- */
function openLink({ person = null, roster = null }) {
  const usedBy = new Map(); for (const p of D(true).people.values()) { const m = rosterOfPerson(p); if (m && !usedBy.has(m.row.id)) usedBy.set(m.row.id, p.name); }
  const fromTracker = !!person, fixedName = fromTracker ? person.name : gs(roster, 'name_column').trim();
  const cands = fromTracker
    ? rosterRows().filter(r => gs(r, 'name_column').trim()).map(r => ({ rr: r, name: gs(r, 'name_column').trim(), sub: `${gs(r, 'key_column') || 'no code'} · ${rosterStatus(r) || 'no status'} · ${gs(r, 'client_column') || 'no client'}`, note: usedBy.has(r.id) ? `already matched to “${usedBy.get(r.id)}” in the tracker` : '', score: nameScore(person.name, gs(r, 'name_column')) }))
    : [...D(true).people.values()].map(p => { const m = rosterOfPerson(p); return { p, name: p.name, sub: `${[...p.ids][0] ?? 'no ID'} · ${(p.latest.client) || 'no client'} · last row ${monthLabel(p.latest.month)}`, note: m ? `already matched to “${gs(m.row, 'name_column')}” in the workforce file` : '', score: nameScore(gs(roster, 'name_column'), p.name) }; });
  const fixedSub = fromTracker ? `Tracker · ${[...person.ids][0] ?? 'no ID'} · ${person.latest.client || 'no client'} · last row ${monthLabel(person.latest.month)}` : `Workforce · ${gs(roster, 'key_column') || 'no code'} · ${rosterStatus(roster) || 'no status'} · ${gs(roster, 'client_column') || 'no client'}`;
  let sel = null, q = '';
  const m = openModal({
    title: fromTracker ? 'Link to a person in the workforce file' : 'Link to a name in the tracker', wide: true,
    body: `<p style="margin-top:0;color:var(--ink-2)">Use this when the same person is spelled differently in the two files, for example <b>Chanchal Soni</b> in the tracker and <b>Chanchal Bharat Soni</b> in the workforce file. The link is remembered and remembered in this browser for these workbooks. Nothing in either Excel file changes unless you tick the box below.</p>
      <div class="card" style="padding:10px 14px;margin-bottom:12px;background:var(--surface-2)"><div class="sm muted">${fromTracker ? 'Tracker name' : 'Workforce person'}</div><b style="font-size:16px">${esc(fixedName)}</b><div class="sm muted">${esc(fixedSub)}</div></div>
      <label class="full" style="display:block;font-weight:600;margin-bottom:6px">${fromTracker ? 'Which workforce person is this?' : 'Which tracker name is this?'}<input type="search" id="k-q" placeholder="Search by name or code (best matches are shown first)" style="width:100%;margin-top:4px" autocomplete="off"></label>
      <div id="k-list" class="list" style="max-height:38vh;overflow:auto;border:1px solid var(--line);border-radius:8px"></div>
      ${fromTracker ? `<label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input type="checkbox" id="k-rewrite" style="margin-top:3px"><span>Also change the name and Emp ID in the tracker rows to match the workforce file <span class="muted">(unsaved until you press Save to Excel; you can also do this later from Data health)</span></span></label>` : `<label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input type="checkbox" id="k-rewrite" style="margin-top:3px"><span>Also change that tracker name and Emp ID to match the workforce file <span class="muted">(unsaved until you press Save to Excel)</span></span></label>`}`,
    footer: `<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn primary" id="k-go" disabled>Link</button>`,
  });
  const draw = () => {
    const t = q.trim().toLowerCase();
    let list = cands.filter(c => !t || (c.name + ' ' + c.sub).toLowerCase().includes(t)).sort((a, b) => (!!a.note - !!b.note) * 0.001 + (b.score - a.score) || a.name.localeCompare(b.name));
    list = t ? list.slice(0, 40) : list.filter(c => c.score >= 0.4).slice(0, 12);
    if (sel && !list.includes(sel)) list.unshift(sel);
    $('#k-list', m).innerHTML = list.length ? list.map((c, i) => `<button type="button" class="fileopt" data-k-i="${cands.indexOf(c)}" style="border:0;border-bottom:1px solid var(--line);border-radius:0;${c === sel ? 'outline:2px solid var(--blue);outline-offset:-2px;' : ''}"><span><b>${esc(c.name)}</b> ${c.score >= 0.75 ? '<span class="tag">likely</span>' : ''}<br><small>${esc(c.sub)}${c.note ? ' · <span style="color:var(--orange)">' + esc(c.note) + '</span>' : ''}</small></span><span>${c === sel ? '✓' : ''}</span></button>`).join('') : `<div class="empty" style="height:auto;padding:16px">${t ? 'Nobody matches that search.' : 'No close matches. Type part of the name or code to search everyone.'}</div>`;
    $('#k-go', m).disabled = !sel;
  };
  m.addEventListener('input', e => { if (e.target.id === 'k-q') { q = e.target.value; draw(); } });
  m.addEventListener('click', e => { const b = e.target.closest('[data-k-i]'); if (b) { sel = cands[+b.dataset.kI]; draw(); } });
  draw(); $('#k-q', m).focus();
  $('#k-go', m).onclick = () => {
    if (!sel) return; const rewrite = $('#k-rewrite', m).checked; closeModal();
    if (fromTracker) addLink(person.name, sel.rr, rewrite); else addLink(sel.p.name, roster, rewrite);
  };
}

/* ---------- Left / Moved: mark them in the tracker ---------- */
function openMarkGone() {
  const base = gonePlan();
  if (!base.list.length && !base.nodate.length) { toast('Nobody needs marking right now.'); return; }
  const dates = {}, iso = v => isoDate(Engine.serialToDate(v));
  const m = openModal({
    title: 'Mark Left / Moved people', wide: true,
    body: `<p style="margin-top:0;color:var(--ink-2)">Their attendance is not tracked any more, so the rest of their days are marked instead: <b>NA</b> after a Left Date, <b>M</b> after the day a Moved person left this team. Only blank weekdays are marked. Week offs, holidays and anything already filled in stay as they are. They are also left out of new months.</p>
      <div id="g-body"></div><div class="err" id="g-err"></div>`,
    footer: `<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn primary" id="g-go">Mark</button>`,
  });
  const draw = () => {
    const cur = gonePlan(dates), by = new Map(cur.list.map(x => [x.rr.id, x]));
    const rows = base.list.map(b => { const c = by.get(b.rr.id), n = c ? c.cells.length : 0, on = m.querySelector(`[data-g="${b.rr.id}"]`)?.checked ?? true;
      return `<tr><td><input type="checkbox" data-g="${b.rr.id}" ${on ? 'checked' : ''} ${n ? '' : 'disabled'} aria-label="Mark ${esc(b.p.name)}"></td><td><b>${esc(b.p.name)}</b><br><span class="sm muted">${esc(String(gs(b.rr, 'key_column')))}${personKey(gs(b.rr, 'name_column')) !== b.p.key ? ' · workforce name: ' + esc(gs(b.rr, 'name_column')) : ''}</span></td>
      <td>${b.kind === 'left' ? `Left ${esc(serialText(b.lv))}` : `<label class="sm muted">Last day here <input type="date" data-mv="${b.rr.id}" value="${iso(dates[b.rr.id] ?? b.lv)}"></label>`}</td><td class="num">${n ? `${n} day${n === 1 ? '' : 's'} → <b>${b.code}</b>` : '<span class="muted">nothing to mark</span>'}</td></tr>`; }).join('');
    const nd = base.nodate.length ? `<div class="sm" style="margin-top:14px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"><b>${base.nodate.length}</b> marked Left in the workforce file have no Left Date, so they cannot be marked yet: ${base.nodate.slice(0, 12).map(x => esc(x.p.name)).join(', ')}${base.nodate.length > 12 ? '…' : ''}. Add the date in the workforce file.</div>` : '';
    $('#g-body', m).innerHTML = (base.list.length ? `<div class="gridwrap" style="max-height:46vh"><table class="att marktbl"><thead><tr><th style="width:34px"></th><th>Employee</th><th>Left / moved</th><th>To mark</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">Nothing to mark.</div>') + nd;
    const n = $$('[data-g]', m).filter(x => x.checked && !x.disabled).length; $('#g-go', m).disabled = !n; $('#g-go', m).textContent = n ? `Mark ${n} ${n === 1 ? 'person' : 'people'}` : 'Mark';
  };
  m.addEventListener('change', e => {
    const mv = e.target.closest('[data-mv]'); if (mv && mv.value) dates[mv.dataset.mv] = Engine.dateToSerial(new Date(mv.value + 'T00:00:00Z'));
    draw();
  });
  draw();
  $('#g-go', m).onclick = () => {
    const chosen = new Set($$('[data-g]', m).filter(x => x.checked && !x.disabled).map(x => x.dataset.g)), cur = gonePlan(dates), picks = cur.list.filter(x => chosen.has(String(x.rr.id)));
    if (!picks.length) return; closeModal();
    const days = picks.reduce((a, x) => a + x.cells.length, 0);
    mutate(`Marked ${picks.length} Left / Moved ${picks.length === 1 ? 'person' : 'people'} in the tracker (${days} day${days === 1 ? '' : 's'})`, () => { for (const x of picks) for (const c of x.cells) setDay(c.r, c.i, x.code); });
    toast(`Marked ${picks.length} ${picks.length === 1 ? 'person' : 'people'} (${days} days). Review, then Save to Excel.`, { act: 'undo', label: 'Undo' });
  };
}

/* ---------- start / update a month from the workforce file ---------- */
const STATUS_ORDER = ['active', 'resign', 'projected', 'bench', 'manager', 'new'];
function workforceStatuses() {
  const cnt = new Map(); for (const r of rosterRows()) { const k = rosterStatus(r) || 'No status'; cnt.set(k, (cnt.get(k) || 0) + 1); }
  const rank = k => { const i = STATUS_ORDER.findIndex(x => k.toLowerCase().startsWith(x)); return i < 0 ? 99 : i; };
  return [...cnt.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1]);
}
function openNewMonth() {
  if (!hasRoster()) { toast('The workforce file is not loaded, so there is nobody to build the month from.'); return; }
  const d = D(true); const last = d.latestMonth ?? Engine.monthSerial(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - 1), ld = Engine.serialToDate(last);
  const next = [1, 2, 3].map(k => Engine.monthSerial(ld.getUTCFullYear(), ld.getUTCMonth() + k));
  const months = [...new Set([...next, ...d.months])].sort((a, b) => b - a), sts = workforceStatuses().filter(([k]) => !(isInactiveStatus(k) && !/^resign/i.test(k)));
  const m = openModal({
    title: 'Start or update a month',
    body: `<p style="margin-top:0;color:var(--ink-2)">Builds the attendance rows straight from the <b>workforce file</b>: one row per employee with the Emp ID, name and client from that file, every date of the month, and Saturdays and Sundays set to WO. A blank day means present (P). If the month already has rows, only the missing employees are added.</p>
      <div class="form"><label class="full">Month<select id="n-to">${months.map(t => `<option value="${t}"${t === next[0] ? ' selected' : ''}>${monthLabel(t)}${d.byMonth.has(t) ? ` (${d.byMonth.get(t).length} rows already)` : ' (new)'}</option>`).join('')}</select></label>
      <div class="full"><div class="sm" style="font-weight:600;color:var(--ink-2);margin-bottom:6px">Employees to include, by workforce status</div>
        <div class="stchips">${sts.map(([k, n]) => `<label class="chk"><input type="checkbox" data-st="${esc(k)}" ${TRACKED_RE.test(k) ? 'checked' : ''}> ${esc(k)} <span class="muted">(${n})</span></label>`).join('')}</div></div>
      <div class="full sm muted">Left and Moved people are not tracked, so they are never added. Someone whose Left Date falls inside the month gets a row for that month, with NA after their last day. <span id="n-gone"></span></div>
      <label class="full chk"><input type="checkbox" id="n-wo" checked> Fill Saturdays and Sundays with WO</label>
      <label class="full chk"><input type="checkbox" id="n-p"> Also write P into every working day <span class="muted">(off by default: blank already counts as present)</span></label></div>
      <div id="n-prev" class="sm" style="margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div><div class="err" id="n-err"></div>`,
    footer: `<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn primary" id="n-go">Add rows</button>`,
  });
  const plan = () => {
    const to = +$('#n-to', m).value, on = new Set($$('[data-st]', m).filter(x => x.checked).map(x => x.dataset.st)), end = to + Engine.daysInMonth(to);
    const have = d.byMonth.get(to) || [], seenId = new Set(), seenName = new Set(have.map(r => personKey(r.name)));
    for (const r of have) { const x = rosterMatch(r.empId, r.name); if (x) seenId.add(x.row.id); }
    let leftOut = 0, already = 0, dup = 0; const add = [], by = new Map();
    for (const r of rosterRows()) {
      const kind = goneKind(r);
      if (kind) { const lv = kind === 'left' ? dateSerial(r) : null; if (lv == null || lv < to || lv >= end) { leftOut++; continue; } }   // Left in this month: keep for the part they worked
      else if (!on.has(rosterStatus(r) || 'No status')) continue;
      if (seenId.has(r.id)) { already++; continue; }
      const nm = gs(r, 'name_column').trim(); if (!nm || seenName.has(personKey(nm))) { dup++; continue; }
      seenName.add(personKey(nm)); add.push(r); const k = rosterStatus(r) || 'No status'; by.set(k, (by.get(k) || 0) + 1);
    }
    add.sort((a, b) => gs(a, 'name_column').localeCompare(gs(b, 'name_column')));
    return { to, add, by, leftOut, already, dup, have: have.length };
  };
  const show = () => { const pl = plan(); $('#n-err', m).textContent = ''; $('#n-go', m).disabled = !pl.add.length;
    $('#n-prev', m).innerHTML = pl.add.length ? `<b>${pl.add.length}</b> row${pl.add.length === 1 ? '' : 's'} will be added to <b>${monthLabel(pl.to)}</b> (${[...pl.by.entries()].map(([k, n]) => `${esc(k)} ${n}`).join(', ')}).${pl.already ? ` ${pl.already} selected employee${pl.already === 1 ? ' already has' : 's already have'} a row.` : ''}${pl.leftOut ? ` ${pl.leftOut} Left / Moved ${pl.leftOut === 1 ? 'person is' : 'people are'} not tracked and left out.` : ''}${pl.dup ? ` ${pl.dup} skipped (same name twice).` : ''}` : `Nothing to add: every selected employee already has a row in ${monthLabel(pl.to)}${pl.leftOut ? `, and ${pl.leftOut} were left out (Left Date earlier)` : ''}.`; };
  const gn = gonePlan(); if (gn.list.length) { $('#n-gone', m).innerHTML = `<b>${gn.list.length}</b> Left / Moved ${gn.list.length === 1 ? 'person still has' : 'people still have'} unmarked days: <button type="button" class="linkbtn" id="n-mark">mark them</button>.`; $('#n-mark', m).onclick = () => { closeModal(); openMarkGone(); }; }
  m.addEventListener('change', show); show();
  $('#n-go', m).onclick = () => {
    const pl = plan(), wo = $('#n-wo', m).checked, wp = $('#n-p', m).checked; closeModal();
    mutate(`${d.byMonth.has(pl.to) ? 'Updated' : 'Started'} ${monthLabel(pl.to)} from the workforce file (${pl.add.length} row${pl.add.length === 1 ? '' : 's'})`, () => {
      for (const r of pl.add) insertRow(newRosterRow(pl.to, r, { weekends: wo, p: wp }));
    });
    S.ui.grid.month = pl.to; S.ui.grid.status = 'all'; S.ui.period = 'm:' + pl.to; S.ui.view = 'grid'; render(); toast(`${monthLabel(pl.to)}: ${pl.add.length} employee${pl.add.length === 1 ? '' : 's'} added from the workforce file. Review, then Save to Excel.`);
  };
}

/* ---------- changes drawer ---------- */
function openChanges() {
  const n = S.changes.length;
  const m = openModal({
    title: `Unsaved changes (${n})`,
    body: n ? `<div class="list">${[...S.changes].reverse().map(c => `<div class="li"><span class="tag">${c.t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><div class="main-t">${esc(c.desc)}</div></div>`).join('')}</div>` : '<div class="empty">No unsaved changes. The dashboard matches your Excel file.</div>',
    footer: `${n ? '<button class="btn danger" id="c-discard">Discard all changes</button>' : ''}<span class="grow"></span><button class="btn" data-close>Close</button>${n ? '<button class="btn primary" id="c-save">Save to Excel</button>' : ''}`,
  });
  $('#c-save', m)?.addEventListener('click', () => { closeModal(); save(); });
  $('#c-discard', m)?.addEventListener('click', async () => { closeModal(); const ok = await confirmBox('Discard all changes?', `${n} change${n > 1 ? 's' : ''} made since the last save will be lost.`, 'Discard'); if (ok) { await clearPending(); await adopt(await Engine.load(S.ctx.bytes)); render(); toast('Changes discarded'); } });
}

/* ---------- Holiday (H) for everyone in one go ---------- */
function openHoliday(ms, i0) {
  const dim = Engine.daysInMonth(ms); let day = Math.min(Math.max(0, i0 ?? (ms === TODAY_MS ? TODAY_IDX : 0)), dim - 1), over = false, all = true;
  const shown = gridRows(), everyone = D(true).byMonth.get(ms) || [];
  const plan = () => {
    const rows = all ? everyone : shown, set = [], keep = [], has = [], wk = dow(ms, day) === 0 || dow(ms, day) === 6;
    if (!wk) for (const r of rows) {
      if (!trackedOn(r, day)) continue; const v = r.days[day], u = v == null || v === '' ? '' : String(v).trim().toUpperCase();
      if (u === 'H') has.push(r); else if (u === '') set.push(r); else if (['WO', 'NA', 'M', 'X'].includes(u)) continue; else if (over) set.push(r); else keep.push(r);
    }
    return { set, keep, has, wk };
  };
  const m = openModal({
    title: 'Mark a holiday for everyone',
    body: `<p style="margin-top:0;color:var(--ink-2)">Sets <b>H</b> (holiday) on one day for all the people at once. Weekends stay week off, and people who were not on the team that day (before joining, after leaving, moved) are skipped.</p>
      <label style="display:block;font-weight:600;margin-bottom:10px">Day <input type="date" id="h-date" value="${isoDate(dateOf(ms, day))}" min="${isoDate(dateOf(ms, 0))}" max="${isoDate(dateOf(ms, dim - 1))}" style="margin-left:8px"></label>
      <label class="chk" style="display:flex;gap:8px;margin-bottom:4px"><input type="radio" name="h-s" value="all" checked> Everyone tracked in ${monthLabel(ms)} <span class="muted">(${everyone.length})</span></label>
      <label class="chk" style="display:flex;gap:8px;margin-bottom:10px"><input type="radio" name="h-s" value="shown"> Only the people shown in the grid now <span class="muted">(${shown.length})</span></label>
      <label class="chk" style="display:flex;gap:8px;margin-bottom:12px"><input type="checkbox" id="h-over"> Also replace leave codes already on that day <span class="muted">(otherwise those people keep their leave)</span></label>
      <div id="h-sum" class="card" style="padding:10px 14px;background:var(--surface-2)"></div>`,
    footer: `<button class="btn danger" id="h-clear">Remove the holiday</button><span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn primary" id="h-go">Mark holiday (H)</button>`,
  });
  const draw = () => {
    const p = plan(), d = longDate(dateOf(ms, day));
    $('#h-sum', m).innerHTML = p.wk ? `<b>${esc(d)}</b> is a weekend, so it is already a week off.` : `<b>${esc(d)}</b><br>${p.set.length} ${p.set.length === 1 ? 'person gets' : 'people get'} <b>H</b>${p.has.length ? ` · ${p.has.length} already ${p.has.length === 1 ? 'has' : 'have'} it` : ''}${p.keep.length ? ` · ${p.keep.length} keep${p.keep.length === 1 ? 's' : ''} their leave` : ''}`;
    $('#h-go', m).disabled = !p.set.length; $('#h-clear', m).disabled = !p.has.length;
  };
  m.addEventListener('input', e => { const t = e.target; if (t.id === 'h-date' && t.value) { const d = +t.value.slice(8, 10) - 1; if (d >= 0 && d < dim && t.value.slice(0, 7) === isoDate(dateOf(ms, 0)).slice(0, 7)) day = d; } else if (t.id === 'h-over') over = t.checked; else if (t.name === 'h-s') all = t.value === 'all'; draw(); });
  m.addEventListener('change', e => { if (e.target.name === 'h-s') { all = e.target.value === 'all'; draw(); } });
  $('#h-go', m).onclick = () => {
    const p = plan(); if (!p.set.length) return; closeModal();
    mutate(`Holiday (H) on ${longDate(dateOf(ms, day))} for ${p.set.length} people`, () => { if (!can('att.holidays')) throw permError('Only people with the "Manage holidays" right can mark a holiday for everyone.'); for (const r of p.set) setDay(r, day, 'H'); }, { holiday: true });
    toast(`Holiday marked on ${longDate(dateOf(ms, day))} for ${p.set.length} ${p.set.length === 1 ? 'person' : 'people'}. ${S.auto ? 'Saving to Excel in a few seconds.' : 'Press Save to Excel to keep it.'}`, { act: 'undo', label: 'Undo' });
  };
  $('#h-clear', m).onclick = () => {
    const p = plan(); if (!p.has.length) return; closeModal();
    mutate(`Removed the holiday on ${longDate(dateOf(ms, day))} for ${p.has.length} people`, () => { if (!can('att.holidays')) throw permError('Only people with the "Manage holidays" right can remove a holiday for everyone.'); for (const r of p.has) setDay(r, day, ''); }, { holiday: true });
    toast(`Holiday removed on ${longDate(dateOf(ms, day))}.`, { act: 'undo', label: 'Undo' });
  };
  draw(); $('#h-go', m).focus();
}

/* tracker rows use the workforce spelling (name + Emp ID) for every hand-linked name */
function fixRenameLinked() {
  const links = [...S.links.values()].filter(l => S.rows.some(r => personKey(r.name) === l.k)); if (!links.length) return;
  let n = 0;
  mutate(`Renamed ${links.length} tracker names to the workforce spelling`, () => {
    for (const l of links) { const id = parseId(l.code); for (const r of S.rows) if (personKey(r.name) === l.k) { r.name = l.rname; if (id != null) r.empId = id; n++; } }
    if (!n) return false;
  });
  if (n) toast(`Renamed ${links.length} names in ${n} rows. ${S.auto ? 'Saving to Excel in a few seconds.' : 'Review, then Save to Excel.'}`, { act: 'undo', label: 'Undo' });
}

/* ---------- health fixes ---------- */
const FIXES = {
  'fix-codes'() { let n = 0; mutate('Tidied attendance codes', () => { S.rows.forEach(r => r.days.forEach((v, i) => { if (v == null || i >= Engine.daysInMonth(r.month)) return; const s = String(v), c = s.trim().toUpperCase(); if (CODES[c] && s !== c) { r.days[i] = c; n++; } })); if (!n) return false; }); if (n) toast(`Tidied ${n} codes. Review, then Save.`, { act: 'undo', label: 'Undo' }); },
  'fix-ids'() {
    const idBy = new Map(); S.rows.forEach(r => { if (r.empId != null && r.empId !== '') { const k = personKey(r.name); (idBy.get(k) || idBy.set(k, new Map()).get(k)).set(String(r.empId), r.empId); } });
    let n = 0; mutate('Filled missing Emp IDs from other months', () => { S.rows.forEach(r => { if (r.empId != null && r.empId !== '') return; const m = idBy.get(personKey(r.name)); if (m && m.size === 1) { r.empId = [...m.values()][0]; n++; } }); if (!n) return false; }); if (n) toast(`Filled ${n} Emp IDs. Review, then Save.`, { act: 'undo', label: 'Undo' });
  },
  'fix-names'() { let n = 0; mutate('Trimmed extra spaces in names', () => { S.rows.forEach(r => { const t = r.name.trim().replace(/\s+/g, ' '); if (t !== r.name) { r.name = t; n++; } }); if (!n) return false; }); if (n) toast(`Trimmed ${n} names.`, { act: 'undo', label: 'Undo' }); },
  'fix-sync-roster'() {
    const items = rosterGaps().sync; if (!items.length) return;
    mutate(`Updated ${items.length} row${items.length === 1 ? '' : 's'} from the workforce file (names and Emp IDs)`, () => { for (const x of items) { x.r.name = x.name; const id = parseId(x.id); if (id != null) x.r.empId = id; } });
    toast(`Updated ${items.length} row${items.length === 1 ? '' : 's'} from the workforce file. Review, then Save.`, { act: 'undo', label: 'Undo' });
  },
  'fix-variant'() { let n = 0; mutate('Upcoming Leaves formula now counts LA in all rows', () => { S.rows.forEach(r => { if (r.variant === 'AL') { r.variant = 'LA'; n++; } }); if (!n) return false; }); if (n) toast(`Switched ${n} rows to count LA. Excel will recalculate on open.`, { act: 'undo', label: 'Undo' }); },
};

/* ---------- events ---------- */
/* go to a page of the Attendance section (from the Attendance page itself, or from Reports / the Action center) */
/* a person hidden by the status boxes / filters at the top: widen them so the person can be opened */
function showPerson(key) {
  if (D().people.has(key)) return;
  S.ui.showUnmatched = true;
  try { window.showAllStatuses(); } catch { }
}
function navTo(view, key) {
  if (S.mode !== 'app') { go(view, key); return; }
  closePop(); S.ui.view = view; if (key) { S.ui.people.sel = key; S.ui.people.q = ''; showPerson(key); }
  if (view === 'activity') S.act.items = null; render();
}
const ACTIONS = {
  nav(el) { navTo(el.dataset.v); },
  save() { save(); }, undo() { undo(); }, autosave() { setAuto(!S.auto); if (S.auto) autoTick(); },
  'sync-panel'() { window.openSyncPanel && window.openSyncPanel(); },
  'att-fields'() { openFieldsManager(); },
  retry() { S.folderKey = null; connect(); }, browse() { browseExternal(); }, reconnect() { reconnectExternal(); },
  'use-file'(el) { chooseFolderFile(el.dataset.n); },
  async 'change-file'() { closePop(); try { await scanFolder(); } catch { } S.picking = true; render(); },
  'cancel-pick'() { S.picking = false; render(); },
  async reload() { const ok = await confirmBox('Reload from disk?', `Your ${S.changes.length} unsaved change${S.changes.length === 1 ? '' : 's'} will be discarded and the workbook will be read again from disk.`, 'Reload'); if (ok) reloadFromDisk(); },
  'scope-all'() { try { window.restoreDefaultFilters(); } catch { } render(); },
  'toggle-unmatched'() { S.ui.showUnmatched = !S.ui.showUnmatched; render(); },
  holiday() { openHoliday(S.ui.grid.month); }, 'day-head'(el) { openHoliday(+el.dataset.ms, +el.dataset.d); },
  'rename-linked'() { fixRenameLinked(); },
  'open-fill'(el) { const i = healthIssues().find(x => x.id === el.dataset.i); if (i && i.fillPreset && typeof openFill === 'function') openFill({ preset: i.fillPreset, ids: i.fillIds, idsLabel: 'Attendance data health' }); },
  'open-emp'(el) { const p = D(true).people.get(el.dataset.k); const m = p && rosterOfPerson(p); if (m) { try { openDrawer(m.row); } catch (e) { console.error(e); } } },
  async 'fix-add-roster'() {
    const gp = rosterGaps(), n = gp.missing.length; if (!n) return;
    if (await confirmBox(`Track attendance for ${n} people?`, `They are added to the attendance workbook with their Emp ID, name and client from the workforce file, and saved straight away (a backup of the workbook is made first).`, `Track ${n} and save`)) trackRoster(gp.missing);
  },
  'link-person'(el) { const p = D(true).people.get(el.dataset.k); if (p) openLink({ person: p }); },
  'link-roster'(el) { const rr = rosterRowById(el.dataset.id); if (rr) openLink({ roster: rr }); },
  unlink(el) { removeLink(el.dataset.k); },
  'health-tab'(el) { S.ui.health.tab = el.dataset.t; render(); },
  'open-fix'(el) { S.ui.health.tab = 'people'; S.ui.health.f = el.dataset.f || 'all'; if (S.mode !== 'health') go('health'); else render(); },
  'fix-filter'(el) { S.ui.health.f = el.dataset.f; render(); },
  'fix-more'() { FIX.limit += 200; render(); },
  'fix-tick-all'() { const keys = $$('.fixtbl tbody tr').map(tr => tr.dataset.fk), R = fixRows(), all = keys.every(k => FIX.edits.get(k)?.on); for (const k of keys) { const x = R.byKey.get(k); if (x) fixEdit(x).on = !all; } render(); },
  'fix-suggest'() { for (const x of fixRows().list) { const e = fixEdit(x); if (x.rr ? !!(e.id || e.client) : !!(x.sugg && x.sugg.sure)) e.on = true; } render(); },
  'fix-untick'() { for (const x of fixRows().list) fixEdit(x).on = false; render(); },
  'fix-apply'() { fixApply(false); }, 'fix-apply-save'() { fixApply(true); },
  'track-one'(el) { const rr = rosterRowById(el.dataset.id); if (rr) trackRoster([rr]); },
  'mark-gone'() { openMarkGone(); },
  'ask-name'() { askName(); },
  'act-refresh'() { S.act.items = null; render(); },
  'act-more'() { S.ui.act.shown += 100; render(); },
  'act-csv'() {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', rows = [['Time', 'User', 'Made in', 'Workbook', 'Change', 'Employee', 'Emp ID', 'Details']];
    for (const it of actFiltered(false)) rows.push([it.time, it.user, isExt(it) ? 'Excel' : 'Dashboard', isAtt(it) ? 'Attendance' : 'Workforce', actVerb(it), it.name, it.key, (it.details && it.details.note) || '']);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' })); a.download = `attendance-activity-${isoDate(TODAY)}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  },
  person(el) { navTo('people', el.dataset.k); },
  'report-select'(el){selectAttendanceReport(el.dataset.kind,el.dataset.value);},
  'pick-month'(el) { if(S.mode==='reports'){selectAttendanceReport('period','m:'+el.dataset.m);return;} S.ui.period = 'm:' + el.dataset.m; render(); },
  'who-picture'(el) { copyWhoPicture(el); },
  'who-back'() { S.ui.who.start = isoDate(new Date(TODAY.getTime() - 14 * 86400000)); render(); },
  'review-la'() { S.ui.who.start = isoDate(TODAY); navTo('who'); },
  'who-days'(el) { S.ui.who.days = +el.dataset.n; render(); },
  'grid-kind'(el) { const g = S.ui.grid, k = el.dataset.k; g.kinds = (g.kinds || []).includes(k) ? g.kinds.filter(x => x !== k) : [...(g.kinds || []), k]; if (!g.kinds.length && g.sort === 'kind') g.sort = 'file'; render(); },
  'tl-kind'(el) { const t = tlUi(), k = el.dataset.k; t.kinds = t.kinds.includes(k) ? t.kinds.filter(x => x !== k) : [...t.kinds, k]; render(); },
  'tl-by'(el) { tlUi().by = el.dataset.v; render(); },
  'tl-reset'() { S.ui.tl = TL_DEFAULT(); render(); },
  'grid-kind-clear'() { const g = S.ui.grid; g.kinds = []; if (g.sort === 'kind') g.sort = 'file'; render(); }, 'who-today'() { S.ui.who.start = isoDate(TODAY); render(); },
  'resolve-la'(el) { resolveApplications([el.dataset.r + ':' + el.dataset.d], el.dataset.c || 'RJ'); },
  'resolve-la-group'(el) { resolveApplications((el.dataset.cells || '').split(',').filter(Boolean), el.dataset.c); },
  async 'fix-noclient'(el) {
    const x = fixRows().byKey.get(el.dataset.k); if (!x || !window.setClientNotNeeded) return;
    el.disabled = true;
    try { await window.setClientNotNeeded({ key: x.key, id: [...x.p.ids][0] ?? '', name: x.p.name.trim() }, true); fixRows.c = null; FIX.edits.delete(x.key); toast(x.p.name.trim() + ' will not be flagged for a missing client again.'); render(); notify(); }
    catch (e) { el.disabled = false; toast('Could not save: ' + e.message); }
  },
  'req-approve'(el) { const s = el.closest('.li') && el.closest('.li').querySelector('select[data-req-code]'); el.disabled = true; approveRequest(el.dataset.id, s ? s.value : null); },
  'req-reject'(el) { openRejectBox(el.dataset.id); },
  'req-cancel'(el) { cancelRequest(el.dataset.id); },
  'log-leave'(el) { openLogLeave(el.dataset.k || (S.ui.view === 'people' ? S.ui.people.sel : null)); },
  'new-month'() { openNewMonth(); }, 'add-row'() { openRowEditor(null); },
  'edit-row'(el) { openRowEditor(+el.dataset.r); }, 'del-row'(el) { confirmDelete(+el.dataset.r); },
  cell(el) { if ($('#pop') && el.classList.contains('selected')) { closePop(); return; } openPop(el); },
  ...FIXES,
};
function wireEvents() {
  ROOT.addEventListener('click', e => {
    if (!e.target.closest('#pop') && !e.target.closest('[data-act="cell"]')) closePop();
    const el = e.target.closest('[data-act]'); if (!el) return; const fn = ACTIONS[el.dataset.act]; if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('click', e => { if (!e.composedPath().includes(ROOT.host)) closePop(); });
  ROOT.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const el=e.target.closest('[data-act="report-select"],[data-act="pick-month"]');if(el){e.preventDefault();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}});
  ROOT.addEventListener('change', onBind); ROOT.addEventListener('input', onBind);
  document.addEventListener('keydown', e => {
    if (!active()) return;
    if (e.key === 'Escape') { if ($('#pop')) closePop(); else if ($('#modalRoot')) closeModal(); return; }
    const t = e.composedPath()[0]; const typing = /INPUT|TEXTAREA|SELECT/.test(t?.tagName || '');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (S.ctx && S.changes.length) save(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing && S.undo.length) { e.preventDefault(); undo(); }
  });
}
function refocus(sel, caret) { render(); const i = $(sel); if (i) { i.focus(); const l = i.value.length; i.setSelectionRange(l, l); } }
function onBind(e) {
  const fx = e.target.closest('[data-fix]'); if (fx) { fixInput(fx, e); return; }
  const el = e.target.closest('[data-bind]'); if (!el) return; const b = el.dataset.bind, v = el.value, isInput = e.type === 'input';
  if (isInput && !['gq', 'pq', 'aq', 'hq', 'tlq'].includes(b) && el.type !== 'number') return; if (!isInput && ['gq', 'pq', 'aq', 'hq', 'tlq'].includes(b)) return;
  const u = S.ui;
  switch (b) {
    case 'period': if(S.mode==='reports'){selectAttendanceReport('period',v);break;}u.period = v; render(); break; case 'oclient': if(S.mode==='reports'){if(v==='all'){reportScope.cohort=null;reportScope.label='';u.client='all';reportChanged();}else selectAttendanceReport('client',v);break;}u.client = v; render(); break;
    case 'thr-ul': case 'thr-total': { if (!isInput) break; const t = u.thr[u.period.startsWith('m:') ? 'month' : 'long']; const n = Math.max(1, +v || 1); if (b === 'thr-ul') t.ul = n; else t.total = n; render(); const nx = $(`[data-bind="${b}"]`); nx?.focus(); nx?.select(); break; }
    case 'gmonth': u.grid.month = +v; render(); break;
    case 'gyear': { const mIdx = Engine.serialToDate(u.grid.month).getUTCMonth(), ms = Engine.monthSerial(+v, mIdx); u.grid.month = ms; render(); break; }
    case 'gq': u.grid.q = v; refocus('[data-bind="gq"]'); break;
    case 'tlq': tlUi().q = v; refocus('[data-bind="tlq"]'); break;
    case 'tl-range': { const t = tlUi(); t.range = v; if (v === 'custom' && !t.from) { const pr = tlRange(periodRows()); if (pr) { t.from = isoDate(pr[0]); t.to = isoDate(pr[1]); } } render(); break; }
    case 'tl-from': if (v) { tlUi().from = v; render(); } break; case 'tl-to': if (v) { tlUi().to = v; render(); } break;
    case 'tl-wk': tlUi().hideWk = el.checked; render(); break;
    case 'gclient': u.grid.client = v; render(); break; case 'gstatus': u.grid.status = v; render(); break; case 'gfilter': u.grid.filter = v; render(); break; case 'gsort': u.grid.sort = v; render(); break;
    case 'who-start': if (v) { u.who.start = v; render(); } break; case 'who-show': u.who.show[el.dataset.k] = el.checked; render(); break;
    case 'pq': u.people.q = v; refocus('[data-bind="pq"]'); break;
    case 'scope': u.scope = v; render(); break;
    case 'awb': u.act.wb = v; u.act.user = 'all'; u.act.shown = 100; render(); break; case 'auser': u.act.user = v; u.act.shown = 100; render(); break;
    case 'avia': u.act.via = v; u.act.shown = 100; render(); break; case 'atype': u.act.type = v; u.act.shown = 100; render(); break;
    case 'hq': u.health.q = v; refocus('[data-bind="hq"]'); break; case 'hall': u.health.all = el.checked; render(); break;
    case 'aq': u.act.q = v; u.act.shown = 100; refocus('[data-bind="aq"]'); break;
  }
}

/* ==========================================================================
   MOUNT + HOST INTEGRATION (Team Dashboard <-> Attendance)
   ========================================================================== */
function mount() {
  const host = document.getElementById('attHost'); if (!host || ROOT) return;
  ROOT = host.attachShadow({ mode: 'open' });
  ROOT.innerHTML = `<style>${ATT_CSS}
.tl-filters { display:flex; flex-wrap:wrap; align-items:center; gap:6px 8px; margin:10px 0 0; }
.tl-filters label { display:inline-flex; align-items:center; gap:6px; }
.tl-filters + .tl-scroll, .tl-filters + .empty { margin-top:12px; }
.tl-dot { display:inline-block; width:10px; height:10px; border-radius:3px; margin-left:4px; }
.tl-chk input { margin:0; }
.lf-bar { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:0 0 10px; }
.lf-bar > .sm { margin-right:4px; }
.lf { display:inline-flex; align-items:center; gap:6px; padding:3px 9px 3px 4px; border:1px solid var(--line-2); border-radius:999px; background:var(--surface); color:var(--ink-2); font-size:12.5px; cursor:pointer; }
.lf .chip { display:inline-flex; height:20px; min-width:24px; padding:0 5px; font-size:10.5px; }
.lf b { color:var(--ink); font-weight:650; }
.lf:hover:not(:disabled) { border-color:var(--accent); }
.lf[aria-pressed=true] { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 12%,var(--surface)); color:var(--ink); box-shadow:inset 0 0 0 1px var(--accent); }
.lf:disabled { opacity:.45; cursor:default; }
table.att td.cell .chip.faded { opacity:.22; }
/* Charts must shrink with their containing card, including value labels. */
.grid > *, .card { min-width:0; }
.hbar { display:grid; grid-template-columns:minmax(70px,32%) minmax(0,1fr) max-content; gap:10px; width:100%; min-width:0; }
.hbar .nm { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hbar .trk { width:100%; min-width:0; }
.hbar .v { min-width:0; width:auto; white-space:nowrap; text-align:right; }
svg.chart { display:block; width:100%; max-width:100%; height:auto; }

:host { font-size:13px; }
.card { padding:14px; border-radius:8px; }
.btn { min-height:29px; border-radius:6px; font-size:12px; }
.kpi { padding:11px; border-radius:7px; }
table.att tbody tr { height:36px; }
table.att td { padding-top:5px; padding-bottom:5px; }

.chip.cat-rejected { color:var(--crit-ink,var(--ink)); background:color-mix(in srgb,var(--c-red,#d03b3b) 12%,var(--surface)); border:1px dashed var(--c-red,#d03b3b); }
.la-group { padding:8px 0; border-bottom:1px solid var(--line); }
.la-group > .li { border-bottom:0; padding-bottom:5px; }
.la-bulk { display:flex; align-items:center; flex-wrap:wrap; gap:6px; padding:0 10px 8px; }
.la-group details { padding:0 10px; }
.la-group summary { cursor:pointer; font-size:12px; color:var(--ink-2); padding:4px 0; }
.la-group details .li { flex-wrap:wrap; gap:5px; }
</style><div id="app"></div>`;
  wireTips(); wireEvents();
  kv.get('user').then(n => { if (n) BE.setUser(n); updateWho(); });
  document.getElementById('btnWho')?.addEventListener('click', askName); updateWho();
  window.addEventListener('focus', () => { if (S.status === 'ready') checkDisk(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.status === 'ready') checkDisk(); });
  setInterval(() => { if (S.status === 'ready' && !document.hidden) checkDisk(); }, 2000);
  setInterval(autoTick, 500);
}

/* ---- Team roster person  ->  attendance person ---- */
function personForRoster(row) {
  if (S.status !== 'ready') return null;
  const d = D(true), id = idKey(gs(row, 'key_column')), nm = personKey(gs(row, 'name_column'));
  let hit = null;
  for (const lk of S.links.values()) if ((lk.code && idKey(lk.code) === id) || (!lk.code && personKey(lk.rname) === nm)) { hit = d.people.get(lk.k) || null; if (hit) return hit; }   // linked by hand
  /* the newest row's Emp ID wins (old rows sometimes carry a copied, wrong ID), then the name, then any older ID that only one person has */
  if (id) { const l = [...d.people.values()].filter(p => idKey(p.latest.empId) === id); hit = l.find(p => p.key === nm) || l[0] || null; }
  if (!hit) hit = d.people.get(nm) || null;
  if (!hit) { const t = nameTokens(nm), l = [...d.people.values()].filter(p => nameTokens(p.name) === t); if (l.length === 1) hit = l[0]; }
  if (!hit && id) { const l = [...d.people.values()].filter(p => [...p.ids].some(x => idKey(x) === id)); if (l.length === 1) hit = l[0]; }
  return hit;
}

/* ---- small helpers for the host-styled pieces ---- */
const catClass = c => ({ approved: 'approved', sick: 'sick', unplanned: 'unplanned', half: 'half', applied: 'applied' }[c] || '');
const shortDay = d => `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
function upcomingFor(rows, days) {
  const out = [];
  for (let k = 0; k <= days; k++) {
    const dt = new Date(TODAY.getTime() + k * 86400000), ms = Engine.monthSerial(dt.getUTCFullYear(), dt.getUTCMonth()), i = dt.getUTCDate() - 1;
    for (const r of rows.get ? (rows.get(ms) || []) : rows.filter(x => x.month === ms)) { const v = r.days[i], c = catOf(v); if (c && (LEAVE_CATS.has(c) || c === 'applied')) out.push({ dt, k, r, v: String(v).trim().toUpperCase(), c }); }
  }
  return out;
}
const pillHtml = (name, code, c) => `<span class="att-pill ${catClass(c)}" title="${esc(labelOf(code))}">${esc(name)} <i>${esc(code)}</i></span>`;

/* ---- Overview card: attendance for any day, who was absent lately, who is off soon ---- */
const KIND_LABELS = { all: 'All leave types', approved: 'Approved leave (AL, CL)', applied: 'Awaiting approval (LA)', sick: 'Sick leave (SL)', unplanned: 'Unplanned / absent (UL, AB)', half: 'Half days' };
const CARD_PAST = [3, 7, 14, 30, 60, 90], CARD_NEXT = [7, 15, 30, 45, 60, 90];
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
function refDay() { const c = S.ui.card.date; if (c && /^\d{4}-\d\d-\d\d$/.test(c)) { const d = new Date(c + 'T00:00:00Z'); if (!isNaN(d)) return d; } return TODAY; }
const kindOk = c => S.ui.card.kind === 'all' || S.ui.card.kind === c;
/* everything logged on one date: leave of any kind and applications (LA) */
function entriesOn(d, dt) {
  const rows = d.byMonth.get(Engine.monthSerial(dt.getUTCFullYear(), dt.getUTCMonth())) || [], i = dt.getUTCDate() - 1, out = [];
  for (const r of rows) { const v = r.days[i], c = catOf(v); if (c && (LEAVE_CATS.has(c) || c === 'applied')) out.push({ r, v: String(v).trim().toUpperCase(), c, dt }); }
  return out;
}
const rangeEntries = (d, from, to) => { const out = []; for (let t = from.getTime(); t <= to.getTime(); t += 86400000) out.push(...entriesOn(d, new Date(t)).filter(e => kindOk(e.c))); return out; };

function renderCard(el) {
  if (!el) return; renderCard.el = el;
  const C = S.ui.card, goBtns = `<button class="btn mini" data-att-go="grid">Open attendance →</button>`;
  const head = sub => `<div class="card-head"><div class="grow"><h2>Attendance</h2><div class="sub">${sub}</div></div>${goBtns}</div>`;
  let html;
  if (S.status === 'loading' || S.status === 'idle') html = head('Looking for the attendance workbook…') + '<div class="empty">Loading…</div>';
  else if (S.status !== 'ready' || !S.ctx) html = head('Not connected yet') + `<div class="empty">The attendance workbook isn’t connected. <button class="linkbtn" data-att-go="grid">Set it up</button></div>`;
  else {
    const d = D(), rd = refDay(), rdIso = isoDate(rd), isToday = rd.getTime() === TODAY.getTime(), rms = Engine.monthSerial(rd.getUTCFullYear(), rd.getUTCMonth()), ri = rd.getUTCDate() - 1;
    const rows = d.byMonth.get(rms) || [], sub = `${longDate(rd)}${isToday ? ' (today)' : rd < TODAY ? ' · past day' : ' · upcoming day'} · ${esc(S.fileName)}${' · ' + esc(hostSummary())}`;
    const nav = `<div class="att-nav" role="group" aria-label="Choose the day"><button class="btn mini" data-att-step="-1" title="Previous day" aria-label="Previous day">‹</button><input type="date" class="input mini" data-att-date value="${rdIso}" aria-label="Show this day"><button class="btn mini" data-att-step="1" title="Next day" aria-label="Next day">›</button><button class="btn mini" data-att-day="today" ${isToday ? 'disabled' : ''}>Today</button></div>`;
    const head2 = `<div class="card-head"><div class="grow"><h2>Attendance</h2><div class="sub">${sub}</div></div>${nav}${goBtns}</div>`;
    /* day strip: a compact heat-strip from N days back to M days ahead - a dot per day (darker = more people out), month
       shown only where it changes, full detail in the hover tip. Click a day to see it. Keeps working at any past/next width. */
    const strip = []; for (let k = -C.past; k <= C.next; k++) {
      const dt = addDays(rd, k), es = entriesOn(d, dt).filter(e => kindOk(e.c)), out = es.filter(e => e.c !== 'applied').length, la = es.length - out, iso = isoDate(dt), wk = dt.getUTCDay() === 0 || dt.getUTCDay() === 6, isTodayDt = dt.getTime() === TODAY.getTime(), lvl = out === 0 ? 0 : out <= 2 ? 1 : out <= 5 ? 2 : 3, monthStart = dt.getUTCDate() === 1 || k === -C.past;
      const label = `${longDate(dt)}${isTodayDt ? ' (today)' : ''}: ${out} on leave${la ? `, ${la} awaiting approval (LA)` : ''}`;
      strip.push(`<button class="att-day lvl${lvl}${iso === rdIso ? ' sel' : ''}${isTodayDt ? ' today' : ''}${wk ? ' wk' : ''}" data-att-day="${iso}" data-tip="${esc(label)}" aria-label="${esc(label)}">${monthStart ? `<em>${MONTHS[dt.getUTCMonth()]}</em>` : ''}<b>${dt.getUTCDate()}</b><i class="dot"></i></button>`);
    }
    const kpi = (b, l, hot) => `<div class="att-kpi ${hot ? 'hot' : ''}"><b>${b}</b><span>${l}</span></div>`;
    /* names: real (tracker) or pseudo (workforce "Pseudo Names" column); client from the tracker, else the workforce file */
    const pseudoCol = typeof colByName === 'function' ? colByName(/pseudo/i) : null, usePseudo = !!pseudoCol && C.names === 'pseudo';
    const nm = r => { if (usePseudo) { const w = rowRoster(r), p = w ? String(g(w, pseudoCol) ?? '').trim() : ''; if (p) return p; } return r.name.trim(); };
    const cl = r => { if (r.client) return String(r.client).trim(); const w = rowRoster(r); return w ? gs(w, 'client_column') : ''; };
    const dayWord = isToday ? 'today' : 'that day';
    let kpis = '';
    if (rows.length) {
      const cats = rows.map(r => catOf(r.days[ri]));
      const full = cats.filter(c => c === 'approved' || c === 'sick' || c === 'unplanned').length, half = cats.filter(c => c === 'half').length, late = cats.filter(c => c === 'late').length;
      kpis = `<div class="att-kpis">${kpi(full, 'on leave ' + dayWord, full > 0)}${kpi(half, 'on half day ' + dayWord, half > 0)}${kpi(late, 'late comings ' + dayWord, late > 0)}</div>`;
    }
    const toggle = (key, opts) => `<div class="att-toggle" role="group">${opts.map(([v, l]) => `<button type="button" data-att-${key}="${v}" aria-pressed="${C[key] === v}">${l}</button>`).join('')}</div>`;
    const bar = `<div class="att-bar">${toggle('view', [['today', 'Today'], ['history', 'History & upcoming']])}<span class="grow"></span>${pseudoCol ? toggle('names', [['real', 'Real names'], ['pseudo', 'Pseudo names']]) : ''}</div>`;
    /* Semantic tables share the exact same rows with clipboard exports. */
    const tableData = (headers, records, caption) => ({ headers, records, caption });
    const tableHtml = data => '<div class="att-table-scroll" tabindex="0" role="region" aria-label="' + esc(data.caption) + '"><table class="att-summary-table"><caption class="sr-only">' + esc(data.caption) + '</caption><thead><tr>' + data.headers.map(x => '<th scope="col">' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + data.records.map(row => '<tr>' + row.map((x,i) => '<td' + (data.headers[i] === 'Days' ? ' class="num"' : '') + '>' + esc(String(x)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    const es = entriesOn(d, rd).filter(e => kindOk(e.c));
    const todayCopy = tableData(['Employee', 'Client', 'Code', 'Status'], es.map(e => [nm(e.r), cl(e.r), e.v, e.c === 'applied' ? 'Awaiting approval' : labelOf(e.v)]), 'Out on ' + longDate(rd));
    const col1 = es.length ? '<p class="att-table-meta">' + es.length + ' entries · ' + esc(longDate(rd)) + '</p>' + tableHtml(todayCopy)
      : '<div class="att-table-empty">' + (!rows.length ? 'No attendance rows for this month.' : 'No matching leave entries for this day.') + '</div>';
    const past = rangeEntries(d, addDays(rd, -C.past), addDays(rd, -1)).filter(e => C.kind === 'applied' || e.c !== 'applied'), byP = new Map();
    for (const e of past) { const k = personKey(e.r.name), o = byP.get(k) || { name: nm(e.r), client: cl(e.r), list: [], n: 0 }; o.list.push(e); o.n += e.c === 'half' ? 0.5 : 1; byP.set(k, o); }
    const pl = [...byP.values()].sort((a,b) => b.n - a.n || a.name.localeCompare(b.name));
    const pastDays = pl.reduce((a,o) => a + o.n, 0);
    const codeSummary = list => { const m = new Map(); for (const e of list) m.set(e.v, (m.get(e.v) || 0) + 1); return [...m.entries()].map(([c,n]) => c + ' ×' + n).join(' · '); };
    const pastCopy = tableData(['Employee', 'Client', 'Leave breakdown', 'Days'], pl.map(o => [o.name, o.client, codeSummary(o.list), fmt(o.n)]), 'Past ' + C.past + ' days before ' + longDate(rd));
    const col2 = pl.length ? '<p class="att-table-meta">' + pl.length + ' people · ' + fmt(pastDays) + (C.kind === 'applied' ? ' application days' : ' leave days') + '</p>' + tableHtml(pastCopy) : '<div class="att-table-empty">No matching absences in this period.</div>';
    const nx = rangeEntries(d, addDays(rd, 1), addDays(rd, C.next));
    const nPeople = new Set(nx.map(e => personKey(e.r.name))).size;
    const upcomingCopy = tableData(['Date', 'Employee', 'Client', 'Code', 'Status'], nx.map(e => [isoDate(e.dt), nm(e.r), cl(e.r), e.v, e.c === 'applied' ? 'Awaiting approval' : labelOf(e.v)]), 'Next ' + C.next + ' days after ' + longDate(rd));
    const col3 = nx.length ? '<p class="att-table-meta">' + nx.length + ' entries · ' + nPeople + ' people</p>' + tableHtml(upcomingCopy) : '<div class="att-table-empty">No upcoming leave in this period.</div>';
    const sel = (b, opts, v, fmtOpt) => `<select class="input mini" data-att-${b} style="width:auto;min-width:0;height:26px" aria-label="${b === 'past' ? 'Days back' : 'Days ahead'}">${opts.map(o => `<option value="${o}"${o === v ? ' selected' : ''}>${fmtOpt(o)}</option>`).join('')}</select>`;
    const kindSel = `<label class="hint" style="display:inline-flex;align-items:center;gap:6px">Show <select class="input mini" data-att-kind style="width:auto;min-width:0;height:26px">${Object.entries(KIND_LABELS).map(([k, l]) => `<option value="${k}"${k === C.kind ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
    const copyBtn = (key, text) => text.records.length ? `<button class="btn mini ghost copybtn" data-att-copy="${key}" title="Copy table for Excel or email">${ic('copy')} Copy table</button>` : '';
    renderCard._copy = { today: todayCopy, past: pastCopy, upcoming: upcomingCopy };
    const todayCol = `<div class="att-cols clean-today"><div><h3>${isToday ? 'Out today' : 'Out on ' + shortDay(rd)}${copyBtn('today', todayCopy)}</h3>${col1}</div></div>`;
    const historyCols = `<div class="att-stripwrap"><div class="att-strip" id="attStrip" role="group" aria-label="Days. Click one to see its attendance">${strip.join('')}</div></div>
      <div class="att-legend"><span class="sm muted">Each day above: a darker dot means more people on leave. Hover or click a day for details.</span><span class="grow"></span>${kindSel}</div>
      <div class="att-cols hist-cols"><div><h3>Recent absences ${sel('past', CARD_PAST, C.past, n => n + ' days')}${copyBtn('past', pastCopy)}</h3>${col2}</div>
      <div><h3>Upcoming leave ${sel('next', CARD_NEXT, C.next, n => n + ' days')}${copyBtn('upcoming', upcomingCopy)}</h3>${col3}</div></div>`;
    html = head2 + bar + kpis + (C.view === 'history' ? historyCols : todayCol);
  }
  if (S.status === 'ready' && S.ctx && hasRoster()) { const n = rosterGaps().missing.length, u = rosterGaps().notInRoster.length; const bits = []; if (n) bits.push(`${n} ${n === 1 ? 'person' : 'people'} in the workforce file ${n === 1 ? 'isn’t' : 'aren’t'} in the attendance tracker yet`); if (u) bits.push(`${u} tracker ${u === 1 ? 'name doesn’t' : 'names don’t'} match the workforce file`); if (bits.length) html += `<div class="hint" style="margin-top:12px">${bits.join(' · ')}. <button class="linkbtn" data-att-go="health">Fix in Action center</button></div>`; }
  el.innerHTML = html;
  el.querySelectorAll('[data-att-view]').forEach(b => b.addEventListener('click', () => { S.ui.card.view = b.dataset.attView; saveCardUi(); renderCard(el); }));
  el.querySelectorAll('[data-att-names]').forEach(b => b.addEventListener('click', () => { S.ui.card.names = b.dataset.attNames; saveCardUi(); renderCard(el); }));
  el.querySelectorAll('[data-att-go]').forEach(b => b.addEventListener('click', () => { const v = b.dataset.attGo; if (v === 'who' && refDay().getTime() !== TODAY.getTime()) S.ui.who.start = isoDate(refDay()); go(v); if (b.dataset.attNew) setTimeout(() => ACTIONS['new-month'](), 60); }));
  el.querySelectorAll('[data-att-copy]').forEach(b => b.addEventListener('click', async () => {
    const text = (renderCard._copy || {})[b.dataset.attCopy];
    if (!text?.records.length) { toast('Nothing to copy.'); return; }
    if (await copyAttendanceTable(text)) {
      toast('Table copied. Paste into Excel or an email.');
      const original = b.innerHTML; b.textContent = 'Copied ✓';
      setTimeout(() => { if (b.isConnected) b.innerHTML = original; }, 1800);
    } else toast("Couldn't copy: the browser blocked clipboard access.", true);
  }));
  const redraw = () => { saveCardUi(); renderCard(el); };
  el.querySelectorAll('[data-att-day]').forEach(b => b.addEventListener('click', () => { C_set(b.dataset.attDay === 'today' ? null : b.dataset.attDay); redraw(); }));
  el.querySelectorAll('[data-att-step]').forEach(b => b.addEventListener('click', () => { C_set(isoDate(addDays(refDay(), +b.dataset.attStep))); redraw(); }));
  el.querySelector('[data-att-date]')?.addEventListener('change', e => { if (e.target.value) { C_set(e.target.value); redraw(); } });
  el.querySelector('[data-att-past]')?.addEventListener('change', e => { S.ui.card.past = +e.target.value; redraw(); });
  el.querySelector('[data-att-next]')?.addEventListener('change', e => { S.ui.card.next = +e.target.value; redraw(); });
  el.querySelector('[data-att-kind]')?.addEventListener('change', e => { S.ui.card.kind = e.target.value; redraw(); });
  const sel = el.querySelector('.att-day.sel'), st = el.querySelector('#attStrip'); if (sel && st) st.scrollLeft = Math.max(0, sel.offsetLeft - st.clientWidth / 2 + sel.offsetWidth / 2);
}
const C_set = iso => { S.ui.card.date = iso && iso !== isoDate(TODAY) ? iso : null; };

/* ---- v3.14: Leave watch (Overview). Back-to-back leave in a recent window, and leave that keeps landing on the same weekday ----
   Follows the filters at the top like the rest of the Overview. Full-day leave codes build a streak (AL, CL, SL, UL, AB);
   week offs, holidays and blank weekends in between do not break it, so Friday + Monday counts as back to back. */
const WATCH_KEY = 'td_watch_v1';
const watchUi = () => { if (!S.ui.watch) { let saved = {}; try { saved = JSON.parse(localStorage.getItem(WATCH_KEY) || '{}') || {}; } catch { } S.ui.watch = { days: [15, 30, 45, 60].includes(saved.days) ? saved.days : 30, min: [2, 3, 5].includes(saved.min) ? saved.min : 2, look: [60, 90, 180].includes(saved.look) ? saved.look : 90 }; } return S.ui.watch; };
const FULL_LEAVE = new Set(['approved', 'sick', 'unplanned']);
const DAY_MS = 86400000;
const shortDate = dt => `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
function personDayReader(p) {
  const byMonth = new Map(); for (const r of p.rows) byMonth.set(r.month, r);   // rows are sorted, so the newest row of a month wins
  return dt => { const r = byMonth.get(Engine.monthSerial(dt.getUTCFullYear(), dt.getUTCMonth())); return r ? r.days[dt.getUTCDate() - 1] : null; };
}
function leaveWatchData() {
  const u = watchUi(), d = D(), streaks = [], patterns = [];
  const from = new Date(TODAY.getTime() - (u.days - 1) * DAY_MS), lookFrom = new Date(TODAY.getTime() - (u.look - 1) * DAY_MS);
  const WD = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  for (const p of d.people.values()) {
    const at = personDayReader(p);
    /* 1. streaks inside the chosen window */
    const runs = []; let cur = null, windowDays = 0;
    for (let t = from.getTime(); t <= TODAY.getTime(); t += DAY_MS) {
      const dt = new Date(t), v = at(dt), c = catOf(v), wk = dt.getUTCDay() === 0 || dt.getUTCDay() === 6;
      if (FULL_LEAVE.has(c)) { windowDays++; if (!cur) cur = { start: dt, end: dt, n: 0, codes: {}, bridged: false }; cur.end = dt; cur.n++; const k = up(v).trim(); cur.codes[k] = (cur.codes[k] || 0) + 1; }
      else if (c === 'half') windowDays += 0.5;
      if (FULL_LEAVE.has(c)) continue;
      if (cur && (c === 'off' || (!c && wk))) { cur.bridged = true; continue; }   // a week off or holiday in between keeps the streak going
      if (cur) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    const hits = runs.filter(r => r.n >= u.min);
    if (hits.length) {
      const longest = Math.max(...hits.map(r => r.n));
      const aroundWk = hits.some(r => r.end.getTime() - r.start.getTime() >= r.n * DAY_MS && (r.start.getUTCDay() === 5 || r.end.getUTCDay() === 1));
      const sev = longest >= Math.max(3, u.min + 1) || hits.length >= 2 ? 'red' : 'amber';
      streaks.push({ k: p.key, name: p.name, client: p.latest ? p.latest.client : '', hits, longest, total: windowDays, sev, aroundWk });
    }
    /* 2. weekday pattern over the look-back period (weekdays only; each leave or half day counts once) */
    const wd = [0, 0, 0, 0, 0, 0, 0]; let n = 0; const dates = [];
    for (let t = lookFrom.getTime(); t <= TODAY.getTime(); t += DAY_MS) {
      const dt = new Date(t), w = dt.getUTCDay(); if (w === 0 || w === 6) continue;
      const c = catOf(at(dt)); if (!FULL_LEAVE.has(c) && c !== 'half') continue;
      wd[w]++; n++; dates.push(dt);
    }
    if (n >= 3) {
      let top = 1; for (let w = 2; w <= 5; w++) if (wd[w] > wd[top]) top = w;
      const monFri = wd[1] + wd[5];
      let kind = null, text = '';
      if (wd[top] >= 3 && wd[top] / n >= 0.6) { kind = 'day'; text = `Mostly on ${WD[top]}: ${wd[top]} of ${n} leave days`; }
      else if (n >= 4 && monFri >= 3 && monFri / n >= 0.75) { kind = 'weekend'; text = `Next to weekends: ${monFri} of ${n} leave days on a Monday or Friday`; }
      if (kind) patterns.push({ k: p.key, name: p.name, client: p.latest ? p.latest.client : '', kind, text, share: (kind === 'day' ? wd[top] : monFri) / n, n, day: kind === 'day' ? WD[top] : 'Mon / Fri', recent: dates.slice(-4).map(shortDate) });
    }
  }
  streaks.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'red' ? -1 : 1) || b.longest - a.longest || b.hits.length - a.hits.length || a.name.localeCompare(b.name));
  patterns.sort((a, b) => b.share - a.share || b.n - a.n || a.name.localeCompare(b.name));
  return { streaks, patterns, u };
}
function renderWatch(el) {
  if (!el) return; renderWatch.el = el;
  const u = watchUi();
  const opt = (vals, cur, lab) => vals.map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${lab(v)}</option>`).join('');
  const head = sub => `<div class="watch-head"><div class="grow"><h2>Leave watch</h2><div class="sub">${sub}</div></div>
    <label class="hint" style="display:flex;align-items:center;gap:6px">Past <select class="input mini" data-w="days" aria-label="Window for back-to-back leave">${opt([15, 30, 45, 60], u.days, v => v + ' days')}</select></label>
    <label class="hint" style="display:flex;align-items:center;gap:6px">Streak <select class="input mini" data-w="min" aria-label="Shortest streak to flag">${opt([2, 3, 5], u.min, v => v + '+ days')}</select></label></div>`;
  if (S.status !== 'ready' || !S.ctx) { el.innerHTML = head('Back-to-back leave and repeat-day patterns') + '<div class="watch-empty">The attendance workbook isn’t connected yet.</div>'; return; }
  const { streaks, patterns } = leaveWatchData();
  const reds = streaks.filter(s => s.sev === 'red').length;
  const runText = r => r.n + ' days · ' + (r.start.getTime() === r.end.getTime() ? shortDate(r.start) : shortDate(r.start) + ' – ' + shortDate(r.end)) + ' (' + Object.entries(r.codes).map(([c, k]) => c + (k > 1 ? ' ×' + k : '')).join(', ') + ')';
  const sList = streaks.length ? `<ul class="watch-list">${streaks.map(s => `<li><span class="flag ${s.sev}">${s.sev === 'red' ? '⚑ Red flag' : 'Watch'}</span><div class="who"><b>${esc(s.name)}</b><small>${s.hits.length} streak${s.hits.length === 1 ? '' : 's'} · longest ${s.longest} days · ${fmt(s.total)} leave days in the past ${u.days} days${s.aroundWk ? ' · spans a weekend' : ''}</small><small>${s.hits.slice(-3).map(runText).map(esc).join('<br>')}</small></div><button class="btn mini" data-w-open="${esc(s.k)}">Open</button></li>`).join('')}</ul>`
    : `<div class="watch-empty">Nobody took ${u.min} or more working days of leave in a row in the past ${u.days} days.</div>`;
  const pList = patterns.length ? `<ul class="watch-list">${patterns.map(p => `<li><span class="flag ${p.kind === 'day' ? 'blue' : 'amber'}">${esc(p.day)}</span><div class="who"><b>${esc(p.name)}</b><small>${esc(p.text)}</small><small>Latest: ${esc(p.recent.join(', '))}</small></div><button class="btn mini" data-w-open="${esc(p.k)}">Open</button></li>`).join('')}</ul>`
    : `<div class="watch-empty">No one’s leave keeps falling on the same weekday in the past ${u.look} days.</div>`;
  el.innerHTML = head(`${streaks.length ? `<b style="color:var(--danger)">${reds} red flag${reds === 1 ? '' : 's'}</b> · ${streaks.length} ${streaks.length === 1 ? 'person' : 'people'} with back-to-back leave` : 'No back-to-back leave'} · ${patterns.length} repeat-day pattern${patterns.length === 1 ? '' : 's'} · follows the filters at the top`)
    + `<div class="watch-cols"><section class="watch-col" aria-label="Back-to-back leave"><h3>Back-to-back leave · past ${u.days} days</h3><div class="sub">Red flag: a streak longer than ${Math.max(2, u.min)} days, or two or more streaks. Weekends and holidays in between don’t break a streak.</div>${sList}</section>
      <section class="watch-col" aria-label="Leave on particular days"><h3 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">Leave on particular days <label class="hint" style="display:flex;align-items:center;gap:6px;font-weight:400">over <select class="input mini" data-w="look" aria-label="Look-back for day patterns">${opt([60, 90, 180], u.look, v => v + ' days')}</select></label></h3><div class="sub">People with 3+ leave days where most fall on one weekday, or on Mondays and Fridays.</div>${pList}</section></div>`;
  el.querySelectorAll('[data-w]').forEach(s => s.addEventListener('change', () => { u[s.dataset.w] = +s.value; try { localStorage.setItem(WATCH_KEY, JSON.stringify(u)); } catch { } renderWatch(el); }));
  el.querySelectorAll('[data-w-open]').forEach(b => b.addEventListener('click', () => { if (can('att.grid')) go('people', b.dataset.wOpen); else toast('Your passcode can’t open the People view.'); }));
}

/* ---- Employee drawer panel ---- */
const DP_SERIES = [['approved', 'Approved', 'var(--c-blue)', s => s.approved], ['unpl', 'Unplanned', 'var(--c-orange)', s => s.unpl], ['sick', 'Sick', 'var(--c-aqua)', s => s.sick], ['half', 'Half days', 'var(--c-yellow)', s => s.half * 0.5]];
function drawerPanel(row) {
  const box = document.createElement('fieldset'); box.className = 'att-panel'; let missMonths = [];
  const open = key => { go('people', key); };
  const msg = (t, link) => { box.innerHTML = `<legend>Attendance</legend><div class="hint">${t}${link ? ` <button type="button" class="linkbtn" data-go>${link}</button>` : ''}</div>`; box.querySelector('[data-go]')?.addEventListener('click', () => go('overview')); return box; };
  if (S.status === 'loading') return msg('Loading attendance…');
  if (S.status !== 'ready') return msg('The attendance workbook isn’t connected.', 'Set it up');
  const p = personForRoster(row), kind = goneKind(row), lv = dateSerial(row);
  const goneNote = kind ? `<div class="hint" style="margin-bottom:8px">${kind === 'left' ? 'Left the team' + (lv != null ? ' on ' + serialText(lv) : '') : 'Moved out of the team'}. Attendance is not tracked any more.</div>` : '';
  const trackBtn = (label) => `<div style="margin-top:10px"><button type="button" class="btn mini primary" data-track>${label}</button><div class="hint" style="margin-top:4px">Adds them to the attendance workbook with their Emp ID, name and client from here, and saves it.</div></div>`;
  const wireTrack = () => box.querySelector('[data-track]')?.addEventListener('click', async e => { e.currentTarget.disabled = true; e.currentTarget.textContent = 'Adding…'; await trackRoster([row]); if (box.isConnected) box.replaceWith(drawerPanel(row)); });
  if (!p) {
    if (kind) return msg(goneNote.replace(/<[^>]+>/g, ''));
    box.innerHTML = `<legend>Attendance</legend><div class="hint">Not in the attendance tracker yet (matched on Emp Code, then name).</div>${trackBtn('Track attendance')}<div class="hint" style="margin-top:8px">Already there under a different spelling? <button type="button" class="linkbtn" data-link>Link to a tracker name</button></div>`; wireTrack(); box.querySelector('[data-link]').addEventListener('click', () => linkFromHost(row)); return box;
  }
  const yr = TODAY.getUTCFullYear(), cur = p.rows.find(r => r.month === TODAY_MS) || p.latest;
  const cs = rowStats(cur), ya = agg(p.rows.filter(r => monthYear(r.month) === yr));
  const last6 = p.rows.slice(-6), vals = last6.map(r => DP_SERIES.map(([, , , f]) => f(rowStats(r)))), max = Math.max(4, ...vals.map(v => v.reduce((a, b) => a + b, 0)));
  const W = 300, H = 74, band = W / 6, bw = 22;
  const bars = last6.map((r, i) => { let acc = 0, seg = ''; DP_SERIES.forEach(([, , c], j) => { const v = vals[i][j]; if (v <= 0) return; const h = (H - 22) * v / max; seg += `<rect x="${i * band + (band - bw) / 2}" y="${H - 16 - acc - h}" width="${bw}" height="${Math.max(h, 1)}" rx="2" fill="${c}"/>`; acc += h; }); const tot = vals[i].reduce((a, b) => a + b, 0); return `<g><title>${monthLabel(r.month)}: ${fmt(tot)} leave days</title>${seg}<text x="${i * band + band / 2}" y="${H - 3}" text-anchor="middle" font-size="10" fill="var(--muted)">${monthShort(r.month)}</text>${tot ? `<text x="${i * band + band / 2}" y="${H - 18 - acc - 3}" text-anchor="middle" font-size="10" fill="var(--ink-2)">${fmt(tot)}</text>` : ''}</g>`; }).join('');
  const nxt = upcomingFor(p.rows, 45).filter(x => x.k >= 0).slice(0, 6);
  box.innerHTML = `<legend>Attendance</legend>
    <div class="att-kpis" style="margin-bottom:10px">
      <div class="att-kpi"><b>${fmt(cs.total)}</b><span>leave days · ${monthLabel(cur.month)}</span></div>
      <div class="att-kpi ${cs.unpl ? 'hot' : ''}"><b>${fmt(cs.unpl)}</b><span>unplanned this month</span></div>
      <div class="att-kpi"><b>${fmt(ya.total)}</b><span>leave days in ${yr}</span></div></div>
    ${vals.some(v => v.some(x => x > 0)) ? `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:340px;height:auto;display:block" role="img" aria-label="Leave days for the last ${last6.length} months">${bars}</svg>` : `<div class="hint">No leave taken in the last ${last6.length} month${last6.length === 1 ? '' : 's'} tracked.</div>`}
    <div style="margin-top:8px">${nxt.length ? `<div class="hint" style="margin-bottom:4px">Coming up</div><div class="att-pills">${nxt.map(x => pillHtml(shortDay(x.dt), x.v, x.c)).join('')}</div>` : '<div class="hint">No leave or applications logged from today on.</div>'}</div>
    ${goneNote}${!kind && (missMonths = trackTargets(row).filter(ms => !p.rows.some(r => r.month === ms))).length ? `<div class="hint" style="margin-top:10px">No row yet for ${missMonths.map(monthLabel).join(', ')}.</div>${trackBtn('Track attendance for ' + missMonths.map(monthLabel).join(', '))}` : ''}
    <div style="margin-top:10px"><button type="button" class="btn mini" data-open>Open in Attendance →</button></div>`;
  box.querySelector('[data-open]').addEventListener('click', () => open(p.key)); wireTrack();
  return box;
}

/* ---- Employees table: one extra column showing who is in the tracker, with a Track attendance button for everyone who is not ---- */
function trackedRosterIds() {
  const key = S.ver + '|' + rosterVer() + '|' + rosterRows().length; if (trackedRosterIds.c && trackedRosterIds.c.key === key) return trackedRosterIds.c.set;
  const set = new Set(); for (const p of D(true).people.values()) { const m = rosterOfPerson(p); if (m) set.add(m.row.id); }
  trackedRosterIds.c = { key, set }; return set;
}
function decorateTable(thead, tbody, slice) {
  if (S.status !== 'ready' || !S.ctx || !slice.length || !hasRoster()) return;
  const hr = thead.querySelector('tr'); if (!hr) return;
  const stick = 'position:sticky;right:0;background:var(--surface);box-shadow:-1px 0 0 var(--border);white-space:nowrap;z-index:1';
  const th = document.createElement('th'); th.textContent = 'Attendance'; th.title = 'Is this employee in the attendance tracker?'; th.style.cssText = stick + ';z-index:3;text-align:left;padding:0 14px;font-weight:inherit'; hr.append(th);
  const ids = trackedRosterIds();
  [...tbody.querySelectorAll('tr')].forEach((tr, i) => {
    const row = slice[i]; if (!row) return; const td = document.createElement('td'), kind = goneKind(row);
    if (kind) td.innerHTML = `<span class="hint">${kind === 'left' ? 'Left' : 'Moved'} · not tracked</span>`;
    else if (ids.has(row.id) || personForRoster(row)) td.innerHTML = '<span class="hint">✓ In tracker</span>';
    else {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn mini'; b.textContent = 'Track attendance'; b.title = 'Add them to the attendance workbook (Emp ID, name and client from here) and save it';
      b.addEventListener('click', async e => { e.stopPropagation(); b.disabled = true; b.textContent = 'Adding…'; const ok = await trackRoster([row]); if (!ok && b.isConnected) { b.disabled = false; b.textContent = 'Track attendance'; } });
      b.addEventListener('keydown', e => e.stopPropagation());
      const lb = document.createElement('button'); lb.type = 'button'; lb.className = 'linkbtn'; lb.style.marginLeft = '8px'; lb.textContent = 'Link'; lb.title = 'They are already in the tracker under a different spelling: link the two names';
      lb.addEventListener('click', e => { e.stopPropagation(); linkFromHost(row); }); lb.addEventListener('keydown', e => e.stopPropagation());
      td.append(b, lb);
    }
    td.style.cssText = stick + ';padding:0 12px'; tr.append(td);
  });
}

/* open the "link names" dialog for a workforce person, from the host's drawer or table */
function linkFromHost(row) { go('grid'); setTimeout(() => openLink({ roster: row }), 80); }

/* ---- navigation from the host ---- */
function go(view, personKeyArg) {
  if (view === 'health') { try { window.openActionCenter('health'); } catch { } return; }
  if (view === 'reports') { try { window.openReports('attendance'); } catch { } return; }
  S.mode = 'app'; if (personKeyArg) { showPerson(personKeyArg); S.ui.people.sel = personKeyArg; S.ui.people.q = ''; }
  S.ui.view = APP_VIEWS.includes(view) ? view : 'grid'; if (S.ui.view === 'activity') S.act.items = null;
  try { closeDrawer(); } catch { }
  if (state.view !== 'attendance') setView('attendance'); else { S.visible = true; render(); }
}
/* the status boxes / filters changed: redraw what is on screen */
function refresh() { if (active() && S.sig !== curSig()) render(); }
function leave() { closePop(); closeModal(); tipEl().classList.remove('on'); S.visible = false; }
/* the host says which page the attendance UI is on now (it moves the element there first) */
function show(mode) { const changed = S.mode !== mode || !S.visible; if(mode==='reports')S.ui.client='all'; S.mode = mode; S.visible = true; if (changed) { closePop(); closeModal(); } render(); }
const healthCount = () => (S.status === 'ready' && S.ctx ? healthIssues().filter(i => i.count && i.sev !== 'info').length : null);

mount();
return {
  hasTracker: Engine.hasTracker, refresh, init: () => { mount(); return connect(); }, askName, decorateTable, healthCount, chooseFileEarly, savedFile: async () => (await kv.get('file')) || ((await kv.get('handle')) || {}).name || '', show, leave, renderCard, renderWatch, drawerPanel, go, renderApprovalRequests, renderRequestHistory, requestsToDecide: () => requestsToDecide().length, redraw: () => { if (active()) render(); }, state: () => S, dirty: () => S.changes.length,
  prepareSignOut, save: () => save(), undo: () => undo(), toggleAuto: () => { setAuto(!S.auto); if (S.auto) autoTick(); }, setAutoSync: on => { setAuto(on); if (S.auto) autoTick(); }, canWrite: attCanWrite,
  syncInfo: () => { const d = D(true), sc = scopeCounts(); return { fileName: S.fileName, changes: S.changes.length, undoLen: S.undo.length, saving: S.saving, auto: S.auto, autoErr: S.autoErr, autoAt: S.autoAt, diskChanged: S.diskChanged, rows: S.rows.length, people: d.people.size, monthFrom: d.months[0], monthTo: d.latestMonth, unmatched: sc.unmatched, hasRoster: hasRoster() }; },
};

})();
