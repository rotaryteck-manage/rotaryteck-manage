import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {pushSubscriptionApi82,notificationInboxApi88} from '../worker/server.mjs';
test('actual backend disable/delete changes device binding, not the employee inbox; explicit registration respects disabled settings',async()=>{
 const {db,DB}=database();migrations85(db);const env={DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test'},original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({id:'boss',email:'boss@test.local'});
 db.prepare("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'boss','boss@test.local','主管','supervisor','active','now','now')").run();
 db.prepare("INSERT INTO notification_inbox88(id,employee_id,category,title,message,target_url,source_key,created_at) VALUES('notice',1,'工作回報','提醒','內容','/','original','now')").run();
 const endpoint='https://fcm.googleapis.com/original',payload={endpoint,p256dh:'browser-key',auth:'browser-auth',deviceLabel:'Windows Edge'},request=(method='GET',body,admin=false)=>new Request('https://local.test/api/push-subscription'+(admin?'?admin=1':'?currentEndpoint='+encodeURIComponent(endpoint)),{method,headers:{Authorization:'Bearer boss',Origin:'https://local.test',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  const created=await pushSubscriptionApi82(request('POST',payload),env);assert.equal(created.status,200);const {id}=await created.json();
  assert.equal((await pushSubscriptionApi82(request('PATCH',{id,enabled:false},true),env)).status,200);
  const disabled=await(await pushSubscriptionApi82(request(),env)).json();assert.equal(disabled.currentDeviceId,id);assert.equal(disabled.items[0].enabled,false);
  const explicit=await(await pushSubscriptionApi82(request('POST',{...payload,previousDeviceId:id}),env)).json();assert.equal(explicit.enabled,false);assert.equal(db.prepare('SELECT enabled FROM push_subscriptions').get().enabled,0);
  assert.equal((await pushSubscriptionApi82(request('DELETE',{id},true),env)).status,200);
  const deleted=await(await pushSubscriptionApi82(request(),env)).json();assert.equal(deleted.currentDeviceId,'');assert.equal(deleted.items.length,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM push_subscriptions').get().n,0);
  const inbox=await notificationInboxApi88(new Request('https://local.test/api/notification-inbox',{headers:{Authorization:'Bearer boss'}}),env);assert.equal(inbox.status,200);assert.equal((await inbox.json()).unread,1);
 }finally{globalThis.fetch=original}
});
