// Independent read receipts: no calls to push, notification recovery, or meeting content writes.
const attendanceJSON132=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function meetingAttendanceApi132(request,env,employee){
 try{
  if(!employee||employee.status!=='active')return attendanceJSON132({error:'請先登入啟用帳號'},401);
  const url=new URL(request.url);if(!['GET','POST'].includes(request.method))return attendanceJSON132({error:'不支援的操作'},405);
  let id=url.searchParams.get('id');
  if(request.method==='POST'){
   if(request.headers.get('origin')!==url.origin)return attendanceJSON132({error:'來源驗證失敗'},403);
   if(!request.headers.get('content-type')?.includes('application/json'))return attendanceJSON132({error:'格式不正確'},415);
   const raw=await request.text();if(new TextEncoder().encode(raw).length>2048)return attendanceJSON132({error:'資料過大'},413);
   let input;try{input=JSON.parse(raw)}catch{return attendanceJSON132({error:'格式不正確'},400)}
   if(!input||Object.keys(input).some(key=>key!=='id'))return attendanceJSON132({error:'只能登記自己的閱讀簽到'},400);id=input.id;
  }
  if(typeof id!=='string'||!id.trim()||id.length>80)return attendanceJSON132({error:'會議編號不正確'},400);
  const item=await env.DB.prepare("SELECT m.id,m.day,g.started_at,g.legacy FROM meetings117 m LEFT JOIN meeting_attendance_groups132 g ON g.meeting_id=m.id WHERE m.id=? AND m.deleted_at=''").bind(id).first();
  if(!item)return attendanceJSON132({error:'此週會紀錄已刪除或不存在'},404);
  if(!item.started_at)return attendanceJSON132({error:'簽到名單尚未準備完成，請稍後重試'},503);
  if(request.method==='POST'){
   const now=new Date().toISOString();
   // Neither a caller-supplied employee nor a client clock is trusted. The first read is immutable.
   await env.DB.prepare("UPDATE meeting_attendance_people132 SET first_read_at=? WHERE meeting_id=? AND employee_id=? AND first_read_at='' AND EXISTS(SELECT 1 FROM employees WHERE id=? AND status='active') AND EXISTS(SELECT 1 FROM meetings117 WHERE id=? AND deleted_at='') AND included=1").bind(now,id,employee.id,employee.id,id).run();
   const row=await env.DB.prepare('SELECT first_read_at FROM meeting_attendance_people132 WHERE meeting_id=? AND employee_id=? AND included=1').bind(id,employee.id).first();
   return attendanceJSON132({registered:!!row?.first_read_at,firstReadAt:row?.first_read_at||''});
  }
  const rows=await env.DB.prepare('SELECT employee_id AS id,name,first_read_at AS firstReadAt FROM meeting_attendance_people132 WHERE meeting_id=? AND included=1 ORDER BY position,employee_id').bind(id).all();
  return attendanceJSON132({id:item.id,day:item.day,legacy:!!item.legacy,startedAt:item.started_at,people:rows.results});
 }catch(error){console.error('週會簽到操作失敗',error.message);return attendanceJSON132({error:'簽到操作未完成，請稍後重試'},500)}
}
