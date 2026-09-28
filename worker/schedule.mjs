const scheduleJSON=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const scheduleDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const scheduleText=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const scheduleAllowed=(employee,cap)=>employee.permissions?.includes(cap)===true;
export async function scheduleApi(request,env,employee){
 try{
  if(!scheduleAllowed(employee,'schedule.view'))return scheduleJSON({error:'沒有查看工作排程的權限'},403);
  const url=new URL(request.url),method=request.method;
  if(method==='GET'){
   const from=url.searchParams.get('from'),to=url.searchParams.get('to');if(!scheduleDate(from)||!scheduleDate(to)||to<from||Date.parse(to)-Date.parse(from)>370*86400000)return scheduleJSON({error:'日期範圍不正確'},400);
   const rows=await env.DB.prepare('SELECT id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision FROM schedule_entries WHERE day<=? AND end_day>=? ORDER BY day,id').bind(to,from).all();
   const reports=await env.DB.prepare('SELECT id,entry_id,day,body,photo_key,photo_name,author_id,author_name,created_at FROM schedule_reports WHERE day BETWEEN ? AND ? ORDER BY created_at,id').bind(from,to).all();
   return scheduleJSON({entries:rows.results,reports:reports.results.map(r=>({...r,photo_key:r.photo_key?'present':''}))});
  }
  if(request.headers.get('origin')!==url.origin)return scheduleJSON({error:'來源驗證失敗'},403);
  if(method!=='POST'&&method!=='DELETE')return scheduleJSON({error:'不支援的操作'},405);
  const size=Number(request.headers.get('content-length')||0);if(size>300000)return scheduleJSON({error:'資料過大'},413);
  if(!request.headers.get('content-type')?.includes('application/json'))return scheduleJSON({error:'格式不正確'},415);
  const input=await request.json();if(JSON.stringify(input).length>300000)return scheduleJSON({error:'資料過大'},413);
  const now=new Date().toISOString(),kind=input.kind;
  if(kind==='report'){
   if(!scheduleAllowed(employee,'schedule.report'))return scheduleJSON({error:'沒有回報權限'},403);
   if(method==='DELETE'){const old=await env.DB.prepare('SELECT * FROM schedule_reports WHERE id=?').bind(input.id).first();if(!old)return scheduleJSON({error:'找不到回報'},404);if(employee.role!=='supervisor'&&old.author_id!==String(employee.id))return scheduleJSON({error:'只能刪除自己的回報'},403);await env.DB.prepare('DELETE FROM schedule_reports WHERE id=? AND author_id=?').bind(old.id,old.author_id).run();if(old.photo_key)await env.UPLOADS?.delete(old.photo_key);return scheduleJSON({deleted:true});}
   if(!scheduleDate(input.day)||!scheduleText(input.body,3000)||!scheduleText(input.id,80))return scheduleJSON({error:'請填寫日期與回報內容'},400);
   if(input.entryId){const parent=await env.DB.prepare('SELECT day,end_day FROM schedule_entries WHERE id=?').bind(input.entryId).first();if(!parent||input.day<parent.day||input.day>parent.end_day)return scheduleJSON({error:'工作項目不在選擇的日期'},400);}
   await env.DB.prepare('INSERT INTO schedule_reports(id,entry_id,day,body,photo_key,photo_name,author_id,author_name,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(input.id,input.entryId||'',input.day,input.body.trim(),null,'',String(employee.id),employee.name,now).run();return scheduleJSON({saved:true});
  }
  if(!['weekly','daily','special'].includes(kind))return scheduleJSON({error:'排程類型不正確'},400);
  const capability=kind==='weekly'?'schedule.weekly':'schedule.daily';if(employee.role!=='supervisor'||!scheduleAllowed(employee,capability))return scheduleJSON({error:'只有具有排程權限的主管可修改'},403);
  if(method==='DELETE'){const old=await env.DB.prepare('SELECT id,revision FROM schedule_entries WHERE id=?').bind(input.id).first();if(!old)return scheduleJSON({error:'找不到項目'},404);if(old.revision!==input.revision)return scheduleJSON({error:'排程已被他人修改，請重新載入'},409);await env.DB.prepare('DELETE FROM schedule_entries WHERE id=? AND revision=?').bind(input.id,input.revision).run();return scheduleJSON({deleted:true});}
  if(!scheduleText(input.id,80)||!scheduleDate(input.day)||!scheduleDate(input.endDay)||input.endDay<input.day||Date.parse(input.endDay)-Date.parse(input.day)>31*86400000||!scheduleText(input.title,160)||typeof input.assignee!=='string'||input.assignee.length>100||typeof input.note!=='string'||input.note.length>1000||!/^#[0-9a-fA-F]{6}$/.test(input.color))return scheduleJSON({error:'請檢查排程日期與內容'},400);
  
  if(kind==='daily'&&input.day!==input.endDay)return scheduleJSON({error:'每日排程只能安排單日'},400);
  const old=await env.DB.prepare('SELECT revision FROM schedule_entries WHERE id=?').bind(input.id).first();if((old?.revision||0)!==input.revision)return scheduleJSON({error:'排程已被他人修改，請重新載入'},409);
  if(old)await env.DB.prepare('UPDATE schedule_entries SET kind=?,day=?,end_day=?,title=?,assignee=?,color=?,note=?,category=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?').bind(kind,input.day,input.endDay,input.title.trim(),input.assignee.trim(),input.color,input.note.trim(),input.category||'',now,input.id,input.revision).run();
  else await env.DB.prepare('INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,1)').bind(input.id,kind,input.day,input.endDay,input.title.trim(),input.assignee.trim(),input.color,input.note.trim(),input.category||'', '',String(employee.id),employee.name,now,now).run();
  return scheduleJSON({saved:true});
 }catch(e){return scheduleJSON({error:e.message||'排程操作失敗'},400);}
}
export async function schedulePhotoApi(request,env,employee){
 try{if(!scheduleAllowed(employee,'schedule.view'))return scheduleJSON({error:'沒有查看權限'},403);const url=new URL(request.url),id=url.searchParams.get('id');if(!id)return scheduleJSON({error:'缺少回報編號'},400);const row=await env.DB.prepare('SELECT * FROM schedule_reports WHERE id=?').bind(id).first();if(!row?.photo_key)return scheduleJSON({error:'找不到照片'},404);
  const file=await env.UPLOADS?.get(row.photo_key);if(!file)return scheduleJSON({error:'找不到照片'},404);return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}});
 }catch(e){return scheduleJSON({error:e.message},400);}
}
export async function schedulePhotoUpload(request,env,employee){
 try{if(!scheduleAllowed(employee,'schedule.report'))return scheduleJSON({error:'沒有回報權限'},403);if(request.headers.get('origin')!==new URL(request.url).origin)return scheduleJSON({error:'來源驗證失敗'},403);
  if(Number(request.headers.get('content-length')||0)>2200000)return scheduleJSON({error:'照片不可超過 2 MB'},413);
  const form=await request.formData(),id=String(form.get('id')||''),photo=form.get('photo'),row=await env.DB.prepare('SELECT * FROM schedule_reports WHERE id=?').bind(id).first();if(!row||row.author_id!==String(employee.id)&&employee.role!=='supervisor')return scheduleJSON({error:'只能修改自己的回報'},403);
  if(!(photo instanceof File)||!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>2*1024*1024||photo.size===0||!env.UPLOADS)return scheduleJSON({error:'請選擇小於 2 MB 的 JPG、PNG 或 WebP'},400);
  const key='schedule/'+id+'/'+crypto.randomUUID();await env.UPLOADS.put(key,photo.stream(),{httpMetadata:{contentType:photo.type}});await env.DB.prepare('UPDATE schedule_reports SET photo_key=?,photo_name=? WHERE id=?').bind(key,String(photo.name).slice(0,200),id).run();if(row.photo_key)await env.UPLOADS.delete(row.photo_key);return scheduleJSON({saved:true});
 }catch(e){return scheduleJSON({error:e.message||'照片上傳失敗'},400);}
}
