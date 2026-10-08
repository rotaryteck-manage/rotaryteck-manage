import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {notificationPlan85,notificationRulesValid85} from '../worker/notifications85.mjs';

const rule={id:'report-check-default105',type:'report-check',category:'回報核對',name:'回報核對通知',title:'回報核對通知',message:'今日工作回報：{完成數}/{總人數} 人完成工作回報。\n{核對結果}',time:'18:00',firstDays:0,repeatDays:0,target:'work-report',recipientMode:'selected',recipientIds:['1','4'],enabled:true};
const people=[{id:1,name:'主管',enabled:1},{id:2,name:'王小明',enabled:1},{id:3,name:'陳小華',enabled:1},{id:4,name:'倉管',enabled:1}];
const entry=(id,title,assignees)=>({id,kind:'daily',day:'2026-10-06',end_day:'2026-10-06',title,category:'[]',assignee_ids:JSON.stringify(assignees)});
const entries=[entry('a','105',['2']),entry('b','M60',['2']),entry('c','SJ7195-25',['3']),entry('d','105',['2'])];

test('10.5v report check validates only selected recipients and work-report target',()=>{
 assert.doesNotThrow(()=>notificationRulesValid85([rule]));
 assert.throws(()=>notificationRulesValid85([{...rule,recipientMode:'auto'}]),/格式/);
 assert.throws(()=>notificationRulesValid85([{...rule,target:'home'}]),/格式/);
});

test('10.5v report check sends one combined multiline notification to each selected recipient',()=>{
 const plans=notificationPlan85([rule],{},entries,[{author_id:'2',body:'完成',photo_key:'photo.jpg',photo_count:0}],people,'2026-10-06T10:05:00Z');
 assert.equal(plans.length,2);
 assert.deepEqual(plans.map(plan=>plan.employeeId),[1,4]);
 assert.equal(plans[0].message,'今日工作回報：1/2 人完成工作回報。\n陳小華：尚未回報「SJ7195-25」');
 assert.equal(plans[0].targetUrl,'/?notificationDay=2026-10-06&notificationSection=jobs#schedule');
 assert.equal(plans[0].reportCheck.missing,1);
});

test('10.5v one valid report completes all assigned jobs for that person',()=>{
 const reports=[{author_id:'2',body:'完成',photo_key:'photo.jpg',photo_count:0},{author_id:'3',body:'完成',photo_key:'',photo_count:1}];
 const plans=notificationPlan85([rule],{},entries,reports,people,'2026-10-06T10:05:00Z');
 assert.equal(plans[0].message,'今日工作回報：2/2 人完成工作回報。\n全員皆已完成工作回報。');
 assert.equal(plans[0].reportCheck.missing,0);
});

test('10.5v text-only and photo-only reports remain incomplete',()=>{
 const reports=[{author_id:'2',body:'只有文字',photo_key:'',photo_count:0},{author_id:'3',body:'',photo_key:'photo.jpg',photo_count:0}];
 const plans=notificationPlan85([rule],{},entries,reports,people,'2026-10-06T10:05:00Z');
 assert.equal(plans[0].message,'今日工作回報：0/2 人完成工作回報。\n王小明：尚未回報「105、M60」\n陳小華：尚未回報「SJ7195-25」');
});

test('10.5v admin settings explain recipients, scenarios and multiline display',()=>{
 const ui=fs.readFileSync('dist/enhancements-v88.js','utf8'),preview=fs.readFileSync('dist/enhancements-v903.js','utf8'),css=fs.readFileSync('dist/enhancements-v88.css','utf8');
 assert.match(ui,/回報核對通知/);
 assert.match(ui,/每位指定接收者只會收到一則完整合併通知/);
 for(const label of ['模擬全員完成','模擬部分未完成','模擬全員未完成','模擬只有文字、沒有照片','模擬只有照片、沒有文字'])assert.match(preview,new RegExp(label));
 assert.match(css,/white-space:pre-line/);
});

test('11.0v version label is consistent',()=>{
 for(const file of ['dist/cloud.js','dist/enhancements-v943.js','dist/enhancements-v944.js','dist/enhancements-v945.js'])assert.match(fs.readFileSync(file,'utf8'),/11\.0v/,file);
});
