import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {scheduleApi,scheduleUnique73} from '../worker/schedule.mjs';
import {validateWorkflowState,workflowChangeAllowed,preparedQuantity} from '../worker/workflows.mjs';
import {stateChangeAllowed} from '../worker/server.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:');for(const name of ['0000_whole_gertrude_yorkes.sql','0001_calm_fenris.sql','0004_schedule.sql','0006_schedule_weekly_notes.sql','0007_schedule_work_order.sql','0008_schedule_material_photos.sql','0009_schedule_material_project.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 db.exec("INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('a','a@t.local','甲','viewer','active','now','now'),('b','b@t.local','乙','viewer','active','now','now')");
 db.exec('CREATE TABLE app_employee_settings(employee_id INTEGER,position INTEGER)');
 const DB={prepare(sql){const stmt=db.prepare(sql),bind=(...a)=>({first:async()=>stmt.get(...a)||null,all:async()=>({results:stmt.all(...a)}),run:async()=>({meta:{changes:stmt.run(...a).changes}})});return{...bind(),bind}},async batch(stmts){db.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};
 const boss={id:1,name:'主管',role:'supervisor',permissions:['schedule.view','schedule.weekly','schedule.daily','warehouse.manage']};
 const send=(body,user=boss,method='POST',origin='https://t.local')=>scheduleApi(new Request('https://t.local/api/schedule',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),{DB},user);
 const get=(from='2026-09-01',to='2026-10-31')=>scheduleApi(new Request('https://t.local/api/schedule?from='+from+'&to='+to),{DB},boss);
 const leave={kind:'leave',id:'l',revision:0,start:'2026-09-30T13:00',end:'2026-10-02T00:00',people:['1','2'],reason:'事假'};
 return{db,DB,boss,send,get,leave};
}

function weekly(db,id,people,extra={}){const e={day:'2026-09-21',end:'2026-09-25',title:'FAA',color:'#d4d4d4',note:'',...extra};db.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,sort_index) VALUES(?,'weekly',?,?,?,?,?,?,'[\"製作\"]',0,'','1','主管','now','now',1,0)").run(id,e.day,e.end,e.title,JSON.stringify(people),e.color,e.note);}
test('four identical copies collapse to one per person, preserving other people and distinct work',async()=>{
 const{db,send}=fixture();for(let i=0;i<4;i++)weekly(db,'s'+i,['甲','乙']);weekly(db,'other',['甲'],{title:'不同工作'});weekly(db,'extra',['乙','丙']);
 weekly(db,'target',['甲'],{day:'2026-09-28',end:'2026-10-02'});
 const r=await send({kind:'copy_week',weekStart:'2026-09-28'});assert.equal(r.status,200,await r.clone().text());const rows=db.prepare("SELECT * FROM schedule_entries WHERE day='2026-09-28'").all();const assignment=rows.flatMap(e=>JSON.parse(e.assignee).map(n=>e.title+'|'+n));assert.equal(new Set(assignment).size,assignment.length);assert.deepEqual(assignment.sort(),['FAA|甲','FAA|乙','FAA|丙','不同工作|甲'].sort());assert.equal(db.prepare("SELECT count(*) n FROM schedule_entries WHERE day='2026-09-21'").get().n,6);assert.equal((await(await send({kind:'copy_week',weekStart:'2026-09-28'})).json()).already,true);
});
test('cleanup preview preserves reports, nonduplicates and outside-week data; stale preview rejected',async()=>{
 const{db,DB,boss,send}=fixture();for(let i=0;i<4;i++)weekly(db,'s'+i,['甲','乙'],{day:'2026-09-28',end:'2026-10-02'});weekly(db,'other',['甲'],{day:'2026-09-28',end:'2026-10-02',note:'不同備註'});weekly(db,'extra',['乙','丙'],{day:'2026-09-28',end:'2026-10-02'});weekly(db,'outside',['甲','乙']);
 db.exec("INSERT INTO schedule_reports(id,entry_id,day,body,author_id,author_name,created_at) VALUES('r','s3','2026-09-29','完成','1','甲','now')");
 const preview=async()=>{const r=await scheduleApi(new Request('https://t.local/api/schedule?view=dedupe&weekStart=2026-09-28'),{DB},boss);assert.equal(r.status,200,await r.clone().text());return r.json()};const a=await preview();assert.ok(a.items.length);db.exec("UPDATE schedule_entries SET revision=revision+1 WHERE id='other'");assert.equal((await send({kind:'dedupe_week',weekStart:'2026-09-28',token:a.token})).status,409);
 const b=await preview();assert.equal((await send({kind:'dedupe_week',weekStart:'2026-09-28',token:b.token})).status,200);const rows=db.prepare("SELECT * FROM schedule_entries WHERE day='2026-09-28'").all();assert.equal(scheduleUnique73(rows).changes.length,0);assert.ok(rows.some(e=>e.note==='不同備註'));assert.ok(rows.some(e=>JSON.parse(e.assignee).includes('丙')));assert.equal(db.prepare('SELECT count(*) n FROM schedule_reports').get().n,1);assert.ok(db.prepare("SELECT id FROM schedule_entries WHERE id='outside'").get());assert.equal((await preview()).items.length,0);
});
test('cleanup transaction guard rejects racing edits without partial removal',async()=>{
 const{db,DB,boss}=fixture();weekly(db,'a',['甲'],{day:'2026-09-28',end:'2026-10-02'});weekly(db,'b',['甲'],{day:'2026-09-28',end:'2026-10-02'});
 const p=await(await scheduleApi(new Request('https://t.local/api/schedule?view=dedupe&weekStart=2026-09-28'),{DB},boss)).json();const real=DB.batch;DB.batch=async stmts=>{if(stmts.length>2)db.exec("UPDATE schedule_entries SET revision=revision+1 WHERE id='a'");return real(stmts)};
 const r=await scheduleApi(new Request('https://t.local/api/schedule',{method:'POST',headers:{origin:'https://t.local','content-type':'application/json'},body:JSON.stringify({kind:'dedupe_week',weekStart:'2026-09-28',token:p.token})}),{DB},boss);assert.equal(r.status,409);assert.equal(db.prepare('SELECT count(*) n FROM schedule_entries').get().n,2);assert.equal(db.prepare('SELECT count(*) n FROM schedule_guard73').get().n,0);
});
test('shared palette is persisted for everyone and supervisor-only with revision protection',async()=>{
 const{DB,boss,send}=fixture();const get=user=>scheduleApi(new Request('https://t.local/api/schedule?view=palette'),{DB},user);const initial=await(await get(boss)).json();assert.equal(initial.colors.length,10);const colors=initial.colors.map((v,i)=>i?'#ccddee':'#abcdef');assert.equal((await send({kind:'palette',colors,revision:0},{...boss,role:'warehouse'})).status,403);assert.equal((await send({kind:'palette',colors,revision:0})).status,200);assert.equal((await send({kind:'palette',colors,revision:0})).status,409);assert.deepEqual((await(await get({...boss,role:'viewer'})).json()).colors,colors);assert.equal((await send({kind:'palette',colors:['bad'],revision:1})).status,400);
});
test('quantity correction is independent, rejects simultaneous movements, and protects adjustment/settings',()=>{
 const js=fs.readFileSync(new URL('../dist/enhancements-v73.js',import.meta.url),'utf8'),c={preparedQuantity,inStock:(p,id)=>p.inventory[id]||0,currentUser:{role:'supervisor'},canDo:()=>true,integer:(v,min,max)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('數量不正確');return n}};vm.runInNewContext(js.slice(js.indexOf('function quantityCorrection73'),js.indexOf('const partChangedBefore73')),c);
 const p={id:'p',parts:[{id:'i',need:1,sets:1,received:10}],inventory:{i:6},production:{id:'round',start:'2026-09-01',sets:1,baseline:{i:{stock:2,received:8}}}},i=p.parts[0],fd=new Map([['prepared73:i','8'],['stock73:i','6'],['q:i','0'],['out:i','0']]);const v=c.quantityCorrection73(p,i,fd);assert.equal(v.prepared,8);assert.equal(v.stock,6);i.preparedAdjustment73=v.adjustment;assert.equal(preparedQuantity(p,i),8);i.received++;assert.equal(preparedQuantity(p,i),9);assert.equal(p.inventory.i,6);
 fd.set('stock73:i','2');fd.set('q:i','1');assert.throws(()=>c.quantityCorrection73(p,i,fd),/請先儲存/);fd.set('q:i','0');fd.set('stock73:i','-1');assert.throws(()=>c.quantityCorrection73(p,i,fd));
 const before={projects:[p]},after=structuredClone(before);after.projects[0].parts[0].preparedAdjustment73=0;assert.equal(workflowChangeAllowed(before,after,{role:'warehouse'}),false);assert.equal(workflowChangeAllowed(before,after,{role:'supervisor'}),true);
 after.warehouseOptions73={cabinets:['自訂櫃'],shelves:['9層']};assert.doesNotThrow(()=>validateWorkflowState(after));assert.equal(workflowChangeAllowed(before,after,{role:'warehouse'}),false);after.warehouseOptions73.shelves=['1層','1層'];assert.throws(()=>validateWorkflowState(after),/不可重複/);
});
