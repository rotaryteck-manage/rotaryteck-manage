import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/notifications-v82.js',import.meta.url),'utf8');
function setup({localId='',currentId='phone',enabled=true,personEnabled=true,failure=false}={}){
 let unsubscribed=0,saved='',query='',selected=false;
 const button={textContent:'',disabled:true,classList:{remove(){selected=false},toggle(_,v){selected=v}}},subscription={endpoint:'https://fcm.googleapis.com/actual-phone',unsubscribe:async()=>{unsubscribed++}},registration={pushManager:{getSubscription:async()=>subscription}};
 const ctx=vm.createContext({setTimeout,clearTimeout,navigator:{serviceWorker:{ready:Promise.resolve(registration),getRegistration:async()=>registration}},window:{PushManager:{},Notification:{}},Notification:{permission:'granted'},document:{querySelector:()=>button},localStorage:{getItem:()=>localId,setItem:(_,id)=>saved=id,removeItem(){}},apiFetch:async url=>{query=url;if(url.includes('public-key'))return{ok:false,json:async()=>({})};if(failure)throw Error('暫時離線');return{ok:true,json:async()=>({items:currentId?[{id:currentId,enabled}]:[],currentDeviceId:currentId,personEnabled})}}});vm.runInContext(source.slice(0,source.indexOf('function notificationAddButton82')),ctx);return{ctx,button,result:()=>({unsubscribed,saved,query,selected})}
}
test('reopen restores matching real subscription even if local device ID is missing or stale',async()=>{for(const localId of ['','old']){const f=setup({localId});await f.ctx.notificationUpdateButton82();assert.equal(f.button.textContent,'通知已開啟');assert.equal(f.result().selected,true);assert.equal(f.result().saved,'phone');assert.ok(f.result().query.includes('currentEndpoint='));assert.equal(f.result().unsubscribed,0)}});
test('restoring notification state does not override admin device or person disable',async()=>{for(const config of [{enabled:false},{personEnabled:false}]){const f=setup(config);await f.ctx.notificationUpdateButton82();assert.equal(f.result().selected,false);assert.match(f.button.textContent,/已停用/);assert.equal(f.result().unsubscribed,0)}});
test('temporary network failures and missing server records never destroy a valid browser subscription',async()=>{for(const config of [{failure:true},{currentId:''}]){const f=setup(config);await f.ctx.notificationUpdateButton82();assert.equal(f.result().unsubscribed,0);assert.equal(f.result().selected,false)}});
