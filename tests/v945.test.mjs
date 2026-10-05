import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {notificationTarget945,notificationPlan85,notificationBatchContent944} from '../worker/notifications85.mjs';
import {notificationResolveApi945} from '../worker/server.mjs';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
const rule={id:'rule-p',type:'plating',target:'plating-record'};
const old='/?notificationPlatingProject=p&notificationPlatingShipment=s#plating';
const resolve=(target,url=old,extra={})=>notificationTarget945([{...rule,target}],url,extra);
const params=value=>new URL(value,'https://test/').searchParams;
test('same old notification follows record, overview, pending and arbitrary current destination',()=>{
 assert.equal(params(resolve('plating-record').targetUrl).get('notificationPlatingShipment'),'s');
 assert.equal(params(resolve('plating-overview').targetUrl).get('notificationPlatingOverview'),'all');
 assert.equal(params(resolve('plating-pending').targetUrl).get('notificationPlatingOverview'),'pending');
 assert.equal(resolve('warehouse').targetUrl,'/#warehouse');assert.equal(resolve('home').targetUrl,'/');
 assert.equal(params(resolve('plating-record').targetUrl).get('notificationPlatingShipment'),'s');
});
test('new notification retains original record even when originally sent to overview',()=>{
 const plans=notificationPlan85([{...rule,target:'plating-overview',enabled:true,recipientMode:'selected',recipientIds:['1'],time:'00:00',firstDays:0,repeatDays:0}],{platingProjects:[{id:'p',shipments:[{id:'s',sent:'2026-10-01'}]}]},[],[],[{id:1,name:'人員'}],'2026-10-05T01:00:00Z');
 assert.equal(params(plans[0].targetUrl).get('notificationEvent945'),'p:s');
 assert.equal(params(resolve('plating-record',plans[0].targetUrl).targetUrl).get('notificationPlatingShipment'),'s');
});
test('source identity isolates multiple rules of the same type and recovers historical single record',()=>{
 const rules=[{...rule,target:'plating-pending'},{id:'other',type:'plating',target:'plating-overview'}];
 assert.equal(params(notificationTarget945(rules,old,{sourceKey:'auto:rule-p:1:p:s:once'}).targetUrl).get('notificationPlatingOverview'),'pending');
 assert.equal(params(resolve('plating-record','/#plating',{sourceKey:'auto:rule-p:1:p:s:once'}).targetUrl).get('notificationPlatingShipment'),'s');
 const ambiguous=notificationTarget945(rules,'/#plating');assert.match(ambiguous.notice,/無法辨識/);assert.equal(params(ambiguous.targetUrl).get('notificationPlatingOverview'),'all');
});
test('recordless legacy and batches fall back to overview without fabricating a record',()=>{
 for(const context of [{},{sourceKey:'batch:rule-p:1:2026-10-05:hash'},{sourceKey:'auto:rule-p:1:plating:legacy:hash:once'}]){const result=resolve('plating-record','/#plating',context);assert.equal(params(result.targetUrl).get('notificationPlatingOverview'),'all');assert.match(result.notice,/沒有指定紀錄/);}
});
test('wire aggregation honors rule destination and keeps criteria for list navigation',()=>{
 const w={id:'w',type:'wire',target:'warehouse',enabled:true,recipientMode:'selected',recipientIds:['1'],time:'00:00',firstDays:0,repeatDays:1,message:'{數量}筆'};
 const plans=notificationPlan85([w],{wireReels:[{id:'r',status:'low',restock:{id:'round',reported:{time:'2026-10-01'}}}]},[],[],[{id:1}],'2026-10-05T01:00:00Z');
 assert.equal(new URL(notificationBatchContent944(plans).targetUrl,'https://test/').hash,'#warehouse');
 const original='/?notificationSection=restock&notificationWireCriteria='+encodeURIComponent(JSON.stringify({day:'2026-10-05',firstDays:0,repeatDays:1}))+'#wire';
 assert.equal(notificationTarget945([w],original).targetUrl,'/#warehouse');
 assert.ok(params(notificationTarget945([{...w,target:'wire-restock'}],original).targetUrl).has('notificationWireCriteria'));
});
globalThis.fetch=async(_input,options)=>{const id=new Headers(options.headers).get('authorization')?.slice(7);return Response.json({id,email:id+'@local.test'})};
function fixture(){const {db,DB}=database();migrations85(db);db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'boss','boss@local.test','主管','supervisor','active','now','now')");db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,?,?)').run('warehouse-main',JSON.stringify({projects:[],logs:[],notificationRules:[rule]}),1,'now');return{db,env:{DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test'}};}
const request=q=>new Request('https://local.test/api/notification-resolve945?'+new URLSearchParams(q),{headers:{Authorization:'Bearer boss'}});
test('authenticated inbox lookup reads current persisted setting each click and rejects another employee inbox',async()=>{
 const {db,env}=fixture();db.prepare('INSERT INTO notification_inbox88(id,employee_id,category,title,message,target_url,source_key,created_at) VALUES(?,?,?,?,?,?,?,?)').run('i',1,'電鍍','提醒','內容',old,'auto:rule-p:1:p:s:once','now');
 await notificationResolveApi945(request({inbox:'i'}),env);
 for(const target of ['plating-overview','plating-pending','plating-record','warehouse']){db.prepare('UPDATE state_records SET body=? WHERE record_key=?').run(JSON.stringify([{...rule,target}]),JSON.stringify(['root','notificationRules']));const r=await notificationResolveApi945(request({inbox:'i'}),env);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).targetUrl,resolve(target).targetUrl);}
 db.prepare('UPDATE notification_inbox88 SET employee_id=2').run();assert.equal((await notificationResolveApi945(request({inbox:'i'}),env)).status,404);
 assert.equal((await notificationResolveApi945(new Request('https://local.test/api/notification-resolve945'),env)).status,401);
});
test('old device push tag resolves its exact delivery rule and original record',async()=>{
 const {db,env}=fixture();db.prepare('INSERT INTO notification_deliveries(id,employee_id,subscription_id,notification_type,rule_id,title,message,target_url,dedupe_key,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run('d',1,'device','plating','rule-p','提醒','內容','/#plating','auto:rule-p:1:p:s:once:device','now');
 const response=await notificationResolveApi945(request({tag:'auto:rule-p:1:p:s:once:device'}),env);assert.equal(response.status,200,await response.clone().text());assert.equal(params((await response.json()).targetUrl).get('notificationPlatingShipment'),'s');
 assert.equal((await notificationResolveApi945(request({tag:'other'}),env)).status,404);
 assert.equal((await notificationResolveApi945(request({url:'//evil.test/'}),env)).status,400);
});
test('service worker marks old notification clicks and preserves original tag',async()=>{
 const handlers={},navigated=[];let waiting;
 const ctx={URL,self:{location:{origin:'https://local.test'},addEventListener:(k,v)=>handlers[k]=v},clients:{matchAll:async()=>[{focus:async()=>{},navigate:async x=>navigated.push(x)}]}};
 vm.runInNewContext(fs.readFileSync('dist/sw.js','utf8'),ctx);
 handlers.notificationclick({notification:{data:{url:'/#plating'},tag:'old-tag',close(){}},waitUntil:p=>waiting=p});await waiting;
 assert.equal(params(navigated[0]).get('notificationTag945'),'old-tag');assert.equal(params(navigated[0]).get('notificationResolve945'),'1');
});
