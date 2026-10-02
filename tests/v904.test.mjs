import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js=fs.readFileSync(new URL('../dist/enhancements-v904.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../dist/enhancements-v904.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8');

test('v90.4 merges only consecutive weekly work with the same person, item, content and color',()=>{
 const context={weeklyContent903:entry=>entry.content||'',scheduleShift56:(day,amount)=>{const date=new Date(day+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10)}};
 vm.runInNewContext(js.slice(js.indexOf('function weeklyRunKey904'),js.indexOf('function weeklyRunDialog904')),context);
 const row={entries:[
  {id:'1',day:'2026-10-05',end_day:'2026-10-06',title:'FAA',content:'製作',color:'#abcdef'},
  {id:'2',day:'2026-10-07',end_day:'2026-10-08',title:'FAA',content:'製作',color:'#abcdef'},
  {id:'3',day:'2026-10-09',end_day:'2026-10-09',title:'FAA',content:'監督',color:'#abcdef'}
 ]};
 const result=context.weeklyRuns904(row,'2026-10-05','2026-10-09');
 assert.equal(result.runs.length,2);
 assert.equal(result.runs[0].start,'2026-10-05');
 assert.equal(result.runs[0].end,'2026-10-08');
 assert.equal(result.runs[0].entries.length,2);
});

test('v90.4 weekly view and export share dynamic 5/6/7-day connected bars',()=>{
 assert.match(js,/weeklyVisibleDays903\(start\)/);
 assert.match(js,/weekly-person-row904/);
 assert.match(js,/grid-column:'\+\(left\+2\)\+' \/ '\+\(right\+3\)/);
 assert.match(js,/width=1549,dayW=\(width-labelW\)\/count/);
 assert.match(css,/weekly-run904/);
 assert.match(css,/weekly-head904\.is-off904,.weekly-day-bg904\.is-off904/);
});

test('v90.4 removes the outside admin button and keeps a one-line mobile logo, account and bell header',()=>{
 assert.match(js,/\.header-actions>\.admin-back-button/);
 assert.match(css,/header\.header-account904/);
 assert.match(css,/flex-wrap:nowrap!important/);
 assert.match(css,/#notification-enable82/);
});

test('v90.4 recalculates warehouse completed colours from edited prepared and stock values',()=>{
 assert.match(js,/prepared>=need\*sets&&stock>=prepared/);
 assert.match(js,/row\.dataset\.ready72=complete\?'yes':'no'/);
});

test('v90.4 assets are included after v90.3 in the production build',()=>{
 assert.match(build,/enhancements-v903\.js[\s\S]*enhancements-v904\.js/);
 assert.match(build,/enhancements-v903\.css[\s\S]*enhancements-v904\.css/);
});
