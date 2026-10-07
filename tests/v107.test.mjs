import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('10.7v changes only the daily edit dialog order and initial collapsed state',()=>{
 const js=read('dist/enhancements-v107.js'),build=read('build.mjs');
 assert.match(js,/scheduleTab56!==['"]daily['"]/);
 assert.match(js,/\.sort\(scheduleDailyOrder107\)/);
 assert.match(js,/sort_index:index\+1/);
 assert.match(js,/scheduleData56\.entries=original/);
 assert.match(js,/schedule-task60\[data-existing-id\]/);
 assert.match(js,/classList\.add\(['"]is-collapsed88['"]\)/);
 assert.match(js,/aria-expanded['"],['"]false/);
 assert.match(build,/enhancements-v107\.js\?v=107/);
});

test('10.9v version label is consistent',()=>{
 for(const name of ['dist/enhancements-v943.js','dist/enhancements-v944.js','dist/enhancements-v945.js','dist/enhancements-v106.js','dist/enhancements-v107.js','dist/cloud.js'])
  assert.match(read(name),/10\.9v/,name);
});

test('daily edit opens in stored order, collapses existing cards and restores shared data',()=>{
 const entries=[
  {id:'third',kind:'daily',day:'2026-10-07',end_day:'2026-10-07',sort_index:3,created_at:'2026-10-07T01:03:00Z'},
  {id:'first',kind:'daily',day:'2026-10-07',end_day:'2026-10-07',sort_index:1,created_at:'2026-10-07T01:01:00Z'},
  {id:'second',kind:'daily',day:'2026-10-07',end_day:'2026-10-07',sort_index:2,created_at:'2026-10-07T01:02:00Z'}
 ],collapsed=[],expanded=[];
 const tasks=entries.map(item=>({classList:{add:value=>collapsed.push([item.id,value])},querySelector:()=>({setAttribute:(name,value)=>expanded.push([item.id,name,value])})}));
 const list={querySelectorAll:()=>tasks};let captured=[];
 let context;
 context=vm.createContext({
  scheduleTab56:'daily',scheduleAnchor56:'2026-10-07',scheduleData56:{entries},
  scheduleEntryDialog56(){captured=context.scheduleData56.entries.map(item=>[item.id,item.sort_index]);},
  document:{documentElement:{dataset:{}},querySelector:()=>list}
 });
 vm.runInContext(read('dist/enhancements-v107.js'),context);
 vm.runInContext("scheduleEntryDialog56({id:'first',day:'2026-10-07'})",context);
 assert.deepEqual(captured,[['first',1],['second',2],['third',3]]);
 assert.equal(context.scheduleData56.entries,entries);
 assert.equal(collapsed.length,3);
 assert.equal(expanded.length,3);
});
