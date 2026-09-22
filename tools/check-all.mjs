import fs from 'node:fs';
import {parseProgram} from '../public/parser.js';
for(const f of fs.readdirSync('tools/cache').filter(f=>f.endsWith('.pdf.json'))){const r=parseProgram(JSON.parse(fs.readFileSync('tools/cache/'+f)));fs.writeFileSync('tools/cache/'+f+'.new.json',JSON.stringify(r,null,2));console.log(f,r.courseCode,r.startPage,r.rows.length,r.warnings);}
