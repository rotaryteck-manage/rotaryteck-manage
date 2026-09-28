import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {scheduleApi} from '../worker/schedule.mjs';
import {builtinProfiles} from '../worker/wire-permissions.mjs';
import {validateWorkflowState} from '../worker/workflows.mjs';

test('work entry order persists and each person has one sorted weekly row with inline content',async()=>{
 const {db,DB}=database();for(const name of ['0004_schedule.sql','0006_schedule_weekly_notes.sql','0007_schedule_work_order.sql','0008_schedule_material_photos.sql','0009_schedule_material_project.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 db.exec("CREATE TABLE app_employee_settings(employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0);INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('a','a@example.com','黃瑞麟','viewer','active','now','now')");
 const boss={id:1,name:'主管',role:'supervisor',permissions:builtinProfiles[0].permissions},origin='https://example.test',env={DB};const entries=[['job-z','FAA','製作',1],['job-a','廠內布置','監督',2]].map(([id,title,content,sortIndex])=>({id,kind:'weekly',revision:0,day:'2026-09-29',endDay:'2026-10-02',title,category:JSON.stringify([content]),sortIndex,assignee:'["黃瑞麟"]',note:'',color:'#4e8069'}));
 const send=body=>scheduleApi(new Request(origin+'/api/schedule',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),env,boss);
 assert.equal((await send({kind:'batch',entries})).status,200);
 const response=await scheduleApi(new Request(origin+'/api/schedule?from=2026-09-28&to=2026-10-04'),env,boss);assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.entries.map(e=>e.sort_index),[2,1]);
 const source=fs.readFileSync(new URL('../dist/schedule.js',import.meta.url),'utf8'),snippet=source.slice(source.indexOf('function scheduleLabel63('),source.indexOf('function scheduleMaterial56('));
 const ctx={scheduleData56:data,scheduleShift56:(day,n)=>{const date=new Date(day+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10)},scheduleAssignees56:e=>JSON.parse(e.assignee||'[]')};vm.runInNewContext(snippet,ctx);
 const rows=vm.runInNewContext('scheduleWeeklyRows56("2026-09-28")',ctx);assert.equal(rows.length,1);assert.deepEqual(Array.from(rows[0].entries,e=>e.title),['FAA','廠內布置']);assert.equal(vm.runInNewContext('scheduleLabel63(scheduleWeeklyRows56("2026-09-28")[0].entries[0])',ctx),'FAA(製作)');
 const drawSource=source.slice(source.indexOf('function scheduleDraw56('),source.indexOf('async function scheduleSend56('));const root={innerHTML:'',querySelectorAll:()=>[]},period={textContent:''};Object.assign(ctx,{scheduleTab56:'weekly',scheduleAnchor56:'2026-09-28',scheduleWeek56:day=>day,scheduleMonth56:day=>day.slice(0,7)+'-01',scheduleWeekDays56:day=>Array.from({length:7},(_,i)=>ctx.scheduleShift56(day,i)),scheduleEsc56:value=>String(value),scheduleInk56:()=> '#ffffff',scheduleCan56:()=>true,$:selector=>selector==='#schedule-content56'?root:period,scheduleLayout63:()=>{}});vm.runInNewContext(drawSource,ctx);vm.runInNewContext('scheduleDraw56()',ctx);assert.equal((root.innerHTML.match(/class=\"schedule-plan-bar schedule-plan-group64\"/g)||[]).length,1);assert.equal((root.innerHTML.match(/class=\"schedule-plan-job64\"/g)||[]).length,2);assert.equal((root.innerHTML.match(/data-schedule-group=/g)||[]).length,1);assert.equal((root.innerHTML.match(/class=\"schedule-bar-edit\"/g)||[]).length,1);
});

test('migration restores existing jobs in insertion order, regardless of random IDs',()=>{
 const {db}=database();db.exec(fs.readFileSync(new URL('../drizzle/0004_schedule.sql',import.meta.url),'utf8'));
 for(const [id,title] of [['z-first','FAA'],['a-second','廠內布置']])db.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision) VALUES (?,'weekly','2026-09-29','2026-10-02',?,'[\"黃瑞麟\"]','#4e8069','','[]',0,'','1','主管','now','now',1)").run(id,title);
 db.exec(fs.readFileSync(new URL('../drizzle/0007_schedule_work_order.sql',import.meta.url),'utf8'));
 assert.deepEqual(db.prepare('SELECT title FROM schedule_entries ORDER BY sort_index').all().map(r=>r.title),['FAA','廠內布置']);
});

test('schedule text is accepted as a separate configurable area',()=>{assert.doesNotThrow(()=>validateWorkflowState({appearance:{text:{schedule:{'新增排程':'新增安排','工作內容':'作業內容'}}}}));assert.throws(()=>validateWorkflowState({appearance:{text:{unexpected:{'新增排程':'新增安排'}}}}));});

test('editing and removing one person’s weekly jobs saves together or not at all',async()=>{
 const {db,DB}=database();for(const name of ['0004_schedule.sql','0006_schedule_weekly_notes.sql','0007_schedule_work_order.sql','0008_schedule_material_photos.sql','0009_schedule_material_project.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 db.exec("CREATE TABLE app_employee_settings(employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0);INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('a','a@example.com','黃瑞麟','viewer','active','now','now')");
 const boss={id:1,name:'主管',role:'supervisor',permissions:builtinProfiles[0].permissions},origin='https://example.test',env={DB};const send=body=>scheduleApi(new Request(origin+'/api/schedule',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),env,boss);
 const make=(id,title,revision=0)=>({id,kind:'weekly',revision,day:'2026-09-29',endDay:'2026-10-02',title,category:'["組裝"]',sortIndex:id==='a'?1:2,assignee:'["黃瑞麟"]',note:'',color:'#4e8069'});
 assert.equal((await send({kind:'batch',entries:[make('a','FAA'),make('b','廠內布置')]})).status,200);
 const stale={kind:'batch',entries:[make('a','FAA更新',1)],deletions:[{id:'b',revision:99}]};assert.equal((await send(stale)).status,409);assert.equal(db.prepare("SELECT title FROM schedule_entries WHERE id='a'").get().title,'FAA');
 assert.equal((await send({...stale,deletions:[{id:'b',revision:1}]})).status,200);assert.deepEqual(db.prepare('SELECT title FROM schedule_entries ORDER BY sort_index').all().map(x=>x.title),['FAA更新']);
 assert.equal((await send({kind:'batch',entries:[],deletions:[{id:'a',revision:2}]})).status,200);assert.equal(db.prepare('SELECT count(*) AS n FROM schedule_entries').get().n,0);
});
