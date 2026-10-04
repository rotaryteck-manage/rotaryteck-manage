import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {notificationPlan85} from '../worker/notifications85.mjs';
import {validateWire} from '../worker/wire-permissions.mjs';

const base={id:'r',enabled:true,category:'提醒',name:'提醒',title:'提醒',message:'{線材名稱}{案件名稱} 已 {逾期天數} 天',time:'00:00',firstDays:0,repeatDays:0,recipientMode:'selected',recipientIds:['1']};

test('v93 adding one wire item does not change prior item dedupe keys',()=>{
 const rule={...base,type:'wire',target:'wire-restock'},people=[{id:1,name:'主管',enabled:1}],make=n=>({wireTypes:[{id:'t',name:'線材'}],wireReels:Array.from({length:n},(_,i)=>({id:'reel'+i,wireId:'t',status:'low',restock:{id:'round'+i,reported:{time:'2026-10-0'+(i+1)}}}))});
 const before=notificationPlan85([rule],make(2),[],[],people,'2026-10-03T01:00:00Z'),after=notificationPlan85([rule],make(3),[],[],people,'2026-10-03T01:00:00Z');
 assert.deepEqual(after.slice(0,2).map(x=>x.dedupeKey),before.map(x=>x.dedupeKey));assert.deepEqual(JSON.parse(new URL(after[0].targetUrl,'https://test/').searchParams.get('notificationWireCriteria')),{day:'2026-10-03',firstDays:0,repeatDays:0});assert.notEqual(after[0].message,after[1].message);
});

test('v93 validates a large wire collection without quadratic duplicate scans',()=>{
 const state={wireTypes:[{id:'t',name:'線材'}],wireReels:Array.from({length:5000},(_,i)=>({id:'r'+i,wireId:'t',number:String(i),color:'紅',status:'enough',photos:[]})),wireCuts:[]},start=performance.now();validateWire(state);assert.ok(performance.now()-start<1000);
});

test('v93 assets include record deep links, nested test devices and no legacy LIKE dedupe',()=>{
 const js=fs.readFileSync(new URL('../dist/enhancements-v93.js',import.meta.url),'utf8'),server=fs.readFileSync(new URL('../worker/server.mjs',import.meta.url),'utf8'),planner=fs.readFileSync(new URL('../worker/notifications85.mjs',import.meta.url),'utf8'),build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8');
 assert.match(js,/notificationPlatingProject/);assert.match(js,/notification-test-item93/);assert.doesNotMatch(server,/dedupe_key LIKE/);assert.match(planner,/notificationWireCriteria=/);assert.match(build,/enhancements-v93\.js/);
});
