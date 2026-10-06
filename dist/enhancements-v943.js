 'use strict';
let cloudDialog943=null;
function cloudProgress943(busy){
 if(busy){
  if(cloudDialog943?.open)return;
  cloudDialog943=document.createElement('dialog');cloudDialog943.className='cloud-progress943';cloudDialog943.innerHTML='<p role="status" aria-live="polite">正在上傳雲端…<br><small>請勿重複操作</small></p>';
  cloudDialog943.addEventListener('cancel',event=>event.preventDefault());document.body.append(cloudDialog943);cloudDialog943.showModal();document.documentElement.classList.add('cloud-progress-active943');
 }else{
  document.documentElement.classList.remove('cloud-progress-active943');if(cloudDialog943){cloudDialog943.close();cloudDialog943.remove();cloudDialog943=null;}
 }
}
function legacyNotificationTarget943(value){
 const url=new URL(value,location.href);if(url.origin!==location.origin)return value;
 if(!url.search&&url.hash==='#wire')url.searchParams.set('notificationSection','restock');
 if(!url.search&&url.hash==='#plating')url.searchParams.set('notificationPlatingOverview','all');
 return url.pathname+url.search+url.hash;
}
document.documentElement.dataset.appVersion='10.3v';
