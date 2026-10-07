'use strict';

const notificationTargetLabelBefore94=notificationTargetLabel88;
notificationTargetLabel88=function(value){return({
 '/?notificationSection=restock#wire':'線材補貨待處理名單',
 '/?notificationPlatingOverview=all#plating':'電鍍總覽',
 '/?notificationPlatingOverview=pending#plating':'電鍍待處理名單'
})[value]||notificationTargetLabelBefore94(value)};

const notificationRuleTargetUrlBefore94=notificationRuleTargetUrl89;
notificationRuleTargetUrl89=function(target){return({
 'plating-overview':'/?notificationPlatingOverview=all#plating',
 'plating-pending':'/?notificationPlatingOverview=pending#plating'
})[target]||notificationRuleTargetUrlBefore94(target)};

const notificationTestDialogBefore94=notificationTestDialog82;
notificationTestDialog82=async function(){
 await notificationTestDialogBefore94();
 const select=$('#dialog-form [name="targetUrl"]');if(!select)return;
 for(const [value,label]of [['/?notificationSection=restock#wire','線材補貨待處理名單'],['/?notificationPlatingOverview=all#plating','電鍍總覽'],['/?notificationPlatingOverview=pending#plating','電鍍待處理名單']])if(![...select.options].some(x=>x.value===value)){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}
};

async function notificationRuleStatuses94(){
 const box=$('#notification-rule-list81');if(!box)return;
 try{const response=await apiFetch('/api/notification-check94'),data=await response.json();if(!response.ok)throw Error(data.error);const map=new Map((data.items||[]).map(x=>[String(x.id),x])),labels={disabled:'已停用',sent:'今日已發送',skipped:'今日已略過',scheduled:'今日等待發送',waiting:'等待檢查／沒有符合項目'};
  box.querySelectorAll('.notification-rule-row88').forEach(row=>{const id=row.querySelector('[data-notification-edit81]')?.dataset.notificationEdit81,item=map.get(String(id));if(!item)return;let badge=row.querySelector('.notification-today94');if(!badge){badge=document.createElement('small');badge.className='notification-today94';row.querySelector('div')?.append(badge)}badge.textContent=(labels[item.status]||item.status)+(item.status==='scheduled'?' · '+item.time:item.sent?' · '+item.sent+' 台':'')});if(typeof notificationSchedulerStatus108==='function')notificationSchedulerStatus108(data.scheduler);
 }catch(error){console.warn('通知狀態讀取失敗',error)}
}

const renderNotificationRulesBefore94=renderNotificationRules81;
renderNotificationRules81=function(){
 renderNotificationRulesBefore94();const box=$('#notification-rule-list81');if(!box)return;
 if(!box.querySelector('[data-notification-check94]')){const tools=document.createElement('div');tools.className='notification-tools94';tools.innerHTML='<button type="button" data-notification-check94>立即檢查通知</button><small>會執行正式通知規則；已發送過的紀錄不會重複。</small>';box.prepend(tools);tools.querySelector('button').onclick=async()=>{if(!await confirmAction('立即檢查會執行目前符合條件的正式通知，確定繼續？'))return;const button=tools.querySelector('button');button.disabled=true;button.textContent='檢查中…';try{const response=await apiFetch('/api/notification-check94',{method:'POST'}),data=await response.json();if(!response.ok)throw Error(data.error||'通知檢查失敗');toast('檢查完成：符合 '+Number(data.eligible||0)+' 筆');await notificationRuleStatuses94()}catch(error){toast(error.message||'通知檢查失敗')}finally{button.disabled=false;button.textContent='立即檢查通知'}}}
 notificationRuleStatuses94();
};

function notificationPlatingTarget94(){
 if(typeof cloudReady!=='undefined'&&!cloudReady)return setTimeout(notificationPlatingTarget94,250);const mode=new URLSearchParams(location.search).get('notificationPlatingOverview');if(!mode||location.hash!=='#plating'||sessionStorage.getItem('notification-plating-overview94:'+location.href))return;sessionStorage.setItem('notification-plating-overview94:'+location.href,'1');ledgerFilter=mode==='pending'?'sending':'all';openPlatingLedger();history.replaceState(null,'',location.pathname+'#plating');
}
addEventListener('load',()=>setTimeout(notificationPlatingTarget94));addEventListener('hashchange',()=>setTimeout(notificationPlatingTarget94));

// Deletions are reflected locally as soon as the user confirms them.  The
// authoritative save still runs normally; on failure cloud.js renders the
// confirmed snapshot and restores the row.
let pendingDeleteTarget94=null;
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||button.closest('[data-confirmation]'))return;
 if(/刪除|移除|清除/.test(button.textContent||''))pendingDeleteTarget94=button;
},true);
const confirmActionBefore94=confirmAction;
confirmAction=async function(message){
 const target=pendingDeleteTarget94;pendingDeleteTarget94=null;const approved=await confirmActionBefore94(message);if(!approved||!target?.isConnected)return approved;
 const row=target.closest('[data-project-row],tr,.admin-row,.ledger-row,.record-row,.card,.schedule-entry,li');
 if(row){row.classList.add('pending-delete94');setTimeout(()=>row.isConnected&&row.classList.remove('pending-delete94'),25000)}
 return approved;
};
