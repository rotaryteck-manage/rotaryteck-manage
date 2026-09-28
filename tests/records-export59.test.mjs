import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database} from './helpers/d1.mjs';
import {recordsExportApi} from '../worker/records-export.mjs';
import {builtinProfiles} from '../worker/wire-permissions.mjs';

test('selected records honor date and permission; photo manifest matches selected reports',async()=>{
 const {db,DB}=database();db.exec(fs.readFileSync(new URL('../drizzle/0004_schedule.sql',import.meta.url),'utf8'));db.exec(fs.readFileSync(new URL('../drizzle/0007_schedule_work_order.sql',import.meta.url),'utf8'));db.exec(fs.readFileSync(new URL('../drizzle/0006_schedule_weekly_notes.sql',import.meta.url),'utf8'));db.exec(fs.readFileSync(new URL('../drizzle/0008_schedule_material_photos.sql',import.meta.url),'utf8'));
 const insert=db.prepare('INSERT INTO schedule_entries(id,kind,day,end_day,title,assignee,color,note,category,quantity,project_id,author_id,author_name,created_at,updated_at,revision) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
 insert.run('week','weekly','2026-09-28','2026-10-02','週工作','["Rui"]','#4e8069','','',0,'','1','主管','2026-09-28','2026-09-28',1);
 insert.run('daily','daily','2026-09-29','2026-09-29','每日安排','','#4e8069','','',0,'','1','主管','2026-09-29','2026-09-29',1);
 db.prepare('INSERT INTO schedule_reports(id,entry_id,day,body,photo_key,photo_name,author_id,author_name,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run('report','','2026-09-29','今日完成','schedule/report/pic','照片.png','2','Rui','2026-09-29T05:00:00Z');
 const env={DB},readState=async()=>({projects:[],platingProjects:[]}),ownerKey=async()=>'';
 const url='https://example.test/api/records-export?from=2026-09-29&to=2026-09-29&types=weekly,daily&photos=1';
 const viewer={role:'viewer',permissions:builtinProfiles.find(x=>x.id==='viewer').permissions};
 assert.equal((await recordsExportApi(new Request(url),env,viewer,readState,ownerKey)).status,403);
 const manager={role:'viewer',permissions:['records.export']};const response=await recordsExportApi(new Request(url),env,manager,readState,ownerKey),data=await response.json();
 assert.equal(response.status,200);assert.equal(data.weekly.length,1);assert.equal(data.daily.length,2);assert.equal(data.photos.length,1);assert.match(data.photos[0].url,/schedule-photo\?id=report&export=1/);
 const outside=await recordsExportApi(new Request(url.replace('2026-09-29&to=2026-09-29','2026-10-05&to=2026-10-05')),env,manager,readState,ownerKey);
 assert.deepEqual((await outside.json()).photos,[]);
});
