import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('tools/cache/ingilizce.pdf.json.new.json'));
console.log(r.rows.filter(r=>!r.applications).map(r=>[r.id,r.code,r.outcome]));console.log(r.warnings);
