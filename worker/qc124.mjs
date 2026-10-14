const qcJSON124=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
const qcError124=(message,status=400)=>Object.assign(Error(message),{status});
const qcCan124=(e,k)=>e.permissions?.includes('qc.'+k);
const qcText124=(s,n)=>typeof s==='string'&&s.trim()&&s.length<=n;
export function qcStamp124(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)&&new Date(s.slice(0,10)+'T00:00Z').toISOString().slice(0,10)===s.slice(0,10)}
export function qcLabel124(name,stamp,position){return name+'｜'+stamp.slice(0,10).replaceAll('-','')+'_'+stamp.slice(11)+'_'+position}
const qcExpiry124=now=>{const d=new Date(now);d.setUTCFullYear(d.getUTCFullYear()+1);return d.toISOString()};
async function qcRows124(env,project=''){
 const where=project?' WHERE project_id=?':'',args=project?[project]:[];
 const [projects,uploads,files,logs]=await Promise.all([env.DB.prepare('SELECT * FROM qc_projects124'+(project?' WHERE id=?':'')+' ORDER BY created_at DESC,id DESC').bind(...args).all(),env.DB.prepare('SELECT * FROM qc_uploads124'+where+' ORDER BY created_at DESC,id DESC').bind(...args).all(),env.DB.prepare('SELECT * FROM qc_files124'+where+' ORDER BY created_at,id').bind(...args).all(),env.DB.prepare('SELECT * FROM qc_audit124'+where+' ORDER BY created_at DESC,id DESC LIMIT 5000').bind(...args).all()]);
 return{projects:projects.results,uploads:uploads.results,files:files.results.map(({storage_key,digest,...f})=>f),logs:logs.results};
}
export async function qcApi124(request,env,e,services={}){
 try{
  if(!e||e.status!=='active')throw qcError124('請先登入',401);if(!qcCan124(e,'view'))throw qcError124('沒有品檢報告查看權限',403);
  const url=new URL(request.url),now=new Date().toISOString(),projectId=url.searchParams.get('project')||'';
  if(request.method==='GET'){
   const fileId=url.searchParams.get('file');if(fileId){const f=await env.DB.prepare('SELECT f.*,p.deleted_at AS project_deleted,u.deleted_at AS upload_deleted FROM qc_files124 f JOIN qc_projects124 p ON p.id=f.project_id JOIN qc_uploads124 u ON u.id=f.upload_id WHERE f.id=?').bind(fileId).first();if(!f)throw qcError124('報告不存在',404);if((f.deleted_at||f.project_deleted||f.upload_deleted||f.superseded_by)&&!qcCan124(e,'restore')&&!qcCan124(e,'export'))throw qcError124('沒有歷史附件查看權限',403);if(f.purge_after&&f.purge_after<=now)throw qcError124('附件保留期限已到',410);const object=await env.UPLOADS.get(f.storage_key);if(!object)throw qcError124('附件已移除',404);return new Response(object.body,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="report.pdf"'}})}
   const exporting=url.searchParams.get('export')==='1';if(exporting&&!qcCan124(e,'export'))throw qcError124('沒有匯出權限',403);
   const data=await qcRows124(env,projectId);if(exporting)await qcCommit124(env,e,null,[],'匯出品檢報告',projectId?'匯出此案':'匯出全部',projectId,services);
   if(!exporting&&!qcCan124(e,'restore')){data.projects=data.projects.filter(p=>!p.deleted_at);data.uploads=data.uploads.filter(u=>!u.deleted_at);const activeProjects=new Set(data.projects.map(p=>p.id)),activeUploads=new Set(data.uploads.filter(u=>activeProjects.has(u.project_id)).map(u=>u.id));data.uploads=data.uploads.filter(u=>activeProjects.has(u.project_id));data.files=data.files.filter(f=>!f.deleted_at&&!f.superseded_by&&activeProjects.has(f.project_id)&&activeUploads.has(f.upload_id))}
   return qcJSON124(data);
  }
  if(request.method!=='POST'||request.headers.get('origin')!==url.origin)throw qcError124('來源或操作不正確',403);
  const multipart=request.headers.get('content-type')?.includes('multipart/form-data'),form=multipart?await request.formData():null;
  const input=form?Object.fromEntries([...form.entries()].filter(([,v])=>typeof v==='string')):JSON.parse(await request.text());
  const action=input.action||'',cap=action.startsWith('delete')?'delete':action.startsWith('restore')?'restore':'manage';if(!qcCan124(e,cap))throw qcError124('沒有此操作權限',403);
  if(action==='project'){
   if(!qcText124(input.name,100))throw qcError124('請填寫案件名稱');const id=input.id||crypto.randomUUID(),old=await env.DB.prepare('SELECT * FROM qc_projects124 WHERE id=?').bind(id).first();
   if(old?.deleted_at)throw qcError124('請先復原案件',409);
   await qcCommit124(env,e,old?{...old,expected:Number(input.revision)}:null,[old?env.DB.prepare('UPDATE qc_projects124 SET name=? WHERE id=?').bind(input.name.trim(),id):env.DB.prepare('INSERT INTO qc_projects124(id,name,created_at) VALUES(?,?,?)').bind(id,input.name.trim(),now)],old?'修改品檢案件':'新增品檢案件',old?old.name+' → '+input.name:input.name,id,services);return qcJSON124({saved:true,id});
  }
  const p=await env.DB.prepare('SELECT * FROM qc_projects124 WHERE id=?').bind(input.project).first();if(!p)throw qcError124('找不到案件',404);if(p.deleted_at&&!['restore_project','delete_project'].includes(action))throw qcError124('請先復原案件',409);
  const guard={...p,expected:Number(input.revision)},statements=[],id=input.id||crypto.randomUUID();let detail='',target;
  if(action==='upload'){
   if(!form||!qcStamp124(input.stamp)||String(input.note||'').length>1000)throw qcError124('請確認日期時間與備註');
   const oldUpload=await env.DB.prepare('SELECT * FROM qc_uploads124 WHERE id=?').bind(id).first();if(oldUpload&&oldUpload.project_id!==p.id)throw qcError124('登記編號不符',409);
   if(oldUpload&&!input.append&&!input.replace)return qcJSON124({saved:true,already:true});if(oldUpload?.deleted_at)throw qcError124('請先復原這次登記',409);
   const incoming=form.getAll('pdf');if(!incoming.length||incoming.length>20||incoming.some(f=>typeof f==='string'||!f.name.toLowerCase().endsWith('.pdf')||!f.size||f.size>20*1024*1024)||incoming.reduce((n,f)=>n+f.size,0)>100*1024*1024)throw qcError124('每次最多20份PDF，每份20MB，合計100MB');
   const previous=(await env.DB.prepare('SELECT * FROM qc_files124 WHERE upload_id=?').bind(id).all()).results,max=Math.max(0,...previous.map(f=>f.position));
   if(input.replace){target=previous.find(f=>f.id===input.replace&&!f.deleted_at&&!f.superseded_by);if(!target||incoming.length!==1)throw qcError124('請選一份PDF替換指定附件');}
   const nextOrder=Number((await env.DB.prepare('SELECT MAX(order_no) AS n FROM qc_files124 WHERE project_id=?').bind(p.id).first())?.n)||0;
   const stored=[],digests=new Set(previous.filter(f=>!f.deleted_at&&!f.superseded_by).map(f=>f.digest));
   try{
    for(let i=0;i<incoming.length;i++){const f=incoming[i];if(new TextDecoder().decode(await f.slice(0,5).arrayBuffer())!=='%PDF-')throw qcError124('檔案內容不是PDF：'+f.name);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');if(digests.has(hash))throw qcError124('這次登記已有相同內容的PDF：'+f.name,409);digests.add(hash);const fid=crypto.randomUUID(),key='qc124/'+p.id+'/'+fid;await env.UPLOADS.put(key,f.stream(),{httpMetadata:{contentType:'application/pdf'}});stored.push(key);statements.push(env.DB.prepare('INSERT INTO qc_files124(id,project_id,upload_id,position,order_no,storage_key,original_name,digest,size,author_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(fid,p.id,id,target?.position||max+i+1,target?.order_no||nextOrder+i+1,key,f.name.slice(0,200),hash,f.size,e.name,now));if(target)statements.push(env.DB.prepare('UPDATE qc_files124 SET superseded_by=?,purge_after=? WHERE id=?').bind(fid,qcExpiry124(now),target.id));}
    if(!oldUpload)statements.unshift(env.DB.prepare('INSERT INTO qc_uploads124(id,project_id,stamp,note,author_name,created_at) VALUES(?,?,?,?,?,?)').bind(id,p.id,input.stamp,input.note||'',e.name,now));
    await qcCommit124(env,e,guard,statements,target?'替換品檢報告':oldUpload?'補加品檢報告':'新增品檢報告',incoming.map(f=>f.name).join('、'),p.id,services);
   }catch(error){for(const key of stored)await env.UPLOADS.delete(key).catch(()=>{});throw error}
   return qcJSON124({saved:true,id});
  }
  if(action==='edit_upload'){target=await env.DB.prepare('SELECT * FROM qc_uploads124 WHERE id=? AND project_id=?').bind(id,p.id).first();if(!target||target.deleted_at||!qcStamp124(input.stamp)||String(input.note||'').length>1000)throw qcError124('登記資料不正確');statements.push(env.DB.prepare('UPDATE qc_uploads124 SET stamp=?,note=? WHERE id=?').bind(input.stamp,input.note||'',id));detail=target.stamp+' → '+input.stamp+'｜'+(input.note||'');}
  else if(['delete_file','restore_file'].includes(action)){target=await env.DB.prepare('SELECT * FROM qc_files124 WHERE id=? AND project_id=?').bind(id,p.id).first();if(!target||target.superseded_by)throw qcError124('找不到目前版本附件');const u=await env.DB.prepare('SELECT deleted_at FROM qc_uploads124 WHERE id=?').bind(target.upload_id).first();if(u?.deleted_at)throw qcError124('請先復原整次登記');const restoring=action==='restore_file';if(restoring&&(!target.deleted_at||target.purge_after<=now))throw qcError124('附件已超過保留期限或尚未刪除');statements.push(env.DB.prepare('UPDATE qc_files124 SET deleted_at=?,purge_after=? WHERE id=?').bind(restoring?'':now,restoring?'':qcExpiry124(now),id));detail=target.original_name;}
  else if(['delete_upload','restore_upload'].includes(action)){target=await env.DB.prepare('SELECT * FROM qc_uploads124 WHERE id=? AND project_id=?').bind(id,p.id).first();if(!target)throw qcError124('找不到登記');const restoring=action==='restore_upload';if(restoring&&(!target.deleted_at||qcExpiry124(target.deleted_at)<=now))throw qcError124('登記已超過保留期限或尚未刪除');statements.push(env.DB.prepare('UPDATE qc_uploads124 SET deleted_at=? WHERE id=?').bind(restoring?'':now,id));statements.push(env.DB.prepare('UPDATE qc_files124 SET deleted_at=?,purge_after=? WHERE upload_id=? AND superseded_by=\'\' AND deleted_at=?').bind(restoring?'':now,restoring?'':qcExpiry124(now),id,restoring?target.deleted_at:''));detail=target.stamp;}
  else if(['delete_project','restore_project'].includes(action)){const restoring=action==='restore_project';if(restoring&&(!p.deleted_at||p.purge_after<=now))throw qcError124('案件已超過保留期限或尚未刪除');statements.push(env.DB.prepare('UPDATE qc_projects124 SET deleted_at=?,purge_after=? WHERE id=?').bind(restoring?'':now,restoring?'':qcExpiry124(now),p.id));if(!restoring)statements.push(env.DB.prepare("UPDATE qc_files124 SET deleted_at=?,purge_after=? WHERE project_id=? AND deleted_at='' AND superseded_by=''").bind(now,qcExpiry124(now),p.id));else statements.push(env.DB.prepare('UPDATE qc_files124 SET deleted_at=\'\',purge_after=\'\' WHERE project_id=? AND deleted_at=?').bind(p.id,p.deleted_at));detail=p.name;}
  else throw qcError124('不支援的操作');
  await qcCommit124(env,e,guard,statements,({edit_upload:'修改品檢登記',delete_file:'刪除品檢附件',restore_file:'復原品檢附件',delete_upload:'刪除整次品檢登記',restore_upload:'復原整次品檢登記',delete_project:'刪除品檢案件',restore_project:'復原品檢案件'})[action],detail,p.id,services);
  return qcJSON124({saved:true});
 }catch(error){return qcJSON124({error:error.message||'品檢操作失敗'},error.status||400)}
}
async function qcCommit124(env,e,guard,statements,action,detail,project,services){
 const token=crypto.randomUUID(),now=new Date().toISOString(),entry={id:crypto.randomUUID(),time:now,actor:e.name,action,detail,category:'qc',location:'品檢報告',project:'qc:'+project};
 const list=guard?[env.DB.prepare('INSERT INTO qc_guards124 VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM qc_projects124 WHERE id=? AND revision=?) THEN 1 ELSE 0 END)').bind(token,guard.id,guard.expected)]:[];
 list.push(...statements,env.DB.prepare('INSERT INTO qc_audit124 VALUES(?,?,?,?,?,?)').bind(entry.id,project,e.name,action,detail,now));
 if(services.audit)list.push(...services.audit(entry));if(guard)list.push(env.DB.prepare('UPDATE qc_projects124 SET revision=revision+1 WHERE id=?').bind(guard.id),env.DB.prepare('DELETE FROM qc_guards124 WHERE id=?').bind(token));
 try{await env.DB.batch(list)}catch(error){if(/qc_guards124|CHECK constraint/.test(String(error)))throw qcError124('資料已由他人修改，請重新開啟；未存內容仍保留',409);if(/UNIQUE/.test(String(error)))throw qcError124('案件名稱或登記編號重複',409);throw error}
}
export async function qcCleanup124(env,now=new Date().toISOString()){
 const rows=await env.DB.prepare("SELECT id,storage_key FROM qc_files124 WHERE purge_after<>'' AND purge_after<=? LIMIT 20").bind(now).all();
 for(const f of rows.results){await env.UPLOADS.delete(f.storage_key);await env.DB.prepare('DELETE FROM qc_files124 WHERE id=?').bind(f.id).run()}
 await env.DB.prepare('DELETE FROM qc_audit124 WHERE created_at<? AND action LIKE \'刪除%\'').bind(new Date(Date.parse(now)-366*86400000).toISOString()).run();
 return rows.results.length;
}
