 'use strict';
let notificationPending945='',notificationResolved945='',notificationRetry945=0,notificationNotice945='';
function notificationGate945(){
 const url=new URL(location.href),q=url.searchParams,key=url.href;
 const needed=['notificationInbox945','notificationTag945','notificationResolve945','notificationRule945','notificationWire','notificationPlatingProject','notificationPlatingOverview'].some(k=>q.has(k))||q.get('notificationSection')==='restock';
 if(!needed||key===notificationResolved945)return true;
 if(!cloudReady||cloudBusy||notificationPending945||Date.now()<notificationRetry945)return false;
 notificationPending945=key;
 const query=new URLSearchParams({url:url.pathname+url.search+url.hash});
 if(q.has('notificationInbox945'))query.set('inbox',q.get('notificationInbox945'));
 if(q.has('notificationTag945'))query.set('tag',q.get('notificationTag945'));
 (async()=>{
  try{
   const response=await apiFetch('/api/notification-resolve945?'+query,{signal:AbortSignal.timeout(15000)}),data=await response.json();
   if(!response.ok)throw Error(data.error||'讀取通知設定失敗');
   if(location.href!==key)return;
   const target=new URL(data.targetUrl,location.href);if(target.origin!==location.origin)throw Error('通知位置不正確');
   notificationResolved945=target.href;notificationNotice945=data.notice||'';
   history.replaceState(null,'',target.pathname+target.search+target.hash);
   if(url.hash!==target.hash)dispatchEvent(new HashChangeEvent('hashchange',{oldURL:key,newURL:target.href}));
  }catch(error){if(location.href===key){toast(error.message+'；稍後自動重試。');notificationRetry945=Date.now()+10000;}}
  finally{notificationPending945='';scheduleNotificationRoute941();}
 })();
 return false;
}
const notificationRouteBefore945=notificationRoute941;
notificationRoute941=function(){const opened=notificationRouteBefore945();if(opened&&notificationNotice945){toast(notificationNotice945);notificationNotice945='';}return opened;};
document.documentElement.dataset.appVersion='10.6v';
