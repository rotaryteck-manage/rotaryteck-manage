import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import worker,{notificationInboxApi88,pushTestApi82} from '../worker/server.mjs';
import {notificationPlan85,notificationRulesValid85} from '../worker/notifications85.mjs';

globalThis.fetch=async(_input,options)=>{const id=new Headers(options.headers).get('authorization')?.slice(7);return Response.json({id,email:id+'@local.test'});};
function fixture(){
 const {db,DB}=database();migrations85(db);
 db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'boss','boss@local.test','主管','supervisor','active','now','now'),(2,'staff','staff@local.test','甲','viewer','active','now','now'),(3,'store','store@local.test','倉管','warehouse','active','now','now')");
 db.prepare('INSERT INTO schedule_options(id,items,contents) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET items=excluded.items').run('["FAA"]','[]');
 return{db,env:{DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test',UPLOADS:{put:async()=>{},delete:async()=>{},list:async()=>({objects:[],truncated:false})}}};
}
const request=(path,{method='GET',body,user='staff'}={})=>new Request('https://local.test'+path,{method,headers:{Authorization:'Bearer '+user,origin:'https://local.test',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});

test('notification inbox is private to each employee and supports one or all read states',async()=>{
 const {db,env}=fixture();
 for(const row of [['a',2,'工作排程','工作提醒','FAA（製作）','2026-10-02T01:00:00Z'],['b',2,'料件紀錄','收料通知','FAA','2026-10-02T02:00:00Z'],['c',3,'其他','倉管通知','內容','2026-10-02T03:00:00Z']])db.prepare("INSERT INTO notification_inbox88(id,employee_id,category,title,message,target_url,source_key,created_at) VALUES(?,?,?,?,?,'/',?,?)").run(...row.slice(0,5),'source-'+row[0],row[5]);
 let response=await notificationInboxApi88(request('/api/notification-inbox'),env),data=await response.json();
 assert.equal(response.status,200);assert.equal(data.unread,2);assert.deepEqual(data.items.map(x=>x.id),['b','a']);
 response=await notificationInboxApi88(request('/api/notification-inbox',{method:'PATCH',body:{id:'b'}}),env);data=await response.json();assert.equal(data.unread,1);assert.equal(data.changed,1);
 response=await notificationInboxApi88(request('/api/notification-inbox',{method:'PATCH',body:{scope:'all'}}),env);data=await response.json();assert.equal(data.unread,0);assert.equal(data.changed,1);
 assert.equal(db.prepare("SELECT read_at FROM notification_inbox88 WHERE id='c'").get().read_at,'');
});

test('work and custom plans include useful content, category, dedupe key and exact-day deep link',()=>{
 const work={id:'work',enabled:true,type:'work',category:'工作排程',name:'每日提醒',title:'工作排程提醒',message:'{人員}今日工作：{工作清單}',time:'08:50',firstDays:0,repeatDays:0,target:'work-record',recipientMode:'auto',recipientIds:[]};
 const custom={id:'clean',enabled:true,type:'custom',category:'環境提醒',name:'打掃提醒',title:'打掃時間',message:'請完成今日打掃。',time:'09:00',startDate:'2026-10-02',firstDays:0,repeatDays:7,target:'home',recipientMode:'selected',recipientIds:['2']};
 notificationRulesValid85([work,custom]);
 const plans=notificationPlan85([work,custom],{},[{id:'j',kind:'daily',day:'2026-10-02',title:'FAA',category:'["製作"]',assignee_ids:'["2"]'}],[],[{id:2,name:'甲',enabled:1}],'2026-10-02T01:10:00Z');
 assert.equal(plans.length,2);const job=plans.find(x=>x.ruleId==='work'),reminder=plans.find(x=>x.ruleId==='clean');
 assert.equal(job.message,'甲今日工作：FAA（製作）');assert.match(job.targetUrl,/notificationDay=2026-10-02/);assert.equal(job.category,'工作排程');assert.match(job.dedupeKey,/auto:work:2/);
 assert.equal(reminder.title,'打掃時間');assert.equal(reminder.category,'環境提醒');
});

test('new material record creates an in-app notification for warehouse staff without notifying the actor',async()=>{
 const {db,env}=fixture(),form=new FormData();
 for(const [key,value] of Object.entries({id:'mat88',revision:'0',day:'2026-10-02',title:'螺絲',projectName:'FAA',category:'收料',quantity:'1'}))form.set(key,value);
 const response=await worker.fetch(new Request('https://local.test/api/schedule-material-upload',{method:'POST',headers:{Authorization:'Bearer boss',origin:'https://local.test'},body:form}),env);
 assert.equal(response.status,200);
 const rows=db.prepare('SELECT employee_id,category,title,message,target_url FROM notification_inbox88 ORDER BY employee_id').all();
 assert.equal(rows.length,1);assert.equal(rows[0].employee_id,3);assert.equal(rows[0].category,'料件紀錄');assert.match(rows[0].title,/收料/);assert.match(rows[0].message,/主管新增了 FAA/);assert.match(rows[0].target_url,/notificationMaterial=mat88/);
});

test('test notification rejects external-looking target paths',async()=>{
 const {env}=fixture();
 const response=await pushTestApi82(request('/api/push-test',{method:'POST',user:'boss',body:{employeeId:2,title:'測試',message:'內容',targetUrl:'//evil.example'}}),env);
 assert.equal(response.status,400);assert.match((await response.json()).error,/前往位置/);
});

test('v88 browser assets contain bell inbox, editable preview, categorized logs and compact schedule cards',()=>{
 const js=fs.readFileSync(new URL('../dist/enhancements-v88.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../dist/enhancements-v88.css',import.meta.url),'utf8'),build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8');
 for(const pattern of [/notification-bell88/,/notification-badge88/,/全部標示已讀/,/預覽並發送測試通知/,/value="all"/,/data-log-category88/,/自訂／定時提醒/,/schedule-card-toggle88/,/全選/,/儲存全部排程/,/notificationMaterial/])assert.match(js,pattern);
 for(const pattern of [/position:sticky/,/schedule-task-card88/,/schedule-choice88\.is-open88/,/notification-rule-form88/])assert.match(css,pattern);
 assert.match(build,/enhancements-v88\.js/);assert.match(build,/enhancements-v88\.css/);
});
