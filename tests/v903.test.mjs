import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const v903=fs.readFileSync(new URL('../dist/enhancements-v903.js',import.meta.url),'utf8');
const v901=fs.readFileSync(new URL('../dist/enhancements-v901.js',import.meta.url),'utf8');
const calendar=fs.readFileSync(new URL('../dist/schedule-v67.js',import.meta.url),'utf8');
const mobile=fs.readFileSync(new URL('../dist/mobile-v78.js',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8');

test('v90.3 daily calendar is Sunday-first without changing the actual date cells',()=>{
 assert.match(calendar,/\['日','一','二','三','四','五','六'\]/);
 assert.match(calendar,/offset=first\.getUTCDay\(\)/);
 assert.match(calendar,/Math\.ceil\(\(offset\+count\)\/7\)\*7/);
 assert.match(mobile,/\['日','一','二','三','四','五','六'\]/);
});

test('v90.3 daily editor keeps a neutral hidden color and weekly editor keeps its palette input',()=>{
 assert.match(v901,/weekly\?'<label class="field schedule-color901">色塊<input type="color"/);
 assert.match(v901,/:\s*'<input type="hidden" name="color-/);
 assert.match(v903,/input\[type=color\]\[name\^="color-"\]/);
 assert.match(v903,/快速點兩下設定/);
});

test('v90.3 weekly grid stays horizontal and adds weekend columns only when used',()=>{
 assert.match(v903,/return on\(6\)\?7:on\(5\)\?6:5/);
 assert.match(v903,/一','二','三','四','五','六','日/);
 assert.match(v903,/weekly-person903/);
 assert.match(v903,/day\.slice\(5\)\.replace\('-','\/'\)/);
 assert.match(v903,/items\.length>2/);
});

test('v90.3 notification descriptions and simulations match real scheduling behavior',()=>{
 assert.match(v903,/放假前一天 /);
 assert.match(v903,/官方公告確認後立即發送（每 5 分鐘檢查）/);
 assert.match(v903,/模擬有國定假日/);
 assert.match(v903,/模擬停止上班/);
 assert.match(v903,/模擬恢復上班/);
 assert.match(v903,/rule\.type==='holiday'.*'17:00'/s);
});

test('v90.3 assets are included in the authenticated production build',()=>{
 assert.match(build,/enhancements-v903\.js/);
 assert.match(build,/enhancements-v903\.css/);
});
