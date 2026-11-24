import test from 'node:test';
import assert from 'node:assert/strict';
import {ensurePermissions} from '../worker/wire-permissions.mjs';
import {api} from '../worker/server.mjs';
import {database} from './helpers/d1.mjs';

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
async function promptly(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('later request waited for an earlier request')),1000)})])}finally{clearTimeout(timer)}}
test('a stalled permission request cannot trap a later request; successful completion skips repeat initialization',async()=>{
 const blocked=deferred(),entered=deferred();let calls=0;
 const DB={async batch(){calls++;if(calls===1){entered.resolve();await blocked.promise}},prepare(){return{async first(){return{id:'already migrated'}}}}};
 const first=ensurePermissions({DB});const caught=first.catch(e=>e);await entered.promise;
 try{await promptly(ensurePermissions({DB}));assert.equal(calls,2);await ensurePermissions({DB});assert.equal(calls,2)}finally{blocked.reject(Error('original request ended'));assert.match((await caught).message,/original request ended/)}
 await ensurePermissions({DB});assert.equal(calls,2,'an older failed request must not invalidate another successful request');
});
test('a pending warehouse initializer cannot block another authenticated read or corrupt its migrated snapshot',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({id:'owner',email:'owner@example.com',user_metadata:{name:'主管'}});
 const env={...database(),SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test'};
 const initial={projects:[{id:'P',name:'Original',parts:[],inventory:{},archivedParts:[]}],logs:[]};
 env.db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,?,?)').run('warehouse-main',JSON.stringify(initial),7,'now');
 await ensurePermissions(env);
 const blocked=deferred(),entered=deferred(),batch=env.DB.batch.bind(env.DB);let firstBatch=true;
 env.DB.batch=async statements=>{if(firstBatch){firstBatch=false;entered.resolve();await blocked.promise}return batch(statements)};
 const request=()=>new Request('https://test.local/api/state',{headers:{Authorization:'Bearer owner'}});
 const first=api(request(),env);const caught=first.catch(e=>e);await entered.promise;
 try{
  const response=await promptly(api(request(),env));assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.state.projects,initial.projects);
  assert.equal(env.db.prepare('SELECT COUNT(*) n FROM state_storage_meta').get().n,1);
  assert.deepEqual(JSON.parse(env.db.prepare('SELECT body FROM company_state').get().body),initial);
  blocked.reject(Error('original request ended'));await caught;
  assert.equal((await promptly(api(request(),env))).status,200);
 }finally{blocked.reject(Error('cleanup'));await caught;globalThis.fetch=original;env.db.close()}
});
