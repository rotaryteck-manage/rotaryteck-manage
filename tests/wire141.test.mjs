import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(){
 const state={wireTypes:[{id:'dx',name:'DXN2604'},{id:'awg',name:'AWG 28'}],wireReels:[{id:'g',wireId:'awg',color:'綠'},{id:'s',wireId:'awg',color:'雙色'},{id:'k',wireId:'awg',color:'黑'},{id:'d',wireId:'dx',color:'DXN2604'}],wireCuts:[]};
 const context=vm.createContext({state,render(){},renderAdmin(){},window:{addEventListener(){}}});vm.runInContext(fs.readFileSync(new URL('../dist/wire.js',import.meta.url),'utf8'),context);
 const read=code=>JSON.parse(JSON.stringify(vm.runInContext(code,context)));
 return {state,read};
}
test('明細遵循外部種類排序、標準色序、特殊色在後；外部重排同步',()=>{
 const {state,read}=fixture();state.wireCuts=['s','g','k','d'].map((reelId,i)=>({id:String(i),reelId,time:'2026-11-05T01:00:00Z',length:80,quantity:1}));
 assert.deepEqual(read('wireSorted141(wireCutRows(wireCuts())).map(x=>x.r.id)'),['d','k','g','s']);
 state.wireTypes.reverse();assert.deepEqual(read('wireSorted141(wireCutRows(wireCuts())).map(x=>x.r.id)'),['k','g','s','d']);
 state.wireReels=Array.from('白灰紫藍綠黃橙紅棕黑', (color,i)=>({id:String(i),wireId:'awg',color}));state.wireCuts=state.wireReels.map(r=>({id:r.id,reelId:r.id,time:'2026-11-05',length:1,quantity:1}));
 assert.deepEqual(read('wireSorted141(wireCutRows(wireCuts())).map(x=>x.r.color)'),Array.from('黑棕紅橙黃綠藍紫灰白'));
});
test('同色分筆合計、案件隔離、修改刪除重算並保留來源',()=>{
 const {state,read}=fixture();state.wireCuts=[{id:'a',reelId:'g',projectName:'A',time:'2026-11-05T01:00:00Z',length:80,quantity:24},{id:'b',reelId:'g',projectName:'A',time:'2026-11-05T02:00:00Z',length:80,quantity:8},{id:'c',reelId:'g',projectName:'B',time:'2026-11-05T03:00:00Z',length:100,quantity:2}];
 const total="wireUsageRows137(wireCutRows(wireCuts()),null).map(x=>[x.quantity,x.meters,x.items.length])";
 assert.deepEqual(read(total),[[34,27.6,3]]);
 assert.deepEqual(read("wireUsageRows137(wireCutRows(wireCuts()).filter(x=>x.c.projectName==='A'),null).map(x=>[x.quantity,x.meters])"),[[32,25.6]]);
 assert.deepEqual(read('wireSorted141(wireCutRows(wireCuts())).map(x=>x.c.id)'),['c','b','a']);
 state.wireCuts[1].quantity=10;assert.deepEqual(read(total),[[36,29.2,3]]);
 state.wireCuts.splice(0,1);assert.deepEqual(read(total),[[12,10,2]]);
});
