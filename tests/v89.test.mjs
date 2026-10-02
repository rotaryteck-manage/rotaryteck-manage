import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {notificationPlan85,notificationRulesValid85} from '../worker/notifications85.mjs';
import {cleanupNotificationInbox89} from '../worker/server.mjs';

const person={id:2,name:'甲',enabled:1};
const base={enabled:true,category:'測試分類',time:'08:50',firstDays:0,repeatDays:0,recipientMode:'selected',recipientIds:['2']};

test('v89 sends the configured work and report sentences exactly and only replaces tokens',()=>{
 const entries=[{id:'job',kind:'daily',day:'2026-10-02',title:'FAA',category:'["製作"]',assignee_ids:'["2"]'}];
 const work={...base,id:'work',type:'work',name:'每日提醒',title:'{通知名稱}',message:'{人員}今天{數量}項工作',target:'work-record'};
 const report={...base,id:'report',type:'report',name:'回報提醒',title:'工作回報',message:'{人員}尚未回報：{工作清單}',target:'work-report'};
 notificationRulesValid85([work,report]);
 const plans=notificationPlan85([work,report],{},entries,[],[person],'2026-10-02T01:00:00Z');
 assert.equal(plans.find(x=>x.ruleId==='work').message,'甲今天1項工作');
 assert.equal(plans.find(x=>x.ruleId==='work').title,'每日提醒');
 assert.equal(plans.find(x=>x.ruleId==='report').message,'甲尚未回報：FAA（製作）');
});

test('v89 replaces wire, plating and custom notification tokens without hardcoded wording',()=>{
 const rules=[
  {...base,id:'wire',type:'wire',name:'線材通知',title:'{通知名稱}',message:'{線材名稱}已等{逾期天數}天',target:'wire-restock'},
  {...base,id:'plating',type:'plating',name:'電鍍通知',title:'{案件名稱}',message:'{電鍍內容}已等{逾期天數}天',target:'plating-record'},
  {...base,id:'custom',type:'custom',name:'打掃提醒',title:'{通知名稱}',message:'{人員}請於{日期}打掃',target:'home',startDate:'2026-10-02'}
 ];
 notificationRulesValid85(rules);
 const state={wireTypes:[{id:'wire-type',name:'UL1007 黑色'}],wireReels:[{id:'reel',wireId:'wire-type',status:'low',restock:{id:'restock',reported:{time:'2026-09-25'}}}],platingProjects:[{id:'plate',name:'FAA',archived:false,shipments:[{id:'shipment',number:1,sent:'2026-09-25',returned:'',note:'第 1 次送鍍'}]}]};
 const plans=notificationPlan85(rules,state,[],[],[person],'2026-10-02T01:00:00Z');
 assert.equal(plans.find(x=>x.ruleId==='wire').message,'UL1007 黑色已等7天');
 assert.equal(plans.find(x=>x.ruleId==='plating').title,'FAA');
 assert.equal(plans.find(x=>x.ruleId==='plating').message,'第 1 次送鍍已等7天');
 assert.equal(plans.find(x=>x.ruleId==='custom').message,'甲請於2026-10-02打掃');
});

test('v89 removes notification inbox entries at seven days while retaining newer entries',async()=>{
 const {db,DB}=database();migrations85(db);
 db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(2,'staff','staff@local.test','甲','viewer','active','now','now')");
 const insert=db.prepare("INSERT INTO notification_inbox88(id,employee_id,category,title,message,target_url,source_key,created_at) VALUES(?,2,'測試','標題','內容','/',?,?)");
 insert.run('old','old','2026-09-24T23:59:59.000Z');insert.run('boundary','boundary','2026-09-25T01:00:00.000Z');insert.run('new','new','2026-09-25T01:00:00.001Z');
 assert.equal(await cleanupNotificationInbox89({DB},Date.parse('2026-10-02T01:00:00.000Z')),2);
 assert.deepEqual(db.prepare('SELECT id FROM notification_inbox88 ORDER BY id').all().map(row=>row.id),['new']);
});

test('v89 browser assets expose rule preview, compact actions, recipient explanation and save recovery',()=>{
 const js=fs.readFileSync(new URL('../dist/enhancements-v88.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../dist/enhancements-v88.css',import.meta.url),'utf8');
 const cloud=fs.readFileSync(new URL('../dist/cloud.js',import.meta.url),'utf8');
 const server=fs.readFileSync(new URL('../worker/server.mjs',import.meta.url),'utf8');
 for(const pattern of [/data-notification-preview89/,/通知發送預覽/,/發送這個預覽給自己/,/data-cloud-readonly/,/通知當天有被安排工作的人/,/尚未完成該項回報的人/,/data-people-all89/,/notificationTokens89/])assert.match(js,pattern);
 for(const pattern of [/notification-rule-row88>button/,/min-height:30px/,/notification-preview-dialog89/])assert.match(css,pattern);
 for(const pattern of [/failedSaveMessage/,/summary,\[data-cloud-readonly\]/,/下載未儲存資料/])assert.match(cloud,pattern);
 assert.match(server,/cleanupNotificationInbox89/);
});

test('v89 converts iPhone HEIC to JPG and rejects RAW with an immediate useful message',async()=>{
 const source=fs.readFileSync(new URL('../dist/uploads.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('function canvasBlob('),source.indexOf('async function uploadImage('));
 const context=vm.createContext({File,Blob,URL,createImageBitmap:async()=>({width:1600,height:1200,close(){}}),document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(){},set fillStyle(value){}}),toBlob:callback=>callback(new Blob([new Uint8Array(700*1024)],{type:'image/jpeg'}))})}});
 vm.runInContext(code,context);
 const heic=new File([new Uint8Array(100)],'iphone.heic',{type:'image/heic'}),raw=new File([new Uint8Array(100)],'iphone.dng',{type:'image/x-adobe-dng'});
 const converted=await vm.runInContext('compressReceiptImage(file)',Object.assign(context,{file:heic}));
 assert.equal(converted.type,'image/jpeg');assert.equal(converted.name,'iphone.jpg');assert.ok(converted.size<=800*1024);
 await assert.rejects(vm.runInContext('compressReceiptImage(file)',Object.assign(context,{file:raw})),/RAW／DNG/);
 const enhancement=fs.readFileSync(new URL('../dist/enhancements-v71.js',import.meta.url),'utf8');assert.match(enhancement,/image\/heic,image\/heif/);
});
