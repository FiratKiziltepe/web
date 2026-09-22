import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('tools/cache/ingilizce.pdf.json'));
for(let i=0;i<p.length;i++)if(p[i].some(t=>/ENG\.? ?3\.1\.(R|S)|ENG\.? ?5\.2\.S/.test(t.str)))console.log(i+1,p[i].filter(t=>/ENG/.test(t.str)).map(t=>t.str).join(' | '));
