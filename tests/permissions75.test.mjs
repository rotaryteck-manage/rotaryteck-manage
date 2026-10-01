import {migrations85} from './helpers/migrations85.mjs';
import {builtinProfiles,migratePermissions75,ensurePermissions,employeePermissions} from '../worker/wire-permissions.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {scheduleApi} from './helpers/schedule85.mjs';
import {validateWorkflowState,workflowChangeAllowed,preparedQuantity} from '../worker/workflows.mjs';
import {stateChangeAllowed} from '../worker/server.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:');for(const name of ['0000_whole_gertrude_yorkes.sql','0001_calm_fenris.sql','0004_schedule.sql','0006_schedule_weekly_notes.sql','0007_schedule_work_order.sql','0008_schedule_material_photos.sql','0009_schedule_material_project.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 db.exec("INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('a','a@t.local','甲','viewer','active','now','now'),('b','b@t.local','乙','viewer','active','now','now')");
 db.exec('CREATE TABLE app_employee_settings(employee_id INTEGER,position INTEGER)');
 const DB={prepare(sql){const stmt=db.prepare(sql),bind=(...a)=>({first:async()=>stmt.get(...a)||null,all:async()=>({results:stmt.all(...a)}),run:async()=>({meta:{changes:stmt.run(...a).changes}})});return{...bind(),bind}},async batch(stmts){db.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};
 const boss={id:1,name:'主管',role:'supervisor',permissions:builtinProfiles[0].permissions};
 const send=(body,user=boss,method='POST',origin='https://t.local')=>scheduleApi(new Request('https://t.local/api/schedule',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),{DB},user);
 const get=(from='2026-09-01',to='2026-10-31')=>scheduleApi(new Request('https://t.local/api/schedule?from='+from+'&to='+to),{DB},boss);
 const leave={kind:'leave',id:'l',revision:0,start:'2026-09-30T13:00',end:'2026-10-02T00:00',people:['1','2'],reason:'事假'};
 migrations85(db);return{db,DB,boss,send,get,leave};
}
test('warehouse dates are independent; role alone never grants dates or unrelated edits',()=>{
 const before={projects:[{id:'p',name:'P',parts:[{id:'i',need:1,sets:1,received:2}],inventory:{i:2}}],logs:[]};
 const user={role:'warehouse',permissions:['warehouse.view','warehouse.receivedDate']};
 const next=structuredClone(before);next.projects[0].parts[0].receivedDate72='2026-09-29';
 assert.equal(stateChangeAllowed(before,next,user),true);
 assert.equal(stateChangeAllowed(before,next,{role:'supervisor',permissions:[]}),false);
 next.projects[0].parts[0].issuedDate72='2026-09-29';assert.equal(stateChangeAllowed(before,next,user),false);
 user.permissions.push('warehouse.issuedDate');assert.equal(stateChangeAllowed(before,next,user),true);
 next.projects[0].parts[0].name='changed';assert.equal(stateChangeAllowed(before,next,user),false);
});
test('stock receive, issue, absolute correction and prepared correction are independently enforced',()=>{
 const before={projects:[{id:'p',parts:[{id:'i',need:1,sets:1,received:2}],inventory:{i:2}}],logs:[]};
 const user=permissions=>({role:'viewer',permissions:['warehouse.view',...permissions]});
 let next=structuredClone(before);next.projects[0].parts[0].received++;next.projects[0].inventory.i++;
 assert.equal(stateChangeAllowed(before,next,user(['warehouse.receive'])),true);
 assert.equal(stateChangeAllowed(before,next,user(['warehouse.issue'])),false);
 assert.equal(stateChangeAllowed(before,next,user(['warehouse.manage'])),false);
 next=structuredClone(before);next.projects[0].inventory.i--;
 assert.equal(stateChangeAllowed(before,next,user(['warehouse.issue'])),true);
 assert.equal(stateChangeAllowed(before,next,user(['warehouse.receive'])),false);
 next.projects[0].inventory.i=9;
 assert.equal(stateChangeAllowed(before,next,user(['warehouse.stockAdjust'])),true);
 assert.equal(stateChangeAllowed(before,next,user(['warehouse.manage'])),false);
 next=structuredClone(before);next.projects[0].parts[0].preparedAdjustment73=2;
 assert.equal(stateChangeAllowed(before,next,user(['warehouse.preparedAdjust'])),true);
 assert.equal(stateChangeAllowed(before,next,user(['warehouse.stockAdjust'])),false);
});
test('migration preserves role defaults and adds only warehouse dates as new warehouse authority',()=>{
 const boss=builtinProfiles[0].permissions,warehouse=builtinProfiles[1].permissions;
 assert.ok(warehouse.includes('warehouse.receivedDate')&&warehouse.includes('warehouse.issuedDate'));
 for(const k of ['warehouse.stockAdjust','warehouse.preparedAdjust','admin.permissions','schedule.weekly.edit'])assert.ok(!warehouse.includes(k));
 assert.ok(boss.includes('admin.permissions'));
 assert.ok(!migratePermissions75(['cases.deleteProject'],'custom').includes('cases.deleteProject'));
 assert.ok(!migratePermissions75(['schedule.weekly','schedule.view'],'custom').includes('schedule.weekly.edit'));
 assert.ok(migratePermissions75(['schedule.report'],'custom').includes('schedule.report.deleteOwn'));
});
test('date options and appearance remain separate permissions',()=>{
 const s={projects:[],logs:[]};
 assert.equal(stateChangeAllowed(s,{...s,warehouseOptions73:{cabinets:['A櫃'],shelves:['1層']}},{role:'viewer',permissions:['warehouse.options']}),true);
 assert.equal(stateChangeAllowed(s,{...s,appearance:{}},{role:'warehouse',permissions:['warehouse.options']}),false);
 assert.equal(stateChangeAllowed(s,{...s,appearance:{}},{role:'viewer',permissions:['admin.settings']}),true);
});
test('leave create/edit/delete/view each needs its own grant, including supervisor',async()=>{
 const {send,get,leave,boss,DB}=fixture();
 const only={...boss,role:'viewer',permissions:['schedule.view','schedule.leave.create']};
 assert.equal((await send(leave,only)).status,200);
 assert.equal((await send({...leave,revision:1,reason:'病假'},only)).status,403);
 assert.equal((await send({...leave,revision:1},only,'DELETE')).status,403);
 let r=await scheduleApi(new Request('https://t.local/api/schedule?from=2026-09-01&to=2026-10-31'),{DB},only);
 assert.equal((await r.json()).leaves.length,0);
 assert.equal((await send({...leave,revision:1,reason:'病假'},{...only,permissions:['schedule.view','schedule.leave.edit']})).status,200);
 assert.equal((await get()).status,200);
 assert.equal((await send({...leave,revision:2},{...only,permissions:['schedule.view','schedule.leave.delete']},'DELETE')).status,200);
 assert.equal((await send({...leave,id:'new'},{...boss,permissions:['schedule.view']})).status,403);
});
test('shared palette can be delegated and revoked independently from weekly editing',async()=>{
 const {send,boss}=fixture(),body={kind:'palette',revision:0,colors:Array(10).fill('#112233')};
 assert.equal((await send(body,{...boss,permissions:['schedule.view','schedule.weekly.edit']})).status,403);
 assert.equal((await send(body,{...boss,role:'warehouse',permissions:['schedule.view','schedule.palette']})).status,200);
});
test('weekly create/edit/delete grants are checked even for batch and role viewer',async()=>{
 const {send,boss}=fixture(),base={kind:'weekly',id:'w',revision:0,day:'2026-09-28',endDay:'2026-09-28',title:'FAA',assignee:'["甲"]',category:'["製作"]',note:'',color:'#ffffff'};
 const u=cap=>({...boss,role:'viewer',permissions:['schedule.view',cap]});
 assert.equal((await send(base,u('schedule.weekly.create'))).status,200);
 assert.equal((await send({...base,revision:1,title:'X'},u('schedule.weekly.create'))).status,403);
 assert.equal((await send({kind:'batch',entries:[{...base,revision:1,title:'X'}]},u('schedule.weekly.edit'))).status,200);
 assert.equal((await send({kind:'batch',entries:[],deletions:[{id:'w',revision:2}]},u('schedule.weekly.edit'))).status,403);
 assert.equal((await send({kind:'weekly',id:'w',revision:2},u('schedule.weekly.delete'),'DELETE')).status,200);
});
test('copy/reset/dedupe and work options are not implied by edit permission',async()=>{
 const {send,boss}=fixture(),u={...boss,permissions:['schedule.view','schedule.weekly.edit']};
 for(const kind of ['copy_week','reset_week','dedupe_week','options'])assert.equal((await send({kind,weekStart:'2026-09-28',items:['A'],contents:['B']},u)).status,403,kind);
 assert.equal((await send({kind:'options',items:['A'],contents:['B']},{...u,role:'viewer',permissions:['schedule.view','schedule.options']})).status,200);
});
test('report body edit/delete distinguishes own and all, with stale edit protection',async()=>{
 const {db,send,boss}=fixture();
 db.exec("INSERT INTO schedule_reports(id,entry_id,day,body,photo_key,photo_name,author_id,author_name,created_at) VALUES('r','e','2026-09-29','old','','','2','乙','now')");
 const u=cap=>({...boss,role:'viewer',permissions:['schedule.view',cap]});
 assert.equal((await send({kind:'report',id:'r',body:'new',previousBody:'old'},u('schedule.report.editOwn'))).status,403);
 assert.equal((await send({kind:'report',id:'r',body:'new',previousBody:'old'},u('schedule.report.editAll'))).status,200);
 assert.equal((await send({kind:'report',id:'r',body:'new2',previousBody:'old'},u('schedule.report.editAll'))).status,409);
 assert.equal((await send({kind:'report',id:'r'},u('schedule.report.deleteOwn'),'DELETE')).status,403);
 assert.equal((await send({kind:'report',id:'r'},u('schedule.report.deleteAll'),'DELETE')).status,200);
});
test('text daily and weekly access are separate and deletion is separately granted',async()=>{
 const {DB,boss,send}=fixture(),u={...boss,role:'warehouse',permissions:['schedule.view','schedule.text.daily']};
 for(const kind of ['daily','weekly']){const r=await scheduleApi(new Request('https://t.local/api/schedule?view=text&kind='+kind+'&from=2026-09-01&to=2026-09-30'),{DB},u);assert.equal(r.status,kind==='daily'?200:403);}
 assert.equal((await send({kind:'text_delete',id:'x'},u,'DELETE')).status,403);
});
test('saved profiles migrate once and revoked grants are never added back on login',async()=>{
 const {db,DB}=fixture();
 db.exec('ALTER TABLE app_employee_settings ADD COLUMN profile_id TEXT NOT NULL DEFAULT ""');
 db.exec('CREATE TABLE IF NOT EXISTS app_permission_profiles(id TEXT PRIMARY KEY,name TEXT,permissions TEXT)');
 db.prepare('INSERT INTO app_permission_profiles VALUES(?,?,?)').run('warehouse','倉管',JSON.stringify(['warehouse.view','warehouse.stock']));
 await ensurePermissions({DB});
 let p=JSON.parse(db.prepare("SELECT permissions FROM app_permission_profiles WHERE id='warehouse'").get().permissions);
 assert.ok(p.includes('warehouse.receivedDate'));assert.ok(p.includes('warehouse.receive'));
 p=p.filter(k=>k!=='warehouse.receivedDate');db.prepare("UPDATE app_permission_profiles SET permissions=? WHERE id='warehouse'").run(JSON.stringify(p));
 await ensurePermissions({DB});
 const e=await employeePermissions({DB},{id:1,role:'warehouse'});
 assert.ok(!e.permissions.includes('warehouse.receivedDate'));assert.ok(e.permissions.includes('warehouse.issuedDate'));
});
test('restore and purge never follow general warehouse management alone',()=>{
 const project={id:'p',parts:[],inventory:{}},before={projects:[],deletedProjects:[{project,index:0}],logs:[]},restored={projects:[project],deletedProjects:[],logs:[]};
 assert.equal(stateChangeAllowed(before,restored,{role:'supervisor',permissions:['warehouse.manage']}),false);
 assert.equal(stateChangeAllowed(before,restored,{role:'viewer',permissions:['warehouse.restore']}),true);
 assert.equal(stateChangeAllowed(before,{...before,deletedProjects:[]},{role:'viewer',permissions:['warehouse.restore']}),false);
 assert.equal(stateChangeAllowed(before,{...before,deletedProjects:[]},{role:'viewer',permissions:['warehouse.purge']}),true);
});
