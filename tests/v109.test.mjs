import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('10.9v constrains notification administration panels without changing notification logic',()=>{
 const css=read('dist/enhancements-v109.css'),build=read('build.mjs');
 assert.match(css,/#notification-admin-root81\s*\{[^}]*flex:1 1 100%/s);
 assert.match(css,/#notification-admin-root81\s*\{[^}]*min-width:0/s);
 assert.match(css,/#notification-admin-root81\s*\{[^}]*max-width:100%/s);
 assert.match(css,/\.notification-scheduler108\s*\{[^}]*overflow-wrap:anywhere/s);
 assert.match(build,/enhancements-v109\.css\?v=109/);
 assert.doesNotMatch(css,/position|transform|margin-left|left:|right:/);
});
