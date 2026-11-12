import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {scheduleDownloadApi151,scheduleMonths151} from '../worker/records-export.mjs';
import {schedulePhotoApi} from '../worker/schedule.mjs';
import {meetingApi117} from '../worker/meetings117.mjs';
import {builtinProfiles,employeePermissions,ensurePermissions} from '../worker/wire-permissions.mjs';

const route=(path,query='')=>new Request('https://test.local/api/'+path+query);
const cap={permissions:['schedule.view','schedule.download']};
const fixture=()=>{const {db,DB}=database();migrations85(db);return {db,env:{DB}}};
const files=new URL('../dist/',import.meta.url);
const clientSource=fs.readFileSync(new URL('schedule-download151.js',files),'utf8');
function workbookClient(extra={}){
 const context=vm.createContext({receiptTime:v=>v,Uint8Array,TextEncoder,Blob,mobileQuery78:{addEventListener(){}},scheduleRender56(){},scheduleDraw56(){},meetingRender117(){},meetingRead120(){},document:{documentElement:{dataset:{}}},...extra});
 vm.runInContext(fs.readFileSync(new URL('xlsx.full.min.js',files),'utf8'),context);context.window=context;
 vm.runInContext(clientSource,context);return context;
}

test('the new permission is supervisor-only by default and does not revive a removed grant',async()=>{
 const {db,env}=fixture();
 for(const {id} of builtinProfiles)assert.equal(builtinProfiles.find(p=>p.id===id).permissions.includes('schedule.download'),id==='supervisor');
 db.exec("CREATE TABLE IF NOT EXISTS app_permission_profiles(id TEXT PRIMARY KEY,name TEXT NOT NULL,permissions TEXT NOT NULL)");
 db.exec("INSERT OR REPLACE INTO app_permission_profiles VALUES('supervisor','主管','[\"schedule.view\"]'),('warehouse','倉管','[\"schedule.view\"]')");
 await ensurePermissions(env);
 assert.ok((await employeePermissions(env,{id:1,role:'supervisor'})).permissions.includes('schedule.download'));
 assert.ok(!(await employeePermissions(env,{id:2,role:'warehouse'})).permissions.includes('schedule.download'));
 db.exec("UPDATE app_permission_profiles SET permissions='[\"schedule.view\"]' WHERE id='supervisor'");
 const freshEnv={DB:{...env.DB}};
 await ensurePermissions(freshEnv);
 assert.ok(!(await employeePermissions(freshEnv,{id:1,role:'supervisor'})).permissions.includes('schedule.download'));
});
test('daily export protects optional records and uses actual Taipei dates for receipts and issues',async()=>{
 const {db,env}=fixture();
 db.exec("INSERT INTO schedule_reports(id,day,body,photo_key,author_id,author_name,created_at) VALUES('r','2026-11-12','回報','photo','1','員工','2026-11-12T00:00:00Z')");
 db.exec("INSERT INTO schedule_leave72(id,start_at,end_at,people,reason,author_name,updated_at) VALUES('leave','2026-11-11T15:00','2026-11-12T09:00','[{\"name\":\"員工\"}]','其他','主管','now')");
 db.exec("INSERT INTO schedule_entries(id,kind,day,end_day,title,category,quantity,project_name,author_name,created_at,updated_at) VALUES('manual','material','2026-11-12','2026-11-12','箱子','收料',2,'案件甲','員工','2026-11-12T00:00:00Z','now')");
 let reads=0;
 const warehouse=async()=>{reads++;return {projects:[{name:'案件乙',materialLogs:[
  {time:'2026-11-11T15:59:00Z',received:[{name:'前一天',qty:1}]},
  {time:'2026-11-11T16:01:00Z',actor:'員工',received:[{name:'外殼',qty:2}],issued:[{name:'端子',qty:3},{name:'已出貨',category:'送貨',qty:1}]},
 ]}]}};
 const call=(types,employee=cap,photos='')=>scheduleDownloadApi151(route('schedule-download','?mode=daily&from=2026-11-12&to=2026-11-12&types='+types+photos),env,employee,warehouse);
 assert.equal((await call('reports',{permissions:['schedule.view','records.export']})).status,403);
 assert.equal((await call('reports',{permissions:['schedule.download']})).status,403);
 assert.equal((await call('reports,leaves')).status,403);
 assert.equal((await call('issued')).status,403);
 assert.equal((await call('received',cap,'&photos=1')).status,400);
 const limited=await (await call('reports,received')).json();
 assert.equal(reads,0);assert.equal(limited.received[0][2],'箱子');
 assert.ok(!('photoIndexes' in limited.reports[0])&&!('photo_key' in limited.reports[0]));
 const full=await (await call('reports,received,issued,leaves',{permissions:[...cap.permissions,'schedule.leave.view','warehouse.view']},'&photos=1')).json();
 assert.equal(reads,1);assert.deepEqual(full.received.map(r=>r[2]),['外殼','箱子']);
 assert.deepEqual(full.issued.map(r=>r[2]),['端子']);assert.equal(full.leaves[0][2],'員工');assert.deepEqual(full.reports[0].photoIndexes,[0]);
 assert.equal((await schedulePhotoApi(route('schedule-photo','?id=r&export=schedule'),env,{permissions:['schedule.view','records.export']})).status,403);
});
test('a whole-year workbook contains 12 sheets, carries across boundary weeks once and keeps weekly notes',async()=>{
 const {db,env}=fixture();
 db.exec("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,category,created_at,updated_at) VALUES('a','weekly','2026-01-01','2026-01-02','測試','[\"甲\"]','[\"組裝\"]','now','now')");
 db.exec("INSERT INTO schedule_weekly_notes(week_start,body,updated_at,author_id,author_name) VALUES('2025-12-29','交接備註','now','1','主管')");
 assert.equal(scheduleMonths151('2026-01','2027-01').length,0);
 const req=route('schedule-download','?mode=weekly&first=2026-01&last=2026-12');
 const response=await scheduleDownloadApi151(req,env,cap,async()=>{throw Error('weekly export should not read warehouse data')});
 assert.equal(response.status,200);const data=await response.json();
 assert.equal(data.from,'2025-12-29');assert.equal(data.to,'2027-01-03');
 const c=workbookClient(),output=c.scheduleWorkbook151(data,'weekly',[]),workbook=c.XLSX.read(output,{type:'array'});
 assert.equal(workbook.SheetNames.length,12);assert.equal(workbook.SheetNames[0],'2026-01');assert.equal(workbook.SheetNames.at(-1),'2026-12');
 const jan=c.XLSX.utils.sheet_to_json(workbook.Sheets['2026-01'],{header:1}).flat();
 assert.ok(jan.includes('交接備註')&&jan.includes('甲')&&jan.includes('【測試】 組裝'));
 const rows=Array.from(c.scheduleWeeklySheets151(data)).flatMap(sheet=>Array.from(sheet.rows)).flat();
 assert.equal(rows.filter(s=>s==='2026-01-26 至 2026-02-01').length,1);
});
test('weekly meeting PDF download uses its own grant while normal reading stays available',async()=>{
 const {db,env}=fixture();
 db.exec("INSERT INTO meetings117(id,day,time,place,attendees,notes,author_id,author_name,editor_id,editor_name,created_at,updated_at) VALUES('m','2026-11-12','09:00','會議室','[]','[]',1,'主管',1,'主管','now','now')");
 const user={id:1,name:'員工',role:'viewer',status:'active',permissions:['schedule.view']};
 assert.equal((await meetingApi117(route('meetings','?id=m'),env,user)).status,200);
 assert.equal((await meetingApi117(route('meetings','?id=m&download=1'),env,user)).status,403);
 const result=await meetingApi117(route('meetings','?id=m&download=1'),env,{...user,permissions:cap.permissions});
 assert.equal(result.status,200);assert.equal((await result.json()).item.id,'m');
});
test('meeting PDF splits long notes across pages and each page uses valid binary offsets',async()=>{
 const context2d={fillRect(){},fillText(){},strokeRect(){}};
 const document={documentElement:{dataset:{}},fonts:{ready:Promise.resolve()},createElement:()=>({getContext:()=>context2d,toBlob:fn=>fn(new Blob([new Uint8Array([255,216,255,217])]))})};
 const c=workbookClient({document,meetingRecordText120:()=>({title:'週會紀錄',metadata:[['地點','會議室']],heads:['筆記','內容','備註'],notes:[['1',Array(110).fill('一行內容').join('\n'),'保留備註']],lastEdit:'最後修改'}),meetingWrap120:(_,text)=>text.split('\n')});
 const pdf=await c.meetingPdf151({}, {},'sans-serif'),buf=Buffer.from(await pdf.arrayBuffer()),source=buf.toString('latin1');
 assert.equal(pdf.type,'application/pdf');assert.match(source,/\/Count 3\b/);
 const xref=Number(source.match(/startxref\n(\d+)/)[1]);assert.ok(source.slice(xref).startsWith('xref\n'));
 for(const [index,line] of source.slice(xref).split('\n').slice(3,14).entries())assert.ok(source.slice(Number(line.slice(0,10))).startsWith((index+1)+' 0 obj'));
});

test('photo downloads start ten at once, fall back to four, and retry only failed photos',async()=>{
 const c=workbookClient(),controller=new AbortController(),loaded=new Map([['cached',{bytes:new Uint8Array(2)}]]),calls=new Map(),started=[];
 let running=0,peak=0,slow=false,done=0;
 const list=[{key:'cached'},...Array.from({length:17},(_,i)=>({key:String(i)}))];
 await c.schedulePhotoBatch152(list,loaded,async ({key})=>{
  running++;peak=Math.max(peak,running);started.push({running,slow});
  const n=(calls.get(key)||0)+1;calls.set(key,n);
  const transient=(key==='0'||key==='1')&&n===1;
  await new Promise(resolve=>setTimeout(resolve,transient?1:8));running--;
  if(transient)throw Object.assign(Error('timeout'),{retryable:true});
  return {bytes:new Uint8Array(2)};
 },(count,total,status)=>{done=count;assert.equal(total,18);if(status?.includes('較慢'))slow=true},controller.signal,1000);
 assert.equal(peak,10);assert.ok(started.some(s=>s.slow));assert.ok(started.filter(s=>s.slow).every(s=>s.running<=4));
 assert.equal(done,18);assert.equal(loaded.size,18);assert.equal(calls.has('cached'),false);
 assert.deepEqual([...calls].filter(([,n])=>n>1).map(([key])=>key).sort(),['0','1']);
});
test('photo retries keep completed files after a repeat failure; cancellation and deadlines abort stalled fetches',async()=>{
 const c=workbookClient({AbortController,setTimeout,clearTimeout}),controller=new AbortController(),loaded=new Map(),list=[{key:'success'},{key:'failed'}];
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const getPhoto=async ({key})=>{if(key==='success')return {bytes:new Uint8Array(1)};await pause(1);throw Object.assign(Error('timeout'),{retryable:true})};
 await assert.rejects(c.schedulePhotoBatch152(list,loaded,getPhoto,()=>{},controller.signal,50),/已下載的照片會保留/);
 const calls=[];
 await c.schedulePhotoBatch152(list,loaded,async ({key})=>{calls.push(key);return {bytes:new Uint8Array(1)}},()=>{},controller.signal,50);
 assert.deepEqual(calls,['failed']);
 let photoSignal;
 await assert.rejects(c.scheduleTimed152(signal=>{photoSignal=signal;return new Promise(()=>{})},controller.signal,5,'photo timeout'),/photo timeout/);
 assert.ok(photoSignal.aborted);
 const pending=c.scheduleTimed152(signal=>{photoSignal=signal;return new Promise(()=>{})},controller.signal,1000,'photo timeout');
 await Promise.resolve();controller.abort(Error('cancelled'));
 await assert.rejects(pending,/cancelled/);assert.ok(photoSignal.aborted);
});

test('meeting batch export validates permission and month boundaries, sorting visible meetings oldest first',async()=>{
 const {db,env}=fixture();
 const insert=db.prepare("INSERT INTO meetings117(id,day,time,place,attendees,notes,author_id,author_name,editor_id,editor_name,created_at,updated_at,deleted_at) VALUES(?,?,?,'會議室','[]','[]',1,'主管',1,'主管','now','now',?)");
 for(const [id,day,time,deleted] of [['a','2026-12-31','09:00',''],['b','2027-01-02','10:00',''],['c','2027-01-02','08:00',''],['deleted','2027-01-03','09:00','now'],['outside','2027-02-01','09:00','']])insert.run(id,day,time,deleted);
 const user={id:1,name:'員工',role:'viewer',status:'active',permissions:cap.permissions};
 const req=route('meetings','?view=export&first=2026-12&last=2027-01');
 assert.equal((await meetingApi117(req,env,{...user,permissions:['schedule.view']})).status,403);
 assert.equal((await meetingApi117(route('meetings','?view=export&first=2026-01&last=2027-01'),env,user)).status,400);
 assert.equal((await meetingApi117(route('meetings','?view=export&first=2026-13&last=2027-01'),env,user)).status,400);
 const result=await meetingApi117(req,env,user);assert.equal(result.status,200);
 assert.deepEqual((await result.json()).items.map(i=>i.id),['a','c','b']);
});

test('weekly landscape PDF uses web scheduling lanes, weekday columns and colors, with a fresh page per week',async()=>{
 const pages=[],drawing=[];
 const ctx={fillRect(x,y,w,h){drawing.push({x,y,w,h,color:this.fillStyle})},fillText(text){drawing.push({text})},strokeRect(){},measureText(s){return {width:[...s].length*22}}};
 const document={documentElement:{dataset:{}},fonts:{ready:Promise.resolve()},createElement:()=>({getContext:()=>ctx,toBlob:fn=>{pages.push(drawing.splice(0));fn(new Blob([new Uint8Array([255,216,255,217])]))}})};
 const c=workbookClient({document,meetingWrap120:(ctx,s)=>String(s).split('\n'),scheduleShift56:(d,n)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10),weeklyContent903:e=>e.content||''});
 vm.runInContext(fs.readFileSync(new URL('enhancements-v904.js',files),'utf8').split('function weeklyRunDialog904')[0],c);
 const job=(id,day,end_day,title,color,people)=>({id,day,end_day,title,color,people,content:'組裝'});
 const data={from:'2026-11-23',to:'2026-12-13',people:['甲','乙'],notes:[{week_start:'2026-11-30',body:'週末確認'}],entries:[
  job('1','2026-11-23','2026-11-24','任務甲','#00ff00',['甲']),
  job('2','2026-11-25','2026-11-27','任務甲','#00ff00',['甲']),
  job('3','2026-11-25','2026-11-26','重疊工作','#ff0000',['甲']),
  job('4','2026-12-06','2026-12-06','週末工作','#00ffff',['乙']),
 ]};
 const weeks=c.weeklyPdfWeeks153(data);
 assert.equal(weeks.length,2);assert.equal(weeks[0].days.length,5);assert.equal(weeks[1].days.length,7);
 assert.equal(weeks[0].rows[0].lanes,2);assert.equal(weeks[0].rows[0].runs[0].end,'2026-11-27');
 const pdf=await c.weeklyPdf153(data,'sans-serif',{},new AbortController().signal),raw=Buffer.from(await pdf.arrayBuffer()).toString('latin1');
 assert.match(raw,/\/MediaBox \[0 0 841\.89 595\.28\]/);assert.match(raw,/\/Count 2\b/);
 assert.ok(pages[0].some(op=>op.color==='#00ff00')&&pages[0].some(op=>op.color==='#ff0000'));
 assert.ok(pages[1].some(op=>op.text==='週末確認')&&pages[1].some(op=>op.text==='日｜12/06'));
});
