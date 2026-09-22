import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('tools/cache/ingilizce.pdf.json'));
for(let i=917;i<927;i++){console.log('PAGE',i+1);console.log(p[i].map(t=>t.str).join('\n').slice(0,2200));}
