const pcbAccessJSON177=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const pcbAccessError177=(message,status)=>Object.assign(Error(message),{status});
export async function pcbAccessState177(env,employee){
 const row=await env.DB.prepare('SELECT * FROM pcb_access177 WHERE singleton=1').first();
 if(!row)throw pcbAccessError177('施工管制設定尚未就緒',503);
 const owner=employee?.status==='active'&&row.owner_employee_id!==null&&String(employee.id)===String(row.owner_employee_id);
 return{enabled:!!row.enabled,allowed:!row.enabled||owner,canConfigure:owner&&employee.permissions?.includes('admin.settings')===true,revision:row.revision};
}
export async function pcbAccessApi177(request,env,employee){
 try{
  if(!employee||employee.status!=='active')return pcbAccessJSON177({error:'請先登入'},401);
  const state=await pcbAccessState177(env,employee);
  if(request.method==='GET')return pcbAccessJSON177(state);
  if(request.method!=='PUT')return pcbAccessJSON177({error:'不支援的操作'},405);
  if(!state.canConfigure)return pcbAccessJSON177({error:'只有管制指定帳號可以調整此設定'},403);
  if(request.headers.get('origin')!==new URL(request.url).origin)return pcbAccessJSON177({error:'來源不正確'},403);
  const raw=await request.text();if(raw.length>1000)return pcbAccessJSON177({error:'資料過大'},413);
  const input=JSON.parse(raw);
  if(!input||typeof input.enabled!=='boolean'||!Number.isSafeInteger(input.revision)||Object.keys(input).some(k=>!['enabled','revision'].includes(k)))return pcbAccessJSON177({error:'設定格式不正確'},400);
  if(input.enabled===state.enabled)return pcbAccessJSON177(state);
  if(input.revision!==state.revision)return pcbAccessJSON177({error:'設定已更新，請重新開啟'},409);
  const id=crypto.randomUUID(),now=new Date().toISOString();
  try{await env.DB.batch([
   env.DB.prepare('INSERT INTO pcb_guards171(id,valid) VALUES(?,COALESCE((SELECT revision=? AND owner_employee_id=? FROM pcb_access177 WHERE singleton=1),0))').bind(id,state.revision,employee.id),
   env.DB.prepare('UPDATE pcb_access177 SET enabled=?,revision=revision+1,updated_at=?,updated_by=? WHERE singleton=1').bind(Number(input.enabled),now,employee.id),
   env.DB.prepare('INSERT INTO pcb_access_audit177 VALUES(?,?,?,?,?)').bind(id,employee.id,Number(state.enabled),Number(input.enabled),now),
   env.DB.prepare('DELETE FROM pcb_guards171 WHERE id=?').bind(id)
  ]);}catch(error){if(/pcb_guards171|CHECK constraint/i.test(error.message))return pcbAccessJSON177({error:'設定已更新，請重新開啟'},409);throw error;}
  return pcbAccessJSON177(await pcbAccessState177(env,employee));
 }catch(error){return pcbAccessJSON177({error:error.message||'設定讀取失敗'},error.status||400);}
}
