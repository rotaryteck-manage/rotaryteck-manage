import test from 'node:test';
import assert from 'node:assert/strict';
import webpush from 'web-push';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {runScheduledNotifications108,notificationCheckApi94} from '../worker/server.mjs';

const day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});
const rule={id:'work115',enabled:true,type:'work',category:'工作排程',name:'每日工作提醒',title:'工作提醒',message:'{人員}：{工作清單}',time:'00:00',firstDays:0,repeatDays:0,target:'work-record',recipientMode:'auto',recipientIds:[]};
function fixture(){
 const {db,DB}=database();migrations85(db);const now=new Date().toISOString();
 const keys=webpush.generateVAPIDKeys(),env={DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test',VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'};
 db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,0,?)').run('warehouse-main',JSON.stringify({projects:[],logs:[],notificationRules:[rule]}),now);
 for(let id=1;id<=7;id++){
  db.prepare('INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,'u'+id,'u'+id+'@local.test','人員'+id,id===1?'supervisor':'viewer','active',now,now);
  db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('d'+id,id,'https://fcm.googleapis.com/d'+id,'x','x','手機'+id,'test',1,now,now,now);
 }
 db.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,assignee_ids,sort_index) VALUES('j115','daily',?,?,'今日工作','','','','[]',0,'','1','人員1',?,?,0,'[1,2,3,4,5,6,7]',0)").run(day,day,now,now);
 return{db,env};
}

test('11.5v automatic seven-person reminder finishes and never resends a delivered message',async()=>{
 const {db,env}=fixture(),old=webpush.sendNotification;let sends=0;
 let requests=0;const raw=env.DB;env.DB={prepare(sql){const p=raw.prepare(sql);const wrap=s=>({bind:(...args)=>wrap(s.bind(...args)),execute:()=>s.execute(),first:()=>{requests++;return s.first()},all:()=>{requests++;return s.all()},run:()=>{requests++;return s.run()}});return wrap(p)},batch:statements=>{requests++;return raw.batch(statements)}};
 webpush.sendNotification=async()=>{sends++};
 try{
  const result=await runScheduledNotifications108(env,Date.now());
  assert.equal(result.sent,7);assert.equal(sends,7);
  assert.ok(requests<=43,'七人冷啟動資料庫呼叫應不超過43次：'+requests);
  assert.equal(db.prepare('SELECT status FROM notification_scheduler_status108 WHERE id=1').get().status,'ok');
  await runScheduledNotifications108(env,Date.now());assert.equal(sends,7);
 }finally{webpush.sendNotification=old}
});

globalThis.fetch=async(_input,options)=>{const id=new Headers(options?.headers).get('authorization')?.slice(7);return Response.json({id,email:id+'@local.test'})};
const request=()=>new Request('https://local.test/api/notification-check94',{headers:{Authorization:'Bearer u1'}});

test('11.5v existing work without a sent delivery is pending, not no-match',async()=>{
 const {db,env}=fixture();const result=await(await notificationCheckApi94(request(),env)).json();
 assert.equal(result.items[0].planned,7);assert.equal(result.items[0].status,'check-failed');
 // A recent successful cron must not imply there are no jobs.
 db.prepare("INSERT INTO notification_scheduler_status108(id,scheduled_for,started_at,completed_at,status) VALUES(1,?,?,?,'ok')").run(new Date().toISOString(),new Date().toISOString(),new Date().toISOString());
 const updated=await(await notificationCheckApi94(request(),env)).json();assert.equal(updated.items[0].status,'pending');
});

test('11.5v an expired running check uses its own start time, not an old completion',async()=>{
 const {db,env}=fixture(),old=new Date(Date.now()-90000).toISOString(),recent=new Date().toISOString();
 db.prepare("INSERT INTO notification_scheduler_status108(id,scheduled_for,started_at,completed_at,status) VALUES(1,?,?,?,'running')").run(old,old,recent);
 db.prepare("INSERT INTO notification_diagnostics115(id,run_id,scheduled_for,phase,updated_at,details) VALUES(1,'run',?,'發送當日通知',?,'{}')").run(old,old);
 const result=await(await notificationCheckApi94(request(),env)).json();assert.equal(result.scheduler.status,'failed');assert.match(result.scheduler.error_message,/發送當日通知/);
});

test('11.5v empty first-run lists are explained without backfilling newly assigned people',async()=>{
 const {db,env}=fixture(),now=new Date().toISOString();
 db.prepare("INSERT INTO notification_rule_run921(rule_id,day,eligible_ids,checked_at) VALUES(?,?,'[]',?)").run(rule.id,day,now);
 db.prepare("INSERT INTO notification_scheduler_status108(id,scheduled_for,started_at,completed_at,status) VALUES(1,?,?,?,'ok')").run(now,now,now);
 const result=await(await notificationCheckApi94(request(),env)).json();assert.equal(result.items[0].status,'initial-blocked');
 const old=webpush.sendNotification;let sends=0;webpush.sendNotification=async()=>{sends++};
 try{await runScheduledNotifications108(env,Date.now());assert.equal(sends,0)}finally{webpush.sendNotification=old}
});

test('11.5v stopped people and revoked schedule permissions still cannot receive automatic reminders',async()=>{
 const {db,env}=fixture();db.prepare("INSERT INTO notification_people(employee_id,enabled,updated_at) VALUES(2,0,'now')").run();
 db.prepare("INSERT INTO app_permission_profiles(id,name,permissions) VALUES('no115','不可查看排程','[]')").run();
 db.prepare("INSERT INTO app_employee_settings(employee_id,profile_id) VALUES(3,'no115')").run();
 const original=webpush.sendNotification,sent=[];webpush.sendNotification=async subscription=>sent.push(subscription.endpoint);
 try{await runScheduledNotifications108(env,Date.now());assert.equal(sent.length,5);assert.ok(!sent.includes('https://fcm.googleapis.com/d2'));assert.ok(!sent.includes('https://fcm.googleapis.com/d3'))}finally{webpush.sendNotification=original}
});

test('11.5v automatic checks use current separated storage instead of stale legacy settings',async()=>{
 const {db,env}=fixture();await notificationCheckApi94(request(),env);
 db.prepare("UPDATE company_state SET body=? WHERE company_id='warehouse-main'").run(JSON.stringify({notificationRules:[]}));
 const original=webpush.sendNotification;let sent=0;webpush.sendNotification=async()=>{sent++};
 try{const result=await runScheduledNotifications108(env,Date.now());assert.equal(result.planned,7);assert.equal(sent,7)}finally{webpush.sendNotification=original}
});

test('11.5v no enabled device is distinguishable from no daily work',async()=>{
 const {db,env}=fixture(),now=new Date().toISOString();db.prepare('UPDATE push_subscriptions SET enabled=0').run();
 db.prepare("INSERT INTO notification_scheduler_status108(id,scheduled_for,started_at,completed_at,status) VALUES(1,?,?,?,'ok')").run(now,now,now);
 const result=await(await notificationCheckApi94(request(),env)).json();assert.equal(result.items[0].status,'no-device');assert.equal(result.items[0].planned,7);
});

test('11.5v a failed push is recorded and automatically retried without resending successful devices',async()=>{
 const {db,env}=fixture(),original=webpush.sendNotification;let fail=true;const sends=[];
 webpush.sendNotification=async subscription=>{if(fail&&subscription.endpoint.endsWith('/d2'))throw Error('暫時連線失敗');sends.push(subscription.endpoint)};
 try{
  const first=await runScheduledNotifications108(env,Date.now());assert.equal(first.failed,1);assert.equal(first.sent,6);
  fail=false;await runScheduledNotifications108(env,Date.now());assert.equal(sends.length,7);assert.equal(sends.filter(s=>s.endsWith('/d1')).length,1);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM notification_deliveries WHERE status='sent'").get().n,7);
 }finally{webpush.sendNotification=original}
});
