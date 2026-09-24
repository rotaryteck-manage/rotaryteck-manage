import test from 'node:test';
import assert from 'node:assert/strict';
import {stateChangeAllowed} from '../worker/server.mjs';
const before={projects:[],logs:[{id:'a',actor:'A',action:'新增',detail:'test'},{id:'b',actor:'B',action:'修改',detail:'test'}],wireTypes:[],wireReels:[],wireCuts:[]};
test('warehouse/supervisor may remove one text log without changing application data',()=>{for(const role of ['warehouse','supervisor'])assert.equal(stateChangeAllowed(before,{...before,logs:[before.logs[1]]},{role,name:'C',permissions:[]}),true);});
test('ordinary employee cannot delete a text log',()=>{assert.equal(stateChangeAllowed(before,{...before,logs:[before.logs[1]]},{role:'viewer',name:'C',permissions:[]}),false);});
test('warehouse text deletion cannot edit retained logs, erase all logs, or modify data in same request',()=>{const e={role:'warehouse',name:'C',permissions:[]};assert.equal(stateChangeAllowed(before,{...before,logs:[{...before.logs[1],detail:'forged'}]},e),false);assert.equal(stateChangeAllowed(before,{...before,logs:[]},e),false);assert.equal(stateChangeAllowed(before,{...before,projects:[{id:'forged'}],logs:[before.logs[1]]},e),false);});
import {database} from './helpers/d1.mjs';
import {api} from '../worker/server.mjs';
import {diffRecords} from '../worker/state-codec.mjs';
test('real API persists warehouse text deletion; rejects viewer and stale replay',async()=>{
 const {db,DB}=database();for(const role of ['warehouse','supervisor','viewer'])db.prepare('INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(role,role+'@example.com',role,role,'active','now','now');
 const original=globalThis.fetch;globalThis.fetch=async(input,init)=>{const id=new Headers(init.headers).get('authorization').slice(7);return Response.json({id,email:id+'@example.com'});};
 try{const env={DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'};
 const req=(role,body)=>new Request('https://test.local/api/state',{method:body?'PATCH':'GET',headers:{Authorization:'Bearer '+role,Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const read=async role=>(await api(req(role),env)).json();const save=(role,data,next)=>api(req(role,{storageVersion:2,requestId:crypto.randomUUID(),changes:diffRecords(data.state,next,data.versions)}),env);
 let data=await read('supervisor'),next=structuredClone(data.state);next.logs=[{id:'a',actor:'A',action:'新增',time:new Date().toISOString(),detail:'文字',project:'wire:w'},{id:'b',actor:'B',action:'修改',time:new Date().toISOString(),detail:'文字',project:'wire:w'}];assert.equal((await save('supervisor',data,next)).status,200);
 data=await read('viewer');next=structuredClone(data.state);next.logs.shift();assert.equal((await save('viewer',data,next)).status,403);
 data=await read('warehouse');next=structuredClone(data.state);next.logs.shift();assert.equal((await save('warehouse',data,next)).status,200);assert.equal((await read('warehouse')).state.logs.length,1);assert.equal((await save('warehouse',data,next)).status,409);
 }finally{globalThis.fetch=original;}
});
