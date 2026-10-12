import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {meetingApiWithServices117,meetingDispatchWithServices117,scheduleApiWithLeaveNotifications102,runScheduledEvent116} from '../worker/server.mjs';
import {meetingApi117,meetingDefaults117,meetingSettings117,runMeetingNotifications117,validateMeetingSettings117} from '../worker/meetings117.mjs';
function fixture(){
 const {db,DB}=database();migrations85(db);const now=new Date().toISOString();
 for(const [id,name,role,status] of [[1,'主管','supervisor','active'],[2,'出席員工','viewer','active'],[3,'未出席員工','viewer','active'],[4,'停用員工','viewer','disabled']])db.prepare('INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,'user'+id,id+'@test.local',name,role,status,now,now);
 const env={DB},boss={id:1,name:'主管',status:'active',role:'supervisor',permissions:['admin.settings','schedule.view','schedule.daily.create','schedule.daily.edit','schedule.daily.delete','schedule.weekly.create','schedule.weekly.edit','schedule.weekly.delete','schedule.copy','schedule.reset']},viewer={id:3,name:'未出席員工',status:'active',role:'viewer',permissions:[]};const tasks=[],ctx={waitUntil(task){tasks.push(task)}};
 const call=(input=null,method='POST',query='',employee=boss)=>meetingApiWithServices117(new Request('https://test.local/api/meetings'+query,{method:input?method:'GET',headers:{origin:'https://test.local','Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{})}),env,employee,ctx);
 const input=(id='m117',revision=0)=>({id,requestId:crypto.randomUUID(),revision,day:'2026-10-12',time:'09:00',place:'會議室',attendeeIds:[1,2],notes:[{content:'FAA XX項目由(出席員工)負責製作，約2天完成。',suggestion:'無'},{content:'',suggestion:''}]});return{db,DB,env,boss,viewer,tasks,call,input};
}
function addDevice(f,id,person){const key=createECDH('prime256v1');key.generateKeys();f.db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,1,?,?,?)').run(id,person,'https://push.test/'+id,key.getPublicKey().toString('base64url'),randomBytes(16).toString('base64url'),'手機','test','now','now','now')}

test('11.7v first save atomically notifies every active account, including absentees, only once',async()=>{
 const f=fixture(),input=f.input();assert.equal((await f.call(input)).status,200);await Promise.all(f.tasks);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meetings117').get().n,1);assert.equal(JSON.parse(f.db.prepare('SELECT notes FROM meetings117').get().notes).length,1);
 assert.deepEqual(f.db.prepare('SELECT employee_id FROM notification_inbox88 ORDER BY employee_id').all().map(x=>x.employee_id),[1,2,3]);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meeting_events117').get().n,3);
 const duplicate=await (await f.call(input)).json();assert.equal(duplicate.already,true);
 const edit={...input,revision:1,requestId:crypto.randomUUID(),notes:[{content:'改為3天完成',suggestion:'缺料'}]};assert.equal((await f.call(edit)).status,200);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM notification_inbox88').get().n,3);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meeting_events117').get().n,3);
 const row=await (await f.call(null,'GET','?id=m117',f.viewer)).json();assert.equal(row.canEdit,false);assert.equal(row.item.editor_name,'主管');assert.equal(row.item.revision,2);assert.equal(row.item.notes[0].content,'改為3天完成');
 const logs=f.db.prepare("SELECT body FROM state_records WHERE json_extract(record_key,'$[0]')='log'").all().map(x=>JSON.parse(x.body));assert.equal(logs.length,2);assert.equal(logs[0].category,'meeting');assert.match(logs[1].detail,/2天完成.*→.*3天完成/);
});

test('11.7v server blocks staff writes, cross-origin writes, empty notes and invalid attendees',async()=>{
 const f=fixture();assert.equal((await f.call(f.input(),'POST','',f.viewer)).status,403);assert.equal((await f.call({...f.input(),notes:[{content:'',suggestion:'建議'}]})).status,400);assert.equal((await f.call({...f.input(),attendeeIds:[4]})).status,400);assert.equal((await f.call({...f.input(),time:'25:00'})).status,400);
 const response=await meetingApiWithServices117(new Request('https://test.local/api/meetings',{method:'POST',headers:{origin:'https://evil.local','Content-Type':'application/json'},body:JSON.stringify(f.input())}),f.env,f.boss,f.ctx);assert.equal(response.status,403);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meetings117').get().n,0);assert.equal((await f.call(null,'GET','?view=settings',f.viewer)).status,403);
});

test('11.7v pause/re-enable does not backfill, settings do not change existing rules, text templates are validated',async()=>{
 const f=fixture(),original=JSON.stringify([{id:'existing',type:'work',enabled:true}]);f.db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,0,?)').run('warehouse-main',JSON.stringify({projects:[],logs:[],notificationRules:JSON.parse(original)}),'now');
 const settings={...structuredClone(meetingDefaults117),revision:0,enabled:false};assert.equal((await f.call(settings,'POST','?view=settings')).status,200);assert.equal((await f.call(f.input())).status,200);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meeting_events117').get().n,0);
 assert.equal((await f.call({...settings,enabled:true,title:'{會議日期}週會',message:'{記錄人}｜{筆記數}則',revision:1},'POST','?view=settings')).status,200);await runScheduledEvent116({cron:'*/3 * * * *',scheduledTime:Date.now()},f.env,{waitUntil(){}});assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meeting_events117').get().n,0);
 assert.equal((await f.call({...f.input(),revision:1})).status,200);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meeting_events117').get().n,0);assert.equal(f.db.prepare("SELECT body FROM state_records WHERE record_key=?").get(JSON.stringify(['root','notificationRules'])).body,original);
 assert.throws(()=>validateMeetingSettings117({...settings,title:'{錯誤變數}'}),/變數/);assert.throws(()=>validateMeetingSettings117({...settings,text:{...settings.text,content:''}}),/文字/);
});

test('11.7v edits use optimistic concurrency; double first-save and competing edits cannot create duplicates',async()=>{
 const f=fixture(),input=f.input(),responses=await Promise.all([f.call(input),f.call(input)]);assert.ok(responses.every(r=>r.status===200));await Promise.all(f.tasks);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meeting_events117').get().n,3);
 const first={...input,revision:1,requestId:crypto.randomUUID(),place:'A'},second={...first,requestId:crypto.randomUUID(),place:'B'},edits=await Promise.all([f.call(first),f.call(second)]);assert.deepEqual(edits.map(r=>r.status).sort(),[200,409]);assert.equal(f.db.prepare('SELECT revision FROM meetings117').get().revision,2);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meeting_guards117').get().n,0);
 assert.equal((await f.call({...input,place:'不同內容'})).status,409);
});

test('11.7v deleted meetings are readable to neither old links nor edits; audit records keep original content',async()=>{
 const f=fixture();await f.call(f.input());await Promise.all(f.tasks);assert.equal((await f.call({id:'m117',revision:1,requestId:crypto.randomUUID()},'DELETE')).status,200);assert.equal((await f.call(null,'GET','?id=m117',f.viewer)).status,404);assert.equal((await f.call({...f.input(),revision:2})).status,404);
 const list=await (await f.call()).json();assert.equal(list.items.length,0);const log=f.db.prepare("SELECT body FROM state_records WHERE json_extract(body,'$.action')='刪除週會紀錄'").get();assert.match(log.body,/FAA/);
});

test('11.7v failed device retries use native push and never resend a successful device or newly added employee',async()=>{
 const f=fixture(),keys=webpush.generateVAPIDKeys();Object.assign(f.env,{VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'});addDevice(f,'good',2);addDevice(f,'bad',3);const originalFetch=globalThis.fetch,calls=[];let fail=true;
 globalThis.fetch=async (url,options)=>{if(String(url).endsWith('/api/meeting-dispatch117'))return meetingDispatchWithServices117(new Request(url,options),f.env);calls.push(String(url));return new Response(null,{status:String(url).endsWith('/bad')&&fail?503:201})};
 try{assert.equal((await f.call(f.input())).status,200);await Promise.all(f.tasks);assert.equal(calls.filter(x=>x.endsWith('/good')).length,1);assert.equal(f.db.prepare("SELECT status FROM notification_deliveries WHERE subscription_id='bad'").get().status,'failed');fail=false;
 f.db.prepare("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(5,'new','new@test.local','新員工','viewer','active','now','now')").run();addDevice(f,'new',5);
 await runScheduledEvent116({cron:'*/3 * * * *',scheduledTime:Date.now()},f.env,{waitUntil(){}});assert.equal(calls.filter(x=>x.endsWith('/good')).length,1);assert.equal(calls.filter(x=>x.endsWith('/bad')).length,2);assert.equal(calls.filter(x=>x.endsWith('/new')).length,0);assert.equal(f.db.prepare("SELECT status FROM notification_deliveries WHERE subscription_id='bad'").get().status,'sent');
 await runScheduledEvent116({cron:'*/3 * * * *',scheduledTime:Date.now()},f.env,{waitUntil(){}});assert.equal(calls.length,3);
 }finally{globalThis.fetch=originalFetch}
});

test('11.7v outbox claims are exclusive, can recover interruption, and cancellation prevents later sends',async()=>{
 const f=fixture();await meetingApi117(new Request('https://test.local/api/meetings',{method:'POST',headers:{origin:'https://test.local','Content-Type':'application/json'},body:JSON.stringify(f.input())}),f.env,f.boss,{ensureStorage:async()=>{f.db.exec("INSERT INTO state_storage_meta VALUES(1,0,0,'now')")}});let calls=0;const dispatch=async()=>{calls++;await new Promise(r=>setTimeout(r,5));return{sent:1,failed:0,deferred:0}};
 await Promise.all([runMeetingNotifications117(f.env,dispatch),runMeetingNotifications117(f.env,dispatch)]);assert.equal(calls,3);
 f.db.prepare("UPDATE meeting_events117 SET status='processing',updated_at='2000-01-01',attempts=0").run();await runMeetingNotifications117(f.env,dispatch);assert.equal(calls,6);
 f.db.prepare("UPDATE meeting_events117 SET status='pending'").run();f.db.prepare("INSERT INTO meeting_settings117 VALUES(1,?,1)").run(JSON.stringify({...meetingDefaults117,enabled:false}));await runMeetingNotifications117(f.env,dispatch);assert.equal(calls,6);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM meeting_events117 WHERE status='cancelled'").get().n,3);
});

test('11.7v daily and weekly writes, edits, deletion and copying enter the existing information archive',async()=>{
 const f=fixture(),send=payload=>scheduleApiWithLeaveNotifications102(new Request('https://test.local/api/schedule',{method:payload.method||'POST',headers:{origin:'https://test.local','Content-Type':'application/json'},body:JSON.stringify(payload)}),f.env,f.boss,{waitUntil(){}});
 const base={id:'daily117',kind:'daily',revision:0,day:'2026-10-12',endDay:'2026-10-12',title:'組裝',assignee:'["主管"]',color:'#4e8069',note:'測試',category:''};assert.equal((await send(base)).status,200);assert.equal((await send({...base,revision:1,note:'更新'})).status,200);assert.equal((await send({...base,method:'DELETE',revision:2})).status,200);
 const week={...base,id:'weekly117',kind:'weekly',day:'2026-10-05',endDay:'2026-10-09',assignee:'["主管"]'};assert.equal((await send(week)).status,200);assert.equal((await send({kind:'copy_week',weekStart:'2026-10-12'})).status,200);
 const logs=f.db.prepare("SELECT body FROM state_records WHERE json_extract(record_key,'$[0]')='log'").all().map(x=>JSON.parse(x.body));assert.equal(logs.filter(x=>x.category==='daily').length,3);assert.equal(logs.filter(x=>x.category==='weekly').length,2);assert.match(logs.find(x=>x.action==='修改每日排程').detail,/測試.*更新/);
});

test('11.7v new styles are scoped; first-save routing, fixed header and names do not alter existing form logic',()=>{
 const css=fs.readFileSync('dist/meetings117.css','utf8'),js=fs.readFileSync('dist/meetings117.js','utf8');assert.ok(css.split('}').filter(x=>x.includes('{')&&!x.includes('@media')).every(x=>x.includes('.meeting-')));assert.match(js,/notificationMeeting/);assert.match(js,/setRangeText\('\('\+person.name\+'\)'/);assert.match(js,/meeting-head-actions117/);assert.match(js,/meetingRefreshAllowedBefore117/);assert.match(js,/已停用/);
});

test('11.7v signed immediate background sends are authenticated and each recipient runs independently',async()=>{
 const f=fixture(),keys=webpush.generateVAPIDKeys();Object.assign(f.env,{VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'});for(let person=1;person<=3;person++){addDevice(f,'a'+person,person);addDevice(f,'b'+person,person)}
 const original=globalThis.fetch,requests=[],pushes=[];globalThis.fetch=async(url,options)=>{if(String(url).endsWith('/api/meeting-dispatch117')){requests.push({url,options});return meetingDispatchWithServices117(new Request(url,options),f.env)}pushes.push(url);return new Response(null,{status:201})};
 try{const input=f.input(),request=new Request('https://test.local/api/meetings',{method:'POST',headers:{origin:'https://test.local','Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal((await meetingApiWithServices117(request,f.env,f.boss,{waitUntil(t){f.tasks.push(t)}},true)).status,200);await Promise.all(f.tasks);assert.equal(requests.length,3);assert.equal(pushes.length,6);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM notification_deliveries WHERE status='sent'").get().n,6);
 const signed=JSON.parse(requests[0].options.body);assert.equal((await meetingDispatchWithServices117(new Request(requests[0].url,{...requests[0].options,body:JSON.stringify({...signed,key:'meeting117:forged:3'})}),f.env)).status,403);assert.equal((await meetingDispatchWithServices117(new Request(requests[0].url,{...requests[0].options,body:JSON.stringify({...signed,at:signed.at-120000})}),f.env)).status,403);
 await meetingDispatchWithServices117(new Request(requests[0].url,requests[0].options),f.env);assert.equal(pushes.length,6);
 }finally{globalThis.fetch=original}
});

test('11.7v first-save and each two-device background invocation fit the free 50-query budget',async()=>{
 const f=fixture(),keys=webpush.generateVAPIDKeys();Object.assign(f.env,{VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'});for(let person=1;person<=3;person++){addDevice(f,'q-a'+person,person);addDevice(f,'q-b'+person,person)}
 function counted(){let queries=0;const increment=n=>{queries+=n;assert.ok(queries<=50,'queries='+queries)};const DB={prepare(sql){const native=f.DB.prepare(sql);const wrap=stmt=>({bind(...args){return wrap(stmt.bind(...args))},first(){increment(1);return stmt.first()},all(){increment(1);return stmt.all()},run(){increment(1);return stmt.run()},execute(){return stmt.execute()}});return wrap(native)},batch(statements){increment(statements.length);return f.DB.batch(statements)}};return{env:{...f.env,DB},count:()=>queries}}
 const parent=counted(),children=[],original=globalThis.fetch;globalThis.fetch=async(url,options)=>{if(String(url).endsWith('/api/meeting-dispatch117')){const child=counted();const response=await meetingDispatchWithServices117(new Request(url,options),child.env);children.push(child.count());return response}return new Response(null,{status:201})};
 try{const input=f.input(),response=await meetingApiWithServices117(new Request('https://test.local/api/meetings',{method:'POST',headers:{origin:'https://test.local','Content-Type':'application/json'},body:JSON.stringify(input)}),parent.env,f.boss,{waitUntil(t){f.tasks.push(t)}},true);assert.equal(response.status,200);await Promise.all(f.tasks);assert.equal(children.length,3);assert.ok(parent.count()<=42);assert.ok(children.every(n=>n<=42));assert.equal(f.db.prepare("SELECT COUNT(*) n FROM notification_deliveries WHERE status='sent'").get().n,6);
 }finally{globalThis.fetch=original}
});
