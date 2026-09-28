import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database} from './helpers/d1.mjs';
import {scheduleApi} from '../worker/schedule.mjs';
import {parseGovernmentHolidays60} from '../worker/holidays.mjs';
import {builtinProfiles} from '../worker/wire-permissions.mjs';

test('supervisor options and multiple daily jobs retain separate people and contents',async()=>{
 const {db,DB}=database();db.exec(fs.readFileSync(new URL('../drizzle/0004_schedule.sql',import.meta.url),'utf8'));db.exec(fs.readFileSync(new URL('../drizzle/0007_schedule_work_order.sql',import.meta.url),'utf8'));db.exec(fs.readFileSync(new URL('../drizzle/0006_schedule_weekly_notes.sql',import.meta.url),'utf8'));db.exec("CREATE TABLE app_employee_settings(employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0)");db.exec("INSERT INTO employees(account_user_id,email,name,role,status,created_at,updated_at) VALUES('a','a@example.com','小明','viewer','active','now','now'),('b','b@example.com','小華','viewer','active','now','now')");
 const env={DB},boss={id:1,name:'主管',role:'supervisor',permissions:builtinProfiles[0].permissions},viewer={id:2,name:'小明',role:'viewer',permissions:builtinProfiles[2].permissions},origin='https://example.test';
 function request(input){return new Request(origin+'/api/schedule',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)})}
 const options={kind:'options',items:['組裝','測試'],contents:['備料','點檢']};assert.equal((await scheduleApi(request(options),env,viewer)).status,403);assert.equal((await scheduleApi(request(options),env,boss)).status,200);
 for(const [i,item,content,person]of [[1,'組裝','備料','小明'],[2,'測試','點檢','小華']]){const payload={id:'job-'+i,revision:0,kind:'daily',day:'2026-09-30',endDay:'2026-09-30',title:item,assignee:JSON.stringify([person]),color:'#4e8069',note:i===1?'明天交貨':'',category:JSON.stringify([content])};assert.equal((await scheduleApi(request(payload),env,boss)).status,200)}
 const response=await scheduleApi(new Request(origin+'/api/schedule?from=2026-09-30&to=2026-09-30'),env,viewer),data=await response.json();assert.equal(data.entries.length,2);assert.deepEqual(data.options,options.kind&&{items:options.items,contents:options.contents});assert.deepEqual(data.entries.map(e=>JSON.parse(e.assignee)[0]),['小明','小華']);assert.deepEqual(data.entries.map(e=>JSON.parse(e.category)[0]),['備料','點檢']);
 const jobs=[{id:'extra-1',revision:0,kind:'daily',day:'2026-10-01',endDay:'2026-10-01',title:'組裝',assignee:'["小明"]',color:'#4e8069',note:'',category:'["備料"]'},{id:'extra-2',revision:0,kind:'daily',day:'2026-10-01',endDay:'2026-10-01',title:'測試',assignee:'["小華"]',color:'#4e8069',note:'',category:'["點檢"]'}];
 assert.equal((await scheduleApi(request({kind:'batch',entries:[jobs[0],{...jobs[1],assignee:'["不存在"]'}]}),env,boss)).status,400);assert.equal(db.prepare("SELECT count(*) AS count FROM schedule_entries WHERE day='2026-10-01'").get().count,0);
 assert.equal((await scheduleApi(request({kind:'batch',entries:jobs}),env,boss)).status,200);assert.equal(db.prepare("SELECT count(*) AS count FROM schedule_entries WHERE day='2026-10-01'").get().count,2);
});
test('official holiday CSV keeps holiday names and ordinary workdays distinct',()=>{
 const csv='\ufeff西元日期,星期,是否放假,備註\n'+Array.from({length:365},(_,i)=>{const date=new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10).replaceAll('-','');return date+',一,'+(date==='20260928'?'2,教師節':'0,')}).join('\n');
 const days=parseGovernmentHolidays60(csv,2026);assert.deepEqual(days['2026-09-28'],{off:true,name:'教師節'});assert.equal(days['2026-09-30'].off,false);assert.throws(()=>parseGovernmentHolidays60('broken',2026));
});
