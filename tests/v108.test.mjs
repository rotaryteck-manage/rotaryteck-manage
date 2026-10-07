import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {runScheduledNotifications108} from '../worker/server.mjs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('10.8v runs the automatic notification scheduler every three minutes',()=>{
 const config=JSON.parse(read('wrangler.jsonc'));
 assert.deepEqual(config.triggers.crons,['*/3 * * * *']);
 assert.match(read('worker/server.mjs'),/runScheduledNotifications108\(env,event\.scheduledTime/);
});

test('10.8v records a successful automatic scheduler heartbeat without changing notification rules',async()=>{
 const {db,DB}=database();migrations85(db);
 db.prepare('INSERT INTO company_state(company_id,body,revision,updated_at) VALUES(?,?,?,?)').run('warehouse-main',JSON.stringify({projects:[],logs:[],notificationRules:[]}),1,'now');
 const result=await runScheduledNotifications108({DB},Date.parse('2026-10-07T10:21:00Z'));
 const row=db.prepare('SELECT * FROM notification_scheduler_status108 WHERE id=1').get();
 assert.equal(result.checked,true);assert.equal(row.status,'ok');assert.equal(row.scheduled_for,'2026-10-07T10:21:00.000Z');assert.equal(row.eligible,0);assert.equal(row.sent,0);
});

test('10.8v renders only a compact scheduler status line in notification settings',()=>{
 const js=read('dist/enhancements-v108.js'),build=read('build.mjs'),calls=[];
 const line={classList:{toggle:(...args)=>calls.push(args)},textContent:''},tools={querySelector:()=>line,append(){}};
 const ctx=vm.createContext({document:{querySelector:()=>tools,documentElement:{dataset:{}}},receiptTime:value=>value,console});
 vm.runInContext(js,ctx);ctx.notificationSchedulerStatus108({status:'ok',overdue:false,completed_at:'2026-10-07T10:21:01Z',eligible:2,sent:1});
 assert.match(line.textContent,/最近自動檢查/);assert.match(line.textContent,/符合 2 筆/);assert.match(line.textContent,/送出 1 台/);
 assert.match(build,/enhancements-v108\.js\?v=108/);
});

test('10.9v version label is consistent',()=>{
 for(const name of ['dist/cloud.js','dist/enhancements-v943.js','dist/enhancements-v944.js','dist/enhancements-v945.js','dist/enhancements-v106.js','dist/enhancements-v107.js','dist/enhancements-v108.js'])assert.match(read(name),/10\.9v/,name);
});
