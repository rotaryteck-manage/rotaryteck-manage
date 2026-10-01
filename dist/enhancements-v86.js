'use strict';

async function workOptions86(){
 try{
  const response=await apiFetch('/api/schedule?view=options'),data=await response.json();
  if(!response.ok)throw Error(data.error||'無法讀取工作項目選單');
  modal('工作項目下拉選單','<p class="muted">每行一個工作項目；上下順序就是排程下拉選單的順序。刪除選項不會改掉舊排程名稱。</p><label class="field">選單內容<textarea name="items" rows="12" required>'+esc((data.items||[]).join('\n'))+'</textarea></label>','儲存選單',async fd=>{
   const items=String(fd.get('items')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   if(!items.length)throw Error('請至少保留一個工作項目');
   if(new Set(items).size!==items.length)throw Error('工作項目不可重複');
   const save=await apiFetch('/api/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'options',items,contents:Array.isArray(data.contents)?data.contents:[]})}),result=await save.json();
   if(!save.ok)throw Error(result.error||'工作項目選單儲存失敗');
   if(scheduleData56?.options)scheduleData56.options={items,contents:Array.isArray(data.contents)?data.contents:[]};
   $('#modal').close();toast('工作項目選單已儲存');
  });
 }catch(error){toast(error.message||'無法開啟工作項目選單')}
}

function scheduleDailyOrder86(){
 if(scheduleTab56!=='daily')return;
 for(const links of document.querySelectorAll('.schedule-calendar-links67')){
  links.querySelectorAll('[data-day-legacy],.leave-slot72').forEach(x=>x.remove());
  const buttons=[...links.querySelectorAll('button')].sort((a,b)=>{
   const rank=x=>x.hasAttribute('data-day-jobs')?1:x.classList.contains('leave-link72')?2:x.hasAttribute('data-day-material-id')?3:4;
   return rank(a)-rank(b);
  });
  buttons.forEach((button,index)=>{button.style.gridRow=String(index+1);links.append(button)});
 }
}
const scheduleDrawBefore86=scheduleDraw56;
scheduleDraw56=function(){scheduleDrawBefore86();scheduleDailyOrder86()};

function notificationFold86(panel,label,count){
 if(!panel||panel.matches('details'))return panel;
 const details=document.createElement('details');details.className='notification-fold86';
 const summary=document.createElement('summary');summary.dataset.baseLabel=label;summary.textContent=label+(count===undefined?'':'（'+count+'）');
 const heading=panel.querySelector('h3');heading?.remove();details.append(summary,...panel.childNodes);panel.replaceWith(details);return details;
}
function notificationAdmin86(){
 const root=$('#notification-admin-root81');if(!root)return;
 const panels=[...root.querySelectorAll('.notification-panel81')];
 const ruleCount=Array.isArray(state.notificationRules)?state.notificationRules.length:0;
 const rules=notificationFold86(panels[0],'通知規則',ruleCount),logs=notificationFold86(panels[1],'通知紀錄');
 const ruleBox=rules?.querySelector('#notification-rule-list81');if(ruleBox&&!ruleBox.dataset.count86){ruleBox.dataset.count86='1';const update=()=>{const n=ruleBox.querySelectorAll('.admin-row').length;rules.querySelector('summary').textContent='通知規則（'+n+'）'};new MutationObserver(update).observe(ruleBox,{childList:true,subtree:true});update()}
 const logBox=logs?.querySelector('#notification-log-list81');if(logBox&&!logBox.dataset.count86){logBox.dataset.count86='1';const update=()=>{const n=logBox.querySelectorAll('.admin-row').length;logs.querySelector('summary').textContent='通知紀錄（'+n+'）'};new MutationObserver(update).observe(logBox,{childList:true,subtree:true});update()}
 if(!$('#notification-key-status86')){const status=document.createElement('div');status.id='notification-key-status86';status.className='notification-key-status86';root.querySelector('.admin-actions')?.after(status);status.innerHTML='<strong>通知金鑰狀態</strong><span>正在檢查…</span><button type="button">重新檢查</button>';status.querySelector('button').onclick=notificationKeyStatus86;notificationKeyStatus86()}
 const schedule=document.querySelector('[data-section-key="schedule-settings"] .admin-actions');if(schedule&&!$('#schedule-options86')){const button=document.createElement('button');button.id='schedule-options86';button.type='button';button.textContent='設定工作項目下拉選單';button.onclick=workOptions86;schedule.append(button)}
}
async function notificationKeyStatus86(){
 const box=$('#notification-key-status86');if(!box)return;const value=box.querySelector('span');value.textContent='正在檢查…';value.className='';
 try{const response=await apiFetch('/api/push-public-key?status=1'),data=await response.json();if(!response.ok)throw Error(data.error||'無法檢查通知金鑰');value.textContent=data.message;value.className=data.ok?'success86':'error'}catch(error){value.textContent=error.message||'無法檢查通知金鑰';value.className='error'}
}
const renderAdminBefore86=renderAdmin;
renderAdmin=function(){renderAdminBefore86();notificationAdmin86()};
