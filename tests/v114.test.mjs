import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const canvasSource=fs.readFileSync('dist/enhancements-v91.js','utf8');
const buildSource=fs.readFileSync('build.mjs','utf8');

test('11.6v restores a visible text color before drawing copied-image notes',()=>{
  assert.match(canvasSource,/cell\(labelW,y,width-labelW,noteHeight,'#fff5e8'\);ctx\.fillStyle='#673d16';ctx\.font='bold 21px sans-serif';noteLines\.forEach/);
});

test('11.6v refreshes the copied-image script cache only',()=>{
  assert.match(buildSource,/enhancements-v91\.js\?v=114/);
});
