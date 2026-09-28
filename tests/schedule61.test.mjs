import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database} from './helpers/d1.mjs';
import {scheduleApi} from '../worker/schedule.mjs';
import {builtinProfiles} from '../worker/wire-permissions.mjs';

test('warehouse can schedule daily work and register materials, while only supervisors write weekly notes',async()=>{
 const {db,DB}=database();for(const version of ['0004_schedule.sql','0006_schedule_weekly_notes.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+version,import.meta.url),'utf8'));db.exec("CREATE TABLE app_employee_settings(employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0)");
 db.exec("INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('a','a@example.com','小明','viewer','active','now','now')");
 const env={DB},origin='https://example.test',boss={id:1,name:'主管',role:'supervisor',permissions:builtinProfiles[0].permissions},warehouse={id:2,name:'倉管',role:'warehouse',permissions:builtinProfiles[1].permissions},viewer={id:3,name:'小明',role:'viewer',permissions:builtinProfiles[2].permissions};
 const post=(user,body)=>scheduleApi(new Request(origin+'/api/schedule',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),env,user);
 const job={kind:'batch',entries:[{id:'task-1',kind:'daily',revision:0,day:'2026-09-28',endDay:'2026-09-28',title:'機台保養',category:'["潤滑軸承"]',assignee:'["小明"]',note:'',color:'#4e8069'}]};
 assert.equal((await post(viewer,job)).status,403);assert.equal((await post(warehouse,job)).status,200);
 assert.equal((await post(warehouse,{kind:'weekly_note',weekStart:'2026-09-28',body:'本週重點'})).status,403);
 assert.equal((await post(boss,{kind:'weekly_note',weekStart:'2026-09-28',body:'本週重點'})).status,200);
 const material={kind:'material',id:'material-1',revision:0,day:'2026-09-28',title:'螺絲',category:'出貨',quantity:12,note:''};
 assert.equal((await post(viewer,material)).status,403);assert.equal((await post(warehouse,material)).status,200);
 db.exec("INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('b','b@example.com','小華','viewer','active','now','now');INSERT INTO app_employee_settings(employee_id,position) VALUES(1,2),(2,1)");
 const result=await scheduleApi(new Request(origin+'/api/schedule?from=2026-09-28&to=2026-09-30'),env,viewer);assert.equal(result.status,200);const data=await result.json();assert.deepEqual(data.people.map(p=>p.name),['小華','小明']);assert.equal(data.weeklyNotes[0].body,'本週重點');assert.equal(data.entries.find(e=>e.kind==='material').quantity,12);
 assert.equal((await post(boss,{kind:'weekly_note',weekStart:'2026-09-28',body:''})).status,200);assert.equal(db.prepare('SELECT count(*) as n FROM schedule_weekly_notes').get().n,0);
});

test('new weekly notes and daily material entries appear in scoped exports',async()=>{
 const {db,DB}=database();for(const version of ['0004_schedule.sql','0006_schedule_weekly_notes.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+version,import.meta.url),'utf8'));db.exec("CREATE TABLE app_employee_settings(employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0)");
 db.exec("INSERT INTO schedule_weekly_notes VALUES('2026-09-28','現場確認','now','1','主管')");
 db.exec("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision) VALUES ('material-2','material','2026-09-28','2026-09-28','螺帽','','#4e8069','','收料',42,'','1','主管','now','now',1)");
 const {recordsExportApi}=await import('../worker/records-export.mjs');const employee={permissions:builtinProfiles[0].permissions},r=await recordsExportApi(new Request('https://example.test/api/records-export?from=2026-09-28&to=2026-09-30&types=weekly,receipt'),{DB},employee,async()=>({projects:[],deletedProjects:[],platingProjects:[]}),async()=> 'owner');assert.equal(r.status,200);const data=await r.json();assert.equal(data.weekly.find(x=>x.title==='每週備註').note,'現場確認');assert.equal(data.receipt.find(x=>x.item==='螺帽').quantity,42);
});
