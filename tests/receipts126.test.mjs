import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {pushReceiptApi126,pushReceiptToken126} from '../worker/push-receipts126.mjs';
function fixture(){const {db,DB}=database();migrations85(db);db.prepare("INSERT INTO notification_deliveries(id,rule_id,employee_id,subscription_id,notification_type,title,message,target_url,status,dedupe_key,created_at) VALUES('d','r',1,'phone','work','工作','內容','/','sent','delivery:phone','now')").run();return{db,env:{DB,VAPID_PRIVATE_KEY:'test-private-key'}}}
const request=body=>new Request('https://site.test/api/push-receipt126',{method:'POST',body:JSON.stringify(body)});
test('signed device acknowledgements are idempotent and never change send dedupe or provider status',async()=>{
 const f=fixture(),receipt=await pushReceiptToken126(f.env,'delivery:phone');
 for(const stage of ['received','error','shown','received','shown','error'])assert.equal((await pushReceiptApi126(request({receipt,stage,error:'denied'}),f.env)).status,200);
 const row=f.db.prepare('SELECT * FROM notification_deliveries').get();assert.equal(row.status,'sent');assert.equal(row.dedupe_key,'delivery:phone');assert.ok(row.device_received_at126);assert.ok(row.device_shown_at126);assert.equal(row.device_error126,'');
 const first=row.device_shown_at126;await pushReceiptApi126(request({receipt,stage:'shown'}),f.env);assert.equal(f.db.prepare('SELECT device_shown_at126 FROM notification_deliveries').get().device_shown_at126,first);
});
test('forged, oversized or expired receipts cannot write delivery diagnostics',async()=>{
 const f=fixture(),receipt=await pushReceiptToken126(f.env,'delivery:phone');
 for(const altered of [{...receipt,key:'another-device'},{...receipt,proof:'0'.repeat(64)},{...receipt,at:Date.now()-8*86400000}])assert.equal((await pushReceiptApi126(request({receipt:altered,stage:'shown'}),f.env)).status,403);
 assert.equal((await pushReceiptApi126(request({receipt,stage:'other'}),f.env)).status,403);
 assert.equal((await pushReceiptApi126(request({receipt,stage:'shown',padding:'x'.repeat(5000)}),f.env)).status,413);
 assert.equal(f.db.prepare('SELECT device_shown_at126 FROM notification_deliveries').get().device_shown_at126,'');
});
test('service worker shows notification immediately even if acknowledgement or badge fetch is unavailable',async()=>{
 const callbacks={},sent=[],events=[],receipt={key:'phone',at:1,proof:'proof'};
 const context=vm.createContext({self:{navigator:{},registration:{showNotification(title,options){events.push([title,options]);return Promise.resolve()}},addEventListener(name,fn){callbacks[name]=fn}},fetch:async(url,options)=>{if(url.includes('receipt'))sent.push(JSON.parse(options.body).stage);throw Error('offline')},AbortSignal,URL,clients:{}});
 vm.runInContext(fs.readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8'),context);
 let task;callbacks.push({data:{json:()=>({title:'工作提醒',body:'本日工作',tag:'one',renotify:true,receipt126:receipt})},waitUntil(value){task=value}});
 assert.equal(events.length,1);assert.equal(events[0][0],'工作提醒');assert.equal(events[0][1].tag,'one');await task;assert.deepEqual(sent.sort(),['received','shown']);
});
test('service worker distinguishes an actual display failure from provider acceptance',async()=>{
 const callbacks={},sent=[];const context=vm.createContext({self:{navigator:{},registration:{showNotification:()=>Promise.reject(Object.assign(Error('blocked'),{name:'NotAllowedError'}))},addEventListener(name,fn){callbacks[name]=fn}},fetch:async(url,options)=>{if(url.includes('receipt'))sent.push(JSON.parse(options.body));return new Response('{}')},AbortSignal,URL,clients:{}});
 vm.runInContext(fs.readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8'),context);let task;callbacks.push({data:{json:()=>({receipt126:{key:'phone'}})},waitUntil(value){task=value}});await task;
 assert.ok(sent.some(x=>x.stage==='error'&&x.error.includes('NotAllowedError')));assert.ok(!sent.some(x=>x.stage==='shown'));
});
