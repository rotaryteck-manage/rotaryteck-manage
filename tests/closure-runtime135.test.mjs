import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {runtime125} from './helpers/runtime125.mjs';
import {runScheduledEvent116,runNotifications85} from '../worker/server.mjs';
import {closureGovernmentURL135,parseClosureGovernment135,closureRecord135} from '../worker/closure135.mjs';
import {splitState} from '../worker/state-codec.mjs';
function device(f,id,person){const key=createECDH('prime256v1');key.generateKeys();f.db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,1,?,?,?)').run(id,person,'https://push.test/'+id,key.getPublicKey().toString('base64url'),randomBytes(16).toString('base64url'),'手機','test',f.stamp,f.stamp,f.stamp)}
function fixture(count=2){
 const {db,DB}=database();migrations85(db);const now=Date.now(),stamp=new Date(now).toISOString(),day=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),keys=webpush.generateVAPIDKeys(),env={DB,VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'},rule={id:'closure135',enabled:true,type:'closure',category:'停班提醒',name:'停班',title:'{停班日期}停班通知',message:'{人員}｜{縣市}{行政區}｜{停班狀態}',city:'高雄市',district:'左營區',time:'23:59',firstDays:0,repeatDays:0,target:'schedule',recipientMode:'auto',recipientIds:[]};
 const f={db,env,now,stamp,day,rule,text:'明天停止上班、停止上課。',sourceFailed:false,networkFailed:false,pushes:[],requests:[],failDevice:'',failCount:0};
 const body={projects:[],deletedProjects:[],logs:[],notificationRules:[rule]};db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,0,?)').run('warehouse-main',JSON.stringify(body),stamp);
 db.prepare('INSERT INTO state_storage_meta VALUES(1,1,1,?)').run(stamp);for(const [key,value] of Object.entries(splitState(body)))db.prepare('INSERT INTO state_records(record_key,body,revision) VALUES(?,?,1)').run(key,JSON.stringify(value));
 f.add=(id,name='人員'+id)=>{db.prepare("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(?,?,?,?,'supervisor','active',?,?)").run(id,'u'+id,id+'@local.test',name,stamp,stamp)};
 for(let id=1;id<=count;id++){f.add(id);device(f,'d'+id,id)}
 f.html=()=>'<div class="Header_YMD">'+(Number(day.slice(0,4))-1911)+'年'+Number(day.slice(5,7))+'月'+Number(day.slice(8,10))+'日 天然災害停止上班及上課情形</div><h4>更新時間：'+day.replaceAll('-','/')+' '+new Date(now).toLocaleTimeString('en-GB',{timeZone:'Asia/Taipei',hour12:false})+'</h4><table><tr><td>高雄市</td><td>'+f.text+'</td></tr></table>';
 f.provider=async(url,options)=>{f.requests.push(String(url));if(String(url)===closureGovernmentURL135){if(f.networkFailed)throw Error('test offline');return new Response(f.sourceFailed?'<WarningMessage>請先登入會員。</WarningMessage>':f.html(),{status:200})}assert.ok(String(url).startsWith('https://push.test/'),'unexpected network '+url);f.pushes.push(String(url));if(f.failDevice&&String(url).endsWith(f.failDevice)&&f.failCount++===0)return new Response('temporary',{status:503});return new Response(null,{status:201})};
 f.saveRules=()=>{db.prepare('UPDATE company_state SET body=?').run(JSON.stringify({...body,notificationRules:[f.rule]}));db.prepare('UPDATE state_records SET body=? WHERE record_key=?').run(JSON.stringify([f.rule]),JSON.stringify(['root','notificationRules']))};
 return f;
}
async function tick(f,r,now=f.now){await runScheduledEvent116({cron:'*/3 * * * *',scheduledTime:now},f.env,r.ctx);await r.drain()}
test('13.5 real scheduled pipeline observes, enqueues and pushes once per device; repeat cron does not resend',async()=>{
const f=fixture(),r=runtime125(f.env,f.provider);try{await tick(f,r);assert.equal(f.pushes.length,2,JSON.stringify(f.db.prepare('SELECT * FROM notification_source_state90').all()));assert.equal(f.db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,2);assert.equal(f.db.prepare("SELECT count(*) n FROM notification_closure_deliveries135 WHERE status='done'").get().n,2);for(let id=1;id<=2;id++){const expected='人員'+id+'｜高雄市左營區｜停止上班（全日）';assert.equal(f.db.prepare('SELECT message FROM notification_inbox88 WHERE employee_id=?').get(id).message,expected);assert.equal(f.db.prepare('SELECT message FROM notification_deliveries WHERE employee_id=?').get(id).message,expected)}await tick(f,r,f.now+180000);assert.equal(f.pushes.length,2);assert.equal(f.db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,2)}finally{r.restore()}
});
test('13.5 source failures and later recovery retain stable notices and never resend successful phones',async()=>{
 const f=fixture(),r=runtime125(f.env,f.provider);try{await tick(f,r);f.sourceFailed=true;await tick(f,r,f.now+180000);const row=f.db.prepare('SELECT * FROM notification_source_state90').get();assert.match(JSON.parse(row.detail).error,/登入/);assert.equal(row.status,'closed');f.sourceFailed=false;await tick(f,r,f.now+360000);assert.equal(f.pushes.length,2);assert.equal(f.db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,2)}finally{r.restore()}
});
test('13.5 school-only, school-staff or mountain-only announcement creates no bell or push',async()=>{
 for(const text of ['明天照常上班、停止上課。','茂林區、桃源區、那瑪夏區：明天停止上班、停止上課。','左營區某國民小學：明天停止上班、停止上課。']){const f=fixture(1);f.text=text;const r=runtime125(f.env,f.provider);try{await tick(f,r);assert.equal(f.pushes.length,0,text);assert.equal(f.db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,0)}finally{r.restore()}}
});
test('13.5 failed device can retry the same notice without repeating its successful sibling',async()=>{
 const f=fixture(1);device(f,'failed',1);f.failDevice='failed';const r=runtime125(f.env,f.provider);try{await tick(f,r);await tick(f,r,f.now+180000);assert.equal(f.pushes.filter(u=>u.endsWith('/d1')).length,1);assert.equal(f.db.prepare("SELECT count(*) n FROM notification_deliveries WHERE status='sent'").get().n,2);assert.equal(f.db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,1)}finally{r.restore()}
});
test('13.5 durable outbox recovers after observation before enqueue, even when the next source request fails',async()=>{
 const f=fixture(1),result=parseClosureGovernment135(f.html(),'高雄市','左營區',f.now);await closureRecord135(f.env,f.rule,result,null,f.now,[{id:1,name:'人員1'}],(s,v)=>s.replace(/\{([^{}]+)\}/g,(_,k)=>v[k]||''));f.networkFailed=true;const r=runtime125(f.env,f.provider);try{await tick(f,r);assert.equal(f.pushes.length,1);assert.equal(f.db.prepare("SELECT status FROM notification_closure_deliveries135").get().status,'done');assert.equal(f.db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,1)}finally{r.restore()}
});
test('13.5 recipients, disabled people and first-observation devices remain frozen across later changes',async()=>{
 const f=fixture(2);f.rule.recipientMode='selected';f.rule.recipientIds=[1];f.saveRules();const r=runtime125(f.env,f.provider);try{await tick(f,r);assert.deepEqual(f.pushes,['https://push.test/d1']);f.add(3,'新主管');device(f,'new-phone',1);device(f,'d3',3);f.rule.recipientIds=[1,2,3];f.saveRules();await tick(f,r,f.now+180000);assert.equal(f.pushes.length,1);assert.equal(f.db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,1)}finally{r.restore()}
});
test('13.5 genuine time correction gets one new notice, a changed update timestamp alone does not',async()=>{
 const f=fixture(1),r=runtime125(f.env,f.provider);try{await tick(f,r);f.text='明天下午01:00起停止上班、停止上課。';await tick(f,r,f.now+180000);assert.equal(f.pushes.length,2);assert.match(f.db.prepare('SELECT message FROM notification_inbox88 ORDER BY rowid DESC LIMIT 1').get().message,/13:00 起/);await tick(f,r,f.now+360000);assert.equal(f.pushes.length,2)}finally{r.restore()}
});
test('13.5 concurrent automatic and manual checks share durable event keys and device receipt guards',async()=>{
 const f=fixture(1),r=runtime125(f.env,f.provider);try{await Promise.all([runNotifications85({...f.env,NOTIFICATION_RUNTIME116:true},f.now),runNotifications85({...f.env,NOTIFICATION_RUNTIME116:true},f.now)]);await r.drain();assert.equal(f.pushes.length,1);assert.equal(f.db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,1);assert.equal(f.db.prepare('SELECT count(*) n FROM notification_closure_events135').get().n,1)}finally{r.restore()}
});
test('13.5 each scheduled invocation remains under the free 50-query budget',async()=>{
 const f=fixture(7),counts=[],native=f.env.DB;
 const environment=()=>{const counter={n:0};counts.push(counter);const bump=n=>{counter.n+=n;assert.ok(counter.n<=50,'stage SQL count '+counter.n)};const DB={prepare(sql){const wrap=stmt=>({bind(...a){return wrap(stmt.bind(...a))},first(){bump(1);return stmt.first()},all(){bump(1);return stmt.all()},run(){bump(1);return stmt.run()},execute(){return stmt.execute()}});return wrap(native.prepare(sql))},batch(statements){bump(statements.length);return native.batch(statements)}};return {...f.env,DB}};
 const r=runtime125(f.env,f.provider,environment);try{await tick(f,r);assert.equal(f.pushes.length,7);assert.ok(counts.every(c=>c.n<=50))}finally{r.restore()}
});
test('13.5 changing back to full-day or a genuine stop/open reversal is a new correction only once',async()=>{
 const f=fixture(1),r=runtime125(f.env,f.provider);try{await tick(f,r);f.text='明天下午停止上班。';await tick(f,r,f.now+60000);f.text='明天停止上班。';await tick(f,r,f.now+120000);assert.equal(f.pushes.length,3);await tick(f,r,f.now+180000);assert.equal(f.pushes.length,3);f.text='明天照常上班。';await tick(f,r,f.now+240000);assert.equal(f.pushes.length,4);await tick(f,r,f.now+300000);assert.equal(f.pushes.length,4);f.text='明天停止上班。';await tick(f,r,f.now+360000);assert.equal(f.pushes.length,5);await tick(f,r,f.now+420000);assert.equal(f.pushes.length,5)}finally{r.restore()}
});
test('13.5 switching from legacy feed reuses sent receipt and excludes newly added recipients/devices',async()=>{
 const f=fixture(2),day=new Date(Date.parse(f.day+'T12:00:00Z')+86400000).toISOString().slice(0,10),old='closure:'+f.rule.id+':'+day+':old-ncdr:closed:1';
 f.db.prepare("INSERT INTO notification_device_scopes121(source_key,employee_id,device_ids,created_at) VALUES(?,1,'[\"d1\"]',?)").run(old,f.stamp);
 f.db.prepare("INSERT INTO notification_inbox88(id,employee_id,category,title,message,target_url,source_key,created_at) VALUES('old',1,'停班提醒','舊通知','已收到','/',?,?)").run(old,f.stamp);
 f.db.prepare("INSERT INTO notification_receipts921(dedupe_key,status,attempts,created_at,updated_at,completed_at) VALUES(?,'sent',1,?,?,?)").run(old+':d1',f.stamp,f.stamp,f.stamp);device(f,'new-phone',1);
 const r=runtime125(f.env,f.provider);try{await tick(f,r);assert.equal(f.pushes.length,0);assert.equal(f.db.prepare('SELECT count(*) n FROM notification_inbox88').get().n,1);assert.equal(f.db.prepare('SELECT count(*) n FROM notification_closure_deliveries135').get().n,1);assert.equal(f.db.prepare('SELECT delivery_key FROM notification_closure_deliveries135').get().delivery_key,old)}finally{r.restore()}
});
test('13.5 a superseded pending closure is cancelled before a work-resumption correction is delivered',async()=>{
 const f=fixture(1),template=(s,v)=>s.replace(/\{([^{}]+)\}/g,(_,k)=>v[k]||'');await closureRecord135(f.env,f.rule,parseClosureGovernment135(f.html(),'高雄市','左營區',f.now),null,f.now,[{id:1,name:'人員1'}],template);f.text='明天照常上班。';await closureRecord135(f.env,f.rule,parseClosureGovernment135(f.html(),'高雄市','左營區',f.now),f.db.prepare('SELECT * FROM notification_source_state90').get(),f.now,[{id:1,name:'人員1'}],template);
 const r=runtime125(f.env,f.provider);try{await tick(f,r);assert.equal(f.pushes.length,1);assert.equal(f.db.prepare("SELECT count(*) n FROM notification_closure_deliveries135 WHERE status='cancelled'").get().n,1);assert.match(f.db.prepare('SELECT message FROM notification_deliveries').get().message,/照常上班/)}finally{r.restore()}
});
