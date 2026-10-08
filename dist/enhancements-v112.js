'use strict';
// Badge counts come only from the authenticated employee's inbox, never a global count.
async function personalBadge112(count){
 try{
  count=Math.max(0,Number(count)||0);
  if(count&&navigator.setAppBadge)await navigator.setAppBadge(count);
  else if(!count&&navigator.clearAppBadge)await navigator.clearAppBadge();
 }catch{}
}
const inboxLoadBefore112=notificationInboxLoad88;
notificationInboxLoad88=async function(){
 const userId=currentUser?.id,data=await inboxLoadBefore112();
 if(userId===currentUser?.id)await personalBadge112(data.unread);
 return data;
};
const inboxReadBefore112=notificationRead88;
notificationRead88=async function(payload){
 const userId=currentUser?.id,data=await inboxReadBefore112(payload);
 if(userId===currentUser?.id){await personalBadge112(data.unread);const button=$('#notification-enable82');if(button)notificationBadge88(button,data.unread);}
 return data;
};
const authWriteBefore112=authWrite;
authWrite=function(value){const previous=authRead();authWriteBefore112(value);if(!value||previous?.user?.id!==value?.user?.id)void personalBadge112(0);};
let badgeBusy112=false;
async function refreshPersonalBadge112(){
 if(badgeBusy112||document.hidden)return;
 if(!authRead()){await personalBadge112(0);return;}
 badgeBusy112=true;
 try{const data=await notificationInboxLoad88();const button=$('#notification-enable82');if(button)notificationBadge88(button,data.unread);}catch{}finally{badgeBusy112=false;}
}
setInterval(refreshPersonalBadge112,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshPersonalBadge112();});
window.addEventListener('focus',()=>void refreshPersonalBadge112());
window.addEventListener('storage',event=>{if(event.key===AUTH_STORAGE){void personalBadge112(0);void refreshPersonalBadge112();}});
void refreshPersonalBadge112();
