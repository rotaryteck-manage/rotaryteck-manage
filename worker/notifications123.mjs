import {notificationScopesRead121} from './notifications121.mjs';
export async function notificationCutoff123(env){
 if(Object.hasOwn(env,'notificationCutoff123'))return env.notificationCutoff123;
 return (await env.DB.prepare('SELECT cutoff FROM notification_release123 WHERE singleton=1').first())?.cutoff||'';
}
export function notificationBeforeRelease123(stamp,cutoff){return !!cutoff&&Number.isFinite(Date.parse(stamp))&&Date.parse(stamp)<Date.parse(cutoff)}
export function notificationDueBeforeRelease123(rule,day,cutoff){return rule.type!=='closure'&&notificationBeforeRelease123(day+'T'+rule.time+':00+08:00',cutoff)}
export async function notificationCanRecover123(env,key){
 const row=await env.DB.prepare("SELECT d.error_message,d.status,r.status AS receipt_status,(SELECT COUNT(*) FROM notification_recoveries123 c WHERE c.dedupe_key=d.dedupe_key) AS recovered FROM notification_deliveries d LEFT JOIN notification_receipts921 r ON r.dedupe_key=d.dedupe_key WHERE d.dedupe_key=?").bind(key).first();
 return !!row&&row.status==='failed'&&row.receipt_status!=='sent'&&!row.recovered&&String(row.error_message).startsWith('Invalid redirect value');
}
export async function notificationRecoverSelected123(env,plans){
 const scopes=await notificationScopesRead121(env,plans);
 for(const plan of plans)for(const device of scopes.get(String(plan.sourceKey||plan.dedupeKey).slice(0,300))?.ids||[]){
  const key=plan.dedupeKey+':'+device;if(!await notificationCanRecover123(env,key))continue;
  // Claim once, then permit exactly one further explicit manual attempt.
  await env.DB.batch([
   env.DB.prepare("UPDATE notification_receipts921 SET attempts=2 WHERE dedupe_key=? AND status<>'sent' AND attempts>=3 AND NOT EXISTS(SELECT 1 FROM notification_recoveries123 c WHERE c.dedupe_key=notification_receipts921.dedupe_key) AND EXISTS(SELECT 1 FROM notification_deliveries d WHERE d.dedupe_key=notification_receipts921.dedupe_key AND d.status='failed' AND d.error_message LIKE 'Invalid redirect value%')").bind(key),
   env.DB.prepare("INSERT OR IGNORE INTO notification_recoveries123(dedupe_key,recovered_at) SELECT ?,? WHERE EXISTS(SELECT 1 FROM notification_deliveries d WHERE d.dedupe_key=? AND d.status='failed' AND d.error_message LIKE 'Invalid redirect value%') AND NOT EXISTS(SELECT 1 FROM notification_receipts921 r WHERE r.dedupe_key=? AND r.status='sent')").bind(key,new Date().toISOString(),key,key),
  ]);
 }
}
export async function notificationHistoricalPlans123(env,rule,people,current){
 const cutoff=await notificationCutoff123(env);if(!cutoff)return current;
 const rows=await env.DB.prepare("SELECT d.*,substr(d.dedupe_key,1,length(d.dedupe_key)-length(d.subscription_id)-1) AS source_key FROM notification_deliveries d WHERE d.rule_id=? AND d.notification_type IN ('work','report','report-check','custom','wire','plating') AND d.created_at<? AND d.status<>'sent' AND d.subscription_id<>'' ORDER BY d.created_at DESC LIMIT 500").bind(rule.id,cutoff).all();
 const waiting=await env.DB.prepare("SELECT i.*,? AS notification_type FROM notification_inbox88 i JOIN notification_device_scopes121 s ON s.source_key=i.source_key AND s.employee_id=i.employee_id WHERE i.created_at<? AND substr(i.source_key,1,length(?))=? AND NOT EXISTS(SELECT 1 FROM notification_deliveries d WHERE d.rule_id=? AND d.employee_id=i.employee_id AND substr(d.dedupe_key,1,length(d.dedupe_key)-length(d.subscription_id)-1)=i.source_key) ORDER BY i.created_at DESC LIMIT 100").bind(rule.type,cutoff,'auto:'+rule.id+':','auto:'+rule.id+':',rule.id).all();
 const known=new Set(current.map(p=>p.dedupeKey)),plans=[...current];
 const selected=new Set((rule.recipientIds||[]).map(Number));
 for(const row of [...(rows.results||[]),...(waiting.results||[])]){const person=people.get(Number(row.employee_id));if(known.has(row.source_key)||!person?.notificationAllowed103||person.enabled===0||(rule.recipientMode==='selected'&&!selected.has(Number(row.employee_id))))continue;known.add(row.source_key);plans.push({employeeId:Number(row.employee_id),ruleId:rule.id,notificationType:row.notification_type,category:row.category,title:row.title,message:row.message,targetUrl:row.target_url,dedupeKey:row.source_key,sourceKey:row.source_key,historical123:true,day:new Date(row.created_at).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'})})}
 return plans;
}
