import {migrations85} from './helpers/migrations85.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {scheduleApi as raw_scheduleApi} from './helpers/schedule85.mjs';
const shift=(day,n)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const name of ['0000_whole_gertrude_yorkes.sql','0001_calm_fenris.sql','0004_schedule.sql','0006_schedule_weekly_notes.sql','0007_schedule_work_order.sql','0008_schedule_material_photos.sql','0009_schedule_material_project.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 db.exec("INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('a','a@example.com','黃瑞麟','viewer','active','now','now')");
 const DB={db85:db,prepare(sql){const stmt=db.prepare(sql),bind=(...args)=>({first:async()=>stmt.get(...args)||null,all:async()=>({results:stmt.all(...args)}),run:async()=>({meta:{changes:stmt.run(...args).changes}})});return {...bind(),bind}},async batch(list){db.exec('BEGIN');try{const out=[];for(const stmt of list)out.push(await stmt.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
 const boss={id:1,name:'主管',role:'supervisor',permissions:['schedule.view','schedule.weekly','schedule.daily']},warehouse={...boss,role:'warehouse',permissions:['schedule.view','schedule.daily']};
 const send=(body,user=boss)=>scheduleApi(new Request('https://test.local/api/schedule',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify(body)}),{DB},user);
 const item=(id,kind='daily',revision=0)=>({id,kind,revision,day:'2026-09-29',endDay:'2026-09-29',title:id,category:'["製作"]',sortIndex:1,assignee:'["黃瑞麟"]',note:'',color:'#ffbbbb'});
 migrations85(db);return{db,send,item,boss,warehouse};
}
test('daily remove and add save together; stale removal changes nothing; report remains',async()=>{
 const {db,send,item,warehouse}=fixture();assert.equal((await send({kind:'batch',entries:[item('a'),item('b')]})).status,200);
 db.exec("INSERT INTO schedule_reports(id,entry_id,day,body,author_id,author_name,created_at) VALUES('r','b','2026-09-29','完成','1','黃瑞麟','now')");
 const body={kind:'batch',entries:[{...item('a','daily',1),title:'更新工作'},item('c')],deletions:[{id:'b',revision:99}]};
 assert.equal((await send(body,warehouse)).status,409);assert.equal(db.prepare("SELECT title FROM schedule_entries WHERE id='a'").get().title,'a');assert.equal(db.prepare("SELECT count(*) n FROM schedule_entries").get().n,2);
 body.deletions[0].revision=1;assert.equal((await send(body,warehouse)).status,200);assert.deepEqual(db.prepare('SELECT id FROM schedule_entries ORDER BY id').all().map(x=>x.id),['a','c']);assert.equal(db.prepare('SELECT count(*) n FROM schedule_reports').get().n,1);
 assert.equal((await send({kind:'batch',entries:[],deletions:[{id:'a',revision:2},{id:'c',revision:1}]},warehouse)).status,200);assert.equal(db.prepare('SELECT count(*) n FROM schedule_entries').get().n,0);
});
test('weekly delete stays supervisor-only and daily delete requires capability',async()=>{
 const {db,send,item,warehouse,boss}=fixture();await send({kind:'batch',entries:[item('w','weekly'),item('d')]});
 assert.equal((await send({kind:'batch',entries:[{...item('d','daily',1),title:'不應寫入'}],deletions:[{id:'w',revision:1}]},warehouse)).status,403);assert.equal(db.prepare("SELECT title FROM schedule_entries WHERE id='d'").get().title,'d');
 assert.equal((await send({kind:'batch',entries:[],deletions:[{id:'d',revision:1}]},{...warehouse,permissions:['schedule.view']})).status,403);
 assert.equal((await send({kind:'batch',entries:[],deletions:[{id:'w',revision:1}]},boss)).status,200);
});
test('non-overlapping weekly ranges align; overlapping work uses another lane',()=>{
 const source=fs.readFileSync(new URL('../dist/schedule.js',import.meta.url),'utf8'),ctx={};vm.runInNewContext(source.slice(source.indexOf('function scheduleLanes70('),source.indexOf('function scheduleMaterial56(')),ctx);
 const lanes=ctx.scheduleLanes70([{start:2,end:2},{start:3,end:6},{start:4,end:5},{start:7,end:8}]);assert.deepEqual(Array.from(lanes),[0,0,1,0]);
 const bars=[{style:{gridColumnStart:'2',gridColumnEnd:'3'},getBoundingClientRect:()=>({height:64})},{style:{gridColumnStart:'3',gridColumnEnd:'7'},getBoundingClientRect:()=>({height:80})},{style:{gridColumnStart:'4',gridColumnEnd:'6'},getBoundingClientRect:()=>({height:64})}];const person={dataset:{planRow:'2'},style:{},closest:()=>({querySelectorAll:()=>bars})};ctx.scheduleLayout63({querySelectorAll:()=>[person]});assert.equal(bars[0].style.marginTop,bars[1].style.marginTop);assert.equal(bars[2].style.marginTop,'93px');
});
test('calendar fills adjacent months including year changes and uses exact record dates',()=>{
 const source=fs.readFileSync(new URL('../dist/schedule-v67.js',import.meta.url),'utf8'),root={innerHTML:'',querySelectorAll:()=>[]};const ctx={scheduleDraw56(){},scheduleDayRecord56(){},scheduleReportDialog56(){},scheduleMaterialDialog61(){},scheduleData56:{entries:[{id:'prev',kind:'daily',day:'2026-08-31',end_day:'2026-08-31'}],reports:[]},scheduleTab56:'daily',scheduleAnchor56:'2026-09-29',scheduleMonth56:day=>day.slice(0,7)+'-01',scheduleShift56:shift,scheduleMaterial56:()=>[],scheduleEsc56:String,scheduleDecorate60(){},$:()=>root};vm.runInNewContext(source,ctx);ctx.scheduleDraw56();assert.equal((root.innerHTML.match(/data-day="/g)||[]).length,35);assert.match(root.innerHTML,/data-day="2026-08-31"/);assert.match(root.innerHTML,/data-day-jobs="2026-08-31"/);assert.match(root.innerHTML,/data-day="2026-10-03"/);assert.doesNotMatch(root.innerHTML,/schedule-calendar-spacer/);
 ctx.scheduleAnchor56='2027-01-15';ctx.scheduleDraw56();assert.match(root.innerHTML,/data-day="2026-12-27"/);assert.match(root.innerHTML,/data-day="2027-01-31"/);
 ctx.scheduleAnchor56='2026-11-01';ctx.scheduleDraw56();assert.equal((root.innerHTML.match(/data-day="/g)||[]).length,35);assert.match(root.innerHTML,/data-day="2026-12-05"/);
});

// v75 fixture migration: these regression cases represent existing profiles.
import {migratePermissions75} from '../worker/wire-permissions.mjs';
const scheduleApi=(request,env,e)=>raw_scheduleApi(request,env,{...e,permissions:migratePermissions75(e.permissions||[],e.role)});
