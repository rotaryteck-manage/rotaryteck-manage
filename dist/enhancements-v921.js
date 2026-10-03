'use strict';

const notificationSourceNames921={'manual-test':'手動測試','rule-preview':'規則預覽','holiday-preview':'假日模擬','closure-preview':'停班模擬'};
function notificationSourceText921(value){return notificationSourceNames921[value]||value||'手動測試'}

const notificationLogsBefore921=notificationLogs85;
notificationLogs85=async function(){
 await notificationLogsBefore921();
 const box=$('#notification-log-list81');if(!box)return;
 try{
  const response=await apiFetch('/api/notification-logs'),data=await response.json();if(!response.ok)return;
  const quota=data.quota||{},summary=document.createElement('div');summary.className='notification-quota921';summary.innerHTML='<strong>今日通知額度</strong><span>已使用 '+Number(quota.used||0)+'／'+Number(quota.limit||200)+'，剩餘 '+Number(quota.remaining||0)+'</span><small>只有實際嘗試發送的裝置會計算；已發送過的通知不重複占用。</small>';box.prepend(summary);
  const failedDevices=(data.items||[]).reduce((total,item)=>total+Number(item.failed||0),0),allDevices=(data.items||[]).reduce((total,item)=>total+(item.devices||[]).length,0),failedButton=box.querySelector('[data-notification-clear87="failed"]'),allButton=box.querySelector('[data-notification-clear87="all"]');if(failedButton)failedButton.textContent='清除失敗裝置紀錄（'+failedDevices+' 筆）';if(allButton)allButton.textContent='清除全部發送紀錄（'+allDevices+' 筆）';
  const audit=box.querySelector('.notification-test-audit92');if(audit&&(data.testAudits||[]).some(x=>x.results?.length)){const detail=document.createElement('div');detail.className='notification-test-devices921';detail.innerHTML=(data.testAudits||[]).map(item=>'<details><summary>'+esc(receiptTime(item.created_at))+' · '+esc(item.actor_name)+' → '+esc(item.target_employee)+'</summary>'+(item.results||[]).map(device=>'<p><strong>'+esc(device.employeeName||'')+' '+esc(device.deviceLabel||'未命名裝置')+'</strong><span>'+(device.ok?'成功':device.deferred?'因額度延後':'失敗')+'</span>'+(device.error?'<small class="error">'+esc(device.error)+'</small>':'')+'</p>').join('')+'</details>').join('');audit.append(detail)}
 }catch{}
};

const renderNotificationRulesBefore921=renderNotificationRules81;
renderNotificationRules81=function(){
 renderNotificationRulesBefore921();
 document.querySelectorAll('.notification-rule-row88').forEach(row=>{const edit=row.querySelector('[data-notification-edit81]'),rule=(state.notificationRules||[]).find(item=>String(item.id)===String(edit?.dataset.notificationEdit81));if(!rule||['material','holiday','closure'].includes(rule.type)||row.querySelector('[data-notification-catchup921]'))return;const button=document.createElement('button');button.type='button';button.dataset.notificationCatchup921=rule.id;button.textContent='補發';button.title='由主管明確選擇人員後補發目前通知';button.onclick=()=>notificationCatchup921(rule);row.append(button)});
};

async function notificationCatchup921(rule){
 try{const response=await apiFetch('/api/employee-options?notification=1'),data=await response.json();if(!response.ok)throw Error(data.error||'無法讀取人員');const people=(data.items||[]).filter(item=>item.status==='active');modal('補發「'+esc(rule.name)+'」','<p class="muted">不會自動補發。只有這次勾選的人員會收到目前符合規則的內容。</p><div class="notification-people88">'+people.map(person=>'<label><input type="checkbox" name="employeeIds" value="'+esc(String(person.id))+'"> '+esc(person.name)+'</label>').join('')+'</div>','確認補發',async form=>{const employeeIds=form.getAll('employeeIds').map(Number);if(!employeeIds.length)throw Error('請至少選擇一位人員');if(!await confirmAction('確定補發？此動作會使用通知額度。'))return;const sent=await apiFetch('/api/notification-logs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ruleId:rule.id,employeeIds})}),result=await sent.json();if(!sent.ok)throw Error(result.error||'補發失敗');$('#modal').close();toast('補發完成：成功 '+result.sent+' 台，失敗 '+result.failed+' 台，延後 '+result.deferred+' 台')})}catch(error){toast(error.message||'無法開啟補發功能')}
}
