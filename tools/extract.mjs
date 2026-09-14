import fs from 'node:fs';
import * as pdfjs from '../public/vendor/pdf.min.mjs';
import {parseProgram} from '../public/parser.js';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('../public/vendor/pdf.worker.min.mjs', import.meta.url).href;
for (const file of fs.readdirSync('..').filter(f=>f.endsWith('.pdf'))) {
 const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync('../'+file)),isEvalSupported:false}).promise;
 const pages=[];
 for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p); const tc=await page.getTextContent();pages.push(tc.items.filter(i=>i.str?.trim()).map(i=>({str:i.str,x:i.transform[4],y:i.transform[5],w:i.width,h:i.height})));}
 fs.mkdirSync('tools/cache',{recursive:true});fs.writeFileSync('tools/cache/'+file+'.json',JSON.stringify(pages));
 const r=parseProgram(pages);console.log(file,r.rows.length,r.warnings);fs.writeFileSync('tools/cache/'+file+'.result.json',JSON.stringify(r,null,2));
}

