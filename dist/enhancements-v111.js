'use strict';

// Page data refresh and notification cron display are independent clocks.
const silentRefreshInterval111=5*60*1000;
let lastActivity111=Date.now(),lastSuccessfulSync111=0,lastSilentAttempt111=0,silentRefreshBusy111=false;

function syncClock111(value=lastSuccessfulSync111){
 if(!value)return '--:-- 已更新';
 return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value))+' 已更新';
}

function accountSyncStatus111(){
 const tools=document.querySelector('.account-status944');if(!tools)return;
 let stack=tools.querySelector('.account-stack111');
 if(!stack){
  const old=tools.querySelector('small'),button=tools.querySelector('.refresh944');
  stack=document.createElement('span');stack.className='account-stack111';
  stack.innerHTML='<small class="account-version111">11.3v</small><small class="account-sync111">'+syncClock111()+'</small>';
  if(old)old.replaceWith(stack);else tools.prepend(stack);
  if(button)tools.append(button);
 }
 const version=stack.querySelector('.account-version111'),sync=stack.querySelector('.account-sync111'),stamp=syncClock111();
 if(version.textContent!=='11.3v')version.textContent='11.3v';
 if(sync.textContent!==stamp)sync.textContent=stamp;
}

function silentRefreshAllowed111(){
 if(!cloudReady||cloudBusy||failedCandidate||silentRefreshBusy111||document.hidden)return false;
 const dialog=document.querySelector('#modal[open]');
 if(dialog&&!dialog.querySelector('#ledger-rows'))return false;
 if(document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]'))return false;
 try{captureDraft();if(JSON.stringify(state)!==JSON.stringify(confirmed))return false}catch{return false}
 return true;
}

function silentRefreshContext111(){
 return{hash:location.hash,scrollX:window.scrollX,scrollY:window.scrollY,ledger:Boolean(document.querySelector('#modal[open] #ledger-rows')),ledgerFilter:typeof ledgerFilter==='undefined'?'all':ledgerFilter,ledgerQuery:typeof ledgerQuery==='undefined'?'':ledgerQuery};
}

async function silentRefresh111(){
 if(!silentRefreshAllowed111())return false;
 silentRefreshBusy111=true;lastSilentAttempt111=Date.now();const context=silentRefreshContext111();
 try{
  const response=await apiFetch('/api/state',{signal:AbortSignal.timeout(20000)}),data=await cloudJSON921(response,'自動更新');
  if(!response.ok)throw Error(data.error||'自動更新失敗');
  if(data.storageVersion!==2)throw Error('伺服器版本不同');
  const changed=Number(data.revision)!==Number(revision);
  if(data.serverTime&&typeof serverClockOffset44!=='undefined')serverClockOffset44=Date.parse(data.serverTime)-Date.now();
  state=data.state||{projects:[],deletedProjects:[],logs:[]};recordVersions=data.versions||{};revision=data.revision;currentUser=data.currentUser||currentUser;confirmed=JSON.parse(JSON.stringify(state));
  lastSuccessfulSync111=Date.now();accountSyncStatus111();
  if(changed){
   if(context.hash==='#admin')renderAdmin();else render();
   if(context.ledger&&context.hash==='#plating'&&typeof openPlatingLedger==='function'){
    ledgerFilter=context.ledgerFilter;ledgerQuery=context.ledgerQuery;openPlatingLedger();
   }
   requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo(context.scrollX,context.scrollY)));
  }
  return true;
 }catch(error){console.warn('靜默更新失敗',error)}finally{silentRefreshBusy111=false}
 return false;
}

for(const event of ['pointerdown','keydown','input','change','wheel','touchstart'])addEventListener(event,()=>{lastActivity111=Date.now()},{capture:true,passive:true});
setInterval(()=>{if(Date.now()-lastActivity111>=silentRefreshInterval111&&Date.now()-lastSuccessfulSync111>=silentRefreshInterval111&&Date.now()-lastSilentAttempt111>=silentRefreshInterval111)silentRefresh111()},30000);
new MutationObserver(accountSyncStatus111).observe(document.body,{childList:true,subtree:true});

const startCloudBefore111=startCloud;
startCloud=async function(){const result=await startCloudBefore111.apply(this,arguments);if(cloudReady){lastSuccessfulSync111=Date.now();accountSyncStatus111()}return result};
addEventListener('load',accountSyncStatus111);accountSyncStatus111();

document.documentElement.dataset.appVersion='11.3v';
