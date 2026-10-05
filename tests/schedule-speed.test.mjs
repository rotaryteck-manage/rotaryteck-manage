import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/d1.mjs';
import {migrations85} from './helpers/migrations85.mjs';
import {scheduleApi} from '../worker/schedule.mjs';

test('schedule only counts photos in the requested range and keeps visible photo counts',async()=>{
 const {db,DB}=database();migrations85(db);
 db.exec("INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,created_at,updated_at) VALUES ('new-item','material','2026-10-05','2026-10-05','新料件','','now','now'),('old-item','material','2025-01-05','2025-01-05','舊料件','','now','now')");
 db.exec("INSERT INTO schedule_reports(id,day,body,author_id,author_name,created_at) VALUES ('new-report','2026-10-05','完成','1','主管','now'),('old-report','2025-01-05','完成','1','主管','now')");
 for(const [id,item] of [['new-material-photo','new-item'],['old-material-photo','old-item']])db.prepare('INSERT INTO schedule_material_photos(id,material_id,photo_key,created_at) VALUES (?,?,?,?)').run(id,item,id,'now');
 for(const [id,item] of [['new-report-photo','new-report'],['old-report-photo','old-report']])db.prepare('INSERT INTO schedule_report_photos(id,report_id,photo_key,created_at) VALUES (?,?,?,?)').run(id,item,id,'now');
 const queries=[],env={DB:{...DB,prepare(sql){queries.push(sql);return DB.prepare(sql)}}};
 const response=await scheduleApi(new Request('https://example.test/api/schedule?from=2026-10-01&to=2026-10-10'),env,{id:1,name:'主管',permissions:['schedule.view']});
 assert.equal(response.status,200);const data=await response.json();
 assert.equal(data.entries.find(e=>e.id==='new-item').photo_count,1);
 assert.equal(data.reports.find(r=>r.id==='new-report').photo_count,1);
 assert.equal(data.entries.some(e=>e.id==='old-item'),false);
 assert.equal(data.reports.some(r=>r.id==='old-report'),false);
 for(const sql of queries.filter(sql=>sql.includes('COUNT(*) AS extra_count')))assert.match(sql,/JOIN .* WHERE .* BETWEEN \? AND \?/);
 assert.equal(queries.some(sql=>/^CREATE TABLE|^PRAGMA table_info/i.test(sql)),false);
});
