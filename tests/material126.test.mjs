import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import ece from 'http_ece';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {runtime125} from './helpers/runtime125.mjs';
import {scheduleMaterialUploadWithNotification88,runScheduledEvent116} from '../worker/server.mjs';
function fixture(){
 const {db,DB}=database();migrations85(db);const keys=webpush.generateVAPIDKeys(),ec=createECDH('prime256v1');ec.generateKeys();const auth=randomBytes(16),now=new Date().toISOString(),env={DB,VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test',UPLOADS:{put:async()=>{},delete:async()=>{}}};
 for(const [id,name,role]of [[1,'主管','supervisor'],[2,'倉管','warehouse']])db.prepare("INSERT INTO employees(id,email,name,role,status,created_at,updated_at) VALUES(?,?,?,?,'active',?,?)").run(id,id+'@test',name,role,now,now);
 const employee={id:1,name:'主管',role:'supervisor',status:'active',permissions:['schedule.view','schedule.material.create','schedule.material.edit','schedule.material.author']},rule={id:'mat126',enabled:true,type:'material',category:'料件紀錄',name:'料件通知',title:'{類型}紀錄通知',message:'{登記人}新增了 {案件名稱}的{類型}紀錄。',time:'00:00',firstDays:0,repeatDays:0,target:'material-record',recipientMode:'auto',recipientIds:[],materialCategories:['收料'],excludeActor:true};
 db.prepare('INSERT INTO company_state VALUES(?,?,0,?)').run('warehouse-main',JSON.stringify({notificationRules:[rule]}),now);db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('phone',2,'https://fcm.googleapis.com/test',ec.getPublicKey().toString('base64url'),auth.toString('base64url'),'手機','test',1,now,now,now);
 return{db,env,employee,ec,auth,rule};
}
function request(id,revision='0',title='螺絲'){const form=new FormData();for(const [key,value]of Object.entries({id,revision,day:'2026-10-15',projectName:'FAA',category:'收料',quantity:'1',title}))form.set(key,value);return new Request('https://site.test/api/schedule-material-upload',{method:'POST',headers:{origin:'https://site.test'},body:form})}
test('material save returns a durable row before a slow provider completes; ciphertext is decryptable and inbox appears once',async()=>{
 const f=fixture();let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);const r=runtime125(f.env,async(_url,options)=>{const decoded=JSON.parse(ece.decrypt(Buffer.from(options.body),{version:'aes128gcm',privateKey:f.ec,authSecret:f.auth}).toString());assert.equal(decoded.title,'收料紀錄通知');assert.match(decoded.url,/notificationMaterial=material126/);assert.equal(decoded.receipt126.key,'material:mat126:material126:2:phone');entered();await gate;return new Response(null,{status:201})});
 try{const response=await scheduleMaterialUploadWithNotification88(request('material126'),f.env,f.employee,r.ctx);assert.equal(response.status,200);const data=await response.json();assert.equal(data.item.title,'螺絲');assert.equal(data.created,true);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM material_pending126').get().n,1);await started;assert.equal(f.db.prepare('SELECT COUNT(*) n FROM schedule_entries').get().n,1);release();await r.drain();assert.equal(r.counts().pushes,1);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM notification_inbox88').get().n,1);assert.equal(f.db.prepare('SELECT status FROM material_events126').get().status,'sent');
  const edit=await scheduleMaterialUploadWithNotification88(request('material126',String(data.item.revision),'改名稱'),f.env,f.employee,r.ctx);assert.equal(edit.status,200);assert.equal((await edit.json()).created,false);await r.drain();assert.equal(r.counts().pushes,1);
 }finally{release();r.restore()}
});
test('pending material survives a failed internal call, resumes via cron, and does not backfill old records or new devices',async()=>{
 const f=fixture(),original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('temporary internal failure')};const tasks=[];
 try{assert.equal((await scheduleMaterialUploadWithNotification88(request('pending126'),f.env,f.employee,{waitUntil:p=>tasks.push(p)})).status,200);await Promise.all(tasks)}finally{globalThis.fetch=original}
 assert.equal(f.db.prepare('SELECT status FROM material_pending126').get().status,'pending');
 // A pre-upgrade material record has no new pending marker.
 f.db.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at) VALUES('historic126','material','2026-10-14','2026-10-14','舊料件','','','','收料',1,'','1','主管','old','old')").run();
 const r=runtime125(f.env);try{await runScheduledEvent116({cron:'*/3 * * * *',scheduledTime:Date.now()},f.env,r.ctx);await r.drain();assert.equal(r.counts().pushes,1);f.db.prepare("INSERT INTO push_subscriptions SELECT 'new-phone',employee_id,endpoint||'new',p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at,last_success_at,last_error_at,failure_count FROM push_subscriptions WHERE id='phone'").run();await runScheduledEvent116({cron:'*/3 * * * *',scheduledTime:Date.now()+180000},f.env,r.ctx);await r.drain();assert.equal(r.counts().pushes,1)}finally{r.restore()}
});
test('invalid material save does not leave a background notification marker',async()=>{const f=fixture();const response=await scheduleMaterialUploadWithNotification88(request('bad','0',''),f.env,f.employee,{waitUntil(){throw Error('must not enqueue')}});assert.equal(response.status,400);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM material_pending126').get().n,0)});
