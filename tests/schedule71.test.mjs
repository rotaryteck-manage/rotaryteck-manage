import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {scheduleApi} from '../worker/schedule.mjs';
const shift=(day,n)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const name of ['0000_whole_gertrude_yorkes.sql','0001_calm_fenris.sql','0004_schedule.sql','0006_schedule_weekly_notes.sql','0007_schedule_work_order.sql','0008_schedule_material_photos.sql','0009_schedule_material_project.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 db.exec("INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('a','a@example.com','黃瑞麟','viewer','active','now','now')");
 const DB={prepare(sql){const stmt=db.prepare(sql),bind=(...args)=>({first:async()=>stmt.get(...args)||null,all:async()=>({results:stmt.all(...args)}),run:async()=>({meta:{changes:stmt.run(...args).changes}})});return {...bind(),bind}},async batch(list){db.exec('BEGIN');try{const out=[];for(const stmt of list)out.push(await stmt.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
 const boss={id:1,name:'主管',role:'supervisor',permissions:['schedule.view','schedule.weekly','schedule.daily']},warehouse={...boss,role:'warehouse',permissions:['schedule.view','schedule.daily']};
 const send=(body,user=boss)=>scheduleApi(new Request('https://test.local/api/schedule',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify(body)}),{DB},user);
 const item=(id,kind='daily',revision=0)=>({id,kind,revision,day:'2026-09-29',endDay:'2026-09-29',title:id,category:'["製作"]',sortIndex:1,assignee:'["黃瑞麟"]',note:'',color:'#ffbbbb'});
 return{db,DB,send,item,boss,warehouse};
}
test('copy is idempotent, reset preserves cross-week portions and reports',async()=>{
 const {db,send,item,warehouse}=fixture();await send({kind:'batch',entries:[{...item('s','weekly'),day:'2026-09-21',endDay:'2026-09-27'}]});
 const copy={kind:'copy_week',weekStart:'2026-09-28'};assert.equal((await send(copy,warehouse)).status,403);
 let r=await send(copy);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).count,1);assert.equal((await (await send(copy)).json()).already,true);assert.equal(db.prepare('SELECT count(*) n FROM schedule_entries').get().n,2);
 await send({kind:'batch',entries:[{...item('span','weekly'),day:'2026-09-24',endDay:'2026-10-08'}]});db.exec("INSERT INTO schedule_reports(id,entry_id,day,body,author_id,author_name,created_at) VALUES('r','span','2026-09-29','完成','1','員工','now')");
 r=await send({kind:'reset_week',weekStart:'2026-09-28'});assert.equal(r.status,200,await r.clone().text());assert.equal(db.prepare("SELECT count(*) n FROM schedule_entries WHERE day<='2026-10-04' AND end_day>='2026-09-28'").get().n,0);assert.equal(db.prepare("SELECT end_day FROM schedule_entries WHERE id='span'").get().end_day,'2026-09-27');assert.equal(db.prepare("SELECT count(*) n FROM schedule_entries WHERE day='2026-10-05' AND end_day='2026-10-08'").get().n,1);assert.equal(db.prepare('SELECT count(*) n FROM schedule_reports').get().n,1);assert.equal((await (await send(copy)).json()).count,2);
});
test('failed copy rolls back marker and all entries',async()=>{
 const {db,send,item}=fixture();await send({kind:'batch',entries:[{...item('s','weekly'),day:'2026-09-21',endDay:'2026-09-27'}]});db.exec("CREATE TRIGGER reject_copy BEFORE INSERT ON schedule_entries WHEN NEW.day='2026-09-28' BEGIN SELECT RAISE(ABORT,'test failure'); END");assert.equal((await send({kind:'copy_week',weekStart:'2026-09-28'})).status,400);assert.equal(db.prepare('SELECT count(*) n FROM schedule_copies71').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM schedule_entries').get().n,1);
});
test('text deletion is supervisor only and does not delete schedule',async()=>{
 const {db,DB,send,item,boss,warehouse}=fixture();await send({kind:'batch',entries:[item('d')]});const get=u=>scheduleApi(new Request('https://test.local/api/schedule?view=text&kind=daily&from=2026-09-01&to=2026-09-30'),{DB},u);assert.equal((await get(warehouse)).status,403);const rows=(await (await get(boss)).json()).items;assert.ok(rows.some(e=>e.body.includes('新增紀錄')));
 for(const row of rows){const r=await scheduleApi(new Request('https://test.local/api/schedule',{method:'DELETE',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify({kind:'text_delete',id:row.id})}),{DB},boss);assert.equal(r.status,200)}assert.equal((await (await get(boss)).json()).items.length,0);assert.equal(db.prepare('SELECT count(*) n FROM schedule_entries').get().n,1);
});
test('legacy editing uses net stock deltas and preserves other lines',()=>{
 const js=fs.readFileSync(new URL('../dist/enhancements-v71.js',import.meta.url),'utf8'),ctx={structuredClone,crypto,currentUser:{name:'主管'}};vm.runInNewContext(js.slice(js.indexOf('function legacyParts71'),js.indexOf('function legacyDialog71')),ctx);
 const state={projects:[{id:'p',parts:[{id:'a',name:'A',received:10},{id:'b',name:'B',received:4}],inventory:{a:2,b:4},materialLogs:[{id:'l',time:'2026-09-01',actor:'甲',received:[{name:'A',qty:10},{name:'B',qty:4}],issued:[]}]}]},v={oldPartId:'a',projectId:'p',partId:'a',quantity:10,category:'收料',title:'A',actor:'乙',day:'2026-09-29'},ref=['p','l','received',0];
 const next=ctx.reviseLegacy71(state,ref,v);assert.equal(next.projects[0].inventory.a,2);assert.equal(next.projects[0].materialLogs[1].received.length,1);assert.equal(next.projects[0].materialLogs[1].actor,'甲');assert.equal(state.projects[0].materialLogs[0].received.length,2);assert.throws(()=>ctx.reviseLegacy71(state,ref,{...v,quantity:7}),/小於零/);assert.equal(ctx.reviseLegacy71(state,ref,{...v,quantity:12}).projects[0].inventory.a,4);
});
test('existing copies from previous versions are not copied twice',async()=>{const{db,send,item}=fixture();await send({kind:'batch',entries:[{...item('source','weekly'),day:'2026-09-21',endDay:'2026-09-21',title:'同工作'},{...item('target','weekly'),day:'2026-09-28',endDay:'2026-09-28',title:'同工作'}]});const result=await(await send({kind:'copy_week',weekStart:'2026-09-28'})).json();assert.equal(result.already,true);assert.equal(db.prepare('SELECT count(*) n FROM schedule_entries').get().n,2)});
test('supervisor changes material author; warehouse cannot impersonate',async()=>{
 const {db,DB,boss,warehouse}=fixture();const {scheduleMaterialUpload}=await import('../worker/schedule.mjs');db.exec("INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('b','b@test.local','乙','viewer','active','now','now')");
 const upload=(revision,authorId,user)=>{const f=new FormData();for(const[k,v]of Object.entries({id:'m',day:'2026-09-29',title:'螺帽',projectName:'FAA',category:'收料',quantity:2,revision,authorId}))f.set(k,String(v));return scheduleMaterialUpload(new Request('https://test.local/api/schedule-material-upload',{method:'POST',headers:{origin:'https://test.local'},body:f}),{DB},{...user,permissions:[...user.permissions,'schedule.material']})};
 assert.equal((await upload(0,'1',boss)).status,200);assert.equal((await upload(1,'2',warehouse)).status,403);assert.equal((await upload(1,'2',boss)).status,200);assert.equal(db.prepare("SELECT author_name FROM schedule_entries WHERE id='m'").get().author_name,'乙');assert.equal((await upload(1,'1',boss)).status,409);assert.equal(db.prepare("SELECT count(*) n FROM schedule_text71").get().n,2);
});
