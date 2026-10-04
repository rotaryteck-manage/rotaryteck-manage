import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/d1.mjs';
import {api} from '../worker/server.mjs';
import {diffRecords,splitState,joinRecords,normalizeLogIds,stableJSON} from '../worker/state-codec.mjs';
globalThis.fetch=async()=>Response.json({id:'owner',email:'owner@example.com',user_metadata:{name:'主管'}});
const project=id=>({id,name:id,parts:[],inventory:{},archivedParts:[]});
function setup(state={projects:[project('A'),project('B')],logs:[]}){const env={...database(),SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'};env.db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES (?,?,?,?)').run('warehouse-main',JSON.stringify(state),7,new Date().toISOString());return env;}
function request(method='GET',body){return new Request('https://test.local/api/state',{method,headers:{Authorization:'Bearer owner',Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
const get=async env=>(await api(request(),env)).json();
const payload=(base,next)=>({storageVersion:2,requestId:crypto.randomUUID(),changes:diffRecords(base.state,next,base.versions)});
const put=(env,p)=>api(request('PATCH',p),env);

import {restockTransition} from '../worker/workflows.mjs';
for(const count of [1,3])test('v94.3 received-round deletion with audit commits '+count+' records',async()=>{
 const now=new Date().toISOString(),env=setup({projects:[],logs:[],wireTypes:[{id:'w',name:'Wire'}],wireReels:Array.from({length:count},(_,i)=>({id:'r'+i,wireId:'w',number:String(i),color:'red',photos:[],status:'enough',restock:{id:'round'+i,events:[],received:{time:now,actor:'主管',actorId:'1'}}}))});
 const base=await get(env),next=structuredClone(base.state);
 next.wireReels=next.wireReels.map(r=>restockTransition(r,'deleteRestock',base.currentUser,now));
 next.logs.unshift({id:crypto.randomUUID(),time:now,action:'刪除補貨紀錄',detail:'Wire red',location:'線材管理',actor:base.currentUser.name});
 const broken=structuredClone(next);delete broken.logs[0].detail;
 const failed=await put(env,payload(base,broken));assert.equal(failed.status,400);assert.equal((await failed.json()).error,'資訊庫紀錄格式不正確');
 const response=await put(env,payload(base,next));assert.equal(response.status,200,JSON.stringify(await response.json()));
 const after=await get(env);assert.equal(after.state.wireReels.length,count);assert.ok(after.state.wireReels.every(r=>!r.restock));assert.equal(after.state.logs[0].detail,'Wire red');
});
import vm from 'node:vm';
import fs from 'node:fs';
test('old inbox URLs map to lists and precise new targets remain unchanged',()=>{
 const ctx={URL,location:new URL('https://test.local/'),document:{documentElement:{dataset:{}}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/enhancements-v943.js','utf8'),ctx);
 assert.equal(ctx.legacyNotificationTarget943('/#wire'),'/?notificationSection=restock#wire');
 assert.equal(ctx.legacyNotificationTarget943('/#plating'),'/?notificationPlatingOverview=all#plating');
 assert.equal(ctx.legacyNotificationTarget943('/?notificationPlatingProject=p&notificationPlatingShipment=s#plating'),'/?notificationPlatingProject=p&notificationPlatingShipment=s#plating');
});
