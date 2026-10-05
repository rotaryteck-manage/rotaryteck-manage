import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {builtinProfiles} from '../worker/wire-permissions.mjs';
import {scheduleApiWithLeaveNotifications102,defaultLeaveRule102} from '../worker/server.mjs';
import {notificationRulesValid85} from '../worker/notifications85.mjs';
import {recordsExportApi} from '../worker/records-export.mjs';

function fixture(){
 const {db,DB}=database();migrations85(db);
 db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'boss','boss@local.test','主管','supervisor','active','now','now'),(2,'staff','staff@local.test','甲','viewer','active','now','now'),(3,'staff2','staff2@local.test','乙','viewer','active','now','now')");
 const env={DB},boss={id:1,name:'主管',role:'supervisor',permissions:builtinProfiles[0].permissions};
 const send=(body,method='POST')=>scheduleApiWithLeaveNotifications102(new Request('https://t.local/api/schedule',{method,headers:{origin:'https://t.local','content-type':'application/json'},body:JSON.stringify(body)}),env,boss);
 return{db,env,send};
}

test('10.2v special leave is accepted, exported and appears before other in the form',async()=>{
 const {db,env,send}=fixture(),leave={kind:'leave',id:'special',revision:0,start:'2026-10-06T08:30',end:'2026-10-06T17:30',people:['2'],reason:'特休'};
 assert.equal((await send(leave)).status,200);assert.equal(db.prepare("SELECT reason FROM schedule_leave72 WHERE id='special'").get().reason,'特休');
 const ui=fs.readFileSync(new URL('../dist/enhancements-v72.js',import.meta.url),'utf8');assert.ok(ui.indexOf("'特休'")<ui.indexOf("'其他'"));
 const response=await recordsExportApi(new Request('https://t.local/api/records-export?from=2026-10-01&to=2026-10-31&types=daily&photos=0'),env,{permissions:['records.export']},async()=>({}),async()=> 'owner'),data=await response.json();assert.equal(response.status,200);assert.ok(data.daily.some(x=>x.record_kind==='請假紀錄'&&x.category==='特休'));
});

test('only leave records created after 10.2v generate create, edit and cancel notifications',async()=>{
 const {db,send}=fixture(),now='2026-10-05T05:00:00.000Z';
 db.prepare("INSERT INTO schedule_leave72(id,start_at,end_at,people,reason,revision,author_name,updated_at) VALUES('legacy','2026-10-07T08:30','2026-10-07T17:30',?,'事假',1,'主管',?)").run(JSON.stringify([{id:'2',name:'甲'}]),now);
 assert.equal((await send({kind:'leave',id:'legacy',revision:1,start:'2026-10-07T08:30',end:'2026-10-07T17:30',people:['2'],reason:'病假'})).status,200);
 assert.equal(db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,0);

 const leave={kind:'leave',id:'new-leave',revision:0,start:'2026-10-08T08:30',end:'2026-10-08T17:30',people:['2'],reason:'特休'};
 assert.equal((await send(leave)).status,200);assert.equal(db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,2);
 assert.equal((await(await send(leave)).json()).already,true);assert.equal(db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,2);
 assert.equal((await send({...leave,revision:1,reason:'病假'})).status,200);assert.equal(db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,4);
 assert.equal((await send({kind:'leave',id:leave.id,revision:2},'DELETE')).status,200);assert.equal(db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,6);
 const rows=db.prepare('SELECT employee_id,category,title,message,target_url,source_key FROM notification_inbox88 ORDER BY created_at,id').all();assert.deepEqual([...new Set(rows.slice(0,2).map(x=>x.employee_id))].sort(),[1,2]);assert.ok(rows.every(x=>x.category==='假別紀錄'&&x.target_url.includes('notificationLeave=new-leave')));assert.ok(rows.some(x=>x.title==='請假登記')&&rows.some(x=>x.title==='請假異動')&&rows.some(x=>x.title==='請假取消'));assert.equal(new Set(rows.map(x=>x.source_key)).size,6);
});

test('leave notification setting defaults, pause and customized content affect real deliveries',async()=>{
 const {db,send}=fixture(),first={kind:'leave',id:'initial',revision:0,start:'2026-10-08T08:30',end:'2026-10-08T17:30',people:['2'],reason:'特休'};
 const rule=defaultLeaveRule102();assert.doesNotThrow(()=>notificationRulesValid85([rule]));
 assert.throws(()=>notificationRulesValid85([{...rule,recipientMode:'selected',recipientIds:['3']}]),/當事人及主管/);
 assert.throws(()=>notificationRulesValid85([rule,{...rule,id:'duplicate'}]),/只能設定一項/);
 assert.equal((await send(first)).status,200);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM notification_inbox88').get().n,2);
 const put=(name,value)=>db.prepare('INSERT INTO state_records(record_key,body,revision) VALUES(?,?,1) ON CONFLICT(record_key) DO UPDATE SET body=excluded.body,revision=revision+1').run(JSON.stringify(['root',name]),JSON.stringify(value));
 put('notificationRules',[{...rule,enabled:false}]);put('notificationVersion102',1);
 assert.equal((await send({...first,id:'paused'})).status,200);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM notification_inbox88').get().n,2);
 put('notificationRules',[{...rule,title:'假別：{動作}',message:'{人員}的{假別}｜{操作人}',enabled:true}]);
 assert.equal((await send({...first,id:'customized'})).status,200);
 const rows=db.prepare("SELECT employee_id,title,message FROM notification_inbox88 WHERE source_key LIKE '%:customized:%'").all();
 assert.deepEqual(rows.map(x=>x.employee_id).sort(),[1,2]);
 assert.ok(rows.every(x=>x.title==='假別：登記'&&x.message.includes('特休｜主管')));
 assert.equal(db.prepare('SELECT COUNT(*) n FROM notification_inbox88 WHERE employee_id=3').get().n,0);
});

test('leave setting is visible with immediate default and no backfill in admin',()=>{
 const ui=fs.readFileSync(new URL('../dist/enhancements-v88.js',import.meta.url),'utf8');
 assert.match(ui,/leave:'假別紀錄即時通知'/);
 assert.match(ui,/notificationVersion102=1/);
 assert.match(ui,/只通知這筆請假的當事人及主管/);
 assert.match(ui,/既有紀錄不補發|過去紀錄不補發/);
});

test('10.2v photo links use an in-page dialog and leave notification opens the exact record',()=>{
 const photos=fs.readFileSync(new URL('../dist/photos.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../dist/enhancements-v102.css',import.meta.url),'utf8'),route=fs.readFileSync(new URL('../dist/enhancements-v88.js',import.meta.url),'utf8');
 assert.match(photos,/private-photo-viewer102/);assert.match(photos,/schedule-material-photo/);assert.match(photos,/img\[data-material-photo\]/);assert.doesNotMatch(photos,/window\.open\(/);assert.match(css,/::backdrop/);assert.match(css,/100dvh/);assert.match(route,/notificationLeave/);assert.match(route,/leaveRecords72\(day,leave\)/);assert.match(route,/此請假紀錄已取消或不存在/);
});

test('10.2v version label is consistent',()=>{
 for(const file of ['cloud.js','enhancements-v943.js','enhancements-v944.js','enhancements-v945.js'])assert.match(fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),/10\.2v/,file);
});
