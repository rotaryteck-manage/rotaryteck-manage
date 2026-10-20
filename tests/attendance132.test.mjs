import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {meetingAttendanceApi132} from '../worker/meeting-attendance132.mjs';
const migration=fs.readFileSync(new URL('../drizzle/0039_meeting_attendance132.sql',import.meta.url),'utf8');
function fixture(){
 const {db,DB}=database();migrations85(db);
 const add=(id,name,status='active')=>db.prepare('INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,'user'+id,id+'@test.local',name,'viewer',status,'now','now');
 for(const p of [[1,'主管'],[2,'甲員工'],[3,'乙員工'],[4,'停用員工','disabled'],[5,'機器人一號'],[6,'機器人二號']])add(...p);
 const meeting=(id='m')=>db.prepare("INSERT INTO meetings117(id,day,time,place,attendees,notes,author_id,author_name,editor_id,editor_name,created_at,updated_at) VALUES(?,'2026-10-20','09:00','工作區','[]','[]',1,'主管',1,'主管','2026-10-20T01:00:00Z','2026-10-20T01:00:00Z')").run(id);
 const employee=id=>({id,name:db.prepare('SELECT name FROM employees WHERE id=?').get(id)?.name,status:'active',role:'viewer',permissions:[]});
 const call=(id='m',person=2,method='GET',input=null,origin='https://test.local')=>meetingAttendanceApi132(new Request('https://test.local/api/meeting-attendance132'+(method==='GET'?'?id='+id:''),{method,headers:{origin,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(input||{id})}:{})}),{DB},person===null?null:employee(person));
 return {db,DB,add,meeting,employee,call};
}
test('new meeting snapshots all active human accounts, including absentees, with greenfield empty reads',async()=>{
 const f=fixture();f.meeting();const r=await f.call(),d=await r.json();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(d.legacy,false);assert.deepEqual(d.people.map(p=>p.id),[1,2,3]);assert.ok(d.people.every(p=>p.firstReadAt===''));assert.equal(f.db.prepare('SELECT count(*) n FROM meeting_attendance_excluded132').get().n,2);
});
test('GET never signs; POST signs only the authenticated account once with server time, across repeat requests',async()=>{
 const f=fixture();f.meeting();await f.call();assert.equal(f.db.prepare("SELECT count(*) n FROM meeting_attendance_people132 WHERE first_read_at<>''").get().n,0);
 const first=await(await f.call('m',2,'POST')).json();assert.equal(first.registered,true);assert.match(first.firstReadAt,/^\d{4}-\d\d-\d\dT/);const again=await(await f.call('m',2,'POST')).json();assert.equal(again.firstReadAt,first.firstReadAt);
 assert.equal(f.db.prepare("SELECT count(*) n FROM meeting_attendance_people132 WHERE first_read_at<>''").get().n,1);assert.equal((await f.call('m',2,'POST',{id:'m',employee_id:3,firstReadAt:'2000'})).status,400);
});
test('new accounts never enter old snapshots; bot exclusions persist by ID after rename',async()=>{
 const f=fixture();f.meeting();f.add(7,'新員工');assert.equal((await(await f.call('m',7,'POST')).json()).registered,false);
 f.db.prepare("UPDATE employees SET name='重新命名的測試帳號' WHERE id=5").run();f.meeting('second');assert.deepEqual((await(await f.call('second')).json()).people.map(p=>p.id),[1,2,3,7]);assert.equal((await(await f.call('m',5,'POST')).json()).registered,false);
});
test('editing a meeting neither resets receipts nor changes audience, revision or notification stores',async()=>{
 const f=fixture();f.meeting();await f.call('m',2,'POST');const before=f.db.prepare('SELECT first_read_at FROM meeting_attendance_people132 WHERE employee_id=2').get().first_read_at;
 f.db.prepare("UPDATE meetings117 SET notes='[{\"content\":\"新內容\"}]',revision=2 WHERE id='m'").run();f.add(7,'新員工');await f.call('m',2,'POST');assert.equal(f.db.prepare('SELECT first_read_at FROM meeting_attendance_people132 WHERE employee_id=2').get().first_read_at,before);assert.equal((await(await f.call()).json()).people.length,3);assert.equal(f.db.prepare('SELECT revision FROM meetings117').get().revision,2);assert.equal(f.db.prepare('SELECT count(*) n FROM meeting_events117').get().n,0);
});
test('legacy migration fixes current people without inventing history and remains idempotent',async()=>{
 const f=fixture();f.meeting();f.db.exec('DROP TRIGGER meeting_attendance_snapshot132;DELETE FROM meeting_attendance_people132;DELETE FROM meeting_attendance_groups132;DELETE FROM meeting_attendance_meta132;');f.db.exec(migration);
 let data=await(await f.call()).json();assert.equal(data.legacy,true);assert.ok(data.people.every(p=>!p.firstReadAt));f.add(7,'後來新增');f.db.exec(migration);data=await(await f.call()).json();assert.deepEqual(data.people.map(p=>p.id),[1,2,3]);await f.call('m',2,'POST');assert.ok((await(await f.call()).json()).people.find(p=>p.id===2).firstReadAt);
});
test('meeting transaction rollback rolls back the entire audience snapshot; old-client inserts are protected',async()=>{
 const f=fixture();f.db.exec('BEGIN');f.meeting('rollback');f.db.exec('ROLLBACK');assert.equal(f.db.prepare("SELECT count(*) n FROM meeting_attendance_people132 WHERE meeting_id='rollback'").get().n,0);assert.equal(f.db.prepare("SELECT count(*) n FROM meeting_attendance_groups132 WHERE meeting_id='rollback'").get().n,0);
 f.meeting('old-client');assert.equal((await(await f.call('old-client')).json()).people.length,3);
});
test('attendance rejects anonymous, cross-origin, oversized and deleted-record writes',async()=>{
 const f=fixture();f.meeting();assert.equal((await f.call('m',null)).status,401);assert.equal((await f.call('m',2,'POST',null,'https://evil.local')).status,403);assert.equal((await f.call('m',2,'POST',{id:'x'.repeat(3000)})).status,413);assert.equal((await f.call('missing')).status,404);
 f.db.prepare("UPDATE meetings117 SET deleted_at='now' WHERE id='m'").run();assert.equal((await f.call('m',2,'POST')).status,404);assert.equal((await f.call()).status,404);
});
function frontend(){
 const labels={tab:'週會紀錄'},c={meetingLabelDefaults126:labels,scheduleTextSections63:{週會紀錄:[]},uiCatalogue44:{schedule:[]},meetingTextValue117:k=>labels[k],meetingRead120(){},currentUser:{id:1},document:{documentElement:{dataset:{}},querySelectorAll:()=>[]},navigator:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:1},location:{origin:'https://test.local'},URL,encodeURIComponent};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../dist/meeting-attendance132.js',import.meta.url),'utf8'),c);return c;
}
test('copy reminder includes only unread names and returns no reminder when everyone has read',()=>{
 const c=frontend();c.data={id:'m',day:'2026-10-20',people:[{name:'甲',firstReadAt:'now'},{name:'乙',firstReadAt:''}]};const s=vm.runInContext('attendanceReminder132(data)',c);assert.match(s,/2026\/10\/20 週會紀錄/);assert.match(s,/尚未簽到：乙/);assert.doesNotMatch(s,/甲/);c.data.people[1].firstReadAt='now';assert.equal(vm.runInContext('attendanceReminder132(data)',c),'');assert.ok(c.scheduleTextSections63.週會紀錄.includes('週會：簽到名單'));
});
test('LINE shares encoded reminder through official mobile or desktop chooser, never group auto-send',()=>{
 const c=frontend();c.data={id:'m&a',day:'2026-10-20',people:[{name:'乙&丙',firstReadAt:''}]};let u=new URL(vm.runInContext('attendanceShareURL132(data,attendanceReminder132(data))',c));assert.equal(u.origin,'https://line.me');assert.equal(u.pathname,'/R/share');assert.match(u.searchParams.get('text'),/乙&丙/);
 c.navigator.userAgent='Windows';c.navigator.platform='Win32';c.navigator.maxTouchPoints=0;u=new URL(vm.runInContext('attendanceShareURL132(data,attendanceReminder132(data))',c));assert.equal(u.origin,'https://social-plugins.line.me');assert.equal(new URL(u.searchParams.get('url')).searchParams.get('notificationMeeting'),'m&a');
});
test('navigation swaps only schedule and QC positions and keeps hash routes and visibility',()=>{
 const nav=fs.readFileSync(new URL('../dist/navigation.js',import.meta.url),'utf8');const qc=fs.readFileSync(new URL('../dist/enhancements-v124.js',import.meta.url),'utf8');
 const c={siteText:k=>k,config:()=>({pages:[]}),canDo:()=>true,qcCanUI124:()=>true,location:{hash:'#schedule'}};vm.createContext(c);vm.runInContext(nav.slice(0,nav.indexOf('function navigateManagement')),c);vm.runInContext(qc.slice(qc.indexOf('const pagesBeforeQC124='),qc.indexOf('const renderBeforeQC124=')),c);
 assert.deepEqual(Array.from(vm.runInContext('managementPages().map(p=>p.id)',c)),['cases','warehouse','plating','wire','schedule','qc','audit']);assert.equal(vm.runInContext('activeManagementPage().id',c),'schedule');c.location.hash='#qc';assert.equal(vm.runInContext('activeManagementPage().id',c),'qc');c.qcCanUI124=()=>false;assert.equal(vm.runInContext("managementPages().some(p=>p.id==='qc')",c),false);
});
