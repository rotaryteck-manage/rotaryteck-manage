import test from 'node:test';import assert from 'node:assert/strict';
import {notificationPlan85,notificationBatchContent944} from '../worker/notifications85.mjs';
const rule={id:'r',enabled:true,type:'wire',title:'線材提醒',message:'線材補貨區有 {數量} 筆尚未訂購。',time:'00:00',firstDays:0,repeatDays:1,target:'wire-restock',recipientMode:'selected',recipientIds:['1']};
const reel=(id,status='low',restock={})=>({id,wireId:'w',status,restock:{id:'round'+id,reported:{time:'2026-10-01'},...restock}});
const plan=(reels,r=rule)=>notificationPlan85([r],{wireTypes:[{id:'w',name:'W'}],wireReels:reels},[],[],[{id:1,name:'管理',enabled:1}],'2026-10-05T01:00:00Z');
test('only unordered low reels count; message rendered once and target matches rounds',()=>{
 const plans=plan([reel('a'),reel('b'),reel('c','ordered'),reel('d','enough'),reel('e','low',{ordered:{time:'2026-10-02'}})]);
 assert.equal(plans.length,2);const batch=notificationBatchContent944(plans);assert.equal(batch.message,'線材補貨區有 2 筆尚未訂購。');assert.equal(batch.eventCount,2);assert.deepEqual(JSON.parse(new URL(batch.targetUrl,'https://test/').searchParams.get('notificationWireCriteria')),{day:'2026-10-05',firstDays:0,repeatDays:1});
 assert.equal(notificationBatchContent944(plans.slice(1)).message,'線材補貨區有 1 筆尚未訂購。');
});
test('ordering one reduces next eligible count; all ordered has no plan',()=>{assert.equal(plan([reel('a'),reel('b','ordered')]).length,1);assert.equal(plan([reel('a','ordered'),reel('b','enough')]).length,0);});
test('day eligibility and per-record dedupe remain stable',()=>{assert.equal(plan([reel('a')],{...rule,firstDays:5}).length,0);assert.equal(plan([reel('a')],{...rule,firstDays:0,repeatDays:3}).length,0);assert.equal(plan([reel('a')])[0].dedupeKey,plan([reel('a'),reel('b')])[0].dedupeKey);});
test('plating batch content remains a list of messages',()=>assert.deepEqual(notificationBatchContent944([{notificationType:'plating',message:'A'},{notificationType:'plating',message:'B'}]),{message:'A\nB'}));
