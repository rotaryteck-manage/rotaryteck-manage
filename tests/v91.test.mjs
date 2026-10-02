import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js=fs.readFileSync(new URL('../dist/enhancements-v91.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../dist/enhancements-v91.css',import.meta.url),'utf8');
const previousCss=fs.readFileSync(new URL('../dist/enhancements-v904.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8');

test('v91 puts same-person same-colour work with an identical connected date range in one box',()=>{
 const runs=[
  {start:'2026-10-05',end:'2026-10-08',color:'#aaff99',title:'FAA',content:'組裝',entries:[{id:'1'}]},
  {start:'2026-10-05',end:'2026-10-08',color:'#AAFF99',title:'廠內布置',content:'監督',entries:[{id:'2'}]},
  {start:'2026-10-06',end:'2026-10-08',color:'#aaff99',title:'另一工作',content:'測試',entries:[{id:'3'}]}
 ],context={weeklyRuns904:()=>({runs})};
 vm.runInNewContext(js.slice(js.indexOf('function weeklyGroups91'),js.indexOf('function weeklyGroupLabel91')),context);
 const result=context.weeklyGroups91({},'2026-10-05','2026-10-09');
 assert.equal(result.groups.length,2);
 assert.equal(result.groups[0].items.length,2);
 assert.deepEqual([...result.groups[0].entries.map(entry=>entry.id)],['1','2']);
});

test('v91 weekly header restores holiday names while keeping the full off-day column',()=>{
 assert.match(js,/weekly-holiday91/);
 assert.match(js,/holidayName60\(day\)/);
 assert.match(js,/weeklyOff904\(day,index\)/);
 assert.match(previousCss,/weekly-head904\.is-off904,.weekly-day-bg904\.is-off904/);
});

test('v91 mobile header keeps logo and company name on the left and account with bell on the right',()=>{
 assert.match(css,/\.header-account904 \.brand\{display:flex!important/);
 assert.match(css,/font-size:12px!important/);
 assert.match(css,/\.header-account904 \.header-actions/);
 assert.match(css,/#notification-enable82/);
});

test('v91 mobile calendar records wrap to at most two lines without ellipsis',()=>{
 assert.match(css,/max-height:30px!important/);
 assert.match(css,/white-space:normal!important/);
 assert.match(css,/text-overflow:clip!important/);
 assert.doesNotMatch(css,/text-overflow:ellipsis/);
 assert.doesNotMatch(css,/line-clamp/);
});

test('v91 assets are included after v90.4 in the production build',()=>{
 assert.match(build,/enhancements-v904\.js[\s\S]*enhancements-v91\.js/);
 assert.match(build,/enhancements-v904\.css[\s\S]*enhancements-v91\.css/);
});
