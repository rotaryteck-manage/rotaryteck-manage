'use strict';

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
  self.registration.showNotification(title,options)
 );
});

self.addEventListener('notificationclick',event=>{
 event.notification.close();

 const target=
  event.notification.data?.url||
  '/';

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