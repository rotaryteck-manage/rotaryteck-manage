import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import webpush from 'web-push';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {notificationPlan85} from '../worker/notifications85.mjs';
import {notificationExportApi92,notificationLogApi85,runNotifications85} from '../worker/server.mjs';

globalThis.fetch=async(_input,options)=>{const id=new Headers(options?.headers).get('authorization')?.slice(7);return Response.json({id,email:id+'@local.test'})};
const request=(path,body=null,method=body?'DELETE':'GET')=>new Request('https://local.test'+path,{method,headers:{Authorization:'Bearer boss',origin:'https://local.test',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
function fixture(){
 const {db,DB}=database();migrations85(db);
 db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'boss','boss@local.test','主管','supervisor','active','now','now'),(2,'two','two@local.test','甲','viewer','active','now','now'),(3,'three','three@local.test','乙','viewer','active','now','now')");
 return{db,env:{DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test'}};
}
const rule={id:'work',enabled:true,type:'work',category:'工作排程',name:'每日提醒',title:'工作提醒',message:'{人員}：{工作清單}',time:'08:50',firstDays:0,repeatDays:0,target:'work-record',recipientMode:'auto',recipientIds:[]};
const entry=(id,person,title='FAA')=>({id,kind:'daily',day:'2026-10-03',end_day:'2026-10-03',title,assignee_ids:'["'+person+'"]',category:'["製作"]'});

test('v92.1 work dedupe stays stable when work text or item count changes',()=>{
 const people=[{id:2,name:'甲',enabled:1}];
 const a=notificationPlan85([rule],{},[entry('a',2)],[],people,'2026-10-03T01:00:00Z')[0];
 const b=notificationPlan85([rule],{},[entry('a',2,'新名稱'),entry('b',2)],[],people,'2026-10-03T04:00:00Z')[0];
 assert.equal(a.dedupeKey,b.dedupeKey);assert.notEqual(a.message,b.message);
});

test('v92.1 adding an assignee after the first due run does not retroactively send',async()=>{
 const {db,env}=fixture(),keys=webpush.generateVAPIDKeys(),now='2026-10-03T01:00:00.000Z';
 Object.assign(env,{VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'});
 for(const id of [2,3])db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('d'+id,id,'https://fcm.googleapis.com/d'+id,'x','x','手機'+id,'test',1,now,now,now);
 db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,0,?)').run('warehouse-main',JSON.stringify({projects:[],logs:[],notificationRules:[rule]}),now);
 db.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,assignee_ids,sort_index) VALUES('a','daily','2026-10-03','2026-10-03','FAA','甲','','','[\"製作\"]',0,'','1','主管',?,?,0,'[\"2\"]',0)").run(now,now);
 const sent=[],original=webpush.sendNotification;webpush.sendNotification=async subscription=>sent.push(subscription.endpoint);
 try{await runNotifications85(env,'2026-10-03T01:00:00Z');db.prepare("UPDATE schedule_entries SET assignee_ids='[\"2\",\"3\"]'").run();await runNotifications85(env,'2026-10-03T04:00:00Z');assert.deepEqual(sent,['https://fcm.googleapis.com/d2'])}finally{webpush.sendNotification=original}
});

test('v92.1 deleting visible logs retains durable anti-duplicate receipts',async()=>{
 const {db,env}=fixture(),now='2026-10-03T01:00:00Z';
 db.prepare("INSERT INTO notification_deliveries(id,employee_id,notification_type,title,message,status,dedupe_key,created_at,sent_at) VALUES('x',2,'work','工作','內容','sent','same',?,?)").run(now,now);
 db.prepare("INSERT INTO notification_receipts921(dedupe_key,status,attempts,created_at,updated_at,completed_at) VALUES('same','sent',1,?,?,?)").run(now,now,now);
 const response=await notificationLogApi85(request('/api/notification-logs',{scope:'all'}),env);assert.equal(response.status,200);assert.equal(db.prepare('SELECT count(*) n FROM notification_deliveries').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM notification_receipts921').get().n,1);
});

test('v92.1 export rejects normalized impossible dates',async()=>{const {env}=fixture();const response=await notificationExportApi92(request('/api/notification-logs?export=1&from=2026-02-31&to=2026-03-02'),env);assert.equal(response.status,400)});

test('v92.1 migration and assets include reliability controls',()=>{
 const sql=fs.readFileSync(new URL('../drizzle/0023_notifications921.sql',import.meta.url),'utf8'),js=fs.readFileSync(new URL('../dist/enhancements-v921.js',import.meta.url),'utf8'),server=fs.readFileSync(new URL('../worker/server.mjs',import.meta.url),'utf8'),cloud=fs.readFileSync(new URL('../dist/cloud.js',import.meta.url),'utf8'),build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8');
 for(const pattern of [/notification_receipts921/,/notification_daily_usage921/,/notification_rule_run921/])assert.match(sql,pattern);
 assert.match(js,/今日通知額度/);assert.match(js,/notification-test-devices921/);assert.match(server,/failure_count[\s\S]{0,80}>=5/);assert.match(cloud,/伺服器回傳/);assert.match(build,/enhancements-v921\.js/);
});
