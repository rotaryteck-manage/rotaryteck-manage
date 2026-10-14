// Free-plan execution isolation. Each durable stage has its own HTTP invocation;
// No browser refresh or notification-setting changes. A new automatic-only
// boundary holds pre-upgrade notices without resetting the old release cutoff.
const notificationOrigin125='https://rotaryteck-manage.rotaryteckserve.workers.dev';
const notificationSigning125=new Map();
const notificationPhaseNames125={'rule':'檢查單一規則','dispatch':'處理單一收件人','retry-list':'建立裝置重試待辦','retry':'重試單一裝置','leave-list':'建立請假通知待辦','leave':'處理單筆請假通知','meeting-list':'建立週會通知待辦','meeting':'處理單筆週會通知'};
async function notificationSignature125(env,body){
 if(!env.VAPID_PRIVATE_KEY)throw Error('通知秘密金鑰尚未設定');
 let key=notificationSigning125.get(env.VAPID_PRIVATE_KEY);
 if(!key){key=await crypto.subtle.importKey('raw',new TextEncoder().encode('notification-runtime125:'+env.VAPID_PRIVATE_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);notificationSigning125.clear();notificationSigning125.set(env.VAPID_PRIVATE_KEY,key)}
 return{key,bytes:new TextEncoder().encode(body)};
}
async function notificationKick125(env,runId){return Promise.all(Array.from({length:4},()=>notificationCall125(env,'step',{runId,hop:0})))}
async function notificationFinish125(env,run){
 const row=await env.DB.prepare("UPDATE notification_runs125 SET status='done' WHERE id=? AND status='running' AND NOT EXISTS(SELECT 1 FROM notification_tasks125 WHERE run_id=? AND status<>'done') RETURNING id").bind(run.id,run.id).first();
 if(row)await env.DB.prepare("UPDATE notification_scheduler_status108 SET status='ok',completed_at=?,error_message='' WHERE scheduled_for=?").bind(new Date().toISOString(),run.scheduled_for).run();
 return!!row;
}
export async function notificationCall125(env,action,input={}){
 const body=JSON.stringify({action,at:Date.now(),input}),{key,bytes}=await notificationSignature125(env,body),signed=new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes));
 const signature=Array.from(signed,b=>b.toString(16).padStart(2,'0')).join('');
 const response=await fetch(notificationOrigin125+'/api/notification-runtime125',{method:'POST',headers:{'Content-Type':'application/json','X-Notification-Signature125':signature},body,redirect:'manual',signal:AbortSignal.timeout(25000)});
 const text=await response.text();let result;try{result=JSON.parse(text)}catch{throw Error(/1102|exceeded resource/i.test(text)?'獨立階段執行資源受限（Cloudflare 1102），請查看執行紀錄':'通知獨立階段回應異常，HTTP '+response.status)}
 if(!response.ok)throw Error(result.error||'通知獨立階段 HTTP '+response.status);return result;
}
export async function notificationClaimBudget125(env){
 if(!env.NOTIFICATION_RUN125)return true;
 return!!await env.DB.prepare('UPDATE notification_runs125 SET attempts=attempts+1 WHERE id=? AND attempts<32 RETURNING id').bind(env.NOTIFICATION_RUN125).first();
}
export async function notificationCleanup125(env,now=Date.now()){
 const cutoff=new Date(now-7*86400000).toISOString();
 await env.DB.batch([env.DB.prepare("DELETE FROM notification_tasks125 WHERE run_id IN (SELECT id FROM notification_runs125 WHERE status<>'running' AND created_at<?)").bind(cutoff),env.DB.prepare("DELETE FROM notification_runs125 WHERE status<>'running' AND created_at<?").bind(cutoff)]);
}
export async function notificationTasks125(env,runId,parent,items,priority=20){
 if(!items.length)return;
 await notificationTaskStatement125(env,runId,parent,items,priority).run();
}
function notificationTaskStatement125(env,runId,parent,items,priority){return env.DB.prepare("INSERT OR IGNORE INTO notification_tasks125(id,run_id,kind,payload,priority,status,attempts,updated_at) SELECT ?||':'||j.key,?,json_extract(j.value,'$.kind'),json_extract(j.value,'$.payload'),?,'pending',0,? FROM json_each(?) j WHERE EXISTS(SELECT 1 FROM notification_runs125 WHERE id=? AND status='running')").bind(parent,runId,priority,new Date().toISOString(),JSON.stringify(items.map(item=>({kind:item.kind,payload:JSON.stringify(item.payload)}))),runId)}
async function notificationStart125(env,now,services){
 if(!Number.isSafeInteger(now)||Math.abs(Date.now()-now)>10*60*1000)throw Error('排程時間無效');
 const day=services.day(now),stamp=new Date().toISOString();
 // One live run at a time. A platform-killed stage is reclaimable after 90s.
 const active=await env.DB.prepare("SELECT * FROM notification_runs125 WHERE status='running' ORDER BY scheduled_for DESC LIMIT 1").first();
 if(active&&services.day(Date.parse(active.scheduled_for))===day){await notificationKick125(env,active.id);return{accepted:true,resumed:true}}
 if(active)await env.DB.batch([env.DB.prepare("UPDATE notification_runs125 SET status='expired' WHERE id=?").bind(active.id),env.DB.prepare("UPDATE notification_tasks125 SET status='expired' WHERE run_id=? AND status<>'done'").bind(active.id)]);
 const id=new Date(now).toISOString();
 const rules=await services.rules(env,now),tasks=rules.map(rule=>({kind:'rule',payload:{ruleId:rule.id,now}}));
 tasks.push({kind:'retry-list',payload:{}},{kind:'leave-list',payload:{}},{kind:'meeting-list',payload:{}});
 const result=await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO notification_runs125(id,scheduled_for,status,attempts,created_at) VALUES(?,?,'running',0,?)").bind(id,id,stamp),notificationTaskStatement125(env,id,id,tasks,10),env.DB.prepare("INSERT INTO notification_scheduler_status108(id,scheduled_for,started_at,completed_at,status,planned,eligible,sent,failed,deferred,error_message) SELECT 1,?,?,'','running',0,0,0,0,0,'' WHERE EXISTS(SELECT 1 FROM notification_runs125 WHERE id=? AND status='running') ON CONFLICT(id) DO UPDATE SET scheduled_for=excluded.scheduled_for,started_at=excluded.started_at,completed_at='',status='running',planned=0,eligible=0,sent=0,failed=0,deferred=0,error_message='' WHERE notification_scheduler_status108.scheduled_for<>excluded.scheduled_for").bind(id,stamp,id)]);
 if(!result[0].meta?.changes){const current=await env.DB.prepare("SELECT id FROM notification_runs125 WHERE status='running'").first();if(current)await notificationKick125(env,current.id);return{accepted:true,duplicate:true}}
 await notificationKick125(env,id);return{accepted:true};
}
async function notificationStep125(env,runId,services,ctx,hop=0){
 const run=await env.DB.prepare("SELECT * FROM notification_runs125 WHERE id=? AND status='running'").bind(runId).first();if(!run)return{accepted:true,finished:true};
 if(services.day(Date.parse(run.scheduled_for))!==services.day(Date.now()))return{accepted:true,expired:true};
 const stamp=new Date().toISOString(),stale=new Date(Date.now()-90000).toISOString();
 const task=await env.DB.prepare("UPDATE notification_tasks125 SET status='processing',attempts=attempts+1,updated_at=? WHERE id=(SELECT id FROM notification_tasks125 WHERE run_id=? AND attempts<3 AND (status='pending' OR (status IN ('failed','processing') AND updated_at<?)) ORDER BY priority,id LIMIT 1) AND (status='pending' OR (status IN ('failed','processing') AND updated_at<?)) RETURNING *").bind(stamp,runId,stale,stale).first();
 if(!task){
  const waiting=await env.DB.prepare("SELECT status,kind,error FROM notification_tasks125 WHERE run_id=? AND status<>'done' ORDER BY id LIMIT 1").bind(runId).first();
  if(waiting){
   if(waiting.status==='failed'||waiting.status==='processing'&&Date.parse(stamp)-Date.parse(run.created_at)>120000)await env.DB.prepare("UPDATE notification_scheduler_status108 SET status='failed',error_message=? WHERE scheduled_for=?").bind('獨立階段未完成：'+waiting.kind+'；下一輪接續檢查',run.scheduled_for).run();
   const exhausted=await env.DB.prepare("SELECT id FROM notification_tasks125 WHERE run_id=? AND status IN ('failed','processing') AND attempts>=3 AND (status='failed' OR updated_at<?) LIMIT 1").bind(runId,stale).first();
   if(exhausted)await env.DB.prepare("UPDATE notification_runs125 SET status='failed' WHERE id=?").bind(runId).run();
   return{accepted:true,waiting:true};
  }
  await notificationFinish125(env,run);return{accepted:true,finished:true};
 }
 const work=(async()=>{
  try{
   await env.DB.batch([env.DB.prepare("UPDATE notification_scheduler_status108 SET status='running',started_at=?,error_message='' WHERE scheduled_for=?").bind(stamp,run.scheduled_for),env.DB.prepare("INSERT INTO notification_diagnostics115(id,run_id,scheduled_for,phase,updated_at,details) VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET run_id=excluded.run_id,scheduled_for=excluded.scheduled_for,phase=excluded.phase,updated_at=excluded.updated_at,details=excluded.details").bind(runId,run.scheduled_for,notificationPhaseNames125[task.kind]||task.kind,stamp,JSON.stringify({taskId:task.id,attempt:task.attempts}))]);
   const runtime={...env,NOTIFICATION_RUNTIME116:true,NOTIFICATION_RUN125:runId,NOTIFICATION_TASK125:task.id,NOTIFICATION_FORWARD125:true};
   const result=await services.execute(runtime,task.kind,JSON.parse(task.payload),run);
   await env.DB.batch([env.DB.prepare("UPDATE notification_tasks125 SET status='done',updated_at=?,error='' WHERE id=?").bind(new Date().toISOString(),task.id),env.DB.prepare("UPDATE notification_scheduler_status108 SET planned=planned+?,eligible=eligible+?,sent=sent+?,failed=failed+?,deferred=deferred+? WHERE scheduled_for=?").bind(Number(result?.planned||0),Number(result?.eligible||0),Number(result?.sent||0),Number(result?.failed||0),Number(result?.deferred||0),run.scheduled_for)]);
   // Four lanes, at most eight stages per lane: never an unbounded self-fetch
   // chain. Additional durable work waits for the next existing three-minute tick.
   if(hop<7)await notificationCall125(env,'step',{runId,hop:hop+1}).catch(error=>console.error('通知接續等待下一輪',error.message));
   else await notificationFinish125(env,run);
  }catch(error){
   const message=String(error?.message||error).slice(0,400);console.error('通知獨立階段失敗',task.kind,message);
   await env.DB.batch([env.DB.prepare("UPDATE notification_tasks125 SET status='failed',updated_at=?,error=? WHERE id=?").bind(new Date().toISOString(),message,task.id),env.DB.prepare("UPDATE notification_scheduler_status108 SET status='failed',completed_at=?,error_message=? WHERE scheduled_for=?").bind(new Date().toISOString(),'獨立階段 '+task.kind+'：'+message,run.scheduled_for)]);
  }
 })();ctx.waitUntil(work);return{accepted:true,stage:task.kind};
}
export async function notificationRuntimeApi125(request,env,ctx,services){
 if(request.method!=='POST')return Response.json({error:'不支援的操作'},{status:405});
 try{
  const signature=request.headers.get('X-Notification-Signature125')||'';if(!/^[a-f0-9]{64}$/.test(signature))return Response.json({error:'排程驗證失敗'},{status:403});
  if(Number(request.headers.get('content-length')||0)>131072)return Response.json({error:'資料過大'},{status:413});
  const chunks=[],reader=request.body?.getReader();let size=0;
  if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>131072){await reader.cancel();return Response.json({error:'資料過大'},{status:413})}chunks.push(value)}
  const raw=new Uint8Array(size);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.length}const body=new TextDecoder().decode(raw);
  const {key,bytes}=await notificationSignature125(env,body),signed=Uint8Array.from(signature.match(/../g),v=>parseInt(v,16));
  if(!await crypto.subtle.verify('HMAC',key,signed,bytes))return Response.json({error:'排程驗證失敗'},{status:403});
  const input=JSON.parse(body);if(!Number.isSafeInteger(input.at)||Math.abs(Date.now()-input.at)>60000)return Response.json({error:'排程驗證已過期'},{status:403});
  env={...env,notificationCutoff125:(await env.DB.prepare('SELECT cutoff FROM notification_runtime_meta125 WHERE singleton=1').first())?.cutoff||''};
  let result;if(input.action==='start')result=await notificationStart125(env,input.input.now,services);
  else if(input.action==='step'&&typeof input.input.runId==='string'&&Number.isInteger(input.input.hop??0)&&(input.input.hop??0)>=0&&(input.input.hop??0)<=7)result=await notificationStep125(env,input.input.runId,services,ctx,input.input.hop??0);
  else if(input.action==='push')result=await services.push({...env,NOTIFICATION_RUNTIME116:true},input.input);
  else return Response.json({error:'未知階段'},{status:400});
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return Response.json({error:String(error?.message||error).slice(0,400)},{status:503})}
}
