import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js=fs.readFileSync(new URL('../dist/enhancements-v91.js',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build.mjs',import.meta.url),'utf8');

test('v91.1 weekly web boxes keep at least two work-line heights',()=>{
 assert.match(js,/Math\.max\(2,item\.maxItems\)\*30\+10/);
});

test('v91.1 copied weekly image keeps the same minimum two-line height',()=>{
 assert.match(js,/Math\.max\(74,18\+groupLines/);
 assert.match(js,/heights:\[74\]/);
});

test('v91.1 vertically centres a single line in copied weekly boxes',()=>{
 assert.match(js,/const totalLines=groupLines\[i\]\[j\]/);
 assert.match(js,/textY=yy\+\(gh-totalLines\*28\)\/2\+22/);
});

test('v91.1 cache version is refreshed for amended weekly assets',()=>{
 assert.match(build,/enhancements-v91\.js\?v=911/);
 assert.match(build,/enhancements-v91\.css\?v=911/);
});
