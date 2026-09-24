import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/d1.mjs';
import {cleanupDeleted} from '../worker/server.mjs';
import {splitState,joinRecords,recordKey} from '../worker/state-codec.mjs';
const day=86400000,now=Date.parse('2026-09-24T00:00:00Z');
async function setup(state){const {db,DB}=database();await cleanupDeleted({DB},now);db.exec('DELETE FROM state_records');for(const [key,value] of Object.entries(splitState(state)))db.prepare('INSERT INTO state_records(record_key,body,revision) VALUES (?,?,1)').run(key,JSON.stringify(value));const read=()=>joinRecords(Object.fromEntries(db.prepare('SELECT record_key,body FROM state_records').all().map(x=>[x.record_key,x.body===null?undefined:JSON.parse(x.body)])));return{db,DB,read};}
test('7-day retention grants legacy grace, preserves restored/active items and purges children atomically',async()=>{
 const {db,DB,read}=await setup({projects:[],logs:[{id:'audit',action:'刪除',time:'now'}],deletedProjects:[{project:{id:'wh'},deletedAt:'2020-01-01'}],platingProjects:[{id:'p',archived:true,purgeAfter:new Date(now).toISOString()},{id:'active'}],wireTypes:[{id:'w',archived:true,purgeAfter:new Date(now).toISOString()},{id:'restored',purgeAfter:new Date(now).toISOString()}],wireReels:[{id:'r',wireId:'w',photos:[{id:'photo'}]},{id:'keep',wireId:'restored',photos:[]}],wireCuts:[{id:'cut',reelId:'r',time:'now'}]});
 await cleanupDeleted({DB},now);let s=read();assert.deepEqual(s.wireTypes.map(x=>x.id),['restored']);assert.deepEqual(s.wireReels.map(x=>x.id),['keep']);assert.equal(s.wireCuts.length,0);assert.equal(s.platingProjects.length,1);assert.equal(s.logs.length,1);assert.equal(s.deletedProjects[0].purgeAfter,new Date(now+7*day).toISOString());assert.equal(db.prepare('SELECT body FROM state_records WHERE record_key=?').get(recordKey('wireTypes','w')).body,null);
 await cleanupDeleted({DB},now+7*day-1);assert.equal(read().deletedProjects.length,1);
 await cleanupDeleted({DB},now+7*day);assert.equal(read().deletedProjects.length,0);
 const removed=[];await cleanupDeleted({DB,UPLOADS:{async list({prefix}){return{objects:[{key:prefix+'image'}],truncated:false}},async delete(keys){removed.push(...keys)}}},now+7*day);assert(removed.includes('wire-photos/photo'));assert(removed.includes('thumbnails/wire-photos/photo'));assert.equal(db.prepare('SELECT count(*) AS n FROM retention_photo_jobs').get().n,0);
});
test('photo cleanup failure keeps durable retry job',async()=>{const {DB,db}=await setup({projects:[],deletedProjects:[],logs:[],wireTypes:[{id:'w',archived:true,purgeAfter:new Date(now).toISOString()}],wireReels:[{id:'r',wireId:'w',photos:[{id:'photo'}]}],wireCuts:[]});await assert.rejects(cleanupDeleted({DB,UPLOADS:{async delete(){throw Error('offline')}}},now),/offline/);assert.equal(db.prepare('SELECT count(*) AS n FROM retention_photo_jobs').get().n,1);});
