import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {restockTransition,restockChangeAllowed} from '../worker/workflows.mjs';
const manager={id:'1',name:'倉管',permissions:['wire.restock']},employee={id:'2',name:'員工',permissions:['wire.view','wire.cut']};
const now='2026-10-04T16:30:00Z';
for(const status of ['low','ordered','enough'])test('delete '+status+' round preserves wire photos, cuts and prior history',()=>{
 const reel={id:'r',wireId:'w',color:'red',photos:['photo'],cuts:['cut'],status,restockHistory:[{id:'old'}],restock:{id:'round',events:[],...(status==='enough'?{received:{time:now}}:{})}};
 const result=restockTransition(reel,'deleteRestock',manager,now);
 assert.equal(result.restock,undefined);assert.equal(reel.restock.id,'round');assert.deepEqual(result,{...Object.fromEntries(Object.entries(reel).filter(([key])=>key!=='restock')),status:'enough'});
 assert.equal(restockChangeAllowed(reel,result,manager,Date.parse(now)),true);
 assert.throws(()=>restockTransition(reel,'deleteRestock',employee,now));assert.equal(restockChangeAllowed(reel,result,employee,Date.parse(now)),false);
 assert.equal(restockChangeAllowed(reel,{...result,restockHistory:[]},manager,Date.parse(now)),false);
});
test('archived round is outside active-list deletion scope',()=>assert.throws(()=>restockTransition({status:'enough',restock:{received:{time:'2026-09-01'},events:[]}},'deleteRestock',manager,now)));
const source=fs.readFileSync(new URL('../dist/enhancements-v941.js',import.meta.url),'utf8');
function route(url){
 const calls=[],nodes=new Set(),location=new URL(url),timers=new Map();let serial=0;
 const ctx={URL,URLSearchParams,CSS:{escape:x=>x},location,cloudReady:true,cloudBusy:false,canDo:()=>true,activeManagementPage:()=>({id:location.hash.slice(1)}),ledgerQuery:'old query',ledgerFilter:'all',console,
 document:{querySelector:s=>nodes.has(s)?{}:null,addEventListener(){},documentElement:{dataset:{}}},addEventListener(){},
 history:{replaceState(a,b,path){location.href=new URL(path,location).href;}},
 openWireRestock(){calls.push('wire');nodes.add('#modal[open] #restock-view44');},
 openPlatingLedger(){calls.push('ledger');nodes.add('#modal[open] #ledger-rows');},
 platingFind:()=>({shipments:[{id:'s'}]}),editPlatingShipment(p,s){calls.push([p,s]);nodes.add('#modal[open] #plating-fields');},toast:m=>calls.push(m),
 notificationDeepLink93(){},notificationPlatingTarget94(){},setTimeout(fn){timers.set(++serial,fn);return serial;},clearTimeout(id){timers.delete(id);}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('// v94.2:')),ctx);
 return{ctx,calls,nodes,location,timers,run:()=>ctx.notificationRoute941()};
}
for(const [query,target,call,filter] of [['notificationSection=restock','wire','wire'],['notificationWire=missing','wire','wire'],['notificationPlatingOverview=all','plating','ledger','all'],['notificationPlatingOverview=pending','plating','ledger','sending']])test('route '+query,()=>{
 const h=route('https://test/?keep=1&'+query+'#'+target);assert.equal(h.run(),true);assert.equal(h.calls[0],call);assert.equal(h.location.search,'?keep=1');if(filter){assert.equal(h.ctx.ledgerFilter,filter);assert.equal(h.ctx.ledgerQuery,'');}
});
test('shipment notification opens exact shipment and missing shipment falls back',()=>{
 const h=route('https://test/?notificationPlatingProject=p&notificationPlatingShipment=s#plating');h.run();assert.deepEqual(h.calls[0],['p','s']);
 const missing=route('https://test/?notificationPlatingProject=p&notificationPlatingShipment=gone#plating');missing.run();assert.equal(missing.calls[0],'ledger');
});
test('slow startup waits beyond six seconds and keeps one retry chain',()=>{
 const h=route('https://test/?notificationSection=restock#wire');h.ctx.cloudReady=false;
 for(let i=0;i<60;i++){const [id,fn]=h.timers.entries().next().value;h.timers.delete(id);fn();assert.equal(h.timers.size,1);}
 assert.match(h.location.search,/restock/);assert.equal(h.calls.length,0);
 h.ctx.cloudReady=true;const fn=h.timers.values().next().value;fn();assert.equal(h.calls[0],'wire');assert.equal(h.location.search,'');
});
test('failed opening and denied permission retain target; same notification can reopen',()=>{
 const h=route('https://test/?notificationSection=restock#wire');h.ctx.canDo=()=>false;assert.equal(h.run(),false);assert.match(h.location.search,/restock/);
 h.ctx.canDo=()=>true;const open=h.ctx.openWireRestock;h.ctx.openWireRestock=()=>{};assert.equal(h.run(),false);assert.match(h.location.search,/restock/);
 h.ctx.openWireRestock=open;h.run();h.location.search='?notificationSection=restock';h.run();assert.equal(h.calls.length,2);
});
test('wrong section is corrected before opening, old handlers use the common scheduler',()=>{
 const h=route('https://test/?notificationSection=restock#cases');assert.equal(h.run(),false);assert.equal(h.location.hash,'#wire');assert.equal(h.run(),true);
 assert.equal(h.ctx.notificationDeepLink93,h.ctx.scheduleNotificationRoute941);assert.equal(h.ctx.notificationPlatingTarget94,h.ctx.scheduleNotificationRoute941);
});
