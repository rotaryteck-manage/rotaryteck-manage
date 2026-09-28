import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {scheduleApi,schedulePhotoUpload,scheduleMaterialUpload,scheduleMaterialPhotoApi} from '../worker/schedule.mjs';
import {builtinProfiles} from '../worker/wire-permissions.mjs';

test('daily report needs an assigned job and an uploaded photo, with no text-only residue',async()=>{
 const {db,DB}=database();db.exec(fs.readFileSync(new URL('../drizzle/0004_schedule.sql',import.meta.url),'utf8'));db.exec(fs.readFileSync(new URL('../drizzle/0008_schedule_material_photos.sql',import.meta.url),'utf8'));
 db.exec("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision) VALUES ('work-1','daily','2026-09-29','2026-09-29','FAA','[\"小明\"]','#4e8069','','[\"組裝\"]',0,'','1','主管','now','now',1)");
 const objects=new Map(),UPLOADS={put:async(key,file)=>{objects.set(key,file)},delete:async key=>{objects.delete(key)}},env={DB,UPLOADS},origin='https://example.test',user={id:2,name:'小明',role:'viewer',permissions:builtinProfiles[2].permissions},other={...user,id:3,name:'小華'};
 const json=body=>scheduleApi(new Request(origin+'/api/schedule',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),env,user);
 assert.equal((await json({kind:'report',id:'old-way',entryId:'work-1',day:'2026-09-29',body:'完成'})).status,400);
 const upload=(person,{id='report-1',photo=true,entryId='work-1'}={})=>{const form=new FormData();for(const [key,value]of Object.entries({mode:'create',id,day:'2026-09-29',entryId,body:'完成組裝'}))form.append(key,value);if(photo)form.append('photo',new File(['picture'],'job.png',{type:'image/png'}));return schedulePhotoUpload(new Request(origin+'/api/schedule-photo-upload',{method:'POST',headers:{origin},body:form}),env,person)};
 assert.equal((await upload(user,{photo:false})).status,400);
 assert.equal((await upload(other)).status,403);
 assert.equal(db.prepare('SELECT count(*) AS count FROM schedule_reports').get().count,0);
 UPLOADS.put=async()=>{throw Error('上傳中斷')};assert.notEqual((await upload(user)).status,200);assert.equal(db.prepare('SELECT count(*) AS count FROM schedule_reports').get().count,0);
 UPLOADS.put=async(key,file)=>objects.set(key,file);assert.equal((await upload(user)).status,200);
 assert.equal(db.prepare('SELECT entry_id,author_name,photo_name FROM schedule_reports').get().entry_id,'work-1');assert.equal(objects.size,1);
 assert.equal((await upload(user,{id:'report-1'})).status,400);assert.equal(objects.size,1);
});

test('daily calendar has separate work and chat links, even before the first report',()=>{
 const source=fs.readFileSync(new URL('../dist/schedule-v67.js',import.meta.url),'utf8'),root={innerHTML:'',querySelectorAll:()=>[]},entries=[{id:'work-1',kind:'daily',day:'2026-09-29',end_day:'2026-09-29',title:'FAA',assignee:'["小明"]',category:'["組裝"]'}];let opened='';
 const context={scheduleDraw56(){},scheduleDayRecord56(){},scheduleReportDialog56(){},scheduleMaterialDialog61(){},scheduleData56:{entries,reports:[],people:[{name:'小明'}]},scheduleTab56:'daily',scheduleAnchor56:'2026-09-29',scheduleMonth56:()=> '2026-09-01',scheduleShift56:(day,n)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)},scheduleMaterial56:()=>[],scheduleEsc56:String,scheduleDecorate60(){},$:()=>root};
 vm.runInNewContext(source,context);vm.runInNewContext('scheduleDraw56()',context);
 assert.match(root.innerHTML,/data-day-jobs="2026-09-29">工作紀錄/);assert.match(root.innerHTML,/data-day-reports="2026-09-29">工作回報/);
 assert.doesNotMatch(root.innerHTML,/FAA/);assert.doesNotMatch(root.innerHTML,/data-day-reports="2026-09-28"/);
});

test('material receipt and item photos save together, display securely, and remain in export',async()=>{
 const {db,DB}=database();for(const migration of ['0004_schedule.sql','0008_schedule_material_photos.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+migration,import.meta.url),'utf8'));
 const files=new Map(),env={DB,UPLOADS:{put:async(key,file,settings)=>files.set(key,{body:new Blob(['photo']),httpMetadata:settings.httpMetadata}),get:async key=>files.get(key),delete:async key=>files.delete(key),list:async()=>({objects:[],truncated:false})}},origin='https://example.test',boss={id:1,name:'主管',role:'supervisor',permissions:builtinProfiles[0].permissions},worker={id:2,name:'員工',role:'viewer',permissions:builtinProfiles[2].permissions};
 const form=(id='material-1',revision='0')=>{const data=new FormData();for(const [key,value] of Object.entries({id,revision,day:'2026-09-29',category:'收料',title:'螺帽',quantity:'2'}))data.append(key,value);data.append('receiptPhoto',new File(['receipt'],'receipt.png',{type:'image/png'}));data.append('itemPhoto',new File(['item'],'item.png',{type:'image/png'}));return new Request(origin+'/api/schedule-material-upload',{method:'POST',headers:{origin},body:data})};
 assert.equal((await scheduleMaterialUpload(form(),env,worker)).status,403);
 const originalPut=env.UPLOADS.put;let writes=0;env.UPLOADS.put=async(...args)=>{if(++writes===2)throw Error('照片上傳中斷');return originalPut(...args)};
 assert.equal((await scheduleMaterialUpload(form(),env,boss)).status,400);assert.equal(files.size,0);assert.equal(db.prepare("SELECT count(*) AS count FROM schedule_entries WHERE kind='material'").get().count,0);env.UPLOADS.put=originalPut;
 assert.equal((await scheduleMaterialUpload(form(),env,boss)).status,200);
 assert.equal(files.size,2);const row=db.prepare("SELECT author_name,receipt_photo_key,item_photo_key FROM schedule_entries WHERE id='material-1'").get();assert.equal(row.author_name,'主管');assert.ok(row.receipt_photo_key&&row.item_photo_key);
 assert.equal((await scheduleMaterialPhotoApi(new Request(origin+'/api/schedule-material-photo?id=material-1&type=receipt'),env,worker)).status,200);
 const {recordsExportApi}=await import('../worker/records-export.mjs');const result=await recordsExportApi(new Request(origin+'/api/records-export?from=2026-09-29&to=2026-09-29&types=receipt&photos=1'),env,boss,async()=>({projects:[],deletedProjects:[],platingProjects:[]}),async()=> 'owner');assert.equal(result.status,200);assert.equal((await result.json()).photos.length,2);
 assert.equal((await scheduleMaterialUpload(form('material-1','99'),env,boss)).status,409);assert.equal(files.size,2);
});

test('shared image compression keeps small photos and reduces larger photos below 800 KB',async()=>{
 const source=fs.readFileSync(new URL('../dist/uploads.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('function canvasBlob('),source.indexOf('async function uploadImage('));
 const context={File,Blob,createImageBitmap:async()=>({width:4000,height:2000,close(){}}),document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(){},set fillStyle(value){}}),toBlob:callback=>callback(new Blob([new Uint8Array(700*1024)],{type:'image/jpeg'}))})}};
 vm.runInNewContext(code,context);
 const small=new File([new Uint8Array(799*1024)],'small.png',{type:'image/png'}),big=new File([new Uint8Array(801*1024)],'large.png',{type:'image/png'});
 assert.equal(await vm.runInNewContext('compressReceiptImage(file)',Object.assign(context,{file:small})),small);
 const result=await vm.runInNewContext('compressReceiptImage(file)',Object.assign(context,{file:big}));assert.ok(result.size<=800*1024);assert.equal(result.type,'image/jpeg');
});
