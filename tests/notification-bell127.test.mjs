import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import webpush from 'web-push';
const read=file=>fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
class Element127{
 constructor(){this.children=[];this.classes=new Set();this.dataset={};this.hidden=false;this.disabled=false;this.isConnected=true;this.attributes={};this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),contains:n=>this.classes.has(n),toggle:(n,v)=>v?this.classes.add(n):this.classes.delete(n)}}
 set className(value){this.classes=new Set(value.split(' '))}get className(){return[...this.classes].join(' ')}
 set textContent(value){this.text=String(value);for(const c of this.children)c.parent=null;this.children=[]}get textContent(){return this.text||''}
 set innerHTML(html){this.html=html;this.textContent='';if(html.includes('data-bell-icon127')){const icon=new Element127();icon.dataset.bellIcon127='';this.append(icon)}for(const key of ['push-message127','push-enable127','push-recheck127'])if(html.includes('data-'+key)){const c=new Element127();c.marker=key;this.append(c)}}get innerHTML(){return this.html||''}
 querySelector(selector){return this.children.find(c=>selector==='[data-bell-icon127]'?Object.hasOwn(c.dataset,'bellIcon127'):selector==='.notification-badge88'?c.classes.has('notification-badge88'):selector==='[data-push-status127]'?Object.hasOwn(c.dataset,'pushStatus127'):selector==='[data-'+c.marker+']')||null}
 append(c){c.remove();this.children.push(c);c.parent=this}remove(){if(this.parent){this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null}}
 before(c){this.parent.append(c)}setAttribute(k,v){this.attributes[k]=v}removeAttribute(k){delete this.attributes[k]}addEventListener(k,fn){this['on'+k]=fn}
}
function fixture({platform='Windows',enabled=true,personEnabled=true,deleted=false,permission='granted',unsupported=false,subscriptionRead,serverRead}={}){
 const button=new Element127(),modal=new Element127(),tools=new Element127();modal.append(tools);let modalOpens=0,posts=0,registers=0,subscribes=0,unsubscribes=0,readCalls=0,keyMismatch=false,stored='old-id',id=deleted?'':'phone';const timers=new Map();let timerId=0;
 const keys=webpush.generateVAPIDKeys(),subscription={endpoint:'https://fcm.googleapis.com/current',toJSON:()=>({endpoint:subscription.endpoint,keys:{p256dh:'browser-key',auth:'browser-auth'}}),unsubscribe:async()=>{unsubscribes++}},registration={active:{},pushManager:{getSubscription:async()=>{readCalls++;return subscriptionRead?subscriptionRead(readCalls,subscription):subscription},subscribe:async()=>{subscribes++;return subscription}}};
 const query=selector=>selector==='#notification-enable82'?button:selector==='#modal'?modal:selector==='#modal .notification-inbox-tools88'?tools:selector==='#modal [data-push-status127]'?modal.querySelector('[data-push-status127]'):null;
 const ctx=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,atob,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),setInterval(){},console,navigator:{userAgent:platform,serviceWorker:{ready:Promise.resolve(registration),getRegistration:async()=>registration,register:async()=>{registers++;return registration}}},window:unsupported?{addEventListener(){}}:{Notification:{},PushManager:{},addEventListener(){}},Notification:{permission},document:{hidden:false,querySelector:query,querySelectorAll:()=>[],createElement:()=>new Element127(),addEventListener(){}},$:query,currentUser:{id:1},localStorage:{getItem:()=>stored,setItem:(_,v)=>stored=v,removeItem:()=>stored=''},authRead:()=>({user:{id:1}}),authWrite(){},AUTH_STORAGE:'auth',esc:String,toast(){},modal(){modalOpens++},apiFetch:async(url,options)=>{
  if(url.includes('public-key'))return{ok:true,json:async()=>({publicKey:keyMismatch?webpush.generateVAPIDKeys().publicKey:keys.publicKey})};
  if(url.includes('inbox'))return{ok:true,json:async()=>({unread:9,items:[]})};
  if(options?.method==='POST'){posts++;id='replacement';return{ok:true,json:async()=>({id,enabled:enabled&&personEnabled})}}
  if(serverRead)await serverRead();return{ok:true,json:async()=>({currentDeviceId:id,personEnabled,items:id?[{id,enabled}]:[]})};
 }});
 vm.runInContext(read('notifications-v82.js').split('function notificationAddButton82')[0],ctx);
 vm.runInContext(read('enhancements-v88.js').split('function notificationTargetLabel88')[0],ctx);
 vm.runInContext(read('enhancements-v112.js').replace('void refreshPersonalBadge112();\n',''),ctx);
 return{ctx,button,modal,subscription,keys,setMismatch(){keyMismatch=true;subscription.options={applicationServerKey:Buffer.from(keys.publicKey,'base64url')}},async retry(){const entry=[...timers].find(([,t])=>t.ms===1500);if(!entry)return false;timers.delete(entry[0]);await entry[1].fn();return true},stats:()=>({modalOpens,posts,registers,subscribes,unsubscribes,stored,readCalls}),status:()=>vm.runInContext('notificationPushStatus127',ctx)};
}
for(const platform of ['Windows Edge','iPhone PWA','Android Chrome'])test(platform+': healthy bell and unread count retain the original compact appearance without subscription writes',async()=>{
 const f=fixture({platform});await f.ctx.notificationUpdateButton82();assert.equal(f.status().kind,'ready');assert.ok(f.button.classes.has('notification-bell88'));assert.ok(f.button.classes.has('selected'));assert.equal(f.button.querySelector('.notification-badge88').textContent,'9');await f.button.onclick();assert.equal(f.stats().modalOpens,1);assert.equal(f.stats().posts,0);assert.equal(f.stats().registers,0);assert.equal(f.stats().unsubscribes,0);assert.equal(f.modal.querySelector('[data-push-status127]').hidden,true);
});
for(const mode of ['device','person','deleted'])test(mode+': backend stop/delete leaves bell readable and does not silently restore push',async()=>{
 const f=fixture({enabled:mode!=='device',personEnabled:mode!=='person',deleted:mode==='deleted'});await f.ctx.notificationUpdateButton82();assert.equal(f.status().kind,mode==='deleted'?'unbound':mode+'-disabled');await f.ctx.refreshPersonalBadge112();assert.ok(f.button.classes.has('notification-bell88'));assert.equal(f.button.querySelector('.notification-badge88').textContent,'9');await f.button.onclick();const panel=f.modal.querySelector('[data-push-status127]');assert.equal(f.stats().modalOpens,1);assert.equal(panel.querySelector('[data-push-enable127]').hidden,mode!=='deleted');assert.equal(f.stats().posts,0);assert.equal(f.stats().unsubscribes,0);await f.retry();assert.equal(f.stats().posts,0);
});
test('deleted binding can be re-registered only by explicit enable; existing browser subscription is reused',async()=>{
 const f=fixture({deleted:true});await f.ctx.notificationUpdateButton82();await f.button.onclick();await f.modal.querySelector('[data-push-status127]').querySelector('[data-push-enable127]').onclick();await f.ctx.notificationUpdateButton82();assert.equal(f.stats().posts,1);assert.equal(f.stats().subscribes,0);assert.equal(f.stats().unsubscribes,0);assert.equal(f.stats().stored,'replacement');assert.equal(f.status().kind,'ready');
});
for(const config of [{permission:'denied'},{permission:'default'},{unsupported:true}])test(JSON.stringify(config)+': inbox stays available independently of system-push support or permission',async()=>{
 const f=fixture(config);await f.ctx.notificationUpdateButton82();await f.button.onclick();assert.equal(f.stats().modalOpens,1);assert.equal(f.button.disabled,false);assert.equal(f.stats().posts,0);assert.equal(f.stats().subscribes,0);
});
test('a temporary subscription error is checking, then recovers with at most two automatic retries',async()=>{
 const f=fixture({subscriptionRead(n,s){if(n<3)throw Error('startup');return s}});await f.ctx.notificationUpdateButton82();assert.equal(f.status().kind,'checking');assert.ok(f.button.classes.has('notification-bell88'));await f.retry();await f.retry();assert.equal(f.status().kind,'ready');assert.equal(await f.retry(),false);assert.equal(f.stats().posts,0);
 const failed=fixture({subscriptionRead(){throw Error('offline')}});await failed.ctx.notificationUpdateButton82();await failed.retry();await failed.retry();assert.equal(await failed.retry(),false);assert.equal(failed.stats().readCalls,3);
});
test('an earlier null subscription cannot overwrite a later valid result',async()=>{
 let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r),f=fixture({subscriptionRead(n,s){if(n===1){entered();return gate}return s}});const first=f.ctx.notificationUpdateButton82();await started;await f.ctx.notificationUpdateButton82();assert.equal(f.status().kind,'ready');release(null);await first;assert.equal(f.status().kind,'ready');assert.ok(f.button.classes.has('selected'));assert.ok(f.button.classes.has('notification-bell88'));
});
test('a delayed server result after switching account cannot overwrite the new account state or local device ID',async()=>{
 let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);let calls=0;const f=fixture({serverRead(){if(++calls===1){entered();return gate}}});const first=f.ctx.notificationUpdateButton82();await started;f.ctx.currentUser={id:2};await f.ctx.notificationUpdateButton82();release();await first;assert.equal(f.status().kind,'ready');assert.equal(f.stats().stored,'phone');
});
test('checking a changed public key never unsubscribes or creates a new binding',async()=>{
 const f=fixture();f.setMismatch();await f.ctx.notificationUpdateButton82();assert.equal(f.status().kind,'key-changed');assert.equal(f.stats().unsubscribes,0);assert.equal(f.stats().posts,0);assert.ok(f.button.classes.has('notification-bell88'));
});
test('badge refresh creates the bell anchor even before the push status check has completed',async()=>{
 const f=fixture();await f.ctx.refreshPersonalBadge112();assert.ok(f.button.querySelector('[data-bell-icon127]'));assert.ok(f.button.classes.has('notification-bell88'));assert.equal(f.button.querySelector('.notification-badge88').textContent,'9');await f.button.onclick();assert.equal(f.stats().modalOpens,1);
 const css=read('enhancements-v88.css');assert.match(css,/#notification-enable82\.notification-bell88\{position:relative/);assert.match(css,/\.notification-badge88\{position:absolute;right:-5px;top:-7px/);
});
