'use strict';
async function syncPersonalBadge112(){
 try{
  const response=await fetch('/api/notification-inbox',{credentials:'same-origin',cache:'no-store'});
  if(response.status===401){if(self.navigator.clearAppBadge)await self.navigator.clearAppBadge();return;}
  if(!response.ok)return;
  const data=await response.json(),count=Math.max(0,Number(data.unread)||0);
  if(count&&self.navigator.setAppBadge)await self.navigator.setAppBadge(count);
  else if(!count&&self.navigator.clearAppBadge)await self.navigator.clearAppBadge();
 }catch{}
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(clients.claim()));

self.addEventListener('push',event=>{
 let data={};

 try{
  data=event.data?event.data.json():{};
 }catch{
  data={
   title:'擎正科技',
   body:event.data?.text()||'您有一則新的系統通知。'
  };
 }

 const title=data.title||'擎正科技';

 const options={
  body:data.body||'您有一則新的系統通知。',
  icon:'/api/app-icon?v=81',
  badge:'/api/app-icon?v=81',
  tag:data.tag||undefined,
  renotify:Boolean(data.renotify),
  data:{
   url:data.url||'/'
  }
 };

 event.waitUntil(
  Promise.all([self.registration.showNotification(title,options),syncPersonalBadge112()])
 );
});

self.addEventListener('notificationclick',event=>{
 event.notification.close();

 const link=new URL(event.notification.data?.url||'/',self.location.origin);
 if(link.origin!==self.location.origin)return;
 link.searchParams.set('notificationResolve945','1');
 if(event.notification.tag)link.searchParams.set('notificationTag945',event.notification.tag);
 const target=link.pathname+link.search+link.hash;

 event.waitUntil((async()=>{
  const windows=await clients.matchAll({
   type:'window',
   includeUncontrolled:true
  });

  for(const client of windows){
   if('focus' in client){
    await client.focus();
    if('navigate' in client){
     await client.navigate(target);
    }
    return;
   }
  }

  if(clients.openWindow){
   return clients.openWindow(target);
  }
 })());
});
