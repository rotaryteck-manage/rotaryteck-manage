'use strict';

function notificationDeepLink93(){
 if(!window.cloudReady)return setTimeout(notificationDeepLink93,250);
 const q=new URLSearchParams(location.search),wire=q.get('notificationWire'),project=q.get('notificationPlatingProject'),shipment=q.get('notificationPlatingShipment');
 if(wire&&location.hash==='#wire'&&!sessionStorage.getItem('notification-open:'+location.href)){
  sessionStorage.setItem('notification-open:'+location.href,'1');openWireRestock();setTimeout(()=>{const row=document.querySelector('[data-restock-row="'+CSS.escape(wire)+'"]');if(row){row.classList.add('notification-focus93');row.scrollIntoView({block:'center'})}else toast('這筆線材已處理或已刪除。')},50);
 }
 if(project&&shipment&&location.hash==='#plating'&&!sessionStorage.getItem('notification-open:'+location.href)){
  sessionStorage.setItem('notification-open:'+location.href,'1');const p=platingFind(project),s=p?.shipments?.find(x=>x.id===shipment);if(s)editPlatingShipment(project,shipment);else{openPlatingLedger();toast('這筆電鍍紀錄已處理或已刪除，已開啟電鍍總覽。')}
 }
}
addEventListener('hashchange',()=>setTimeout(notificationDeepLink93));addEventListener('load',()=>setTimeout(notificationDeepLink93));

const notificationLogsBefore93=notificationLogs85;
notificationLogs85=async function(){
 await notificationLogsBefore93();const box=$('#notification-log-list81');if(!box)return;
 try{const response=await apiFetch('/api/notification-logs'),data=await response.json();if(!response.ok)return;const audit=box.querySelector('.notification-test-audit92');if(!audit)return;
  audit.innerHTML='<summary>測試通知紀錄（'+data.testAudits.length+'）</summary>'+data.testAudits.map(item=>'<details class="notification-test-item93"><summary><strong>'+esc(item.title)+'</strong><small>'+esc(receiptTime(item.created_at))+' · '+esc(item.actor_name)+' → '+esc(item.target_employee)+' · 成功 '+item.sent_count+'/'+item.device_count+' 台</small></summary><p>'+esc(item.message)+'</p><div class="notification-device-results92">'+(item.results||[]).map(device=>'<div class="admin-row"><div><strong>'+esc(device.employeeName||'')+' '+esc(device.deviceLabel||'未命名裝置')+'</strong><small>'+(device.ok?'成功':device.deferred?'因額度延後':'失敗')+'</small>'+(device.error?'<small class="error">'+esc(device.error)+'</small>':'')+'</div></div>').join('')+'</div></details>').join('');
 }catch{}
};
