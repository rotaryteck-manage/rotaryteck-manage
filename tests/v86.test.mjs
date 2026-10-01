import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import webpush from 'web-push';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {scheduleApi} from '../worker/schedule.mjs';
import {pushKeyStatus86,pushTestApi82} from '../worker/server.mjs';
import {builtinProfiles} from '../worker/wire-permissions.mjs';

globalThis.fetch=async(_input,options)=>{const id=new Headers(options.headers).get('authorization')?.slice(7);return Response.json({id,email:id+'@local.test'});};
function fixture(){
 const {db,DB}=database();migrations85(db);
 db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'boss','boss@local.test','主管','supervisor','active','now','now'),(2,'staff','staff@local.test','甲','viewer','active','now','now'),(3,'staff2','staff2@local.test','乙','viewer','active','now','now')");
 return{db,DB,env:{DB,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test'},boss:{id:1,name:'主管',permissions:builtinProfiles[0].permissions}};
}
const req=(body,user='boss')=>new Request('https://local.test/api/schedule',{method:'POST',headers:{Authorization:'Bearer '+user,origin:'https://local.test','content-type':'application/json'},body:JSON.stringify(body)});
const entry=(title,revision=0)=>({kind:'daily',id:'job',revision,day:'2026-10-02',endDay:'2026-10-02',title,assignee:'["甲"]',category:'["製作"]',color:'#4e8069',note:''});

test('work item is enforced by the managed list while an unchanged historical value remains editable',async()=>{
 const {env,boss}=fixture();
 assert.equal((await scheduleApi(req({kind:'options',items:['組裝'],contents:[]}),env,boss)).status,200);
 assert.equal((await scheduleApi(req(entry('自由輸入')),env,boss)).status,400);
 assert.equal((await scheduleApi(req(entry('組裝')),env,boss)).status,200);
 assert.equal((await scheduleApi(req({kind:'options',items:['測試'],contents:[]}),env,boss)).status,200);
 assert.equal((await scheduleApi(req(entry('組裝',1)),env,boss)).status,200);
 assert.equal((await scheduleApi(req(entry('自由輸入',2)),env,boss)).status,400);
 const delegated={id:1,name:'主管',permissions:['schedule.options']},response=await scheduleApi(new Request('https://local.test/api/schedule?view=options'),env,delegated);
 assert.equal(response.status,200);assert.deepEqual((await response.json()).items,['測試']);
});

test('notification key status distinguishes missing, mismatched and matching private keys without returning secrets',async()=>{
 const {env}=fixture(),one=webpush.generateVAPIDKeys(),two=webpush.generateVAPIDKeys(),request=new Request('https://local.test/api/push-public-key?status=1',{headers:{Authorization:'Bearer boss'}});
 env.VAPID_PUBLIC_KEY=one.publicKey;env.VAPID_SUBJECT='mailto:test@local.test';
 let data=await (await pushKeyStatus86(request,env)).json();assert.equal(data.status,'missing-private');assert.equal(JSON.stringify(data).includes(one.privateKey),false);
 env.VAPID_PRIVATE_KEY=two.privateKey;data=await (await pushKeyStatus86(request,env)).json();assert.equal(data.status,'mismatch');
 env.VAPID_PRIVATE_KEY=one.privateKey;data=await (await pushKeyStatus86(request,env)).json();assert.deepEqual(data,{ok:true,status:'ready',message:'通知金鑰設定正常且互相配對'});
});

test('all-person test notification sends only to active devices of people not paused by the administrator',async()=>{
 const {db,env}=fixture(),keys=webpush.generateVAPIDKeys(),now=new Date().toISOString();
 env.VAPID_PUBLIC_KEY=keys.publicKey;env.VAPID_PRIVATE_KEY=keys.privateKey;env.VAPID_SUBJECT='mailto:test@local.test';
 for(const [id,employee]of [['d2',2],['d3',3]])db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,employee,'https://fcm.googleapis.com/'+id,'x','x','手機','test',1,now,now,now);
 db.prepare('INSERT INTO notification_people(employee_id,enabled,updated_at) VALUES(3,0,?)').run(now);
 const original=webpush.sendNotification;let sends=0;webpush.sendNotification=async()=>{sends++};
 try{const response=await pushTestApi82(new Request('https://local.test/api/push-test',{method:'POST',headers:{Authorization:'Bearer boss',origin:'https://local.test','content-type':'application/json'},body:JSON.stringify({employeeId:'all'})}),env),data=await response.json();assert.equal(response.status,200);assert.equal(data.employeeName,'全員');assert.equal(data.employeeCount,1);assert.equal(data.sent,1);assert.equal(sends,1);}finally{webpush.sendNotification=original}
});

test('mobile daily rows always show work, leave, then current daily records and never the legacy receipt entry',()=>{
 const source=fs.readFileSync(new URL('../dist/mobile-v78.js',import.meta.url),'utf8'),ctx={matchMedia:()=>({matches:true}),scheduleData56:{entries:[{kind:'daily',day:'2026-10-02',end_day:'2026-10-02'},{kind:'material',id:'m',day:'2026-10-02',project_name:'FAA',title:'螺絲',category:'收料'}],reports:[],leaves:[{start_at:'2026-10-02T08:00',end_at:'2026-10-02T12:00'}]},canDo:()=>true,leaveOnDay72:()=>true,scheduleMaterial56:()=>[{day:'2026-10-02'}]};
 vm.runInNewContext(source.slice(0,source.indexOf('function mobileOpen79')),ctx);assert.deepEqual(Array.from(ctx.mobileRows78('2026-10-02'),x=>x.title),['工作紀錄','請假紀錄','FAA螺絲']);
});

test('creating a warehouse project does not create a receipt or issue history',()=>{
 const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),start=source.indexOf('function newProject()'),end=source.indexOf('function editSiteText',start);let submit;
 const controls={'#more-manual':{},'#entry-mode':{},'#manual-rows':{insertAdjacentHTML(){},querySelectorAll:()=>[]}},ctx={field:()=>'',modal:(_a,_b,_c,fn)=>submit=fn,locationFields:()=>'',esc:String,siteText:x=>x,integer:x=>Number(x),crypto,locationFromForm:()=>'',state:{projects:[]},selectedId:'',query:'',log(){},done(){},importDialog(){},$:x=>controls[x]};
 vm.runInNewContext(source.slice(start,end),ctx);ctx.newProject();const values={projectDate:'2026-10-02',name:'測試庫房',basketCount:'1',sets:'1',mode:'manual',partname0:'螺絲',partspec0:'M3',partneed0:'5'};submit({get:key=>values[key]??''});assert.equal(ctx.state.projects.length,1);assert.equal(Object.hasOwn(ctx.state.projects[0],'materialLogs'),false);
});

test('notification administration provides all-person sending and collapsed rule, log and device sections',()=>{
 const admin=fs.readFileSync(new URL('../dist/admin-layout.js',import.meta.url),'utf8'),enhancement=fs.readFileSync(new URL('../dist/enhancements-v86.js',import.meta.url),'utf8');
 assert.match(admin,/value="all">全員/);assert.match(admin,/<details class="notification-person-devices82">/);assert.match(enhancement,/notificationFold86\(panels\[0\],'通知規則'/);assert.match(enhancement,/notificationFold86\(panels\[1\],'通知紀錄'/);
});
