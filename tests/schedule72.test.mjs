import {migrations85} from './helpers/migrations85.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {scheduleApi as raw_scheduleApi} from './helpers/schedule85.mjs';
import {validateWorkflowState,workflowChangeAllowed,preparedQuantity} from '../worker/workflows.mjs';
import {stateChangeAllowed} from '../worker/server.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:');for(const name of ['0000_whole_gertrude_yorkes.sql','0001_calm_fenris.sql','0004_schedule.sql','0006_schedule_weekly_notes.sql','0007_schedule_work_order.sql','0008_schedule_material_photos.sql','0009_schedule_material_project.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 db.exec("INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('a','a@t.local','甲','viewer','active','now','now'),('b','b@t.local','乙','viewer','active','now','now')");
 db.exec('CREATE TABLE app_employee_settings(employee_id INTEGER,position INTEGER)');
 const DB={prepare(sql){const stmt=db.prepare(sql),bind=(...a)=>({first:async()=>stmt.get(...a)||null,all:async()=>({results:stmt.all(...a)}),run:async()=>({meta:{changes:stmt.run(...a).changes}})});return{...bind(),bind}},async batch(stmts){db.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};
 const boss={id:1,name:'主管',role:'supervisor',permissions:['schedule.view','schedule.daily','warehouse.manage']};
 const send=(body,user=boss,method='POST',origin='https://t.local')=>scheduleApi(new Request('https://t.local/api/schedule',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),{DB},user);
 const get=(from='2026-09-01',to='2026-10-31')=>scheduleApi(new Request('https://t.local/api/schedule?from='+from+'&to='+to),{DB},boss);
 const leave={kind:'leave',id:'l',revision:0,start:'2026-09-30T13:00',end:'2026-10-02T00:00',people:['1','2'],reason:'事假'};
 migrations85(db);return{db,DB,boss,send,get,leave};
}
test('multi-person cross-month leave persists; retry is idempotent; editing and deletion require revision',async()=>{
 const {db,send,get,leave}=fixture();let r=await send(leave);assert.equal(r.status,200,await r.clone().text());assert.equal((await(await send(leave)).json()).already,true);assert.equal(db.prepare('SELECT count(*) n FROM schedule_leave72').get().n,1);
 const rows=(await(await get()).json()).leaves;assert.deepEqual(rows[0].people,[{id:'1',name:'甲'},{id:'2',name:'乙'}]);assert.equal((await(await get('2026-10-02','2026-10-02')).json()).leaves.length,0);
 assert.equal((await send({...leave,reason:'病假'})).status,409);assert.equal((await send({...leave,revision:1,reason:'病假'})).status,200);
 assert.equal((await send({kind:'leave',id:'l',revision:1},undefined,'DELETE')).status,409);assert.equal((await send({kind:'leave',id:'l',revision:2},undefined,'DELETE')).status,200);assert.equal(db.prepare('SELECT count(*) n FROM schedule_leave72').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM schedule_text71').get().n,3);
});
test('leave rejects invalid people, dates, reasons and unauthorized writes',async()=>{
 const {send,leave,boss}=fixture();for(const patch of [{end:leave.start},{start:'2026-02-30T09:00'},{end:'2026-10-02T25:00'},{reason:'年假'},{people:[]},{people:['1','1']}])assert.equal((await send({...leave,...patch})).status,400);
 assert.equal((await send({...leave,people:['999']})).status,409);assert.equal((await send(leave,{...boss,role:'viewer'})).status,403);assert.equal((await send(leave,boss,'POST','https://evil.local')).status,403);assert.equal((await send(leave,{...boss,role:'warehouse'})).status,200);
});
test('leave and audit writes roll back together',async()=>{const{db,send,leave}=fixture();await send(leave);db.exec("CREATE TRIGGER fail_log BEFORE INSERT ON schedule_text71 BEGIN SELECT RAISE(ABORT,'test'); END");assert.equal((await send({...leave,revision:1,reason:'病假'})).status,400);assert.equal(db.prepare('SELECT reason FROM schedule_leave72').get().reason,'事假')});
test('date fields survive normal stock writes and are restricted to supervisor even with manage permission',()=>{
 const before={projects:[{id:'p',parts:[{id:'i',need:1,sets:1,received:2,receivedDate72:'2026-09-29'}],archivedParts:[],inventory:{i:0}}],logs:[]},after=structuredClone(before);after.projects[0].parts[0].issuedDate72='2026-09-30';
 assert.equal(workflowChangeAllowed(before,after,{role:'viewer'}),false);assert.equal(stateChangeAllowed(before,after,{role:'warehouse',permissions:['warehouse.manage']}),false);assert.equal(stateChangeAllowed(before,after,{role:'supervisor',permissions:['warehouse.manage','warehouse.issuedDate','warehouse.receivedDate']}),true);assert.doesNotThrow(()=>validateWorkflowState(after));
 after.projects[0].parts[0].issuedDate72='2026-02-30';assert.throws(()=>validateWorkflowState(after),/日期/);after.projects[0].parts[0].issuedDate72='';assert.doesNotThrow(()=>validateWorkflowState(after));assert.equal(preparedQuantity(before.projects[0],before.projects[0].parts[0]),2);
 const stock=structuredClone(before);stock.projects[0].inventory.i=1;assert.equal(workflowChangeAllowed(before,stock,{role:'warehouse'}),true);
 const restored=structuredClone(before);restored.projects[0].archivedParts=[{part:restored.projects[0].parts.pop()}];assert.equal(workflowChangeAllowed(before,restored,{role:'warehouse'}),true);restored.projects[0].archivedParts[0].part.receivedDate72='2026-10-01';assert.equal(workflowChangeAllowed(before,restored,{role:'warehouse'}),false);
});
test('calendar excludes midnight end date and spans month boundaries',()=>{const js=fs.readFileSync(new URL('../dist/enhancements-v72.js',import.meta.url),'utf8'),c={scheduleShift56:(day,n)=>new Date(Date.parse(day+'T00:00Z')+n*86400000).toISOString().slice(0,10)};vm.runInNewContext(js.slice(js.indexOf('function leaveOnDay72'),js.indexOf('function leaveDialog72')),c);const e={start_at:'2026-09-30T13:00',end_at:'2026-10-02T00:00'};assert.equal(c.leaveOnDay72(e,'2026-09-30'),true);assert.equal(c.leaveOnDay72(e,'2026-10-01'),true);assert.equal(c.leaveOnDay72(e,'2026-10-02'),false)});
test('other leave reason is required, persisted, idempotent, audited and cleared when category changes',async()=>{
 const {db,send,get,leave}=fixture();
 for(const reasonNote of ['', '   ', 'a'.repeat(201)])assert.equal((await send({...leave,reason:'其他',reasonNote})).status,400);
 const other={...leave,reason:'其他',reasonNote:'  家庭安排  '};
 assert.equal((await send(other)).status,200);
 assert.equal((await(await send(other)).json()).already,true);
 assert.equal((await(await get()).json()).leaves[0].reason_note,'家庭安排');
 assert.equal((await send({...other,reasonNote:'不同原因'})).status,409);
 assert.match(db.prepare('SELECT body FROM schedule_text71').get().body,/其他：家庭安排/);
 assert.equal((await send({...other,revision:1,reason:'病假'})).status,200);
 assert.equal((await(await get()).json()).leaves[0].reason_note,'');
 assert.equal((await send({...other,revision:2})).status,200);
 assert.equal((await send({kind:'leave',id:leave.id,revision:3},undefined,'DELETE')).status,200);
 assert.ok(db.prepare('SELECT body FROM schedule_text71').all().some(r=>r.body.includes('刪除請假')&&r.body.includes('家庭安排')));
});

// v75 fixture migration: these regression cases represent existing profiles.
import {migratePermissions75} from '../worker/wire-permissions.mjs';
const scheduleApi=(request,env,e)=>raw_scheduleApi(request,env,{...e,permissions:migratePermissions75(e.permissions||[],e.role)});
