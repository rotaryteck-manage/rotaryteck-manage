'use strict';
function permissionUI75(){
 const hide=(selector,allowed)=>{if(!allowed)document.querySelectorAll(selector).forEach(e=>e.hidden=true)};
 hide('[data-leave-edit72]',canDo('schedule.leave.edit'));hide('[data-leave-delete72]',canDo('schedule.leave.delete'));
 hide('[data-delete-text71]',canDo('schedule.text.delete'));
 hide('.schedule-bar-edit',scheduleAction75('weekly','edit'));hide('.schedule-bar-delete70',scheduleAction75('weekly','delete'));
 hide('[data-edit-daily-day]',scheduleAction75('daily','edit'));hide('[data-edit-material]',scheduleAction75('material','edit'));
 hide('#schedule-group-add65',scheduleAction75('weekly','create'));hide('#schedule-add-task60',scheduleAction75(scheduleTab56,'create'));
 document.querySelectorAll('.schedule-task60').forEach(el=>{if(el.dataset.existingId)hide('[data-existing-id="'+CSS.escape(el.dataset.existingId)+'"] .schedule-remove-task60',scheduleAction75(scheduleTab56,'delete'))});
 hide('[data-purge-project]',canDo('warehouse.purge'));hide('[data-restore-project]',canDo('warehouse.restore'));
 hide('#delete-project',canDo('warehouse.deleteProject'));hide('#restore-part',canDo('warehouse.manage'));
 for(const [prefix,cap]of [['q:','warehouse.receive'],['out:','warehouse.issue']])document.querySelectorAll('#receipt-form input[name^="'+prefix+'"]').forEach(e=>{if(!canDo(cap))e.readOnly=true;});
 hide('#export-all,#export-warehouse-admin,#export-project-photos,#export-all-photos-main,#export-every-photo',canDo('admin.export'));
 hide('#import-data',canDo('admin.import'));hide('#audit-clear-category',canDo('admin.auditDelete'));
 document.querySelectorAll('[data-schedule-delete-report]').forEach(b=>{
  const r=scheduleData56.reports?.find(r=>r.id===b.dataset.scheduleDeleteReport);if(!r)return;
  b.hidden=!canReport75(r,'delete');
 });
 document.querySelectorAll('[data-edit-material]').forEach(edit=>{
  if(!scheduleAction75('material','delete')||edit.parentElement.querySelector('[data-material-delete75]'))return;
  const b=document.createElement('button');b.type='button';b.dataset.materialDelete75=edit.dataset.editMaterial;b.textContent='刪除';
  b.onclick=async()=>{const e=scheduleData56.entries.find(x=>x.id===b.dataset.materialDelete75);if(!e||!await confirmAction('確定刪除這筆料件紀錄與照片？'))return;try{await scheduleSend56({kind:'material',id:e.id,revision:e.revision},'DELETE');$('#modal').close();scheduleRender56()}catch(err){toast(err.message)}};
  edit.after(b);
 });
 document.querySelectorAll('.schedule-message67').forEach(el=>{
  if(el.querySelector('[data-edit-report75]'))return;
  const id=el.dataset.reportId75||el.querySelector('[data-schedule-photo]')?.dataset.schedulePhoto||el.querySelector('[data-schedule-delete-report]')?.dataset.scheduleDeleteReport;
  const r=scheduleData56.reports?.find(r=>r.id===id);if(!r||!canReport75(r,'edit'))return;
  const b=document.createElement('button');b.type='button';b.dataset.editReport75=id;b.textContent='編輯回報';
  b.onclick=()=>modal('編輯工作回報','<label class="field">回報內容<textarea name="body" required maxlength="3000">'+esc(r.body)+'</textarea></label>','儲存',async fd=>{await scheduleSend56({kind:'report',id:r.id,body:String(fd.get('body')),previousBody:r.body});$('#modal').close();scheduleRender56()});
  el.querySelector('.schedule-bubble67').append(b);
 });
}
let scheduled75=false;
new MutationObserver(()=>{if(scheduled75)return;scheduled75=true;queueMicrotask(()=>{scheduled75=false;permissionUI75()})}).observe(document.body,{childList:true,subtree:true});
const renderAdminBefore75=renderAdmin;
renderAdmin=function(){
 if(!canAdmin75()){toast('沒有進入管理後台的權限');return;}
 if(canDo('admin.settings')){renderAdminBefore75();permissionUI75();return;}
 $('#app').innerHTML='<header class="header"><div class="brand">管理後台</div><a href="#warehouse">返回庫房</a></header><main><h1>管理後台</h1><p>只顯示已授權的功能。</p><div id="delegated-admin75" class="admin-actions"></div></main>';
 const host=$('#delegated-admin75'),add=(cap,label,fn)=>{if(!canDo(cap))return;const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;host.append(b)};
 add('warehouse.options','庫房櫃／層選單',warehouseOptionsDialog73);
 add('schedule.options','工作項目選單',workOptions71);
 add('schedule.palette','設定共用常用色',async()=>{try{const r=await apiFetch('/api/schedule?view=palette'),d=await r.json();if(!r.ok)throw Error(d.error);palette73=d;const input=document.createElement('input'),host=document.createElement('div');input.value=d.colors[0];paletteEditor73(0,input,host)}catch(e){toast(e.message)}});
 add('plating.options','電鍍廠商選單',managePlatingVendors);
 add('admin.import','匯入舊資料',importData);
 add('admin.export','匯出全部資料',async()=>{try{const r=await apiFetch('/api/backup-state'),d=await r.json();if(!r.ok)throw Error(d.error);downloadJSON(d.state,'完整備份.json')}catch(e){toast(e.message)}});
 for(const [kind,label]of [['warehouse','庫房'],['plating','電鍍'],['wire','線材']])add(kind+'.restore','復原'+label+'專案',()=>kind==='warehouse'?deletedProjectsDialog():openBulk(kind,undefined,true));
 enhanceEmployeesAdmin();makeAdminCardsCollapsible();applyRoleUI();cloudBar();
};

const employeeDialogBefore75=employeeDialog;
employeeDialog=function(id){employeeDialogBefore75(id);if(currentUser.role==='supervisor'&&canDo('admin.permissions'))return;const role=$('#modal [name=role]');role?.querySelector('[value=supervisor]')?.remove();};
