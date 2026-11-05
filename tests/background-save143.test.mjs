import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(){
 const notices=[],listeners={},form={dataset:{busy:'1'},isConnected:true};
 const modal={open:true,current:form,close(){this.open=false;this.closed=(this.closed||0)+1},showModal(){this.open=true;this.restored=(this.restored||0)+1},querySelector(){return this.current},append:attach};
 function attach(node){node.isConnected=true;notices.push(node)}
 const document={querySelector:s=>s==='#modal'?modal:null,createElement:()=>({setAttribute(){},remove(){this.isConnected=false}}),body:{append:attach},documentElement:{dataset:{},classList:{add(){},remove(){}}},addEventListener:(name,fn)=>listeners[name]=fn};
 const ctx=vm.createContext({document,window:{addEventListener(){}},render(){},toast(){},persist(){},saveEditState(){},state:{projects:[]},$:()=>null,URL,location:new URL('https://test.local/#wire'),AbortSignal,setTimeout,clearTimeout,crypto,structuredClone,Headers});
 vm.runInContext(fs.readFileSync('dist/cloud.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/enhancements-v943.js','utf8'),ctx);
 return {ctx,modal,form,notices,listeners,run:code=>vm.runInContext(code,ctx)};
}
test('背景儲存不使用阻擋視窗，成功後不重新開啟舊表單',()=>{
 const f=fixture();f.run('cloudProgress943(true);cloudProgress943(true)');assert.equal(f.modal.open,false);assert.equal(f.form.isConnected,true);assert.equal(f.notices.length,1);assert.equal(f.notices[0].textContent,'儲存中…');
 f.run('cloudProgress943(false)');assert.equal(f.modal.open,false);assert.equal(f.notices[0].isConnected,false);
});
test('失敗恢復原表單；有新視窗時不覆蓋新內容',()=>{
 const f=fixture();f.run('cloudProgress943(true);failedCandidate={request:"pending"};cloudProgress943(false)');assert.equal(f.modal.open,true);assert.equal(f.modal.current,f.form);assert.equal(f.form.dataset.busy,'1');
 const other=fixture();other.run('cloudProgress943(true)');other.modal.current={};other.form.isConnected=false;other.run('failedCandidate={};cloudProgress943(false)');assert.equal(other.modal.open,false);assert.equal(other.modal.restored,undefined);
});
test('儲存期間允許查看展開與導覽，攔住第二次寫入',()=>{
 const f=fixture();f.run('cloudReady=true;cloudBusy=true');
 function event(matches){let blocked=false;return {target:{closest:selector=>selector.split(',').some(x=>matches.includes(x))?{}:null},preventDefault(){blocked=true},stopImmediatePropagation(){},get blocked(){return blocked}}}
 for(const allowed of ['summary','[data-cloud-readonly]','a[href^="#"]']){const e=event([allowed]);f.listeners.click(e);assert.equal(e.blocked,false)}
 for(const kind of ['click','submit','input','change']){const e=event([]);f.listeners[kind](e);assert.equal(e.blocked,true)}
});
test('失敗保留原請求，重試沿用相同編號；待儲存時拒絕另一筆寫入',async()=>{
 const f=fixture();let calls=0;f.ctx.apiFetch=async()=>{calls++;return Response.json({error:'測試失敗'},{status:400})};
 f.run('cloudBar=()=>cloudProgress943(cloudBusy);render=()=>cloudBar();esc=String;routeAdmin=()=>{};normalizeLogIds=()=>{};cloudReady=true;confirmed={projects:[]};state={projects:[{id:"new"}]};');
 const result=await f.run('sendRecordSave({projects:[{id:"new"}]},{requestId:"same-id",changes:[{id:"new"}]})');assert.equal(result,false);assert.equal(f.modal.open,true);
 assert.equal(f.run('pendingSave.request.requestId'),'same-id');assert.equal(f.run('failedCandidate.projects[0].id'),'new');
 await assert.rejects(f.run('saveCloud({projects:[]})'),/儲存狀態/);assert.equal(calls,1);
 let sent;f.ctx.apiFetch=async(_url,init)=>{sent=JSON.parse(init.body);return Response.json({storageVersion:2,revision:1,versions:{}})};
 await f.run('retryRecordSave()');assert.equal(sent.requestId,'same-id');assert.equal(f.run('pendingSave'),null);assert.equal(f.run('failedCandidate'),null);
});
