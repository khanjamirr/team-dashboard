const fs=require('fs'),vm=require('vm');let s=fs.readFileSync('outputs/index.html','utf8');
for(const fragment of ['${requestsCardHtml()}', "${can('att.who') ? '' : requestsCardHtml()}"]){if(!s.includes(fragment))throw Error('Missing card insertion');s=s.replace(fragment,'');}
const start=s.indexOf('function requestsCardHtml() {'),end=s.indexOf('/* ---------- a tracker row built from a workforce person ---------- */',start);
if(start<0||end<0)throw Error('Missing legacy renderer boundaries');
s=s.slice(0,start)+s.slice(end);
s=s.replaceAll('3.16.0','3.16.1');
if(s.includes('requestsCardHtml'))throw Error('Legacy reference remains');
for(const m of s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);
fs.writeFileSync('outputs/index.html',s);console.log('Removed both Attendance card insertions and obsolete renderer. All scripts parse. Version 3.16.1.');
