import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('tools/cache/ingilizce.pdf.json.new.json'));
console.log(r.unmatchedApplications.map(r=>[r.code,r.area,r.applications.slice(0,95)]));
for(const f of ['ingilizce.pdf','20258269564464-türk dili edebiyatı.pdf']){
const r=JSON.parse(fs.readFileSync('tools/cache/'+f+'.json.new.json'));console.log(f,'areas',r.areaCount,'grades',[...new Set(r.rows.map(r=>r.grade))]);
console.log('first',r.rows[0]); console.log('last',{...r.rows.at(-1),applications:r.rows.at(-1).applications.slice(-500)});
}
