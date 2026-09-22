import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('tools/cache/ingilizce.pdf.json'));
for(let i=0;i<p.length;i++){
 if(i>1070&&i<1095 || p[i].some(t=>/3\s*\.\s*1\s*\.\s*R\s*2|5\s*\.\s*2\s*\.\s*S\s*3/.test(t.str)))console.log(i+1,p[i].filter(t=>/ENG|[Pp]ractices|[Tt]eaching|[Dd]ifferentiation|THEME/.test(t.str)).map(t=>t.str).join(' | '));
}
const t=JSON.parse(fs.readFileSync('tools/cache/20258269564464-türk dili edebiyatı.pdf.json'));for(let i=82;i<88;i++)console.log('TDE',i+1,t[i].filter(t=>/TDE|Yazma|Yansıt|yazı|değerlen/.test(t.str)).map(t=>t.str).join(' | '));
