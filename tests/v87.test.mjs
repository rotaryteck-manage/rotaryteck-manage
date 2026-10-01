import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {notificationLogApi85} from '../worker/server.mjs';

globalThis.fetch=async(_input,options)=>{const id=new Headers(options.headers).get('authorization')?.slice(7);return Response.json({id,email:id+'@local.test'});};
function fixture(){const {db,DB}=database();migrations85(db);db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'boss','boss@local.test','主管','supervisor','active','now','now'),(2,'staff','staff@local.test','甲','viewer','active','now','now')");for(const [id,status]of [['sent','sent'],['failed1','failed'],['failed2','failed']])db.prepare('INSERT INTO notification_deliveries(id,employee_id,title,message,status,dedupe_key,created_at) VALUES(?,?,?,?,?,?,?)').run(id,2,'測試','內容',status,'key-'+id,'2026-10-02');return{db,env:{DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test'}};}
const request=(body,user='boss',origin='https://local.test')=>new Request('https://local.test/api/notification-logs',{method:'DELETE',headers:{Authorization:'Bearer '+user,origin,'content-type':'application/json'},body:JSON.stringify(body)});

test('notification manager can delete one, failed, or all log records',async()=>{
 const {db,env}=fixture();
 let response=await notificationLogApi85(request({id:'sent'}),env);assert.equal(response.status,200);assert.equal((await response.json()).deleted,1);assert.equal(db.prepare("SELECT count(*) n FROM notification_deliveries WHERE id='sent'").get().n,0);
 response=await notificationLogApi85(request({scope:'failed'}),env);assert.equal(response.status,200);assert.equal((await response.json()).deleted,2);assert.equal(db.prepare('SELECT count(*) n FROM notification_deliveries').get().n,0);
 db.prepare('INSERT INTO notification_deliveries(id,employee_id,title,message,status,dedupe_key,created_at) VALUES(?,?,?,?,?,?,?)').run('again',2,'測試','內容','sent','again','2026-10-02');
 response=await notificationLogApi85(request({scope:'all'}),env);assert.equal(response.status,200);assert.equal((await response.json()).deleted,1);assert.equal(db.prepare('SELECT count(*) n FROM notification_deliveries').get().n,0);
});

test('notification log deletion rejects ordinary staff, forged origins, and missing records',async()=>{
 const {env}=fixture();
 assert.equal((await notificationLogApi85(request({scope:'all'},'staff'),env)).status,403);
 assert.equal((await notificationLogApi85(request({scope:'all'},'boss','https://evil.test'),env)).status,403);
 assert.equal((await notificationLogApi85(request({id:'missing'}),env)).status,404);
 assert.equal((await notificationLogApi85(request({scope:'unknown'}),env)).status,400);
});

test('notification log controls provide single, failed and all deletion with confirmation',()=>{
 const source=fs.readFileSync(new URL('../dist/enhancements-v85.js',import.meta.url),'utf8');
 assert.match(source,/data-notification-log-delete87/);
 assert.match(source,/清除失敗紀錄/);
 assert.match(source,/清除全部/);
 assert.match(source,/confirmAction\(message\)/);
 assert.match(source,/method:'DELETE'/);
});

test('a browser subscription made with the old public key is stopped and asks to reopen notifications',async()=>{
 const source=fs.readFileSync(new URL('../dist/notifications-v82.js',import.meta.url),'utf8'),publicKey=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8')).vars.VAPID_PUBLIC_KEY;
 let unsubscribed=0;const button={textContent:'',disabled:true,classList:{remove(){},toggle(){}}},subscription={options:{applicationServerKey:new Uint8Array(65).buffer},unsubscribe:async()=>{unsubscribed++}},registration={pushManager:{getSubscription:async()=>subscription}};
 const context=vm.createContext({atob,Uint8Array,setTimeout,clearTimeout,navigator:{serviceWorker:{ready:Promise.resolve(registration)}},window:{PushManager:{},Notification:{}},Notification:{permission:'granted'},document:{querySelector:selector=>selector==='#notification-enable82'?button:null},localStorage:{getItem:()=> 'old-device',removeItem(){}},apiFetch:async url=>({ok:true,json:async()=>url.endsWith('push-public-key')?{publicKey}:{items:[{id:'old-device',enabled:true}],personEnabled:true}})});
 vm.runInContext(source.slice(0,source.indexOf('function notificationAddButton82')),context);await context.notificationUpdateButton82();
 assert.equal(unsubscribed,1);assert.equal(button.textContent,'金鑰已更新，請重新開啟通知');assert.equal(button.disabled,false);
});
