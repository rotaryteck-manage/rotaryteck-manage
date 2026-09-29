const scheduleJSON=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const scheduleDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const scheduleText=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const scheduleAllowed=(employee,cap)=>employee.permissions?.includes(cap)===true;
const schedulePhotoLimit67=800*1024;
const scheduleDefaults60={items:['組裝','測試','品檢','收料','寄出','其他'],contents:['準備','執行','檢查','完成','其他']};
async function scheduleOptions60(env){await env.DB.prepare('CREATE TABLE IF NOT EXISTS schedule_options (id INTEGER PRIMARY KEY CHECK(id=1),items TEXT NOT NULL,contents TEXT NOT NULL)').run();const row=await env.DB.prepare('SELECT items,contents FROM schedule_options WHERE id=1').first();return row?{items:JSON.parse(row.items),contents:JSON.parse(row.contents)}:scheduleDefaults60;}
async function scheduleApiCore71(request,env,employee){
 try{
  if(!scheduleAllowed(employee,'schedule.view'))return scheduleJSON({error:'沒有查看工作排程的權限'},403);
  const url=new URL(request.url),method=request.method;
  if(method==='GET'&&url.searchParams.get('view')==='text')return scheduleExtra71(request,env,employee,null);
  if(method==='GET'){
   const from=url.searchParams.get('from'),to=url.searchParams.get('to');if(!scheduleDate(from)||!scheduleDate(to)||to<from||Date.parse(to)-Date.parse(from)>370*86400000)return scheduleJSON({error:'日期範圍不正確'},400);
   const rows=await env.DB.prepare('SELECT id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,project_name,author_id,author_name,created_at,updated_at,revision,sort_index,receipt_photo_key,receipt_photo_name,item_photo_key,item_photo_name FROM schedule_entries WHERE day<=? AND end_day>=? ORDER BY day,id').bind(to,from).all();
   const reports=await env.DB.prepare('SELECT id,entry_id,day,body,photo_key,photo_name,author_id,author_name,created_at FROM schedule_reports WHERE day BETWEEN ? AND ? ORDER BY created_at,id').bind(from,to).all();
   const people=await env.DB.prepare("SELECT e.id,e.name FROM employees e LEFT JOIN app_employee_settings x ON x.employee_id=e.id WHERE e.status='active' ORDER BY COALESCE(x.position,e.id),e.id").all();
   const weeklyNotes=await env.DB.prepare('SELECT week_start,body,updated_at,author_name FROM schedule_weekly_notes WHERE week_start BETWEEN ? AND ? ORDER BY week_start').bind(from,to).all();
   return scheduleJSON({entries:rows.results,weeklyNotes:weeklyNotes.results,people:people.results,options:await scheduleOptions60(env),reports:reports.results.map(r=>({...r,photo_key:r.photo_key?'present':''}))});
  }
  if(request.headers.get('origin')!==url.origin)return scheduleJSON({error:'來源驗證失敗'},403);
  if(method!=='POST'&&method!=='DELETE')return scheduleJSON({error:'不支援的操作'},405);
  const size=Number(request.headers.get('content-length')||0);if(size>300000)return scheduleJSON({error:'資料過大'},413);
  if(!request.headers.get('content-type')?.includes('application/json'))return scheduleJSON({error:'格式不正確'},415);
  const input=await request.json();if(JSON.stringify(input).length>300000)return scheduleJSON({error:'資料過大'},413);
  const now=new Date().toISOString(),kind=input.kind;
  if(['copy_week','reset_week','text_delete'].includes(kind))return scheduleExtra71(request,env,employee,input);
  if(kind==='options'){
   if(method!=='POST'||employee.role!=='supervisor'||!scheduleAllowed(employee,'schedule.weekly'))return scheduleJSON({error:'只有主管可以設定工作選項'},403);
   const valid=list=>Array.isArray(list)&&list.length<=100&&list.every(v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=80)&&new Set(list).size===list.length;
   if(!valid(input.items)||!valid(input.contents))return scheduleJSON({error:'選項不可空白、重複或超過 80 字'},400);
   await scheduleOptions60(env);await env.DB.prepare('INSERT INTO schedule_options(id,items,contents) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET items=excluded.items,contents=excluded.contents').bind(JSON.stringify(input.items),JSON.stringify(input.contents)).run();return scheduleJSON({saved:true});
  }
  if(kind==='batch'){
   if(method!=='POST'||!['supervisor','warehouse'].includes(employee.role)||!Array.isArray(input.entries)||!Array.isArray(input.deletions||[])||input.entries.length+(input.deletions||[]).length<1||input.entries.length+(input.deletions||[]).length>20)return scheduleJSON({error:'無法批次儲存工作'},403);
   const ids=new Set(),people=await env.DB.prepare("SELECT name FROM employees WHERE status='active'").all(),active=new Set(people.results.map(x=>x.name)),statements=[];
   for(const item of input.entries){const cap=item.kind==='weekly'?'schedule.weekly':item.kind==='daily'?'schedule.daily':'';if(!cap||(item.kind==='weekly'&&employee.role!=='supervisor')||!scheduleAllowed(employee,cap)||!scheduleText(item.id,80)||ids.has(item.id)||!scheduleDate(item.day)||!scheduleDate(item.endDay)||item.endDay<item.day||Date.parse(item.endDay)-Date.parse(item.day)>31*86400000||item.kind==='daily'&&item.day!==item.endDay||!scheduleText(item.title,160)||typeof item.note!=='string'||item.note.length>1000||!/^#[0-9a-fA-F]{6}$/.test(item.color)||!Number.isInteger(item.revision)||item.revision<0||item.sortIndex!==undefined&&(!Number.isInteger(item.sortIndex)||item.sortIndex<0||item.sortIndex>1000000))return scheduleJSON({error:'第 '+(statements.length+1)+' 項工作不完整'},400);ids.add(item.id);
    let assignees,contents;try{assignees=JSON.parse(item.assignee);contents=JSON.parse(item.category)}catch{return scheduleJSON({error:'請勾選工作內容及人員'},400)}
    if(!Array.isArray(assignees)||!assignees.length||assignees.length>50||new Set(assignees).size!==assignees.length||!assignees.every(x=>active.has(x))||!Array.isArray(contents)||!contents.length||contents.length>100||!contents.every(x=>typeof x==='string'&&x.trim()&&x.length<=80))return scheduleJSON({error:'工作人員或內容選擇不正確'},400);
    const old=await env.DB.prepare('SELECT revision,kind FROM schedule_entries WHERE id=?').bind(item.id).first();if(old&&old.kind!==item.kind)return scheduleJSON({error:'排程類型不符'},400);if((old?.revision||0)!==item.revision)return scheduleJSON({error:'排程已由他人修改，請重新載入'},409);
    statements.push(old?env.DB.prepare('UPDATE schedule_entries SET kind=?,day=?,end_day=?,title=?,assignee=?,color=?,note=?,category=?,sort_index=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?').bind(item.kind,item.day,item.endDay,item.title,item.assignee,item.color,item.note,item.category,item.sortIndex||0,now,item.id,item.revision):env.DB.prepare('INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,sort_index) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,1,?)').bind(item.id,item.kind,item.day,item.endDay,item.title,item.assignee,item.color,item.note,item.category,'',String(employee.id),employee.name,now,now,item.sortIndex||0));
   }for(const removal of input.deletions||[]){
    if(!scheduleText(removal.id,80)||ids.has(removal.id)||!Number.isInteger(removal.revision)||removal.revision<1)return scheduleJSON({error:'刪除工作資料不正確'},400);
    ids.add(removal.id);const old=await env.DB.prepare('SELECT revision,kind FROM schedule_entries WHERE id=?').bind(removal.id).first();
    if(!old||!['weekly','daily'].includes(old.kind))return scheduleJSON({error:'找不到工作'},404);
    if((old.kind==='weekly'&&employee.role!=='supervisor')||!scheduleAllowed(employee,'schedule.'+old.kind))return scheduleJSON({error:'沒有刪除此排程的權限'},403);
    if(old.revision!==removal.revision)return scheduleJSON({error:'排程已由他人修改，請重新載入'},409);
    statements.push(env.DB.prepare('DELETE FROM schedule_entries WHERE id=? AND revision=? AND kind=?').bind(removal.id,removal.revision,old.kind));
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
   if(method==='DELETE'){const old=await env.DB.prepare("SELECT revision,receipt_photo_key,item_photo_key FROM schedule_entries WHERE id=? AND kind='material'").bind(input.id).first();if(!old)return scheduleJSON({error:'找不到物料紀錄'},404);if(old.revision!==input.revision)return scheduleJSON({error:'紀錄已由他人修改，請重新載入'},409);await env.DB.prepare("DELETE FROM schedule_entries WHERE id=? AND kind='material' AND revision=?").bind(input.id,input.revision).run();for(const key of [old.receipt_photo_key,old.item_photo_key])if(key)await env.UPLOADS?.delete(key);return scheduleJSON({deleted:true})}
   if(!scheduleText(input.id,80)||!scheduleDate(input.day)||!scheduleText(input.title,160)||!['收料','出貨','送貨'].includes(input.category)||!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>1000000||typeof input.note!=='string'||input.note.length>1000||!Number.isInteger(input.revision)||input.revision<0)return scheduleJSON({error:'請填寫物料日期、品項、數量與類型'},400);
   const old=await env.DB.prepare('SELECT revision,kind FROM schedule_entries WHERE id=?').bind(input.id).first();if(old&&old.kind!==kind)return scheduleJSON({error:'紀錄類型不符'},400);if((old?.revision||0)!==input.revision)return scheduleJSON({error:'紀錄已由他人修改，請重新載入'},409);
   if(old)await env.DB.prepare("UPDATE schedule_entries SET day=?,end_day=?,title=?,category=?,quantity=?,note=?,updated_at=?,revision=revision+1 WHERE id=? AND kind='material' AND revision=?").bind(input.day,input.day,input.title.trim(),input.category,input.quantity,input.note.trim(),now,input.id,input.revision).run();
   else await env.DB.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision) VALUES (?,'material',?,? ,?,'','#4e8069',?,?,?,'',?,?,?,?,1)").bind(input.id,input.day,input.day,input.title.trim(),input.note.trim(),input.category,input.quantity,String(employee.id),employee.name,now,now).run();return scheduleJSON({saved:true});
  }
  if(kind==='report'){
   if(!scheduleAllowed(employee,'schedule.report'))return scheduleJSON({error:'沒有回報權限'},403);
   if(method==='DELETE'){const old=await env.DB.prepare('SELECT * FROM schedule_reports WHERE id=?').bind(input.id).first();if(!old)return scheduleJSON({error:'找不到回報'},404);if(employee.role!=='supervisor'&&old.author_id!==String(employee.id))return scheduleJSON({error:'只能刪除自己的回報'},403);await env.DB.prepare('DELETE FROM schedule_reports WHERE id=? AND author_id=?').bind(old.id,old.author_id).run();if(old.photo_key)await env.UPLOADS?.delete(old.photo_key);return scheduleJSON({deleted:true});}
   return scheduleJSON({error:'請選擇安排給自己的工作，並上傳工作照片'},400);
  }
  if(!['weekly','daily','special'].includes(kind))return scheduleJSON({error:'排程類型不正確'},400);
  const capability=kind==='weekly'?'schedule.weekly':'schedule.daily';if((kind==='weekly'||kind==='special'?employee.role!=='supervisor':!['supervisor','warehouse'].includes(employee.role))||!scheduleAllowed(employee,capability))return scheduleJSON({error:'沒有此排程的修改權限'},403);
  if(method==='DELETE'){const old=await env.DB.prepare('SELECT id,revision,kind FROM schedule_entries WHERE id=?').bind(input.id).first();if(!old)return scheduleJSON({error:'找不到項目'},404);if(old.kind!==kind)return scheduleJSON({error:'排程類型不符'},400);if(old.revision!==input.revision)return scheduleJSON({error:'排程已被他人修改，請重新載入'},409);await env.DB.prepare('DELETE FROM schedule_entries WHERE id=? AND revision=?').bind(input.id,input.revision).run();return scheduleJSON({deleted:true});}
  if(input.sortIndex!==undefined&&(!Number.isInteger(input.sortIndex)||input.sortIndex<0||input.sortIndex>1000000))return scheduleJSON({error:'工作順序不正確'},400);
  if(!scheduleText(input.id,80)||!scheduleDate(input.day)||!scheduleDate(input.endDay)||input.endDay<input.day||Date.parse(input.endDay)-Date.parse(input.day)>31*86400000||!scheduleText(input.title,160)||typeof input.assignee!=='string'||input.assignee.length>2000||typeof input.note!=='string'||input.note.length>1000||!/^#[0-9a-fA-F]{6}$/.test(input.color))return scheduleJSON({error:'請檢查排程日期與內容'},400);
  
  if(kind==='weekly'){let selected;try{selected=JSON.parse(input.assignee);}catch{selected=null;}if(!Array.isArray(selected)||!selected.length||selected.length>50||new Set(selected).size!==selected.length||!selected.every(n=>typeof n==='string'&&n.length<81))return scheduleJSON({error:'請選擇至少一位負責人'},400);const valid=await env.DB.prepare("SELECT name FROM employees WHERE status='active'").all();if(!selected.every(n=>valid.results.some(p=>p.name===n)))return scheduleJSON({error:'負責人名單已更新，請重新開啟安排'},409);}
  if(kind==='daily'&&input.category){let names;try{names=JSON.parse(input.assignee)}catch{names=null}if(!Array.isArray(names)||!names.length||!names.every(n=>typeof n==='string'))return scheduleJSON({error:'請選擇每日工作的人員'},400)}
  if(input.category){let contents;try{contents=JSON.parse(input.category)}catch{contents=null}if(!Array.isArray(contents)||!contents.length||contents.length>100||!contents.every(x=>typeof x==='string'&&x.trim()&&x.length<=80))return scheduleJSON({error:'請選擇有效的工作內容'},400)}
  if(kind==='daily'&&input.day!==input.endDay)return scheduleJSON({error:'每日排程只能安排單日'},400);
  const old=await env.DB.prepare('SELECT revision FROM schedule_entries WHERE id=?').bind(input.id).first();if((old?.revision||0)!==input.revision)return scheduleJSON({error:'排程已被他人修改，請重新載入'},409);
  if(old)await env.DB.prepare('UPDATE schedule_entries SET kind=?,day=?,end_day=?,title=?,assignee=?,color=?,note=?,category=?,sort_index=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?').bind(kind,input.day,input.endDay,input.title.trim(),input.assignee.trim(),input.color,input.note.trim(),input.category||'',input.sortIndex||0,now,input.id,input.revision).run();
  else await env.DB.prepare('INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,sort_index) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,1,?)').bind(input.id,kind,input.day,input.endDay,input.title.trim(),input.assignee.trim(),input.color,input.note.trim(),input.category||'', '',String(employee.id),employee.name,now,now,input.sortIndex||0).run();
  return scheduleJSON({saved:true});
 }catch(e){return scheduleJSON({error:e.message||'排程操作失敗'},400);}
}
export async function schedulePhotoApi(request,env,employee){
 try{const url=new URL(request.url);if(url.searchParams.get('export')==='1'?!scheduleAllowed(employee,'records.export'):!scheduleAllowed(employee,'schedule.view'))return scheduleJSON({error:'沒有查看權限'},403);const id=url.searchParams.get('id');if(!id)return scheduleJSON({error:'缺少回報編號'},400);const row=await env.DB.prepare('SELECT * FROM schedule_reports WHERE id=?').bind(id).first();if(!row?.photo_key)return scheduleJSON({error:'找不到照片'},404);
  const file=await env.UPLOADS?.get(row.photo_key);if(!file)return scheduleJSON({error:'找不到照片'},404);return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}});
 }catch(e){return scheduleJSON({error:e.message},400);}
}
async function schedulePhotoUploadCore71(request,env,employee){
 try{if(!scheduleAllowed(employee,'schedule.report'))return scheduleJSON({error:'沒有回報權限'},403);if(request.headers.get('origin')!==new URL(request.url).origin)return scheduleJSON({error:'來源驗證失敗'},403);
  if(Number(request.headers.get('content-length')||0)>1000000)return scheduleJSON({error:'照片不可超過 800 KB'},413);
  const form=await request.formData(),id=String(form.get('id')||''),photo=form.get('photo');
  if(!(photo instanceof File)||!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>schedulePhotoLimit67||photo.size===0||!env.UPLOADS)return scheduleJSON({error:'請選擇小於 800 KB 的 JPG、PNG 或 WebP'},400);
  if(form.get('mode')==='create'){
   const day=String(form.get('day')||''),body=String(form.get('body')||'').trim(),entryId=String(form.get('entryId')||'');
   if(!scheduleText(id,80)||!scheduleDate(day)||!scheduleText(body,3000)||!scheduleText(entryId,80))return scheduleJSON({error:'請填寫日期、工作與回報內容'},400);
   const entry=await env.DB.prepare("SELECT kind,day,end_day,assignee FROM schedule_entries WHERE id=?").bind(entryId).first();let people=[];try{people=JSON.parse(entry?.assignee||'[]')}catch{}
   if(entry?.kind!=='daily'||day<entry.day||day>entry.end_day||!Array.isArray(people)||!people.includes(employee.name))return scheduleJSON({error:'只能回報當天安排給自己的工作'},403);
   const key='schedule/'+id+'/'+crypto.randomUUID();await env.UPLOADS.put(key,photo.stream(),{httpMetadata:{contentType:photo.type}});
   try{await env.DB.prepare('INSERT INTO schedule_reports(id,entry_id,day,body,photo_key,photo_name,author_id,author_name,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,entryId,day,body,key,String(photo.name).slice(0,200),String(employee.id),employee.name,new Date().toISOString()).run()}catch(e){await env.UPLOADS.delete(key);throw e}
   return scheduleJSON({saved:true});
  }
  const row=await env.DB.prepare('SELECT * FROM schedule_reports WHERE id=?').bind(id).first();if(!row||row.author_id!==String(employee.id)&&employee.role!=='supervisor')return scheduleJSON({error:'只能修改自己的回報'},403);
  const key='schedule/'+id+'/'+crypto.randomUUID();await env.UPLOADS.put(key,photo.stream(),{httpMetadata:{contentType:photo.type}});await env.DB.prepare('UPDATE schedule_reports SET photo_key=?,photo_name=? WHERE id=?').bind(key,String(photo.name).slice(0,200),id).run();if(row.photo_key)await env.UPLOADS.delete(row.photo_key);return scheduleJSON({saved:true});
 }catch(e){return scheduleJSON({error:e.message||'照片上傳失敗'},400);}
}
export async function scheduleMaterialPhotoApi(request,env,employee){
 try{
  const url=new URL(request.url),exporting=url.searchParams.get('export')==='1';if(request.method!=='GET'||!scheduleAllowed(employee,exporting?'records.export':'schedule.view'))return scheduleJSON({error:'沒有查看照片的權限'},403);
  const kind=url.searchParams.get('type');if(!['receipt','item'].includes(kind))return scheduleJSON({error:'照片類型不正確'},400);
  const row=await env.DB.prepare('SELECT receipt_photo_key,item_photo_key FROM schedule_entries WHERE id=? AND kind=\'material\'').bind(url.searchParams.get('id')).first(),key=kind==='receipt'?row?.receipt_photo_key:row?.item_photo_key;
  if(!key)return scheduleJSON({error:'找不到照片'},404);const file=await env.UPLOADS?.get(key);if(!file)return scheduleJSON({error:'找不到照片'},404);
  return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return scheduleJSON({error:e.message||'照片讀取失敗'},400)}
}
async function scheduleMaterialUploadCore71(request,env,employee){
 const stored=[];try{
  if(request.method!=='POST'||!['supervisor','warehouse'].includes(employee.role)||!scheduleAllowed(employee,'schedule.material'))return scheduleJSON({error:'沒有每日料件登錄權限'},403);
  if(request.headers.get('origin')!==new URL(request.url).origin)return scheduleJSON({error:'來源驗證失敗'},403);
  if(Number(request.headers.get('content-length')||0)>1900000)return scheduleJSON({error:'照片不可超過 800 KB'},413);
  const form=await request.formData(),id=String(form.get('id')||''),day=String(form.get('day')||''),title=String(form.get('title')||'').trim(),projectName=String(form.get('projectName')||'').trim(),category=String(form.get('category')||''),quantity=Number(form.get('quantity')),revision=Number(form.get('revision')),note=String(form.get('note')||'');
  if(!scheduleText(id,80)||!scheduleDate(day)||!scheduleText(title,160)||!scheduleText(projectName,160)||!['收料','出貨','送貨'].includes(category)||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000000||!Number.isInteger(revision)||revision<0||note.length>1000)return scheduleJSON({error:'請檢查案件名稱、料件日期、類型、名稱和數量'},400);
  const old=await env.DB.prepare("SELECT kind,revision,author_id,author_name,receipt_photo_key,receipt_photo_name,item_photo_key,item_photo_name FROM schedule_entries WHERE id=?").bind(id).first();if(old&&old.kind!=='material')return scheduleJSON({error:'紀錄類型不符'},400);if((old?.revision||0)!==revision)return scheduleJSON({error:'紀錄已由他人修改，請重新載入'},409);
  let authorId=old?.author_id||String(employee.id),authorName=old?.author_name||employee.name;
  const requested=String(form.get('authorId')||'');
  if(requested&&requested!==authorId){if(employee.role!=='supervisor')return scheduleJSON({error:'只有主管可修改登記人'},403);const person=await env.DB.prepare("SELECT id,name FROM employees WHERE id=? AND status='active'").bind(requested).first();if(!person)return scheduleJSON({error:'登記人已停用或不存在'},400);authorId=String(person.id);authorName=person.name;}
  const photos={};for(const [type,field] of [['receipt','receiptPhoto'],['item','photo']]){
   const file=form.get(field)||form.get(type==='item'?'itemPhoto':'receiptPhoto');if(!file||typeof file==='string'||!file.size)continue;
   if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>schedulePhotoLimit67||!env.UPLOADS)return scheduleJSON({error:'請選擇小於 800 KB 的 JPG、PNG 或 WebP'},400);
   photos[type]=file;
  }
  const keys={receipt:old?.receipt_photo_key||'',item:old?.item_photo_key||''},names={receipt:old?.receipt_photo_name||'',item:old?.item_photo_name||''};
  for(const type of ['receipt','item'])if(photos[type]){const key='schedule-material/'+id+'/'+type+'/'+crypto.randomUUID();await env.UPLOADS.put(key,photos[type].stream(),{httpMetadata:{contentType:photos[type].type}});stored.push(key);keys[type]=key;names[type]=String(photos[type].name).slice(0,200)}
  const now=new Date().toISOString();
  if(old){const result=await env.DB.prepare("UPDATE schedule_entries SET author_id=?,author_name=?,day=?,end_day=?,title=?,project_name=?,category=?,quantity=?,note=?,receipt_photo_key=?,receipt_photo_name=?,item_photo_key=?,item_photo_name=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND kind='material'").bind(authorId,authorName,day,day,title,projectName,category,quantity,note,keys.receipt,names.receipt,keys.item,names.item,now,id,revision).run();if(result.meta?.changes!==1)throw Error('紀錄已由他人修改，請重新載入')}
  else await env.DB.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,project_name,author_id,author_name,created_at,updated_at,revision,receipt_photo_key,receipt_photo_name,item_photo_key,item_photo_name) VALUES (?,'material',?,?,?,'','#4e8069',?,?,?,'',?,?,?,?,?,1,?,?,?,?)").bind(id,day,day,title,note,category,quantity,projectName,authorId,authorName,now,now,keys.receipt,names.receipt,keys.item,names.item).run();
  for(const type of ['receipt','item'])if(photos[type]&&old?.[type+'_photo_key'])try{await env.UPLOADS.delete(old[type+'_photo_key'])}catch{}return scheduleJSON({saved:true});
 }catch(e){for(const key of stored)try{await env.UPLOADS?.delete(key)}catch{}return scheduleJSON({error:e.message||'料件照片上傳失敗'},400)}
}

const scheduleReadable71=x=>{try{const a=JSON.parse(x);return Array.isArray(a)?a.join('、'):String(x||'')}catch{return String(x||'')}};
const scheduleShift71=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
async function scheduleTables71(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS schedule_copies71 (week TEXT PRIMARY KEY,created_at TEXT NOT NULL)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS schedule_text71 (id TEXT PRIMARY KEY,kind TEXT NOT NULL,day TEXT NOT NULL,actor TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS schedule_text_refs71 (id TEXT PRIMARY KEY)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS schedule_hidden_text71 (id TEXT PRIMARY KEY)').run();
}
async function scheduleExtra71(request,env,employee,input){
 const url=new URL(request.url),method=request.method;
 if(!scheduleAllowed(employee,'schedule.view'))return scheduleJSON({error:'沒有查看工作排程的權限'},403);
 if(employee.role!=='supervisor')return scheduleJSON({error:'只有主管可以操作'},403);
 await scheduleTables71(env);
 if(method==='GET'){
  const from=url.searchParams.get('from'),to=url.searchParams.get('to'),kind=url.searchParams.get('kind');
  if(!scheduleDate(from)||!scheduleDate(to)||to<from||Date.parse(to)-Date.parse(from)>370*86400000||!['daily','weekly'].includes(kind))return scheduleJSON({error:'日期或類型不正確'},400);
  const rows=await env.DB.prepare('SELECT * FROM schedule_text71 WHERE kind=? AND day BETWEEN ? AND ? ORDER BY created_at DESC,id').bind(kind,from,to).all();
  const entries=await env.DB.prepare("SELECT * FROM schedule_entries WHERE (kind=? OR (?='daily' AND kind='material')) AND day<=? AND end_day>=? AND NOT EXISTS(SELECT 1 FROM schedule_text_refs71 r WHERE r.id=schedule_entries.id) ORDER BY day DESC,id").bind(kind,kind,to,from).all();
  const reports=kind==='daily'?await env.DB.prepare('SELECT * FROM schedule_reports WHERE day BETWEEN ? AND ? AND NOT EXISTS(SELECT 1 FROM schedule_text_refs71 r WHERE r.id=schedule_reports.id)').bind(from,to).all():{results:[]};
  const hidden=await env.DB.prepare('SELECT id FROM schedule_hidden_text71').all();const excluded=new Set(hidden.results.map(e=>e.id));
  return scheduleJSON({items:[...rows.results,...reports.results.map(e=>({id:'report:'+e.id,kind:'daily',day:e.day,actor:e.author_name,created_at:e.created_at,body:'工作回報｜'+e.body})),...entries.results.map(e=>({id:'entry:'+e.id,kind:e.kind,day:e.day,actor:e.author_name,created_at:e.created_at,body:(e.kind==='material'?'料件紀錄｜':'排程｜')+e.day+' 至 '+e.end_day+'｜【'+e.title+'】｜'+e.category+'｜'+e.assignee}))].filter(e=>!excluded.has(e.id))});
 }
 if(request.headers.get('origin')!==url.origin)return scheduleJSON({error:'來源驗證失敗'},403);
 if(input.kind==='text_delete'){
  if(method!=='DELETE'||!scheduleText(input.id,120))return scheduleJSON({error:'紀錄編號不正確'},400);
  await env.DB.batch([env.DB.prepare('INSERT OR IGNORE INTO schedule_hidden_text71(id) VALUES(?)').bind(input.id),env.DB.prepare('DELETE FROM schedule_text71 WHERE id=?').bind(input.id)]);return scheduleJSON({deleted:true});
 }
 if(method!=='POST'||!scheduleAllowed(employee,'schedule.weekly'))return scheduleJSON({error:'沒有每週排程權限'},403);
 const week=input.weekStart,end=scheduleDate(week)?scheduleShift71(week,6):'';
 if(!scheduleDate(week)||new Date(week+'T00:00:00Z').getUTCDay()!==1)return scheduleJSON({error:'請選擇正確的週別'},400);
 const now=new Date().toISOString(),statements=[];
 if(input.kind==='copy_week'){
  if(await env.DB.prepare('SELECT week FROM schedule_copies71 WHERE week=?').bind(week).first())return scheduleJSON({saved:true,already:true});
  const source=scheduleShift71(week,-7),last=scheduleShift71(week,-1);
  const rows=await env.DB.prepare("SELECT * FROM schedule_entries WHERE kind='weekly' AND day<=? AND end_day>=? ORDER BY day,id").bind(last,source).all();
  if(!rows.results.length)return scheduleJSON({error:'上週沒有可複製的安排'},400);
  statements.push(env.DB.prepare('INSERT INTO schedule_copies71(week,created_at) VALUES(?,?)').bind(week,now));
  const target=await env.DB.prepare("SELECT * FROM schedule_entries WHERE kind='weekly' AND day>=? AND end_day<=?").bind(week,end).all();
  const signature=e=>JSON.stringify([e.day,e.end_day,e.title,e.assignee,e.category,e.color,e.note]);const available=new Map();for(const e of target.results){const key=signature(e);available.set(key,(available.get(key)||0)+1)}
  const missing=rows.results.filter(e=>{const key=signature({...e,day:scheduleShift71(e.day<source?source:e.day,7),end_day:scheduleShift71(e.end_day>last?last:e.end_day,7)}),n=available.get(key)||0;if(n){available.set(key,n-1);return false}return true});
  for(const e of missing)statements.push(env.DB.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,sort_index) VALUES(?,'weekly',?,?,?,?,?,?,?,0,'',?,?,?,?,1,?)").bind(crypto.randomUUID(),scheduleShift71(e.day<source?source:e.day,7),scheduleShift71(e.end_day>last?last:e.end_day,7),e.title,e.assignee,e.color,e.note,e.category,String(employee.id),employee.name,now,now,e.sort_index||0));
  statements.push(env.DB.prepare('INSERT INTO schedule_text71 VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),'weekly',week,employee.name,'複製上週排程｜新增 '+missing.length+' 項',now));
  try{await env.DB.batch(statements)}catch(e){if(await env.DB.prepare('SELECT week FROM schedule_copies71 WHERE week=?').bind(week).first())return scheduleJSON({saved:true,already:true});throw e}return scheduleJSON({saved:true,count:missing.length,already:missing.length===0});
 }
 // SQL-only range splitting is atomic, preserving the dates outside the selected week.
 statements.push(env.DB.prepare("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision,sort_index) SELECT lower(hex(randomblob(16))),kind,?,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,?,1,sort_index FROM schedule_entries WHERE kind='weekly' AND day<? AND end_day>?").bind(scheduleShift71(end,1),now,week,end));
 statements.push(env.DB.prepare("DELETE FROM schedule_entries WHERE kind='weekly' AND day>=? AND end_day<=?").bind(week,end));
 statements.push(env.DB.prepare("UPDATE schedule_entries SET end_day=?,revision=revision+1,updated_at=? WHERE kind='weekly' AND day<? AND end_day>=?").bind(scheduleShift71(week,-1),now,week,week));
 statements.push(env.DB.prepare("UPDATE schedule_entries SET day=?,revision=revision+1,updated_at=? WHERE kind='weekly' AND day BETWEEN ? AND ? AND end_day>?").bind(scheduleShift71(end,1),now,week,end,end));
 statements.push(env.DB.prepare('DELETE FROM schedule_weekly_notes WHERE week_start=?').bind(week));
 statements.push(env.DB.prepare('DELETE FROM schedule_copies71 WHERE week=?').bind(week));
 statements.push(env.DB.prepare('INSERT INTO schedule_text71 VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),'weekly',week,employee.name,'重置本週排程｜'+week+' 至 '+end,now));
 await env.DB.batch(statements);return scheduleJSON({saved:true});
}

// Add text history in the same D1 transaction as the data change.
async function scheduleAudited71(request,env,employee,handler){
 if(request.method==='GET')return handler(request,env,employee);
 let input={};try{const copy=request.clone();if(request.headers.get('content-type')?.includes('application/json'))input=await copy.json();else{const f=await copy.formData();for(const key of ['id','day','title','category','quantity','projectName','authorId','body','entryId'])input[key]=String(f.get(key)||'');input.kind='daily'}}catch{return handler(request,env,employee)}
 if(['copy_week','reset_week','text_delete','options'].includes(input.kind))return handler(request,env,employee);
 await scheduleTables71(env);
 const ids=[input.id,...(input.entries||[]).map(e=>e.id),...(input.deletions||[]).map(e=>e.id)].filter(Boolean),before=[];
 for(const id of ids){const old=await env.DB.prepare('SELECT * FROM schedule_entries WHERE id=?').bind(id).first();if(old)before.push(old)}
 const kind=input.kind==='weekly'||input.kind==='weekly_note'||input.entries?.some(e=>e.kind==='weekly')||before.some(e=>e.kind==='weekly')?'weekly':'daily';
 const day=input.day||input.weekStart||input.entries?.[0]?.day||before[0]?.day||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'});
 const label=request.method==='DELETE'?'刪除':before.length?'修改':'新增';
 const summary=(input.entries||[input]).filter(x=>x.title||x.body).map(e=>[e.title?'【'+e.title+'】':'',scheduleReadable71(e.category),scheduleReadable71(e.assignee),e.body||'',e.day?'日期 '+e.day:'',e.note||'',e.quantity?'數量 '+e.quantity:'',e.projectName||''].filter(Boolean).join('｜')).join('；');
 const body=label+'紀錄｜'+(summary||before.map(e=>e.title).join('、')||input.kind)+(input.deletions?.length?'｜移除 '+input.deletions.length+' 項':'')+(before.length?'｜修改前：'+before.map(e=>[e.day,e.title,e.category,e.quantity||'',e.author_name].join(' / ')).join('；'):'');
 const log=()=>env.DB.prepare('INSERT INTO schedule_text71 SELECT ?,?,?,?,?,? WHERE changes()>0').bind(crypto.randomUUID(),kind,day,employee.name,body,new Date().toISOString());
 const logs=()=>[log(),...ids.map(id=>env.DB.prepare('INSERT OR IGNORE INTO schedule_text_refs71(id) VALUES(?)').bind(id))];
 const wrap=stmt=>({_native71:stmt,bind(...args){return wrap(stmt.bind(...args))},first:()=>stmt.first(),all:()=>stmt.all(),async run(){const results=await env.DB.batch([stmt,...logs()]);return results[0]}});
 const DB={prepare(sql){const stmt=env.DB.prepare(sql);return /^(INSERT|UPDATE|DELETE)\s/i.test(sql)&&/schedule_(entries|reports|weekly_notes)\b/i.test(sql)?wrap(stmt):stmt},batch:statements=>env.DB.batch([...statements.map(s=>s._native71||s),...logs()])};
 return handler(request,{...env,DB},employee);
}

export async function scheduleApi(request,env,employee){try{return await scheduleAudited71(request,env,employee,scheduleApiCore71)}catch(e){return scheduleJSON({error:e.message||"操作失敗"},400)}}

export async function scheduleMaterialUpload(request,env,employee){try{return await scheduleAudited71(request,env,employee,scheduleMaterialUploadCore71)}catch(e){return scheduleJSON({error:e.message||"操作失敗"},400)}}

export async function schedulePhotoUpload(request,env,employee){try{return await scheduleAudited71(request,env,employee,schedulePhotoUploadCore71)}catch(e){return scheduleJSON({error:e.message||"操作失敗"},400)}}
