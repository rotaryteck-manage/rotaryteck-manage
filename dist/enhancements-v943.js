 'use strict';
let cloudDialog943=null,cloudSavedForm143=null;
function cloudProgress943(busy){
 if(busy){
  if(cloudDialog943?.isConnected)return;
  const modal=document.querySelector('#modal'),form=modal?.querySelector('#dialog-form');
  // Keep the submitted form intact for failure recovery, without its modal backdrop.
  cloudSavedForm143=modal?.open&&form?.dataset.busy==='1'?{modal,form}:null;
  if(cloudSavedForm143)modal.close();
  cloudDialog943=document.createElement('div');cloudDialog943.className='cloud-progress943';
  cloudDialog943.setAttribute('role','status');cloudDialog943.setAttribute('aria-live','polite');cloudDialog943.textContent='儲存中…';
  (modal?.open?modal:document.body).append(cloudDialog943);document.documentElement.classList.add('cloud-progress-active943');
 }else{
  document.documentElement.classList.remove('cloud-progress-active943');cloudDialog943?.remove();cloudDialog943=null;
  const saved=cloudSavedForm143;cloudSavedForm143=null;
  if(typeof failedCandidate!=='undefined'&&failedCandidate&&saved?.form.isConnected&&saved.modal.querySelector('#dialog-form')===saved.form&&!saved.modal.open)saved.modal.showModal();
 }
}
function legacyNotificationTarget943(value){
 const url=new URL(value,location.href);if(url.origin!==location.origin)return value;
 if(!url.search&&url.hash==='#wire')url.searchParams.set('notificationSection','restock');
 if(!url.search&&url.hash==='#plating')url.searchParams.set('notificationPlatingOverview','all');
 return url.pathname+url.search+url.hash;
}
document.documentElement.dataset.appVersion='12.3v';
