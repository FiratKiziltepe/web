import fs from 'node:fs';
for(const f of ['2025825154137627-fen bilimleri.pdf','20258269564464-türk dili edebiyatı.pdf','ingilizce.pdf']){
const r=JSON.parse(fs.readFileSync('tools/cache/'+f+'.json.new.json'));console.log(f,r.rows.length,r.warnings);console.log(r.rows.filter(r=>!r.applications).map(({id,code,grade,area,outcome})=>({id,code,grade,area,outcome})).slice(0,25));
const pages=JSON.parse(fs.readFileSync('tools/cache/'+f+'.json'));if(!f.includes('ingilizce'))for(let p=0;p<pages.length;p++){const lines=pages[p].filter(i=>/FB\.5\.1\.1\.1|TDE\s*4\.4/.test(i.str));if(lines.length)console.log(p+1,lines.map(i=>i.str));}
}
