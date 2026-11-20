const pcbJSON171=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const pcbError171=(message,status=400)=>Object.assign(Error(message),{status});
const pcbCan171=(e,cap)=>e?.permissions?.includes('pcb.'+cap);
const pcbText171=(x,n=160)=>typeof x==='string'&&x.trim()&&x.length<=n;
const pcbId171=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
const pcbInt171=(x,min=0,max=1000000)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const pcbAssert171=(ok,message,status=400)=>{if(!ok)throw pcbError171(message,status)};
async function pcbProject171(env,id){
 const p=await env.DB.prepare('SELECT * FROM pcb_projects171 WHERE id=? AND archived=0').bind(id).first();
 pcbAssert171(p,'找不到案件或案件已封存',404);return p;
}
async function pcbLink171(env,id){const row=await env.DB.prepare('SELECT l.*,i.stock,i.revision AS stock_revision,i.name AS item_name,(SELECT COUNT(*) FROM pcb_links171 src WHERE src.item_id=l.item_id) AS source_count FROM pcb_links171 l JOIN pcb_items171 i ON i.id=l.item_id JOIN pcb_projects171 p ON p.id=l.project_id WHERE l.id=? AND p.archived=0').bind(id).first();pcbAssert171(row,'找不到PCB項目',404);return row;}
export function pcbCapacity171(links){
 if(!links.length||links.some(x=>!pcbInt171(x.per_set,1)))return null;
 const needs=new Map();
 for(const link of links){const item=needs.get(link.item_id)||{stock:link.stock,need:0};item.need+=link.per_set;needs.set(link.item_id,item);}
 return Math.min(...[...needs.values()].map(x=>Math.floor(x.stock/x.need)));
}
async function pcbRead171(env,project,e){
 if(project)await pcbProject171(env,project);
 const [projects,links,fixtures,photos,events]=await Promise.all([
  env.DB.prepare('SELECT * FROM pcb_projects171 WHERE archived=0 ORDER BY created_at,id').all(),
  env.DB.prepare('SELECT l.*,i.name AS item_name,i.stock,i.note AS item_note,i.revision AS stock_revision,(SELECT COUNT(*) FROM pcb_links171 src WHERE src.item_id=l.item_id) AS source_count FROM pcb_links171 l JOIN pcb_items171 i ON i.id=l.item_id JOIN pcb_projects171 p ON p.id=l.project_id WHERE p.archived=0 ORDER BY l.created_at,l.id').all(),
  env.DB.prepare('SELECT f.* FROM pcb_fixtures171 f JOIN pcb_projects171 p ON p.id=f.project_id WHERE p.archived=0 ORDER BY f.created_at,f.id').all(),
  env.DB.prepare("SELECT id,project_id,entity_type,entity_id,file_name,actor_name,created_at FROM pcb_photos171 WHERE deleted_at=''"+(project?" AND (project_id=? OR (entity_type='pcb' AND entity_id IN (SELECT item_id FROM pcb_links171 WHERE project_id=?)))":'')+' ORDER BY created_at,id').bind(...(project?[project,project]:[])).all(),
  e.role==='supervisor'?env.DB.prepare('SELECT * FROM pcb_events171'+(project?' WHERE project_id=?':'')+' ORDER BY created_at DESC,id DESC LIMIT 300').bind(...(project?[project]:[])).all():Promise.resolve({results:[]})
 ]);
 const people=pcbCan171(e,'fixture')?(await env.DB.prepare("SELECT id,name FROM employees WHERE status='active' ORDER BY name,id").all()).results:[];
 return{people,projects:projects.results,links:links.results,fixtures:fixtures.results,photos:photos.results,events:events.results};
}
async function pcbSignature171(value){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
 return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function pcbCommit171(env,e,input,stmts,guards,event,result={}){
 const now=new Date().toISOString(),signature=await pcbSignature171(input),requestId=input.requestId;
 const existing=await env.DB.prepare('SELECT * FROM pcb_commits171 WHERE id=?').bind(requestId).first();
 if(existing){pcbAssert171(existing.actor_id===String(e.id)&&existing.signature===signature,'儲存編號重複，請重新開啟',409);return JSON.parse(existing.result);}
 const guardRows=guards.map((g,i)=>env.DB.prepare('INSERT INTO pcb_guards171(id,valid) VALUES (?,COALESCE(('+g.sql+'),0))').bind(requestId+':'+i,...g.args));
 const log=env.DB.prepare('INSERT INTO pcb_events171 VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),event.project,event.type,JSON.stringify(event.detail),String(e.id),e.name,now);
 const saved={saved:true,...result};
 try{
  await env.DB.batch([...guardRows,...stmts,log,
   env.DB.prepare('INSERT INTO pcb_commits171 VALUES(?,?,?,?,?)').bind(requestId,String(e.id),signature,JSON.stringify(saved),now),
   ...guards.map((g,i)=>env.DB.prepare('DELETE FROM pcb_guards171 WHERE id=?').bind(requestId+':'+i))
  ]);
 }catch(error){
  const prior=await env.DB.prepare('SELECT * FROM pcb_commits171 WHERE id=?').bind(requestId).first();
  if(prior&&prior.actor_id===String(e.id)&&prior.signature===signature)return JSON.parse(prior.result);
  if(/pcb_guards171|CHECK constraint/i.test(error.message))throw pcbError171('資料已更新、庫存不足或治具狀態已改變，請重新開啟',409);
  if(/UNIQUE constraint/i.test(error.message))throw pcbError171('案件名稱或PCB編號重複，請重新確認',409);
  throw error;
 }
 return saved;
}
const pcbGuard171=(table,row)=>({sql:'SELECT revision=? FROM '+table+' WHERE id=?',args:[row.revision,row.id]});
const pcbProjectGuard171=p=>({sql:'SELECT revision=? AND archived=0 FROM pcb_projects171 WHERE id=?',args:[p.revision,p.id]});
// Change the alias and its stock atomically; the form must acknowledge the preview.
async function pcbSourceChange175(env,e,input,old,p,stmts,guards,now){
 if(!Object.hasOwn(input,'sharedItemId'))return null; // Existing open forms keep their source.
 pcbAssert171(typeof input.sharedItemId==='string','庫存來源不正確');
 const requested=input.sharedItemId;
 if(requested===old.item_id)return null;
 const count=(await env.DB.prepare('SELECT COUNT(*) n FROM pcb_links171 WHERE item_id=?').bind(old.item_id).first()).n;
 if(!requested&&count===1)return null;
 pcbAssert171(pcbCan171(e,'stock'),'變更庫存來源需要庫存操作權限',403);
 pcbAssert171(input.confirmSource===true,'請確認庫存來源與數量處理方式');
 pcbAssert171(input.stockRevision===old.stock_revision&&input.sourceCount===count,'庫存或共用關係已更新，請重新開啟',409);
 guards.push({sql:'SELECT revision=? AND stock=? FROM pcb_items171 WHERE id=?',args:[old.stock_revision,old.stock,old.item_id]},{sql:'SELECT COUNT(*)=? FROM pcb_links171 WHERE item_id=?',args:[count,old.item_id]});
 let itemId,mode,oldAfter=old.stock,targetBefore=0,targetAfter=0,targetLabel;
 if(!requested){
  pcbAssert171(pcbInt171(input.transferQuantity,0,1000000000)&&input.transferQuantity<=old.stock,'分配數量需介於0與目前共用存量之間');
  itemId=crypto.randomUUID();mode='拆分獨立庫存';oldAfter=old.stock-input.transferQuantity;targetAfter=input.transferQuantity;targetLabel='獨立庫存';
  stmts.push(env.DB.prepare('INSERT INTO pcb_items171(id,name,stock,note,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(itemId,input.label.trim(),targetAfter,input.note.trim(),now,now));
 }else{
  const target=await env.DB.prepare('SELECT i.*,p.name AS project_name,l.label FROM pcb_items171 i JOIN pcb_links171 l ON l.item_id=i.id JOIN pcb_projects171 p ON p.id=l.project_id WHERE i.id=? AND p.archived=0 ORDER BY p.created_at,p.id,l.id LIMIT 1').bind(requested).first();
  pcbAssert171(target,'共用庫存來源不存在',404);pcbAssert171(input.targetStockRevision===target.revision,'來源庫存已更新，請重新開啟',409);
  guards.push(pcbGuard171('pcb_items171',target));itemId=target.id;targetBefore=target.stock;targetLabel=target.project_name+' · '+target.label;
  if(count===1){pcbAssert171(['same','combine'].includes(input.mergeMode),'請選擇同一批庫存或合併兩批庫存');mode=input.mergeMode==='same'?'同一批庫存，不相加':'合併兩批庫存';targetAfter=target.stock+(input.mergeMode==='combine'?old.stock:0);oldAfter=0;}
  else{mode='改用另一份共用庫存';targetAfter=target.stock;}
  pcbAssert171(pcbInt171(targetAfter,0,1000000000),'合併後存量超出範圍');
  stmts.push(env.DB.prepare('UPDATE pcb_items171 SET stock=?,revision=revision+1,updated_at=? WHERE id=?').bind(targetAfter,now,itemId));
 }
 stmts.push(env.DB.prepare('UPDATE pcb_items171 SET stock=?,revision=revision+1,updated_at=? WHERE id=?').bind(oldAfter,now,old.item_id));
 // Preserve photographs on this PCB without duplicating an existing image in its new pool.
 if(count===1){
  stmts.push(env.DB.prepare("UPDATE pcb_photos171 SET deleted_at=? WHERE entity_type='pcb' AND entity_id=? AND deleted_at='' AND EXISTS(SELECT 1 FROM pcb_photos171 dest WHERE dest.entity_type='pcb' AND dest.entity_id=? AND dest.storage_key=pcb_photos171.storage_key AND dest.deleted_at='')").bind(now,old.item_id,itemId));
  stmts.push(env.DB.prepare("UPDATE pcb_photos171 SET entity_id=? WHERE entity_type='pcb' AND entity_id=? AND deleted_at=''").bind(itemId,old.item_id));
 }else{
  stmts.push(env.DB.prepare("INSERT INTO pcb_photos171(id,project_id,entity_type,entity_id,storage_key,file_name,actor_name,created_at) SELECT lower(hex(randomblob(16))),?,'pcb',?,src.storage_key,src.file_name,src.actor_name,src.created_at FROM pcb_photos171 src WHERE src.entity_type='pcb' AND src.entity_id=? AND src.deleted_at='' AND NOT EXISTS(SELECT 1 FROM pcb_photos171 dest WHERE dest.entity_type='pcb' AND dest.entity_id=? AND dest.storage_key=src.storage_key AND dest.deleted_at='')").bind(p.id,itemId,old.item_id,itemId));
 }
 return{itemId,detail:{label:input.label,perSet:input.perSet,note:input.note,fromItemId:old.item_id,toItemId:itemId,mode,reason:p.name+' · '+old.label+'：'+mode+' → '+targetLabel,items:[{itemId:old.item_id,label:'原庫存'},{itemId,label:'新來源庫存'}],changes:[{itemId:old.item_id,before:old.stock,after:oldAfter,delta:oldAfter-old.stock},{itemId,before:targetBefore,after:targetAfter,delta:targetAfter-targetBefore}]}};
}

export async function pcbApi171(request,env,e){
 try{
  pcbAssert171(e&&e.status==='active','請先登入',401);pcbAssert171(pcbCan171(e,'view'),'沒有PCB管理查看權限',403);
  const url=new URL(request.url),project=url.searchParams.get('project')||'';
  if(request.method==='GET'){
   if(url.searchParams.get('photo'))return await pcbPhotoRead171(env,url.searchParams.get('photo'));
   if(url.searchParams.get('export')==='1')pcbAssert171(pcbCan171(e,'export'),'沒有匯出權限',403);
   return pcbJSON171(await pcbRead171(env,project,e));
  }
  pcbAssert171(request.method==='POST'&&request.headers.get('origin')===url.origin,'來源或操作不正確',403);
  if(request.headers.get('content-type')?.includes('multipart/form-data'))return await pcbPhotoUpload171(request,env,e);
  const raw=await request.text();pcbAssert171(raw.length<=100000,'資料過大，請分次操作',413);
  const input=JSON.parse(raw),action=input.action,now=new Date().toISOString();
  pcbAssert171(pcbId171(input.requestId),'缺少有效儲存編號');
  const cap=['receipt','issue','issue_set','adjust'].includes(action)?'stock':['take','return'].includes(action)?'fixture':action==='remove_photo'?'photos':'manage';
  pcbAssert171(pcbCan171(e,cap),'沒有此操作權限',403);
  // Check receipts before state validation so a lost response remains retryable.
  const prior=await env.DB.prepare('SELECT * FROM pcb_commits171 WHERE id=?').bind(input.requestId).first();
  if(prior){pcbAssert171(prior.actor_id===String(e.id)&&prior.signature===await pcbSignature171(input),'儲存編號重複',409);return pcbJSON171(JSON.parse(prior.result));}
  if(action==='import'){
   pcbAssert171(pcbCan171(e,'stock'),'匯入初始存量另需庫存操作權限',403);
   pcbAssert171(Array.isArray(input.rows)&&input.rows.length>0&&input.rows.length<=300,'每次匯入1至300項PCB');
   const projects=new Map(),items=new Map(),stmts=[],seen=new Set();
   for(const row of input.rows){
    pcbAssert171(pcbText171(row.project,100)&&pcbText171(row.label,100)&&pcbInt171(row.stock,0,1000000000)&&(row.perSet===null||pcbInt171(row.perSet,1))&&typeof row.note==='string'&&row.note.length<=1000&&typeof row.fixtureNote==='string'&&row.fixtureNote.length<=500,'匯入欄位格式不正確');
    const pair=JSON.stringify([row.project.trim().toLowerCase(),row.label.trim().toLowerCase()]);pcbAssert171(!seen.has(pair),'匯入有重複的案名與PCB編號');seen.add(pair);
    if(!projects.has(row.project.trim()))projects.set(row.project.trim(),{id:crypto.randomUUID(),notes:new Set()});
    if(row.fixtureNote)projects.get(row.project.trim()).notes.add(row.fixtureNote);
    const key=row.sharedKey||pair;pcbAssert171(typeof key==='string'&&key.length<=300,'共用庫存標記不正確');
    if(items.has(key))pcbAssert171(items.get(key).stock===row.stock,'同一份共用庫存的數量不一致');
    else items.set(key,{id:crypto.randomUUID(),stock:row.stock,label:row.label.trim()});
   }
   pcbAssert171(projects.size<=60,'每次最多匯入60個案件');
   for(const [name,p]of projects){const note=[...p.notes].length?'原表治具註記：'+[...p.notes].join('、')+'。請在治具管理確認數量、適用PCB與實際領用人。':'';pcbAssert171(note.length<=1000,'治具備註過長');stmts.push(env.DB.prepare('INSERT INTO pcb_projects171(id,name,note,created_at,updated_at) VALUES(?,?,?,?,?)').bind(p.id,name,note,now,now));}
   for(const i of items.values())stmts.push(env.DB.prepare('INSERT INTO pcb_items171(id,name,stock,created_at,updated_at) VALUES(?,?,?,?,?)').bind(i.id,i.label,i.stock,now,now));
   for(const row of input.rows){const key=row.sharedKey||JSON.stringify([row.project.trim().toLowerCase(),row.label.trim().toLowerCase()]);stmts.push(env.DB.prepare('INSERT INTO pcb_links171(id,project_id,item_id,label,per_set,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),projects.get(row.project.trim()).id,items.get(key).id,row.label.trim(),row.perSet,row.note.trim(),now,now));}
   const ids=[...projects.values()].map(p=>p.id);
   for(const id of ids.slice(1))stmts.push(env.DB.prepare('INSERT INTO pcb_events171 VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,'原表匯入',JSON.stringify({count:input.rows.filter(r=>projects.get(r.project.trim()).id===id).length}),String(e.id),e.name,now));
   return pcbJSON171(await pcbCommit171(env,e,input,stmts,[],{project:ids[0],type:'原表匯入',detail:{count:input.rows.length,projects:projects.size}},{projects:projects.size,items:input.rows.length}));
  }
  if(action==='project'){
   pcbAssert171(pcbText171(input.name,100)&&typeof input.note==='string'&&input.note.length<=1000,'請填寫案件名稱與有效備註');
   const id=input.id||crypto.randomUUID(),old=input.id?await pcbProject171(env,id):null;
   if(old)pcbAssert171(input.revision===old.revision,'案件已更新，請重新開啟',409);
   const stmt=old?env.DB.prepare('UPDATE pcb_projects171 SET name=?,note=?,revision=revision+1,updated_at=? WHERE id=?').bind(input.name.trim(),input.note.trim(),now,id):env.DB.prepare('INSERT INTO pcb_projects171(id,name,note,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,input.name.trim(),input.note.trim(),now,now);
   return pcbJSON171(await pcbCommit171(env,e,input,[stmt],old?[pcbProjectGuard171(old)]:[],{project:id,type:old?'修改案件':'新增案件',detail:{name:input.name.trim(),note:input.note}},{id}));
  }
  const p=await pcbProject171(env,input.projectId);const guards=[pcbProjectGuard171(p)],stmts=[];
  if(action==='link'){
   pcbAssert171(pcbText171(input.label,100)&&typeof input.note==='string'&&input.note.length<=1000,'請填寫PCB編號與有效備註');
   pcbAssert171(input.perSet===null||pcbInt171(input.perSet,1),'每套用量需為正整數，未設定請留空');
   const old=input.id?await pcbLink171(env,input.id):null;
   pcbAssert171(!old||old.project_id===p.id,'PCB不屬於此案件',403);
   if(old){pcbAssert171(input.revision===old.revision,'PCB資料已更新',409);guards.push(pcbGuard171('pcb_links171',old));}
   const sourceChange=old?await pcbSourceChange175(env,e,input,old,p,stmts,guards,now):null;
   let itemId=sourceChange?.itemId||old?.item_id||input.sharedItemId||crypto.randomUUID();
   if(!old&&!input.sharedItemId){
    pcbAssert171(pcbInt171(input.stock,0,1000000000),'初始庫存需為非負整數');
    stmts.push(env.DB.prepare('INSERT INTO pcb_items171(id,name,stock,note,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(itemId,input.label.trim(),input.stock,input.note.trim(),now,now));
   }else if(!old){
    const item=await env.DB.prepare('SELECT i.* FROM pcb_items171 i WHERE i.id=? AND EXISTS(SELECT 1 FROM pcb_links171 l JOIN pcb_projects171 p ON p.id=l.project_id WHERE l.item_id=i.id AND p.archived=0)').bind(itemId).first();
    pcbAssert171(item,'共用庫存來源不存在',404);guards.push(pcbGuard171('pcb_items171',item));
   }
   const id=old?.id||crypto.randomUUID();
   stmts.push(env.DB.prepare('UPDATE pcb_projects171 SET revision=revision+1,updated_at=? WHERE id=?').bind(now,p.id));
   stmts.push(old?env.DB.prepare('UPDATE pcb_links171 SET item_id=?,label=?,per_set=?,note=?,revision=revision+1,updated_at=? WHERE id=?').bind(itemId,input.label.trim(),input.perSet,input.note.trim(),now,id):
    env.DB.prepare('INSERT INTO pcb_links171(id,project_id,item_id,label,per_set,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,p.id,itemId,input.label.trim(),input.perSet,input.note.trim(),now,now));
   return pcbJSON171(await pcbCommit171(env,e,input,stmts,guards,{project:p.id,type:sourceChange?'變更庫存來源':old?'修改PCB':'新增PCB',detail:sourceChange?.detail||{label:input.label,perSet:input.perSet,itemId,shared:!!input.sharedItemId}},{id}));
  }
  if(['receipt','issue','adjust','issue_set'].includes(action)){
   pcbAssert171(pcbText171(input.reason,500),'請填寫用途或原因');
   let selected=[];
   if(action==='issue_set'){
    pcbAssert171(input.projectRevision===p.revision,'PCB清單已更新，請重新開啟',409);
    pcbAssert171(pcbInt171(input.sets,1),'請填寫製作套數');
    const rows=await env.DB.prepare('SELECT l.*,i.stock,i.revision AS stock_revision FROM pcb_links171 l JOIN pcb_items171 i ON i.id=l.item_id WHERE project_id=?').bind(p.id).all();
    selected=rows.results;pcbAssert171(selected.length&&selected.every(l=>pcbInt171(l.per_set,1)),'請先設定全部PCB的每套用量');
   }else{const link=await pcbLink171(env,input.linkId);pcbAssert171(link.project_id===p.id,'PCB不屬於此案件',403);selected=[link];pcbAssert171(input.stockRevision===link.stock_revision,'庫存已更新，請重新開啟',409);}
   const itemMap=new Map(),detail=[];
   for(const l of selected){
    if(action==='issue_set'){pcbAssert171(input.revisions?.[l.id]===l.revision&&input.stockRevisions?.[l.item_id]===l.stock_revision,'用量或庫存已更新，請重新開啟',409);guards.push(pcbGuard171('pcb_links171',l));}
    let delta;
    if(action==='adjust'){pcbAssert171(pcbInt171(input.quantity,0,1000000000),'盤點數量需為非負整數');delta=input.quantity-l.stock;}
    else{const q=action==='issue_set'?l.per_set*input.sets:input.quantity;pcbAssert171(pcbInt171(q,1,1000000000),'收領數量需為正整數');delta=action==='receipt'?q:-q;}
    const value=itemMap.get(l.item_id)||{stock:l.stock,delta:0,revision:l.stock_revision};value.delta+=delta;itemMap.set(l.item_id,value);
    detail.push({label:l.label,itemId:l.item_id,delta});
   }
   const changes=[];
   for(const [id,value]of itemMap){
    const after=value.stock+value.delta;pcbAssert171(pcbInt171(after,0,1000000000),'庫存不足或數量超出範圍',409);
    guards.push({sql:'SELECT revision=? AND stock=? FROM pcb_items171 WHERE id=?',args:[value.revision,value.stock,id]});
    stmts.push(env.DB.prepare('UPDATE pcb_items171 SET stock=?,revision=revision+1,updated_at=? WHERE id=?').bind(after,now,id));changes.push({itemId:id,before:value.stock,after,delta:value.delta});
   }
   return pcbJSON171(await pcbCommit171(env,e,input,stmts,guards,{project:p.id,type:({receipt:'PCB收料',issue:'PCB領料',adjust:'庫存校正',issue_set:'整套領料'})[action],detail:{reason:input.reason,sets:input.sets||null,items:detail,changes}}));
  }
  if(action==='fixture'){
   pcbAssert171(pcbText171(input.name,100)&&typeof input.location==='string'&&input.location.length<=160&&typeof input.note==='string'&&input.note.length<=1000,'請確認治具名稱、位置與備註');
   pcbAssert171(Array.isArray(input.applies)&&input.applies.length<=100&&new Set(input.applies).size===input.applies.length,'適用PCB格式不正確');
   const links=await env.DB.prepare('SELECT id FROM pcb_links171 WHERE project_id=?').bind(p.id).all();
   pcbAssert171(input.applies.every(id=>links.results.some(l=>l.id===id)),'適用PCB不屬於此案件');
   const id=input.id||crypto.randomUUID(),old=input.id?await env.DB.prepare('SELECT * FROM pcb_fixtures171 WHERE id=? AND project_id=?').bind(id,p.id).first():null;
   if(input.id)pcbAssert171(old&&input.revision===old.revision,'治具資料已更新',409);
   if(old)guards.push(pcbGuard171('pcb_fixtures171',old));
   stmts.push(old?env.DB.prepare('UPDATE pcb_fixtures171 SET name=?,applies=?,location=?,note=?,revision=revision+1,updated_at=? WHERE id=?').bind(input.name.trim(),JSON.stringify(input.applies),input.location.trim(),input.note.trim(),now,id):
    env.DB.prepare('INSERT INTO pcb_fixtures171(id,project_id,name,applies,location,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,p.id,input.name.trim(),JSON.stringify(input.applies),input.location.trim(),input.note.trim(),now,now));
   return pcbJSON171(await pcbCommit171(env,e,input,stmts,guards,{project:p.id,type:old?'修改治具':'新增治具',detail:{name:input.name,applies:input.applies,location:input.location,note:input.note}},{id}));
  }
  if(action==='take'||action==='return'){
   const fixture=await env.DB.prepare('SELECT * FROM pcb_fixtures171 WHERE id=? AND project_id=?').bind(input.id,p.id).first();
   pcbAssert171(fixture&&input.revision===fixture.revision,'治具狀態已更新',409);guards.push(pcbGuard171('pcb_fixtures171',fixture));
   let holder;
   if(action==='take'){
    pcbAssert171(!fixture.holder_id,'治具已被領用',409);
    holder=await env.DB.prepare("SELECT id,name FROM employees WHERE id=? AND status='active'").bind(String(input.holderId)).first();
    pcbAssert171(holder,'請選擇有效領用人');
   }else pcbAssert171(fixture.holder_id,'治具目前在庫',409);
   stmts.push(env.DB.prepare('UPDATE pcb_fixtures171 SET holder_id=?,holder_name=?,taken_at=?,revision=revision+1,updated_at=? WHERE id=?').bind(holder?String(holder.id):'',holder?.name||'',holder?now:'',now,fixture.id));
   return pcbJSON171(await pcbCommit171(env,e,input,stmts,guards,{project:p.id,type:action==='take'?'治具領用':'治具歸還',detail:{fixture:fixture.name,holder:holder?.name||fixture.holder_name,takenAt:fixture.taken_at,note:String(input.note||'').slice(0,500)}}));
  }
  if(action==='remove_photo'){
   const photo=await env.DB.prepare("SELECT * FROM pcb_photos171 WHERE id=? AND deleted_at=''").bind(input.id).first();
   pcbAssert171(photo&&photo.project_id===p.id,'找不到照片',404);
   stmts.push(env.DB.prepare('UPDATE pcb_photos171 SET deleted_at=? WHERE id=?').bind(now,input.id));
   return pcbJSON171(await pcbCommit171(env,e,input,stmts,guards,{project:p.id,type:'移除照片',detail:{file:photo.file_name}}));
  }
  throw pcbError171('不支援的操作');
 }catch(error){return pcbJSON171({error:error.message||'PCB操作失敗'},error.status||400);}
}
async function pcbPhotoRead171(env,id){
 const row=await env.DB.prepare("SELECT f.* FROM pcb_photos171 f JOIN pcb_projects171 p ON p.id=f.project_id WHERE f.id=? AND f.deleted_at='' AND p.archived=0").bind(id).first();
 pcbAssert171(row,'照片不存在',404);const object=await env.UPLOADS?.get(row.storage_key);pcbAssert171(object,'照片讀取失敗',404);
 return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
async function pcbPhotoUpload171(request,env,e){
 pcbAssert171(pcbCan171(e,'photos'),'沒有照片管理權限',403);
 pcbAssert171(Number(request.headers.get('content-length')||0)<9000000,'一次最多10張照片',413);
 const form=await request.formData(),project=String(form.get('projectId')||''),type=String(form.get('entityType')||''),id=String(form.get('entityId')||''),files=form.getAll('photo');
 const p=await pcbProject171(env,project);
 const requestId=String(form.get('requestId')||'');pcbAssert171(pcbId171(requestId),'缺少有效上傳編號');
 pcbAssert171(['pcb','fixture'].includes(type),'照片類型不正確');
 const entity=type==='pcb'?await env.DB.prepare('SELECT id FROM pcb_links171 WHERE project_id=? AND item_id=?').bind(project,id).first():await env.DB.prepare('SELECT id FROM pcb_fixtures171 WHERE project_id=? AND id=?').bind(project,id).first();
 pcbAssert171(entity,'照片對象不屬於此案件',404);
 pcbAssert171(env.UPLOADS&&files.length>0&&files.length<=10,'請選擇1至10張照片');
 for(const file of files){
  pcbAssert171(file instanceof File&&file.size>0&&file.size<=800*1024&&['image/jpeg','image/png','image/webp'].includes(file.type),'照片須為800KB以內的JPG、PNG或WebP');
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer()),hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  pcbAssert171(file.type==='image/jpeg'?hex.startsWith('ffd8ff'):file.type==='image/png'?hex.startsWith('89504e470d0a1a0a'):hex.startsWith('52494646')&&hex.slice(16)==='57454250','照片內容與格式不符');
 }
 const descriptors=[];for(const file of files){const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());descriptors.push({name:file.name,type:file.type,hash:[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')});}
 const input={action:'upload',requestId,projectId:project,entityType:type,entityId:id,files:descriptors};
 const prior=await env.DB.prepare('SELECT * FROM pcb_commits171 WHERE id=?').bind(requestId).first();
 if(prior){pcbAssert171(prior.actor_id===String(e.id)&&prior.signature===await pcbSignature171(input),'上傳編號重複',409);return pcbJSON171(JSON.parse(prior.result));}
 const stored=[],now=new Date().toISOString();let saved;
 try{
  for(const file of files){const photoId=crypto.randomUUID(),key='pcb171/'+project+'/'+photoId;await env.UPLOADS.put(key,file.stream(),{httpMetadata:{contentType:file.type}});stored.push({id:photoId,key,name:file.name.slice(0,200)});}
  saved=await pcbCommit171(env,e,input,stored.map(f=>env.DB.prepare('INSERT INTO pcb_photos171(id,project_id,entity_type,entity_id,storage_key,file_name,actor_name,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(f.id,project,type,id,f.key,f.name,e.name,now)),[pcbProjectGuard171(p)],{project,type:'新增照片',detail:{entityType:type,entityId:id,count:stored.length}},{count:stored.length,photoIds:stored.map(f=>f.id)});
  await Promise.allSettled(stored.filter(f=>!saved.photoIds.includes(f.id)).map(f=>env.UPLOADS.delete(f.key)));
 }catch(error){await Promise.allSettled(stored.map(f=>env.UPLOADS.delete(f.key)));throw error;}
 return pcbJSON171(saved);
}
