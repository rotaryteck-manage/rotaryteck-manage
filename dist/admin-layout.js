'use strict';
function adminSectionKey(card){if(card.id)return card.id;for(const [selector,key]of [['#export-warehouse-admin','warehouse'],['#add-field','fields'],['#add-page','pages'],['#plating-text','plating']])if(card.querySelector(selector))return key;return null;}
function orderedAdminKeys(keys,saved){return [...new Set([...(Array.isArray(saved)?saved:[]).filter(k=>keys.includes(k)),...keys])];}
let adminActiveSection='employee-admin',adminSorting=false;
const renderAdminBeforeLayout=renderAdmin;
renderAdmin=function(){
 renderAdminBeforeLayout();if(!canDo('admin.view'))return;
 const main=$('main'),cards=[...main.querySelectorAll(':scope > .admin-card')],map=new Map();
 for(const card of cards){const key=adminSectionKey(card);if(!key)continue;const panel=document.createElement('section');panel.className='admin-card admin-tab-panel';panel.id=card.id;panel.dataset.sectionKey=key;const title=card.querySelector('summary h2');if(title)panel.append(title);const body=card.querySelector('.admin-card-body');if(body)panel.append(body);card.replaceWith(panel);map.set(key,panel);}
 const top=$('#export-all').parentElement,publish=$('#publish-site').parentElement;
 function settingsPanel(key,title){const panel=document.createElement('section');panel.className='admin-card admin-tab-panel';panel.dataset.sectionKey=key;const heading=document.createElement('h2');heading.textContent=title;const actions=document.createElement('div');actions.className='admin-actions';panel.append(heading,actions);main.append(panel);map.set(key,panel);return actions;}
 const website=settingsPanel('website-settings',adminText('websiteSettingsTitle')),schedule=settingsPanel('schedule-settings','工作排程'),notifications=settingsPanel('notification-settings','系統通知'),backup=settingsPanel('backup',adminText('backupTitle'));
 const scheduleHelp=document.createElement('p');scheduleHelp.className='muted';scheduleHelp.textContent='設定排程畫面的文字、按鈕與人員顯示順序。';schedule.before(scheduleHelp);
 const notificationHelp=document.createElement('p');
notificationHelp.className='muted';
notificationHelp.textContent='設定通知內容、發送時間、接收人員、首次提醒與重新提醒週期。';
notifications.before(notificationHelp);

const notificationRoot=document.createElement('div');
notificationRoot.id='notification-admin-root81';
notifications.append(notificationRoot);
notificationRoot.innerHTML=
 '<div class="admin-actions">'+
  '<button type="button" id="notification-add81">＋新增通知</button>'+
  '<button type="button" id="notification-test81">發送測試通知</button>'+
  '<button type="button" id="notification-devices81">裝置通知狀態</button>'+
 '</div>'+
 '<div class="notification-panel81">'+
  '<h3>通知規則</h3>'+
  '<div id="notification-rule-list81" class="notification-rule-list81">'+
   '<p class="muted">目前尚未建立通知規則。</p>'+
  '</div>'+
 '</div>'+
 '<div class="notification-panel81">'+
  '<h3>通知紀錄</h3>'+
  '<div id="notification-log-list81">'+
   '<p class="muted">目前尚無通知發送紀錄。</p>'+
  '</div>'+
 '</div>';
 $('#notification-add81').onclick=()=>notificationRuleDialog81();
 renderNotificationRules81();
 $('#notification-devices81').onclick=()=>notificationDevicesDialog82();
 $('#notification-test81').onclick=()=>notificationTestDialog82();
 for(const [label,action] of [['修改排程文字／按鈕',()=>scheduleTextDialog63()],['調整人員名單順序',async()=>{await loadEmployees();const button=$('#employee-sort');if(button)button.click();else toast('員工名單讀取失敗，請重新開啟後台')} ]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;schedule.append(b)}
 for(const node of [...top.children])(['export-all','import-data'].includes(node.id)?backup:website).append(node);top.remove();
 const exportButton=document.createElement('button');exportButton.id='export-every-photo';exportButton.textContent=adminText('exportEveryPhotoButton');exportButton.onclick=()=>exportEveryPhoto(exportButton);backup.append(exportButton);
 const keys=orderedAdminKeys([...map.keys()],state.adminSectionOrder),toolbar=document.createElement('div');toolbar.className='admin-tabs-toolbar';const nav=document.createElement('nav');nav.className='admin-tabs';nav.setAttribute('aria-label',adminText('title'));const sort=document.createElement('button');sort.id='admin-sort-toggle';sort.textContent=adminText(adminSorting?'finishSortButton':'sortButton');sort.setAttribute('aria-pressed',String(adminSorting));sort.onclick=()=>{adminSorting=!adminSorting;renderAdmin();};toolbar.append(nav,sort);main.querySelector('h1').after(toolbar);
 const subtitle=main.querySelector(':scope > p.muted');if(subtitle?.textContent==='各區塊都可展開或收合，需要時再打開。')subtitle.remove();
 const sorting=document.createElement('div');sorting.className='admin-sort-grid';sorting.hidden=!adminSorting;toolbar.after(sorting);
 const publishHost=document.createElement('div');publishHost.className='admin-publish-host';
 function select(key){adminActiveSection=key;for(const [id,panel]of map)panel.hidden=id!==key;nav.querySelectorAll('button').forEach(b=>{b.classList.toggle('selected',b.dataset.adminTab===key);b.setAttribute('aria-pressed',String(b.dataset.adminTab===key));});if(key==='fields'||key==='pages'){map.get(key).append(publishHost);publishHost.append(publish);}else publishHost.remove();}
 keys.forEach((key,index)=>{const panel=map.get(key);main.append(panel);const title=panel.querySelector('h2').textContent,b=document.createElement('button');b.type='button';b.dataset.adminTab=key;b.textContent=title;b.onclick=()=>select(key);nav.append(b);
 const row=document.createElement('div');row.className='admin-sort-item';row.dataset.sortKey=key;const name=document.createElement('span');name.textContent=title;row.append(name);sorting.append(row);
 for(const [symbol,delta,label]of [['↑',-4,'上移'],['↓',4,'下移'],['←',-1,'前移'],['→',1,'後移']]){const move=document.createElement('button');move.type='button';move.textContent=symbol;move.setAttribute('aria-label',title+' '+label);const step=()=>Math.abs(delta)===4?Math.sign(delta)*(getComputedStyle(sorting).gridTemplateColumns.split(' ').filter(Boolean).length||1):delta;move.disabled=index+step()<0||index+step()>=keys.length;move.onclick=async()=>{if(cloudBusy||failedCandidate)return;const to=index+step();if(to<0||to>=keys.length)return;const next=[...keys];[next[index],next[to]]=[next[to],next[index]];state.adminSectionOrder=next;addAudit('調整後台區塊順序',title,'管理後台');await saveCloud(state);renderAdmin();};row.append(move);}
 });publish.remove();select(map.has(adminActiveSection)?adminActiveSection:keys[0]);
};
async function notificationTestDialog82(){
 try{
  const response=await apiFetch('/api/employees');
  const data=await response.json();

  if(!response.ok)
   throw Error(data.error||'無法讀取員工名單');

  const employees=(data.items||[])
   .filter(employee=>employee.status==='active');

  if(!employees.length){
   toast('目前沒有可接收測試通知的員工');
   return;
  }

  modal(
   '發送測試通知',

   '<label class="field">接收人員'+
    '<select name="employeeId" required>'+
     '<option value="">請選擇員工</option>'+
     employees.map(employee=>
      '<option value="'+esc(String(employee.id))+'">'+
       esc(employee.name)+
      '</option>'
     ).join('')+
    '</select>'+
   '</label>'+

   '<p class="muted">'+
    '測試通知會發送到該員工目前所有已啟用的通知裝置。'+
   '</p>',

   '發送測試通知',

   async fd=>{
    const employeeId=Number(fd.get('employeeId'));

    if(!employeeId)
     throw Error('請選擇接收人員');

    const response=await apiFetch('/api/push-test',{
     method:'POST',
     headers:{
      'Content-Type':'application/json'
     },
     body:JSON.stringify({
      employeeId
     })
    });

    const data=await response.json();

    if(!response.ok)
     throw Error(data.error||'測試通知發送失敗');

    $('#modal').close();

    if(data.failed){
     toast(
      '測試完成：成功 '+data.sent+
      ' 台，失敗 '+data.failed+' 台'
     );
    }else{
     toast(
      '測試通知已發送給 '+data.employeeName+
      '，共 '+data.sent+' 台裝置'
     );
    }
   }
  );

 }catch(error){
  toast(error.message||'無法開啟測試通知');
 }
}
async function notificationDevicesDialog82(){
 modal(
  '裝置通知狀態',
  '<div id="notification-device-list82">'+
   '<p class="muted">正在讀取通知裝置…</p>'+
  '</div>',
  ''
 );

 const box=$('#notification-device-list82');

 try{
  const response=
   await apiFetch('/api/push-subscription?admin=1');

  const data=await response.json();

  if(!response.ok)
   throw Error(data.error||'無法讀取通知裝置');

  const people=Array.isArray(data.people)
   ?data.people
   :[];

  if(!people.length){
   box.innerHTML=
    '<p class="muted">目前沒有員工資料。</p>';
   return;
  }

  box.innerHTML=people.map(person=>{
   const devices=person.devices||[];

   return (
    '<div class="notification-person-devices82">'+
     '<h3>'+esc(person.name)+'</h3>'+

     (
      devices.length
       ?devices.map(device=>(
        '<div class="admin-row">'+
         '<div>'+
          '<strong>'+
           esc(device.deviceLabel||'未命名裝置')+
          '</strong>'+
          '<div class="muted">'+
           (device.enabled?'通知已開啟':'通知已停用')+
           (device.lastSeenAt
            ?' · 最後連線 '+esc(receiptTime(device.lastSeenAt))
            :'')+
           (device.lastSuccessAt
            ?' · 最後成功 '+esc(receiptTime(device.lastSuccessAt))
            :'')+
          '</div>'+
         '</div>'+
         '<span>'+
 (device.enabled?'🟢 已開啟':'⚪ 已停用')+
'</span>'+

'<button type="button" data-notification-device-toggle82="'+esc(device.id)+'" data-enabled="'+(device.enabled?'1':'0')+'">'+
 (device.enabled?'停用':'啟用')+
'</button>'+

'<button type="button" class="danger-button" data-notification-device-delete82="'+esc(device.id)+'">'+
 '移除'+
'</button>'+

'</div>'+
       ).join('')
       :'<p class="muted">尚未開啟通知</p>'
     )+

    '</div>'
   );
  }).join('');
box.querySelectorAll('[data-notification-device-toggle82]').forEach(button=>{
 button.onclick=async()=>{
  try{
   const enabled=button.dataset.enabled!=='1';

   const response=await apiFetch(
    '/api/push-subscription?admin=1',
    {
     method:'PATCH',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({
      id:button.dataset.notificationDeviceToggle82,
      enabled
     })
    }
   );

   const data=await response.json();

   if(!response.ok)
    throw Error(data.error||'裝置狀態修改失敗');

   $('#modal').close();
   notificationDevicesDialog82();
   toast(enabled?'裝置通知已啟用':'裝置通知已停用');

  }catch(error){
   toast(error.message||'裝置狀態修改失敗');
  }
 };
});

box.querySelectorAll('[data-notification-device-delete82]').forEach(button=>{
 button.onclick=async()=>{
  const ok=await confirmAction(
   '確定移除這台通知裝置？之後若要恢復，需要在該裝置重新開啟通知。'
  );

  if(!ok)return;

  try{
   const response=await apiFetch(
    '/api/push-subscription?admin=1',
    {
     method:'DELETE',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({
      id:button.dataset.notificationDeviceDelete82
     })
    }
   );

   const data=await response.json();

   if(!response.ok)
    throw Error(data.error||'移除裝置失敗');

   $('#modal').close();
   notificationDevicesDialog82();
   toast('通知裝置已移除');

  }catch(error){
   toast(error.message||'移除裝置失敗');
  }
 };
});
}catch(error){
  box.innerHTML=
   '<p class="error">'+
    esc(error.message||'讀取失敗')+
   '</p>';
 }
}
function renderNotificationRules81(){
 const box=$('#notification-rule-list81');
 if(!box)return;

 const rules=Array.isArray(state.notificationRules)
  ?state.notificationRules
  :[];

 if(!rules.length){
  box.innerHTML='<p class="muted">目前尚未建立通知規則。</p>';
  return;
 }

 const typeNames81={
  work:'每日工作提醒',
  report:'工作回報提醒',
  wire:'線材補貨逾期提醒',
  plating:'電鍍回貨提醒'
 };

 box.innerHTML=rules.map(rule=>
  '<div class="admin-row">'+
   '<div>'+
    '<strong>'+esc(rule.name)+'</strong>'+
    '<div class="muted">'+
     esc(typeNames81[rule.type]||rule.type)+
     ' · '+esc(rule.time)+
     (Number(rule.repeatDays)>0
      ?' · 每 '+Number(rule.repeatDays)+' 天重新提醒'
      :' · 不重複提醒')+
    '</div>'+
   '</div>'+

   '<span>'+(rule.enabled?'啟用':'停用')+'</span>'+
'<button type="button" data-notification-edit81="'+esc(rule.id)+'">'+
 '編輯'+
'</button>'+
   '<button type="button" data-notification-toggle81="'+esc(rule.id)+'">'+
    (rule.enabled?'停用':'啟用')+
   '</button>'+

   '<button type="button" class="danger-button" data-notification-delete81="'+esc(rule.id)+'">'+
    '刪除'+
   '</button>'+

  '</div>'
 ).join('');
box.querySelectorAll('[data-notification-edit81]').forEach(button=>{
 button.onclick=()=>notificationRuleDialog81(button.dataset.notificationEdit81);
});
 box.querySelectorAll('[data-notification-toggle81]').forEach(button=>{
  button.onclick=()=>notificationToggle81(button.dataset.notificationToggle81);
 });

 box.querySelectorAll('[data-notification-delete81]').forEach(button=>{
  button.onclick=()=>notificationDelete81(button.dataset.notificationDelete81);
 });
}
async function notificationToggle81(id){
 const rules=Array.isArray(state.notificationRules)
  ?state.notificationRules
  :[];

 const rule=rules.find(x=>x.id===id);
 if(!rule)return toast('找不到這筆通知規則');

 const nextEnabled=!rule.enabled;

 rule.enabled=nextEnabled;
 rule.updatedAt=new Date().toISOString();

 addAudit(
  nextEnabled?'啟用系統通知':'停用系統通知',
  rule.name,
  '管理後台 > 系統通知'
 );

 const saved=await saveCloud(state);
 if(!saved)return;

 renderAdmin();

 toast(
  nextEnabled
   ?'通知規則已啟用'
   :'通知規則已停用'
 );
}
async function notificationDelete81(id){
 const rules=Array.isArray(state.notificationRules)
  ?state.notificationRules
  :[];

 const rule=rules.find(x=>x.id===id);
 if(!rule)return toast('找不到這筆通知規則');

 const ok=await confirmAction(
  '確定刪除「'+rule.name+'」？刪除後不會再發送這項通知。'
 );

 if(!ok)return;

 state.notificationRules=rules.filter(x=>x.id!==id);

 addAudit(
  '刪除系統通知',
  rule.name,
  '管理後台 > 系統通知'
 );

 const saved=await saveCloud(state);
 if(!saved)return;

 renderAdmin();
 toast('通知規則已刪除');
}
async function notificationRuleDialog81(id=''){
     const existing81=(Array.isArray(state.notificationRules)
  ?state.notificationRules
  :[]
 ).find(x=>x.id===id)||null;
     let notificationEmployees81=[];

 try{
  const r=await apiFetch('/api/employees');
  const data=await r.json();

  if(!r.ok)throw Error(data.error||'無法載入員工名單');

  notificationEmployees81=(data.items||[])
   .filter(e=>e.status==='active');

 }catch(e){
  toast(e.message||'無法載入員工名單');
  return;
 }

 const notificationEmployeeChecks81=
  notificationEmployees81.map(e=>
   '<label class="notification-person81">'+
    '<input type="checkbox" name="recipientIds" value="'+esc(String(e.id))+'"> '+
    esc(e.name)+
   '</label>'
  ).join('');
 modal(
  existing81?'編輯系統通知':'新增系統通知',
  '<div class="form-grid">'+

   '<label class="field">通知類型'+
    '<select name="type" id="notification-type81" required>'+
     '<option value="work">每日工作提醒</option>'+
     '<option value="report">工作回報提醒</option>'+
     '<option value="wire">線材補貨逾期提醒</option>'+
     '<option value="plating">電鍍回貨提醒</option>'+
    '</select>'+
   '</label>'+

   '<label class="field">通知名稱'+
    '<input name="name" id="notification-name81" maxlength="60" required>'+
   '</label>'+

   '<label class="field">通知標題'+
    '<input name="title" id="notification-title81" maxlength="80" required>'+
   '</label>'+

   '<label class="field">通知內容'+
    '<textarea name="message" id="notification-message81" maxlength="200" required></textarea>'+
   '</label>'+

   '<label class="field">發送時間'+
    '<input name="time" id="notification-time81" type="time" required>'+
   '</label>'+

   '<label class="field" id="notification-first-wrap81">首次提醒'+
    '<div><input name="firstDays" id="notification-first-days81" type="number" min="1" max="365" value="3"> 天後</div>'+
   '</label>'+

   '<label class="field">重新提醒'+
 '<div>'+
  '<input name="repeatDays" id="notification-repeat81" type="number" min="0" max="365" value="0"> 天'+
 '</div>'+
 '<small class="muted">填 0 代表只提醒一次；例如填 2，就是每 2 天再次提醒。</small>'+
'</label>'+

   '<label class="field">點擊通知後前往'+
    '<select name="target" id="notification-target81">'+
     '<option value="work-record">工作紀錄</option>'+
     '<option value="work-report">工作回報</option>'+
     '<option value="wire-restock">線材補貨名單</option>'+
     '<option value="plating-record">該筆電鍍紀錄</option>'+
    '</select>'+
   '</label>'+


// ← 接收對象整段放這裡
'<fieldset class="field" id="notification-recipient-wrap81">'+
 '<legend>接收對象</legend>'+

 '<label>'+
  '<input type="radio" name="recipientMode" value="auto" id="notification-recipient-auto81" checked> '+
  '<span id="notification-recipient-auto-label81">依事件自動判斷</span>'+
 '</label>'+

 '<label>'+
  '<input type="radio" name="recipientMode" value="selected" id="notification-recipient-selected81"> '+
  '指定人員'+
 '</label>'+

 '<div id="notification-recipient-list81">'+
  notificationEmployeeChecks81+
 '</div>'+
'</fieldset>'+

'<label class="field">'+
 '<span><input type="checkbox" name="enabled" checked> 啟用此通知</span>'+
'</label>'+
 

  '</div>'+

  '<div class="notification-preview81">'+
   '<strong>通知預覽</strong>'+
   '<div id="notification-preview-title81">通知標題</div>'+
   '<div id="notification-preview-message81" class="muted">通知內容會顯示在這裡。</div>'+
  '</div>',

  existing81?'儲存修改':'建立通知',
  aasync fd=>{
 const type=String(fd.get('type')||'');
 const name=String(fd.get('name')||'').trim();
 const title=String(fd.get('title')||'').trim();
 const message=String(fd.get('message')||'').trim();
 const time=String(fd.get('time')||'');
 const firstDays=Number(fd.get('firstDays')||0);
 const repeatDays=Number(fd.get('repeatDays')||0);
 const target=String(fd.get('target')||'');
 const recipientMode=String(fd.get('recipientMode')||'auto');
 const recipientIds=fd.getAll('recipientIds').map(String);
 const enabled=fd.get('enabled')==='on';

 if(!name)throw Error('請填寫通知名稱');
 if(!title)throw Error('請填寫通知標題');
 if(!message)throw Error('請填寫通知內容');
 if(!/^\d{2}:\d{2}$/.test(time))throw Error('請選擇發送時間');

 if(firstDays<0||firstDays>365)
  throw Error('首次提醒天數不正確');

 if(repeatDays<0||repeatDays>365)
  throw Error('重新提醒天數不正確');

 if(recipientMode==='selected'&&!recipientIds.length)
  throw Error('請至少選擇一位接收人員');

 const now=new Date().toISOString();

 const rule={
  id:existing81?.id||crypto.randomUUID(),
  type,
  name,
  title,
  message,
  time,
  firstDays,
  repeatDays,
  target,
  recipientMode,
  recipientIds,
  enabled,
  createdAt:existing81?.createdAt||now,
updatedAt:now
 };

 const oldRules81=Array.isArray(state.notificationRules)
 ?state.notificationRules
 :[];

state.notificationRules=existing81
 ?oldRules81.map(x=>x.id===existing81.id?rule:x)
 :[...oldRules81,rule];

addAudit(
 existing81?'修改系統通知':'新增系統通知',
 name,
 '管理後台 > 系統通知'
);

 const saved=await saveCloud(state);
 if(!saved)return;

 $('#modal').close();
 renderAdmin();
 toast(existing81?'通知規則已修改':'通知規則已建立');
}
 );
  const type81=$('#notification-type81');
 const name81=$('#notification-name81');
 const title81=$('#notification-title81');
 const message81=$('#notification-message81');
 const time81=$('#notification-time81');
 const first81=$('#notification-first-days81');
 const firstWrap81=$('#notification-first-wrap81');
 const repeat81=$('#notification-repeat81');
 const target81=$('#notification-target81');
 const previewTitle81=$('#notification-preview-title81');
 const previewMessage81=$('#notification-preview-message81');
  const recipientAuto81=$('#notification-recipient-auto81');
 const recipientSelected81=$('#notification-recipient-selected81');
 const recipientAutoLabel81=$('#notification-recipient-auto-label81');
 const recipientList81=$('#notification-recipient-list81');

 const presets81={
  work:{
   name:'每日工作提醒',
   title:'今日工作提醒',
   message:'今天有 {數量} 項工作安排，請查看今日排程。',
   time:'08:50',
   firstDays:0,
   repeatDays:0,
   target:'work-record'
  },
  report:{
   name:'工作回報提醒',
   title:'工作回報提醒',
   message:'今天還有工作尚未回報，請記得完成工作紀錄。',
   time:'17:25',
   firstDays:0,
   repeatDays:0,
   target:'work-report'
  },
  wire:{
   name:'線材補貨逾期提醒',
   title:'線材補貨逾期提醒',
   message:'線材補貨區有 {數量} 筆紀錄，尚未處理。',
   time:'09:00',
   firstDays:3,
   repeatDays:2,
   target:'wire-restock'
  },
  plating:{
   name:'電鍍回貨提醒',
   title:'電鍍回貨提醒',
   message:'{案件名稱}{料件名稱}已超過 {逾期天數} 天，尚未登記回貨日期。',
   time:'09:00',
   firstDays:10,
   repeatDays:2,
   target:'plating-record'
  }
 };

 function notificationPreviewText81(text){
  return String(text||'')
   .replaceAll('{數量}','5')
   .replaceAll('{案件名稱}','105')
   .replaceAll('{料件名稱}','環片送鍍')
   .replaceAll('{工作名稱}','FAA案製作')
   .replaceAll('{人員}','王小明')
   .replaceAll('{逾期天數}',String(first81.value||10));
 }

 function notificationPreview81(){
  previewTitle81.textContent=title81.value||'通知標題';
  previewMessage81.textContent=
   notificationPreviewText81(message81.value)||'通知內容會顯示在這裡。';
 }

 function notificationApplyPreset81(){
  const p=presets81[type81.value];

  name81.value=p.name;
  title81.value=p.title;
  message81.value=p.message;
  time81.value=p.time;

  firstWrap81.hidden=!p.firstDays;

  if(p.firstDays){
   first81.value=p.firstDays;
  }

  repeat81.value=String(p.repeatDays);
  target81.value=p.target;
    if(type81.value==='work'){
   recipientAuto81.disabled=false;
   recipientAuto81.checked=true;
   recipientSelected81.checked=false;
   recipientAutoLabel81.textContent='被安排工作的人員';
  }
  else if(type81.value==='report'){
   recipientAuto81.disabled=false;
   recipientAuto81.checked=true;
   recipientSelected81.checked=false;
   recipientAutoLabel81.textContent='尚未完成工作回報的人員';
  }
  else{
   recipientAuto81.disabled=true;
   recipientAuto81.checked=false;
   recipientSelected81.checked=true;
   recipientAutoLabel81.textContent='此通知需指定接收人員';
  }

  recipientList81.hidden=!recipientSelected81.checked;

  notificationPreview81();
 }

 type81.onchange=notificationApplyPreset81;
 title81.oninput=notificationPreview81;
 message81.oninput=notificationPreview81;
 first81.oninput=notificationPreview81;
  $('#modal').querySelectorAll('input[name="recipientMode"]').forEach(input=>{
  input.onchange=()=>{
   recipientList81.hidden=!recipientSelected81.checked;
  };
 });

 if(existing81){
 type81.value=existing81.type;
 notificationApplyPreset81();

 name81.value=existing81.name||'';
 title81.value=existing81.title||'';
 message81.value=existing81.message||'';
 time81.value=existing81.time||'09:00';
 first81.value=Number(existing81.firstDays)||0;
 repeat81.value=Number(existing81.repeatDays)||0;
 target81.value=existing81.target||'';

 const enabled81=$('#modal input[name="enabled"]');
 enabled81.checked=existing81.enabled!==false;

 if(existing81.recipientMode==='selected'){
  recipientSelected81.checked=true;
  recipientAuto81.checked=false;
 }else{
  recipientAuto81.checked=true;
  recipientSelected81.checked=false;
 }

 const selectedIds81=new Set(
  (existing81.recipientIds||[]).map(String)
 );

 recipientList81
  .querySelectorAll('input[name="recipientIds"]')
  .forEach(input=>{
   input.checked=selectedIds81.has(String(input.value));
  });

 recipientList81.hidden=!recipientSelected81.checked;
 notificationPreview81();

}else{
 notificationApplyPreset81();
}
}
async function collectPhotoPages(url){const items=[],seen=new Set();let cursor='';do{const r=await apiFetch(url+(cursor?'&cursor='+encodeURIComponent(cursor):'')),data=await r.json();if(!r.ok)throw Error(data.error||'照片清單讀取失敗');if(!Array.isArray(data.items))throw Error('照片清單格式不正確');items.push(...data.items);if(!data.truncated)break;if(!data.cursor||seen.has(data.cursor))throw Error('照片清單不完整，請重試');cursor=data.cursor;seen.add(cursor);}while(true);return items.sort((a,b)=>String(a.created).localeCompare(String(b.created))||String(a.id).localeCompare(String(b.id)));}
let everyPhotoBusy=false;
async function exportEveryPhoto(button){
 if(!canDo('admin.view')||everyPhotoBusy)return;if(!await authorizeExport())return;
 everyPhotoBusy=true;button.disabled=true;const original=button.textContent,snapshot=structuredClone(state),entries=[],rows=[['管理區','案名','送鍍次數／線捆編號','類別','人員','上傳時間','原始檔名','ZIP位置']];let bytes=0;
 async function append(url,path,item,meta){const r=await apiFetch(url);if(!r.ok)throw Error('照片下載失敗：'+meta[1]);const type=r.headers.get('content-type')||'';if(!type.startsWith('image/'))throw Error('照片格式不正確');const data=new Uint8Array(await r.arrayBuffer());bytes+=data.length;if(bytes>250*1024*1024||entries.length>=60000)throw Error('照片量較大，請改用各管理區的分案匯出');const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg',name=path+'.'+ext;entries.push({name,data,date:item.created});rows.push([...meta,item.actor||'未記錄人員',receiptTime(item.created),item.name||'',name]);button.textContent='正在整理 '+entries.length+' 張照片…';}
 try{
 const warehouse=[...(snapshot.projects||[]).map(p=>({p,deleted:false})),...(snapshot.deletedProjects||[]).map(x=>({p:x.project,deleted:true}))];
 for(const [i,{p,deleted}]of warehouse.entries()){const url='/api/receipts?project='+encodeURIComponent(p.id)+'&export=1',items=await collectPhotoPages(url),folder='庫房管理/'+(deleted?'已刪除案件/':'')+String(i+1).padStart(3,'0')+'_'+safeFileName(p.name);
 for(const [j,item]of items.entries())await append(url+'&id='+encodeURIComponent(item.id),folder+'/收據_'+String(j+1).padStart(3,'0')+'_'+photoStamp(item.created),item,['庫房管理',p.name,'','收據']);}
 for(const [i,p]of (snapshot.platingProjects||[]).entries())for(const s of p.shipments||[]){const url=platingPhotoUrl(p,s)+'&export=1',items=await collectPhotoPages(url),folder='電鍍管理/'+String(i+1).padStart(3,'0')+'_'+safeFileName(p.name)+'/第'+s.number+'次送鍍';for(const [j,item]of items.entries()){const kind=platingPhotoKind(item)==='area'?'表面積':'出貨單';await append(url+'&id='+encodeURIComponent(item.id),folder+'/'+kind+'/'+String(j+1).padStart(3,'0')+'_'+photoStamp(item.created),item,['電鍍管理',p.name,s.number,kind]);}}
 for(const [i,t]of (snapshot.wireTypes||[]).entries())for(const [ri,r]of (snapshot.wireReels||[]).filter(r=>r.wireId===t.id).entries()){for(const [j,item]of r.photos.entries()){const folder='線材管理/'+String(i+1).padStart(3,'0')+'_'+safeFileName(t.name)+'/'+String(ri+1).padStart(3,'0')+'_'+safeFileName(String(ri+1))+'_'+safeFileName(r.color);await append(wirePhotoUrl(r,item.id,true),folder+'/'+String(j+1).padStart(3,'0')+'_'+photoStamp(item.created),item,['線材管理',t.name,String(ri+1),'裁線／線捆照片']);}}
 const logoResponse=await apiFetch('/api/logo?meta=1');if(!logoResponse.ok)throw Error('LOGO 讀取失敗');const logo=await logoResponse.json();if(logo.exists)await append('/api/logo?export=1','網站設定/LOGO',{created:new Date().toISOString(),name:'LOGO'},['網站設定','','','LOGO']);
 if(!entries.length)throw Error('目前沒有可匯出的照片');entries.push({name:'照片總表.csv',data:platingCsv(rows)});entries.push({name:'備份說明.txt',data:new TextEncoder().encode('照片依管理區、案件、送鍍次數與種類分類。照片總表列出原始檔名、上傳人員及時間。庫房包含仍保留照片的已刪除案件。LOGO 日期為匯出時間。此 ZIP 為照片備份，文字資料請另外匯出全部資料。\n匯出時間：'+new Date().toISOString())});downloadBlob(makeZip(entries),'全部照片_'+photoStamp(new Date())+'.zip');toast('全部照片已匯出，共 '+(rows.length-1)+' 張');
 }catch(e){toast(e.message||'匯出失敗，請重試');}finally{everyPhotoBusy=false;button.disabled=false;button.textContent=original;}
}
