// This module prepares only attendance statements. It never sends or retries notifications.
export async function meetingAudienceSettings133(env){
 const config=await env.DB.prepare('SELECT configured,revision FROM meeting_attendance_config133 WHERE singleton=1').first();
 const rows=await env.DB.prepare(config.configured
  ? 'SELECT employee_id AS id FROM meeting_attendance_selected133 ORDER BY employee_id'
  : "SELECT id FROM employees e WHERE status='active' AND NOT EXISTS(SELECT 1 FROM meeting_attendance_excluded132 b WHERE b.employee_id=e.id) AND replace(replace(name,' ',''),'　','') NOT IN ('機器人一號','機器人二號','機器人1號','機器人2號') ORDER BY id").all();
 return {attendanceConfigured:!!config.configured,attendanceRevision:config.revision,attendanceIds:rows.results.map(p=>String(p.id))};
}
export async function meetingAudienceStatements133(env,input,token){
 if(!Object.hasOwn(input,'attendanceIds'))return [];
 const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})};
 if(!Array.isArray(input.attendanceIds)||input.attendanceIds.length>200||input.attendanceIds.some(id=>!(/^[1-9]\d*$/.test(String(id)))||!Number.isSafeInteger(Number(id)))||new Set(input.attendanceIds.map(String)).size!==input.attendanceIds.length)fail('應簽到人員設定不正確');
 const before=await meetingAudienceSettings133(env),ids=input.attendanceIds.map(String).sort((a,b)=>Number(a)-Number(b));
 if(input.attendanceRevision!==before.attendanceRevision)fail('應簽到名單已更新，請重新開啟設定',409);
 // Merely changing notification text, enabling or disabling notifications must not rewrite snapshots.
 if(JSON.stringify(ids)===JSON.stringify(before.attendanceIds))return [];
 const people=await env.DB.prepare("SELECT id FROM employees WHERE status='active'").all(),active=new Set(people.results.map(p=>String(p.id)));
 if(ids.some(id=>!active.has(id)&&!before.attendanceIds.includes(id)))fail('應簽到人員已停用或不存在，請重新開啟設定');
 const json=JSON.stringify(ids),guard=token+':audience';
 return [
  env.DB.prepare('INSERT INTO meeting_guards117(id,valid) VALUES(?,(SELECT revision=? FROM meeting_attendance_config133 WHERE singleton=1))').bind(guard,before.attendanceRevision),
  env.DB.prepare('UPDATE meeting_attendance_config133 SET configured=1,revision=revision+1 WHERE singleton=1'),
  env.DB.prepare('DELETE FROM meeting_attendance_selected133'),
  env.DB.prepare('INSERT INTO meeting_attendance_selected133(employee_id) SELECT CAST(value AS INTEGER) FROM json_each(?)').bind(json),
  // Keep removed receipts, so adding the same account back restores its original first-read time.
  env.DB.prepare("UPDATE meeting_attendance_people132 SET included=0 WHERE meeting_id IN (SELECT id FROM meetings117 WHERE deleted_at='')"),
  env.DB.prepare("INSERT INTO meeting_attendance_people132(meeting_id,employee_id,name,position,included) SELECT m.id,e.id,e.name,COALESCE(x.position,e.id),1 FROM meetings117 m CROSS JOIN meeting_attendance_selected133 s JOIN employees e ON e.id=s.employee_id LEFT JOIN app_employee_settings x ON x.employee_id=e.id WHERE m.deleted_at='' AND e.status='active' ON CONFLICT(meeting_id,employee_id) DO UPDATE SET included=1"),
  env.DB.prepare('DELETE FROM meeting_guards117 WHERE id=?').bind(guard)
 ];
}
