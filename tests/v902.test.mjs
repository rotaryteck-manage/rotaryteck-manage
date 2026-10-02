import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {closureStateChanged902} from '../worker/alerts90.mjs';

test('v90.2 report timestamps are rendered in Asia/Taipei',()=>{
 const source=fs.readFileSync(new URL('../dist/uploads.js',import.meta.url),'utf8');
 const start=source.indexOf('function receiptTime');
 const end=source.indexOf('\n',start);
 const context={Intl,Date};
 vm.runInNewContext(source.slice(start,end),context);
 assert.equal(context.receiptTime('2026-10-02T09:22:00.000Z'),'2026-10-02 17:22');
});

test('v90.2 work report UI labels original and modified timestamps',()=>{
 const schedule=fs.readFileSync(new URL('../dist/schedule-v67.js',import.meta.url),'utf8');
 const worker=fs.readFileSync(new URL('../worker/schedule.mjs',import.meta.url),'utf8');
 const migration=fs.readFileSync(new URL('../drizzle/0021_schedule_report_updated_at.sql',import.meta.url),'utf8');
 assert.match(schedule,/回報時間：/);
 assert.match(schedule,/最後修改：/);
 assert.match(schedule,/receiptTime\(r\.created_at\)/);
 assert.match(worker,/SET body=\?,updated_at=\?/);
 assert.match(worker,/SET photo_key=\?,photo_name=\?,updated_at=\?/);
 assert.match(migration,/updated_at TEXT NOT NULL/);
});

test('v90.2 closure notification ignores a republished bulletin with unchanged status and date',()=>{
 const previous={status:'closed',effective_date:'2026-10-03',source_id:'old'};
 assert.equal(closureStateChanged902({status:'closed',effectiveDate:'2026-10-03',sourceId:'new'},previous),false);
 assert.equal(closureStateChanged902({status:'open',effectiveDate:'2026-10-03',sourceId:'new'},previous),true);
 assert.equal(closureStateChanged902({status:'closed',effectiveDate:'2026-10-04',sourceId:'new'},previous),true);
});

test('v90.2 holiday and closure administration shows immediate delivery and source health',()=>{
 const ui=fs.readFileSync(new URL('../dist/enhancements-v88.js',import.meta.url),'utf8');
 const status=fs.readFileSync(new URL('../dist/enhancements-v901.js',import.meta.url),'utf8');
 const server=fs.readFileSync(new URL('../worker/server.mjs',import.meta.url),'utf8');
 assert.match(ui,/官方公告後立即發送/);
 assert.match(ui,/existing\.recipientMode!=='selected'/);
 assert.match(status,/政府國定假日資料狀態/);
 assert.match(server,/holiday:government-calendar/);
 assert.match(server,/status='ready'/);
});
