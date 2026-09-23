import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const cloud=fs.readFileSync(new URL('../dist/cloud.js',import.meta.url),'utf8');
test('blocked cloud actions display an error while modal close remains usable',()=>{
 const handlers={},box={textContent:''};let blocked=0;
 const ctx={cloudReady:true,cloudBusy:false,failedCandidate:{},$:()=>box,oldToast:()=>{},document:{addEventListener:(type,handler)=>handlers[type]=handler}};
 vm.runInNewContext(cloud.slice(cloud.indexOf("for(const event of ['click'"),cloud.indexOf("window.addEventListener('beforeunload'")),ctx);
 const event=close=>({target:{closest:selector=>close&&selector==='#close-modal,#cancel-modal'},preventDefault:()=>blocked++,stopImmediatePropagation:()=>{}});
 handlers.click(event(false));assert.equal(blocked,1);assert.match(box.textContent,/儲存未成功/);
 handlers.click(event(true));assert.equal(blocked,1);
});
function setup(fetch){
 const button={disabled:false},box={textContent:''};let submit,opened=0,saves=0;
 const ctx={state:{deletedProjects:[{project:{id:'a',name:'A'}},{project:{id:'b',name:'B'}}]},cloudReady:true,cloudBusy:false,failedCandidate:null,esc:x=>x,modal:(title,body,label,handler)=>{submit=handler;},$:s=>s==='#submit-modal'?button:box,apiFetch:fetch,AbortSignal,addAudit:()=>{},saveCloud:async()=>{saves++;},deletedProjectsDialog:()=>opened++,toast:()=>{},error:msg=>{throw Error(msg)}};
 vm.runInNewContext(app.slice(app.indexOf('function confirmPurgeProject('),app.indexOf('const siteTextFields=')),ctx);
 ctx.confirmPurgeProject('a');return{ctx,button,box,submit:()=>submit(),opened:()=>opened,saves:()=>saves};
}
test('permanent deletion waits for explicit confirmation and removes by stable ID',async()=>{
 let calls=0;const h=setup(async()=>{calls++;h.ctx.state.deletedProjects.reverse();return{ok:true,json:async()=>({})};});
 assert.equal(calls,0);await h.submit();assert.equal(calls,1);assert.equal(h.saves(),1);assert.equal(h.opened(),1);assert.equal(h.ctx.state.deletedProjects[0].project.id,'b');
});
test('failed receipt deletion preserves project and enables retry with a visible error',async()=>{
 const h=setup(async()=>({ok:false,json:async()=>({error:'無法刪除圖片'})}));await h.submit();
 assert.equal(h.ctx.state.deletedProjects.length,2);assert.equal(h.saves(),0);assert.equal(h.button.disabled,false);assert.equal(h.box.textContent,'無法刪除圖片');
});
