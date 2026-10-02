import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {closureDateActive901} from '../worker/alerts90.mjs';
import {cleanupNotificationInbox89} from '../worker/server.mjs';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';

test('v90.1 closure freshness accepts only today or tomorrow',()=>{
 assert.equal(closureDateActive901({effectiveDate:'2026-10-02'},'2026-10-02'),true);
 assert.equal(closureDateActive901({effectiveDate:'2026-10-03'},'2026-10-02'),true);
 assert.equal(closureDateActive901({effectiveDate:'2026-08-23'},'2026-10-02'),false);
 assert.equal(closureDateActive901({effectiveDate:'2026-10-04'},'2026-10-02'),false);
});

test('v90.1 stale closure state is cleared and old closure inbox notices are removed',()=>{
 const server=fs.readFileSync(new URL('../worker/server.mjs',import.meta.url),'utf8');
 const holidays=fs.readFileSync(new URL('../worker/holidays.mjs',import.meta.url),'utf8');
 assert.match(server,/closureDateActive901\(result,day\)/);
 assert.match(server,/DELETE FROM notification_inbox88 WHERE category='停班提醒'/);
 assert.match(server,/status='unknown',source_id='',effective_date=''/);
 assert.match(holidays,/effective_date>=\?/);
});

test('v90.1 cleanup removes the deployed August false alert even when closure rule is disabled',async()=>{
 const {db,DB}=database();migrations85(db);
 db.exec("INSERT INTO employees(id,email,name,role,status,created_at,updated_at) VALUES(1,'a@b.c','主管','supervisor','active','now','now')");
 db.prepare("INSERT INTO notification_inbox88(id,employee_id,category,title,message,target_url,source_key,created_at) VALUES('old',1,'停班提醒','錯誤停班','舊公告','/?notificationDay=2026-08-23#schedule','closure:test','2026-10-02T00:00:00Z')").run();
 db.prepare("INSERT INTO notification_source_state90(source_key,status,source_id,effective_date,detail) VALUES('closure:高雄市:左營區','closed','old','2026-08-23','{}')").run();
 await cleanupNotificationInbox89({DB},Date.parse('2026-10-02T04:00:00Z'));
 assert.equal(db.prepare("SELECT COUNT(*) n FROM notification_inbox88 WHERE id='old'").get().n,0);
 const state=db.prepare("SELECT status,effective_date FROM notification_source_state90 WHERE source_key='closure:高雄市:左營區'").get();assert.equal(state.status,'unknown');assert.equal(state.effective_date,'');
});

test('v90.1 browser UI includes account menu and per-work weekly days, people and colors',()=>{
 const js=fs.readFileSync(new URL('../dist/enhancements-v901.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../dist/enhancements-v901.css',import.meta.url),'utf8');
 const build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8');
 for(const pattern of [/account-menu901/,/管理後台/,/更換帳號/,/schedule-days901/,/執行日期（可複選）/,/name="color-/,/複製上週/,/新增備註/,/其他功能/])assert.match(js,pattern);
 assert.match(css,/schedule-action-controls\{display:none/);
 assert.match(css,/schedule-choice88\.is-open88/);
 assert.match(build,/enhancements-v901\.js/);
 assert.match(build,/enhancements-v901\.css/);
});
