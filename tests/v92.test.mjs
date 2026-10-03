import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import webpush from 'web-push';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {notificationPlan85} from '../worker/notifications85.mjs';
import {notificationLogApi85,pushTestApi82} from '../worker/server.mjs';

globalThis.fetch=async(_input,options)=>{const id=new Headers(options.headers).get('authorization')?.slice(7);return Response.json({id,email:id+'@local.test'})};
const request=(path,body=null,method=body?'POST':'GET')=>new Request('https://local.test'+path,{method,headers:{Authorization:'Bearer boss',origin:'https://local.test',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
function fixture(){const {db,DB}=database();migrations85(db);db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'boss','boss@local.test','主管','supervisor','active','now','now')");return{db,env:{DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test'}}}
const base={enabled:true,category:'提醒',name:'提醒',title:'{通知名稱}',message:'共有 {數量} 筆：{線材名稱}{電鍍內容}',time:'09:00',firstDays:0,repeatDays:0,recipientMode:'selected',recipientIds:['1','2','3']};

test('v92 summarizes eleven wire records to one logical notification per recipient',()=>{
 const rule={...base,id:'wire',type:'wire',target:'wire-restock'},people=[1,2,3].map(id=>({id,name:'人'+id,enabled:1})),state={wireTypes:[{id:'t',name:'UL線'}],wireReels:Array.from({length:11},(_,i)=>({id:'r'+i,wireId:'t',status:'low',restock:{id:'s'+i,reported:{time:'2026-10-01'}}}))};
 const plans=notificationPlan85([rule],state,[],[],people,'2026-10-03T01:01:00Z');assert.equal(plans.length,3);assert.deepEqual(plans.map(plan=>plan.eventCount),[11,11,11]);assert.ok(plans.every(plan=>plan.message.includes('共有 11 筆')));
});

test('v92 summarizes plating and puts work and report before bulk reminders',()=>{
 const people=[{id:1,name:'人1',enabled:1}],wire={...base,id:'wire',type:'wire',target:'wire-restock',recipientIds:['1']},plating={...base,id:'plating',type:'plating',target:'plating-record',recipientIds:['1']},work={...base,id:'work',type:'work',target:'work-record',recipientMode:'auto',recipientIds:[],message:'{工作清單}'},state={wireTypes:[{id:'t',name:'線'}],wireReels:[{id:'r',wireId:'t',status:'low',restock:{id:'s',reported:{time:'2026-10-01'}}}],platingProjects:[{id:'p',name:'FAA',shipments:[{id:'a',sent:'2026-10-01',returned:''},{id:'b',sent:'2026-10-01',returned:''}]}]},entries=[{id:'j',kind:'daily',day:'2026-10-03',end_day:'2026-10-03',title:'FAA',assignee_ids:'["1"]',category:'["製作"]'}];
 const plans=notificationPlan85([wire,plating,work],state,entries,[],people,'2026-10-03T01:01:00Z');assert.deepEqual(plans.map(plan=>plan.notificationType),['work','wire','plating']);assert.equal(plans.find(plan=>plan.notificationType==='plating').eventCount,2);
});

test('v92 groups three device deliveries into one administrator row',async()=>{
 const {db,env}=fixture(),now='2026-10-03T01:01:00.000Z';for(let i=1;i<=3;i++){db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('d'+i,1,'https://fcm.googleapis.com/d'+i,'x','x','裝置'+i,'test',1,now,now,now);db.prepare("INSERT INTO notification_deliveries(id,employee_id,subscription_id,notification_type,title,message,status,dedupe_key,created_at,sent_at) VALUES(?,?,?,?,?,?,'sent',?,?,?)").run('n'+i,1,'d'+i,'wire','線材提醒','11筆','auto:wire:1:summary:d'+i,now,now)}
 const data=await(await notificationLogApi85(request('/api/notification-logs'),env)).json();assert.equal(data.items.length,1);assert.equal(data.items[0].devices.length,3);assert.equal(data.items[0].sent,3);assert.equal(data.items[0].status,'sent');
});

test('v92 test sends are audited without entering the formal bell inbox',async()=>{
 const {db,env}=fixture(),keys=webpush.generateVAPIDKeys(),now=new Date().toISOString();Object.assign(env,{VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'});db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('d',1,'https://fcm.googleapis.com/d','x','x','手機','test',1,now,now,now);const original=webpush.sendNotification;webpush.sendNotification=async()=>{};try{const response=await pushTestApi82(request('/api/push-test',{employeeId:1,title:'測試預覽｜工作提醒',message:'內容',targetUrl:'/',confirmed:true}),env);assert.equal(response.status,200);assert.equal(db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM notification_test_audit92').get().n,1)}finally{webpush.sendNotification=original}
});

test('v92 assets expose grouped device results, Excel export, rename and test separation',()=>{
 const js=fs.readFileSync(new URL('../dist/enhancements-v92.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../dist/enhancements-v92.css',import.meta.url),'utf8'),build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8'),server=fs.readFileSync(new URL('../worker/server.mjs',import.meta.url),'utf8');for(const pattern of [/匯出通知紀錄/,/notification-device-results92/,/重新命名/,/XLSX\.writeFile/,/測試通知紀錄/])assert.match(js,pattern);assert.match(css,/notification-log-group92/);assert.match(build,/enhancements-v92\.js/);assert.match(server,/notification_test_audit92/);
});
