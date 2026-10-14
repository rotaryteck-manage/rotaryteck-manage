// Local Worker/D1/R2 smoke test; uses an isolated database and never contacts production.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {Miniflare}=await import(pathToFileURL(process.argv[2]).href);
const code=fs.readFileSync(new URL('../worker/qc124.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
const mf=new Miniflare({modules:true,compatibilityDate:'2026-08-06',d1Databases:['DB'],r2Buckets:['UPLOADS'],script:code+`\nexport default {fetch(request,env){return qcApi124(request,env,{id:1,name:'測試主管',role:'supervisor',status:'active',permissions:['qc.view','qc.manage','qc.delete','qc.restore','qc.export']})}}`});
try{
 const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE schedule_leave72(id TEXT PRIMARY KEY)').run();
 for(const sql of fs.readFileSync(new URL('../drizzle/0036_qc124.sql',import.meta.url),'utf8').split(';').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();
 const create=await mf.dispatchFetch('https://t.local/api/qc-reports',{method:'POST',headers:{origin:'https://t.local','content-type':'application/json'},body:JSON.stringify({action:'project',id:'p',name:'SJ99-24'})});assert.equal(create.status,200);
 const form=new FormData();for(const [key,value]of Object.entries({action:'upload',project:'p',id:'u',revision:'1',stamp:'2026-10-14T13:30'}))form.append(key,value);
 for(let i=0;i<2;i++){const path=process.argv[i+3],bytes=path?fs.readFileSync(path):Buffer.from('%PDF-1.7\nlocal-'+i);form.append('pdf',new File([bytes],'report-'+(i+1)+'.pdf',{type:'application/pdf'}));}
 const encoded=new Request('https://t.local/api/qc-reports',{method:'POST',body:form});
 const save=await mf.dispatchFetch('https://t.local/api/qc-reports',{method:'POST',headers:{origin:'https://t.local','content-type':encoded.headers.get('content-type')},body:new Uint8Array(await encoded.arrayBuffer())});assert.equal(save.status,200,await save.clone().text());
 const response=await mf.dispatchFetch('https://t.local/api/qc-reports?project=p'),data=await response.json();assert.equal(data.files.length,2);assert.equal(data.uploads.length,1);
 const pdf=await mf.dispatchFetch('https://t.local/api/qc-reports?file='+data.files[0].id);assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.ok((await pdf.arrayBuffer()).byteLength>0);
 const backup=await mf.dispatchFetch('https://t.local/api/qc-reports?project=p&export=1');assert.equal(backup.status,200);assert.equal((await backup.json()).files.length,2);
 console.log('workerd runtime: two PDFs saved in one registration, D1/R2 download and export metadata passed; no production data changed');
}finally{await mf.dispose()}
