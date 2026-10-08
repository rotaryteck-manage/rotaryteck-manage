import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('11.3v uses one mobile account box with stacked name and role',()=>{
 const js=read('dist/enhancements-v113.js'),css=read('dist/enhancements-v113.css'),build=read('build.mjs');
 assert.match(js,/account-name113/);assert.match(js,/account-role113/);assert.match(js,/currentUser\?\.name/);assert.match(js,/currentUser\?\.roleLabel/);
 assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/grid-template-rows:1fr 1fr/);assert.match(css,/width:72px/);assert.match(css,/height:40px/);
 assert.match(css,/account-name113[^}]*font-size:14px/s);assert.match(css,/account-role113[^}]*font-size:9px/s);
 assert.match(build,/enhancements-v113\.js\?v=113/);assert.match(build,/enhancements-v113\.css\?v=113/);
});

test('11.3v keeps the whole account badge as the original menu trigger',()=>{
 const js=read('dist/enhancements-v113.js');
 assert.doesNotMatch(js,/onclick\s*=/);assert.doesNotMatch(js,/addEventListener\(['"]click/);
 assert.match(js,/if\(!accountMobile113\.matches\)/);assert.match(js,/name\+' · '\+role\+' ▾'/);
});
