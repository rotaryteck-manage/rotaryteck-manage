export const capabilityNames={
 'cases.view':'案件：查看','cases.manage':'案件：新增、修改、刪除、排序',
 'warehouse.view':'庫房：查看','warehouse.stock':'庫房：收料、領料','warehouse.manage':'庫房：建立、修改、刪除專案與零件','warehouse.photos':'庫房：上傳、刪除照片',
 'plating.view':'電鍍：查看','plating.manage':'電鍍：新增、修改、刪除送鍍紀錄','plating.photos':'電鍍：上傳、刪除照片',
 'wire.view':'線材：查看','wire.create':'線材：新增線材與線捆','wire.edit':'線材：修改線材與線捆','wire.delete':'線材：刪除空白線材與線捆','wire.cut':'線材：新增裁線紀錄','wire.editOwn':'線材：修改自己的裁線紀錄','wire.photos':'線材：上傳照片'
};
export const builtinViewer=['cases.view','warehouse.view','plating.view','wire.view','wire.cut','wire.editOwn','wire.photos'];
export const builtinProfiles=[{id:'supervisor',name:'主管',permissions:Object.keys(capabilityNames)},{id:'warehouse',name:'倉管',permissions:[...builtinViewer,'warehouse.stock','warehouse.photos','plating.manage','plating.photos','wire.create','wire.edit','wire.delete']},{id:'viewer',name:'一般員工',permissions:builtinViewer}];
export async function ensurePermissions(env){await env.DB.batch([
 env.DB.prepare('CREATE TABLE IF NOT EXISTS app_permission_order (profile_id TEXT PRIMARY KEY,position INTEGER NOT NULL)'),
 env.DB.prepare('CREATE TABLE IF NOT EXISTS wire_pending_uploads (id TEXT PRIMARY KEY,created_at TEXT NOT NULL)'),
 env.DB.prepare('CREATE TABLE IF NOT EXISTS app_permission_profiles (id TEXT PRIMARY KEY,name TEXT NOT NULL,permissions TEXT NOT NULL)'),
 env.DB.prepare("CREATE TABLE IF NOT EXISTS app_employee_settings (employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0)")
]);}
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
 wireAssert(new Set(types.map(x=>x.name?.toLowerCase())).size===types.length,'線材名稱重複');
 for(const t of types)wireAssert(text(t.name),'請填寫線材名稱');
 for(const r of reels){wireAssert(types.some(t=>t.id===r.wireId)&&text(r.number)&&text(r.color)&&['enough','low'].includes(r.status),'線捆資料不正確');wireAssert(reels.filter(x=>x.wireId===r.wireId&&x.number===r.number).length===1,'線捆編號重複');wireAssert(Array.isArray(r.photos)&&new Set(r.photos.map(x=>x.id)).size===r.photos.length,'線材照片格式不正確');for(const p of r.photos)wireAssert(/^[a-f0-9-]{36}$/.test(p.id)&&text(p.actor)&&text(p.actorId)&&text(p.created)&&text(p.name,200),'照片資料不完整');}
 wireAssert(new Set(cuts.filter(c=>c.photoId).map(c=>c.photoId)).size===cuts.filter(c=>c.photoId).length,'不同裁線紀錄需要各自的照片');
 for(const c of cuts){const r=reels.find(x=>x.id===c.reelId);wireAssert(r&&(c.photoId===undefined||c.photoId===''||typeof c.photoId==='string'&&r.photos.some(p=>p.id===c.photoId)),'裁線紀錄的線捆或照片不正確');wireAssert(text(c.actor)&&text(c.actorId)&&!Number.isNaN(Date.parse(c.time)),'裁線人員或時間不正確');wireAssert(Number.isFinite(c.length)&&c.length>0&&c.length<=1000000&&Number.isSafeInteger(c.quantity)&&c.quantity>0&&c.quantity<=1000000,'裁線長度與條數必須大於零');}
 if(s.wireText!==undefined)wireAssert(s.wireText&&typeof s.wireText==='object'&&Object.values(s.wireText).every(x=>text(x,100)),'線材文字設定不正確');
}
function wireEqual(a,b){return JSON.stringify(a)===JSON.stringify(b);}
export function wireChangeAllowed(before,after,e){
 const bt=before.wireTypes||[],at=after.wireTypes||[],br=before.wireReels||[],ar=after.wireReels||[],bc=before.wireCuts||[],ac=after.wireCuts||[];
 for(const [old,list]of [[bt,at],[br,ar]]){
  for(const x of old)if(!list.some(n=>n.id===x.id)&&(!permitted(e,'wire.delete')||(old===br&&(x.photos.length||bc.some(c=>c.reelId===x.id)))||(old===bt&&br.some(r=>r.wireId===x.id))))return false;
  for(const x of list){const prev=old.find(n=>n.id===x.id);if(!prev){if(!permitted(e,'wire.create')||(old===br&&(x.status!=='enough'||x.photos.length)))return false;continue;}
   if(old===bt){if(!wireEqual(prev,x)&&!permitted(e,'wire.edit'))return false;}
   else{const a={...prev},b={...x};delete a.photos;delete b.photos;delete a.status;delete b.status;
    if(!wireEqual(a,b)&&!permitted(e,'wire.edit'))return false;
    if(prev.wireId!==x.wireId)return false;
    if(prev.status!==x.status&&!['warehouse','supervisor'].includes(e.role))return false;
    if(!wireEqual(x.photos.slice(0,prev.photos.length),prev.photos)||x.photos.length<prev.photos.length)return false;
    if(x.photos.length>prev.photos.length&&!permitted(e,'wire.photos'))return false;
   }
  }
  if(!wireEqual(old.filter(x=>list.some(n=>n.id===x.id)).map(x=>x.id),list.filter(x=>old.some(n=>n.id===x.id)).map(x=>x.id))&&!permitted(e,'wire.edit'))return false;
 }
 for(const c of bc)if(!ac.some(x=>x.id===c.id))return false;
 for(const c of ac){const prev=bc.find(x=>x.id===c.id);if(!prev){if(!permitted(e,'wire.cut')||c.actorId!==String(e.id)||c.actor!==e.name)return false;const r=ar.find(r=>r.id===c.reelId),photo=r?.photos.find(p=>p.id===c.photoId);if(c.photoId&&(!photo||photo.actorId!==String(e.id)||photo.created!==c.time||br.some(r=>r.photos.some(p=>p.id===c.photoId))))return false;}
 else if(!wireEqual(prev,c)){if(e.role!=='supervisor'&&(!permitted(e,'wire.editOwn')||prev.actorId!==String(e.id)))return false;const a={...prev},b={...c};for(const k of ['length','quantity','photoId','updatedAt','updatedBy']){delete a[k];delete b[k];}if(!wireEqual(a,b)||c.updatedBy!==e.name||Number.isNaN(Date.parse(c.updatedAt)))return false;if(c.photoId!==prev.photoId&&br.some(r=>r.photos.some(p=>p.id===c.photoId)))return false;}
 }return true;
}
export function visibleState(s,e){if(e.role==='supervisor')return s;const out=structuredClone(s);for(const [key,collections]of [['cases',['cases']],['warehouse',['projects','deletedProjects']],['plating',['platingProjects']],['wire',['wireTypes','wireReels','wireCuts']]])if(!permitted(e,key+'.view'))for(const c of collections)out[c]=[];
 if(e.role!=='supervisor')out.logs=(out.logs||[]).filter(l=>{if(l.project?.startsWith('wire:'))return permitted(e,'wire.view');if(l.project?.startsWith('plating:'))return permitted(e,'plating.view');return false;});return out;}
export async function wirePhotoKey(id){return 'wire-photos/'+id;}
export async function verifyWirePhotos(env,before,after,e){
 for(const reel of after.wireReels||[]){const prev=(before.wireReels||[]).find(r=>r.id===reel.id);for(const photo of reel.photos){if(prev?.photos.some(p=>p.id===photo.id))continue;const file=await env.UPLOADS?.head(await wirePhotoKey(photo.id)),m=file?.customMetadata;wireAssert(m&&Date.now()-Date.parse(m.created)<24*60*60*1000&&m.reelId===reel.id&&m.actorId===String(e.id)&&m.actor===photo.actor&&m.created===photo.created&&m.actorId===photo.actorId&&m.name===photo.name,'照片尚未上傳完成或不屬於此線捆，請重新上傳');}}
}
