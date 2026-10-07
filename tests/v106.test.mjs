import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('10.6v moves only the existing work-report button into the fixed modal footer',()=>{
 const js=read('dist/enhancements-v106.js'),css=read('dist/enhancements-v106.css'),build=read('build.mjs');
 assert.match(js,/scheduleDayRecordBefore106\.apply\(this,args\)/);
 assert.match(js,/\.schedule-records67 #schedule-add-report/);
 assert.match(js,/footer\.prepend\(button\)/);
 assert.match(css,/modal-foot\[data-work-record-footer106\]/);
 assert.match(css,/justify-content:space-between/);
 assert.match(build,/enhancements-v106\.js\?v=106/);
 assert.match(build,/enhancements-v106\.css\?v=106/);
});

test('10.9v version label is consistent',()=>{
 for(const name of ['dist/enhancements-v943.js','dist/enhancements-v944.js','dist/enhancements-v945.js','dist/cloud.js'])
  assert.match(read(name),/10\.9v/,name);
});
