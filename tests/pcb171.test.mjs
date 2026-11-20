import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {backupData85,backupTables85} from '../worker/backup85.mjs';
import {pcbApi171,pcbCapacity171} from '../worker/pcb171.mjs';
import {pcbCapabilities171,builtinProfiles,ensurePermissions,employeePermissions} from '../worker/wire-permissions.mjs';
const caps=Object.keys(pcbCapabilities171),actor={id:1,name:'登記人',role:'supervisor',status:'active',permissions:caps};
function fixture(){
 const {DB,db}=database();migrations85(db);
 db.exec("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(1,'u1','a@test','登記人','supervisor','active','now','now'),(2,'u2','b@test','實際領用人','viewer','active','now','now'),(3,'u3','c@test','停用人','viewer','inactive','now','now')");
 const objects=new Map(),env={DB,UPLOADS:{async put(key,stream,options){objects.set(key,{body:await new Response(stream).arrayBuffer(),httpMetadata:options.httpMetadata})},async get(key){return objects.get(key)},async delete(key){objects.delete(key)}}};
 const call=async(input,e=actor)=>{const request=new Request('https://app.test/api/pcb',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),...input})});const r=await pcbApi171(request,env,e);return {status:r.status,...await r.json()}};
 const read=async(id='',e=actor)=>{const r=await pcbApi171(new Request('https://app.test/api/pcb'+(id?'?project='+id:'')),env,e);return {status:r.status,...await r.json()}};
 const project=async(name='測試案')=>(await call({action:'project',name,note:''})).id;
 const link=async(p,label='A',extra={})=>call({action:'link',projectId:p,label,stock:20,perSet:4,note:'',...extra});
 return {DB,db,env,objects,call,read,project,link};
}
test('PCB requires active login, view and independent action permissions',async()=>{
 const f=fixture();assert.equal((await f.read('',null)).status,401);assert.equal((await f.read('',{...actor,permissions:[]})).status,403);
 const p=await f.project();assert.equal((await f.link(p,'A')).status,200);
 assert.equal((await f.call({action:'receipt',projectId:p},{...actor,permissions:['pcb.view']})).status,403);
 assert.equal((await pcbApi171(new Request('https://app.test/api/pcb?export=1'),f.env,{...actor,permissions:['pcb.view']})).status,403);
 assert.equal((await f.read('',{...actor,permissions:['pcb.view']})).people.length,0);
 assert.equal((await f.read()).people.length,2);
 const r=await pcbApi171(new Request('https://app.test/api/pcb',{method:'POST',headers:{origin:'https://other.test'},body:'{}'}),f.env,actor);assert.equal(r.status,403);
});
test('PCB capacity floors complete sets and aggregates the same shared stock',()=>{
 assert.equal(pcbCapacity171([{item_id:'a',stock:298,per_set:4}]),74);
 assert.equal(pcbCapacity171([{item_id:'a',stock:20,per_set:4},{item_id:'a',stock:20,per_set:6}]),2);
 assert.equal(pcbCapacity171([{stock:20,per_set:null}]),null);assert.equal(pcbCapacity171([]),null);
});
test('PCB stock idempotency, revision conflict and underflow preserve stock and events',async()=>{
 const f=fixture(),p=await f.project();await f.link(p);let l=(await f.read(p)).links[0];
 const input={action:'issue',projectId:p,linkId:l.id,stockRevision:l.stock_revision,quantity:3,reason:'組裝',requestId:'retry-one'};
 assert.equal((await f.call(input)).status,200);assert.equal((await f.call(input)).status,200);
 assert.equal((await f.read(p)).links[0].stock,17);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM pcb_events171 WHERE type='PCB領料'").get().n,1);
 assert.equal((await f.call({...input,requestId:'stale'})).status,409);
 assert.equal((await f.call({...input,quantity:4})).status,409);
 l=(await f.read(p)).links[0];assert.equal((await f.call({...input,requestId:'too-many',stockRevision:l.stock_revision,quantity:18})).status,409);
 assert.equal((await f.read(p)).links[0].stock,17);
 const r=await f.call({...input,requestId:'receipt',action:'receipt',stockRevision:l.stock_revision,quantity:3});assert.equal(r.status,200);assert.equal((await f.read(p)).links[0].stock,20);
});
test('shared PCB changes synchronize both projects; whole-set issue adds quantities once',async()=>{
 const f=fixture(),p=await f.project('甲'),q=await f.project('乙');await f.link(p);let l=(await f.read(p)).links[0];await f.link(q,'B',{sharedItemId:l.item_id});await f.link(p,'C',{sharedItemId:l.item_id,perSet:6});
 const d=await f.read(p),links=d.links.filter(x=>x.project_id===p),input={action:'issue_set',projectId:p,projectRevision:d.projects.find(x=>x.id===p).revision,sets:2,reason:'兩套',stockRevisions:Object.fromEntries(links.map(x=>[x.item_id,x.stock_revision])),revisions:Object.fromEntries(links.map(x=>[x.id,x.revision]))};
 assert.equal((await f.call(input)).status,200);assert.deepEqual((await f.read()).links.map(x=>x.stock),[0,0,0]);
 const ev=f.db.prepare("SELECT detail FROM pcb_events171 WHERE type='整套領料'").get();const detail=JSON.parse(ev.detail);assert.equal(detail.changes.length,1);assert.equal(detail.changes[0].delta,-20);
});
test('whole set conflicts when another user adds a PCB or updates stock',async()=>{
 const f=fixture(),p=await f.project();await f.link(p);const d=await f.read(p),l=d.links[0],input={action:'issue_set',projectId:p,projectRevision:d.projects[0].revision,sets:1,reason:'測試',revisions:{[l.id]:l.revision},stockRevisions:{[l.item_id]:l.stock_revision}};
 await f.link(p,'B');assert.equal((await f.call(input)).status,409);assert.equal((await f.read(p)).links[0].stock,20);
});
test('transaction guard rolls back all updates after a concurrent stock change',async()=>{
 const f=fixture(),p=await f.project();await f.link(p);const l=(await f.read(p)).links[0],original=f.DB.batch;let injected=false;
 f.DB.batch=async stmts=>{if(!injected){injected=true;f.db.prepare('UPDATE pcb_items171 SET stock=19,revision=revision+1 WHERE id=?').run(l.item_id)}return original(stmts)};
 assert.equal((await f.call({action:'issue',projectId:p,linkId:l.id,stockRevision:l.stock_revision,quantity:4,reason:'衝突'})).status,409);
 assert.equal((await f.read(p)).links[0].stock,19);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM pcb_events171 WHERE type='PCB領料'").get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM pcb_guards171').get().n,0);
});
test('fixture allows multiple PCB mappings, actual holder separate from actor, return audit',async()=>{
 const f=fixture(),p=await f.project();await f.link(p);await f.link(p,'B');const links=(await f.read(p)).links;
 const saved=await f.call({action:'fixture',projectId:p,name:'共用治具',applies:links.map(x=>x.id),location:'1F',note:''});assert.equal(saved.status,200);
 let fix=(await f.read(p)).fixtures[0];assert.equal(JSON.parse(fix.applies).length,2);
 assert.equal((await f.call({action:'take',projectId:p,id:fix.id,revision:fix.revision,holderId:3})).status,400);
 assert.equal((await f.call({action:'take',projectId:p,id:fix.id,revision:fix.revision,holderId:2})).status,200);
 fix=(await f.read(p)).fixtures[0];assert.equal(fix.holder_name,'實際領用人');assert.ok(fix.taken_at);
 const ev=f.db.prepare("SELECT * FROM pcb_events171 WHERE type='治具領用'").get();assert.equal(ev.actor_name,'登記人');assert.equal(JSON.parse(ev.detail).holder,'實際領用人');
 assert.equal((await f.call({action:'take',projectId:p,id:fix.id,revision:fix.revision,holderId:1})).status,409);
 assert.equal((await f.call({action:'return',projectId:p,id:fix.id,revision:fix.revision})).status,200);
 assert.equal((await f.read(p)).fixtures[0].holder_id,'');assert.equal(JSON.parse(f.db.prepare("SELECT detail FROM pcb_events171 WHERE type='治具歸還'").get().detail).holder,'實際領用人');
});
test('fixture rejects PCB mapping from a different project',async()=>{
 const f=fixture(),p=await f.project('甲'),q=await f.project('乙');const l=await f.link(q);
 assert.equal((await f.call({action:'fixture',projectId:p,name:'治具',applies:[l.id],location:'',note:''})).status,400);
});
test('project names are unique and edits require current revision',async()=>{
 const f=fixture(),p=await f.project();assert.equal((await f.call({action:'project',name:'測試案',note:''})).status,409);
 await f.link(p);assert.equal((await f.call({action:'project',id:p,revision:1,name:'新案',note:''})).status,409);
});
function photoRequest(p,id,requestId='photo-one',files=[new File([new Uint8Array([255,216,255,0])],'x.jpg',{type:'image/jpeg'})]){const form=new FormData();for(const [key,value]of Object.entries({projectId:p,entityType:'pcb',entityId:id,requestId}))form.set(key,value);files.forEach(f=>form.append('photo',f));return new Request('https://app.test/api/pcb',{method:'POST',headers:{origin:'https://app.test'},body:form})}
test('photo upload is authenticated, validated, idempotent, isolated by entity and removable',async()=>{
 const f=fixture(),p=await f.project();await f.link(p);const l=(await f.read(p)).links[0];
 let r=await pcbApi171(photoRequest(p,l.item_id),f.env,actor);assert.equal(r.status,200);
 r=await pcbApi171(photoRequest(p,l.item_id),f.env,actor);assert.equal(r.status,200);assert.equal(f.objects.size,1);
 assert.equal((await pcbApi171(photoRequest(p,'other'),f.env,actor)).status,404);
 assert.equal((await pcbApi171(photoRequest(p,l.item_id,'bad',[new File(['bad'],'x.jpg',{type:'image/jpeg'})]),f.env,actor)).status,400);
 const photo=(await f.read(p)).photos[0];assert.equal((await pcbApi171(new Request('https://app.test/api/pcb?photo='+photo.id),f.env,actor)).status,200);
 assert.equal((await pcbApi171(new Request('https://app.test/api/pcb?photo=missing'),f.env,actor)).status,404);
 assert.equal((await f.call({action:'remove_photo',projectId:p,id:photo.id})).status,200);
 assert.equal((await f.read(p)).photos.length,0);assert.equal((await pcbApi171(new Request('https://app.test/api/pcb?photo='+photo.id),f.env,actor)).status,404);
});
test('photo R2 failure leaves no database photos or orphaned uploads',async()=>{
 const f=fixture(),p=await f.project();await f.link(p);const l=(await f.read(p)).links[0];const put=f.env.UPLOADS.put;let n=0;f.env.UPLOADS.put=async(...args)=>{if(++n===2)throw Error('storage unavailable');return put(...args)};
 const file=new File([new Uint8Array([255,216,255])],'x.jpg',{type:'image/jpeg'});assert.equal((await pcbApi171(photoRequest(p,l.item_id,'partial',[file,file]),f.env,actor)).status,400);
 assert.equal(f.objects.size,0);assert.equal((await f.read(p)).photos.length,0);
});
test('original table import is atomic, keeps unknown set quantity, shares explicit stock and retains fixture notes',async()=>{
 const f=fixture(),rows=[{project:'甲',label:'A',stock:20,perSet:4,note:'備註',fixtureNote:'是(1F)',sharedKey:'shared'},{project:'乙',label:'B',stock:20,perSet:null,note:'',fixtureNote:'否',sharedKey:'shared'}];
 const input={action:'import',rows,requestId:'import-one'};assert.equal((await f.call(input)).status,200);assert.equal((await f.call(input)).status,200);
 const d=await f.read();assert.equal(d.projects.length,2);assert.equal(d.links.length,2);assert.equal(new Set(d.links.map(l=>l.item_id)).size,1);assert.match(d.projects.find(p=>p.name==='甲').note,/是\(1F\)/);assert.equal(d.fixtures.length,0);
 assert.equal((await f.call({action:'import',rows})).status,409);assert.equal((await f.read()).projects.length,2);
 assert.equal((await f.call({action:'import',rows:[...rows,{...rows[1],project:'丙',stock:30}]})).status,400);
});
test('PCB permissions upgrade adds only supervisor capabilities and preserves manual changes afterwards',async()=>{
 const f=fixture();f.db.exec("CREATE TABLE IF NOT EXISTS app_permission_profiles(id TEXT PRIMARY KEY,name TEXT NOT NULL,permissions TEXT NOT NULL);INSERT INTO app_permission_profiles VALUES('supervisor','主管','[]'),('viewer','員工','[]')");await ensurePermissions(f.env);
 const supervisor=await employeePermissions(f.env,{id:1,role:'supervisor'}),viewer=await employeePermissions(f.env,{id:2,role:'viewer'});assert.ok(caps.every(c=>supervisor.permissions.includes(c)));assert.ok(caps.every(c=>!viewer.permissions.includes(c)));
 assert.ok(caps.every(c=>builtinProfiles[0].permissions.includes(c)));
 f.db.prepare("UPDATE app_permission_profiles SET permissions='[]' WHERE id='supervisor'").run();assert.deepEqual((await employeePermissions(f.env,{id:1,role:'supervisor'})).permissions,[]);
});
test('frontend navigation, original-table parser, complete-set calculation and HTML escaping',()=>{
 const source=fs.readFileSync('dist/pcb171.js','utf8'),context=vm.createContext({managementPages:()=>[{id:'wire'},{id:'schedule'}],render(){},canDo:()=>true,esc:x=>x.replaceAll('<','&lt;'),console});vm.runInContext(source,context);
 assert.deepEqual([...vm.runInContext('managementPages().map(p=>p.id)',context)],['wire','pcb','schedule']);
 assert.equal(vm.runInContext("pcbSets171([{item_id:'a',stock:298,per_set:4}])",context),74);
 const rows=vm.runInContext("pcbImportRows171([['案名','編號','存量','一套所需量','治具是否歸庫'],['UEA2in1','B(與UEA網路共用)',298,4,'是'],['UEA網路','A',298,4,'是'],['新案','A',51,'','']])",context);assert.equal(rows[0].sharedKey,rows[1].sharedKey);assert.equal(rows[2].perSet,null);
 assert.throws(()=>vm.runInContext("pcbImportRows171([['案名','編號','存量','一套所需量'],['案','A',-1,4]])",context));
 assert.equal(vm.runInContext("pcbEsc171('<script>')",context),'&lt;script>');
 assert.match(source,/form.set\('requestId',uploadId\)/);assert.doesNotMatch(source,/downloadBlob\(/);
 const build=fs.readFileSync('build.mjs','utf8');assert.match(build,/pcb171.js\?v=176/);assert.match(build,/worker\/pcb171.mjs/);
});

test('PCB data joins the existing full backup and remains separate from legacy state snapshots',async()=>{
 const f=fixture();await f.project();const data=await backupData85(f.env,{},()=>({}));assert.equal(data.tables.pcb_projects171.length,1);assert.ok(backupTables85.includes('pcb_photos171'));
 const sql=[];const prepare=f.DB.prepare;f.DB.prepare=query=>{sql.push(query);return prepare(query)};await f.read();assert.ok(sql.every(q=>!q.includes('state_records')&&!q.includes('company_state')));
});

test('audit payload and database query are restricted to supervisors even with all PCB capabilities',async()=>{
 const f=fixture();const p=await f.project();await f.link(p);assert.ok((await f.read(p)).events.length>0);
 const queries=[],prepare=f.DB.prepare;f.DB.prepare=sql=>{queries.push(sql);return prepare(sql)};
 for(const role of ['viewer','warehouse','custom',undefined]){const d=await f.read(p,{...actor,role});assert.equal(d.status,200);assert.deepEqual(d.events,[]);assert.equal(d.projects.length,1);assert.equal(d.links.length,1);}
 assert.ok(queries.every(q=>!q.includes('FROM pcb_events171')));
 const response=await pcbApi171(new Request('https://app.test/api/pcb?export=1'),f.env,{...actor,role:'viewer'});assert.equal(response.status,200);assert.deepEqual((await response.json()).events,[]);
});
test('audit tabs are supervisor-only and compact rows keep escaped details and correct import units',()=>{
 const ctx=vm.createContext({managementPages:()=>[],render(){},currentUser:{role:'viewer'},canDo:()=>true,esc:s=>s.replaceAll('<','&lt;')});vm.runInContext(fs.readFileSync('dist/pcb171.js','utf8'),ctx);
 assert.deepEqual([...vm.runInContext('pcbTabs172().map(t=>t[0])',ctx)],['pcb','fixture']);
 vm.runInContext("currentUser.role='supervisor'",ctx);assert.deepEqual([...vm.runInContext('pcbTabs172().map(t=>t[0])',ctx)],['pcb','fixture','events']);
 assert.equal(vm.runInContext("pcbEventDetail171({type:'原表匯入',detail:'{\"count\":7}'})",ctx),'PCB 7 項');
 assert.equal(vm.runInContext("pcbEventDetail171({type:'新增照片',detail:'{\"count\":1}'})",ctx),'照片 1 張');
 assert.equal(vm.runInContext("pcbEventDetail171({type:'移除照片',detail:'{\"file\":\"x.jpg\"}'})",ctx),'x.jpg');
 const source=fs.readFileSync('dist/pcb171.js','utf8');assert.match(source,/class="pcb-audit172"/);assert.match(source,/pcbEsc171\(pcbEventDetail171/);assert.match(source,/if\(!pcbTabs172\(\).some/);
});

const editSource175=(l,extra={})=>({action:'link',projectId:l.project_id,id:l.id,revision:l.revision,label:l.label,perSet:l.per_set,note:l.note,stockRevision:l.stock_revision,sourceCount:l.source_count,confirmSource:true,...extra});
async function twoSources175(){const f=fixture(),p=await f.project('甲'),q=await f.project('乙'),a=await f.link(p),b=await f.link(q,'B',{stock:30});const data=await f.read();return{...f,p,q,a:data.links.find(l=>l.id===a.id),b:data.links.find(l=>l.id===b.id)}};
test('existing independent PCB can share the same physical batch without double-counting, and retries are idempotent',async()=>{
 const f=await twoSources175(),input=editSource175(f.a,{sharedItemId:f.b.item_id,targetStockRevision:f.b.stock_revision,mergeMode:'same',requestId:'same-batch'});
 assert.equal((await f.call(input)).status,200);assert.equal((await f.call(input)).status,200);
 const d=await f.read();assert.ok(d.links.every(l=>l.item_id===f.b.item_id&&l.stock===30));assert.equal(f.db.prepare('SELECT stock FROM pcb_items171 WHERE id=?').get(f.a.item_id).stock,0);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM pcb_events171 WHERE type='變更庫存來源'").get().n,1);
});
test('existing independent PCB can combine separate physical batches, maintaining their total stock',async()=>{
 const f=await twoSources175();assert.equal((await f.call(editSource175(f.a,{sharedItemId:f.b.item_id,targetStockRevision:f.b.stock_revision,mergeMode:'combine'}))).status,200);
 assert.ok((await f.read()).links.every(l=>l.stock===50));assert.equal(f.db.prepare('SELECT SUM(stock) n FROM pcb_items171').get().n,50);
 const event=JSON.parse(f.db.prepare("SELECT detail FROM pcb_events171 WHERE type='變更庫存來源'").get().detail);assert.equal(event.mode,'合併兩批庫存');assert.equal(event.changes[1].after,50);
});
test('unlinking a shared PCB splits the allocated stock, leaves the other projects correct and preserves photos',async()=>{
 const f=await twoSources175();await f.call(editSource175(f.a,{sharedItemId:f.b.item_id,targetStockRevision:f.b.stock_revision,mergeMode:'combine'}));
 const l=(await f.read()).links.find(l=>l.id===f.a.id);assert.equal(l.source_count,2);
 assert.equal((await pcbApi171(photoRequest(f.p,l.item_id),f.env,actor)).status,200);
 assert.equal((await f.call(editSource175(l,{sharedItemId:'',transferQuantity:12}))).status,200);
 const d=await f.read(),a=d.links.find(x=>x.id===f.a.id),b=d.links.find(x=>x.id===f.b.id);
 assert.notEqual(a.item_id,b.item_id);assert.equal(a.stock,12);assert.equal(b.stock,38);assert.equal(a.source_count,1);assert.equal(b.source_count,1);assert.equal(f.db.prepare('SELECT SUM(stock) n FROM pcb_items171').get().n,50);
 assert.equal(d.photos.filter(x=>x.entity_id===a.item_id).length,1);assert.equal(d.photos.filter(x=>x.entity_id===b.item_id).length,1);assert.equal(f.objects.size,1);
});
test('splitting zero or all pieces is explicit and source changes cannot exceed available stock',async()=>{
 const f=await twoSources175();await f.link(f.p,'C',{sharedItemId:f.b.item_id});let l=(await f.read()).links.find(x=>x.id!==f.a.id&&x.project_id===f.p);
 assert.equal((await f.call(editSource175(l,{sharedItemId:'',transferQuantity:31}))).status,400);
 assert.equal((await f.call(editSource175(l,{sharedItemId:'',transferQuantity:0}))).status,200);assert.equal((await f.read()).links.find(x=>x.id===l.id).stock,0);
 await f.link(f.p,'D',{sharedItemId:f.b.item_id});l=(await f.read()).links.find(x=>x.label==='D');assert.equal((await f.call(editSource175(l,{sharedItemId:'',transferQuantity:30}))).status,200);assert.equal((await f.read()).links.find(x=>x.id===f.b.id).stock,0);
});
test('switching from one shared pool to another leaves the original pool for its remaining PCB',async()=>{
 const f=await twoSources175();await f.link(f.q,'C',{sharedItemId:f.a.item_id});const l=(await f.read()).links.find(x=>x.id===f.a.id);
 assert.equal((await f.call(editSource175(l,{sharedItemId:f.b.item_id,targetStockRevision:f.b.stock_revision}))).status,200);
 const d=await f.read();assert.equal(d.links.find(x=>x.id===f.a.id).stock,30);assert.equal(d.links.find(x=>x.label==='C').stock,20);assert.equal(f.db.prepare('SELECT SUM(stock) n FROM pcb_items171').get().n,50);
});
test('source changes require management, stock permission, acknowledgement and a complete merge choice',async()=>{
 const f=await twoSources175(),input=editSource175(f.a,{sharedItemId:f.b.item_id,targetStockRevision:f.b.stock_revision,mergeMode:'same'});
 assert.equal((await f.call(input,{...actor,permissions:['pcb.view','pcb.manage']})).status,403);
 assert.equal((await f.call(input,{...actor,permissions:['pcb.view','pcb.stock']})).status,403);
 assert.equal((await f.call({...input,confirmSource:false})).status,400);assert.equal((await f.call({...input,mergeMode:''})).status,400);
 assert.equal((await f.call(editSource175(f.a,{sharedItemId:'',note:'仍可修改備註'}),{...actor,permissions:['pcb.view','pcb.manage']})).status,200);
 assert.equal(f.db.prepare('SELECT SUM(stock) n FROM pcb_items171').get().n,50);
});
test('source changes reject stale target stock and changed sharing topology before any write',async()=>{
 const f=await twoSources175(),input=editSource175(f.a,{sharedItemId:f.b.item_id,targetStockRevision:f.b.stock_revision,mergeMode:'combine'});
 await f.call({action:'receipt',projectId:f.q,linkId:f.b.id,stockRevision:f.b.stock_revision,quantity:1,reason:'另一人收料'});
 assert.equal((await f.call(input)).status,409);assert.equal((await f.read()).links.find(x=>x.id===f.a.id).stock,20);
 await f.link(f.q,'C',{sharedItemId:f.a.item_id});assert.equal((await f.call({...input,targetStockRevision:2})).status,409);
});
test('concurrent attachment to an independent pool cannot have its stock cleared by a merge',async()=>{
 const f=await twoSources175(),batch=f.DB.batch;let injected=false;
 f.DB.batch=async stmts=>{if(!injected){injected=true;f.db.prepare("INSERT INTO pcb_links171(id,project_id,item_id,label,per_set,created_at,updated_at) VALUES('concurrent',?,?, 'C',1,'now','now')").run(f.q,f.a.item_id)}return batch(stmts)};
 assert.equal((await f.call(editSource175(f.a,{sharedItemId:f.b.item_id,targetStockRevision:f.b.stock_revision,mergeMode:'combine'}))).status,409);
 assert.equal(f.db.prepare('SELECT SUM(stock) n FROM pcb_items171').get().n,50);assert.equal((await f.read()).links.find(x=>x.id==='concurrent').stock,20);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM pcb_events171 WHERE type='變更庫存來源'").get().n,0);
});
test('merging carries unique original photos into the target and avoids duplicate image references',async()=>{
 const f=await twoSources175(),now='2026-11-20';
 for(const [id,item,key,project]of [['a',f.a.item_id,'same',f.p],['b',f.b.item_id,'same',f.q],['c',f.a.item_id,'unique',f.p]])f.db.prepare("INSERT INTO pcb_photos171(id,project_id,entity_type,entity_id,storage_key,file_name,actor_name,created_at) VALUES(?,?,'pcb',?,?,?,'原上傳人',?)").run(id,project,item,key,id+'.jpg',now);
 assert.equal((await f.call(editSource175(f.a,{sharedItemId:f.b.item_id,targetStockRevision:f.b.stock_revision,mergeMode:'same'}))).status,200);
 const photos=(await f.read()).photos.filter(x=>x.entity_id===f.b.item_id);assert.equal(photos.length,2);assert.ok(photos.every(x=>x.actor_name==='原上傳人'));assert.equal(f.db.prepare("SELECT COUNT(*) n FROM pcb_photos171 WHERE entity_id=? AND deleted_at=''").get(f.a.item_id).n,0);
});
test('source plan supports independent, shared, unchanged, split and reassign states without UEA-specific names',()=>{
 const ctx=vm.createContext({managementPages:()=>[],render(){}});vm.runInContext(fs.readFileSync('dist/pcb171.js','utf8'),ctx);
 for(const [l,count,mode,id,expected]of [[null,0,'shared','','missing'],[null,0,'independent','','new'],[{item_id:'old'},1,'independent','','none'],[{item_id:'old'},2,'shared','old','none'],[{item_id:'old'},2,'independent','','split'],[{item_id:'old'},1,'shared','new','join'],[{item_id:'old'},2,'shared','new','switch']]){ctx.args=[l,count,mode,id];assert.equal(vm.runInContext('pcbSourcePlan175(...args)',ctx),expected)}
});

test('PCB display sorts mixed codes naturally and leaves stored records and other projects untouched',()=>{
 const context=vm.createContext({managementPages:()=>[],render(){}});vm.runInContext(fs.readFileSync('dist/pcb171.js','utf8'),context);
 vm.runInContext("pcbData171.links=[{id:'10',project_id:'p',label:'A10'},{id:'b',project_id:'p',label:'B'},{id:'other',project_id:'q',label:'A1'},{id:'2',project_id:'p',label:'A2'},{id:'a',project_id:'p',label:'A'}]",context);
 const original=vm.runInContext('JSON.stringify(pcbData171.links)',context);
 assert.deepEqual([...vm.runInContext("pcbLinks171('p').map(l=>l.label)",context)],['A','A2','A10','B']);
 assert.equal(vm.runInContext('JSON.stringify(pcbData171.links)',context),original);
 assert.deepEqual([...vm.runInContext("pcbLinks171('q').map(l=>l.id)",context)],['other']);
});
