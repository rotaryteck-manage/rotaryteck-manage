
'use strict';
async function notificationLogs85(){
 const box=document.querySelector('#notification-log-list81');if(!box)return;
 try{const response=await apiFetch('/api/notification-logs'),data=await response.json();if(!response.ok)throw Error(data.error);if(!box.isConnected)return;
 const items=data.items||[],failed=items.filter(r=>r.status==='failed').length;
 box.innerHTML='<div class="notification-log-tools87"><button type="button" data-notification-clear87="failed" '+(failed?'':'disabled')+'>清除失敗紀錄（'+failed+'）</button><button type="button" class="danger-button" data-notification-clear87="all" '+(items.length?'':'disabled')+'>清除全部</button></div>'+(items.map(r=>'<div class="admin-row"><div><strong>'+esc(r.employee_name||'已移除人員')+' · '+esc(r.title)+'</strong><small>'+esc(receiptTime(r.created_at))+' · '+esc(({sent:'已送出',failed:'發送失敗',pending:'等待／傳送中'})[r.status]||r.status)+'</small>'+(r.error_message?'<small class="error">'+esc(r.error_message)+'</small>':'')+'</div><button type="button" class="notification-log-delete87" data-notification-log-delete87="'+esc(r.id)+'">刪除</button></div>').join('')||'<p class="muted">尚無通知紀錄。</p>');
 box.querySelectorAll('[data-notification-log-delete87]').forEach(button=>button.onclick=()=>notificationLogDelete87({id:button.dataset.notificationLogDelete87},'確定刪除這一筆通知紀錄？'));
 box.querySelectorAll('[data-notification-clear87]').forEach(button=>button.onclick=()=>notificationLogDelete87({scope:button.dataset.notificationClear87},button.dataset.notificationClear87==='failed'?'確定清除所有發送失敗的通知紀錄？':'確定清除全部通知紀錄？此動作無法復原。'));
 }catch(e){if(box.isConnected)box.textContent=e.message||'通知紀錄讀取失敗';}
}
async function notificationLogDelete87(payload,message){
 if(!await confirmAction(message))return;
 try{const response=await apiFetch('/api/notification-logs',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await response.json();if(!response.ok)throw Error(data.error);toast('已刪除 '+data.deleted+' 筆通知紀錄');await notificationLogs85()}catch(error){toast(error.message||'通知紀錄刪除失敗')}
}
const adminRender85=renderAdmin;renderAdmin=function(){adminRender85();notificationLogs85();if(canDo('schedule.people')&&!canDo('admin.settings')){const host=document.querySelector('#delegated-admin75');if(host){const button=document.createElement('button');button.type='button';button.textContent='調整排程人員排序';button.onclick=schedulePeopleSort85;host.append(button);}}};

async function schedulePeopleSort85(){try{const response=await apiFetch('/api/employee-order'),data=await response.json();if(!response.ok)throw Error(data.error);numberedOrderDialog('人員名單排序',data.items.map(p=>({id:p.id,label:p.name+(p.status==='active'?'':'（停用）')})),async order=>{const r=await apiFetch('/api/employee-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order})}),d=await r.json();if(!r.ok)throw Error(d.error);toast('人員順序已儲存');});}catch(e){toast(e.message)}}
