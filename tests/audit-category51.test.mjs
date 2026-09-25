import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../dist/audit-view.js',import.meta.url),'utf8');
const handler=src.slice(src.indexOf(" $('#audit-clear-category').onclick="),src.indexOf(" $('#audit-clear-new').onclick="));
for(const confirm of [true,false])test('category clear '+(confirm?'removes entire selected category only':'cancel keeps every record'),async()=>{const button={},original={logs:[{id:'a',category:'plating'},{id:'b',category:'wire'},{id:'c',category:'plating'}],platingProjects:[{id:'project'}]};let saved=0,prompt='';const c={currentUser:{role:'supervisor'},auditUnlocked:true,auditCategoryFilter:'plating',cloudBusy:false,failedCandidate:false,state:structuredClone(original),auditCategory:x=>x.category,auditCategories:{plating:'電鍍'},$:()=>button,confirmAction:async text=>{prompt=text;return confirm;},structuredClone,saveCloud:async()=>saved++,render(){},toast(){}};vm.createContext(c);vm.runInContext(handler,c);await button.onclick();assert.deepEqual(c.state.logs.map(x=>x.id),confirm?['b']:['a','b','c']);assert.deepEqual(c.state.platingProjects,original.platingProjects);assert.equal(saved,confirm?1:0);assert.match(prompt,/2 筆/);});
