import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('11.0v bounds an automatic notification check and lets the next cron recover',()=>{
 const server=read('worker/server.mjs');
 assert.match(server,/Promise\.race\(\[runNotifications85/);
 assert.match(server,/自動檢查超過 45 秒/);
 assert.match(server,/row\.status==='running'&&overdue\?'failed'/);
 assert.match(read('wrangler.jsonc'),/"\*\/3 \* \* \* \*"/);
});

test('11.0v separates waiting, no-match, send failure and scheduler failure',()=>{
 const server=read('worker/server.mjs'),ui=read('dist/enhancements-v94.js');
 for(const value of ["'scheduled'","'failed'","'check-failed'","'no-match'"])assert.match(server,new RegExp(value.replace('-','\\-')));
 for(const label of ['等待設定時間','沒有符合項目','發送失敗','自動檢查失敗'])assert.match(ui,new RegExp(label));
});

test('11.0v version label is consistent',()=>{
 for(const name of ['dist/cloud.js','dist/enhancements-v943.js','dist/enhancements-v944.js','dist/enhancements-v945.js','dist/enhancements-v106.js','dist/enhancements-v107.js','dist/enhancements-v108.js'])assert.match(read(name),/11\.0v/,name);
});
