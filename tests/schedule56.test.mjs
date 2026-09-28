import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database} from './helpers/d1.mjs';
import {scheduleApi} from '../worker/schedule.mjs';
import {builtinProfiles} from '../worker/wire-permissions.mjs';
const origin='https://example.test';
function setup(){const {db,DB}=database();db.exec(fs.readFileSync(new URL('../drizzle/0004_schedule.sql',import.meta.url),'utf8'));return {db,env:{DB},people:Object.fromEntries(builtinProfiles.map(p=>[p.id,{id:p.id,name:p.name,role:p.id,permissions:p.permissions}]))};}
function request(input,method='POST'){return new Request(origin+'/api/schedule',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)});}
const entry={id:'entry-1',revision:0,kind:'weekly',day:'2026-09-28',endDay:'2026-09-30',title:'檢查圖面',assignee:'Rui',color:'#4e8069',note:'確認零件',category:''};
test('supervisor can create a weekly item and concurrent stale edits are rejected',async()=>{const {env,people}=setup();let r=await scheduleApi(request(entry),env,people.supervisor);assert.equal(r.status,200);r=await scheduleApi(request({...entry,title:'改版'}),env,people.supervisor);assert.equal(r.status,409);r=await scheduleApi(new Request(origin+'/api/schedule?from=2026-09-28&to=2026-10-04'),env,people.viewer);assert.equal((await r.json()).entries[0].title,'檢查圖面');});
test('staff cannot edit schedule, but may report their work; warehouse cannot edit weekly',async()=>{const {env,people}=setup();for(const role of ['viewer','warehouse'])assert.equal((await scheduleApi(request(entry),env,people[role])).status,403);const report={kind:'report',id:'report-1',day:'2026-09-28',body:'已點料'};assert.equal((await scheduleApi(request(report),env,people.viewer)).status,200);assert.equal((await scheduleApi(request({...report,id:'report-2'} ,'DELETE'),env,people.warehouse)).status,404);assert.equal((await scheduleApi(request({...report,id:'report-1'},'DELETE'),env,people.warehouse)).status,403);});
