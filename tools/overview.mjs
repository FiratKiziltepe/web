import fs from 'node:fs';
for(const f of ['ingilizce.pdf','20258269564464-türk dili edebiyatı.pdf']){
 const pages=JSON.parse(fs.readFileSync('tools/cache/'+f+'.json'));console.log(f,pages.length);
 for(let p=0;p<pages.length;p++){
 const lines=pages[p].filter(i=> /LEARNING.TEACHING|THEME|APPLICATION|PRACTICE|SINIF|TDE ?3\.1/.test(i.str));
 if((f==='ingilizce.pdf' && p<95)|| (f!=='ingilizce.pdf'&&lines.length))console.log(p+1,lines.map(i=>i.str).join(' | '));
 }
 if(f==='ingilizce.pdf')for(const p of [40,46,47,48,49,50]){console.log('FULL',p+1);console.log(pages[p].map(i=>i.str).join('\n'));}
}
