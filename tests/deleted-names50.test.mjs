import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWire} from '../worker/wire-permissions.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
test('archived wire names can be reused; active duplicate names remain blocked',()=>{assert.doesNotThrow(()=>validateWire({wireTypes:[{id:'old',name:'AWG26',archived:true},{id:'new',name:'AWG26'}]}));assert.throws(()=>validateWire({wireTypes:[{id:'a',name:' AWG26 '},{id:'b',name:'awg26'}]}),/重複/);});
test('conflicting restore leaves original state unchanged',async()=>{const s=fs.readFileSync(new URL('../dist/bulk.js',import.meta.url),'utf8');const c={currentUser:{role:'supervisor'},cloudBusy:false,failedCandidate:false,state:{wireTypes:[{id:'old',name:'AWG26',archived:true},{id:'new',name:'AWG26'}]},structuredClone,wt:x=>x};vm.createContext(c);vm.runInContext(s.slice(s.indexOf('const bulkDefinitions'),s.indexOf('function openBulk')),c);await assert.rejects(c.applyBulkState('wire',[{id:'old'}],true),/同名/);assert.equal(c.state.wireTypes[0].archived,true);});
