import fs from 'node:fs';
const en=JSON.parse(fs.readFileSync('tools/cache/ingilizce.pdf.json'));
for(let p=0;p<en.length;p++)if(en[p].some(i=>/ENG\.3\.1\.R2|ENG\.5\.2\.S3|ENG\.8\.7\.L1|ENG\.2\.1\.V[123]|ENG\.2\.1\.G[12]/.test(i.str))){console.log('PAGE',p+1);console.log(en[p].filter(i=>/ENG|[Ll]earning|[Tt]eaching|[Pp]ractices|[Dd]ifferentiation/.test(i.str)).map(i=>`${i.x.toFixed(1)} ${i.y.toFixed(1)} ${i.str}`).join('\n'));}
for(const [file,ps] of [['2025825154137627-fen bilimleri.pdf',[16]],['20258269564464-türk dili edebiyatı.pdf',[86,87]]]){const pages=JSON.parse(fs.readFileSync('tools/cache/'+file+'.json'));for(const p of ps){console.log(file,'PAGE',p+1);console.log(pages[p].map(i=>i.str).join('\n'));}}
