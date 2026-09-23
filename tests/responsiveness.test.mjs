import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
const app=read('app.js'),cloud=read('cloud.js');
function confirmation(){
 let latest;const document={body:{append(){}},createElement(){const nodes={'p':{},'[data-cancel]':{focus(){}},'[data-accept]':{}},events={};latest={dataset:{},nodes,events,querySelector:s=>nodes[s],addEventListener:(n,f)=>events[n]=f,showModal(){this.open=true;},close(){this.open=false;events.close?.();},remove(){this.removed=true;}};return latest;}};
 const ctx={document,Promise};vm.runInNewContext(app.slice(app.indexOf('let activeConfirmation='),app.indexOf('function modal(')),ctx);return{ctx,latest:()=>latest};
}
test('confirmation waits for user; cancel, accept and Escape resolve correctly',async()=>{
 const h=confirmation();let p=h.ctx.confirmAction('<b>delete?</b>');assert.equal(h.latest().nodes.p.textContent,'<b>delete?</b>');
 h.latest().nodes['[data-cancel]'].onclick();assert.equal(await p,false);assert.equal(h.latest().removed,true);
 p=h.ctx.confirmAction('delete?');h.latest().nodes['[data-accept]'].onclick();assert.equal(await p,true);
 p=h.ctx.confirmAction('delete?');h.latest().events.cancel({preventDefault(){}});assert.equal(await p,false);
});
test('repeated clicks do not create overlapping confirmation prompts',async()=>{
 const h=confirmation(),first=h.ctx.confirmAction('first'),dialog=h.latest();assert.equal(await h.ctx.confirmAction('second'),false);assert.equal(h.latest(),dialog);dialog.nodes['[data-cancel]'].onclick();assert.equal(await first,false);
});
test('refresh only reloads after approval; failed-save recovery clears unload blocker',async()=>{
 const nodes={};let approved=false,reloads=0;
 const ctx={currentUser:{role:'supervisor'},cloudBusy:false,failedCandidate:null,cloudReady:true,queuedToast:'',confirmAction:async()=>approved,location:{reload:()=>reloads++},$:s=>nodes[s]??={addEventListener:(n,f)=>{nodes[s][n]=f;}},downloadJSON(){}};
 vm.runInNewContext(cloud.slice(cloud.indexOf('function cloudBar('),cloud.indexOf('render=function')),ctx);
 ctx.cloudBar();await nodes['#refresh-cloud'].click();assert.equal(reloads,0);approved=true;await nodes['#refresh-cloud'].click();assert.equal(reloads,1);
 ctx.failedCandidate={};await nodes['#reload-cloud'].click();assert.equal(reloads,2);assert.equal(ctx.failedCandidate,null);
});
test('all authentication and API requests have finite timeout signals',async()=>{
 const calls=[],signals=[];const ctx={FormData,AbortSignal:{timeout:ms=>{signals.push(ms);return {ms};}},fetch:async(url,options)=>{calls.push(options);return{};}};
 vm.runInNewContext(read('auth.js').match(/^function requestFetch.*$/m)[0],ctx);
 await ctx.requestFetch('/api/state');await ctx.requestFetch('/api/receipts',{body:new FormData()});const signal={};await ctx.requestFetch('/api/state',{signal});
 assert.deepEqual(signals,[20000,60000]);assert.equal(calls[2].signal,signal);
});
test('modal submission prevents duplicate requests and unlocks after failure',async()=>{
 const box={textContent:''},button={textContent:'儲存'},form={dataset:{},querySelector:s=>s==='#form-error'?box:button};
 const nodes={'#modal':{open:false,showModal(){this.open=true;},close(){}},'#close-modal':{},'#cancel-modal':{},'#dialog-form':form};
 const ctx={$:s=>nodes[s],FormData:class{},};vm.runInNewContext(app.slice(app.indexOf('function modal('),app.indexOf('async function templateDownload(')),ctx);
 let calls=0,reject;ctx.modal('title','body','save',async()=>{calls++;await new Promise((_,r)=>reject=r);});
 const event={preventDefault(){},currentTarget:form};const pending=form.onsubmit(event);await form.onsubmit(event);assert.equal(calls,1);assert.equal(button.disabled,true);
 reject(Error('測試失敗'));await pending;assert.equal(button.disabled,false);assert.equal(box.textContent,'測試失敗');
});
