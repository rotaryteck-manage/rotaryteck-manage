'use strict';

// Notification settings only: show the latest automatic scheduler heartbeat.
function notificationSchedulerStatus108(status){
 const tools=document.querySelector('#notification-rule-list81 .notification-tools94');if(!tools)return;
 let line=tools.querySelector('.notification-scheduler108');
 if(!line){line=document.createElement('small');line.className='notification-scheduler108';tools.append(line)}
 const failed=status?.status==='failed',overdue=Boolean(status?.overdue),running=status?.status==='running';
 line.classList.toggle('error',failed||overdue);
 if(!status||status.status==='never'){line.textContent='自動排程：尚未收到檢查紀錄';return}
 const stamp=status.completed_at||status.started_at||status.scheduled_for,label=failed?'失敗':running?'檢查中':overdue?'超過 6 分鐘未更新':'成功';
 line.textContent='最近自動檢查：'+receiptTime(stamp)+' · '+label+(status.status==='ok'?' · 符合 '+Number(status.eligible||0)+' 筆 · 送出 '+Number(status.sent||0)+' 台':'')+(status.error_message?' · '+status.error_message:'');
}

document.documentElement.dataset.appVersion='10.8v';
