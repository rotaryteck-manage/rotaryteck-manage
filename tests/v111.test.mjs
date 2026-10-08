import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('11.1v shows the independent next notification check time',()=>{
 const js=read('dist/enhancements-v108.js'),ctx=vm.createContext({document:{querySelector:()=>null,documentElement:{dataset:{}}},Intl,Date,setInterval:()=>0});
 vm.runInContext(js,ctx);
 assert.equal(ctx.notificationNextCheck111(Date.parse('2026-10-08T01:07:39Z')),'09:09');
 assert.equal(ctx.notificationNextCheck111(Date.parse('2026-10-08T01:09:01Z')),'09:12');
});

test('11.1v silently refreshes only after five idle minutes and preserves exact views',()=>{
 const js=read('dist/enhancements-v111.js');
 assert.match(js,/5\*60\*1000/);
 assert.match(js,/\/api\/state/);
 assert.match(js,/context\.hash==='#admin'\)renderAdmin/);
 assert.match(js,/context\.ledger&&context\.hash==='#plating'/);
 assert.match(js,/ledgerFilter=context\.ledgerFilter/);
 assert.match(js,/scrollTo\(context\.scrollX,context\.scrollY\)/);
 assert.match(js,/JSON\.stringify\(state\)!==JSON\.stringify\(confirmed\)/);
 assert.doesNotMatch(js,/location\.reload/);
});

test('11.1v stacks equal-size version and last data update boxes',()=>{
 const js=read('dist/enhancements-v111.js'),css=read('dist/enhancements-v111.css'),build=read('build.mjs');
 assert.match(js,/11\.1v/);assert.match(js,/已更新/);
 assert.match(css,/flex-direction:column/);assert.match(css,/width:72px/);assert.match(css,/height:20px/);
 assert.match(build,/enhancements-v111\.js\?v=111/);assert.match(build,/enhancements-v111\.css\?v=111/);
});
