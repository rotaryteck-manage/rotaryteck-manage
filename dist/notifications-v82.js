'use strict';

async function notificationRegisterServiceWorker82(){
 if(!('serviceWorker' in navigator))return null;

 try{
  return await navigator.serviceWorker.register('/sw.js',{
   scope:'/'
  });
 }catch(error){
  console.error('通知 Service Worker 註冊失敗',error);
  return null;
 }
}

function notificationKey82(base64String){
 const padding='='.repeat((4-base64String.length%4)%4);
 const base64=(base64String+padding)
  .replace(/-/g,'+')
  .replace(/_/g,'/');

 const raw=atob(base64);
 return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

function notificationDeviceLabel82(){
 const ua=navigator.userAgent||'';

 if(/iPhone|iPad|iPod/i.test(ua)){
  return 'iPhone / iPad · PWA';
 }

 if(/Android/i.test(ua)){
  if(/EdgA/i.test(ua))return 'Android · Edge';
  if(/Chrome/i.test(ua))return 'Android · Chrome';
  return 'Android';
 }

 if(/Windows/i.test(ua)){
  if(/Edg/i.test(ua))return 'Windows · Edge';
  if(/Chrome/i.test(ua))return 'Windows · Chrome';
  if(/Firefox/i.test(ua))return 'Windows · Firefox';
  return 'Windows';
 }

 if(/Macintosh|Mac OS X/i.test(ua)){
  if(/Safari/i.test(ua)&&!/Chrome/i.test(ua))
   return 'Mac · Safari';
  if(/Chrome/i.test(ua))
   return 'Mac · Chrome';
  return 'Mac';
 }

 return '其他裝置';
}

async function notificationCurrentSubscription82(){
 if(!('serviceWorker' in navigator))return null;

 try{
  const registration=
   await navigator.serviceWorker.ready;

  return await registration.pushManager.getSubscription();
 }catch{
  return null;
 }
}

async function notificationSaveSubscription82(subscription){
 const json=subscription.toJSON();

 const endpoint=String(json.endpoint||'');
 const p256dh=String(json.keys?.p256dh||'');
 const auth=String(json.keys?.auth||'');

 if(!endpoint||!p256dh||!auth)
  throw Error('瀏覽器沒有提供完整通知訂閱資料');

 const response=await apiFetch('/api/push-subscription',{
  method:'POST',
  headers:{
   'Content-Type':'application/json'
  },
  body:JSON.stringify({
   endpoint,
   p256dh,
   auth,
   deviceLabel:notificationDeviceLabel82()
  })
 });

 const data=await response.json();

 if(!response.ok)
  throw Error(data.error||'通知裝置綁定失敗');

 return data;
}

async function notificationEnable82(){
 if(!('serviceWorker' in navigator)||
    !('PushManager' in window)||
    !('Notification' in window)){
  toast('這個瀏覽器目前不支援網站通知');
  return;
 }

 if(Notification.permission==='denied'){
  toast('通知權限已被封鎖，請到瀏覽器或手機設定中重新允許通知');
  return;
 }

 try{
  const registration=
   await notificationRegisterServiceWorker82();

  if(!registration)
   throw Error('無法啟動通知服務');

  let permission=Notification.permission;

  if(permission!=='granted'){
   permission=await Notification.requestPermission();
  }

  if(permission!=='granted'){
   toast('尚未允許通知，因此不會收到系統提醒');
   notificationUpdateButton82();
   return;
  }

  const keyResponse=
   await apiFetch('/api/push-public-key');

  const keyData=
   await keyResponse.json();

  if(!keyResponse.ok)
   throw Error(keyData.error||'無法讀取通知金鑰');

  let subscription=
   await registration.pushManager.getSubscription();

  if(!subscription){
   subscription=
    await registration.pushManager.subscribe({
     userVisibleOnly:true,
     applicationServerKey:
      notificationKey82(keyData.publicKey)
    });
  }

  await notificationSaveSubscription82(subscription);

  toast('這台裝置已開啟系統通知');

  notificationUpdateButton82();

 }catch(error){
  console.error(error);
  toast(error.message||'開啟通知失敗');
 }
}

async function notificationUpdateButton82(){
 const button=
  document.querySelector('#notification-enable82');

 if(!button)return;

 if(!('Notification' in window)||
    !('PushManager' in window)){
  button.textContent='此裝置不支援通知';
  button.disabled=true;
  return;
 }

 if(Notification.permission==='denied'){
  button.textContent='通知已封鎖';
  button.disabled=false;
  return;
 }

 const subscription=
  await notificationCurrentSubscription82();

 if(Notification.permission==='granted'&&subscription){
  button.textContent='通知已開啟';
  button.classList.add('selected');
 }else{
  button.textContent='開啟通知';
  button.classList.remove('selected');
 }

 button.disabled=false;
}

function notificationAddButton82(){
 const actions=
  document.querySelector('#account-actions');

 if(!actions||
    document.querySelector('#notification-enable82'))
  return;

 const button=document.createElement('button');

 button.type='button';
 button.id='notification-enable82';
 button.className='small';
 button.textContent='開啟通知';

 button.onclick=notificationEnable82;

 actions.prepend(button);

 notificationUpdateButton82();
}

if(typeof applyRoleUI==='function'){
 const notificationApplyRoleUIBefore82=applyRoleUI;

 applyRoleUI=function(){
  notificationApplyRoleUIBefore82();
  notificationAddButton82();
 };
}

window.addEventListener('load',async()=>{
 await notificationRegisterServiceWorker82();
 notificationAddButton82();
});