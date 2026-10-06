import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import webpush from 'web-push';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {notificationValidRules103} from '../worker/notifications85.mjs';
import {notificationLogApi85,runNotifications85} from '../worker/server.mjs';

globalThis.fetch=async(_input,options)=>{const id=new Headers(options?.headers).get('authorization')?.slice(7);return Response.json({id,email:id+'@local.test'})};
const request=(path,body=null)=>new Request('https://local.test'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer boss',origin:'https://local.test',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});
const rule={id:'work103',enabled:true,type:'work',category:'工作排程',name:'每日工作提醒',title:'工作提醒',message:'{人員}：{工作清單}',time:'00:00',firstDays:0,repeatDays:0,target:'work-record',recipientMode:'auto',recipientIds:[]};
function fixture(rules=[rule]){
 const {db,DB}=database();migrations85(db);const now=new Date().toISOString();
 db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'boss','boss@local.test','主管','supervisor','active','now','now'),(2,'staff','staff@local.test','甲','viewer','active','now','now')");
 db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,0,?)').run('warehouse-main',JSON.stringify({projects:[],logs:[],notificationRules:rules}),now);
 db.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,assignee_ids,sort_index) VALUES('job103','daily',?,?,'測試工作','甲','','','[\"製作\"]',0,'','1','主管',?,?,0,'[\"2\"]',0)").run(day,day,now,now);
 db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('phone103',2,'https://fcm.googleapis.com/phone103','x','x','測試手機','test',1,now,now,now);
 const keys=webpush.generateVAPIDKeys(),env={DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test',VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'};return{db,env};
}

test('10.3v isolates an invalid stored rule and still runs valid automatic notifications',async()=>{
 const bad={...rule,id:'bad103',time:'錯誤'},invalid=[];assert.deepEqual(notificationValidRules103([bad,rule],(item)=>invalid.push(item.id)).map(item=>item.id),['work103']);assert.deepEqual(invalid,['bad103']);
 const {env}=fixture([bad,rule]),original=webpush.sendNotification;let sent=0;webpush.sendNotification=async()=>{sent++};
 try{const result=await runNotifications85(env,new Date().toISOString());assert.equal(result.invalidRules,1);assert.equal(sent,1)}finally{webpush.sendNotification=original}
});

test('10.3v catch-up lists only missing messages, sends selected rows and never resends successful devices',async()=>{
 const {env}=fixture(),original=webpush.sendNotification;let sent=0;webpush.sendNotification=async()=>{sent++};
 try{
  let response=await notificationLogApi85(request('/api/notification-logs?catchup=work103'),env),data=await response.json();assert.equal(response.status,200);assert.equal(data.source,'自動排程缺漏');assert.equal(data.items.length,1);assert.equal(data.items[0].missingDevices,1);
  response=await notificationLogApi85(request('/api/notification-logs',{ruleId:'work103',selectionIds:[data.items[0].id]}),env);data=await response.json();assert.equal(response.status,200);assert.equal(data.source,'手動補發');assert.equal(data.sent,1);assert.equal(sent,1);
  data=await(await notificationLogApi85(request('/api/notification-logs?catchup=work103'),env)).json();assert.equal(data.items.length,0);
  const logs=await(await notificationLogApi85(request('/api/notification-logs'),env)).json();assert.equal(logs.items[0].source,'手動補發');
  await runNotifications85(env,new Date().toISOString());assert.equal(sent,1);
 }finally{webpush.sendNotification=original}
});

test('10.3v schedule controls are idempotent, entry resets to today and changed assets bypass cache',()=>{
 const v71=fs.readFileSync(new URL('../dist/enhancements-v71.js',import.meta.url),'utf8'),v73=fs.readFileSync(new URL('../dist/enhancements-v73.js',import.meta.url),'utf8'),v921=fs.readFileSync(new URL('../dist/enhancements-v921.js',import.meta.url),'utf8'),build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8');
 assert.match(v71,/data-schedule-text71/);assert.match(v71,/existing\.shift/);assert.match(v73,/scheduleAnchor56=new Date/);assert.match(v73,/old\.shift/);assert.match(v921,/今天目前沒有缺漏通知/);assert.match(v921,/selectionIds/);assert.match(v921,/material','holiday','closure','leave/);for(const pattern of [/enhancements-v71\.js\?v=103/,/enhancements-v73\.js\?v=103/,/enhancements-v921\.js\?v=103/,/enhancements-v921\.css\?v=103/])assert.match(build,pattern);
});
