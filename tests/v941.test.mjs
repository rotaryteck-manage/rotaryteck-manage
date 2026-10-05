import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('v94.1 corrective layer is loaded after v94 and owns the final replenishment screen',()=>{
 const build=read('build.mjs'),fix=read('dist/enhancements-v941.js');
 assert.ok(build.indexOf('enhancements-v94.js?v=94')<build.indexOf('enhancements-v941.js?v=942'));
 assert.match(fix,/openWireRestock=function/);
 assert.match(fix,/wire-restock-delete941/);
 assert.match(fix,/刪除補貨紀錄/);
});

test('v94.1 handles notification navigation after app startup and PWA resume',()=>{
 const fix=read('dist/enhancements-v941.js');
 for(const event of ['pageshow','hashchange','popstate'])assert.match(fix,new RegExp("'"+event+"'"));
 assert.match(fix,/notificationWire/);
 assert.match(fix,/notificationPlatingProject/);
 assert.match(fix,/notificationPlatingOverview/);
 assert.doesNotMatch(fix,/sessionStorage/);
});

test('v94.1 exposes a visible cloud-save state and scoped server reads',()=>{
 const cloud=read('dist/cloud.js'),server=read('worker/server.mjs');
 assert.match(cloud,/正在上傳雲端，請勿重複操作/);
 assert.match(cloud,/10\.2v/);
 assert.match(server,/readScopedRecordStorage941/);
 assert.match(server,/json_extract\(body,'\$\.reelId'\)/);
});
