import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {meetingApi117,meetingDefaults117} from '../worker/meetings117.mjs';
import {meetingAttendanceApi132} from '../worker/meeting-attendance132.mjs';
function fixture(){
 const {db,DB}=database();migrations85(db);
 for(const [id,name,status] of [[1,'主管','active'],[2,'甲員工','active'],[3,'測試二號','active'],[4,'機器人一號','active'],[5,'停用員工','disabled']])db.prepare('INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,'u'+id,id+'@local.test',name,id===1?'supervisor':'viewer',status,'now','now');
 const boss={id:1,name:'主管',status:'active',role:'supervisor',permissions:['admin.settings']},viewer={id:2,name:'甲員工',status:'active',role:'viewer',permissions:[]};let sends=0;
 const request=(query,input=null,origin='https://test.local')=>new Request('https://test.local/api/meetings'+query,{method:input?'POST':'GET',headers:{origin,'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});
 const call=(query='',input=null,employee=boss,origin)=>meetingApi117(request(query,input,origin),{DB},employee,{dispatch:async()=>{sends++}});
 const settings=async()=>await(await call('?view=settings')).json();
 const save=async ids=>{const s=await settings();return call('?view=settings',{...s,attendanceIds:ids})};
 const create=async id=>call('',{id,requestId:crypto.randomUUID(),revision:0,day:'2026-10-20',time:'09:00',place:'工作區',attendeeIds:[1],notes:[{content:'工作',suggestion:''}]});
 const attendance=(id,person=viewer,mark=false)=>meetingAttendanceApi132(new Request('https://test.local/api/meeting-attendance132'+(mark?'':'?id='+id),{method:mark?'POST':'GET',headers:{origin:'https://test.local','Content-Type':'application/json'},...(mark?{body:JSON.stringify({id})}:{})}),{DB},person);
 const roster=async id=>(await(await attendance(id)).json()).people;
 const notificationState=()=>Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'notification_%' OR name LIKE 'push_%' OR name='meeting_events117') ORDER BY name").all().map(({name})=>[name,db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]));
 return {db,DB,boss,viewer,call,settings,save,create,attendance,roster,notificationState,sends:()=>sends};
}
test('13.3 admin settings expose independent audience defaults without changing current meetings on upgrade',async()=>{
 const f=fixture();await f.create('old');const s=await f.settings();assert.deepEqual(s.attendanceIds,['1','2','3']);assert.equal(s.attendanceConfigured,false);assert.equal(s.attendanceRevision,0);assert.deepEqual((await f.roster('old')).map(p=>p.id),[1,2,3]);assert.equal(s.recipientMode,'auto');assert.deepEqual(s.recipientIds,[]);
});
test('13.3 saving selected audience changes old and new rosters, never dispatches or modifies any notification table',async()=>{
 const f=fixture();await f.create('old');const before=f.notificationState(),sends=f.sends(),meeting=f.db.prepare('SELECT * FROM meetings117').get();assert.equal((await f.save(['1','2'])).status,200);
 assert.deepEqual((await f.roster('old')).map(p=>p.id),[1,2]);assert.deepEqual(f.notificationState(),before);assert.equal(f.sends(),sends);assert.deepEqual(f.db.prepare('SELECT * FROM meetings117').get(),meeting);
 await f.create('new');assert.deepEqual((await f.roster('new')).map(p=>p.id),[1,2]);assert.equal(f.db.prepare("SELECT count(*) n FROM meeting_events117 WHERE meeting_id='new'").get().n,4);
});
test('13.3 excluded signed account keeps its first read after removal and later re-selection',async()=>{
 const f=fixture();await f.create('m');const first=await(await f.attendance('m',f.viewer,true)).json();await f.save(['1']);assert.equal((await(await f.attendance('m',f.viewer,true)).json()).registered,false);assert.deepEqual((await f.roster('m')).map(p=>p.id),[1]);await f.save(['1','2']);assert.equal((await f.roster('m')).find(p=>p.id===2).firstReadAt,first.firstReadAt);
});
test('13.3 explicitly selected robot is allowed to sign; empty selection creates no expected readers',async()=>{
 const f=fixture();await f.create('m');await f.save(['4']);assert.deepEqual((await f.roster('m')).map(p=>p.name),['機器人一號']);assert.equal((await(await f.attendance('m',{id:4,status:'active'},true)).json()).registered,true);await f.save([]);assert.deepEqual(await f.roster('m'),[]);await f.create('new');assert.deepEqual(await f.roster('new'),[]);assert.deepEqual((await f.settings()).attendanceIds,[]);
});
test('13.3 new employees do not enter old or future selected audiences without an explicit selection',async()=>{
 const f=fixture();await f.create('old');await f.save(['1','2']);f.db.prepare("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(6,'u6','6@local.test','新員工','viewer','active','now','now')").run();await f.create('new');assert.deepEqual((await f.roster('new')).map(p=>p.id),[1,2]);await f.save(['1','2','6']);assert.deepEqual((await f.roster('old')).map(p=>p.id),[1,2,6]);
});
test('13.3 notification text saves and enable toggles do not rewrite attendance, old clients remain compatible',async()=>{
 const f=fixture();await f.create('m');let s=await f.settings();assert.equal((await f.call('?view=settings',{...s,title:'新版通知文字'})).status,200);assert.equal((await f.settings()).attendanceConfigured,false);await f.save(['2']);const reads=f.db.prepare('SELECT * FROM meeting_attendance_people132').all(),rev=(await f.settings()).attendanceRevision;
 s=await f.settings();assert.equal((await f.call('?view=settings',{...s,enabled:false})).status,200);assert.deepEqual(f.db.prepare('SELECT * FROM meeting_attendance_people132').all(),reads);assert.equal((await f.settings()).attendanceRevision,rev);
 s=await f.settings();assert.equal((await f.call('?view=settings',{...meetingDefaults117,revision:s.revision})).status,200);assert.equal((await f.settings()).attendanceRevision,rev);assert.deepEqual((await f.settings()).attendanceIds,['2']);
});
test('13.3 permissions, origin checks, stale revisions and invalid accounts cannot alter audience',async()=>{
 const f=fixture(),s=await f.settings();assert.equal((await f.call('?view=settings',null,f.viewer)).status,403);assert.equal((await f.call('?view=settings',{...s,attendanceIds:['1']},f.viewer)).status,403);assert.equal((await f.call('?view=settings',{...s,attendanceIds:['1']},f.boss,'https://evil.local')).status,403);
 for(const ids of [['99'],['5'],['1','1'],['01'],[null],[-1]])assert.equal((await f.save(ids)).status,400);
 assert.equal((await f.save(['2'])).status,200);assert.equal((await f.call('?view=settings',{...s,attendanceIds:['3']})).status,409);assert.deepEqual((await f.settings()).attendanceIds,['2']);
});
test('13.3 failed settings transaction rolls back audience, read flags, notification settings and audit together',async()=>{
 const f=fixture();await f.create('m');await f.attendance('m',f.viewer,true);const reads=f.db.prepare('SELECT * FROM meeting_attendance_people132').all(),before=f.notificationState();f.db.exec("CREATE TRIGGER fail_audit133 BEFORE INSERT ON state_records BEGIN SELECT RAISE(ABORT,'audit test failure'); END;");assert.equal((await f.save(['1'])).status,400);assert.deepEqual(f.db.prepare('SELECT * FROM meeting_attendance_people132').all(),reads);assert.deepEqual(f.notificationState(),before);assert.equal((await f.settings()).attendanceConfigured,false);assert.equal((await f.settings()).revision,0);
});
