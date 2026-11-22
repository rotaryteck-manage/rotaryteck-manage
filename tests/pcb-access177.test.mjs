import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {pcbAccessState177,pcbAccessApi177} from '../worker/pcb-access177.mjs';
import {pcbApi171} from '../worker/pcb171.mjs';
import {backupData85,backupPhotos85} from '../worker/backup85.mjs';
import server from '../worker/server.mjs';
const caps=['pcb.view','pcb.manage','pcb.stock','pcb.fixture','pcb.photos','pcb.export','admin.settings','admin.export'];
function fixture(duplicate=false){
 const {db,DB}=database();
 db.prepare("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(7,'u7','owner@test','傅睿禾','supervisor','active','now','now')").run();
 db.prepare("INSERT INTO employees(id,account_user_id,email,name,role,status,created_at,updated_at) VALUES(8,'u8','other@test',?,'supervisor','active','now','now')").run(duplicate?'傅睿禾':'其他主管');
 migrations85(db);const env={DB,SUPABASE_URL:'https://auth.test',SUPABASE_PUBLISHABLE_KEY:'public-test-key'};
 const owner={id:7,name:'傅睿禾',role:'supervisor',status:'active',permissions:caps},other={...owner,id:8,name:'其他主管'};
 const request=(input,origin='https://app.test')=>new Request('https://app.test/api/pcb-access177',{method:'PUT',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)});
 const set=async(input,e=owner,origin)=>{const r=await pcbAccessApi177(request(input,origin),env,e);return{status:r.status,...await r.json()}};
 return{db,DB,env,owner,other,set,request};
}
test('construction defaults on and pins the unique active employee rather than a supervisor role or editable name',async()=>{
 const f=fixture(),row=f.db.prepare('SELECT * FROM pcb_access177').get();assert.equal(row.enabled,1);assert.equal(row.owner_employee_id,7);
 assert.equal((await pcbAccessState177(f.env,f.owner)).allowed,true);assert.equal((await pcbAccessState177(f.env,f.other)).allowed,false);
 f.db.prepare("UPDATE employees SET name='傅睿禾' WHERE id=8").run();assert.equal((await pcbAccessState177(f.env,{...f.other,name:'傅睿禾'})).allowed,false);
 f.db.prepare("UPDATE employees SET name='新顯示姓名' WHERE id=7").run();assert.equal((await pcbAccessState177(f.env,{...f.owner,name:'新顯示姓名'})).allowed,true);
 assert.equal((await pcbAccessState177(f.env,{...f.owner,status:'inactive'})).allowed,false);
});
test('ambiguous or missing designated employee fails closed, and repeating the migration never resets an off switch',async()=>{
 const f=fixture(true);assert.equal(f.db.prepare('SELECT owner_employee_id FROM pcb_access177').get().owner_employee_id,null);assert.equal((await pcbAccessState177(f.env,f.owner)).allowed,false);assert.equal((await pcbAccessState177(f.env,f.other)).allowed,false);
 const g=fixture();await g.set({enabled:false,revision:1});g.db.exec(fs.readFileSync('drizzle/0045_pcb_access177.sql','utf8'));assert.equal((await pcbAccessState177(g.env,g.other)).enabled,false);
});
test('others receive construction for metadata, photos, exports and every mutation before business data is read',async()=>{
 const f=fixture(),queries=[],prepare=f.DB.prepare;f.DB.prepare=sql=>{queries.push(sql);return prepare(sql)};let storageTouched=false;f.env.UPLOADS={get(){storageTouched=true},put(){storageTouched=true}};
 const forms=new FormData();forms.set('projectId','secret');forms.append('photo',new File(['not-read'],'x.jpg'));
 const requests=[new Request('https://app.test/api/pcb'),new Request('https://app.test/api/pcb?project=secret'),new Request('https://app.test/api/pcb?photo=secret'),new Request('https://app.test/api/pcb?export=1'),new Request('https://app.test/api/pcb',{method:'POST',headers:{origin:'https://app.test'},body:'not-json'}),new Request('https://app.test/api/pcb',{method:'POST',headers:{origin:'https://app.test'},body:forms})];
 for(const req of requests){const r=await pcbApi171(req,f.env,f.other);assert.equal(r.status,423);assert.deepEqual(await r.json(),{error:'施工中',code:'PCB_CONSTRUCTION'});assert.equal(r.headers.get('cache-control'),'no-store')}
 assert.equal(storageTouched,false);assert.ok(queries.every(sql=>!/(pcb_projects|pcb_links|pcb_items|pcb_photos|pcb_events)171/.test(sql)));
 const r=await pcbApi171(new Request('https://app.test/api/pcb'),f.env,{...f.other,permissions:[]});assert.equal(r.status,423);
 assert.equal((await pcbApi171(new Request('https://app.test/api/pcb'),f.env,null)).status,401);
});
test('only the designated account with settings permission may toggle, with audited and retry-safe results',async()=>{
 const f=fixture();assert.equal((await f.set({enabled:false,revision:1},f.other)).status,403);assert.equal((await f.set({enabled:false,revision:1},{...f.owner,permissions:['pcb.view']})).status,403);
 const off=await f.set({enabled:false,revision:1});assert.equal(off.status,200);assert.equal(off.enabled,false);assert.equal(off.revision,2);
 assert.equal((await f.set({enabled:false,revision:1})).status,200);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM pcb_access_audit177').get().n,1);
 const on=await f.set({enabled:true,revision:2});assert.equal(on.status,200);assert.equal(on.enabled,true);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM pcb_access_audit177').get().n,2);assert.equal(f.db.prepare('SELECT updated_by FROM pcb_access177').get().updated_by,7);
 assert.equal((await f.set({enabled:false,revision:1})).status,409);
});
test('turning construction off restores the original per-operation permissions',async()=>{
 const f=fixture();assert.equal((await pcbApi171(new Request('https://app.test/api/pcb'),f.env,f.owner)).status,200);
 await f.set({enabled:false,revision:1});assert.equal((await pcbApi171(new Request('https://app.test/api/pcb'),f.env,f.other)).status,200);
 assert.equal((await pcbApi171(new Request('https://app.test/api/pcb'),f.env,{...f.other,permissions:[]})).status,403);
 const r=await pcbApi171(new Request('https://app.test/api/pcb',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'project',requestId:'normal-permissions',name:'案',note:''})}),f.env,{...f.other,permissions:['pcb.view']});assert.equal(r.status,403);
 await f.set({enabled:true,revision:2});assert.equal((await pcbApi171(new Request('https://app.test/api/pcb'),f.env,f.other)).status,423);
});
test('settings rejects forged owner fields, invalid values, foreign origins and competing updates atomically',async()=>{
 const f=fixture();assert.equal((await f.set({enabled:false,revision:1,owner_employee_id:8})).status,400);assert.equal((await f.set({enabled:0,revision:1})).status,400);assert.equal((await f.set({enabled:false,revision:1},f.owner,'https://evil.test')).status,403);
 const batch=f.DB.batch;f.DB.batch=async stmts=>{f.db.prepare('UPDATE pcb_access177 SET revision=revision+1 WHERE singleton=1').run();return batch(stmts)};
 assert.equal((await f.set({enabled:false,revision:1})).status,409);assert.equal(f.db.prepare('SELECT enabled FROM pcb_access177').get().enabled,1);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM pcb_access_audit177').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM pcb_guards171').get().n,0);
});
test('authenticated status exposes no owner identifier and anonymous requests cannot inspect or modify the setting',async()=>{
 const f=fixture(),r=await pcbAccessApi177(new Request('https://app.test/api/pcb-access177'),f.env,f.other);assert.deepEqual(await r.json(),{enabled:true,allowed:false,canConfigure:false,revision:1});assert.equal((await pcbAccessApi177(new Request('https://app.test/api/pcb-access177'),f.env,null)).status,401);
});
test('full backups and arbitrary photo downloads cannot bypass construction for other administrators',async()=>{
 const f=fixture();f.db.exec("INSERT INTO pcb_projects171(id,name,created_at,updated_at) VALUES('secret','私人PCB','now','now')");
 const blocked=await backupData85(f.env,{},()=>({}),{pcbAllowed:false});assert.ok(Object.keys(blocked.tables).every(k=>!k.startsWith('pcb_')));const full=await backupData85(f.env,{},()=>({}),{pcbAllowed:true});assert.equal(full.tables.pcb_projects171[0].name,'私人PCB');
 let reads=0;f.env.UPLOADS={list:async()=>({objects:[{key:'pcb171/private/photo',uploaded:'now',size:1},{key:'receipts/normal',uploaded:'now',size:1}],truncated:true,cursor:'next'}),get:async()=>{reads++;return{body:'image'}}};
 const photos=await backupPhotos85(new Request('https://app.test/api/backup-photos'),f.env,{pcbAllowed:false}),page=await photos.json();assert.deepEqual(page.items.map(x=>x.key),['receipts/normal']);assert.equal(page.cursor,'next');
 assert.equal((await backupPhotos85(new Request('https://app.test/api/backup-photos?key=pcb171%2Fprivate%2Fphoto'),f.env,{pcbAllowed:false})).status,423);assert.equal(reads,0);
 assert.equal((await backupPhotos85(new Request('https://app.test/api/backup-photos?key=receipts%2Fnormal'),f.env,{pcbAllowed:false})).status,200);assert.equal(reads,1);
});
test('server routes derive the gate identity from the authenticated employee, including other supervisors',async()=>{
 const f=fixture(),original=globalThis.fetch;Object.assign(f.env,{SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SECRET_KEY:'secret'});globalThis.fetch=async()=>Response.json({id:'u8',email:'other@test',user_metadata:{name:'傅睿禾'}});
 try{const headers={authorization:'Bearer valid-user8'},status=await server.fetch(new Request('https://app.test/api/pcb-access177',{headers}),f.env,{});assert.equal((await status.json()).allowed,false);const denied=await server.fetch(new Request('https://app.test/api/pcb?export=1',{headers}),f.env,{});assert.equal(denied.status,423)}finally{globalThis.fetch=original}
});
test('PCB navigation remains visible while construction is enabled even without PCB view permission',()=>{
 const ctx=vm.createContext({currentUser:{id:8},canDo:()=>false,apiFetch:async()=>{},managementPages:()=>[{id:'wire'},{id:'schedule'}],pcbRender171(){},pcbOpen171(){},pcbPhotos171(){},render(){},location:{hash:'#cases'}});vm.runInContext(fs.readFileSync('dist/pcb-access177.js','utf8'),ctx);
 assert.deepEqual([...vm.runInContext('managementPages().map(p=>p.id)',ctx)],['wire','pcb','schedule']);vm.runInContext('pcbAccess177={enabled:false,loaded:true}',ctx);assert.deepEqual([...vm.runInContext('managementPages().map(p=>p.id)',ctx)],['wire','schedule']);
});
