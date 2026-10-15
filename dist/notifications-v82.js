async function notificationReady85(){let timer;try{return await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('通知服務啟動逾時，請重新整理後再試')),15000);})]);}finally{clearTimeout(timer);}}
'use strict';

async function notificationRegisterServiceWorker82(){
 if(!('serviceWorker' in navigator))return null;

 try{
  return await navigator.serviceWorker.register('/sw.js',{
   scope:'/',updateViaCache:'none'
  });
 }catch(error){
  console.error('通知 Service Worker 註冊失敗',error);
  return null;
 }
}

function notificationKey82(base64String){
 base64String=String(base64String||'').trim();
 if(!/^[A-Za-z0-9_-]{87}$/.test(base64String))
  throw Error('通知公鑰設定不完整，請主管確認 VAPID_PUBLIC_KEY 後重新部署');
 const padding='='.repeat((4-base64String.length%4)%4);
 const base64=(base64String+padding)
  .replace(/-/g,'+')
  .replace(/_/g,'/');

 const raw=atob(base64);
 const bytes=Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
 if(bytes.length!==65||bytes[0]!==4)
  throw Error('通知公鑰格式錯誤，請主管確認 VAPID_PUBLIC_KEY 後重新部署');
 return bytes;
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
 let registration=(await navigator.serviceWorker.getRegistration?.('/'))||await notificationReady85();
 if('active' in registration&&!registration.active)registration=await notificationReady85();
 return await registration.pushManager.getSubscription();
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
   deviceLabel:notificationDeviceLabel82(),previousDeviceId:localStorage.getItem('notification-device85')||''
  })
 });

 const data=await response.json();

 if(!response.ok)
  throw Object.assign(Error(data.error||'通知裝置綁定失敗'),{rebind:data.rebind});

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
  let permission=Notification.permission;

  if(permission!=='granted'){
   permission=await Notification.requestPermission();
  }

  if(permission!=='granted'){
   toast('尚未允許通知，因此不會收到系統提醒');
   notificationUpdateButton82();
   return;
  }

  const registered=await notificationRegisterServiceWorker82();
  if(!registered)throw Error('無法啟動通知服務');
  const registration=await notificationReady85();

  const keyResponse=
   await apiFetch('/api/push-public-key');

  const keyData=
   await keyResponse.json();

  if(!keyResponse.ok)
   throw Error(keyData.error||'無法讀取通知金鑰');

  const applicationServerKey=notificationKey82(keyData.publicKey);
  try{
   await crypto.subtle.importKey('raw',applicationServerKey,
    {name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  }catch{
   throw Error('通知公鑰無效，請主管確認 VAPID_PUBLIC_KEY 後重新部署');
  }

  let subscription=
   await registration.pushManager.getSubscription();

  if(subscription?.options?.applicationServerKey){const old=new Uint8Array(subscription.options.applicationServerKey);if(old.length!==applicationServerKey.length||old.some((x,i)=>x!==applicationServerKey[i])){await subscription.unsubscribe();subscription=null;}}
  if(!subscription){
   subscription=
    await registration.pushManager.subscribe({
     userVisibleOnly:true,
     applicationServerKey
    });
  }

  let saved;try{saved=await notificationSaveSubscription82(subscription);}catch(error){if(!error.rebind)throw error;await subscription.unsubscribe();subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});saved=await notificationSaveSubscription82(subscription);}
  localStorage.setItem('notification-device85',saved.id);

  toast(saved.enabled?'這台裝置已開啟系統通知':'訂閱已登記，通知目前由後台停用');

  notificationUpdateButton82();

 }catch(error){
  console.error(error);
  toast(error.name==='InvalidAccessError'
   ?'通知金鑰設定不正確，請主管確認後重新部署'
   :(error.message||'開啟通知失敗'));
 }
}

let notificationStatusSequence127=0,notificationStatusRetry127=null,notificationPushOwner127;
let notificationPushStatus127={kind:'checking',message:'正在確認系統通知狀態',canEnable:false};
function notificationOwner127(){return typeof currentUser==='undefined'?null:currentUser?.id}
async function notificationUpdateButton82(attempt127=0){
 const button=document.querySelector('#notification-enable82');if(!button)return null;
 clearTimeout(notificationStatusRetry127);const sequence=++notificationStatusSequence127,owner=notificationOwner127();
 if(notificationPushOwner127!==owner){notificationPushOwner127=owner;notificationPushStatus127={kind:'checking',message:'正在確認系統通知狀態',canEnable:false};if(typeof notificationPushPanel127==='function')notificationPushPanel127()}
 const current=()=>sequence===notificationStatusSequence127&&owner===notificationOwner127()&&document.querySelector('#notification-enable82')===button&&button.isConnected!==false;
 let status;
 try{
  if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator))status={kind:'unsupported',message:'此裝置不支援系統通知',canEnable:false};
  else if(Notification.permission==='denied')status={kind:'blocked',message:'瀏覽器通知已封鎖',canEnable:false};
  else if(Notification.permission!=='granted')status={kind:'unbound',message:'系統通知尚未開啟',canEnable:true};
  else{
   const subscription=await notificationCurrentSubscription82();if(!current())return null;
   if(!subscription)status={kind:'unbound',message:'系統通知尚未開啟',canEnable:true};
   else{
    const keyResponse=await apiFetch('/api/push-public-key'),keyData=await keyResponse.json();if(!current())return null;
    // A state check never unsubscribes. Only the explicit enable action may replace a changed key.
    let keyChanged127=false;if(keyResponse.ok&&subscription.options?.applicationServerKey){const expected=notificationKey82(keyData.publicKey),key=new Uint8Array(subscription.options.applicationServerKey);keyChanged127=key.length!==expected.length||key.some((value,index)=>value!==expected[index])}
    {
     const endpoint=subscription.endpoint||subscription.toJSON?.().endpoint||'',response=await apiFetch('/api/push-subscription'+(endpoint?'?currentEndpoint='+encodeURIComponent(endpoint):'')),data=await response.json();if(!current())return null;if(!response.ok)throw Error(data.error||'通知狀態讀取失敗');
     let localId='';try{localId=localStorage.getItem('notification-device85')||''}catch{}
     const resolvedId=endpoint&&Object.hasOwn(data,'currentDeviceId')?data.currentDeviceId:localId,device=(data.items||[]).find(d=>d.id===resolvedId);
     if(device&&data.currentDeviceId)try{localStorage.setItem('notification-device85',device.id)}catch{}
     if(!data.personEnabled)status={kind:'person-disabled',message:'人員通知已停用（後台設定）',canEnable:false};
     else if(!device){try{localStorage.removeItem('notification-device85')}catch{}status={kind:'unbound',message:'此裝置尚未綁定或已被刪除',canEnable:true}}
     else if(!device.enabled)status={kind:'device-disabled',message:'裝置通知已停用（後台設定）',canEnable:false};
     else if(keyChanged127)status={kind:'key-changed',message:'金鑰已更新，請重新開啟通知',canEnable:true};
     else{
      if(data.currentKeyFingerprint126&&crypto.subtle){const own=subscription.toJSON?.().keys;if(own?.p256dh&&own?.auth){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(own.p256dh+'|'+own.auth));if(!current())return null;const fingerprint=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');if(fingerprint!==data.currentKeyFingerprint126)await notificationSaveSubscription82(subscription)}}
      status={kind:'ready',message:'通知已開啟',canEnable:false};
     }
    }
   }
  }
 }catch{status={kind:'checking',message:'暫時無法確認系統通知狀態',canEnable:false}}
 if(!current())return null;
 notificationPushStatus127=status;button.classList.toggle('selected',status.kind==='ready');button.disabled=false;
 if(!button.classList.contains?.('notification-bell88'))button.textContent=status.message;
 if(typeof notificationPushPanel127==='function')notificationPushPanel127();
 // Two bounded retries for startup/read failures; never register, subscribe or override admin settings here.
 if((status.kind==='checking'||status.kind==='unbound'&&Notification.permission==='granted')&&attempt127<2)notificationStatusRetry127=setTimeout(()=>current()?notificationUpdateButton82(attempt127+1).catch(()=>{}):undefined,1500);
 return status;
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

 button.onclick=()=>notificationEnable82();

 actions.prepend(button);
 if(typeof notificationBell127==='function')notificationBell127(button);

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
let notificationResumeAt124=0;
function notificationResume124(){if(Date.now()-notificationResumeAt124<3000)return;notificationResumeAt124=Date.now();notificationUpdateButton82().catch(()=>{});}
window.addEventListener('pageshow',notificationResume124);
window.addEventListener('focus',notificationResume124);
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener?.('controllerchange',notificationResume124);
