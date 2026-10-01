import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validatePushPublicKey83} from '../worker/server.mjs';

const publicKey=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8')).vars.VAPID_PUBLIC_KEY;
const truncated='BJkPpQIVDy5L10NHyRSWGCgxiJAJIkCDtGqj14m6951GWFnr';
const invalidPoint=Buffer.concat([Buffer.from([4]),Buffer.alloc(64)]).toString('base64url');
const read=name=>fs.readFileSync(name,'utf8');

test('configured VAPID key is complete and both backend and frontend reject bad keys',async()=>{
 assert.equal(publicKey.length,87);
 assert.equal(await validatePushPublicKey83(publicKey),true);
 for(const key of [truncated,'',undefined,invalidPoint,'"'+publicKey+'"'])
  assert.equal(await validatePushPublicKey83(key),false);
 const source=read('dist/notifications-v82.js');
 const ctx=vm.createContext({atob,Uint8Array});
 vm.runInContext(source.slice(source.indexOf('function notificationKey82'),source.indexOf('function notificationDeviceLabel82')),ctx);
 assert.equal(ctx.notificationKey82(publicKey).length,65);
 assert.throws(()=>ctx.notificationKey82(truncated),/通知公鑰設定不完整/);
 assert.throws(()=>ctx.notificationKey82(''),/通知公鑰/);
});

test('notification enable waits for an active worker and validates key before subscribe',async()=>{
 const run=async key=>{
  const calls=[],toasts=[];
  const registration={pushManager:{getSubscription:async()=>null,subscribe:async options=>{
   calls.push('subscribe');assert.equal(options.applicationServerKey.length,65);
   return {toJSON:()=>({endpoint:'https://push.example.test/1',keys:{p256dh:'public',auth:'auth'}})};
  }}};
  const ctx=vm.createContext({atob,Uint8Array,setTimeout,clearTimeout,localStorage:{setItem(){},getItem(){return null}},crypto:webcrypto,console:{error(){}},
   navigator:{userAgent:'Android Chrome',serviceWorker:{register:async()=>{calls.push('register');return {}},ready:Promise.resolve(registration)}},
   window:{PushManager:{},Notification:{}},Notification:{permission:'default',requestPermission:()=>{calls.push('permission');return Promise.resolve('granted')}},
   document:{querySelector:()=>null},toast:text=>toasts.push(text),
   apiFetch:async(url)=>{calls.push(url);return {ok:true,json:async()=>url.endsWith('push-public-key')?{publicKey:key}:{ok:true,enabled:true,id:'test'}}}
  });
  const source=read('dist/notifications-v82.js');
  vm.runInContext(source.slice(0,source.indexOf('function notificationAddButton82')),ctx);
  await ctx.notificationEnable82();
  return {calls,toasts};
 };
 const valid=await run(publicKey);
 assert.equal(valid.calls[0],'permission');
 assert.ok(valid.calls.includes('subscribe'));
 assert.ok(valid.calls.includes('/api/push-subscription'));
 assert.match(valid.toasts.at(-1),/已開啟/);
 for(const key of [truncated,invalidPoint]){
  const bad=await run(key);
  assert.ok(!bad.calls.includes('subscribe'));
  assert.match(bad.toasts.at(-1),/通知公鑰/);
 }
});

test('a device deleted by the administrator returns to the normal enable-notification state',async()=>{
 let unsubscribed=0,removed='';
 const button={textContent:'',disabled:true,classList:{remove(){},toggle(){}}};
 const subscription={unsubscribe:async()=>{unsubscribed++}};
 const registration={pushManager:{getSubscription:async()=>subscription}};
 const ctx=vm.createContext({setTimeout,clearTimeout,
  navigator:{serviceWorker:{ready:Promise.resolve(registration)}},
  window:{PushManager:{},Notification:{}},Notification:{permission:'granted'},
  document:{querySelector:selector=>selector==='#notification-enable82'?button:null},
  localStorage:{getItem:()=> 'deleted-device',removeItem:key=>{removed=key}},
  apiFetch:async()=>({ok:true,json:async()=>({items:[],personEnabled:true})})
 });
 const source=read('dist/notifications-v82.js');
 vm.runInContext(source.slice(0,source.indexOf('function notificationAddButton82')),ctx);
 await ctx.notificationUpdateButton82();
 assert.equal(unsubscribed,1);
 assert.equal(removed,'notification-device85');
 assert.equal(button.textContent,'開啟通知');
 assert.equal(button.disabled,false);
});

test('mobile camera and gallery append to one report queue, preserve cancellation and enforce ten photos',async()=>{
 const element=()=>({style:{},children:[],value:'',files:[],disabled:false,classList:{add(){}},dataset:{},
  setAttribute(k,v){this[k]=v},append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},
  addEventListener(){},after(...items){this.afterItems=items},click(){this.clicks=(this.clicks||0)+1},
  set innerHTML(v){this.children=[];this.html=v},get innerHTML(){return this.html||''}});
 const input=element(),preview=element(),hint=element(),day=element(),entry=element();
 const dialog={querySelector:s=>s.includes('photo-report80')?input:s.includes('paste-hint')?hint:s.includes('upload-preview')?preview:s.includes('entryId')?entry:day,close(){}};
 let save,html,uploaded;
 const ctx=vm.createContext({File,Blob,FormData,URL,crypto:webcrypto,console,
  matchMedia:()=>({matches:true}),document:{createElement:element,querySelector:s=>s.includes('photo-report80')?input:null},
  $:()=>dialog,currentUser:{name:'小明'},scheduleData56:{entries:[{id:'work',kind:'daily',day:'2026-10-01',end_day:'2026-10-01',assignee:'小明'}]},
  scheduleDraw56(){},scheduleDayRecord56(){},scheduleReportDialog56(){},scheduleMaterialDialog61(){},
  scheduleAssignees56:()=>['小明'],scheduleEsc56:String,scheduleLabel63:()=> 'FAA（製作）',
  modal:(title,body,label,callback)=>{html=body;save=callback},alert(){},scheduleRender56(){},
  compressReceiptImage:async file=>file,
  apiFetch:async(url,options)=>{uploaded=options.body;return {ok:true,json:async()=>({ok:true})}}
 });
 vm.runInContext(read('dist/schedule-v67.js'),ctx);
 const enhancements=read('dist/enhancements-v81.js');
 vm.runInContext(enhancements.slice(enhancements.indexOf('const reportBefore81=')),ctx);
 ctx.scheduleReportDialog56('2026-10-01');
 assert.match(html,/photo-report80/);
 const [bar,camera]=input.afterItems;
 assert.equal(camera.capture,'environment');assert.equal(camera.accept,'image/*');
 assert.equal(bar.children[0].textContent,'直接拍照');
 bar.children[0].onclick();assert.equal(camera.clicks,1);
 bar.children[1].onclick();assert.equal(input.clicks,1);
 const fd=new FormData();fd.set('day','2026-10-01');fd.set('entryId','work');fd.set('body','已完成');
 await assert.rejects(save(fd),/請先上傳工作照片/);
 input.files=[new File(['gallery'],'gallery.jpg',{type:'image/jpeg'})];input.onchange();
 assert.equal(preview.children.length,1);
 camera.files=[];camera.onchange();assert.equal(preview.children.length,1);
 camera.files=[new File(['camera'],'camera.jpg',{type:'image/jpeg'})];camera.onchange();
 assert.equal(preview.children.length,2);assert.equal(camera.value,'');
 await save(fd);assert.equal(uploaded.getAll('photo').length,2);assert.equal(uploaded.get('body'),'已完成');
 input.scheduleAddPhotos83(Array.from({length:12},()=>new File(['x'],'extra.jpg',{type:'image/jpeg'})));
 assert.equal(preview.children.length,10);assert.equal(input.disabled,true);
 preview.children[0].children[1].onclick({preventDefault(){},stopPropagation(){}});
 assert.equal(preview.children.length,9);assert.equal(input.disabled,false);
});

test('build stops a truncated key before writing assets',()=>{
 const temp=fs.mkdtempSync(path.join(tmpdir(),'rotaryteck-vapid-test-'));
 fs.copyFileSync('build.mjs',path.join(temp,'build.mjs'));
 fs.writeFileSync(path.join(temp,'wrangler.jsonc'),JSON.stringify({vars:{VAPID_PUBLIC_KEY:truncated}}));
 assert.throws(()=>execFileSync(process.execPath,['build.mjs'],{cwd:temp,stdio:'pipe'}),error=>{
  assert.match(error.stderr.toString(),/VAPID_PUBLIC_KEY 不完整/);return true;
 });
});
