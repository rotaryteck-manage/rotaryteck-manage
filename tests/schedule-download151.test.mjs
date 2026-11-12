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
 const context=vm.createContext({receiptTime:v=>v,Uint8Array,TextEncoder,Blob,mobileQuery78:{addEventListener(){}},scheduleRender56(){},scheduleDraw56(){},meetingRead120(){},document:{documentElement:{dataset:{}}},...extra});
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
