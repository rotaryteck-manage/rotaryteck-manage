
'use strict';
async function notificationLogs85(){
 const box=document.querySelector('#notification-log-list81');if(!box)return;
 try{const response=await apiFetch('/api/notification-logs'),data=await response.json();if(!response.ok)throw Error(data.error);if(!box.isConnected)return;
 box.innerHTML=(data.items||[]).map(r=>'<div class="admin-row"><div><strong>'+esc(r.employee_name||'已移除人員')+' · '+esc(r.title)+'</strong><small>'+esc(receiptTime(r.created_at))+' · '+esc(({sent:'已送出',failed:'發送失敗',pending:'等待／傳送中'})[r.status]||r.status)+'</small>'+(r.error_message?'<small class="error">'+esc(r.error_message)+'</small>':'')+'</div></div>').join('')||'<p class="muted">尚無通知紀錄。</p>';
 }catch(e){if(box.isConnected)box.textContent=e.message||'通知紀錄讀取失敗';}
}
const adminRender85=renderAdmin;renderAdmin=function(){adminRender85();notificationLogs85();if(canDo('schedule.people')&&!canDo('admin.settings')){const host=document.querySelector('#delegated-admin75');if(host){const button=document.createElement('button');button.type='button';button.textContent='調整排程人員排序';button.onclick=schedulePeopleSort85;host.append(button);}}};

async function schedulePeopleSort85(){try{const response=await apiFetch('/api/employee-order'),data=await response.json();if(!response.ok)throw Error(data.error);numberedOrderDialog('人員名單排序',data.items.map(p=>({id:p.id,label:p.name+(p.status==='active'?'':'（停用）')})),async order=>{const r=await apiFetch('/api/employee-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order})}),d=await r.json();if(!r.ok)throw Error(d.error);toast('人員順序已儲存');});}catch(e){toast(e.message)}}
