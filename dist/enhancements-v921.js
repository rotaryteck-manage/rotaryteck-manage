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
  [...box.querySelectorAll('[data-log-rows88] .admin-row')].forEach((row,index)=>{const item=(data.items||[])[index],line=row.querySelector('small');if(item?.source&&line&&!line.dataset.source103){line.dataset.source103='';line.append(' · '+item.source)}});
  const audit=box.querySelector('.notification-test-audit92');if(audit&&(data.testAudits||[]).some(x=>x.results?.length)){const detail=document.createElement('div');detail.className='notification-test-devices921';detail.innerHTML=(data.testAudits||[]).map(item=>'<details><summary>'+esc(receiptTime(item.created_at))+' · '+esc(item.actor_name)+' → '+esc(item.target_employee)+'</summary>'+(item.results||[]).map(device=>'<p><strong>'+esc(device.employeeName||'')+' '+esc(device.deviceLabel||'未命名裝置')+'</strong><span>'+(device.ok?'成功':device.deferred?'因額度延後':'失敗')+'</span>'+(device.error?'<small class="error">'+esc(device.error)+'</small>':'')+'</p>').join('')+'</details>').join('');audit.append(detail)}
 }catch{}
};

const renderNotificationRulesBefore921=renderNotificationRules81;
renderNotificationRules81=function(){
 renderNotificationRulesBefore921();
 document.querySelectorAll('.notification-rule-row88').forEach(row=>{const edit=row.querySelector('[data-notification-edit81]'),rule=(state.notificationRules||[]).find(item=>String(item.id)===String(edit?.dataset.notificationEdit81));if(!rule||['material','holiday','closure','leave'].includes(rule.type)||row.querySelector('[data-notification-catchup921]'))return;const button=document.createElement('button');button.type='button';button.dataset.notificationCatchup921=rule.id;button.textContent='補發';button.title='檢查今天尚未成功送達的排程通知';button.onclick=()=>notificationCatchup921(rule);row.append(button)});
};

async function notificationCatchup921(rule){
 try{const response=await apiFetch('/api/notification-logs?catchup='+encodeURIComponent(rule.id)),data=await response.json();if(!response.ok)throw Error(data.error||'無法檢查缺漏通知');const items=data.items||[];if(!items.length){modal('補發「'+esc(rule.name)+'」','<p>今天目前沒有缺漏通知。</p><p class="muted">系統只檢查今天已到發送時間、仍符合規則且尚未成功送達的項目；不會補發過去紀錄。</p>',null);return}modal('補發「'+esc(rule.name)+'」','<p class="muted">以下是 '+esc(data.day)+' '+esc(data.ruleTime)+' 應由自動排程發送、目前仍未成功送達的訊息。請勾選後手動補發；已成功的裝置不會重複收到。</p><div class="notification-catchup103">'+items.map(item=>'<label class="notification-catchup-row103 '+(item.sendable?'':'is-disabled')+'"><input type="checkbox" name="selectionIds" value="'+esc(item.id)+'" '+(item.sendable?'':'disabled')+'><span><strong>'+esc(item.employeeName)+' · '+esc(item.title)+'</strong><small>'+esc(item.category)+' · '+esc(item.source)+' · '+item.eventCount+' 項 · '+item.missingDevices+' 台待補發'+(item.failedDevices?' · '+item.failedDevices+' 台曾失敗':'')+(item.exhaustedDevices?' · '+item.exhaustedDevices+' 台已達重試上限':'')+'</small><em>'+esc(item.message)+'</em></span></label>').join('')+'</div>','發送勾選項目',async form=>{const selectionIds=form.getAll('selectionIds').map(String);if(!selectionIds.length)throw Error('請至少勾選一則缺漏通知');if(!await confirmAction('確定手動補發已勾選的 '+selectionIds.length+' 則通知？'))return;const sent=await apiFetch('/api/notification-logs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ruleId:rule.id,selectionIds})}),result=await sent.json();if(!sent.ok)throw Error(result.error||'補發失敗');$('#modal').close();toast(result.source+'完成：成功 '+result.sent+' 台，失敗 '+result.failed+' 台，延後 '+result.deferred+' 台')})}catch(error){toast(error.message||'無法開啟補發功能')}
}
