'use strict';
let recordVersions={},pendingSave=null;
let revision=0,cloudReady=false,cloudBusy=false,confirmed=null,failedCandidate=null,failedSaveMessage='',queuedToast='',lastCloudSavedAt=0,currentUser={name:'',email:'',role:'viewer'};
const oldRender=render,oldToast=toast;
toast=function(message){if(cloudBusy){queuedToast=message;return;}oldToast(message);};
async function downloadJSON(value,name){if(!await authorizeExport())return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function cloudBar(){if(typeof cloudProgress943==='function')cloudProgress943(cloudBusy);let bar=$('#cloud-status');if(!bar){bar=document.createElement('div');bar.id='cloud-status';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');document.body.prepend(bar);}const savedAt=typeof lastCloudSavedAt==='number'?lastCloudSavedAt:0,justSaved=cloudReady&&!cloudBusy&&!failedCandidate&&Date.now()-savedAt<3000;if(typeof document!=='undefined')document.documentElement?.classList?.toggle('cloud-saving941',cloudBusy);bar.classList?.toggle?.('cloud-saving941',cloudBusy);bar.classList?.toggle?.('cloud-saved941',justSaved);bar.innerHTML=cloudBusy?'正在上傳雲端，請勿重複操作…':failedCandidate?'<span><strong>尚未儲存：</strong>'+esc(failedSaveMessage||'雲端儲存失敗')+'。資料異動功能已暫停，查看與展開仍可使用。</span> <button id="retry-record-save">重試儲存</button> <button id="download-pending">下載未儲存資料</button> <button id="reload-cloud">放棄變更並重新載入</button>':justSaved?'✓ 已儲存到雲端':cloudReady?'已連接私人雲端 <span class="app-version941">10.3v</span> · <button id="refresh-cloud">重新整理資料</button>':'正在載入雲端資料…';$('#retry-record-save')?.addEventListener('click',()=>retryRecordSave());if(currentUser.role!=='supervisor')$('#download-pending')?.remove();$('#download-pending')?.addEventListener('click',()=>downloadJSON(failedCandidate,'庫房_未儲存資料.json'));$('#reload-cloud')?.addEventListener('click',async()=>{if(await confirmAction('尚未儲存的修改會放棄。確定重新載入？')){failedCandidate=null;failedSaveMessage='';queuedToast='';location.reload();}});$('#refresh-cloud')?.addEventListener('click',async()=>{if(await confirmAction('重新整理會放棄尚未儲存的表格輸入，確定？'))location.reload();});if(justSaved)setTimeout(()=>{if(!cloudBusy&&!failedCandidate)cloudBar();},3100);}
async function cloudJSON921(response,action){if(typeof response.text!=='function')return response.json();const text=await response.text();try{return JSON.parse(text)}catch{const type=response.headers?.get?.('content-type')||'',sample=text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,120);throw Error(action+'失敗（HTTP '+response.status+'，伺服器回傳'+(type?' '+type:'非 JSON')+(sample?'：'+sample:'')+'）')}}
render=function(){oldRender();const demo=$('.demo');if(demo)demo.innerHTML='<span>'+esc(siteText('banner'))+'</span><span>'+esc(siteText('bannerBadge'))+'</span>';const edit=$('#edit-site');if(edit){edit.textContent=adminText('entryButton');edit.onclick=()=>{captureDraft();location.hash='admin';renderAdmin();};}cloudBar();if(typeof enhanceWarehouse==='function')enhanceWarehouse();};
async function sendRecordSave(snapshot,request){
 cloudBusy=true;cloudBar();
 try{
  let response,data;for(let attempt=0;attempt<2;attempt++){response=await apiFetch('/api/state',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(20000)});try{data=await(typeof cloudJSON921==='function'?cloudJSON921(response,'儲存'):response.json());}catch(error){if(attempt===0&&[429,502,503,504].includes(response.status)){await new Promise(resolve=>setTimeout(resolve,700));continue;}throw error;}if(response.ok||attempt===1||![429,502,503,504].includes(response.status))break;await new Promise(resolve=>setTimeout(resolve,700));}
  if(!response.ok)throw Error(data.error||'儲存失敗');if(data.storageVersion!==2)throw Error('伺服器版本不同，請重新整理');
  revision=data.revision;Object.assign(recordVersions,data.versions);confirmed=snapshot;pendingSave=null;failedCandidate=null;failedSaveMessage='';lastCloudSavedAt=Date.now();cloudBusy=false;cloudBar();oldToast(queuedToast||'已儲存到雲端');queuedToast='';return true;
 }catch(err){cloudBusy=false;queuedToast='';pendingSave={snapshot,request};failedCandidate=snapshot;failedSaveMessage=String(err.message||'雲端儲存失敗');state=JSON.parse(JSON.stringify(confirmed));render();cloudBar();const box=$('#modal[open] #form-error');if(box)box.textContent='儲存失敗：'+failedSaveMessage+'。可先關閉視窗，頁面上方可以重試或重新載入。';oldToast(failedSaveMessage);return false;}
}
async function saveCloud(candidate){
 if(!cloudReady||cloudBusy||failedCandidate)throw Error('雲端尚未就緒，請先處理儲存狀態。');
 normalizeLogIds(candidate);const snapshot=JSON.parse(JSON.stringify(candidate)),changes=diffRecords(confirmed,snapshot,recordVersions);
 if(!changes.length){oldToast('資料沒有變更');return true;}
 return await sendRecordSave(snapshot,{storageVersion:2,requestId:crypto.randomUUID(),changes});
}
async function retryRecordSave(){
 if(!pendingSave||cloudBusy)return;const saved=pendingSave;
 if(await sendRecordSave(saved.snapshot,saved.request)){state=JSON.parse(JSON.stringify(confirmed));$('#modal[open]')?.close();routeAdmin();}
}
persist=function(){saveCloud(state).catch(e=>oldToast(e.message));};
saveEditState=function(candidate){if(!cloudReady||cloudBusy||failedCandidate)error('請先等候雲端儲存完成。');state=candidate;persist();};
for(const event of ['click','submit','input','change'])document.addEventListener(event,e=>{
 if(e.target.closest('#close-modal,#cancel-modal'))return;
 if(failedCandidate&&event==='click'&&e.target.closest('summary,[data-cloud-readonly]'))return;
 if(cloudReady&&cloudBusy&&!failedCandidate&&event==='click'&&e.target.closest('a[href^="#"],[data-schedule-tab],[data-project]'))return;
 if(!cloudReady&&e.target.closest('a'))return;
 if((!cloudReady||cloudBusy||failedCandidate)&&!e.target.closest('#cloud-status,.login-page,[data-confirmation]')){
  e.preventDefault();e.stopImmediatePropagation();
  if(event==='click'||event==='submit'){
   const message=failedCandidate?'上次儲存未成功，請關閉視窗，依頁面上方提示處理。':cloudBusy?'正在儲存到雲端，請稍候再操作。':'雲端尚未連線，請稍後或重新整理頁面。';
   const box=$('#modal[open] #form-error');if(box)box.textContent=message;else oldToast(message);
  }
 }
},true);
window.addEventListener('beforeunload',e=>{if(cloudBusy||failedCandidate){e.preventDefault();e.returnValue='';}});
async function startCloud(){try{const r=await apiFetch('/api/state');const data=await cloudJSON921(r,'載入');if(!r.ok)throw Error(data.error||'載入失敗');if(data.storageVersion!==2)throw Error('儲存服務尚未更新，請確認 Cloudflare 部署已完成');if(data.serverTime&&typeof serverClockOffset44!=='undefined')serverClockOffset44=Date.parse(data.serverTime)-Date.now();state=data.state||{projects:[],deletedProjects:[],logs:[]};recordVersions=data.versions||{};revision=data.revision;currentUser=data.currentUser||currentUser;confirmed=JSON.parse(JSON.stringify(state));cloudReady=true;migrateSimpleInventory();routeAdmin();}catch(e){$('#app').innerHTML='<main><h1>暫時無法連接雲端庫房</h1><p>'+esc(e.message)+'</p><p>請確認主管已在管理後台啟用你的員工帳號。</p><button class="primary" id="retry-login">重新登入</button></main>';$('#cloud-status')?.remove();$('#retry-login').onclick=logout;}}
document.addEventListener('DOMContentLoaded',async()=>{try{if(await ensureAuth())await startCloud();}finally{if(typeof finishBoot76==='function')finishBoot76();}});
