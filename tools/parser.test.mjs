import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseProgram, detectCourseCode} from '../public/parser.js';
const item=(str,x,y)=>({str,x,y,w:str.length*4,h:10});
for(const code of ['MÜZ','ENG','FİZ']) {
 const pages=[[
 item('ÖĞRENME ÇIKTILARI',50,750),item(`${code}.6.1.3. Birinci çıktı`,180,750),
 item(`${code}.6.1.4. İkinci çıktı`,180,730),item(`${code}.6.1.5. Üçüncü çıktı`,180,710),
 item('Öğrenme–Öğretme',50,650),item(`${code} 6.1.3. Başlangıç`,180,650),item('Uygulamaları',60,636),
 item('sayfa sonu devam-',180,60)], [
 item('PROGRAMI',60,792),item('lı metin.',180,770),item('ikinci devam.',180,750),
 item(`${code} . 6 . 1 . 4 . Sonraki uygulama.`,180,730),
 item(`${code}.6.1.5. Son uygulama.`,180,710),item('FARKLILAŞTIRMA',50,690),item('Dahil edilmemeli.',180,690)]];
 const result=parseProgram(pages,{startPage:0,courseCode:code});
 assert.equal(result.rows.length,3);
 assert.match(result.rows[0].applications,/Başlangıç sayfa sonu devamlı metin\. ikinci devam\.$/);
 assert.doesNotMatch(result.rows[0].applications,/Sonraki uygulama/);
 assert.doesNotMatch(result.rows[2].applications,/Dahil edilmemeli/);
 assert.equal(detectCourseCode(pages).code,code);
}
const inlineResult = parseProgram([[
 item('ÖĞRENME ÇIKTILARI ENG.5.1.1. Test çıktısı',60,750),
 item('Öğrenme Öğretme Uygulamaları ENG 5.1.1. Test uygulaması',60,730)
]], {courseCode:'ENG',startPage:0});
assert.match(inlineResult.rows[0].applications,/Test uygulaması$/);
for (const [part,count,code] of [['müzik',108,'MÜZ'],['fen',182,'FB'],['ornekprogram',66,'HB']]) {
 const file=fs.readdirSync('tools/cache').find(f=>f.includes(part)&&f.endsWith('.pdf.json'));
 const pages=JSON.parse(fs.readFileSync('tools/cache/'+file));
 const result=parseProgram(pages);
 assert.equal(result.courseCode,code);assert.equal(result.rows.length,count);assert.deepEqual(result.warnings,[]);
 assert.equal(new Set(result.rows.map(r=>r.code)).size,count);
 for(const row of result.rows)assert.doesNotMatch(row.applications,/ÖĞRETİM PROGRAMI|Öğrenme-Öğretme/);
 if(code==='FB') {
  assert.match(result.rows.find(r=>r.code==='FB.3.7.1').applications,/Toprağın içinde neler/);
  assert.match(result.rows.find(r=>r.code==='FB.4.2.1').applications,/pazar yeri tekniği kullanılabilir/);
 }
 if(code==='MÜZ') {
  const row=result.rows.find(r=>r.code==='MÜZ.6.1.3');assert.match(row.applications,/millî kimliklerini/);assert.doesNotMatch(row.applications,/somut olmayan kültürel miras/);
 }
 console.log(`${code}: ${count} çıktı, eksik uygulama yok`);
}
console.log('Kod varyasyonları, başlık hizası, sayfa devamı ve bölüm sınırları doğrulandı.');

