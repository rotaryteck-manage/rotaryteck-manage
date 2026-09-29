import {restockChangeAllowed} from './workflows.mjs';
export const capabilityNames={"warehouse.historyEdit":"庫房：修改既有收領料紀錄（會校正庫存）","warehouse.purge":"庫房：永久刪除已刪專案","schedule.view": "工作排程：查看", "schedule.report": "工作排程：填寫每日回報", "records.export": "後台：匯出排程、工作紀錄與照片", "cases.deleteProject": "案件：刪除專案", "warehouse.deleteProject": "庫房：刪除專案", "plating.deleteProject": "電鍍：刪除專案", "wire.deleteProject": "線材：刪除專案", "cases.view": "案件：查看", "cases.manage": "案件：新增、修改、排序", "warehouse.view": "庫房：查看", "warehouse.manage": "庫房：建立、修改專案與管理零件", "warehouse.photos": "庫房：上傳、刪除照片", "plating.view": "電鍍：查看", "plating.manage": "電鍍：新增、修改、刪除送鍍紀錄", "plating.photos": "電鍍：上傳、刪除照片", "wire.view": "線材：查看", "wire.create": "線材：新增線材與線捆", "wire.edit": "線材：修改線材與線捆", "wire.delete": "線材：刪除空白線材與線捆", "wire.cut": "線材：新增裁線紀錄", "wire.editOwn": "線材：修改自己的裁線紀錄", "wire.photos": "線材：上傳照片", "warehouse.receive": "庫房：收料", "warehouse.issue": "庫房：領料", "warehouse.receivedDate": "庫房：修改／清除收料日期", "warehouse.issuedDate": "庫房：修改／清除領料日期", "warehouse.stockAdjust": "庫房：修正現有庫存", "warehouse.preparedAdjust": "庫房：修正本次已備", "warehouse.options": "庫房：管理櫃／層選單", "schedule.weekly.create": "每週排程：新增", "schedule.weekly.edit": "每週排程：編輯", "schedule.weekly.delete": "每週排程：刪除", "schedule.daily.create": "每日排程：新增", "schedule.daily.edit": "每日排程：編輯", "schedule.daily.delete": "每日排程：刪除", "schedule.copy": "每週排程：複製上週", "schedule.reset": "每週排程：重置本週", "schedule.dedupe": "每週排程：整理重複", "schedule.note": "每週排程：修改備註", "schedule.options": "排程設定：管理工作選單", "schedule.palette": "排程設定：共用常用色", "schedule.material.create": "每日料件：新增", "schedule.material.edit": "每日料件：編輯", "schedule.material.delete": "每日料件：刪除", "schedule.material.author": "每日料件：修改登記人", "schedule.report.editOwn": "工作回報：修改自己的", "schedule.report.editAll": "工作回報：修改所有人的", "schedule.report.deleteOwn": "工作回報：刪除自己的", "schedule.report.deleteAll": "工作回報：刪除所有人的", "schedule.leave.view": "請假：查看", "schedule.leave.create": "請假：新增", "schedule.leave.edit": "請假：編輯", "schedule.leave.delete": "請假：刪除", "schedule.text.daily": "文字紀錄：查看每日", "schedule.text.weekly": "文字紀錄：查看每週", "schedule.text.delete": "文字紀錄：刪除", "wire.restock": "線材：訂購、入庫、撤銷補貨", "wire.editAll": "線材：修改所有人的裁線紀錄", "plating.options": "電鍍：管理廠商選單", "admin.view": "後台：進入", "admin.settings": "後台：網站、文字、外觀設定", "admin.employees": "後台：人員管理（不能授予自己沒有的權限）", "admin.permissions": "後台：權限管理（限主管）", "admin.export": "後台：資料及照片匯出", "admin.import": "後台：匯入資料", "admin.audit": "後台：查看操作紀錄", "admin.auditDelete": "後台：刪除操作紀錄", "admin.photoPurge": "後台：永久刪除全部照片", "warehouse.restore": "庫房：復原已刪除專案", "plating.restore": "電鍍：復原已刪除專案", "wire.restore": "線材：復原已刪除專案"};

export function migratePermissions75(values,role){
 const old=new Set(values),out=new Set(values.filter(k=>Object.hasOwn(capabilityNames,k)));
 for(const kind of ['cases','warehouse','plating','wire'])if(!(['wire','plating'].includes(kind)?['warehouse','supervisor'].includes(role):role==='supervisor'))out.delete(kind+'.deleteProject');
 if(old.has('warehouse.manage'))for(const k of ['warehouse.receive','warehouse.issue'])out.add(k);
 const rules={"warehouse.stock": ["warehouse.receive", "warehouse.issue"], "schedule.weekly": ["schedule.weekly.create", "schedule.weekly.edit", "schedule.weekly.delete", "schedule.copy", "schedule.reset", "schedule.dedupe", "schedule.note", "schedule.options", "schedule.palette"], "schedule.daily": ["schedule.daily.create", "schedule.daily.edit", "schedule.daily.delete", "schedule.leave.create", "schedule.leave.edit", "schedule.leave.delete"], "schedule.material": ["schedule.material.create", "schedule.material.edit", "schedule.material.delete"], "schedule.report": ["schedule.report.editOwn", "schedule.report.deleteOwn"], "schedule.view": ["schedule.leave.view"]};
 for(const [key,list]of Object.entries(rules))if(old.has(key)){
  const allowed=key==='schedule.weekly'?role==='supervisor':['schedule.daily','schedule.material'].includes(key)?['supervisor','warehouse'].includes(role):true;
  if(allowed)for(const k of list)out.add(k);
 }
 if(role==='supervisor'){
  for(const k of ['admin.view','admin.settings','admin.employees','admin.permissions','admin.export','admin.import','admin.audit','admin.auditDelete','admin.photoPurge','warehouse.purge','plating.options','warehouse.options','wire.restock','wire.editAll','warehouse.restore','plating.restore','wire.restore','schedule.text.daily','schedule.text.weekly','schedule.text.delete','schedule.report.editAll','schedule.report.deleteAll','schedule.material.author'])out.add(k);
  if(old.has('warehouse.manage'))for(const k of ['warehouse.historyEdit','warehouse.receive','warehouse.issue','warehouse.stockAdjust','warehouse.preparedAdjust','warehouse.receivedDate','warehouse.issuedDate'])out.add(k);
 }
 if(role==='warehouse')for(const k of ['warehouse.receivedDate','warehouse.issuedDate','wire.restock'])out.add(k);
 return [...out];
}
const legacyViewer75=['cases.view','warehouse.view','plating.view','wire.view','wire.cut','wire.editOwn','wire.photos','schedule.view','schedule.report'];
export const builtinViewer=migratePermissions75(legacyViewer75,'viewer');
export const builtinProfiles=[{id:'supervisor',name:'主管',permissions:Object.keys(capabilityNames)},{id:'warehouse',name:'倉管',permissions:migratePermissions75([...legacyViewer75,'wire.deleteProject','plating.deleteProject','warehouse.stock','warehouse.photos','plating.manage','plating.photos','wire.create','wire.edit','wire.delete','schedule.daily','schedule.material'],'warehouse')},{id:'viewer',name:'一般員工',permissions:builtinViewer}];
export async function ensurePermissions(env){await env.DB.batch([
 env.DB.prepare('CREATE TABLE IF NOT EXISTS app_permission_order (profile_id TEXT PRIMARY KEY,position INTEGER NOT NULL)'),
 env.DB.prepare('CREATE TABLE IF NOT EXISTS wire_pending_uploads (id TEXT PRIMARY KEY,created_at TEXT NOT NULL)'),
 env.DB.prepare('CREATE TABLE IF NOT EXISTS app_permission_profiles (id TEXT PRIMARY KEY,name TEXT NOT NULL,permissions TEXT NOT NULL)'),
 env.DB.prepare("CREATE TABLE IF NOT EXISTS app_employee_settings (employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0)"),
 env.DB.prepare('CREATE TABLE IF NOT EXISTS app_permission_migrations (id TEXT PRIMARY KEY)')
]);
 if(!await env.DB.prepare("SELECT id FROM app_permission_migrations WHERE id='schedule-daily-warehouse-v61'").first()){
  const warehouse=await env.DB.prepare("SELECT permissions FROM app_permission_profiles WHERE id='warehouse'").first();
  if(warehouse){const permissions=JSON.parse(warehouse.permissions);if(!permissions.includes('schedule.daily'))await env.DB.prepare("UPDATE app_permission_profiles SET permissions=? WHERE id='warehouse'").bind(JSON.stringify([...permissions,'schedule.daily'])).run()}
  await env.DB.prepare("INSERT OR IGNORE INTO app_permission_migrations(id) VALUES('schedule-daily-warehouse-v61')").run();
 }
 if(!await env.DB.prepare("SELECT id FROM app_permission_migrations WHERE id='records-export-v59'").first()){
  const supervisor=await env.DB.prepare("SELECT permissions FROM app_permission_profiles WHERE id='supervisor'").first();
  if(supervisor){const permissions=JSON.parse(supervisor.permissions);if(!permissions.includes('records.export'))await env.DB.prepare("UPDATE app_permission_profiles SET permissions=? WHERE id='supervisor'").bind(JSON.stringify([...permissions,'records.export'])).run()}
  await env.DB.prepare("INSERT OR IGNORE INTO app_permission_migrations(id) VALUES('records-export-v59')").run();
 }
 if(!await env.DB.prepare("SELECT id FROM app_permission_migrations WHERE id='granular-v75'").first()){
  const profiles=await env.DB.prepare('SELECT id,permissions FROM app_permission_profiles').all();
  const stmts=profiles.results.map(p=>env.DB.prepare('UPDATE app_permission_profiles SET permissions=? WHERE id=? AND permissions=?').bind(JSON.stringify(migratePermissions75(JSON.parse(p.permissions),p.id)),p.id,p.permissions));
  stmts.push(env.DB.prepare("INSERT OR IGNORE INTO app_permission_migrations(id) VALUES('granular-v75')"));
  await env.DB.batch(stmts);
 }

}
export async function employeePermissions(env,e){
 await ensurePermissions(env);const setting=await env.DB.prepare('SELECT profile_id FROM app_employee_settings WHERE employee_id=?').bind(e.id).first();
 const profile=setting?.profile_id?await env.DB.prepare('SELECT * FROM app_permission_profiles WHERE id=?').bind(setting.profile_id).first():null;
 const built=await env.DB.prepare('SELECT * FROM app_permission_profiles WHERE id=?').bind(e.role).first(),fallback=builtinProfiles.find(p=>p.id===e.role)||builtinProfiles[2];
 e.profileId=e.role==='viewer'?(setting?.profile_id||''):'';const selected=e.profileId?profile:built;
 e.roleLabel=selected?.name||fallback.name;e.permissions=selected?JSON.parse(selected.permissions):e.profileId?[]:fallback.permissions;return e;
}
export function permitted(e,key){return Array.isArray(e.permissions)?e.permissions.includes(key):e.role==='supervisor';}
function wireAssert(ok,message){if(!ok)throw Error(message);}
export function validateWire(s){
 const types=s.wireTypes||[],reels=s.wireReels||[],cuts=s.wireCuts||[];
 const text=(v,max=100)=>typeof v==='string'&&v.trim()&&v.length<=max;
 for(const list of [types,reels,cuts])wireAssert(Array.isArray(list)&&list.length<=30000&&new Set(list.map(x=>x.id)).size===list.length&&list.every(x=>text(x.id)),'線材資料編號不正確');
 wireAssert(new Set(types.filter(x=>!x.archived).map(x=>x.name?.trim().toLowerCase())).size===types.filter(x=>!x.archived).length,'線材名稱重複');
 for(const t of types)wireAssert(text(t.name),'請填寫線材名稱');
 for(const r of reels){wireAssert(types.some(t=>t.id===r.wireId)&&text(r.number)&&text(r.color)&&['enough','low','ordered'].includes(r.status),'線捆資料不正確');wireAssert(reels.filter(x=>x.wireId===r.wireId&&x.number===r.number).length===1,'線捆編號重複');wireAssert(Array.isArray(r.photos)&&new Set(r.photos.map(x=>x.id)).size===r.photos.length,'線材照片格式不正確');for(const p of r.photos)wireAssert(/^[a-f0-9-]{36}$/.test(p.id)&&text(p.actor)&&text(p.actorId)&&text(p.created)&&text(p.name,200),'照片資料不完整');}
 wireAssert(new Set(cuts.filter(c=>c.photoId).map(c=>c.photoId)).size===cuts.filter(c=>c.photoId).length,'不同裁線紀錄需要各自的照片');
 for(const c of cuts){const r=reels.find(x=>x.id===c.reelId);wireAssert(r&&(c.photoId===undefined||c.photoId===''||typeof c.photoId==='string'&&r.photos.some(p=>p.id===c.photoId)),'裁線紀錄的線捆或照片不正確');wireAssert(text(c.actor)&&text(c.actorId)&&!Number.isNaN(Date.parse(c.time)),'裁線人員或時間不正確');wireAssert(Number.isFinite(c.length)&&c.length>0&&c.length<=1000000&&Number.isSafeInteger(c.quantity)&&c.quantity>0&&c.quantity<=1000000,'裁線長度與條數必須大於零');}
 if(s.wireText!==undefined)wireAssert(s.wireText&&typeof s.wireText==='object'&&Object.values(s.wireText).every(x=>text(x,100)),'線材文字設定不正確');
}
function wireEqual(a,b){return JSON.stringify(a)===JSON.stringify(b);}
export function wireChangeAllowed(before,after,e){
 const bt=before.wireTypes||[],at=after.wireTypes||[],br=before.wireReels||[],ar=after.wireReels||[],bc=before.wireCuts||[],ac=after.wireCuts||[];
 for(const [old,list]of [[bt,at],[br,ar]]){
  for(const x of old)if(!list.some(n=>n.id===x.id)&&(!permitted(e,'wire.delete')||(old===br&&(x.photos.length||bc.some(c=>c.reelId===x.id)))||(old===bt&&br.some(r=>r.wireId===x.id))))return false;
  for(const x of list){const prev=old.find(n=>n.id===x.id);if(!prev){if(!permitted(e,'wire.create')||(old===br&&(x.status!=='enough'||x.photos.length||x.restock||x.restockHistory)))return false;continue;}
   if(old===bt){const a={...prev},b={...x};if((!prev.archived&&x.archived&&canDeleteProject(e,'wire'))||(prev.archived&&!x.archived&&permitted(e,'wire.restore')))for(const k of ['archived','deletedAt','purgeAfter']){delete a[k];delete b[k];}if(!wireEqual(a,b)&&!permitted(e,'wire.edit'))return false;}
   else{const a={...prev},b={...x};delete a.photos;delete b.photos;delete a.status;delete b.status;delete a.restock;delete b.restock;delete a.restockHistory;delete b.restockHistory;if(!restockChangeAllowed(prev,x,e))return false;
    if(!wireEqual(a,b)&&!permitted(e,'wire.edit'))return false;
    if(prev.wireId!==x.wireId)return false;
    if(prev.status!==x.status&&!permitted(e,'wire.restock')&&!(x.status==='low'&&permitted(e,'wire.view')&&permitted(e,'wire.cut')))return false;
    if(!wireEqual(x.photos.slice(0,prev.photos.length),prev.photos)||x.photos.length<prev.photos.length)return false;
    if(x.photos.length>prev.photos.length&&!permitted(e,'wire.photos'))return false;
   }
  }
  if(!wireEqual(old.filter(x=>list.some(n=>n.id===x.id)).map(x=>x.id),list.filter(x=>old.some(n=>n.id===x.id)).map(x=>x.id))&&!permitted(e,'wire.edit'))return false;
 }
 for(const c of bc)if(!ac.some(x=>x.id===c.id))return false;
 for(const c of ac){const prev=bc.find(x=>x.id===c.id);if(!prev){if(!permitted(e,'wire.cut')||c.actorId!==String(e.id)||c.actor!==e.name)return false;const r=ar.find(r=>r.id===c.reelId),photo=r?.photos.find(p=>p.id===c.photoId);if(c.photoId&&(!photo||photo.actorId!==String(e.id)||photo.created!==c.time||br.some(r=>r.photos.some(p=>p.id===c.photoId))))return false;}
 else if(!wireEqual(prev,c)){if(!permitted(e,'wire.editAll')&&(!permitted(e,'wire.editOwn')||prev.actorId!==String(e.id)))return false;const a={...prev},b={...c};for(const k of ['length','quantity','photoId','updatedAt','updatedBy']){delete a[k];delete b[k];}if(!wireEqual(a,b)||c.updatedBy!==e.name||Number.isNaN(Date.parse(c.updatedAt)))return false;if(c.photoId!==prev.photoId&&br.some(r=>r.photos.some(p=>p.id===c.photoId)))return false;}
 }return true;
}
export function visibleState(s,e){const out=structuredClone(s);for(const [key,collections]of [['cases',['cases']],['warehouse',['projects','deletedProjects']],['plating',['platingProjects']],['wire',['wireTypes','wireReels','wireCuts']]])if(!permitted(e,key+'.view'))for(const c of collections)out[c]=[];
 if(!permitted(e,'admin.audit'))out.logs=(out.logs||[]).filter(l=>{if(l.project?.startsWith('wire:'))return permitted(e,'wire.view');if(l.project?.startsWith('plating:'))return permitted(e,'plating.view');return false;});return out;}
export async function wirePhotoKey(id){return 'wire-photos/'+id;}
export async function verifyWirePhotos(env,before,after,e){
 for(const reel of after.wireReels||[]){const prev=(before.wireReels||[]).find(r=>r.id===reel.id);for(const photo of reel.photos){if(prev?.photos.some(p=>p.id===photo.id))continue;const file=await env.UPLOADS?.head(await wirePhotoKey(photo.id)),m=file?.customMetadata;wireAssert(m&&Date.now()-Date.parse(m.created)<24*60*60*1000&&m.reelId===reel.id&&m.actorId===String(e.id)&&m.actor===photo.actor&&m.created===photo.created&&m.actorId===photo.actorId&&m.name===photo.name,'照片尚未上傳完成或不屬於此線捆，請重新上傳');}}
}

export function canDeleteProject(e,kind){return permitted(e,kind+'.deleteProject');}
export function projectDeletionAllowed(before,after,e){
 for(const [kind,key] of [['cases','cases'],['warehouse','projects'],['plating','platingProjects'],['wire','wireTypes']]){
  for(const old of before[key]||[]){const n=(after[key]||[]).find(x=>x.id===old.id);if((!n||(!old.archived&&n.archived))&&!canDeleteProject(e,kind))return false;}
 }return true;
}
