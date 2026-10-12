// Device audiences belong to the logical notification, never to a later refresh.
export async function notificationScopesRead121(env,plans){const keys=[...new Set(plans.map(plan=>String(plan.sourceKey||plan.dedupeKey).slice(0,300)))];if(!keys.length)return new Map();const rows=await env.DB.prepare('SELECT source_key,employee_id,device_ids,created_at FROM notification_device_scopes121 WHERE source_key IN (SELECT value FROM json_each(?))').bind(JSON.stringify(keys)).all();return new Map((rows.results||[]).map(row=>[row.source_key,{...row,ids:new Set(JSON.parse(row.device_ids))}]))}
export async function notificationFreezeDevices121(env,plans){const unique=new Map();for(const plan of plans){const key=String(plan.sourceKey||plan.dedupeKey).slice(0,300);unique.set(key,{key,employeeId:Number(plan.employeeId)})}if(!unique.size)return new Map();await env.DB.prepare("INSERT OR IGNORE INTO notification_device_scopes121(source_key,employee_id,device_ids,created_at) SELECT json_extract(j.value,'$.key'),json_extract(j.value,'$.employeeId'),COALESCE((SELECT json_group_array(s.id) FROM push_subscriptions s WHERE s.employee_id=json_extract(j.value,'$.employeeId') AND s.enabled=1),'[]'),? FROM json_each(?) j").bind(new Date().toISOString(),JSON.stringify([...unique.values()])).run();return notificationScopesRead121(env,plans)}
export async function notificationLogRows121(env,limit,offset){return env.DB.prepare(`WITH keyed AS (
 SELECT d.*,CASE WHEN d.subscription_id<>'' AND substr(d.dedupe_key,-length(d.subscription_id)-1)=':'||d.subscription_id THEN substr(d.dedupe_key,1,length(d.dedupe_key)-length(d.subscription_id)-1) ELSE d.dedupe_key END AS source_key
 FROM notification_deliveries d WHERE d.notification_type<>'test'
), heads AS (
 SELECT k.source_key,k.employee_id,COALESCE(i.created_at,n.created_at,MIN(k.created_at)) AS first_at
 FROM keyed k LEFT JOIN notification_inbox88 i ON i.source_key=k.source_key AND i.employee_id=k.employee_id LEFT JOIN notification_device_scopes121 n ON n.source_key=k.source_key AND n.employee_id=k.employee_id
 GROUP BY k.source_key,k.employee_id ORDER BY first_at DESC,k.source_key LIMIT ? OFFSET ?
)
 SELECT k.*,h.first_at AS notification_created_at,e.name AS employee_name,s.device_label,s.user_agent
 FROM heads h JOIN keyed k ON k.source_key=h.source_key AND k.employee_id=h.employee_id LEFT JOIN employees e ON e.id=k.employee_id LEFT JOIN push_subscriptions s ON s.id=k.subscription_id
 ORDER BY h.first_at DESC,h.source_key,k.created_at,k.id`).bind(limit+1,offset).all()}
