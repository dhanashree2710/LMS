const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let js=0,html=0,fail=0;
function walk(d){for(const x of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,x.name);if(x.isDirectory())walk(p);else if(p.endsWith('.js')){js++;try{new Function(fs.readFileSync(p,'utf8'))}catch(e){console.error('JS parse:',p,e.message);fail++}}else if(p.endsWith('.html')){html++;const s=fs.readFileSync(p,'utf8');for(const m of s.matchAll(/(?:src|href)="([^"]+)"/g)){const v=m[1];if(v.startsWith('http')||v.startsWith('#')||v.startsWith('data:')||v.startsWith('mailto:'))continue;const target=path.resolve(path.dirname(p),v.split(/[?#]/)[0]);if(!fs.existsSync(target)){console.error('Missing local asset:',p,'->',v);fail++}}}}}
walk(root);console.log(`Checked ${js} JavaScript and ${html} HTML files. ${fail?fail+' issue(s) found.':'No syntax or missing local-link issues found.'}`);process.exitCode=fail?1:0;
