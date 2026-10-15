import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {runtime125} from './helpers/runtime125.mjs';
import {runScheduledEvent116,notificationRuntimeWithServices125} from '../worker/server.mjs';
import {notificationCall125,notificationClaimBudget125,notificationTasks125,notificationCleanup125} from '../worker/notifications125.mjs';
import {splitState} from '../worker/state-codec.mjs';
function fixture(count=7){
 const {db,DB}=database();migrations85(db);const now=Date.now(),stamp=new Date(now).toISOString(),day=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),keys=webpush.generateVAPIDKeys(),env={DB,VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'};
 const rule={id:'work125',enabled:true,type:'work',category:'工作排程',name:'工作',title:'工作提醒',message:'{人員}：{工作清單}',time:'00:00',firstDays:0,repeatDays:0,target:'work-record',recipientMode:'auto',recipientIds:[]};
 db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,0,?)').run('warehouse-main',JSON.stringify({notificationRules:[rule]}),stamp);
 for(let id=1;id<=count;id++){
  db.prepare("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(?,?,?,?,'viewer','active',?,?)").run(id,'u'+id,id+'@local.test','人員'+id,stamp,stamp);
  db.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,assignee_ids,sort_index) VALUES(?,'daily',?,?,'本日工作','','','','[]',0,'','1','主管',?,?,0,?,0)").run('job'+id,day,day,stamp,stamp,JSON.stringify([id]));
  device(db,id,'d'+id,stamp);
 }
 return{db,env,now,stamp,day,rule};
}
function device(db,id,name,stamp){const ec=createECDH('prime256v1');ec.generateKeys();db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(name,id,'https://fcm.googleapis.com/'+name,ec.getPublicKey().toString('base64url'),randomBytes(16).toString('base64url'),'手機','test',1,stamp,stamp,stamp)}
async function tick(f,r,now=f.now){await runScheduledEvent116({cron:'*/3 * * * *',scheduledTime:now},f.env,r.ctx);await r.drain()}
test('12.5 cron starts signed stages; seven people use independent pushes; next round never resends',async()=>{
 const f=fixture(),r=runtime125(f.env);try{await tick(f,r);assert.equal(r.counts().pushes,7);assert.ok(r.counts().invocations>14);assert.equal(f.db.prepare('SELECT status FROM notification_scheduler_status108').get().status,'ok');assert.equal(f.db.prepare("SELECT COUNT(*) n FROM notification_tasks125 WHERE kind='dispatch' AND status='done'").get().n,7);await tick(f,r,f.now+180000);assert.equal(r.counts().pushes,7)}finally{r.restore()}
});
test('12.5 frozen audiences exclude a new device, stopped person and historical notification',async()=>{
 const f=fixture(2),r=runtime125(f.env);f.db.prepare("INSERT INTO notification_people(employee_id,enabled,updated_at) VALUES(2,0,'now')").run();try{await tick(f,r);assert.equal(r.counts().pushes,1);device(f.db,1,'new-device',f.stamp);await tick(f,r,f.now+180000);assert.equal(r.counts().pushes,1);f.db.prepare('UPDATE notification_release123 SET cutoff=?').run(new Date(f.now+86400000).toISOString());await tick(f,r,f.now+360000);assert.equal(r.counts().pushes,1)}finally{r.restore()}
});
test('12.5 failed provider is retried without repeating another successful device',async()=>{
 const f=fixture(1);device(f.db,1,'failed-device',f.stamp);let bad=0;const r=runtime125(f.env,async url=>String(url).endsWith('failed-device')&&bad++===0?new Response('temporary',{status:503}):new Response(null,{status:201}));try{await tick(f,r);await tick(f,r,f.now+180000);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM notification_deliveries WHERE status='sent'").get().n,2);assert.equal(r.counts().pushes,3)}finally{r.restore()}
});
test('12.5 invalid signatures and browser requests cannot invoke pushes or checks',async()=>{
 const f=fixture(0),ctx={waitUntil(){throw Error('must not run')}};for(const request of [new Request('https://site.test/api/notification-runtime125'),new Request('https://site.test/api/notification-runtime125',{method:'POST',body:'{}'}),new Request('https://site.test/api/notification-runtime125',{method:'POST',headers:{'X-Notification-Signature125':'a'.repeat(64)},body:'{}'})]){const response=await notificationRuntimeWithServices125(request,f.env,ctx);assert.ok([403,405].includes(response.status))}assert.equal(f.db.prepare('SELECT COUNT(*) n FROM notification_runs125').get().n,0);
});
test('12.5 stale processing stage resumes next round and only sends once',async()=>{
 const f=fixture(1),r=runtime125(f.env);const id=new Date(f.now).toISOString();f.db.prepare("INSERT INTO notification_runs125 VALUES(?,?,'running',0,?)").run(id,id,f.stamp);await notificationTasks125(f.env,id,'stale',[{kind:'rule',payload:{ruleId:f.rule.id,now:f.now}}],10);f.db.prepare("UPDATE notification_tasks125 SET status='processing',attempts=1,updated_at=?").run(new Date(f.now-100000).toISOString());try{await tick(f,r);assert.equal(r.counts().pushes,1);assert.equal(f.db.prepare("SELECT attempts FROM notification_tasks125 WHERE id='stale:0'").get().attempts,2);await tick(f,r,f.now+180000);assert.equal(r.counts().pushes,1)}finally{r.restore()}
});
test('12.5 run budget remains 32, durable inserts are idempotent, and settings/UI stay intact',async()=>{
 const f=fixture(0);f.db.prepare("INSERT INTO notification_runs125 VALUES('budget','now','running',0,'now')").run();const env={...f.env,NOTIFICATION_RUN125:'budget'};for(let i=0;i<32;i++)assert.equal(await notificationClaimBudget125(env),true);assert.equal(await notificationClaimBudget125(env),false);const tasks=[{kind:'rule',payload:{ruleId:'r'}}];await notificationTasks125(env,'budget','parent',tasks);await notificationTasks125(env,'budget','parent',tasks);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM notification_tasks125').get().n,1);const config=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));assert.deepEqual(config.triggers.crons,['*/3 * * * *','1 * * * *']);assert.match(fs.readFileSync(new URL('../dist/enhancements-v111.js',import.meta.url),'utf8'),/12\.6v/);
});
test('12.5 deployment boundary holds old unsent notices without clearing receipts or manual history',async()=>{
 const f=fixture(1),r=runtime125(f.env);try{await tick(f,r);f.db.prepare("UPDATE notification_deliveries SET status='failed',retry_count=0").run();f.db.prepare("UPDATE notification_receipts921 SET status='failed',attempts=1").run();const cutoff=new Date(f.now+1000).toISOString();f.db.prepare('UPDATE notification_runtime_meta125 SET cutoff=?').run(cutoff);await tick(f,r,f.now+180000);assert.equal(r.counts().pushes,1);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM notification_deliveries WHERE status='failed'").get().n,1);f.db.exec(fs.readFileSync(new URL('../drizzle/0037_notification_runtime125.sql',import.meta.url),'utf8'));assert.equal(f.db.prepare('SELECT cutoff FROM notification_runtime_meta125').get().cutoff,cutoff)}finally{r.restore()}
});
test('12.5 future scheduled work after the deployment boundary sends normally',async()=>{
 const f=fixture(1),future=f.now+120000,time=new Date(future).toLocaleTimeString('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});f.rule.time=time;f.db.prepare('UPDATE company_state SET body=?').run(JSON.stringify({notificationRules:[f.rule]}));f.db.prepare('UPDATE notification_runtime_meta125 SET cutoff=?').run(f.stamp);const r=runtime125(f.env);try{await tick(f,r);assert.equal(r.counts().pushes,0);await tick(f,r,future);assert.equal(r.counts().pushes,1)}finally{r.restore()}
});
test('12.5 wire and plating slim reads preserve summaries and each invocation stays under 50 SQL queries',async()=>{
 const f=fixture(1),rule=(id,type,target)=>({...f.rule,id,type,target,recipientMode:'selected',recipientIds:[1],message:'{數量}筆 {案件名稱} {電鍍內容}'}),state={notificationRules:[rule('wire125','wire','wire-restock'),rule('plating125','plating','plating-overview')],wireTypes:[{id:'t',name:'線材',irrelevant:'x'.repeat(100000)}],wireReels:Array.from({length:70},(_,i)=>({id:'r'+i,wireId:'t',status:'low',restock:{id:'round'+i,reported:{time:f.stamp}}})),platingProjects:[{id:'p',name:'FAA',archived:false,shipments:[{id:'s',number:1,sent:f.day,returned:'',note:'待回貨',groups:[{huge:'x'.repeat(100000)}]},{id:'returned',number:2,sent:f.day,returned:f.day,note:'已回貨'}]}]};
 f.db.prepare("INSERT INTO state_storage_meta VALUES(1,1,1,?)").run(f.stamp);for(const [key,value] of Object.entries(splitState(state)))f.db.prepare('INSERT INTO state_records(record_key,body,revision) VALUES(?,?,1)').run(key,JSON.stringify(value));
 const counts=[],native=f.env.DB;function environment(){const count={n:0};counts.push(count);const bump=n=>{count.n+=n;assert.ok(count.n<=50,'stage SQL count '+count.n)};const DB={prepare(sql){const wrap=stmt=>({bind(...args){return wrap(stmt.bind(...args))},first(){bump(1);return stmt.first()},all(){bump(1);return stmt.all()},run(){bump(1);return stmt.run()},execute(){return stmt.execute()}});return wrap(native.prepare(sql))},batch(statements){bump(statements.length);return native.batch(statements)}};return{...f.env,DB}}
 const r=runtime125(f.env,async()=>new Response(null,{status:201}),environment);try{await tick(f,r);assert.equal(r.counts().pushes,2);const inbox=f.db.prepare('SELECT message FROM notification_inbox88').all();assert.ok(inbox.some(row=>row.message.includes('70')));assert.ok(inbox.some(row=>row.message.includes('FAA')&&row.message.includes('待回貨')));assert.ok(counts.every(c=>c.n<=50))}finally{r.restore()}
});
test('12.5 simultaneous cron launches share one live run and do not reset counters or repeat devices',async()=>{
 const f=fixture(2),r=runtime125(f.env);try{const event={cron:'*/3 * * * *',scheduledTime:f.now};await Promise.all([runScheduledEvent116(event,f.env,r.ctx),runScheduledEvent116(event,f.env,r.ctx)]);await r.drain();assert.equal(r.counts().pushes,2);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM notification_runs125').get().n,1);assert.equal(f.db.prepare('SELECT sent FROM notification_scheduler_status108').get().sent,2)}finally{r.restore()}
});
test('12.5 an exhausted stage does not permanently block future automatic runs',async()=>{
 const f=fixture(1),id=f.stamp;f.db.prepare("INSERT INTO notification_runs125 VALUES(?,?,'running',0,?)").run(id,id,id);await notificationTasks125(f.env,id,'broken',[{kind:'unknown',payload:{}}],10);const r=runtime125(f.env);try{for(const delta of [0,180000,360000,540000]){f.db.prepare("UPDATE notification_tasks125 SET updated_at=? WHERE status='failed'").run(new Date(Date.now()-100000).toISOString());await tick(f,r,f.now+delta)}assert.equal(f.db.prepare('SELECT status FROM notification_runs125 WHERE id=?').get(id).status,'failed');await tick(f,r,f.now+590000);assert.equal(r.counts().pushes,1);assert.equal(f.db.prepare('SELECT status FROM notification_scheduler_status108').get().status,'ok')}finally{r.restore()}
});
test('12.5 large queues stop at bounded depth, resume, and never exceed the 32-device run budget',async()=>{
 const f=fixture(40),hops=[],r=runtime125(f.env,async()=>new Response(null,{status:201}),(_,options)=>{const body=JSON.parse(options.body);if(body.action==='step')hops.push(body.input.hop);return f.env});try{for(const delta of [0,180000,360000,540000])await tick(f,r,f.now+delta);assert.equal(r.counts().pushes,40);assert.ok(hops.every(hop=>hop>=0&&hop<=7));assert.ok(f.db.prepare('SELECT attempts FROM notification_runs125').all().every(row=>row.attempts<=32));assert.equal(f.db.prepare("SELECT COUNT(*) n FROM notification_receipts921 WHERE status='sent'").get().n,40)}finally{r.restore()}
});
test('12.5 cleanup removes only old finished diagnostic jobs, not actual notification history or active work',async()=>{
 const f=fixture(0),old=new Date(f.now-8*86400000).toISOString();f.db.prepare("INSERT INTO notification_runs125 VALUES('finished',?,'done',0,?)").run(old,old);f.db.prepare("INSERT INTO notification_runs125 VALUES('active',?,'running',0,?)").run(old,old);f.db.prepare("INSERT INTO notification_tasks125 VALUES('old','finished','rule','{}',10,'done',1,?,'')").run(old);await notificationTasks125(f.env,'active','current',[{kind:'rule',payload:{}}]);await notificationCleanup125(f.env,f.now);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM notification_runs125 WHERE id='finished'").get().n,0);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM notification_runs125 WHERE id='active'").get().n,1);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM notification_tasks125').get().n,1);
});
