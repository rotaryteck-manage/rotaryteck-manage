const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function check(ok,message){if(!ok)throw new Error(message);}
function int(x,min=0){return Number.isSafeInteger(x)&&x>=min;}
export function validatePlating(projects=[]){
 check(Array.isArray(projects)&&projects.length<=1000,'電鍍案件格式不正確');const ids=new Set();
 const text=(x,max=100)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
 const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
 for(const p of projects){
  check(object(p)&&text(p.id)&&!ids.has(p.id)&&text(p.name),'電鍍案件名稱或編號不正確');ids.add(p.id);
  check(Array.isArray(p.shipments)&&p.shipments.length<=1000,'送鍍紀錄格式不正確');const shipmentIds=new Set(),numbers=new Set();
  for(const s of p.shipments){
   check(object(s)&&text(s.id)&&!shipmentIds.has(s.id),'送鍍編號重複');shipmentIds.add(s.id);
   check(int(s.number,1)&&s.number<=9999&&!numbers.has(s.number),'送鍍次數重複或不正確');numbers.add(s.number);
   check(text(s.vendor)&&date(s.sent)&&typeof s.returned==='string'&&(!s.returned||(date(s.returned)&&s.returned>=s.sent)),'電鍍廠商或日期不正確');
   check(['pending','passed','abnormal'].includes(s.inspection)&& (s.returned||s.inspection==='pending'),'請先登記回貨日期再品檢');
   check(typeof s.note==='string'&&s.note.length<=1000&&(s.inspection!=='abnormal'||s.note.trim()),'請填寫異常說明');
   check(Array.isArray(s.groups)&&s.groups.length>=1&&s.groups.length<=100,'電鍍配置數量不正確');let total=0,sets=0;
   for(const g of s.groups){
    check(object(g)&&int(g.sets,1)&&g.sets<=1000000&&Array.isArray(g.rings)&&g.rings.length>=1&&g.rings.length<=100,'電鍍組數或環片格式不正確');sets+=g.sets;
    for(const r of g.rings){check(object(r)&&text(r.name)&&int(r.qty,1)&&r.qty<=1000000,'環片名稱或數量不正確');total+=r.qty*g.sets;}
   }check(int(total,1)&&int(sets,1),'電鍍數量超過安全範圍');
  }
 }return projects;
}
export function validate(s){
 check(object(s)&&Array.isArray(s.projects),'專案資料格式不正確');
 validatePlating(s.platingProjects);
 if(s.platingVendors!==undefined)check(Array.isArray(s.platingVendors)&&s.platingVendors.length<=200&&s.platingVendors.every(v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=100)&&new Set(s.platingVendors.map(v=>v.toLowerCase())).size===s.platingVendors.length,'電鍍廠商選項不正確');
 if(s.platingText!==undefined){check(object(s.platingText),'電鍍文字設定不正確');for(const v of Object.values(s.platingText))check(typeof v==='string'&&v.trim()&&v.length<=100,'電鍍文字設定不正確');}
 const cases=s.cases??[];check(Array.isArray(cases)&&cases.length<=1000,'案件資料格式不正確');const caseIds=new Set();
 for(const c of cases){check(object(c)&&typeof c.id==='string'&&!caseIds.has(c.id),'案件編號重複');caseIds.add(c.id);check(typeof c.name==='string'&&c.name.trim()&&c.name.length<=100,'案件名稱不正確');check(typeof c.vendor==='string'&&c.vendor.length<=100,'案件廠商不正確');check(['尚未開始','執行中','進行中','結案'].includes(c.status),'案件狀態不正確');check(c.batch===undefined||(Number.isSafeInteger(c.batch)&&c.batch>0),'製作批次不正確');check(c.quantity===undefined||(Number.isSafeInteger(c.quantity)&&c.quantity>0),'製作套數不正確');for(const d of [c.acceptedDate,c.closedDate])check(typeof d==='string'&&(!d||/^\d{4}-\d{2}-\d{2}$/.test(d)),'案件日期不正確');}
 const logs=s.logs??[];check(Array.isArray(logs)&&logs.length<=20000,'資訊庫紀錄格式不正確');for(const l of logs)check(object(l)&&typeof l.time==='string'&&typeof l.action==='string'&&typeof l.detail==='string'&&(!l.location||typeof l.location==='string'),'資訊庫紀錄格式不正確');
 if(s.auditSecurity!==undefined)check(object(s.auditSecurity)&&/^[a-f0-9]{32}$/.test(s.auditSecurity.salt)&&/^[a-f0-9]{64}$/.test(s.auditSecurity.hash),'資訊庫密碼設定格式不正確');
 check(s.projects.length<=1000,'專案上限為 1000');const ids=new Set();
 const deleted=s.deletedProjects??[];check(Array.isArray(deleted),'刪除資料格式不正確');
 for(const p of [...s.projects,...deleted.map(x=>x.project)]){
  check(object(p)&&typeof p.id==='string'&&p.id.length>0&&!ids.has(p.id),'專案編號重複或缺少');ids.add(p.id);
  if(p.projectDate!==undefined)check(typeof p.projectDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.projectDate),'專案日期不正確');
  if(p.basketCount!==undefined)check(int(p.basketCount,1),'籃數必須為正整數');
  check(typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=100,'專案名稱不正確');
  check(Array.isArray(p.parts)&&object(p.inventory),'零件或庫存格式不正確');const parts=new Set();
  const materialLogs=p.materialLogs??[];check(Array.isArray(materialLogs)&&materialLogs.length<=2000,'收領料紀錄格式不正確');for(const entry of materialLogs){check(object(entry)&&typeof entry.time==='string'&&typeof entry.actor==='string'&&Array.isArray(entry.received)&&Array.isArray(entry.issued),'收領料紀錄格式不正確');for(const item of [...entry.received,...entry.issued])check(object(item)&&typeof item.name==='string'&&int(item.qty,1),'收領料紀錄內容不正確');}
  for(const i of [...p.parts,...(p.archivedParts??[]).map(x=>x.part)]){
   check(object(i)&&typeof i.id==='string'&&!parts.has(i.id),'零件編號重複');parts.add(i.id);
   check(typeof i.name==='string'&&i.name.trim()&&typeof i.spec==='string','零件名稱或規格不正確');
   check(int(i.need)&&int(i.sets,1)&&int(i.need*i.sets)&&int(i.received),'零件數量必須為安全範圍內整數');
  }
  for(const v of Object.values(p.inventory))check(int(v),'庫存不可為負數或超出安全整數');
 }
 for(const cfg of [s.contentDraft,s.contentPublished].filter(Boolean)){
  check(object(cfg)&&Array.isArray(cfg.pages)&&Array.isArray(cfg.fields),'網站設定格式不正確');
  check(cfg.pages.length<=50&&cfg.fields.length<=30,'頁面或欄位過多');const pageIds=new Set(),fieldIds=new Set();
  for(const f of cfg.fields){check(object(f)&&typeof f.id==='string'&&!fieldIds.has(f.id)&&['text','number','date','select'].includes(f.type)&&['project','part'].includes(f.scope)&&typeof f.label==='string'&&f.label.trim(),'欄位格式不正確');fieldIds.add(f.id);}
  for(const p of cfg.pages){check(typeof p.id==='string'&&!pageIds.has(p.id)&&typeof p.title==='string'&&p.title.trim()&&Array.isArray(p.blocks)&&p.blocks.length<=100,'頁面格式不正確');pageIds.add(p.id);
   for(const b of p.blocks){check(['text','button'].includes(b.type),'不支援的區塊');if(b.type==='button'){check(['page','link','new-project','warehouse'].includes(b.action),'不支援的按鈕操作');if(b.action==='link')check(/^https?:\/\//i.test(b.target),'連結必須以 https:// 或 http:// 開頭');}}
  }
 }
 return s;
}
const COMPANY_ID='warehouse-main',STORAGE_OWNER='rotaryteck-manage';
function supabaseReady(env){return /^https:\/\/[^/]+\.supabase\.co$/.test(env.SUPABASE_URL||'')&&env.SUPABASE_PUBLISHABLE_KEY&&env.SUPABASE_SECRET_KEY;}
function cookie(request,name){const value=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));if(!value)return'';try{return decodeURIComponent(value.slice(name.length+1));}catch{return'';}}
function hasCredentials(request){return request.headers.get('authorization')?.startsWith('Bearer ')||!!cookie(request,'rt_access');}
async function identity(request,env){
 if(!supabaseReady(env))throw new Error('登入服務尚未完成設定');
 const auth=request.headers.get('authorization')||'',token=auth.startsWith('Bearer ')?auth.slice(7):cookie(request,'rt_access');if(!token)return null;
 const response=await fetch(env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token}});if(!response.ok)return null;
 const user=await response.json(),email=String(user.email||'').trim().toLowerCase(),name=String(user.user_metadata?.name||'').trim();
 return{id:String(user.id||''),email,name:name||email.split('@')[0]||'使用者'};
}
async function employeeFor(request,env){
 const who=await identity(request,env);if(!who?.id)return null;
 let row=await env.DB.prepare('SELECT id,account_user_id,email,name,role,status,last_login_at FROM employees WHERE account_user_id=? OR lower(email)=? LIMIT 1').bind(who.id,who.email).first();
 if(!row){const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM employees').first();if(Number(count?.total)===0){const now=new Date().toISOString(),email=who.email||who.id+'@account.local';await env.DB.prepare("INSERT INTO employees (account_user_id,email,name,role,status,created_at,updated_at,last_login_at) VALUES (?,?,?,'supervisor','active',?,?,?)").bind(who.id,email,who.name||'主管',now,now,now).run();row=await env.DB.prepare('SELECT id,account_user_id,email,name,role,status,last_login_at FROM employees WHERE account_user_id=?').bind(who.id).first();}}
 if(row&&row.account_user_id!==who.id){await env.DB.prepare('UPDATE employees SET account_user_id=?,last_login_at=? WHERE id=?').bind(who.id,new Date().toISOString(),row.id).run();row.account_user_id=who.id;}
 else if(row)await env.DB.prepare('UPDATE employees SET last_login_at=? WHERE id=?').bind(new Date().toISOString(),row.id).run();
 return row?.status==='active'?row:null;
}
async function companyRow(env){
 let row=await env.DB.prepare('SELECT body,revision FROM company_state WHERE company_id=?').bind(COMPANY_ID).first();
 if(row)return row;
 await env.DB.prepare("INSERT OR IGNORE INTO company_state (company_id,body,revision,updated_at) SELECT ?,body,revision,updated_at FROM warehouse_state ORDER BY updated_at DESC LIMIT 1").bind(COMPANY_ID).run();
 row=await env.DB.prepare('SELECT body,revision FROM company_state WHERE company_id=?').bind(COMPANY_ID).first();
 return row||null;
}
function logsOnlyAppend(before,after){const a=before.logs||[],b=after.logs||[];return b.length>=a.length&&JSON.stringify(b.slice(b.length-a.length))===JSON.stringify(a);}
export function warehouseChangeAllowed(before,after){
 if(!logsOnlyAppend(before,after))return false;
 const a=structuredClone(before),b=structuredClone(after);a.logs=[];b.logs=[];
 delete a.platingProjects;delete b.platingProjects;
 if(a.projects.length!==b.projects.length)return false;
 for(const next of b.projects){
 const prev=a.projects.find(p=>p.id===next.id);if(!prev||prev.parts.length!==next.parts.length)return false;
  const oldMaterial=prev.materialLogs||[],newMaterial=next.materialLogs||[];if(newMaterial.length<oldMaterial.length||JSON.stringify(newMaterial.slice(newMaterial.length-oldMaterial.length))!==JSON.stringify(oldMaterial))return false;if(prev.materialLogs===undefined)delete next.materialLogs;else next.materialLogs=structuredClone(prev.materialLogs);
  const active=new Set(prev.parts.map(i=>i.id));
  for(const key of new Set([...Object.keys(prev.inventory),...Object.keys(next.inventory)]))if(!active.has(key)&&next.inventory[key]!==prev.inventory[key])return false;
  for(const part of next.parts){const old=prev.parts.find(i=>i.id===part.id);if(!old)return false;const received=part.received-old.received,oldStock=Number(prev.inventory[part.id]||0),newStock=Number(next.inventory[part.id]||0);if(!int(received)||newStock>oldStock+received)return false;part.received=old.received;}
  next.inventory=structuredClone(prev.inventory);
 }
 return JSON.stringify(a)===JSON.stringify(b);
}
export async function api(request,env){
 if(!hasCredentials(request))return json({error:'請先登入後再使用'},401);
 if(!env.DB)return json({error:'雲端資料庫尚未就緒'},503);
 try{
  const employee=await employeeFor(request,env);if(!employee)return json({error:'此帳號尚未由主管啟用'},403);
  if(request.method==='GET'){const row=await companyRow(env);return json({state:row?JSON.parse(row.body):null,revision:row?.revision??0,currentUser:{name:employee.name,email:employee.email,role:employee.role}});}
  if(request.method!=='PUT')return json({error:'不支援的操作'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
  if(employee.role==='viewer')return json({error:'一般員工只有查看權限'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'格式不正確'},415);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>1500000)return json({error:'資料超過 1.5 MB，請先匯出備份並聯絡管理者'},413);
  const input=JSON.parse(raw);validate(input.state);check(int(input.revision),'版本不正確');
  const current=await companyRow(env);if(employee.role==='warehouse'&&(!current||!warehouseChangeAllowed(JSON.parse(current.body),input.state)))return json({error:'庫房管理僅能收料、領料、管理照片與電鍍紀錄'},403);
  const body=JSON.stringify(input.state),time=new Date().toISOString();let result;
  if(input.revision===0)result=await env.DB.prepare('INSERT OR IGNORE INTO company_state (company_id,body,revision,updated_at) VALUES (?,?,1,?)').bind(COMPANY_ID,body,time).run();
  else result=await env.DB.prepare('UPDATE company_state SET body=?,revision=revision+1,updated_at=? WHERE company_id=? AND revision=?').bind(body,time,COMPANY_ID,input.revision).run();
  if(!result.meta.changes)return json({error:'另一位使用者已更新資料。請先下載未儲存資料，再重新載入最新版本。'},409);
  return json({revision:input.revision+1});
 }catch(e){console.error('warehouse request failed',e.message);return json({error:e.message||'暫時無法儲存，請稍後重試'},400);}
}
export async function employeesApi(request,env){
 if(!hasCredentials(request))return json({error:'請先登入後再使用'},401);
 if(!env.DB)return json({error:'雲端資料庫尚未就緒'},503);
 try{
  const current=await employeeFor(request,env);if(!current||current.role!=='supervisor')return json({error:'只有主管可以管理員工權限'},403);
  if(request.method==='GET'){const result=await env.DB.prepare("SELECT id,email,name,role,status,created_at,last_login_at,account_user_id FROM employees ORDER BY CASE role WHEN 'supervisor' THEN 1 WHEN 'warehouse' THEN 2 ELSE 3 END,name").all();return json({items:result.results||[],currentEmployeeId:current.id});}
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
  const input=await request.json(),roles=['viewer','warehouse','supervisor'],email=String(input.email||'').trim().toLowerCase(),name=String(input.name||'').trim(),role=String(input.role||''),status=String(input.status||'active');
  check(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),'請填寫有效的員工信箱');check(name&&name.length<=80,'請填寫員工姓名');check(roles.includes(role),'權限層級不正確');check(['active','disabled'].includes(status),'帳號狀態不正確');
  const now=new Date().toISOString();
  if(request.method==='POST'){
   const redirect=new URL('/?invited=1',request.url).toString();
   const created=await supabaseAdmin(env,'/auth/v1/invite?redirect_to='+encodeURIComponent(redirect),'POST',{email,data:{name}});let result;
   try{result=await env.DB.prepare('INSERT INTO employees (account_user_id,email,name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(created.id,email,name,role,status,now,now).run();}
   catch(e){await supabaseAdmin(env,'/auth/v1/admin/users/'+encodeURIComponent(created.id),'DELETE');throw e;}
   return json({id:result.meta.last_row_id},201);
  }
  const id=Number(input.id);check(Number.isSafeInteger(id)&&id>0,'員工編號不正確');const target=await env.DB.prepare('SELECT id,account_user_id,email,role,status FROM employees WHERE id=?').bind(id).first();check(target,'找不到員工');
  if((target.role==='supervisor'&&target.status==='active')&&(role!=='supervisor'||status!=='active')){const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM employees WHERE role='supervisor' AND status='active' AND id<>?").bind(id).first();check(Number(count?.total)>0,'至少必須保留一位啟用中的主管');}
  if(request.method==='PUT'){let accountId=target.account_user_id;if(accountId)await supabaseAdmin(env,'/auth/v1/admin/users/'+encodeURIComponent(accountId),'PUT',{email,email_confirm:true,user_metadata:{name}});else{const redirect=new URL('/?invited=1',request.url).toString(),created=await supabaseAdmin(env,'/auth/v1/invite?redirect_to='+encodeURIComponent(redirect),'POST',{email,data:{name}});accountId=created.id;}await env.DB.prepare('UPDATE employees SET account_user_id=?,email=?,name=?,role=?,status=?,updated_at=? WHERE id=?').bind(accountId||null,email,name,role,status,now,id).run();return json({updated:true});}
  if(request.method==='DELETE'){if(id===current.id)check(false,'不能刪除目前登入的主管帳號');if(target.account_user_id)await supabaseAdmin(env,'/auth/v1/admin/users/'+encodeURIComponent(target.account_user_id),'DELETE');await env.DB.prepare('DELETE FROM employees WHERE id=?').bind(id).run();return json({deleted:true});}
  return json({error:'不支援的操作'},405);
 }catch(e){console.error('employee request failed',e.message);const status=String(e.message).includes('UNIQUE')?409:400;return json({error:status===409?'此信箱已存在':e.message||'員工設定未完成'},status);}
}
async function supabaseAdmin(env,path,method,body){
 check(supabaseReady(env),'登入服務尚未完成設定');const response=await fetch(env.SUPABASE_URL+path,{method,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(response.status===204)return{};const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.msg||data.message||data.error_description||'員工登入帳號設定失敗');return data;
}
async function scopeKey(user){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function images(request,env){
 if(!hasCredentials(request))return json({error:'請先登入'},401);
 if(!env.UPLOADS||!env.DB)return json({error:'圖片儲存空間尚未就緒'},503);
 const url=new URL(request.url),logo=url.pathname==='/api/logo',plating=url.pathname==='/api/plating-photos',shipmentId=url.searchParams.get('shipment'),projectId=url.searchParams.get('project');
 try{
  const employee=await employeeFor(request,env);if(!employee)return json({error:'此帳號尚未由主管啟用'},403);
  const root='images/'+await scopeKey(STORAGE_OWNER)+'/',prefix=root+(plating?'plating/':'receipts/')+encodeURIComponent(projectId||'')+'/'+(plating?encodeURIComponent(shipmentId||'')+'/':'');
  if(!logo){
   const row=await companyRow(env);
   const s=row?JSON.parse(row.body):null;
   if(plating){if(!s?.platingProjects?.some(p=>p.id===projectId&&p.shipments.some(x=>x.id===shipmentId)))return json({error:'找不到送鍍紀錄，請先儲存'},404);}
   else if(!s||![...s.projects,...(s.deletedProjects||[]).map(x=>x.project)].some(p=>p.id===projectId))return json({error:'找不到專案'},404);
  }
  const id=url.searchParams.get('id');
  if(id&&!/^[a-f0-9-]{36}$/.test(id))return json({error:'圖片編號不正確'},400);
  const key=logo?root+'logo':prefix+id;
  if(request.method==='GET'){
   if(logo&&url.searchParams.get('meta')==='1'){const file=await env.UPLOADS.head(key);return json({exists:!!file,created:file?.uploaded??null});}
   if(!logo&&!id){
    if(plating&&url.searchParams.get('export')==='1'&&!['warehouse','supervisor'].includes(employee.role))return json({error:'只有倉管與主管可以匯出照片'},403);
    const result=await env.UPLOADS.list({prefix,limit:1000,cursor:url.searchParams.get('cursor')||undefined,include:['customMetadata']});
    return json({items:result.objects.map(o=>({id:o.key.slice(prefix.length),name:o.customMetadata?.name||'收據圖片',actor:o.customMetadata?.actor||'',kind:o.customMetadata?.kind||'dispatch',created:o.uploaded})),truncated:result.truncated,cursor:result.truncated?result.cursor:undefined});
   }
   const file=await env.UPLOADS.get(key);if(!file)return json({error:'找不到圖片'},404);
   return new Response(file.body,{headers:{'Content-Type':file.httpMetadata.contentType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }
  if(request.method==='DELETE'&&!logo){
   if(request.headers.get('origin')!==url.origin)return json({error:'來源驗證失敗'},403);
   if(id){
    if(!['supervisor','warehouse'].includes(employee.role))return json({error:'一般員工只有查看權限'},403);
    const file=await env.UPLOADS.head(key);if(!file)return json({error:'找不到圖片'},404);
    await env.UPLOADS.delete(key);return json({deleted:true});
   }
   if(employee.role!=='supervisor')return json({error:'只有主管可以永久刪除全部照片'},403);
   let cursor;do{const result=await env.UPLOADS.list({prefix,limit:1000,cursor});if(result.objects.length)await env.UPLOADS.delete(result.objects.map(o=>o.key));cursor=result.truncated?result.cursor:undefined;}while(cursor);
   return json({deleted:true});
  }
  if(request.method!=='POST')return json({error:'不支援的操作'},405);
  if(request.headers.get('origin')!==url.origin)return json({error:'來源驗證失敗'},403);
  if(logo&&employee.role!=='supervisor')return json({error:'只有主管可以更換 LOGO'},403);
  if(!logo&&!['supervisor','warehouse'].includes(employee.role))return json({error:'一般員工只有查看權限'},403);
  const kind=url.searchParams.get('kind')||'dispatch';
  if(plating&&!['dispatch','area'].includes(kind))return json({error:'照片類別不正確'},400);
  const limit=2*1024*1024;
  const reader=request.body?.getReader();if(!reader)return json({error:'請選擇圖片'},400);
  const chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return json({error:logo?'LOGO 限 2 MB':'收據圖片壓縮後仍須小於 2 MB'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const hex=Array.from(bytes.slice(0,12)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const type=hex.startsWith('89504e470d0a1a0a')?'image/png':hex.startsWith('ffd8ff')?'image/jpeg':hex.startsWith('52494646')&&hex.slice(16)==='57454250'?'image/webp':null;
  if(!type)return json({error:'請上傳 PNG、JPG 或 WebP 圖片'},415);
  let name='圖片';try{name=decodeURIComponent(request.headers.get('x-file-name')||'圖片').slice(0,200);}catch{}
  const newId=crypto.randomUUID();
  await env.UPLOADS.put(logo?key:prefix+newId,bytes,{httpMetadata:{contentType:type},customMetadata:{name,actor:employee.name||employee.email||'使用者',...(plating?{kind}: {})}});
  return json({id:newId,created:new Date().toISOString()});
 }catch(e){console.error('image operation failed',e.message);return json({error:'圖片操作未完成，請重試'},500);}
}
export default {async fetch(request,env){const path=new URL(request.url).pathname;if(path==='/api/auth/config')return json({url:env.SUPABASE_URL,publishableKey:env.SUPABASE_PUBLISHABLE_KEY});if(path==='/api/state')return api(request,env);if(path==='/api/employees')return employeesApi(request,env);if(path==='/api/logo'||path==='/api/receipts'||path==='/api/plating-photos')return images(request,env);return new Response('Not found',{status:404});}};
