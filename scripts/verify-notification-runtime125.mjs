// Local production-bundle/D1/WebCrypto isolation check. No real company data,
// credentials or push-provider requests. Local workerd does not enforce Free CPU.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
const {Miniflare}=await import(pathToFileURL(process.argv[2]).href);
const keys=webpush.generateVAPIDKeys(),origin='https://rotaryteck-manage.rotaryteckserve.workers.dev';
let mf,pushes=0,internal=0;
mf=new Miniflare({modules:true,compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['UPLOADS'],bindings:{VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@local.test'},script:fs.readFileSync(process.argv[3],'utf8'),outboundService:async request=>{
 // Miniflare reconstructs the custom outbound Request; redirect policy is
 // verified separately by the native push smoke test and unit transport tests.
 if(request.url.startsWith(origin+'/api/notification-runtime125')){internal++;return mf.dispatchFetch('https://local.test/api/notification-runtime125',{method:request.method,headers:request.headers,body:new Uint8Array(await request.arrayBuffer())})}
 assert.ok(request.url.startsWith('https://fcm.googleapis.com/local125/'));pushes++;return new Response(null,{status:201});
}});
async function signature(body){const secret=await crypto.subtle.importKey('raw',new TextEncoder().encode('notification-runtime125:'+keys.privateKey),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Buffer.from(await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode(body))).toString('hex')}
try{
 const db=await mf.getD1Database('DB');
 await db.prepare("CREATE TABLE app_employee_settings(employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0)").run();
 for(const name of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>/^\d.*\.sql$/.test(n)&&!n.startsWith('0002')&&!n.startsWith('0017')).sort()){
  for(let sql of fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8').split(';').map(s=>s.replace(/^\s*--[^\n]*\n/gm,'').trim()).filter(Boolean)){
   const alter=sql.match(/^ALTER TABLE\s+([\w`]+)\s+ADD(?: COLUMN)?\s+([\w`]+)/i);if(alter&&(await db.prepare('PRAGMA table_info('+alter[1]+')').all()).results.some(c=>c.name===alter[2].replaceAll('`','')))continue;
   sql=sql.replace(/^CREATE TABLE (?!IF)/i,'CREATE TABLE IF NOT EXISTS ').replace(/^CREATE (UNIQUE )?INDEX (?!IF)/i,(_,u)=>'CREATE '+(u||'')+'INDEX IF NOT EXISTS ');await db.prepare(sql).run();
  }
 }
 await db.prepare("UPDATE notification_release123 SET cutoff='1970-01-01T00:00:00.000Z'").run();
 await db.prepare("UPDATE notification_runtime_meta125 SET cutoff='1970-01-01T00:00:00.000Z'").run();
 const now=Date.now(),stamp=new Date(now).toISOString(),day=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),rule={id:'local125',enabled:true,type:'work',category:'工作排程',name:'工作',title:'工作提醒',message:'{人員}：{工作清單}',time:'00:00',firstDays:0,repeatDays:0,target:'work-record',recipientMode:'auto',recipientIds:[]};
 await db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,0,?)').bind('warehouse-main',JSON.stringify({notificationRules:[rule]}),stamp).run();
 for(let id=1;id<=7;id++){
  const ec=createECDH('prime256v1');ec.generateKeys();
  await db.prepare("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(?,?,?,?,'viewer','active',?,?)").bind(id,'local'+id,id+'@test.local','人員'+id,stamp,stamp).run();
  await db.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,assignee_ids,sort_index) VALUES(?,'daily',?,?,'本日工作','','','','[]',0,'','1','主管',?,?,0,?,0)").bind('job'+id,day,day,stamp,stamp,JSON.stringify([id])).run();
  await db.prepare('INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind('d'+id,id,'https://fcm.googleapis.com/local125/'+id,ec.getPublicKey().toString('base64url'),randomBytes(16).toString('base64url'),'手機','test',1,stamp,stamp,stamp).run();
 }
 async function round(time){
  const body=JSON.stringify({action:'start',at:Date.now(),input:{now:time}}),response=await mf.dispatchFetch('https://local.test/api/notification-runtime125',{method:'POST',headers:{'Content-Type':'application/json','X-Notification-Signature125':await signature(body)},body});assert.equal(response.status,200,await response.clone().text());
  for(let i=0;i<400;i++){const row=await db.prepare('SELECT status,error_message FROM notification_scheduler_status108 WHERE id=1').first();if(row?.status==='ok')return;if(row?.status==='failed')throw Error(row.error_message);await new Promise(resolve=>setTimeout(resolve,25))}throw Error('local stage chain did not finish');
 }
 await round(now);assert.equal(pushes,7);await round(now+180000);assert.equal(pushes,7);assert.ok(internal>20);assert.equal((await db.prepare("SELECT COUNT(*) n FROM notification_receipts921 WHERE status='sent'").first()).n,7);
 console.log(JSON.stringify({runtime:'workerd',people:7,pushes,internalInvocations:internal,secondRoundResends:0,realProviderRequests:0,cpuLimitVerified:false}));
}finally{await mf.dispose()}
