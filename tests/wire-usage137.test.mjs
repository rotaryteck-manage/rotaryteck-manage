import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('全區用量歸零不影響案件歷史，個別起點只影響指定線捆',()=>{
 const state={
  wireTypes:[{id:'t',name:'AWG24'}],
  wireReels:[{id:'a',wireId:'t',color:'黑'},{id:'b',wireId:'t',color:'紅'}],
  wireCuts:[
   {id:'1',projectName:'ＳＪ７０４０',reelId:'a',length:80,quantity:8,time:'2026-11-05T00:00:00.000Z'},
   {id:'2',projectName:'sj7040',reelId:'a',length:100,quantity:2,time:'2026-11-05T03:00:00.000Z'},
   {id:'3',reelId:'b',length:50,quantity:6,time:'2026-11-05T03:00:00.000Z'}
  ]
 };
 const ctx=vm.createContext({state,render(){},renderAdmin(){},window:{addEventListener(){}}});
 vm.runInContext(fs.readFileSync(new URL('../dist/wire.js',import.meta.url),'utf8'),ctx);
 const read=code=>JSON.parse(JSON.stringify(vm.runInContext(code,ctx)));
 assert.deepEqual(read("wireUsageRows137(wireCutRows(wireCuts()).filter(x=>wireProjectKey137(x.c.projectName)==='sj7040'),null).map(x=>[x.quantity,x.meters])"),[[10,8.4]]);
 assert.deepEqual(read("wireUsageRows137(wireCutRows(wireCuts()),{all:'2026-11-05T01:00:00.000Z',reels:{a:'2026-11-05T03:00:00.000Z'}}).map(x=>[x.quantity,x.meters])"),[[0,0],[6,3]]);
 assert.equal(state.wireCuts.length,3);
});
