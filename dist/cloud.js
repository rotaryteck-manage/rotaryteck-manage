'use strict';
let revision=0,cloudReady=false,cloudBusy=false,confirmed=null,failedCandidate=null,queuedToast='',currentUser={name:'',email:'',role:'viewer'};
const oldRender=render,oldToast=toast;
toast=function(message){if(cloudBusy){queuedToast=message;return;}oldToast(message);};
function downloadJSON(value,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function cloudBar(){let bar=$('#cloud-status');if(!bar){bar=document.createElement('div');bar.id='cloud-status';document.body.prepend(bar);}bar.innerHTML=cloudBusy?'正在儲存到雲端…':failedCandidate?'<span>尚未儲存：請下載未儲存資料，再重新載入以處理衝突。</span> <button id="download-pending">下載未儲存資料</button> <button id="reload-cloud">重新載入</button>':cloudReady?'已連接私人雲端 · <button id="refresh-cloud">重新整理資料</button>':'正在載入雲端資料…';$('#download-pending')?.addEventListener('click',()=>downloadJSON(failedCandidate,'庫房_未儲存資料.json'));$('#reload-cloud')?.addEventListener('click',async()=>{if(await confirmAction('請先下載未儲存資料。確定重新載入？')){failedCandidate=null;queuedToast='';location.reload();}});$('#refresh-cloud')?.addEventListener('click',async()=>{if(await confirmAction('重新整理會放棄尚未儲存的表格輸入，確定？'))location.reload();});}
render=function(){oldRender();const demo=$('.demo');if(demo)demo.innerHTML='<span>'+esc(siteText('banner'))+'</span><span>'+esc(siteText('bannerBadge'))+'</span>';const edit=$('#edit-site');if(edit){edit.textContent=adminText('entryButton');edit.onclick=()=>{captureDraft();location.hash='admin';renderAdmin();};}cloudBar();if(typeof enhanceWarehouse==='function')enhanceWarehouse();};
async function saveCloud(candidate){
 if(!cloudReady||cloudBusy||failedCandidate)throw Error('雲端尚未就緒，請先處理儲存狀態。');
 const snapshot=JSON.parse(JSON.stringify(candidate));cloudBusy=true;cloudBar();
 try{const response=await apiFetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:snapshot,revision}),signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw Error(data.error||'儲存失敗');revision=data.revision;confirmed=snapshot;cloudBusy=false;cloudBar();oldToast(queuedToast||'已儲存到雲端');queuedToast='';}
 catch(err){cloudBusy=false;queuedToast='';failedCandidate=snapshot;state=JSON.parse(JSON.stringify(confirmed));render();cloudBar();const box=$('#modal[open] #form-error');if(box)box.textContent='儲存失敗：'+err.message+'。請關閉視窗查看上方提示。';oldToast(err.message);}
}
persist=function(){saveCloud(state).catch(e=>oldToast(e.message));};
saveEditState=function(candidate){if(!cloudReady||cloudBusy||failedCandidate)error('請先等候雲端儲存完成。');state=candidate;persist();};
for(const event of ['click','submit','input','change'])document.addEventListener(event,e=>{
 if(e.target.closest('#close-modal,#cancel-modal'))return;
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
async function startCloud(){try{const r=await apiFetch('/api/state');const data=await r.json();if(!r.ok)throw Error(data.error||'載入失敗');state=data.state||{projects:[],deletedProjects:[],logs:[]};revision=data.revision;currentUser=data.currentUser||currentUser;confirmed=JSON.parse(JSON.stringify(state));cloudReady=true;migrateSimpleInventory();render();routeAdmin();}catch(e){$('#app').innerHTML='<main><h1>暫時無法連接雲端庫房</h1><p>'+esc(e.message)+'</p><p>請確認主管已在管理後台啟用你的員工帳號。</p><button class="primary" id="retry-login">重新登入</button></main>';$('#cloud-status')?.remove();$('#retry-login').onclick=logout;}}
document.addEventListener('DOMContentLoaded',async()=>{if(await ensureAuth())startCloud();});
