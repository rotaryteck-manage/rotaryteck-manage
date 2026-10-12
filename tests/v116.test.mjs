import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createECDH,randomBytes,createPublicKey,verify} from 'node:crypto';
import webpush from 'web-push';
import ece from 'http_ece';
import {encryptPush116,pushAuthorization116,sendNativePush116} from '../worker/push116.mjs';
import {runScheduledEvent116} from '../worker/server.mjs';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
const b64=bytes=>Buffer.from(bytes).toString('base64url');
function device(){const privateKey=createECDH('prime256v1');privateKey.generateKeys();const auth=randomBytes(16);return{privateKey,auth,subscription:{endpoint:'https://fcm.googleapis.com/test116',keys:{p256dh:b64(privateKey.getPublicKey()),auth:b64(auth)}}}}

test('11.6v native encryption can be decrypted by the independent existing Web Push decoder',async()=>{
 const {privateKey,auth,subscription}=device(),payload=JSON.stringify({title:'工作提醒',body:'傅睿禾：SJ70-40（環片整理）',url:'/?notificationDay=2026-10-12#schedule',tag:'same',renotify:true});
 const encrypted=await encryptPush116(subscription,payload);
 assert.equal(ece.decrypt(Buffer.from(encrypted),{version:'aes128gcm',privateKey,authSecret:auth}).toString(),payload);
 const second=await encryptPush116(subscription,payload);assert.notDeepEqual(encrypted,second);
});

test('11.6v VAPID uses a verified ES256 signature, exact push-service audience and original keys',async()=>{
 const keys=webpush.generateVAPIDKeys(),details={...keys,subject:'mailto:test@local.test'},clock=Date.now(),authorization=await pushAuthorization116('https://web.push.apple.com/path',details,clock),jwt=authorization.match(/^vapid t=([^,]+), k=/)[1],parts=jwt.split('.'),pub=Buffer.from(keys.publicKey,'base64url');
 assert.equal(authorization.split(', k=')[1],keys.publicKey);
 const claims=JSON.parse(Buffer.from(parts[1],'base64url'));assert.equal(claims.aud,'https://web.push.apple.com');assert.equal(claims.sub,details.subject);assert.equal(claims.exp,Math.floor(clock/1000)+43200);
 const key=createPublicKey({format:'jwk',key:{kty:'EC',crv:'P-256',x:b64(pub.subarray(1,33)),y:b64(pub.subarray(33))}});
 assert.ok(verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')));
 const other=webpush.generateVAPIDKeys(),rotated=await pushAuthorization116('https://web.push.apple.com/path',{...other,subject:details.subject},clock);assert.notEqual(rotated,authorization);
});

test('11.6v provider acceptance, rejection and redirects retain safe delivery semantics',async()=>{
 const {subscription}=device(),options={vapidDetails:{...webpush.generateVAPIDKeys(),subject:'mailto:test@local.test'},TTL:3600,timeout:15000};
 const result=await sendNativePush116(subscription,'測試',options,async(url,request)=>{assert.equal(url,subscription.endpoint);assert.equal(request.redirect,'manual');assert.equal(request.headers['Content-Encoding'],'aes128gcm');assert.equal(request.headers.TTL,'3600');assert.ok(request.signal);return new Response(null,{status:201})});assert.equal(result.statusCode,201);
 await assert.rejects(sendNativePush116(subscription,'測試',options,async()=>new Response('expired',{status:410})),error=>error.statusCode===410&&error.body==='expired');
 await assert.rejects(encryptPush116(subscription,'a'.repeat(3994)),/長度限制/);
});

test('11.6v production cron uses native cryptography and writes durable receipt/inbox once',async()=>{
 const {db,DB}=database();migrations85(db);const now=Date.now(),day=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),stamp=new Date(now).toISOString(),keys=webpush.generateVAPIDKeys(),{subscription}=device(),env={DB,...{VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'}};
 const rule={id:'w116',enabled:true,type:'work',category:'工作排程',name:'工作',title:'工作提醒',message:'{人員}：{工作清單}',time:'00:00',firstDays:0,repeatDays:0,target:'work-record',recipientMode:'auto',recipientIds:[]};
 db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,0,?)').run('warehouse-main',JSON.stringify({notificationRules:[rule]}),stamp);
 db.prepare("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'one','one@local.test','測試人員','viewer','active',?,?)").run(stamp,stamp);
 db.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,assignee_ids,sort_index) VALUES('j116','daily',?,?,'測試工作','','','','[]',0,'','1','測試人員',?,?,0,'[1]',0)").run(day,day,stamp,stamp);
 db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('d116',1,subscription.endpoint,subscription.keys.p256dh,subscription.keys.auth,'測試手機','test',1,stamp,stamp,stamp);
 let sends=0;const original=globalThis.fetch;globalThis.fetch=async()=>{sends++;return new Response(null,{status:201})};
 try{const ctx={waitUntil(){}};await runScheduledEvent116({cron:'*/3 * * * *',scheduledTime:now},env,ctx);await runScheduledEvent116({cron:'*/3 * * * *',scheduledTime:now+180000},env,ctx);assert.equal(sends,1);assert.equal(db.prepare("SELECT COUNT(*) n FROM notification_receipts921 WHERE status='sent'").get().n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM notification_inbox88').get().n,1);assert.equal(db.prepare('SELECT status FROM notification_scheduler_status108 WHERE id=1').get().status,'ok')}finally{globalThis.fetch=original}
});

test('11.6v maintenance is separate, due-only queries and non-browser execution preserve the UI',()=>{
 const server=fs.readFileSync('worker/server.mjs','utf8'),config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
 assert.deepEqual(config.triggers.crons,['*/3 * * * *','1 * * * *']);assert.match(server,/event\.cron==='1 \* \* \* \*'/);assert.match(server,/if\(!context\)await cleanupNotificationHistory921/);assert.match(server,/needsReports\?/);assert.match(server,/NOTIFICATION_RUNTIME116:true/);
 assert.match(fs.readFileSync('build.mjs','utf8'),/worker\/push116\.mjs/);
});
