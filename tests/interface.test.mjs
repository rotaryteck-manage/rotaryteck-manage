import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const uploadSource=fs.readFileSync(new URL('../dist/uploads.js',import.meta.url),'utf8');
const conciseFunction=uploadSource.match(/^function conciseProjectLog.*$/m)?.[0];

function concise(action,detail){
 const context={result:'',input:{action,detail},project:{name:'SJ2222'}};
 vm.runInNewContext(conciseFunction+';result=conciseProjectLog(input,project);',context);
 return context.result;
}

test('project material history shows only non-zero received or issued quantities',()=>{
 const oldDetail='A櫃 1層；籃數 1；固定座：每套 10 × 1 套；收到 0／領出 4、外殼：每套 10 × 1 套；收到 0／領出 0、軸承：每套 20 × 1 套；收到 0／領出 0';
 assert.equal(concise('更新零件與收／領料',oldDetail),'領料：固定座 4件');
 assert.equal(concise('更新零件與收／領料','A櫃 1層；籃數 1；固定座：每套 10 × 1 套；收到 0／領出 0'),'');
 assert.equal(concise('更新零件與收／領料','收料：外殼 3件｜修改：外殼｜櫃位：A櫃 2層'),'收料：外殼 3件');
});

test('warehouse and case lists share the full card width and aligned columns',()=>{
 const css=fs.readFileSync(new URL('../dist/admin.css',import.meta.url),'utf8');
 assert.match(css,/\.case-column-head\{margin-left:16px;margin-right:16px\}/);
 assert.match(css,/\.warehouse-fold\[open\]>\.workspace\{width:100%;/);
 assert.doesNotMatch(css,/\.warehouse-fold>\.workspace\{width:min\(100%,1000px\)/);
});

test('case board is compact, divided into three lanes and supports production batches',()=>{
 const source=fs.readFileSync(new URL('../dist/cases.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../dist/admin.css',import.meta.url),'utf8');
 assert.match(source,/const caseStatuses=\['尚未開始','進行中','結案'\]/);
 assert.match(source,/caseBoard\(\)/);
 assert.match(source,/caseBatchLabel/);
 assert.match(source,/製作套數/);
 assert.match(source,/結案日 /);
 assert.doesNotMatch(source,/case-column-head/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(280px,1fr\)\)/);
 assert.match(css,/\.case-card\{[^}]*border:/);
 assert.match(css,/\.case-lane-list\{[^}]*max-height:500px;overflow-y:auto/);
});
