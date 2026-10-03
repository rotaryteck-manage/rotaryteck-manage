import {backupData85,backupPhotos85} from './backup85.mjs';
import {notificationClock85,notificationPlan85,notificationRulesValid85} from './notifications85.mjs';
import webpush from 'web-push';
import {createECDH} from 'node:crypto';
import {validateWorkflowState,workflowChangeAllowed,validDate} from './workflows.mjs';
import {canDeleteProject,projectDeletionAllowed,builtinProfiles,capabilityNames,ensurePermissions,employeePermissions,permitted,validateWire,wireChangeAllowed,visibleState,wirePhotoKey,verifyWirePhotos} from './wire-permissions.mjs';
import {recordAuxiliary85,recordCollections,recordKey,normalizeLogIds,stableJSON,splitState,joinRecords} from './state-codec.mjs';
import {scheduleApi,schedulePhotoApi,schedulePhotoUpload,scheduleMaterialPhotoApi,scheduleMaterialUpload} from './schedule.mjs';
import {recordsExportApi} from './records-export.mjs';
import {holidayApi60,governmentHolidayData60,namedGovernmentHoliday60} from './holidays.mjs';
import {fetchClosureStatus90} from './alerts90.mjs';
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
   check(['pending','passed','abnormal'].includes(s.inspection),'請先登記回貨日期再品檢');
   check(typeof s.note==='string'&&s.note.length<=1000,'請填寫異常說明');
   check(s.welderId===undefined||typeof s.welderId==='string','焊接人員編號不正確');check(s.welderName===undefined||(typeof s.welderName==='string'&&s.welderName.length<=80),'焊接人員名稱不正確');
   check(Array.isArray(s.groups)&&s.groups.length>=1&&s.groups.length<=100,'電鍍配置數量不正確');let total=0,sets=0;
   for(const g of s.groups){
    check(object(g)&&int(g.sets,1)&&g.sets<=1000000&&Array.isArray(g.rings)&&g.rings.length>=1&&g.rings.length<=100,'電鍍組數或環片格式不正確');sets+=g.sets;
    for(const r of g.rings){check(object(r)&&text(r.name)&&int(r.qty,1)&&r.qty<=1000000,'環片名稱或數量不正確');total+=r.qty*g.sets;}
   }check(int(total,1)&&int(sets,1),'電鍍數量超過安全範圍');
  }
 }return projects;
}
export function validate(s,previous={}){
 if(s.notificationRules!==undefined)notificationRulesValid85(s.notificationRules);
 if(s.notificationVersion90!==undefined)check(s.notificationVersion90===1,'通知版本標記不正確');
 check(object(s)&&Array.isArray(s.projects),'專案資料格式不正確');
 validatePlating(s.platingProjects);validateWire(s);validateWorkflowState(s);
 if(s.platingVendors!==undefined)check(Array.isArray(s.platingVendors)&&s.platingVendors.length<=200&&s.platingVendors.every(v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=100)&&new Set(s.platingVendors.map(v=>v.toLowerCase())).size===s.platingVendors.length,'電鍍廠商選項不正確');
 if(s.platingText!==undefined){check(object(s.platingText),'電鍍文字設定不正確');for(const v of Object.values(s.platingText))check(typeof v==='string'&&v.trim()&&v.length<=100,'電鍍文字設定不正確');}
 const cases=s.cases??[];check(Array.isArray(cases)&&cases.length<=1000,'案件資料格式不正確');const caseIds=new Set(),previousCases=new Map((previous.cases||[]).map(x=>[x.id,x]));
 for(const c of cases){check(object(c)&&typeof c.id==='string'&&!caseIds.has(c.id),'案件編號重複');caseIds.add(c.id);check(typeof c.name==='string'&&c.name.trim()&&c.name.length<=100,'案件名稱不正確');check(typeof c.vendor==='string'&&c.vendor.length<=100,'案件廠商不正確');check(['尚未開始','執行中','進行中','結案'].includes(c.status),'案件狀態不正確');check(c.batch===undefined||(Number.isSafeInteger(c.batch)&&c.batch>0),'製作批次不正確');check(c.quantity===undefined||(Number.isSafeInteger(c.quantity)&&c.quantity>0),'製作套數不正確');for(const field of ['acceptedDate','closedDate']){const d=c[field],old=previousCases.get(c.id);check(typeof d==='string'&&(!d||validDate(d)||(old&&old[field]===d)),'案件日期不正確');}}
 const logs=s.logs??[];check(Array.isArray(logs)&&logs.length<=100000,'資訊庫紀錄格式不正確');for(const l of logs)check(object(l)&&typeof l.time==='string'&&typeof l.action==='string'&&typeof l.detail==='string'&&(!l.location||typeof l.location==='string'),'資訊庫紀錄格式不正確');
 if(s.auditSecurity!==undefined)check(object(s.auditSecurity)&&/^[a-f0-9]{32}$/.test(s.auditSecurity.salt)&&/^[a-f0-9]{64}$/.test(s.auditSecurity.hash),'資訊庫密碼設定格式不正確');
 check(s.projects.length<=1000,'專案上限為 1000');const ids=new Set();
 const deleted=s.deletedProjects??[];check(Array.isArray(deleted),'刪除資料格式不正確');const previousProjects=new Map((previous.projects||[]).map(x=>[x.id,x]));
 for(const p of [...s.projects,...deleted.map(x=>x.project)]){
  check(object(p)&&typeof p.id==='string'&&p.id.length>0&&!ids.has(p.id),'專案編號重複或缺少');ids.add(p.id);
  if(p.projectDate!==undefined){const old=previousProjects.get(p.id);check(typeof p.projectDate==='string'&&(validDate(p.projectDate)||(old&&old.projectDate===p.projectDate)),'專案日期不正確');}
  if(p.basketCount!==undefined)check(int(p.basketCount,1),'籃數必須為正整數');
  check(typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=100,'專案名稱不正確');
  check(Array.isArray(p.parts)&&object(p.inventory),'零件或庫存格式不正確');const parts=new Set();
  const materialLogs=p.materialLogs??[];check(Array.isArray(materialLogs)&&materialLogs.length<=100000,'收領料紀錄格式不正確');for(const entry of materialLogs){check(object(entry)&&typeof entry.time==='string'&&typeof entry.actor==='string'&&Array.isArray(entry.received)&&Array.isArray(entry.issued),'收領料紀錄格式不正確');for(const item of [...entry.received,...entry.issued])check(object(item)&&typeof item.name==='string'&&int(item.qty,1),'收領料紀錄內容不正確');}
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
 return row?.status==='active'?await employeePermissions(env,row):null;
}
async function legacyCompanyRow(env){
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
 const previousProjects=new Map(a.projects.map(p=>[p.id,p]));
 for(const next of b.projects){
 const prev=previousProjects.get(next.id);if(!prev||prev.parts.length!==next.parts.length)return false;
  const oldMaterial=prev.materialLogs||[],newMaterial=next.materialLogs||[];if(newMaterial.length<oldMaterial.length||JSON.stringify(newMaterial.slice(newMaterial.length-oldMaterial.length))!==JSON.stringify(oldMaterial))return false;
  const active=new Set(prev.parts.map(i=>i.id));
  for(const key of new Set([...Object.keys(prev.inventory),...Object.keys(next.inventory)]))if(!active.has(key)&&next.inventory[key]!==prev.inventory[key])return false;
  const previousParts=new Map(prev.parts.map(i=>[i.id,i])),oldLogIds=new Set(oldMaterial.map(x=>x.id)),corrections=new Map(newMaterial.filter(l=>!oldLogIds.has(l.id)&&l.correction?.partId).map(l=>[l.correction.partId,l.correction]));
  for(const part of next.parts){const old=previousParts.get(part.id);if(!old)return false;const received=part.received-old.received,oldStock=Number(prev.inventory[part.id]||0),newStock=Number(next.inventory[part.id]||0),correction=corrections.get(part.id);if(received<0){if(!correction||correction.delta!==received||newStock!==oldStock+received)return false;}else if(!int(received)||newStock>oldStock+received)return false;part.received=old.received;}
  next.inventory=structuredClone(prev.inventory);if(prev.materialLogs===undefined)delete next.materialLogs;else next.materialLogs=structuredClone(prev.materialLogs);
 }
 return stableJSON(a)===stableJSON(b);
}
const storageSchema=[
 'CREATE TABLE IF NOT EXISTS state_records (record_id INTEGER PRIMARY KEY AUTOINCREMENT,record_key TEXT NOT NULL UNIQUE,body TEXT,revision INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS state_storage_meta (singleton INTEGER PRIMARY KEY CHECK(singleton=1),revision INTEGER NOT NULL,source_revision INTEGER NOT NULL,migrated_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS state_commits (request_id TEXT PRIMARY KEY NOT NULL,signature TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),result TEXT NOT NULL,created_at TEXT NOT NULL)'
];
function recordChunks(entries){const chunks=[];let batch=[],size=0;for(const entry of entries){const bytes=new TextEncoder().encode(JSON.stringify(entry)).length;if(batch.length&&size+bytes>500000){chunks.push(batch);batch=[];size=0;}batch.push(entry);size+=bytes;}if(batch.length)chunks.push(batch);return chunks;}
const ensureRecordStorageReady76=new WeakMap();
async function ensureRecordStorage(env){
 let pending=ensureRecordStorageReady76.get(env.DB);
 if(!pending){pending=ensureRecordStorageCore76(env).catch(error=>{ensureRecordStorageReady76.delete(env.DB);throw error;});ensureRecordStorageReady76.set(env.DB,pending);}
 return pending;
}
async function ensureRecordStorageCore76(env){
 await env.DB.batch(storageSchema.map(sql=>env.DB.prepare(sql)));
 if(await env.DB.prepare('SELECT revision FROM state_storage_meta WHERE singleton=1').first())return;
 const legacy=await legacyCompanyRow(env),initial=normalizeLogIds(legacy?JSON.parse(legacy.body):{projects:[],deletedProjects:[],logs:[]});
 const entries=Object.entries(splitState(initial)).map(([key,value])=>({key,body:JSON.stringify(value)}));
 if(stableJSON(joinRecords(Object.fromEntries(entries.map(e=>[e.key,JSON.parse(e.body)]))))!==stableJSON({...initial,logs:initial.logs||[]}))throw Error('舊資料轉換驗證失敗，原始資料保留未修改');
 const sourceRevision=legacy?.revision||0;
 await env.DB.batch([
  ...recordChunks(entries).map(chunk=>env.DB.prepare(`INSERT INTO state_records(record_key,body,revision) SELECT json_extract(value,'$.key'),json_extract(value,'$.body'),1 FROM json_each(?) WHERE NOT EXISTS(SELECT 1 FROM state_storage_meta WHERE singleton=1) AND COALESCE((SELECT revision FROM company_state WHERE company_id=?),0)=?`).bind(JSON.stringify(chunk),COMPANY_ID,sourceRevision)),
  env.DB.prepare(`INSERT OR IGNORE INTO state_storage_meta(singleton,revision,source_revision,migrated_at) SELECT 1,0,?,? WHERE COALESCE((SELECT revision FROM company_state WHERE company_id=?),0)=?`).bind(sourceRevision,new Date().toISOString(),COMPANY_ID,sourceRevision)
 ]);
 check(await env.DB.prepare('SELECT revision FROM state_storage_meta WHERE singleton=1').first(),'資料正在轉換，請重新整理；舊資料未刪除');
}
async function readRecordStorage(env){
 const result=await env.DB.batch([env.DB.prepare('SELECT revision FROM state_storage_meta WHERE singleton=1'),env.DB.prepare('SELECT record_key,body,revision FROM state_records ORDER BY record_id')]);
 const records=Object.create(null),versions=Object.create(null);
 for(const row of result[1].results){records[row.record_key]=row.body===null?undefined:JSON.parse(row.body);versions[row.record_key]=row.revision;}
 return {state:joinRecords(records),records,versions,revision:result[0].results[0].revision};
}
async function companyRow(env){await ensureRecordStorage(env);const data=await readRecordStorage(env);return{body:JSON.stringify(data.state),revision:data.revision};}
async function boundedJSON(request,maxBytes){
 const reader=request.body?.getReader();check(reader,'缺少儲存資料');let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw Error('這次修改的資料過大，請分次操作');}chunks.push(value);}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
function validateRecordChanges(changes){
 check(Array.isArray(changes)&&changes.length>0&&changes.length<=30000,'修改資料格式不正確');const seen=new Set();
 for(const c of changes){
  check(object(c)&&typeof c.key==='string'&&c.key.length<=1000&&!seen.has(c.key)&&int(c.version)&&Object.hasOwn(c,'value'),'資料版本或編號不正確');seen.add(c.key);
  const tuple=JSON.parse(c.key);check(Array.isArray(tuple)&&tuple.length===2&&tuple.every(v=>typeof v==='string'&&v.length>0)&&recordKey(...tuple)===c.key,'資料編號格式不正確');
  check(c.deleted===undefined||typeof c.deleted==='boolean','刪除標記不正確');const [kind,id]=tuple;check(['root','order','log',...recordAuxiliary85,...recordCollections].includes(kind),'資料類型不正確');
  if(kind==='order')check(recordCollections.includes(id),'排序類型不正確');
  if(!c.deleted&&recordCollections.includes(kind))check((kind==='deletedProjects'?c.value.project?.id:c.value.id)===id,'案件編號不一致');
  if(!c.deleted&&kind==='log')check(c.value.id===id,'操作紀錄編號不一致');
  check(new TextEncoder().encode(JSON.stringify(c.value)).length<=1000000,'單一案件資料過大，請先整理該案件的歷史紀錄');
 }
}
export async function api(request,env){
 if(!hasCredentials(request))return json({error:'請先登入後再使用'},401);
 if(!env.DB)return json({error:'雲端資料庫尚未就緒'},503);
 try{
  const employee=await employeeFor(request,env);if(!employee)return json({error:'此帳號尚未由主管啟用'},403);
  if(request.method!=='GET'){
   if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
   if(request.method==='PUT')return json({error:'網站已更新儲存方式，請先下載未儲存資料，再重新整理網頁。',code:'CLIENT_UPGRADE'},409);
   if(request.method!=='PATCH')return json({error:'不支援的操作'},405);
   if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'格式不正確'},415);
  }
  await ensureRecordStorage(env);
  if(request.method==='GET'){const data=await readRecordStorage(env);return json({serverTime:new Date().toISOString(),state:visibleState(data.state,employee),versions:data.versions,revision:data.revision,storageVersion:2,currentUser:{id:employee.id,name:employee.name,email:employee.email,role:employee.role,roleLabel:employee.roleLabel,permissions:employee.permissions,profileId:employee.profileId}});}
  const input=await boundedJSON(request,8*1024*1024);check(input.storageVersion===2&&typeof input.requestId==='string'&&/^[a-f0-9-]{36}$/.test(input.requestId),'請重新整理至新版網站');validateRecordChanges(input.changes);
  const signature=await scopeKey(employee.id+':'+stableJSON(input.changes));
  for(let attempt=0;attempt<4;attempt++){
   const committed=await env.DB.prepare('SELECT signature,result FROM state_commits WHERE request_id=?').bind(input.requestId).first();
   if(committed){if(committed.signature!==signature)return json({error:'儲存編號重複，請重新載入'},409);return json(JSON.parse(committed.result));}
   const current=await readRecordStorage(env);
   const conflicts=input.changes.filter(c=>(current.versions[c.key]||0)!==c.version);
   if(conflicts.length)return json({error:'你修改的同一筆資料已被其他人更新。請先下載未儲存資料，再重新載入。',code:'RECORD_CONFLICT',keys:conflicts.map(c=>c.key)},409);
   const nextRecords={...current.records};for(const c of input.changes)nextRecords[c.key]=c.deleted?undefined:c.value;
   const next=joinRecords(nextRecords);validate(next,current.state);
   const previousCases=new Map((current.state.cases||[]).map(x=>[x.id,x])),caseNames=new Set();for(const c of next.cases||[]){const old=previousCases.get(c.id),key=c.name.trim().toLowerCase()+'\u0000'+Number(c.batch||1);if(!old||old.name!==c.name||Number(old.batch||1)!==Number(c.batch||1))check(!caseNames.has(key),'此案件的製作批次已存在');caseNames.add(key);}
   const previousShipments=new Map((current.state.platingProjects||[]).flatMap(p=>(p.shipments||[]).map(s=>[p.id+'\u0000'+s.id,s])));for(const p of next.platingProjects||[])for(const shipment of p.shipments||[]){const old=previousShipments.get(p.id+'\u0000'+shipment.id);if(stableJSON(old)!==stableJSON(shipment))check(shipment.inspection==='pending'||!!shipment.returned,'請先登記回貨日期再品檢');}
   if(!stateChangeAllowed(current.state,next,employee))return json({error:'沒有此操作的權限，或紀錄內容不符合規則'},403);
   await verifyWirePhotos(env,current.state,next,employee);
   const nextRevision=current.revision+1,versions=Object.fromEntries(input.changes.map(c=>[c.key,c.version+1])),result={storageVersion:2,revision:nextRevision,versions},now=new Date().toISOString();
   const writes=input.changes.map(c=>({key:c.key,body:c.deleted?null:JSON.stringify(c.value),revision:c.version+1}));
   try{
    await env.DB.batch([
     env.DB.prepare(`INSERT INTO state_commits(request_id,signature,revision,result,created_at) VALUES (?,?,CASE WHEN (SELECT revision FROM state_storage_meta WHERE singleton=1)=? THEN ? ELSE NULL END,?,?)`).bind(input.requestId,signature,current.revision,nextRevision,JSON.stringify(result),now),
     ...recordChunks(writes).map(chunk=>env.DB.prepare(`INSERT INTO state_records(record_key,body,revision) SELECT json_extract(value,'$.key'),json_extract(value,'$.body'),json_extract(value,'$.revision') FROM json_each(?) WHERE 1 ON CONFLICT(record_key) DO UPDATE SET body=excluded.body,revision=excluded.revision`).bind(JSON.stringify(chunk))),
     env.DB.prepare('UPDATE state_storage_meta SET revision=? WHERE singleton=1').bind(nextRevision),
     ...input.changes.filter(c=>JSON.parse(c.key)[0]==='wireReels'&&!c.deleted).map(c=>env.DB.prepare('DELETE FROM wire_pending_uploads WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(c.value.photos.map(p=>p.id))))
    ]);return json(result);
   }catch(e){const duplicate=await env.DB.prepare('SELECT request_id FROM state_commits WHERE request_id=?').bind(input.requestId).first();const latest=await env.DB.prepare('SELECT revision FROM state_storage_meta WHERE singleton=1').first();if(!duplicate&&latest.revision===current.revision)throw e;}
  }return json({error:'其他人正在儲存，請稍後重試。',code:'BUSY'},409);
 }catch(e){console.error('warehouse request failed',e.message);return json({error:e.message||'暫時無法儲存，請稍後重試'},400);}
}
export async function employeesApi(request,env){
 if(!hasCredentials(request))return json({error:'請先登入後再使用'},401);
 if(!env.DB)return json({error:'雲端資料庫尚未就緒'},503);
 try{
  const current=await employeeFor(request,env);if(!current||!permitted(current,'admin.employees'))return json({error:'只有主管可以管理員工權限'},403);
if(request.method==='GET'){const result=await env.DB.prepare("SELECT e.id,e.email,e.name,e.role,e.status,e.created_at,e.last_login_at,e.account_user_id,COALESCE(x.profile_id,'') AS profileId FROM employees e LEFT JOIN app_employee_settings x ON x.employee_id=e.id ORDER BY COALESCE(x.position,0),e.id").all();return json({items:result.results||[],currentEmployeeId:current.id});}
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
  const input=await request.json(),roles=['viewer','warehouse','supervisor'],email=String(input.email||'').trim().toLowerCase(),name=String(input.name||'').trim(),role=String(input.role||''),status=String(input.status||'active');
  check(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),'請填寫有效的員工信箱');check(name&&name.length<=80,'請填寫員工姓名');check(roles.includes(role),'權限層級不正確');check(['active','disabled'].includes(status),'帳號狀態不正確');
  const profileId=String(input.profileId||'');if(profileId)check(!builtinProfiles.some(p=>p.id===profileId)&&role==='viewer'&&await env.DB.prepare('SELECT id FROM app_permission_profiles WHERE id=?').bind(profileId).first(),'找不到自訂權限');
  if(!permitted(current,'admin.permissions')||current.role!=='supervisor'){
   check(role!=='supervisor','沒有授予主管身分的權限');
   const saved=await env.DB.prepare('SELECT permissions FROM app_permission_profiles WHERE id=?').bind(profileId||role).first();
   const assigned=saved?JSON.parse(saved.permissions):builtinProfiles.find(p=>p.id===role)?.permissions||[];
   check(assigned.every(k=>current.permissions.includes(k)),'不能授予自己沒有的權限');
   if(input.id){const target=await env.DB.prepare('SELECT * FROM employees WHERE id=?').bind(Number(input.id)).first();check(target&&target.id!==current.id&&target.role!=='supervisor','不能修改自己或主管帳號');await employeePermissions(env,target);check(target.permissions.every(k=>current.permissions.includes(k)),'不能管理權限高於自己的帳號');}
  }
  if(request.method!=='DELETE'&&status==='active')check(!await env.DB.prepare("SELECT id FROM employees WHERE name=? AND status='active' AND id<>?").bind(name,Number(input.id)||0).first(),'已有同名人員，請使用可辨識的姓名');
  const now=new Date().toISOString();
  if(request.method==='POST'){
   const redirect=new URL('/?invited=1',request.url).toString();
   const created=await supabaseAdmin(env,'/auth/v1/invite?redirect_to='+encodeURIComponent(redirect),'POST',{email,data:{name}});let result;
   try{result=await env.DB.prepare('INSERT INTO employees (account_user_id,email,name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(created.id,email,name,role,status,now,now).run();}
   catch(e){await supabaseAdmin(env,'/auth/v1/admin/users/'+encodeURIComponent(created.id),'DELETE');throw e;}
   const inserted=await env.DB.prepare('SELECT id FROM employees WHERE email=?').bind(email).first();await setEmployeeProfile(env,inserted.id,profileId);return json({id:inserted.id},201);
  }
  const id=Number(input.id);check(Number.isSafeInteger(id)&&id>0,'員工編號不正確');const target=await env.DB.prepare('SELECT id,account_user_id,email,role,status FROM employees WHERE id=?').bind(id).first();check(target,'找不到員工');
  if((target.role==='supervisor'&&target.status==='active')&&(role!=='supervisor'||status!=='active')){const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM employees WHERE role='supervisor' AND status='active' AND id<>?").bind(id).first();check(Number(count?.total)>0,'至少必須保留一位啟用中的主管');}
  if(request.method==='PUT'){let accountId=target.account_user_id;if(accountId)await supabaseAdmin(env,'/auth/v1/admin/users/'+encodeURIComponent(accountId),'PUT',{email,email_confirm:true,user_metadata:{name}});else{const redirect=new URL('/?invited=1',request.url).toString(),created=await supabaseAdmin(env,'/auth/v1/invite?redirect_to='+encodeURIComponent(redirect),'POST',{email,data:{name}});accountId=created.id;}await env.DB.prepare('UPDATE employees SET account_user_id=?,email=?,name=?,role=?,status=?,updated_at=? WHERE id=?').bind(accountId||null,email,name,role,status,now,id).run();await setEmployeeProfile(env,id,profileId);return json({updated:true});}

  if(request.method==='DELETE'){if(id===current.id)check(false,'不能刪除目前登入的主管帳號');if(target.account_user_id)await supabaseAdmin(env,'/auth/v1/admin/users/'+encodeURIComponent(target.account_user_id),'DELETE');await env.DB.prepare('DELETE FROM employees WHERE id=?').bind(id).run();await env.DB.prepare('DELETE FROM app_employee_settings WHERE employee_id=?').bind(id).run();return json({deleted:true});}
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
  if(url.searchParams.get('export')==='1'&&!(permitted(employee,'records.export')||permitted(employee,'admin.export')))return json({error:'沒有匯出權限'},403);
  if(!logo&&!(url.searchParams.get('export')==='1'&&(permitted(employee,'records.export')||permitted(employee,'admin.export')))&&!permitted(employee,(plating?'plating':'warehouse')+'.view'))return json({error:'沒有查看權限'},403);
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
    if(url.searchParams.get('export')==='1'&&!(permitted(employee,'records.export')||permitted(employee,'admin.export')))return json({error:'沒有匯出權限'},403);
    const result=await env.UPLOADS.list({prefix,limit:1000,cursor:url.searchParams.get('cursor')||undefined,include:['customMetadata']});
    return json({items:result.objects.map(o=>({id:o.key.slice(prefix.length),name:o.customMetadata?.name||'收據圖片',actor:o.customMetadata?.actor||'',kind:o.customMetadata?.kind||'dispatch',created:o.uploaded})),truncated:result.truncated,cursor:result.truncated?result.cursor:undefined});
   }
   const file=(url.searchParams.get('thumb')==='1'?await env.UPLOADS.get('thumbnails/'+key):null)||await env.UPLOADS.get(key);if(!file)return json({error:'找不到圖片'},404);
   return new Response(file.body,{headers:{'Content-Type':file.httpMetadata.contentType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }
  if(request.method==='DELETE'&&!logo){
   if(request.headers.get('origin')!==url.origin)return json({error:'來源驗證失敗'},403);
   if(id){
    if(!permitted(employee,(plating?'plating':'warehouse')+'.photos'))return json({error:'沒有照片管理權限'},403);
    const file=await env.UPLOADS.head(key);if(!file)return json({error:'找不到圖片'},404);
    await env.UPLOADS.delete(key);await env.UPLOADS.delete('thumbnails/'+key);return json({deleted:true});
   }
   if(!permitted(employee,'admin.photoPurge'))return json({error:'沒有永久刪除照片權限'},403);
   let cursor;do{const result=await env.UPLOADS.list({prefix,limit:1000,cursor});if(result.objects.length)await env.UPLOADS.delete(result.objects.flatMap(o=>[o.key,'thumbnails/'+o.key]));cursor=result.truncated?result.cursor:undefined;}while(cursor);
   return json({deleted:true});
  }
  if(request.method!=='POST')return json({error:'不支援的操作'},405);
  if(request.headers.get('origin')!==url.origin)return json({error:'來源驗證失敗'},403);
  if(logo&&!permitted(employee,'admin.settings'))return json({error:'只有主管可以更換 LOGO'},403);
  if(!logo&&!permitted(employee,(plating?'plating':'warehouse')+'.photos'))return json({error:'沒有照片管理權限'},403);
  const kind=url.searchParams.get('kind')||'dispatch';
  if(plating&&!['dispatch','area'].includes(kind))return json({error:'照片類別不正確'},400);
  const limit=800*1024;
  const {bytes,thumbnail,appIcon}=await readPhotoUpload(request);
  const hex=Array.from(bytes.slice(0,12)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const type=hex.startsWith('89504e470d0a1a0a')?'image/png':hex.startsWith('ffd8ff')?'image/jpeg':hex.startsWith('52494646')&&hex.slice(16)==='57454250'?'image/webp':null;
  if(!type)return json({error:'請上傳 PNG、JPG 或 WebP 圖片'},415);
  let name='圖片';try{name=decodeURIComponent(request.headers.get('x-file-name')||'圖片').slice(0,200);}catch{}
  const newId=crypto.randomUUID();
  await env.UPLOADS.put(logo?key:prefix+newId,bytes,{httpMetadata:{contentType:type},customMetadata:{name,actor:employee.name||employee.email||'使用者',...(plating?{kind}: {})}});
  if(logo&&appIcon&&!await env.UPLOADS.head('app-icons/'+key))await env.UPLOADS.put('app-icons/'+key,appIcon,{httpMetadata:{contentType:'image/png'}});
  const imageKey=logo?key:prefix+newId;if(thumbnail)await env.UPLOADS.put('thumbnails/'+imageKey,thumbnail,{httpMetadata:{contentType:'image/jpeg'}});else if(logo)await env.UPLOADS.delete('thumbnails/'+imageKey);
  return json({id:newId,created:new Date().toISOString()});
 }catch(e){console.error('image operation failed',e.message);return json({error:e.status===413?e.message:'圖片操作未完成，請重試'},e.status||500);}
}
function pushVapidDetails82(env){
 const publicKey=String(env.VAPID_PUBLIC_KEY||'').trim();
 const privateKey=String(env.VAPID_PRIVATE_KEY||'').trim();
 const subject=String(env.VAPID_SUBJECT||'').trim();

 check(publicKey,'缺少 VAPID_PUBLIC_KEY');
 check(privateKey,'缺少 VAPID_PRIVATE_KEY');
 check(subject,'缺少 VAPID_SUBJECT');

 return {
  subject,
  publicKey,
  privateKey
 };
}

async function sendPush82(env,subscription,options){
 const title=String(options.title||'擎正科技').slice(0,100);
 const message=String(options.message||'您有一則新的系統通知。').slice(0,500);
 const targetUrl=String(options.targetUrl||'/').slice(0,1000);

 const ruleId=String(options.ruleId||'');
 const employeeId=Number(options.employeeId);
 const notificationType=String(options.notificationType||'');
 const dedupeKey=String(
  options.dedupeKey||
  ('manual:'+crypto.randomUUID())
 );

 const receipt=await env.DB.prepare('SELECT status,attempts,updated_at FROM notification_receipts921 WHERE dedupe_key=?').bind(dedupeKey).first();
 if(receipt?.status==='sent')return{ok:true,duplicate:true};
 if(receipt&&Number(receipt.attempts||0)>=3)return{ok:false,duplicate:true,exhausted:true};
 const oldDelivery=await env.DB.prepare(
  'SELECT id,status,retry_count,last_attempt_at FROM notification_deliveries WHERE dedupe_key=?'
 ).bind(dedupeKey).first();

 if(oldDelivery){
  const stalePending=oldDelivery.status==='pending'&&Date.parse(oldDelivery.last_attempt_at||0)<Date.now()-10*60*1000;
  if((oldDelivery.status==='failed'||stalePending)&&Number(oldDelivery.retry_count||0)<2){
   const attemptedAt=new Date().toISOString();
   await env.DB.prepare("UPDATE notification_deliveries SET status='pending',retry_count=retry_count+1,last_attempt_at=?,error_message='' WHERE id=?").bind(attemptedAt,oldDelivery.id).run();
  }else{
  return {
   ok:oldDelivery.status==='sent',
   duplicate:true
  };
  }
 }

 const deliveryId=oldDelivery?.id||crypto.randomUUID();
 const createdAt=new Date().toISOString();
 await env.DB.prepare("INSERT INTO notification_receipts921(dedupe_key,status,attempts,created_at,updated_at) VALUES(?,'pending',1,?,?) ON CONFLICT(dedupe_key) DO UPDATE SET status='pending',attempts=notification_receipts921.attempts+1,updated_at=excluded.updated_at").bind(dedupeKey,createdAt,createdAt).run();

 const claim=oldDelivery?null:await env.DB.prepare(
  `INSERT OR IGNORE INTO notification_deliveries(
    id,
    rule_id,
    employee_id,
    subscription_id,
    notification_type,category,
    title,
    message,
    target_url,
    status,
    dedupe_key,
    created_at
   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`
 ).bind(
  deliveryId,
  ruleId,
  employeeId,
  subscription.id,
  notificationType,
  notificationCategory88(notificationType,options.category),
  title,
  message,
  targetUrl,
  'pending',
  dedupeKey,
  createdAt
 ).run();
 if(claim&&claim.meta?.changes!==1)return {ok:false,duplicate:true};

 try{
  const vapidDetails=pushVapidDetails82(env);

  await webpush.sendNotification(
   {
    endpoint:subscription.endpoint,
    keys:{
     p256dh:subscription.p256dh,
     auth:subscription.auth
    }
   },
   JSON.stringify({
    title,
    body:message,
    url:targetUrl,
    tag:dedupeKey,
    renotify:true
   }),
   {
    TTL:3600,
    vapidDetails,timeout:15000
   }
  );

  const sentAt=new Date().toISOString();

  await env.DB.batch([
   env.DB.prepare(
    `UPDATE notification_deliveries
        SET status='sent',
            sent_at=?,
            error_message=''
      WHERE id=?`
   ).bind(
    sentAt,
    deliveryId
   ),

   env.DB.prepare("UPDATE notification_receipts921 SET status='sent',updated_at=?,completed_at=? WHERE dedupe_key=?").bind(sentAt,sentAt,dedupeKey),

   env.DB.prepare(
    `UPDATE push_subscriptions
        SET last_success_at=?,
            last_error_at='',
            failure_count=0,
            updated_at=?
      WHERE id=?`
   ).bind(
    sentAt,
    sentAt,
    subscription.id
   )
  ]);

  return {
   ok:true,
   deliveryId
  };

 }catch(error){
  const failedAt=new Date().toISOString();
  const statusCode=Number(error?.statusCode||0);

  const errorMessage=String(
   error?.body||
   error?.message||
   '推播發送失敗'
  ).slice(0,1000);

  await env.DB.prepare(
   `UPDATE notification_deliveries
       SET status='failed',
           error_message=?
     WHERE id=?`
  ).bind(
   errorMessage,
   deliveryId
  ).run();

  await env.DB.prepare("UPDATE notification_receipts921 SET status='failed',updated_at=? WHERE dedupe_key=?").bind(failedAt,dedupeKey).run();

  if(statusCode===404||statusCode===410){
   await env.DB.prepare(
    'DELETE FROM push_subscriptions WHERE id=?'
   ).bind(subscription.id).run();

  }else{
   await env.DB.prepare(
    `UPDATE push_subscriptions
        SET last_error_at=?,
            failure_count=failure_count+1,
            updated_at=?
      WHERE id=?`
   ).bind(
    failedAt,
    failedAt,
    subscription.id
   ).run();
   const failures=await env.DB.prepare('SELECT failure_count FROM push_subscriptions WHERE id=?').bind(subscription.id).first();
   if(Number(failures?.failure_count||0)>=5)await env.DB.prepare('UPDATE push_subscriptions SET enabled=0,updated_at=? WHERE id=?').bind(failedAt,subscription.id).run();
  }

  return {
   ok:false,
   deliveryId,
   statusCode,
   error:errorMessage
  };
 }
}
function notificationCategory88(type,preferred=''){
 if(preferred)return String(preferred).slice(0,30);
 return({work:'工作排程',report:'工作回報',wire:'線材提醒',plating:'電鍍提醒',material:'料件紀錄',holiday:'假日提醒',closure:'停班提醒',test:'系統通知',custom:'自訂提醒'})[type]||'其他';
}
function notificationSourceName921(value){return({'manual-test':'手動測試','rule-preview':'規則預覽','holiday-preview':'假日模擬','closure-preview':'停班模擬'})[value]||value||'手動測試'}
async function notificationInboxCreate88(env,employeeId,options){
 const sourceKey=String(options.sourceKey||options.dedupeKey||('manual:'+crypto.randomUUID())).slice(0,300),now=new Date().toISOString(),id=crypto.randomUUID();
 await env.DB.prepare(`INSERT OR IGNORE INTO notification_inbox88(id,employee_id,category,title,message,target_url,source_key,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id,Number(employeeId),notificationCategory88(options.notificationType,options.category),String(options.title||'擎正科技提醒').slice(0,100),String(options.message||'您有一則新的系統通知。').slice(0,500),String(options.targetUrl||'/').slice(0,1000),sourceKey,now).run();
 return sourceKey;
}
async function notificationDailyClaim921(env,limit=200){
 const day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),now=new Date().toISOString();
 await env.DB.prepare('INSERT OR IGNORE INTO notification_daily_usage921(day,attempts,updated_at) VALUES(?,0,?)').bind(day,now).run();
 const result=await env.DB.prepare('UPDATE notification_daily_usage921 SET attempts=attempts+1,updated_at=? WHERE day=? AND attempts<?').bind(now,day,limit).run();
 return Number(result.meta?.changes||0)===1;
}
async function notificationQuota921(env,limit=200){const day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),row=await env.DB.prepare('SELECT attempts FROM notification_daily_usage921 WHERE day=?').bind(day).first(),used=Number(row?.attempts||0);return{day,limit,used,remaining:Math.max(0,limit-used)}}
async function notificationDispatch88(env,employeeId,options,budget=null){
 const person=await env.DB.prepare("SELECT e.id,COALESCE(n.enabled,1) AS enabled FROM employees e LEFT JOIN notification_people n ON n.employee_id=e.id WHERE e.id=? AND e.status='active'").bind(Number(employeeId)).first();
 if(!person||person.enabled===0)return{sent:0,failed:0,results:[]};
 const sourceKey=await notificationInboxCreate88(env,employeeId,options),devices=await env.DB.prepare('SELECT * FROM push_subscriptions WHERE employee_id=? AND enabled=1 ORDER BY updated_at DESC').bind(Number(employeeId)).all(),results=[],queue=[];
 let deferred=0;
 for(const device of devices.results||[]){const dedupeKey=sourceKey+':'+device.id,receipt=await env.DB.prepare('SELECT status,attempts FROM notification_receipts921 WHERE dedupe_key=?').bind(dedupeKey).first();if(receipt?.status==='sent'){results.push({ok:true,duplicate:true});continue}if(Number(receipt?.attempts||0)>=3){results.push({ok:false,duplicate:true,exhausted:true});continue}if(budget&&budget.remaining<=0){deferred++;continue}if(!await notificationDailyClaim921(env)){deferred++;continue}if(budget)budget.remaining--;queue.push({device,dedupeKey})}
 for(let index=0;index<queue.length;index+=4){const batch=queue.slice(index,index+4);results.push(...await Promise.all(batch.map(async item=>{try{return await sendPush82(env,item.device,{...options,employeeId:Number(employeeId),dedupeKey:item.dedupeKey})}catch(error){return{ok:false,error:error?.message||String(error)}}})))}
 return{sent:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok&&!x.duplicate).length,deferred,results};
}
async function notificationDispatchBatch93(env,employeeId,plans,budget=null){
 if(plans.length===1)return notificationDispatch88(env,employeeId,{...plans[0],sourceKey:plans[0].sourceKey||plans[0].dedupeKey},budget);
 const person=await env.DB.prepare("SELECT e.id,COALESCE(n.enabled,1) AS enabled FROM employees e LEFT JOIN notification_people n ON n.employee_id=e.id WHERE e.id=? AND e.status='active'").bind(Number(employeeId)).first();if(!person||person.enabled===0)return{sent:0,failed:0,deferred:0,results:[]};
 const devices=await env.DB.prepare('SELECT * FROM push_subscriptions WHERE employee_id=? AND enabled=1 ORDER BY updated_at DESC').bind(Number(employeeId)).all(),results=[];let deferred=0,inboxCreated=false;
 for(const device of devices.results||[]){
  const pending=[];for(const plan of plans){const key=plan.dedupeKey+':'+device.id,row=await env.DB.prepare('SELECT status,attempts FROM notification_receipts921 WHERE dedupe_key=?').bind(key).first();if(row?.status!=='sent'&&Number(row?.attempts||0)<3)pending.push({plan,key});}
  if(!pending.length){results.push({ok:true,duplicate:true});continue}if(budget&&budget.remaining<=0){deferred++;continue}if(!await notificationDailyClaim921(env)){deferred++;continue}if(budget)budget.remaining--;
  const first=pending[0].plan,stamp=notificationClock85(Date.now()).day,signature=pending.map(x=>x.plan.dedupeKey).sort().join('|'),batchKey='batch:'+first.ruleId+':'+employeeId+':'+stamp+':'+notificationHash93(signature),options={...first,message:pending.map(x=>x.plan.message).join('\n'),sourceKey:batchKey,dedupeKey:batchKey+':'+device.id};
  if(!inboxCreated){await notificationInboxCreate88(env,employeeId,options);inboxCreated=true}
  const result=await sendPush82(env,device,{...options,employeeId:Number(employeeId)});results.push(result);const now=new Date().toISOString();await env.DB.batch(pending.map(item=>env.DB.prepare("INSERT INTO notification_receipts921(dedupe_key,status,attempts,created_at,updated_at,completed_at) VALUES(?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO UPDATE SET status=excluded.status,attempts=notification_receipts921.attempts+1,updated_at=excluded.updated_at,completed_at=excluded.completed_at").bind(item.key,result.ok?'sent':'failed',1,now,now,result.ok?now:null)));
 }
 return{sent:results.filter(x=>x.ok&&!x.duplicate).length,failed:results.filter(x=>!x.ok&&!x.duplicate).length,deferred,results};
}
function notificationHash93(value){let hash=2166136261;for(const character of value){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619)}return(hash>>>0).toString(36)}
export async function pushTestApi82(request,env){
 if(request.method!=='POST')
  return json({error:'不支援的操作'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
 if(!hasCredentials(request))
  return json({error:'請先登入'},401);

 try{
  const employee=await employeeFor(request,env);

  if(!employee)
   return json({error:'帳號未啟用'},403);

  if(!permitted(employee,'admin.settings'))
   return json({error:'沒有系統通知管理權限'},403);

  const input=await boundedJSON(request,8192);
  check(input.confirmed===true,'請先確認要發送測試通知');

  const all=input.employeeId==='all',employeeId=all?null:Number(input.employeeId);
  check(all||Number.isSafeInteger(employeeId)&&employeeId>0,'請選擇測試通知接收人員');
  const title=String(input.title||'擎正科技測試通知').trim(),message=String(input.message||'通知功能測試成功。').trim(),targetUrl=String(input.targetUrl||'/'),sourcePage=String(input.source||'manual-test').trim();
  check(title&&title.length<=100&&message&&message.length<=500,'請填寫完整的測試通知內容');check(/^\/(?!\/)[^\\\r\n]*$/.test(targetUrl)&&targetUrl.length<=1000,'通知前往位置不正確');
  check(/^[a-z0-9-]{1,40}$/.test(sourcePage),'測試通知來源不正確');
  let targetEmployee=null,result;
  if(all){
   result=await env.DB.prepare(`SELECT s.id,s.employee_id,s.endpoint,s.p256dh,s.auth,s.device_label,e.name AS employee_name FROM push_subscriptions s JOIN employees e ON e.id=s.employee_id LEFT JOIN notification_people n ON n.employee_id=e.id WHERE e.status='active' AND s.enabled=1 AND COALESCE(n.enabled,1)=1 ORDER BY e.id,s.updated_at DESC`).all();
  }else{
   const personState=await env.DB.prepare('SELECT enabled FROM notification_people WHERE employee_id=?').bind(employeeId).first();check(personState?.enabled!==0,'此人員通知已由後台停用');
   targetEmployee=await env.DB.prepare(`SELECT id,name FROM employees WHERE id=? AND status='active'`).bind(employeeId).first();
   check(targetEmployee,'找不到這位員工');
   result=await env.DB.prepare(`SELECT id,employee_id,endpoint,p256dh,auth,device_label FROM push_subscriptions WHERE employee_id=? AND enabled=1 ORDER BY updated_at DESC`).bind(employeeId).all();
  }
  const subscriptions=result.results||[];

  check(
   subscriptions.length>0,
   all?'目前全員都沒有已開啟的通知裝置':'這位員工目前沒有已開啟的通知裝置'
  );

  const results=[],testId=crypto.randomUUID(),queue=[];
  for(const subscription of subscriptions){if(await notificationDailyClaim921(env))queue.push(subscription);else results.push({ok:false,deferred:true,deviceId:subscription.id,deviceLabel:subscription.device_label||'未命名裝置',employeeName:subscription.employee_name||targetEmployee?.name||''})}
  for(let index=0;index<queue.length;index+=4)results.push(...await Promise.all(queue.slice(index,index+4).map(async subscription=>{const result=await sendPush82(env,subscription,{employeeId:Number(subscription.employee_id),notificationType:'test',category:'系統測試',title,message,targetUrl,dedupeKey:'test:'+testId+':'+subscription.employee_id+':'+subscription.id});return{...result,deviceId:subscription.id,deviceLabel:subscription.device_label||'未命名裝置',employeeName:subscription.employee_name||targetEmployee?.name||''}})));

  const sent=results.filter(x=>x.ok).length;
  const failed=results.length-sent;
  await env.DB.prepare('INSERT INTO notification_test_audit92(id,actor_id,actor_name,target_employee,title,message,device_count,sent_count,failed_count,source_page,user_agent,created_at,results_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(testId,employee.id,employee.name,all?'全員':targetEmployee.name,title,message,results.length,sent,failed,sourcePage,String(request.headers.get('user-agent')||'').slice(0,500),new Date().toISOString(),JSON.stringify(results.map(x=>({deviceId:x.deviceId||'',deviceLabel:x.deviceLabel||'',employeeName:x.employeeName||'',ok:!!x.ok,deferred:!!x.deferred,error:x.error||''})))).run();

  return json({
   employeeName:all?'全員':targetEmployee.name,
   employeeCount:all?new Set(subscriptions.map(x=>x.employee_id)).size:1,
   devices:results.length,
   sent,
   failed,results
  });

 }catch(error){
  return json({
   error:error.message||'測試通知發送失敗'
  },400);
 }
}
export async function notificationInboxApi88(request,env){
 const employee=await employeeFor(request,env);if(!employee)return json({error:'請先登入'},401);
 if(request.method==='GET'){
  await cleanupNotificationInbox89(env);
  const rows=await env.DB.prepare('SELECT id,category,title,message,target_url,created_at,read_at FROM notification_inbox88 WHERE employee_id=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(employee.id).all();
  const unread=await env.DB.prepare("SELECT COUNT(*) AS n FROM notification_inbox88 WHERE employee_id=? AND read_at=''").bind(employee.id).first();
  return json({items:(rows.results||[]).map(x=>({id:x.id,category:x.category,title:x.title,message:x.message,targetUrl:x.target_url,createdAt:x.created_at,readAt:x.read_at})),unread:Number(unread?.n)||0});
 }
 if(request.method!=='PATCH')return json({error:'不支援的操作'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
 try{
  const input=await boundedJSON(request,4096),now=new Date().toISOString();let result;
  if(input.scope==='all')result=await env.DB.prepare("UPDATE notification_inbox88 SET read_at=? WHERE employee_id=? AND read_at=''").bind(now,employee.id).run();
  else{check(typeof input.id==='string'&&input.id.length<=100,'通知編號不正確');result=await env.DB.prepare("UPDATE notification_inbox88 SET read_at=? WHERE id=? AND employee_id=? AND read_at=''").bind(now,input.id,employee.id).run();}
  const unread=await env.DB.prepare("SELECT COUNT(*) AS n FROM notification_inbox88 WHERE employee_id=? AND read_at=''").bind(employee.id).first();return json({saved:true,changed:Number(result.meta?.changes)||0,unread:Number(unread?.n)||0});
 }catch(error){return json({error:error.message||'通知已讀狀態儲存失敗'},400);}
}
export async function cleanupNotificationInbox89(env,now=Date.now()){
 const cutoff=new Date(Number(now)-7*86400000).toISOString();const result=await env.DB.prepare('DELETE FROM notification_inbox88 WHERE created_at<=?').bind(cutoff).run();await cleanupStaleClosure901(env,now);return Number(result.meta?.changes)||0;
}
export async function validatePushPublicKey83(value){
 const key=String(value||'').trim();
 if(!/^[A-Za-z0-9_-]{87}$/.test(key))return false;
 try{
  const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/')+'=');
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  if(bytes.length!==65||bytes[0]!==4)return false;
  await crypto.subtle.importKey('raw',bytes,
   {name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  return true;
 }catch{return false;}
}
export async function pushPublicKeyApi82(request,env){
 if(request.method!=='GET')
  return json({error:'不支援的操作'},405);
 if(new URL(request.url).searchParams.get('status')==='1')return pushKeyStatus86(request,env);

 if(!hasCredentials(request))
  return json({error:'請先登入'},401);

 try{
  const employee=await employeeFor(request,env);

  if(!employee)
   return json({error:'帳號未啟用'},403);

  const publicKey=String(env.VAPID_PUBLIC_KEY||'').trim();

  if(!publicKey)
   return json({error:'通知服務尚未完成金鑰設定'},503);

  if(!await validatePushPublicKey83(publicKey))
   return json({error:'通知公鑰設定不完整或無效，請主管確認 VAPID_PUBLIC_KEY 後重新部署'},503);

  return json({publicKey});

 }catch(e){
  return json({
   error:e.message||'無法讀取通知設定'
  },500);
 }
}
export async function pushKeyStatus86(request,env){
 if(request.method!=='GET')return json({error:'不支援的操作'},405);
 const employee=await employeeFor(request,env);if(!employee||!permitted(employee,'admin.settings'))return json({error:'沒有系統通知管理權限'},403);
 const publicKey=String(env.VAPID_PUBLIC_KEY||'').trim(),privateKey=String(env.VAPID_PRIVATE_KEY||'').trim(),subject=String(env.VAPID_SUBJECT||'').trim();
 if(!publicKey)return json({ok:false,status:'missing-public',message:'缺少 VAPID_PUBLIC_KEY'});
 if(!privateKey)return json({ok:false,status:'missing-private',message:'缺少 VAPID_PRIVATE_KEY'});
 if(!subject)return json({ok:false,status:'missing-subject',message:'缺少 VAPID_SUBJECT'});
 if(!await validatePushPublicKey83(publicKey))return json({ok:false,status:'invalid-public',message:'VAPID_PUBLIC_KEY 格式錯誤'});
 try{
  if(!/^[A-Za-z0-9_-]{43}$/.test(privateKey))throw Error('format');
  const bytes=Buffer.from(privateKey,'base64url');if(bytes.length!==32)throw Error('length');
  const ecdh=createECDH('prime256v1');ecdh.setPrivateKey(bytes);const derived=ecdh.getPublicKey().toString('base64url');
  if(derived!==publicKey)return json({ok:false,status:'mismatch',message:'公開金鑰與私密金鑰不配對'});
  return json({ok:true,status:'ready',message:'通知金鑰設定正常且互相配對'});
 }catch{return json({ok:false,status:'invalid-private',message:'VAPID_PRIVATE_KEY 格式錯誤'});}
}
export async function pushSubscriptionApi82(request,env){
 if(!hasCredentials(request))return json({error:'請先登入'},401);
 try{
  const employee=await employeeFor(request,env);if(!employee)return json({error:'帳號未啟用'},403);
  const url=new URL(request.url),admin=url.searchParams.get('admin')==='1';
  if(admin&&!permitted(employee,'admin.settings'))return json({error:'沒有系統通知管理權限'},403);
  const device=d=>({id:d.id,deviceLabel:d.device_label,userAgent:d.user_agent,enabled:!!d.enabled,createdAt:d.created_at,updatedAt:d.updated_at,lastSeenAt:d.last_seen_at,lastSuccessAt:d.last_success_at,lastErrorAt:d.last_error_at,failureCount:d.failure_count});
  if(request.method==='GET'){
   if(admin){
    const people=await env.DB.prepare("SELECT e.id,e.name,e.status,COALESCE(n.enabled,1) AS enabled FROM employees e LEFT JOIN notification_people n ON n.employee_id=e.id ORDER BY e.id").all();
    const devices=await env.DB.prepare('SELECT * FROM push_subscriptions ORDER BY updated_at DESC').all();
    return json({people:people.results.map(p=>({...p,enabled:!!p.enabled,devices:devices.results.filter(d=>d.employee_id===p.id).map(device)}))});
   }
   const rows=await env.DB.prepare('SELECT * FROM push_subscriptions WHERE employee_id=? ORDER BY updated_at DESC').bind(employee.id).all();
   const person=await env.DB.prepare('SELECT enabled FROM notification_people WHERE employee_id=?').bind(employee.id).first();
   return json({items:rows.results.map(device),personEnabled:person?.enabled!==0,employeeId:employee.id});
  }
  if(request.headers.get('origin')!==url.origin)return json({error:'來源驗證失敗'},403);
  const input=await boundedJSON(request,32768),now=new Date().toISOString();
  if(request.method==='PATCH'&&input.employeeId){
   check(admin,'只有通知管理者可設定人員通知');const id=Number(input.employeeId);check(Number.isSafeInteger(id)&&!!await env.DB.prepare('SELECT id FROM employees WHERE id=?').bind(id).first(),'找不到人員');check(typeof input.enabled==='boolean','開關格式不正確');
   await env.DB.prepare('INSERT INTO notification_people(employee_id,enabled,updated_at) VALUES(?,?,?) ON CONFLICT(employee_id) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at').bind(id,input.enabled?1:0,now).run();return json({saved:true});
  }
  if(request.method==='POST'){
   const endpoint=String(input.endpoint||''),p256dh=String(input.p256dh||''),auth=String(input.auth||'');
   check(endpoint.startsWith('https://')&&endpoint.length<=4000&&p256dh&&p256dh.length<=500&&auth&&auth.length<=500,'通知訂閱資料不正確');
   // Only public push service destinations; do not turn the worker into a generic request proxy.
   const host=new URL(endpoint).hostname;check(['fcm.googleapis.com','updates.push.services.mozilla.com','push.apple.com','wns.windows.com','notify.windows.com'].some(h=>host===h||host.endsWith('.'+h)),'不支援的通知服務地址');
   let old=await env.DB.prepare('SELECT id,employee_id,enabled FROM push_subscriptions WHERE endpoint=?').bind(endpoint).first();
   if(old&&old.employee_id!==employee.id)return json({error:'此訂閱綁定其他帳號，請重新建立本機訂閱',rebind:true},409);
   if(!old&&input.previousDeviceId)old=await env.DB.prepare('SELECT id,employee_id,enabled FROM push_subscriptions WHERE id=? AND employee_id=?').bind(String(input.previousDeviceId),employee.id).first();
   const id=old?.id||crypto.randomUUID();
   await env.DB.prepare(`INSERT INTO push_subscriptions(id,employee_id,endpoint,p256dh,auth,device_label,user_agent,enabled,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?,?,1,?,?,?) ON CONFLICT(id) DO UPDATE SET endpoint=excluded.endpoint,p256dh=excluded.p256dh,auth=excluded.auth,device_label=excluded.device_label,user_agent=excluded.user_agent,updated_at=excluded.updated_at,last_seen_at=excluded.last_seen_at`).bind(id,employee.id,endpoint,p256dh,auth,String(input.deviceLabel||'').slice(0,120),String(request.headers.get('user-agent')||'').slice(0,500),now,now,now).run();
   const person=await env.DB.prepare('SELECT enabled FROM notification_people WHERE employee_id=?').bind(employee.id).first();return json({saved:true,id,enabled:old?.enabled!==0&&person?.enabled!==0});
  }
  if(['PATCH','DELETE'].includes(request.method)){
   check(typeof input.id==='string'&&input.id,'缺少裝置編號');
   if(request.method==='PATCH')check(typeof input.enabled==='boolean'||typeof input.deviceLabel==='string','裝置設定格式不正確');
   const old=await env.DB.prepare('SELECT id,employee_id FROM push_subscriptions WHERE id=?').bind(input.id).first();if(!old||!admin&&old.employee_id!==employee.id)return json({error:'找不到通知裝置'},404);
   if(!admin&&request.method==='PATCH'&&input.enabled)return json({error:'此裝置已停用，請通知管理者恢復'},403);
   const statement=request.method==='PATCH'?(typeof input.deviceLabel==='string'?env.DB.prepare('UPDATE push_subscriptions SET device_label=?,updated_at=? WHERE id=?').bind(String(input.deviceLabel).trim().slice(0,120)||'未命名裝置',now,input.id):env.DB.prepare('UPDATE push_subscriptions SET enabled=?,updated_at=? WHERE id=?').bind(input.enabled?1:0,now,input.id)):env.DB.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(input.id);
   const result=await statement.run();return result.meta?.changes===1?json({saved:true,deleted:request.method==='DELETE'}):json({error:'裝置已變更，請重新載入'},409);
  }
  return json({error:'不支援的操作'},405);
 }catch(e){return json({error:e.message||'通知設定失敗'},400);}
}
export async function notificationLogApi85(request,env){
 const employee=await employeeFor(request,env);if(!employee||!permitted(employee,'admin.settings'))return json({error:'沒有通知管理權限'},403);
 if(request.method==='POST'){
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
  try{const input=await boundedJSON(request,4096),ruleId=String(input.ruleId||''),ids=[...new Set((input.employeeIds||[]).map(Number).filter(Number.isSafeInteger))];check(ruleId&&ids.length&&ids.length<=100,'請選擇要補發的人員');const state=JSON.parse((await companyRow(env)).body),rule=(state.notificationRules||[]).find(item=>item.id===ruleId&&item.enabled);check(rule,'找不到已啟用的通知規則');check(!['material','holiday','closure'].includes(rule.type),'此類通知請使用測試預覽確認，不提供舊通知補發');const now=Date.now(),day=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),entries=await env.DB.prepare("SELECT * FROM schedule_entries WHERE kind='daily' AND day<=? AND end_day>=?").bind(day,day).all(),reports=await env.DB.prepare('SELECT entry_id,author_id FROM schedule_reports WHERE day=?').bind(day).all(),people=await env.DB.prepare("SELECT e.id,e.name,e.role,COALESCE(n.enabled,1) AS enabled FROM employees e LEFT JOIN notification_people n ON n.employee_id=e.id WHERE e.status='active'").all(),wanted=new Set(ids.map(String)),plans=notificationPlan85([rule],state,entries.results,reports.results,people.results,now).filter(plan=>wanted.has(String(plan.employeeId))),budget={remaining:32},results=[];check(plans.length,'選擇的人員目前沒有符合這條規則的內容');for(const plan of plans)results.push(await notificationDispatch88(env,plan.employeeId,{...plan,sourceKey:'manual-catchup:'+rule.id+':'+plan.employeeId+':'+day+':'+crypto.randomUUID()},budget));return json({sent:results.reduce((n,x)=>n+x.sent,0),failed:results.reduce((n,x)=>n+x.failed,0),deferred:results.reduce((n,x)=>n+x.deferred,0),people:plans.length})}catch(error){console.error('手動補發通知失敗',error?.message||String(error));return json({error:'補發通知失敗，請稍後再試；本次失敗不會占用通知額度。'},400)}
 }
 if(request.method==='GET'&&new URL(request.url).searchParams.get('export')==='1')return notificationExportApi92(request,env);
 if(request.method==='GET'){
  const query=new URL(request.url).searchParams,page=Math.max(1,Number(query.get('page'))||1),limit=Math.min(1000,Math.max(100,Number(query.get('limit'))||1000)),offset=(page-1)*limit;
  const rows=await env.DB.prepare('SELECT d.id,d.employee_id,d.subscription_id,d.notification_type,d.category,d.title,d.message,d.target_url,d.status,d.dedupe_key,d.retry_count,d.created_at,d.sent_at,d.error_message,e.name AS employee_name,s.device_label,s.user_agent FROM notification_deliveries d LEFT JOIN employees e ON e.id=d.employee_id LEFT JOIN push_subscriptions s ON s.id=d.subscription_id ORDER BY d.created_at DESC LIMIT ? OFFSET ?').bind(limit,offset).all(),groups=new Map();
  for(const row of rows.results||[]){const suffix=row.subscription_id?':'+row.subscription_id:'',key=suffix&&row.dedupe_key.endsWith(suffix)?row.dedupe_key.slice(0,-suffix.length):row.dedupe_key;let group=groups.get(key);if(!group){group={id:key,notification_type:row.notification_type,category:notificationCategory88(row.notification_type,row.category),title:row.title,message:row.message,target_url:row.target_url,employee_id:row.employee_id,employee_name:row.employee_name,created_at:row.created_at,devices:[]};groups.set(key,group)}group.devices.push({id:row.id,subscriptionId:row.subscription_id,deviceLabel:row.device_label||'已移除／未命名裝置',userAgent:row.user_agent||'',status:row.status,sentAt:row.sent_at,error:row.error_message,retryCount:Number(row.retry_count||0)});}
  const items=[...groups.values()].filter(group=>group.notification_type!=='test').map(group=>{const sent=group.devices.filter(x=>x.status==='sent').length,failed=group.devices.filter(x=>x.status==='failed').length,pending=group.devices.length-sent-failed;return{...group,sent,failed,pending,status:failed?(sent?'partial':'failed'):pending?'pending':'sent'}});
  const audits=await env.DB.prepare('SELECT * FROM notification_test_audit92 ORDER BY created_at DESC LIMIT 100').all(),quota=await notificationQuota921(env);return json({items,page,hasMore:(rows.results||[]).length===limit,quota,testAudits:(audits.results||[]).map(row=>({...row,source_page:notificationSourceName921(row.source_page),results:(()=>{try{return JSON.parse(row.results_json||'[]')}catch{return[]}})()}))});
 }
 if(request.method!=='DELETE')return json({error:'不支援的操作'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
 try{
  const input=await boundedJSON(request,4096);let statement;
  if(typeof input.id==='string'&&input.id){check(input.id.length<=100,'通知紀錄編號不正確');statement=env.DB.prepare('DELETE FROM notification_deliveries WHERE id=?').bind(input.id);}
  else if(input.scope==='failed')statement=env.DB.prepare("DELETE FROM notification_deliveries WHERE status='failed'");
  else if(input.scope==='all')statement=env.DB.prepare('DELETE FROM notification_deliveries');
  else return json({error:'請選擇要刪除的通知紀錄'},400);
  const result=await statement.run(),deleted=Number(result.meta?.changes)||0;
  if(input.id&&!deleted)return json({error:'通知紀錄已不存在，請重新載入'},404);
  return json({deleted});
 }catch(error){return json({error:error.message||'通知紀錄刪除失敗'},400);}
}
export async function notificationExportApi92(request,env){
 const employee=await employeeFor(request,env);if(!employee||!permitted(employee,'admin.settings'))return json({error:'沒有通知匯出權限'},403);
 if(request.method!=='GET')return json({error:'不支援的操作'},405);
 const query=new URL(request.url).searchParams,from=query.get('from')||'',to=query.get('to')||'',valid=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d};
 if(!valid(from)||!valid(to)||to<from||Date.parse(to)-Date.parse(from)>366*86400000)return json({error:'請選擇一年內的正確日期範圍'},400);
 const start=new Date(from+'T00:00:00+08:00').toISOString(),end=new Date(to+'T23:59:59.999+08:00').toISOString();
 const rows=await env.DB.prepare("SELECT d.id,d.employee_id,d.subscription_id,d.notification_type,d.category,d.title,d.message,d.target_url,d.status,d.dedupe_key,d.retry_count,d.created_at,d.sent_at,d.error_message,e.name AS employee_name,s.device_label,s.user_agent FROM notification_deliveries d LEFT JOIN employees e ON e.id=d.employee_id LEFT JOIN push_subscriptions s ON s.id=d.subscription_id WHERE d.created_at BETWEEN ? AND ? ORDER BY d.created_at,d.employee_id,d.dedupe_key").bind(start,end).all();
 const audits=await env.DB.prepare("SELECT * FROM notification_test_audit92 WHERE created_at BETWEEN ? AND ? ORDER BY created_at").bind(start,end).all();
 return json({from,to,items:(rows.results||[]).filter(row=>row.notification_type!=='test').map(row=>({...row,category:notificationCategory88(row.notification_type,row.category),deviceLabel:row.device_label||'已移除／未命名裝置',userAgent:row.user_agent||''})),testAudits:(audits.results||[]).map(row=>({...row,source_page:notificationSourceName921(row.source_page),results:(()=>{try{return JSON.parse(row.results_json||'[]')}catch{return[]}})()}))});
}
function dateAdd90(day,amount){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10)}
function template90(value,values){let output=String(value||'');for(const [key,replacement]of Object.entries(values))output=output.replaceAll('{'+key+'}',String(replacement??''));return output}
function entryPeople90(entry){try{return JSON.parse(entry.assignee_ids||'[]').map(String)}catch{return[]}}
function entryContent90(entry){try{const value=JSON.parse(entry.category||'[]');return Array.isArray(value)?value.join('、'):String(value||'')}catch{return String(entry.category||'')}}
async function holidayPreview90(day){for(const year of [...new Set([Number(day.slice(0,4)),Number(day.slice(0,4))+1])])try{const data=await governmentHolidayData60(year);for(const date of Object.keys(data.dates||{}).sort())if(date>=day&&namedGovernmentHoliday60(data.dates[date]))return{date,name:data.dates[date].name}}catch{}return null}
async function previewValues90(type,employee,env){
 const day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),base={人員:employee.name,日期:day,通知名稱:'提醒'};
 if(type==='work'||type==='report'){
  const entries=await env.DB.prepare("SELECT * FROM schedule_entries WHERE kind='daily' AND day<=? AND end_day>=? ORDER BY created_at,id").bind(day,day).all(),reports=type==='report'?await env.DB.prepare('SELECT entry_id FROM schedule_reports WHERE day=? AND author_id=?').bind(day,String(employee.id)).all():{results:[]},done=new Set((reports.results||[]).map(x=>x.entry_id));
  const own=(entries.results||[]).filter(e=>entryPeople90(e).includes(String(employee.id))&&(type!=='report'||!done.has(e.id))),list=own.map(e=>e.title+(entryContent90(e)?'（'+entryContent90(e)+'）':''));if(!own.length)return{available:false,note:employee.name+(type==='report'?'今日沒有待回報工作。':'今日沒有安排工作，無法產生實際工作預覽。'),values:base,targetDate:day};
  return{available:true,note:'預覽使用 '+employee.name+' 今日的實際'+(type==='report'?'待回報':'排程')+'資料。',values:{...base,數量:own.length,工作清單:list.join('、'),工作名稱:own.map(e=>e.title).join('、'),工作內容:own.map(entryContent90).filter(Boolean).join('、')},targetDate:day};
 }
 if(type==='material'){const row=await env.DB.prepare("SELECT * FROM schedule_entries WHERE kind='material' ORDER BY created_at DESC LIMIT 1").first();if(!row)return{available:false,note:'目前沒有可預覽的料件資料。',values:base,targetDate:day};return{available:true,note:'預覽使用最近一筆料件資料。',values:{...base,案件名稱:row.project_name||'',料件名稱:row.title,類型:row.category,登記人:row.author_name||employee.name},targetDate:row.day};}
 const state=JSON.parse((await companyRow(env)).body);
 if(type==='wire'){const reel=(state.wireReels||[]).find(x=>['low','ordered'].includes(x.status));if(!reel)return{available:false,note:'目前沒有可預覽的待補線材。',values:base,targetDate:day};return{available:true,note:'預覽使用目前待補線材。',values:{...base,數量:1,線材名稱:(state.wireTypes||[]).find(x=>x.id===reel.wireId)?.name||'',逾期天數:Math.max(0,Math.floor((Date.parse(day)-Date.parse(String(reel.restock?.reported?.time||day).slice(0,10)))/86400000))},targetDate:day};}
 if(type==='plating'){const project=(state.platingProjects||[]).find(p=>!p.archived&&(p.shipments||[]).some(s=>s.sent&&!s.returned)),shipment=project?.shipments?.find(s=>s.sent&&!s.returned);if(!shipment)return{available:false,note:'目前沒有可預覽的待回貨電鍍資料。',values:base,targetDate:day};return{available:true,note:'預覽使用目前待回貨電鍍資料。',values:{...base,數量:1,案件名稱:project.name,電鍍內容:shipment.note||('第'+shipment.number+'次送鍍'),逾期天數:Math.max(0,Math.floor((Date.parse(day)-Date.parse(shipment.sent))/86400000))},targetDate:day};}
 if(type==='holiday'){const next=await holidayPreview90(day);if(!next)return{available:false,note:'目前沒有可預覽的國定假日資料。',values:base,targetDate:day};return{available:true,note:'預覽使用下一個政府日曆國定假日。',values:{...base,假日名稱:next.name,假日日期:next.date},targetDate:next.date};}
 if(type==='closure'){const row=await env.DB.prepare("SELECT * FROM notification_source_state90 WHERE source_key=?").bind('closure:高雄市:左營區').first();if(!row||row.status==='unknown'||!closureDateActive901({effectiveDate:row.effective_date},day))return{available:false,note:'目前沒有高雄市左營區今日或明日的停班公告。',values:base,targetDate:day};let detail={};try{detail=JSON.parse(row.detail||'{}')}catch{}return{available:true,note:'預覽使用目前有效的官方停班狀態。',values:{...base,縣市:detail.city||'高雄市',行政區:detail.district||'左營區',停班日期:row.effective_date,停班狀態:row.status==='closed'?'停止上班':'恢復上班',公告時間:detail.announcedAt||''},targetDate:row.effective_date||day};}
 return{available:true,note:'預覽使用目前登入人員與今日日期。',values:base,targetDate:day};
}
export async function notificationPreviewApi90(request,env){const employee=await employeeFor(request,env);if(!employee||!permitted(employee,'admin.settings'))return json({error:'沒有通知管理權限'},403);if(request.method!=='GET')return json({error:'不支援的操作'},405);try{return json(await previewValues90(new URL(request.url).searchParams.get('type')||'custom',employee,env))}catch(error){return json({error:error.message||'無法產生實際預覽'},503)}}
export async function notificationSourceStatusApi90(request,env){const employee=await employeeFor(request,env);if(!employee||!permitted(employee,'admin.settings'))return json({error:'沒有通知管理權限'},403);if(request.method!=='GET')return json({error:'不支援的操作'},405);const day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),rows=await env.DB.prepare('SELECT source_key,status,effective_date,detail,checked_at,changed_at FROM notification_source_state90 ORDER BY source_key').all();return json({items:(rows.results||[]).map(row=>row.source_key.startsWith('closure:')&&!closureDateActive901({effectiveDate:row.effective_date},day)?{...row,status:'unknown',effective_date:''}:row)})}
async function ruleRecipients90(env,rule){const rows=await env.DB.prepare("SELECT e.id,e.name,COALESCE(n.enabled,1) AS enabled FROM employees e LEFT JOIN notification_people n ON n.employee_id=e.id WHERE e.status='active'").all(),selected=new Set((rule.recipientIds||[]).map(String));return(rows.results||[]).filter(p=>p.enabled!==0&&(rule.recipientMode!=='selected'||selected.has(String(p.id))))}
async function runHolidayRules90(env,rules,now,budget=null,suppressed=new Map()){
 const clock=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)),parts=Object.fromEntries(clock.map(x=>[x.type,x.value])),day=parts.year+'-'+parts.month+'-'+parts.day,time=parts.hour+':'+parts.minute,tomorrow=dateAdd90(day,1),eligible=rules.filter(x=>x.enabled&&x.type==='holiday'&&time>=x.time);
 if(!eligible.length)return;
 const checkedAt=new Date(now).toISOString(),sourceKey='holiday:government-calendar';let data;
 try{
  data=await governmentHolidayData60(Number(tomorrow.slice(0,4)));
  const holiday=data.dates?.[tomorrow],detail=JSON.stringify({year:Number(tomorrow.slice(0,4)),date:tomorrow,holiday:namedGovernmentHoliday60(holiday)?holiday.name:'',available:true});
  await env.DB.prepare("INSERT INTO notification_source_state90(source_key,status,source_id,effective_date,detail,checked_at,changed_at) VALUES(?,'ready',?,?,?,?,'') ON CONFLICT(source_key) DO UPDATE SET status='ready',source_id=excluded.source_id,effective_date=excluded.effective_date,detail=excluded.detail,checked_at=excluded.checked_at").bind(sourceKey,String(tomorrow.slice(0,4)),tomorrow,detail,checkedAt).run();
 }catch(error){
  await env.DB.prepare("INSERT INTO notification_source_state90(source_key,status,source_id,effective_date,detail,checked_at,changed_at) VALUES(?,'unknown','','',?,?,'') ON CONFLICT(source_key) DO UPDATE SET status='unknown',source_id='',effective_date='',detail=excluded.detail,checked_at=excluded.checked_at").bind(sourceKey,JSON.stringify({error:error?.message||String(error),available:false}),checkedAt).run();
  return;
 }
 const holiday=data.dates?.[tomorrow];if(!namedGovernmentHoliday60(holiday))return;
 for(const rule of eligible)for(const person of await ruleRecipients90(env,rule)){const blocked=suppressed.get(rule.id);if(blocked&&(blocked.has('*')||blocked.has(String(person.id))))continue;const values={人員:person.name,日期:day,通知名稱:rule.name,假日名稱:holiday.name,假日日期:tomorrow};await notificationDispatch88(env,person.id,{ruleId:rule.id,notificationType:'holiday',category:rule.category||'假日提醒',title:template90(rule.title,values),message:template90(rule.message,values),targetUrl:'/?notificationDay='+tomorrow+'#schedule',sourceKey:'holiday:'+rule.id+':'+tomorrow+':'+person.id},budget)}
}
async function cleanupStaleClosure901(env,clock=Date.now()){const day=new Date(clock).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});await env.DB.prepare("DELETE FROM notification_inbox88 WHERE category='停班提醒' AND target_url LIKE '/?notificationDay=%' AND substr(target_url,19,10)<?").bind(day).run();await env.DB.prepare("UPDATE notification_source_state90 SET status='unknown',source_id='',effective_date='',detail=json_set(CASE WHEN json_valid(detail) THEN detail ELSE '{}' END,'$.stale',1),changed_at='' WHERE effective_date<>'' AND effective_date<?").bind(day).run()}
async function runClosureRules90(env,rules,clock=Date.now(),budget=null,suppressed=new Map()){
 const day=new Date(clock).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});
 await env.DB.prepare("DELETE FROM notification_inbox88 WHERE category='停班提醒' AND target_url LIKE '/?notificationDay=%' AND substr(target_url,19,10)<?").bind(day).run();
 const checks=new Map();
 for(const rule of rules.filter(x=>x.enabled&&x.type==='closure')){
  const city=rule.city||'高雄市',district=rule.district||'左營區',key='closure:'+city+':'+district,now=new Date(clock).toISOString();let checkResult=checks.get(key);
  if(!checkResult){const previous=await env.DB.prepare('SELECT * FROM notification_source_state90 WHERE source_key=?').bind(key).first();let result;try{result=await fetchClosureStatus90(city,district)}catch(error){await env.DB.prepare("INSERT INTO notification_source_state90(source_key,status,source_id,effective_date,detail,checked_at,changed_at) VALUES(?, 'unknown','','', ?, ?, '') ON CONFLICT(source_key) DO UPDATE SET status='unknown',source_id='',effective_date='',detail=excluded.detail,checked_at=excluded.checked_at").bind(key,JSON.stringify({city,district,error:error.message||String(error)}),now).run();checks.set(key,{skip:true});continue}if(!closureDateActive901(result,day)){await env.DB.prepare("INSERT INTO notification_source_state90(source_key,status,source_id,effective_date,detail,checked_at,changed_at) VALUES(?, 'unknown','','', ?, ?, '') ON CONFLICT(source_key) DO UPDATE SET status='unknown',source_id='',effective_date='',detail=excluded.detail,checked_at=excluded.checked_at").bind(key,JSON.stringify({...result,city,district,stale:true}),now).run();checks.set(key,{skip:true});continue}const changed=closureStateChanged902(result,previous),detail=JSON.stringify({...result,city,district});await env.DB.prepare("INSERT INTO notification_source_state90(source_key,status,source_id,effective_date,detail,checked_at,changed_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source_key) DO UPDATE SET status=excluded.status,source_id=excluded.source_id,effective_date=excluded.effective_date,detail=excluded.detail,checked_at=excluded.checked_at,changed_at=CASE WHEN excluded.status<>notification_source_state90.status OR excluded.source_id<>notification_source_state90.source_id OR excluded.effective_date<>notification_source_state90.effective_date THEN excluded.changed_at ELSE notification_source_state90.changed_at END").bind(key,result.status,result.sourceId,result.effectiveDate,detail,now,changed?now:(previous?.changed_at||'')).run();checkResult={result,changed,previous};checks.set(key,checkResult)}
  if(checkResult.skip)continue;const {result,changed,previous}=checkResult;
  if(!changed||result.status==='unknown'||result.status==='open'&&previous?.status!=='closed')continue;
  for(const person of await ruleRecipients90(env,rule)){const blocked=suppressed.get(rule.id);if(blocked&&(blocked.has('*')||blocked.has(String(person.id))))continue;const values={人員:person.name,日期:result.effectiveDate,通知名稱:rule.name,縣市:city,行政區:district,停班日期:result.effectiveDate,停班狀態:result.status==='closed'?'停止上班':'恢復上班',公告時間:result.announcedAt||''};await notificationDispatch88(env,person.id,{ruleId:rule.id,notificationType:'closure',category:rule.category||'停班提醒',title:template90(rule.title,values),message:template90(rule.message,values),targetUrl:'/?notificationDay='+encodeURIComponent(result.effectiveDate)+'#schedule',sourceKey:'closure:'+rule.id+':'+result.effectiveDate+':'+result.sourceId+':'+result.status+':'+person.id},budget)}
 }
}
async function notificationRuleSuppressions921(env,rules,now){
 const {day,time}=notificationClock85(now),result=new Map(),stamp=new Date(now).toISOString();
 for(const rule of rules){const recipients=(rule.recipientIds||[]).map(String).sort(),fingerprint=JSON.stringify({enabled:rule.enabled,type:rule.type,time:rule.time,firstDays:rule.firstDays,repeatDays:rule.repeatDays,target:rule.target,startDate:rule.startDate||'',city:rule.city||'',district:rule.district||'',materialCategories:rule.materialCategories||[]}),old=await env.DB.prepare('SELECT * FROM notification_rule_state921 WHERE rule_id=?').bind(rule.id).first();let suppressDay=old?.suppress_day||'',suppressed=[];try{suppressed=JSON.parse(old?.suppressed_ids||'[]')}catch{}
  if(old){let previous=[];try{previous=JSON.parse(old.recipient_ids||'[]')}catch{}const added=recipients.filter(id=>!previous.includes(id));if(day!==suppressDay)suppressed=[];if(time>=rule.time){
    if(old.fingerprint!==fingerprint){
     const changedAt=Date.parse(rule.updatedAt||'');const changed=Number.isFinite(changedAt)?notificationClock85(changedAt):null;
     // A rule saved before today's send time must still run today. Only changes
     // made after the send time are suppressed to prevent surprise backfills.
     suppressed=changed&&changed.day===day&&changed.time>=rule.time?['*']:[];
    }else suppressed=[...new Set([...suppressed,...added])];
    if(suppressed.length)suppressDay=day;
   }}
  await env.DB.prepare("INSERT INTO notification_rule_state921(rule_id,fingerprint,recipient_ids,suppress_day,suppressed_ids,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(rule_id) DO UPDATE SET fingerprint=excluded.fingerprint,recipient_ids=excluded.recipient_ids,suppress_day=excluded.suppress_day,suppressed_ids=excluded.suppressed_ids,updated_at=excluded.updated_at").bind(rule.id,fingerprint,JSON.stringify(recipients),suppressDay,JSON.stringify(suppressed),stamp).run();
  if(suppressDay===day&&suppressed.length)result.set(rule.id,new Set(suppressed));
 }
 return result;
}
async function notificationInitialRecipients921(env,rules,plans,now){
 const {day,time}=notificationClock85(now),allowed=new Map();
 for(const rule of rules.filter(item=>item.enabled&&time>=item.time&&!['material','holiday','closure'].includes(item.type))){let row=await env.DB.prepare('SELECT eligible_ids FROM notification_rule_run921 WHERE rule_id=? AND day=?').bind(rule.id,day).first();if(!row){const ids=[...new Set(plans.filter(plan=>plan.ruleId===rule.id).map(plan=>String(plan.employeeId)))];await env.DB.prepare('INSERT OR IGNORE INTO notification_rule_run921(rule_id,day,eligible_ids,checked_at) VALUES(?,?,?,?)').bind(rule.id,day,JSON.stringify(ids),new Date(now).toISOString()).run();row={eligible_ids:JSON.stringify(ids)}}let ids=[];try{ids=JSON.parse(row.eligible_ids||'[]')}catch{}allowed.set(rule.id,new Set(ids))}
 return allowed;
}
async function retryNotifications921(env,budget){
 const cutoff=new Date(Date.now()-10*60*1000).toISOString(),rows=await env.DB.prepare("SELECT d.*,s.endpoint,s.p256dh,s.auth,s.enabled,s.failure_count FROM notification_deliveries d JOIN push_subscriptions s ON s.id=d.subscription_id WHERE s.enabled=1 AND ((d.status='failed' AND d.retry_count<2) OR (d.status='pending' AND COALESCE(NULLIF(d.last_attempt_at,''),d.created_at)<?)) ORDER BY d.created_at LIMIT 32").bind(cutoff).all();
 for(const row of rows.results||[]){if(budget.remaining<=0)break;if(!await notificationDailyClaim921(env))break;budget.remaining--;await sendPush82(env,row,{employeeId:row.employee_id,ruleId:row.rule_id,notificationType:row.notification_type,category:row.category,title:row.title,message:row.message,targetUrl:row.target_url,dedupeKey:row.dedupe_key})}
}
async function cleanupNotificationHistory921(env,now=Date.now()){
 const clock=typeof now==='number'?now:Date.parse(now),safe=Number.isFinite(clock)?clock:Date.now(),logs=new Date(safe-90*86400000).toISOString(),receipts=new Date(safe-400*86400000).toISOString(),usage=new Date(safe-14*86400000).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});
 await env.DB.batch([env.DB.prepare('DELETE FROM notification_deliveries WHERE created_at<?').bind(logs),env.DB.prepare('DELETE FROM notification_test_audit92 WHERE created_at<?').bind(logs),env.DB.prepare('DELETE FROM notification_receipts921 WHERE updated_at<?').bind(receipts),env.DB.prepare('DELETE FROM notification_daily_usage921 WHERE day<?').bind(usage),env.DB.prepare('DELETE FROM notification_rule_run921 WHERE day<?').bind(usage)]);
}
export async function runNotifications85(env,now=Date.now()){
 await cleanupNotificationHistory921(env,now);
 const state=JSON.parse((await companyRow(env)).body),rules=state.notificationRules||[];if(!rules.some(r=>r.enabled))return{checked:true,planned:0,eligible:0,remainingBudget:32};
 notificationRulesValid85(rules);
 const day=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});
 const entries=await env.DB.prepare("SELECT * FROM schedule_entries WHERE kind='daily' AND day<=? AND end_day>=?").bind(day,day).all(),reports=await env.DB.prepare('SELECT entry_id,author_id FROM schedule_reports WHERE day=?').bind(day).all();
 const people=await env.DB.prepare("SELECT e.id,e.name,e.role,COALESCE(n.enabled,1) AS enabled FROM employees e LEFT JOIN notification_people n ON n.employee_id=e.id WHERE e.status='active'").all();
 for(const person of people.results){await employeePermissions(env,person);const cap=rule=>rule.type==='work'||rule.type==='report'?'schedule.view':rule.type==='custom'?'':rule.type+'.view';person.notificationCaps85=Object.fromEntries(rules.map(r=>[r.id,!cap(r)||permitted(person,cap(r))]));}
 const budget={remaining:32};await retryNotifications921(env,budget);const suppressed=await notificationRuleSuppressions921(env,rules,now),plans=notificationPlan85(rules,state,entries.results,reports.results,people.results,now),initialRecipients=await notificationInitialRecipients921(env,rules,plans,now);
 const dispatchable=plans.filter(plan=>{if(!people.results.find(p=>p.id===plan.employeeId)?.notificationCaps85[plan.ruleId])return false;const initial=initialRecipients.get(plan.ruleId);if(initial&&!initial.has(String(plan.employeeId)))return false;const blocked=suppressed.get(plan.ruleId);return!(blocked&&(blocked.has('*')||blocked.has(String(plan.employeeId))))}),groups=new Map();
 for(const plan of dispatchable){const key=['wire','plating'].includes(plan.notificationType)?plan.ruleId+':'+plan.employeeId+':'+plan.notificationType:plan.dedupeKey;groups.set(key,[...(groups.get(key)||[]),plan])}
 for(const group of groups.values()){const plan=group[0];try{await notificationDispatchBatch93(env,plan.employeeId,group,budget)}catch(error){console.error('單筆通知失敗',plan.notificationType,plan.employeeId,error?.message||String(error))}}
 try{await runHolidayRules90(env,rules,now,budget,suppressed)}catch(error){console.error('國定假日通知檢查失敗',error?.message||String(error))}
 try{await runClosureRules90(env,rules,now,budget,suppressed)}catch(error){console.error('停班通知檢查失敗',error?.message||String(error))}
 return{checked:true,planned:plans.length,eligible:dispatchable.length,remainingBudget:budget.remaining};
}
export async function notificationCheckApi94(request,env){
 const employee=await employeeFor(request,env);if(!employee||!permitted(employee,'admin.settings'))return json({error:'沒有通知管理權限'},403);
 if(request.method==='POST'){
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
  try{return json(await runNotifications85(env,Date.now())||{checked:true,planned:0,eligible:0})}catch(error){console.error('手動檢查通知失敗',error?.message||String(error));return json({error:'通知檢查失敗，請稍後再試'},503)}
 }
 if(request.method!=='GET')return json({error:'不支援的操作'},405);
 try{
  const state=JSON.parse((await companyRow(env)).body),rules=state.notificationRules||[],clock=notificationClock85(),start=new Date(clock.day+'T00:00:00+08:00').toISOString(),rows=await env.DB.prepare("SELECT rule_id,SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) sent FROM notification_deliveries WHERE created_at>=? GROUP BY rule_id").bind(start).all(),sent=new Map((rows.results||[]).map(row=>[String(row.rule_id),Number(row.sent||0)])),states=await env.DB.prepare('SELECT rule_id,suppress_day,suppressed_ids FROM notification_rule_state921').all(),suppressed=new Map((states.results||[]).map(row=>[String(row.rule_id),row]));
  return json({items:rules.map(rule=>{const delivered=sent.get(String(rule.id))||0,row=suppressed.get(String(rule.id));let blocked=[];try{blocked=JSON.parse(row?.suppressed_ids||'[]')}catch{}const skipped=row?.suppress_day===clock.day&&blocked.includes('*');return{id:rule.id,status:!rule.enabled?'disabled':delivered?'sent':skipped?'skipped':clock.time<rule.time?'scheduled':'waiting',sent:delivered,time:rule.time};})});
 }catch(error){return json({error:'無法讀取今日通知狀態'},503)}
}
async function materialNotification88(env,employee,form){
 try{
  const state=JSON.parse((await companyRow(env)).body),configured=(state.notificationRules||[]).filter(r=>r.enabled&&r.type==='material'&&(!r.materialCategories?.length||r.materialCategories.includes(String(form.get('category')||''))));
  const rules=configured;if(!rules.length)return;
  const category=String(form.get('category')||''),projectName=String(form.get('projectName')||'').trim(),title=String(form.get('title')||'').trim(),id=String(form.get('id')||''),day=String(form.get('day')||'');
  const active=await env.DB.prepare("SELECT e.id,e.name,e.role,COALESCE(n.enabled,1) AS enabled FROM employees e LEFT JOIN notification_people n ON n.employee_id=e.id WHERE e.status='active'").all();
  for(const rule of rules){const chosen=new Set((rule.recipientIds||[]).map(String)),targets=(active.results||[]).filter(p=>p.enabled!==0&&(rule.recipientMode==='selected'?chosen.has(String(p.id)):['supervisor','warehouse'].includes(p.role))&&(!(rule.excludeActor!==false)||Number(p.id)!==Number(employee.id)));
   for(const person of targets){const replace=value=>String(value||'').replaceAll('{人員}',person.name).replaceAll('{數量}','1').replaceAll('{日期}',day).replaceAll('{通知名稱}',rule.name||'').replaceAll('{類型}',category).replaceAll('{案件名稱}',projectName).replaceAll('{料件名稱}',title).replaceAll('{登記人}',employee.name);await notificationDispatch88(env,person.id,{ruleId:rule.id,notificationType:'material',category:rule.category||'料件紀錄',title:replace(rule.title||'{類型}紀錄通知'),message:replace(rule.message||'{登記人}新增了 {案件名稱}的{類型}紀錄。'),targetUrl:'/?notificationDay='+encodeURIComponent(day)+'&notificationSection=materials&notificationMaterial='+encodeURIComponent(id)+'#schedule',sourceKey:'material:'+rule.id+':'+id+':'+person.id});}
  }
 }catch(error){console.error('料件即時通知失敗',error?.message||String(error));}
}
async function scheduleMaterialUploadWithNotification88(request,env,employee){
 const copy=request.clone(),response=await scheduleMaterialUpload(request,env,employee);if(response.ok)try{const form=await copy.formData();if(Number(form.get('revision'))===0)await materialNotification88(env,employee,form);}catch(error){console.error('料件通知資料讀取失敗',error?.message||String(error));}return response;
}
export async function employeeOrder85(request,env){
 const employee=await employeeFor(request,env);if(!employee||!['admin.settings','admin.employees','schedule.people'].some(cap=>permitted(employee,cap)))return json({error:'沒有調整人員排序的權限'},403);
 const rows=await env.DB.prepare('SELECT e.id,e.name,e.status FROM employees e LEFT JOIN app_employee_settings x ON x.employee_id=e.id ORDER BY COALESCE(x.position,0),e.id').all();
 if(request.method==='GET')return json({items:rows.results});
 if(request.method!=='POST')return json({error:'不支援的操作'},405);if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
 try{const input=await boundedJSON(request,20000),ids=input.order;check(Array.isArray(ids)&&ids.length===rows.results.length&&new Set(ids).size===ids.length&&rows.results.every(p=>ids.includes(p.id)),'名單已變更，請重新開啟排序');await env.DB.batch(ids.map((id,i)=>env.DB.prepare("INSERT INTO app_employee_settings(employee_id,position) VALUES(?,?) ON CONFLICT(employee_id) DO UPDATE SET position=excluded.position").bind(id,i)));return json({saved:true});}catch(e){return json({error:e.message},400);}
}
export async function accessApi(request,env){
 if(request.method!=='GET')return json({error:'不支援的操作'},405);
 if(!hasCredentials(request))return json({error:'請先登入'},401);
 try{const employee=await employeeFor(request,env);if(!employee)return json({error:'帳號未啟用'},403);
 if(new URL(request.url).pathname==='/api/backup-state'){if(!permitted(employee,'admin.export'))return json({error:'沒有匯出權限'},403);const row=await companyRow(env);return json(await backupData85(env,JSON.parse(row.body),joinRecords));}
 if(new URL(request.url).pathname==='/api/export-access')return permitted(employee,'admin.export')?json({allowed:true}):json({error:'只有主管可以匯出'},403);
 if(new URL(request.url).searchParams.get('notification')==='1'&&!permitted(employee,'admin.settings'))return json({error:'沒有通知管理權限'},403);
 const result=await env.DB.prepare('SELECT e.id,e.name,e.status FROM employees e LEFT JOIN app_employee_settings x ON x.employee_id=e.id ORDER BY COALESCE(x.position,0),e.id').all();return json({items:new URL(request.url).searchParams.get('notification')==='1'?result.results:(result.results||[]).map(p=>({id:p.id,name:p.name}))});
 }catch(e){return json({error:'無法讀取人員或權限，請重試'},503);}
}
export default {async scheduled(event,env,ctx){ctx.waitUntil(Promise.allSettled([cleanupDeleted(env),cleanupNotificationInbox89(env,event.scheduledTime||Date.now()),runNotifications85(env,event.scheduledTime||Date.now())]).then(results=>{for(const [index,result]of results.entries())if(result.status==='rejected')console.error(index===0?'照片清理失敗':index===1?'通知中心清理失敗':'通知排程失敗',result.reason?.message||String(result.reason));}));},async fetch(request,env){const path=new URL(request.url).pathname;if(path==='/api/notification-check94')return notificationCheckApi94(request,env);if(path==='/api/employee-order')return employeeOrder85(request,env);if(path==='/api/backup-photos'){if(request.method!=='GET')return json({error:'不支援的操作'},405);const e=await employeeFor(request,env);if(!e||!permitted(e,'admin.export'))return json({error:'沒有備份權限'},403);return backupPhotos85(request,env);}if(path==='/api/switch-accounts'){const e=await employeeFor(request,env);if(!e)return json({error:'請先登入'},401);if(request.method!=='GET')return json({error:'不支援的操作'},405);const rows=await env.DB.prepare("SELECT name,email FROM employees WHERE status='active' ORDER BY name,id").all();return json({items:rows.results});}if(path==='/api/schedule-material-photo'||path==='/api/schedule-material-upload'){const e=await employeeFor(request,env);if(!e)return json({error:'請先登入'},401);return path==='/api/schedule-material-photo'?scheduleMaterialPhotoApi(request,env,e):scheduleMaterialUploadWithNotification88(request,env,e)}if(path==='/api/schedule-holidays')return holidayApi60(request,env);if(path==='/api/notification-preview90')return notificationPreviewApi90(request,env);if(path==='/api/notification-source-status90')return notificationSourceStatusApi90(request,env);if(path==='/api/records-export'){const e=await employeeFor(request,env);if(!e)return json({error:'請先登入'},401);return recordsExportApi(request,env,e,async database=>JSON.parse((await companyRow(database)).body),scopeKey)}if(path==='/api/schedule'||path==='/api/schedule-photo'||path==='/api/schedule-photo-upload'){const e=await employeeFor(request,env);if(!e)return json({error:'請先登入'},401);if(path==='/api/schedule')return scheduleApi(request,env,e);if(path==='/api/schedule-photo')return schedulePhotoApi(request,env,e);return schedulePhotoUpload(request,env,e);}if(path==='/manifest.webmanifest')return appManifest55(request,env);if(path==='/'||path==='/index.html')return appIndex55(request,env);if(path==='/api/app-icon-settings')return appIconSettings55(request,env);if(path==='/api/app-icon-source')return appIconSource55(request,env);if(path==='/api/appearance')return publicAppearance(request,env);if(path==='/api/app-icon')return appIcon52(request,env);if(path==='/api/login-logo')return loginLogo(request,env);if(path==='/api/auth/config')return json({url:env.SUPABASE_URL,publishableKey:env.SUPABASE_PUBLISHABLE_KEY});if(path==='/api/backup-state'||path==='/api/employee-options'||path==='/api/export-access')return accessApi(request,env);if(path==='/api/wire-photos')return wireImages(request,env);if(path==='/api/permissions')return permissionsApi(request,env);if(path==='/api/notification-inbox')return notificationInboxApi88(request,env);if(path==='/api/notification-logs')return notificationLogApi85(request,env);if(path==='/api/push-test')return pushTestApi82(request,env);if(path==='/api/push-public-key')return pushPublicKeyApi82(request,env);if(path==='/api/push-subscription')
 return pushSubscriptionApi82(request,env);if(path==='/api/state')return api(request,env);if(path==='/api/employees')return employeesApi(request,env);if(path==='/api/logo'||path==='/api/receipts'||path==='/api/plating-photos')return images(request,env);return new Response('Not found',{status:404});}};

export function singleLogRemovalAllowed(before,after,e){
 if(!permitted(e,'admin.auditDelete'))return false;
 const old=before.logs||[],next=after.logs||[];
 if(old.length!==next.length+1)return false;
 const ids=new Set(next.map(x=>x.id));
 if(stableJSON(old.filter(x=>ids.has(x.id)))!==stableJSON(next))return false;
 const a={...before},b={...after};delete a.logs;delete b.logs;
 return stableJSON(a)===stableJSON(b);
}
export function stateChangeAllowed(before,after,e){
 if(permitted(e,'admin.import')&&importAppend75(before,after))return true;
 if(!projectDeletionAllowed(before,after,e)||!granularState75(before,after,e))return false;
 if(singleLogRemovalAllowed(before,after,e))return true;
 if(!wireChangeAllowed(before,after,e)||!workflowChangeAllowed(before,after,e))return false;
 const supervisor=permitted(e,'admin.auditDelete');
 const beforeLogIds=new Set((before.logs||[]).map(x=>x.id)),added=(after.logs||[]).filter(l=>!beforeLogIds.has(l.id));if(!supervisor&&added.some(l=>l.actor!==e.name))return false;
 if(!supervisor&&!logsOnlyAppend(before,after))return false;
 const a=structuredClone(before),b=structuredClone(after);
 if(canDeleteProject(e,'plating'))for(const old of a.platingProjects||[]){const n=(b.platingProjects||[]).find(x=>x.id===old.id);if(n&&!old.archived&&n.archived)for(const k of ['archived','deletedAt','purgeAfter'])old[k]=n[k];}
 if(canDeleteProject(e,'cases'))a.cases=(a.cases||[]).filter(x=>(b.cases||[]).some(n=>n.id===x.id));
 if(canDeleteProject(e,'warehouse')){const removed=(a.projects||[]).filter(x=>!(b.projects||[]).some(n=>n.id===x.id));a.projects=(a.projects||[]).filter(x=>!removed.includes(x));b.deletedProjects=(b.deletedProjects||[]).filter(entry=>!removed.some(x=>stableJSON(x)===stableJSON(entry.project)));a.deletedProjects??=[];}

 for(const [key,cap]of Object.entries({warehouseOptions73:'warehouse.options',platingVendors:'plating.options'}))if(permitted(e,cap)){delete a[key];delete b[key];}
 const stateProjects=new Map((a.projects||[]).map(x=>[x.id,x]));for(const p of b.projects||[]){const prev=stateProjects.get(p.id);if(!prev)continue;const previousParts=new Map((prev.parts||[]).map(x=>[x.id,x]));
  for(const i of p.parts||[]){const old=previousParts.get(i.id);if(!old)continue;
   for(const [field,cap]of Object.entries({receivedDate72:'warehouse.receivedDate',issuedDate72:'warehouse.issuedDate',preparedAdjustment73:'warehouse.preparedAdjust'}))if(permitted(e,cap)){delete old[field];delete i[field];}
  }
  if(permitted(e,'warehouse.stockAdjust')){p.inventory=structuredClone(prev.inventory);for(const i of p.parts||[]){const old=previousParts.get(i.id);if(old&&i.received!==old.received)p.inventory[i.id]=Number(prev.inventory[i.id]||0)+i.received-old.received;}}
  if(permitted(e,'warehouse.historyEdit')&&stableJSON(p.materialLogs)!==stableJSON(prev.materialLogs)){
   p.inventory=structuredClone(prev.inventory);
   const allPreviousParts=new Map([...(prev.parts||[]),...(prev.archivedParts||[]).map(x=>x.part)].map(x=>[x.id,x]));for(const part of [...(p.parts||[]),...(p.archivedParts||[]).map(x=>x.part)]){const old=allPreviousParts.get(part.id);if(old)part.received=old.received;}
   if(prev.materialLogs===undefined)delete p.materialLogs;else p.materialLogs=structuredClone(prev.materialLogs);
  }
 }
 if(permitted(e,'admin.settings'))for(const key of ['appearance','siteText','adminText','wireText','platingText','contentDraft','contentPublished','adminOrder','managementOrder','uiOrder','scheduleText','auditSecurity','adminLayout','appIconSettings','adminSectionOrder','notificationRules','notificationVersion90']){delete a[key];delete b[key];}
 if(permitted(e,'warehouse.purge'))a.deletedProjects=(a.deletedProjects||[]).filter(x=>(b.deletedProjects||[]).some(n=>n.project?.id===x.project?.id)||(b.projects||[]).some(n=>n.id===x.project?.id));
 if(permitted(e,'warehouse.restore')){
  for(const p of b.projects||[])if(!(a.projects||[]).some(x=>x.id===p.id)){const deleted=(a.deletedProjects||[]).find(x=>x.project?.id===p.id);if(deleted&&stableJSON(deleted.project)===stableJSON(p)){a.projects.splice(Math.min(deleted.index??a.projects.length,a.projects.length),0,structuredClone(p));a.deletedProjects=a.deletedProjects.filter(x=>x!==deleted);}}
 }
 for(const [kind,key]of [['plating','platingProjects'],['wire','wireTypes']])if(permitted(e,kind+'.restore'))for(const old of a[key]||[]){const n=(b[key]||[]).find(x=>x.id===old.id);if(n&&old.archived&&!n.archived)for(const k of ['archived','deletedAt','purgeAfter']){delete old[k];delete n[k];}}
 for(const key of ['logs','wireTypes','wireReels','wireCuts']){delete a[key];delete b[key];}
 if(permitted(e,'cases.manage')){delete a.cases;delete b.cases;}
 if(permitted(e,'plating.manage')){delete a.platingProjects;delete b.platingProjects;}
 if(permitted(e,'warehouse.manage')){delete a.projects;delete b.projects;delete a.deletedProjects;delete b.deletedProjects;}
 else if(permitted(e,'warehouse.receive')||permitted(e,'warehouse.issue')){const old={projects:a.projects||[],logs:[]},next={projects:b.projects||[],logs:[]};if(!warehouseChangeAllowed(old,next))return false;delete a.projects;delete b.projects;}
 return stableJSON(a)===stableJSON(b);
}
async function setEmployeeProfile(env,id,profileId){await env.DB.prepare("INSERT INTO app_employee_settings(employee_id,profile_id,position) VALUES (?,?,?) ON CONFLICT(employee_id) DO UPDATE SET profile_id=excluded.profile_id").bind(id,profileId,id).run();}
export async function permissionsApi(request,env){
 try{const e=await employeeFor(request,env);if(!e||!(permitted(e,'admin.employees')||e.role==='supervisor'&&permitted(e,'admin.permissions')))return json({error:'沒有管理權限'},403);
 if(request.method!=='GET'&&(e.role!=='supervisor'||!permitted(e,'admin.permissions')))return json({error:'只有授權主管可以設定權限'},403);
 if(request.method==='GET'){const result=await env.DB.prepare('SELECT * FROM app_permission_profiles ORDER BY name,id').all(),saved=result.results.map(p=>({...p,permissions:JSON.parse(p.permissions)})),items=[...builtinProfiles.map(p=>({...p,...saved.find(x=>x.id===p.id),builtin:true})),...saved.filter(p=>!builtinProfiles.some(b=>b.id===p.id))],ordering=await env.DB.prepare('SELECT profile_id,position FROM app_permission_order ORDER BY position').all(),positions=new Map(ordering.results.map(r=>[r.profile_id,r.position]));items.sort((a,b)=>(positions.get(a.id)??999999)-(positions.get(b.id)??999999));return json({capabilities:capabilityNames,items});}
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
 const input=await boundedJSON(request,65536);
 if(input.profileOrder){const stored=await env.DB.prepare('SELECT id FROM app_permission_profiles').all(),all=[...new Set([...builtinProfiles.map(p=>p.id),...stored.results.map(p=>p.id)])];check(Array.isArray(input.profileOrder)&&input.profileOrder.length===all.length&&new Set(input.profileOrder).size===all.length&&all.every(id=>input.profileOrder.includes(id)),'權限清單已變更，請重新載入');await env.DB.batch(input.profileOrder.map((id,i)=>env.DB.prepare('INSERT INTO app_permission_order(profile_id,position) VALUES (?,?) ON CONFLICT(profile_id) DO UPDATE SET position=excluded.position').bind(id,i)));return json({saved:true});}
 if(input.order){check(Array.isArray(input.order)&&new Set(input.order).size===input.order.length,'員工排序不正確');const all=await env.DB.prepare('SELECT id FROM employees').all();check(all.results.length===input.order.length&&all.results.every(e=>input.order.includes(e.id)),'員工名單已變更，請重新載入');await env.DB.batch(input.order.map((id,i)=>env.DB.prepare("INSERT INTO app_employee_settings(employee_id,position) VALUES (?,?) ON CONFLICT(employee_id) DO UPDATE SET position=excluded.position").bind(id,i)));return json({saved:true});}
 if(request.method==='DELETE'){check(!builtinProfiles.some(p=>p.id===input.id),'內建權限不可刪除');const assigned=await env.DB.prepare('SELECT employee_id FROM app_employee_settings WHERE profile_id=? LIMIT 1').bind(input.id).first();check(!assigned,'此權限仍有員工使用，請先替員工改選其他權限');await env.DB.prepare('DELETE FROM app_permission_profiles WHERE id=?').bind(input.id).run();return json({deleted:true});}
 check(typeof input.name==='string'&&input.name.trim()&&input.name.length<=80,'請填寫權限名稱');check(Array.isArray(input.permissions)&&input.permissions.every(p=>Object.hasOwn(capabilityNames,p)),'權限項目不正確');
  const permissions=[...new Set(input.permissions)];for(const p of permissions)if(!p.endsWith('.view')&&p!=='records.export')check(permissions.includes(p.split('.')[0]+'.view'),'請先勾選該區查看權限');
 const id=input.id||crypto.randomUUID();if(id==='supervisor')check(['admin.view','admin.employees','admin.permissions'].every(k=>permissions.includes(k)),'主管必須保留後台、人員及權限管理，避免鎖住系統');check(builtinProfiles.some(p=>p.id===id)||/^[a-f0-9-]{36}$/.test(id),'權限編號不正確');await env.DB.prepare('INSERT INTO app_permission_profiles(id,name,permissions) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,permissions=excluded.permissions').bind(id,input.name.trim(),JSON.stringify(permissions)).run();return json({id});
 }catch(e){return json({error:e.message||'權限設定失敗'},400);}
}
export async function wireImages(request,env){
 try{const employee=await employeeFor(request,env),url=new URL(request.url);if(!employee||(!permitted(employee,'wire.view')&&!(permitted(employee,'admin.export')&&url.searchParams.get('export')==='1')))return json({error:'沒有查看線材的權限'},403);
 if(url.searchParams.get('export')==='1'&&!permitted(employee,'admin.export'))return json({error:'沒有匯出權限'},403);
 if(!env.UPLOADS)return json({error:'照片儲存尚未就緒'},503);
 const data=await companyRow(env),s=JSON.parse(data.body),reel=(s.wireReels||[]).find(r=>r.id===url.searchParams.get('reel'));
 if(!reel)return json({error:'找不到線捆'},404);
 const id=url.searchParams.get('id');
 if(request.method==='GET'){
  if(!id)return json({items:reel.photos});if(!reel.photos.some(p=>p.id===id))return json({error:'找不到照片'},404);
  const key=await wirePhotoKey(id);const file=(url.searchParams.get('thumb')==='1'?await env.UPLOADS.get('thumbnails/'+key):null)||await env.UPLOADS.get(key);if(!file)return json({error:'找不到照片'},404);
  return new Response(file.body,{headers:{'Content-Type':file.httpMetadata.contentType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }
 if(request.method!=='POST')return json({error:'歷史照片保留，不提供刪除'},405);
 if(request.headers.get('origin')!==url.origin||!permitted(employee,'wire.photos'))return json({error:'沒有上傳權限'},403);
 const {bytes,thumbnail,appIcon}=await readPhotoUpload(request);
 const hex=Array.from(bytes.slice(0,12)).map(x=>x.toString(16).padStart(2,'0')).join(''),type=hex.startsWith('89504e470d0a1a0a')?'image/png':hex.startsWith('ffd8ff')?'image/jpeg':hex.startsWith('52494646')&&hex.slice(16)==='57454250'?'image/webp':null;check(type,'請上傳 JPG、PNG 或 WebP 圖片');
 const photo={id:crypto.randomUUID(),actor:employee.name,actorId:String(employee.id),created:new Date().toISOString(),name:decodeURIComponent(request.headers.get('x-file-name')||'照片').slice(0,200)||'照片'};
 await env.DB.prepare('INSERT INTO wire_pending_uploads(id,created_at) VALUES (?,?)').bind(photo.id,photo.created).run();
 await env.UPLOADS.put(await wirePhotoKey(photo.id),bytes,{httpMetadata:{contentType:type},customMetadata:{...photo,reelId:reel.id}});
 if(thumbnail)await env.UPLOADS.put('thumbnails/'+await wirePhotoKey(photo.id),thumbnail,{httpMetadata:{contentType:'image/jpeg'}});
 // Only abandoned staged uploads expire. Committed photos leave this queue in the same transaction as their record.
 try{const stale=await env.DB.prepare('SELECT id FROM wire_pending_uploads WHERE created_at<? LIMIT 20').bind(new Date(Date.now()-48*60*60*1000).toISOString()).all();for(const item of stale.results){await env.UPLOADS.delete(await wirePhotoKey(item.id));await env.UPLOADS.delete('thumbnails/'+await wirePhotoKey(item.id));await env.DB.prepare('DELETE FROM wire_pending_uploads WHERE id=?').bind(item.id).run();}}catch(err){console.error('pending photo cleanup deferred',err.message);}
 return json(photo,201);
 }catch(e){return json({error:e.message||'照片上傳失敗'},400);}
}

// Both parts are bounded before multipart parsing; legacy clients may still send a raw image.
async function readPhotoUpload(request){
 const reader=request.body?.getReader();if(!reader)throw Error('請選擇圖片');
 const chunks=[];let size=0;const multipart=(request.headers.get('content-type')||'').startsWith('multipart/form-data');
 const pathname=new URL(request.url).pathname,isLogo=pathname==='/api/logo',isAppIcon=pathname==='/api/app-icon';const limit=800*1024+(multipart?110*1024+(isLogo?800*1024:0)+(isAppIcon?1600*1024:0):0);
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Object.assign(Error('照片必須壓縮至 800 KB 以內'),{status:413});}chunks.push(value);}
 const data=new Uint8Array(size);let at=0;for(const c of chunks){data.set(c,at);at+=c.length;}
 if(!multipart)return {bytes:data,thumbnail:null};
 const form=await new Response(data,{headers:{'Content-Type':request.headers.get('content-type')}}).formData();
 const photo=form.get('photo'),thumb=form.get('thumbnail');
 if(!photo||typeof photo.arrayBuffer!=='function'||photo.size>800*1024)throw Object.assign(Error('照片必須壓縮至 800 KB 以內'),{status:413});
 let thumbnail=null;if(thumb){if(typeof thumb.arrayBuffer!=='function'||thumb.size>96*1024)throw Error('縮圖過大');thumbnail=new Uint8Array(await thumb.arrayBuffer());if(thumbnail[0]!==255||thumbnail[1]!==216||thumbnail[2]!==255)throw Error('縮圖格式不正確');}
 let appIcon=null;const icon=isLogo?form.get('appIcon'):null;if(icon){if(typeof icon.arrayBuffer!=='function'||icon.size>800*1024)throw Error('手機圖示過大');appIcon=new Uint8Array(await icon.arrayBuffer());const v=new DataView(appIcon.buffer);if(appIcon.length<24||[137,80,78,71,13,10,26,10].some((n,i)=>appIcon[i]!==n)||v.getUint32(16)!==512||v.getUint32(20)!==512)throw Error('手機圖示格式不正確');}
 let source=null,settings=null;
 if(isAppIcon){
  const original=form.get('source');
  if(!original||typeof original.arrayBuffer!=='function'||original.size>800*1024||!original.size)throw Error('請選擇 800 KB 以內的圖示原圖');
  source=new Uint8Array(await original.arrayBuffer());
  const hex=Array.from(source.slice(0,12)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const type=hex.startsWith('89504e470d0a1a0a')?'image/png':hex.startsWith('ffd8ff')?'image/jpeg':hex.startsWith('52494646')&&hex.slice(16)==='57454250'?'image/webp':null;
  if(!type)throw Error('圖示原圖需為 PNG、JPG 或 WebP');
  const homeName=String(form.get('homeName')||'').trim(),background=String(form.get('background')||''),removeWhite=String(form.get('removeWhite'));
  if(!homeName||Array.from(homeName).length>20||/[\u0000-\u001f\u007f]/.test(homeName))throw Error('主畫面名稱請填寫 1 至 20 個字');
  if(!/^#[0-9a-fA-F]{6}$/.test(background)||!['true','false'].includes(removeWhite))throw Error('手機圖示顏色設定不正確');
  settings={homeName,background:background.toLowerCase(),removeWhite,sourceType:type,customized:'true'};
 }
 return {bytes:new Uint8Array(await photo.arrayBuffer()),thumbnail,appIcon,source,settings};
}

export async function loginLogo(request,env){
 if(request.method!=='GET')return json({error:'不支援的操作'},405);
 const key='images/'+await scopeKey(STORAGE_OWNER)+'/logo';
 const file=await env.UPLOADS?.get('thumbnails/'+key)||await env.UPLOADS?.get(key);
 if(!file)return new Response(null,{status:404});
 return new Response(file.body,{headers:{'Content-Type':file.httpMetadata.contentType,'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
}

// Scheduled recycle-bin retention. DB tombstones and photo cleanup jobs commit atomically.
export async function cleanupDeleted(env,now=Date.now()){
 await ensureRecordStorage(env);
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS retention_photo_jobs (job TEXT PRIMARY KEY NOT NULL)').run();
 for(let attempt=0;attempt<4;attempt++){
  const current=await readRecordStorage(env),next=structuredClone(current.state),jobs=[];
  const root='images/'+await scopeKey(STORAGE_OWNER)+'/';
  const expired=(x)=>{if(!x.purgeAfter||!Number.isFinite(Date.parse(x.purgeAfter))){x.purgeAfter=new Date(now+7*86400000).toISOString();return false;}return Date.parse(x.purgeAfter)<=now;};
  const removedWire=new Set();
  next.wireTypes=(next.wireTypes||[]).filter(x=>{if(!x.archived||!expired(x))return true;removedWire.add(x.id);return false;});
  const removedReels=new Set();
  next.wireReels=(next.wireReels||[]).filter(x=>{if(!removedWire.has(x.wireId))return true;removedReels.add(x.id);for(const photo of x.photos||[])jobs.push({key:'wire-photos/'+photo.id});return false;});
  next.wireCuts=(next.wireCuts||[]).filter(x=>!removedReels.has(x.reelId));
  next.platingProjects=(next.platingProjects||[]).filter(x=>{if(!x.archived||!expired(x))return true;jobs.push({prefix:root+'plating/'+encodeURIComponent(x.id)+'/'});return false;});
  next.deletedProjects=(next.deletedProjects||[]).filter(x=>{if(!expired(x))return true;jobs.push({prefix:root+'receipts/'+encodeURIComponent(x.project.id)+'/'});return false;});
  // Do not introduce absent collections into old installations.
  for(const name of ['wireTypes','wireReels','wireCuts','platingProjects','deletedProjects'])if(!(name in current.state))delete next[name];
  const before=splitState(current.state),after=splitState(next),writes=[];
  for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(stableJSON(before[key])!==stableJSON(after[key]))writes.push({key,body:key in after?JSON.stringify(after[key]):null,revision:(current.versions[key]||0)+1});
  if(!writes.length)break;
  const id=crypto.randomUUID();
  try{await env.DB.batch([
   env.DB.prepare('INSERT INTO state_commits(request_id,signature,revision,result,created_at) VALUES (?,?,CASE WHEN (SELECT revision FROM state_storage_meta WHERE singleton=1)=? THEN ? ELSE NULL END,?,?)').bind(id,'retention',current.revision,current.revision+1,'{}',new Date(now).toISOString()),
   ...recordChunks(writes).map(chunk=>env.DB.prepare(`INSERT INTO state_records(record_key,body,revision) SELECT json_extract(value,'$.key'),json_extract(value,'$.body'),json_extract(value,'$.revision') FROM json_each(?) WHERE 1 ON CONFLICT(record_key) DO UPDATE SET body=excluded.body,revision=excluded.revision`).bind(JSON.stringify(chunk))),
   ...recordChunks(jobs.map(job=>JSON.stringify(job))).map(chunk=>env.DB.prepare('INSERT OR IGNORE INTO retention_photo_jobs(job) SELECT value FROM json_each(?)').bind(JSON.stringify(chunk))),
   env.DB.prepare('UPDATE state_storage_meta SET revision=? WHERE singleton=1').bind(current.revision+1)
  ]);break;}catch(e){const latest=await env.DB.prepare('SELECT revision FROM state_storage_meta WHERE singleton=1').first();if(latest.revision===current.revision||attempt===3)throw e;}
 }
 if(!env.UPLOADS)return;
 const pending=await env.DB.prepare('SELECT job FROM retention_photo_jobs LIMIT 100').all();
 for(const row of pending.results){const job=JSON.parse(row.job);if(job.key)await env.UPLOADS.delete([job.key,'thumbnails/'+job.key]);else{let cursor;do{const result=await env.UPLOADS.list({prefix:job.prefix,limit:500,cursor});if(result.objects.length)await env.UPLOADS.delete(result.objects.flatMap(o=>[o.key,'thumbnails/'+o.key]));cursor=result.truncated?result.cursor:undefined;}while(cursor);}await env.DB.prepare('DELETE FROM retention_photo_jobs WHERE job=?').bind(row.job).run();}
}

export async function publicAppearance(request,env){
 if(request.method!=='GET')return json({error:'不支援的操作'},405);
 try{await ensureRecordStorage(env);const row=await env.DB.prepare('SELECT body FROM state_records WHERE record_key=?').bind(recordKey('root','appearance')).first(),a=row?.body?JSON.parse(row.body):{};
 return json({colors:{global:a.colors?.global||{},login:a.colors?.login||{}},text:{login:a.text?.login||{}},logoWidth:a.logoWidth,logoHeight:a.logoHeight});}catch{return json({});}
}

export async function appIcon52(request,env){
 const key='images/'+await scopeKey(STORAGE_OWNER)+'/logo';
 if(request.method==='POST'){
  if(!hasCredentials(request))return json({error:'請先登入'},401);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'來源驗證失敗'},403);
  try{
   const employee=await employeeFor(request,env);
   if(!employee||!permitted(employee,'admin.settings'))return json({error:'只有主管可設定手機圖示'},403);
   const {bytes,source,settings}=await readPhotoUpload(request);
   if(bytes.length<24||bytes.length>800*1024||[137,80,78,71,13,10,26,10].some((n,i)=>bytes[i]!==n)||new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(16)!==512||new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(20)!==512)return json({error:'手機圖示須為 512×512 PNG'},400);
   await env.UPLOADS.put('app-icons/'+key+'-source',source,{httpMetadata:{contentType:settings.sourceType}});
   await env.UPLOADS.put('app-icons/'+key,bytes,{httpMetadata:{contentType:'image/png'},customMetadata:settings});
   return json({saved:true});
  }catch(e){return json({error:e.message||'手機圖示儲存失敗'},e.status||500);}
 }
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405});
 const file=await env.UPLOADS?.get('app-icons/'+key)||await env.UPLOADS?.get(key);
 if(!file)return new Response(null,{status:404});
 return new Response(request.method==='HEAD'?null:file.body,{headers:{'Content-Type':file.httpMetadata.contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

async function appHomeSettings55(env){
 const defaults={homeName:'擎正管理',background:'#f3e8dc',removeWhite:true,revision:55};
 try{
  const key='images/'+await scopeKey(STORAGE_OWNER)+'/logo',file=await env.UPLOADS?.head('app-icons/'+key);
  const meta=file?.customMetadata||{},uploaded=Date.parse(file?.uploaded||'');
  return{homeName:typeof meta.homeName==='string'&&meta.homeName.trim()?meta.homeName:defaults.homeName,
   background:/^#[0-9a-fA-F]{6}$/.test(meta.background||'')?meta.background:defaults.background,
   removeWhite:meta.removeWhite==='false'?false:true,
   revision:Number.isFinite(uploaded)?uploaded:defaults.revision};
 }catch{return defaults;}
}
export async function appIconSettings55(request,env){
 if(request.method!=='GET')return new Response(null,{status:405});
 return json(await appHomeSettings55(env));
}
export async function appIconSource55(request,env){
 if(request.method!=='GET')return new Response(null,{status:405});
 if(!hasCredentials(request))return new Response(null,{status:401});
 const employee=await employeeFor(request,env);
 if(!employee||!permitted(employee,'admin.settings'))return new Response(null,{status:403});
 const key='images/'+await scopeKey(STORAGE_OWNER)+'/logo';
 const file=await env.UPLOADS?.get('app-icons/'+key+'-source');
 if(!file)return new Response(null,{status:404});
 return new Response(file.body,{headers:{'Content-Type':file.httpMetadata.contentType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
export function appManifestBody55(settings){return{
 id:'/',name:settings.homeName,short_name:settings.homeName,lang:'zh-TW',start_url:'/',scope:'/',display:'standalone',
 background_color:settings.background,theme_color:'#234e3c',icons:[{src:'/api/app-icon?v='+settings.revision,sizes:'512x512',type:'image/png',purpose:'any'}]
};}
export async function appManifest55(request,env){
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405});
 const body=JSON.stringify(appManifestBody55(await appHomeSettings55(env)));
 return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export function appIndexBody55(html,settings){
 // Android install metadata v80 is now part of the canonical build.
 html=html.replace(/<link\b(?=[^>]*\brel=["']icon["'])[^>]*>/i,'<link rel="icon" type="image/png" sizes="512x512" href="/api/app-icon?v='+settings.revision+'">');
 const name=settings.homeName.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 return html.replace('<meta name="apple-mobile-web-app-title" content="擎正管理">','<meta name="apple-mobile-web-app-title" content="'+name+'">')
  .replace('href="/api/app-icon?v=53"','href="/api/app-icon?v='+settings.revision+'"');
}
export async function appIndex55(request,env){
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405});
 const html=appIndexBody55(assets['/index.html'].body,await appHomeSettings55(env));
 return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

export function granularState75(before,after,e){
 const equal=(a,b)=>stableJSON(a)===stableJSON(b);
 for(const [kind,key]of [['cases','cases'],['warehouse','projects'],['plating','platingProjects'],['wire','wireTypes']]){
  for(const p of before[key]||[]){const n=(after[key]||[]).find(x=>x.id===p.id);if(n&&p.archived&&!n.archived&&!permitted(e,kind+'.restore'))return false;}
 }
 const deleted=before.deletedProjects||[];
 if(deleted.some(x=>!(after.deletedProjects||[]).some(n=>n.project?.id===x.project?.id)&&!(after.projects||[]).some(n=>n.id===x.project?.id))&&!permitted(e,'warehouse.purge'))return false;
 for(const p of after.projects||[])if(deleted.some(x=>x.project?.id===p.id)&&!permitted(e,'warehouse.restore'))return false;
 for(const p of after.projects||[]){const old=(before.projects||[]).find(x=>x.id===p.id);if(!old)continue;
  for(const i of p.parts||[]){const prev=old.parts.find(x=>x.id===i.id);if(!prev)continue;
   const received=i.received-prev.received,delta=(p.inventory?.[i.id]||0)-(old.inventory?.[i.id]||0);
   const history=permitted(e,'warehouse.historyEdit')&&!equal(p.materialLogs,old.materialLogs);
   if(received>0&&!history&&!permitted(e,'warehouse.receive'))return false;
   if(received<0&&!history&&!permitted(e,'warehouse.stockAdjust'))return false;
   if(delta!==received&&!history&&!permitted(e,'warehouse.stockAdjust')&&!(delta<received&&permitted(e,'warehouse.issue')))return false;
  }
 }
 return true;
}

function importAppend75(before,after){
 const a=structuredClone(before),b=structuredClone(after);
 for(const key of ['projects','deletedProjects']){const old=a[key]||[],next=b[key]||[];if(next.length<old.length||old.some(x=>!next.some(n=>stableJSON(n)===stableJSON(x))))return false;delete a[key];delete b[key];}
 const old=before.logs||[],next=after.logs||[];if(old.some(x=>!next.some(n=>stableJSON(n)===stableJSON(x))))return false;delete a.logs;delete b.logs;return stableJSON(a)===stableJSON(b);
}
