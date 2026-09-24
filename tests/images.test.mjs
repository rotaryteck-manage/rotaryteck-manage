import {database as sqliteDatabase} from './helpers/d1.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {images} from '../worker/server.mjs';
globalThis.fetch=async(input,init={})=>{const auth=new Headers(init.headers).get('authorization')||'';const id=auth.slice(7);return id?Response.json({id,email:id+'@example.com',user_metadata:{name:id}}):Response.json({}, {status:401});};
function database(){const {db,DB}=sqliteDatabase();const now=new Date().toISOString();db.prepare("INSERT INTO employees (account_user_id,email,name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run('owner','owner@example.com','主管','supervisor','active',now,now);db.prepare("INSERT INTO employees (account_user_id,email,name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run('viewer','viewer@example.com','一般','viewer','active',now,now);db.prepare("INSERT INTO employees (account_user_id,email,name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run('warehouse','warehouse@example.com','庫房','warehouse','active',now,now);db.prepare("INSERT INTO company_state (company_id,body,revision,updated_at) VALUES (?,?,?,?)").run('warehouse-main',JSON.stringify({projects:[],deletedProjects:[{project:{id:'A'}}],platingProjects:[{id:'P',shipments:[{id:'S1'},{id:'S2'}]},{id:'Q',shipments:[{id:'S1'}]}]}),1,now);return DB;}
test('private images, role enforcement, project ownership and persistent receipts',async()=>{const objects=new Map(),env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'publishable',SUPABASE_SECRET_KEY:'secret',DB:database(),UPLOADS:{async put(key,body,meta){objects.set(key,{body,...meta,key,uploaded:new Date()});},async get(key){return objects.get(key);},async head(key){return objects.get(key);},async list({prefix}){return {objects:[...objects.values()].filter(x=>x.key.startsWith(prefix)),truncated:false};},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);}}};
 const req=(path,method='GET',body,user='owner',origin='https://test.local')=>new Request('https://test.local'+path,{method,headers:{...(user?{Authorization:'Bearer '+user}:{}),origin,'X-File-Name':encodeURIComponent('收據.png')},body});
 const png=Uint8Array.from([137,80,78,71,13,10,26,10,0]);
 assert.equal((await images(req('/api/logo','GET',undefined,''),env)).status,401);
 assert.equal((await images(req('/api/logo','POST',png,'owner','https://evil.local'),env)).status,403);
 assert.equal((await images(req('/api/logo','POST','<svg/>'),env)).status,415);
 assert.equal((await images(req('/api/logo','POST',new Uint8Array(2097153)),env)).status,413);
 assert.equal((await images(req('/api/logo','POST',png),env)).status,200);
 assert.equal((await (await images(req('/api/logo?meta=1'),env)).json()).exists,true);
 assert.equal((await images(req('/api/logo'),env)).headers.get('Content-Type'),'image/png');
 assert.equal((await images(req('/api/logo','POST',png,'viewer'),env)).status,403);
 const uploaded=await (await images(req('/api/receipts?project=A','POST',png),env)).json();assert.ok(uploaded.id);
 const list=await (await images(req('/api/receipts?project=A'),env)).json();assert.equal(list.items.length,1);assert.equal(list.items[0].name,'收據.png');
 assert.equal((await images(req('/api/receipts?project=A&id='+uploaded.id),env)).status,200);
 assert.equal((await images(req('/api/receipts?project=A&id='+uploaded.id,'DELETE',undefined,'viewer'),env)).status,403);
 assert.equal((await images(req('/api/receipts?project=A&id='+uploaded.id,'DELETE',undefined,'warehouse'),env)).status,200);
 assert.equal((await (await images(req('/api/receipts?project=A'),env)).json()).items.length,0);
 await images(req('/api/receipts?project=A','POST',png),env);
 assert.equal((await images(req('/api/receipts?project=A','DELETE',undefined,'viewer'),env)).status,403);
 assert.equal((await images(req('/api/receipts?project=A','DELETE'),env)).status,200);assert.equal((await (await images(req('/api/receipts?project=A'),env)).json()).items.length,0);
 const photoUrl='/api/plating-photos?project=P&shipment=S1';
 assert.equal((await images(req(photoUrl,'POST',png,'viewer'),env)).status,403);
 assert.equal((await images(req(photoUrl,'POST',png,'warehouse','https://evil.local'),env)).status,403);
 assert.equal((await images(req(photoUrl,'POST',new Uint8Array(2097153),'warehouse'),env)).status,413);
 const photo=await (await images(req(photoUrl,'POST',png,'warehouse'),env)).json();assert.ok(photo.id);
 const photos=await (await images(req(photoUrl,'GET',undefined,'viewer'),env)).json();assert.equal(photos.items.length,1);assert.equal(photos.items[0].actor,'庫房');
 assert.equal((await images(req(photoUrl+'&id='+photo.id,'GET',undefined,'viewer'),env)).status,200);
 for(const path of ['/api/plating-photos?project=P&shipment=S2','/api/plating-photos?project=Q&shipment=S1','/api/receipts?project=A']){assert.equal((await images(req(path+'&id='+photo.id),env)).status,404);}
 assert.equal((await images(req('/api/plating-photos?project=P&shipment=missing','POST',png),env)).status,404);
 assert.equal(photos.items[0].kind,'dispatch');
 assert.equal((await images(req(photoUrl+'&kind=invalid','POST',png,'warehouse'),env)).status,400);
 const area=await (await images(req(photoUrl+'&kind=area','POST',png,'warehouse'),env)).json();
 assert.equal((await (await images(req(photoUrl),env)).json()).items.find(x=>x.id===area.id).kind,'area');
 assert.equal((await images(req(photoUrl+'&export=1','GET',undefined,'viewer'),env)).status,403);
 assert.equal((await images(req(photoUrl+'&export=1','GET',undefined,'warehouse'),env)).status,403);
 await images(req(photoUrl+'&id='+area.id,'DELETE',undefined,'warehouse'),env);
 assert.equal((await images(req(photoUrl+'&id='+photo.id,'DELETE',undefined,'viewer'),env)).status,403);
 assert.equal((await images(req(photoUrl+'&id='+photo.id,'DELETE',undefined,'warehouse'),env)).status,200);
 assert.equal((await (await images(req(photoUrl),env)).json()).items.length,0);
 assert.equal((await images(req('/api/receipts?project=missing','POST',png),env)).status,404);
});

test('thumbnail multipart uploads preserve originals, private access, lists and cleanup',async()=>{
 const objects=new Map(),env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret',DB:database(),UPLOADS:{async put(key,body,meta){objects.set(key,{body,...meta,key,uploaded:new Date()});},async get(k){return objects.get(k)},async head(k){return objects.get(k)},async list({prefix}){return {objects:[...objects.values()].filter(x=>x.key.startsWith(prefix)),truncated:false}},async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k)}}};
 const original=new Uint8Array([137,80,78,71,13,10,26,10,0]),thumb=new Uint8Array([255,216,255,0]);
 const req=(path,method='GET',body,user='owner')=>new Request('https://test.local'+path,{method,headers:{Origin:'https://test.local',...(user?{Authorization:'Bearer '+user}:{})},body});
 for(const path of ['/api/logo','/api/receipts?project=A','/api/plating-photos?project=P&shipment=S1']){
 const form=new FormData();form.append('photo',new Blob([original],{type:'image/png'}),'original.png');form.append('thumbnail',new Blob([thumb],{type:'image/jpeg'}),'thumbnail.jpg');
 const response=await images(req(path,'POST',form),env);assert.equal(response.status,200);const {id}=await response.json();const url=path==='/api/logo'?path:path+'&id='+id;const small=url+(url.includes('?')?'&':'?')+'thumb=1';
 assert.deepEqual(new Uint8Array(await(await images(req(url),env)).arrayBuffer()),original);
 const preview=await images(req(small),env);assert.equal(preview.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(new Uint8Array(await preview.arrayBuffer()),thumb);
 assert.equal((await images(req(small,'GET',undefined,''),env)).status,401);
 if(path!=='/api/logo'){const list=await(await images(req(path),env)).json();assert.equal(list.items.length,1);await images(req(url,'DELETE'),env);assert.equal((await images(req(small),env)).status,404);}
 }
 assert.equal(objects.size,2);
 await images(req('/api/logo','POST',original),env);assert.equal(objects.size,1);assert.deepEqual(new Uint8Array(await(await images(req('/api/logo?thumb=1'),env)).arrayBuffer()),original);
});
