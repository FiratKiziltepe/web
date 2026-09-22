import fs from 'node:fs';
import {parseProgram,detectCourseCode,detectContentX} from '../public/parser.js';
for(const [f,code] of [['20258269564464-türk dili edebiyatı.pdf','TDE'],['ingilizce.pdf','ENG']]){
const pages=JSON.parse(fs.readFileSync('tools/cache/'+f+'.json'));
console.log(f,detectCourseCode(pages),parseProgram(pages,{courseCode:code}).warnings);
for(let p=0;p<pages.length;p++){
 if((code==='TDE' && pages[p].some(i=>/TDE\s*3\.1|TDE\.1\.2/.test(i.str))) || (code==='ENG' && pages[p].some(i=>/ENG\./.test(i.str)) && p<55)){
 console.log('PAGE',p+1,'X',detectContentX(pages[p]));console.log(pages[p].map(i=>`${i.x.toFixed(1)} ${i.y.toFixed(1)} ${i.str}`).join('\n'));
 }
}
}
