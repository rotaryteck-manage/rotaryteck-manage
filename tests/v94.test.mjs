import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {notificationPlan85,notificationRulesValid85} from '../worker/notifications85.mjs';
import {restockTransition,restockChangeAllowed} from '../worker/workflows.mjs';

const person={id:1,name:'主管',enabled:1};
const manager={id:1,name:'主管',role:'supervisor',permissions:['wire.restock']};
const wireRule={id:'wire',enabled:true,type:'wire',category:'線材提醒',name:'逾期提醒',title:'線材逾期',message:'{線材名稱} 已 {逾期天數} 天',time:'03:10',firstDays:2,repeatDays:1,target:'wire-restock',recipientMode:'selected',recipientIds:['1']};
const wireState=date=>({wireTypes:[{id:'type',name:'M60'}],wireReels:[{id:'reel',wireId:'type',status:'low',restock:{id:'round',reported:{time:date},events:[]}}]});

test('v94 wire reminders only run on eligible days and keep one dedupe key per day',()=>{
 assert.equal(notificationPlan85([wireRule],wireState('2026-10-02'),[],[],[person],'2026-10-02T19:11:00Z').length,0);
 const first=notificationPlan85([wireRule],wireState('2026-10-01'),[],[],[person],'2026-10-02T19:11:00Z')[0];
 const edited=notificationPlan85([{...wireRule,time:'03:30'}],wireState('2026-09-30'),[],[],[person],'2026-10-02T19:31:00Z')[0];
 assert.equal(first.dedupeKey,edited.dedupeKey);
 const tomorrow=notificationPlan85([wireRule],wireState('2026-10-01'),[],[],[person],'2026-10-04T19:11:00Z')[0];
 assert.notEqual(first.dedupeKey,tomorrow.dedupeKey);
});

test('v94 zero repeat wire reminder is once-only even after editing date or time',()=>{
 const rule={...wireRule,repeatDays:0,firstDays:0};
 const a=notificationPlan85([rule],wireState('2026-10-01'),[],[],[person],'2026-10-02T19:11:00Z')[0];
 const b=notificationPlan85([{...rule,time:'03:30'}],wireState('2026-09-30'),[],[],[person],'2026-10-04T19:31:00Z')[0];
 assert.equal(a.dedupeKey,b.dedupeKey);
});

test('v94 notification destinations validate and open the intended plating pages',()=>{
 for(const target of ['plating-overview','plating-pending'])assert.doesNotThrow(()=>notificationRulesValid85([{...wireRule,type:'plating',target}]));
 const state={platingProjects:[{id:'project',name:'FAA',shipments:[{id:'shipment',number:1,sent:'2026-10-01',returned:'',note:'第一批'}]}]};
 const overview=notificationPlan85([{...wireRule,type:'plating',target:'plating-overview'}],state,[],[],[person],'2026-10-02T19:11:00Z')[0];
 const pending=notificationPlan85([{...wireRule,type:'plating',target:'plating-pending'}],state,[],[],[person],'2026-10-02T19:11:00Z')[0];
 assert.match(overview.targetUrl,/notificationPlatingOverview=all/);assert.match(pending.targetUrl,/notificationPlatingOverview=pending/);
});

test('v94 warehouse may delete an active replenishment round without deleting the wire',()=>{
 const low=restockTransition({id:'reel',status:'enough'},'low',manager,'2026-10-03T01:00:00Z','round');
 const removed=restockTransition(low,'deleteRestock',manager,'2026-10-03T01:01:00Z');
 assert.equal(removed.status,'enough');assert.equal(removed.restock,undefined);assert.equal(restockChangeAllowed(low,removed,manager,Date.parse('2026-10-03T01:01:00Z')),true);
});

test('v94 build contains the new controls and global optimistic delete layer',()=>{
 const build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8'),js=fs.readFileSync(new URL('../dist/enhancements-v94.js',import.meta.url),'utf8'),wire=fs.readFileSync(new URL('../dist/wire.js',import.meta.url),'utf8');
 assert.match(build,/enhancements-v94\.js/);assert.match(js,/立即檢查通知/);assert.match(js,/pending-delete94/);assert.match(wire,/wire-restock-delete94/);
});
