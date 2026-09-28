const scheduleJSON=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const scheduleDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const scheduleText=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const scheduleAllowed=(employee,cap)=>employee.permissions?.includes(cap)===true;
const scheduleDefaults60={items:['組裝','測試','品檢','收料','寄出','其他'],contents:['準備','執行','檢查','完成','其他']};
async function scheduleOptions60(env){await env.DB.prepare('CREATE TABLE IF NOT EXISTS schedule_options (id INTEGER PRIMARY KEY CHECK(id=1),items TEXT NOT NULL,contents TEXT NOT NULL)').run();const row=await env.DB.prepare('SELECT items,contents FROM schedule_options WHERE id=1').first();return row?{items:JSON.parse(row.items),contents:JSON.parse(row.contents)}:scheduleDefaults60;}
export async function scheduleApi(request,env,employee){
 try{
  if(!scheduleAllowed(employee,'schedule.view'))return scheduleJSON({error:'沒有查看工作排程的權限'},403);
  const url=new URL(request.url),method=request.method;
  if(method==='GET'){
   const from=url.searchParams.get('from'),to=url.searchParams.get('to');if(!scheduleDate(from)||!scheduleDate(to)||to<from||Date.parse(to)-Date.parse(from)>370*86400000)return scheduleJSON({error:'日期範圍不正確'},400);
   const rows=await env.DB.prepare('SELECT id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision FROM schedule_entries WHERE day<=? AND end_day>=? ORDER BY day,id').bind(to,from).all();
   const reports=await env.DB.prepare('SELECT id,entry_id,day,body,photo_key,photo_name,author_id,author_name,created_at FROM schedule_reports WHERE day BETWEEN ? AND ? ORDER BY created_at,id').bind(from,to).all();
   const people=await env.DB.prepare("SELECT id,name FROM employees WHERE status='active' ORDER BY id").all();
   const weeklyNotes=await env.DB.prepare('SELECT week_start,body,updated_at,author_name FROM schedule_weekly_notes WHERE week_start BETWEEN ? AND ? ORDER BY week_start').bind(from,to).all();
   return scheduleJSON({entries:rows.results,weeklyNotes:weeklyNotes.results,people:people.results,options:await scheduleOptions60(env),reports:reports.results.map(r=>({...r,photo_key:r.photo_key?'present':''}))});
  }
  if(request.headers.get('origin')!==url.origin)return scheduleJSON({error:'來源驗證失敗'},403);
  if(method!=='POST'&&method!=='DELETE')return scheduleJSON({error:'不支援的操作'},405);
  const size=Number(request.headers.get('content-length')||0);if(size>300000)return scheduleJSON({error:'資料過大'},413);
  if(!request.headers.get('content-type')?.includes('application/json'))return scheduleJSON({error:'格式不正確'},415);
  const input=await request.json();if(JSON.stringify(input).length>300000)return scheduleJSON({error:'資料過大'},413);
  const now=new Date().toISOString(),kind=input.kind;
  if(kind==='options'){
   if(method!=='POST'||employee.role!=='supervisor'||!scheduleAllowed(employee,'schedule.weekly'))return scheduleJSON({error:'只有主管可以設定工作選項'},403);
   const valid=list=>Array.isArray(list)&&list.length>0&&list.length<=100&&list.every(v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=80)&&new Set(list).size===list.length;
   if(!valid(input.items)||!valid(input.contents))return scheduleJSON({error:'選項不可空白、重複或超過 80 字'},400);
   await scheduleOptions60(env);await env.DB.prepare('INSERT INTO schedule_options(id,items,contents) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET items=excluded.items,contents=excluded.contents').bind(JSON.stringify(input.items),JSON.stringify(input.contents)).run();return scheduleJSON({saved:true});
  }
  if(kind==='batch'){
   if(method!=='POST'||!['supervisor','warehouse'].includes(employee.role)||!Array.isArray(input.entries)||input.entries.length<1||input.entries.length>20)return scheduleJSON({error:'無法批次儲存工作'},403);
   const ids=new Set(),people=await env.DB.prepare("SELECT name FROM employees WHERE status='active'").all(),active=new Set(people.results.map(x=>x.name)),statements=[];
   for(const item of input.entries){const cap=item.kind==='weekly'?'schedule.weekly':item.kind==='daily'?'schedule.daily':'';if(!cap||(item.kind==='weekly'&&employee.role!=='supervisor')||!scheduleAllowed(employee,cap)||!scheduleText(item.id,80)||ids.has(item.id)||!scheduleDate(item.day)||!scheduleDate(item.endDay)||item.endDay<item.day||Date.parse(item.endDay)-Date.parse(item.day)>31*86400000||item.kind==='daily'&&item.day!==item.endDay||!scheduleText(item.title,160)||typeof item.note!=='string'||item.note.length>1000||!/^#[0-9a-fA-F]{6}$/.test(item.color)||!Number.isInteger(item.revision)||item.revision<0)return scheduleJSON({error:'第 '+(statements.length+1)+' 項工作不完整'},400);ids.add(item.id);
    let assignees,contents;try{assignees=JSON.parse(item.assignee);contents=JSON.parse(item.category)}catch{return scheduleJSON({error:'請勾選工作內容及人員'},400)}
    if(!Array.isArray(assignees)||!assignees.length||assignees.length>50||new Set(assignees).size!==assignees.length||!assignees.every(x=>active.has(x))||!Array.isArray(contents)||!contents.length||contents.length>100||!contents.every(x=>typeof x==='string'&&x.trim()&&x.length<=80))return scheduleJSON({error:'工作人員或內容選擇不正確'},400);
    const old=await env.DB.prepare('SELECT revision,kind FROM schedule_entries WHERE id=?').bind(item.id).first();if(old&&old.kind!==item.kind)return scheduleJSON({error:'排程類型不符'},400);if((old?.revision||0)!==item.revision)return scheduleJSON({error:'排程已由他人修改，請重新載入'},409);
    statements.push(old?env.DB.prepare('UPDATE schedule_entries SET kind=?,day=?,end_day=?,title=?,assignee=?,color=?,note=?,category=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?').bind(item.kind,item.day,item.endDay,item.title,item.assignee,item.color,item.note,item.category,now,item.id,item.revision):env.DB.prepare('INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,1)').bind(item.id,item.kind,item.day,item.endDay,item.title,item.assignee,item.color,item.note,item.category,'',String(employee.id),employee.name,now,now));
   }await env.DB.batch(statements);return scheduleJSON({saved:true,count:statements.length});
  }
  if(kind==='weekly_note'){
   if(method!=='POST'||employee.role!=='supervisor'||!scheduleAllowed(employee,'schedule.weekly'))return scheduleJSON({error:'只有具有每週排程權限的主管可修改備註'},403);
   if(!scheduleDate(input.weekStart)||new Date(input.weekStart+'T00:00:00Z').getUTCDay()!==1||typeof input.body!=='string'||input.body.length>2000)return scheduleJSON({error:'備註日期或內容不正確'},400);
   const body=input.body.trim();if(body)await env.DB.prepare('INSERT INTO schedule_weekly_notes(week_start,body,updated_at,author_id,author_name) VALUES(?,?,?,?,?) ON CONFLICT(week_start) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at,author_id=excluded.author_id,author_name=excluded.author_name').bind(input.weekStart,body,now,String(employee.id),employee.name).run();
   else await env.DB.prepare('DELETE FROM schedule_weekly_notes WHERE week_start=?').bind(input.weekStart).run();return scheduleJSON({saved:true});
  }
  if(kind==='material'){
   if(!['supervisor','warehouse'].includes(employee.role)||!scheduleAllowed(employee,'schedule.material'))return scheduleJSON({error:'沒有每日物料登錄權限'},403);
   if(method==='DELETE'){const old=await env.DB.prepare("SELECT revision FROM schedule_entries WHERE id=? AND kind='material'").bind(input.id).first();if(!old)return scheduleJSON({error:'找不到物料紀錄'},404);if(old.revision!==input.revision)return scheduleJSON({error:'紀錄已由他人修改，請重新載入'},409);await env.DB.prepare("DELETE FROM schedule_entries WHERE id=? AND kind='material' AND revision=?").bind(input.id,input.revision).run();return scheduleJSON({deleted:true})}
   if(!scheduleText(input.id,80)||!scheduleDate(input.day)||!scheduleText(input.title,160)||!['收料','出貨','送貨'].includes(input.category)||!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>1000000||typeof input.note!=='string'||input.note.length>1000||!Number.isInteger(input.revision)||input.revision<0)return scheduleJSON({error:'請填寫物料日期、品項、數量與類型'},400);
   const old=await env.DB.prepare('SELECT revision,kind FROM schedule_entries WHERE id=?').bind(input.id).first();if(old&&old.kind!==kind)return scheduleJSON({error:'紀錄類型不符'},400);if((old?.revision||0)!==input.revision)return scheduleJSON({error:'紀錄已由他人修改，請重新載入'},409);
   if(old)await env.DB.prepare("UPDATE schedule_entries SET day=?,end_day=?,title=?,category=?,quantity=?,note=?,updated_at=?,revision=revision+1 WHERE id=? AND kind='material' AND revision=?").bind(input.day,input.day,input.title.trim(),input.category,input.quantity,input.note.trim(),now,input.id,input.revision).run();
   else await env.DB.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision) VALUES (?,'material',?,? ,?,'','#4e8069',?,?,?,'',?,?,?,?,1)").bind(input.id,input.day,input.day,input.title.trim(),input.note.trim(),input.category,input.quantity,String(employee.id),employee.name,now,now).run();return scheduleJSON({saved:true});
  }
  if(kind==='report'){
   if(!scheduleAllowed(employee,'schedule.report'))return scheduleJSON({error:'沒有回報權限'},403);
   if(method==='DELETE'){const old=await env.DB.prepare('SELECT * FROM schedule_reports WHERE id=?').bind(input.id).first();if(!old)return scheduleJSON({error:'找不到回報'},404);if(employee.role!=='supervisor'&&old.author_id!==String(employee.id))return scheduleJSON({error:'只能刪除自己的回報'},403);await env.DB.prepare('DELETE FROM schedule_reports WHERE id=? AND author_id=?').bind(old.id,old.author_id).run();if(old.photo_key)await env.UPLOADS?.delete(old.photo_key);return scheduleJSON({deleted:true});}
   if(!scheduleDate(input.day)||!scheduleText(input.body,3000)||!scheduleText(input.id,80))return scheduleJSON({error:'請填寫日期與回報內容'},400);
   if(input.entryId){const parent=await env.DB.prepare('SELECT day,end_day FROM schedule_entries WHERE id=?').bind(input.entryId).first();if(!parent||input.day<parent.day||input.day>parent.end_day)return scheduleJSON({error:'工作項目不在選擇的日期'},400);}
   await env.DB.prepare('INSERT INTO schedule_reports(id,entry_id,day,body,photo_key,photo_name,author_id,author_name,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(input.id,input.entryId||'',input.day,input.body.trim(),null,'',String(employee.id),employee.name,now).run();return scheduleJSON({saved:true});
  }
  if(!['weekly','daily','special'].includes(kind))return scheduleJSON({error:'排程類型不正確'},400);
  const capability=kind==='weekly'?'schedule.weekly':'schedule.daily';if((kind==='weekly'||kind==='special'?employee.role!=='supervisor':!['supervisor','warehouse'].includes(employee.role))||!scheduleAllowed(employee,capability))return scheduleJSON({error:'沒有此排程的修改權限'},403);
  if(method==='DELETE'){const old=await env.DB.prepare('SELECT id,revision,kind FROM schedule_entries WHERE id=?').bind(input.id).first();if(!old)return scheduleJSON({error:'找不到項目'},404);if(old.kind!==kind)return scheduleJSON({error:'排程類型不符'},400);if(old.revision!==input.revision)return scheduleJSON({error:'排程已被他人修改，請重新載入'},409);await env.DB.prepare('DELETE FROM schedule_entries WHERE id=? AND revision=?').bind(input.id,input.revision).run();return scheduleJSON({deleted:true});}
  if(!scheduleText(input.id,80)||!scheduleDate(input.day)||!scheduleDate(input.endDay)||input.endDay<input.day||Date.parse(input.endDay)-Date.parse(input.day)>31*86400000||!scheduleText(input.title,160)||typeof input.assignee!=='string'||input.assignee.length>2000||typeof input.note!=='string'||input.note.length>1000||!/^#[0-9a-fA-F]{6}$/.test(input.color))return scheduleJSON({error:'請檢查排程日期與內容'},400);
  
  if(kind==='weekly'){let selected;try{selected=JSON.parse(input.assignee);}catch{selected=null;}if(!Array.isArray(selected)||!selected.length||selected.length>50||new Set(selected).size!==selected.length||!selected.every(n=>typeof n==='string'&&n.length<81))return scheduleJSON({error:'請選擇至少一位負責人'},400);const valid=await env.DB.prepare("SELECT name FROM employees WHERE status='active'").all();if(!selected.every(n=>valid.results.some(p=>p.name===n)))return scheduleJSON({error:'負責人名單已更新，請重新開啟安排'},409);}
  if(kind==='daily'&&input.category){let names;try{names=JSON.parse(input.assignee)}catch{names=null}if(!Array.isArray(names)||!names.length||!names.every(n=>typeof n==='string'))return scheduleJSON({error:'請選擇每日工作的人員'},400)}
  if(input.category){let contents;try{contents=JSON.parse(input.category)}catch{contents=null}if(!Array.isArray(contents)||!contents.length||contents.length>100||!contents.every(x=>typeof x==='string'&&x.trim()&&x.length<=80))return scheduleJSON({error:'請選擇有效的工作內容'},400)}
  if(kind==='daily'&&input.day!==input.endDay)return scheduleJSON({error:'每日排程只能安排單日'},400);
  const old=await env.DB.prepare('SELECT revision FROM schedule_entries WHERE id=?').bind(input.id).first();if((old?.revision||0)!==input.revision)return scheduleJSON({error:'排程已被他人修改，請重新載入'},409);
  if(old)await env.DB.prepare('UPDATE schedule_entries SET kind=?,day=?,end_day=?,title=?,assignee=?,color=?,note=?,category=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?').bind(kind,input.day,input.endDay,input.title.trim(),input.assignee.trim(),input.color,input.note.trim(),input.category||'',now,input.id,input.revision).run();
  else await env.DB.prepare('INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,1)').bind(input.id,kind,input.day,input.endDay,input.title.trim(),input.assignee.trim(),input.color,input.note.trim(),input.category||'', '',String(employee.id),employee.name,now,now).run();
  return scheduleJSON({saved:true});
 }catch(e){return scheduleJSON({error:e.message||'排程操作失敗'},400);}
}
export async function schedulePhotoApi(request,env,employee){
 try{const url=new URL(request.url);if(url.searchParams.get('export')==='1'?!scheduleAllowed(employee,'records.export'):!scheduleAllowed(employee,'schedule.view'))return scheduleJSON({error:'沒有查看權限'},403);const id=url.searchParams.get('id');if(!id)return scheduleJSON({error:'缺少回報編號'},400);const row=await env.DB.prepare('SELECT * FROM schedule_reports WHERE id=?').bind(id).first();if(!row?.photo_key)return scheduleJSON({error:'找不到照片'},404);
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
