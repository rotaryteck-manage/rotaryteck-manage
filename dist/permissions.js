'use strict';
function canDo(key){if(Array.isArray(currentUser.permissions))return currentUser.permissions.includes(key);if(currentUser.role==='supervisor')return true;const base=['cases.view','warehouse.view','plating.view','wire.view','wire.cut','wire.editOwn','wire.photos'];return base.includes(key)||(currentUser.role==='warehouse'&&['wire.deleteProject','plating.deleteProject','warehouse.stock','warehouse.photos','plating.manage','plating.photos','wire.create','wire.edit','wire.delete'].includes(key));}
let permissionProfiles=[],permissionCapabilities={};
async function loadPermissionProfiles(){const r=await apiFetch('/api/permissions'),d=await r.json();if(!r.ok)throw Error(d.error);permissionProfiles=d.items;permissionCapabilities=d.capabilities;for(const p of permissionProfiles.filter(p=>p.builtin))roleNames[p.id]=p.name;}
function permissionDialog(profile){
 modal(profile?'修改權限':'新增自訂權限',field('權限名稱','profileName',profile?.name||'','required maxlength="80"')+'<p class="muted">可裁線的員工能標記需補貨；主管與倉管能改回足量；匯出及管理後台固定只有主管能操作。專案刪除另行勾選：電鍍、線材限倉管與主管，案件、庫房限主管；一般員工即使勾選也不能刪除專案。</p><div class="permission-options">'+Object.entries(permissionCapabilities).filter(([key])=>key!=='wire.photos').map(([key,label])=>'<label><input type="checkbox" name="capability" value="'+esc(key)+'" '+(profile?.permissions.includes(key)?'checked':'')+'> '+esc(label)+'</label>').join('')+'</div>','儲存權限',async fd=>{await permissionRequest({id:profile?.id,name:String(fd.get('profileName')).trim(),permissions:fd.getAll('capability')});$('#modal').close();renderAdmin();});
 const inputs=[...document.querySelectorAll('#modal [name="capability"]')];inputs.forEach(input=>input.onchange=()=>{const group=input.value.split('.')[0];if(input.checked&&!input.value.endsWith('.view'))inputs.find(x=>x.value===group+'.view').checked=true;if(!input.checked&&input.value.endsWith('.view'))inputs.filter(x=>x.value.startsWith(group+'.')).forEach(x=>x.checked=false);});
}
async function permissionRequest(data,method='POST'){const r=await apiFetch('/api/permissions',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),d=await r.json();if(!r.ok)throw Error(d.error);await loadPermissionProfiles();addAudit('更新員工權限設定',data.name||'員工排序／移除權限','管理後台 > 員工權限');await saveCloud(state);if(failedCandidate)throw Error('設定已更新，但操作紀錄儲存失敗，請處理上方提示');}
const employeeLoadBeforePermissions=loadEmployees;
loadEmployees=async function(){try{await loadPermissionProfiles();}catch(e){const box=$('#employee-list');if(box)box.textContent=e.message;return;}await employeeLoadBeforePermissions();const box=$('#employee-list');if(!box)return;
 box.querySelectorAll('.employee-row').forEach((row,i)=>{const e=employeesCache[i];const profile=permissionProfiles.find(p=>p.id===e.profileId);if(profile)row.querySelector('small').textContent=e.email+' · '+profile.name+' · '+(e.status==='active'?'啟用':'停用');});
 $('#employee-sort')?.remove();const sort=document.createElement('button');sort.id='employee-sort';sort.type='button';sort.textContent='調整排序';sort.onclick=()=>numberedOrderDialog('員工排序',employeesCache.map(e=>({id:e.id,label:e.name})),async ids=>{await permissionRequest({order:ids});await loadEmployees();});$('#new-employee').after(sort);

 renderPermissionButtons(box);

};
const employeeDialogBeforePermissions=employeeDialog;
employeeDialog=function(id){employeeDialogBeforePermissions(id);const e=employeesCache.find(x=>x.id===id),label=document.createElement('label');label.className='field';label.innerHTML='自訂權限<select name="profileId"><option value="">預設一般員工</option>'+permissionProfiles.filter(p=>!p.builtin).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===e?.profileId?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select>';$('#modal select[name="role"]').closest('.form-grid').after(label);const role=$('#modal select[name="role"]');const update=()=>{label.hidden=role.value!=='viewer';label.querySelector('select').disabled=role.value!=='viewer';};role.addEventListener('change',update);update();};
const pagesBeforePermissions=managementPages;
managementPages=function(){return pagesBeforePermissions().filter(p=>!['cases','warehouse','plating','wire'].includes(p.id)||canDo(p.id+'.view'));};

function numberedOrderDialog(title,items,onSave,onBack){
 let ordered=items.map(x=>({...x}));
 modal(esc(title),'<p class="muted">輸入要排第幾位，其餘項目會自動順移。儲存後生效。</p><div id="numbered-order-list"></div>','儲存排序',async()=>{if(ordered.some((x,i)=>x.id!==items[i].id))await onSave(ordered.map(x=>x.id));$('#modal').close();if(onBack)onBack();});
 function draw(){const box=$('#numbered-order-list');box.innerHTML=ordered.map((item,i)=>'<label class="numbered-order-row"><input type="number" min="1" max="'+ordered.length+'" step="1" value="'+(i+1)+'" data-order-id="'+esc(item.id)+'" aria-label="'+esc(item.label)+' 排序"><span>'+esc(item.label)+'</span></label>').join('');box.querySelectorAll('input').forEach(input=>input.onchange=()=>{const from=ordered.findIndex(x=>String(x.id)===input.dataset.orderId),to=Number(input.value)-1;if(!Number.isInteger(to)||to<0||to>=ordered.length){input.value=from+1;return;}ordered.splice(to,0,ordered.splice(from,1)[0]);draw();});}draw();
}

function renderPermissionButtons(box){
 $('#permission-settings')?.remove();const panel=document.createElement('div');panel.id='permission-settings';panel.innerHTML='<h3>權限設定</h3><p class="muted">點選各權限設定可操作的內容。管理後台與匯出固定主管限定；員工可標記需補貨；訂購、入庫與撤銷限主管及倉管。</p><div class="wire-tools"><button type="button" id="new-permission">＋ 新增權限</button><button type="button" id="sort-permissions">調整按鈕位置</button></div><div class="permission-tabs"></div>';box.after(panel);
 const grid=panel.querySelector('.permission-tabs');permissionProfiles.forEach((p,i)=>{const tile=document.createElement('div');tile.className='permission-tile';tile.innerHTML='<button type="button" data-profile-edit="'+esc(p.id)+'">'+esc(p.name)+'</button><div class="permission-order" hidden><button type="button" data-step="-1" '+(!i?'disabled':'')+'>←</button><button type="button" data-step="1" '+(i===permissionProfiles.length-1?'disabled':'')+'>→</button></div>';grid.append(tile);tile.querySelector('[data-profile-edit]').onclick=()=>{permissionDialog(p);if(!p.builtin){const del=document.createElement('button');del.type='button';del.className='danger-button';del.textContent='刪除此權限';del.onclick=async()=>{if(!await confirmAction('確定刪除此權限？'))return;try{await permissionRequest({id:p.id},'DELETE');$('#modal').close();await loadEmployees();}catch(e){$('#form-error').textContent=e.message;}};$('#form-error').before(del);}};tile.querySelectorAll('[data-step]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const ids=permissionProfiles.map(x=>x.id),j=i+Number(b.dataset.step);[ids[i],ids[j]]=[ids[j],ids[i]];await permissionRequest({profileOrder:ids});await loadEmployees();document.querySelectorAll('.permission-order').forEach(el=>el.hidden=false);}catch(e){toast(e.message);b.disabled=false;}});});
 $('#new-permission').onclick=()=>permissionDialog();$('#sort-permissions').onclick=()=>{const hidden=grid.querySelector('.permission-order')?.hidden;grid.querySelectorAll('.permission-order').forEach(el=>el.hidden=!hidden);};
}

function canDeleteProjectUI(kind){return (['wire','plating'].includes(kind)?['warehouse','supervisor'].includes(currentUser.role):currentUser.role==='supervisor')&&canDo(kind+'.deleteProject');}
async function archiveProject51(kind,id){
 if(!canDeleteProjectUI(kind)||cloudBusy||failedCandidate)return;
 const key=kind==='wire'?'wireTypes':'platingProjects',p=state[key]?.find(x=>x.id===id&&!x.archived);if(!p)return;
 if(!await confirmAction('確定刪除專案「'+p.name+'」及所屬紀錄？刪除後保留 7 天，可由主管在後台還原；到期永久清除。'))return;
 try{const next=structuredClone(state),n=next[key].find(x=>x.id===id);n.archived=true;n.deletedAt=new Date().toISOString();n.purgeAfter=new Date(Date.now()+7*86400000).toISOString();await commit44(next,'刪除專案',p.name,kind==='wire'?'線材管理':'電鍍管理',kind+':'+id);$('#modal')?.close();if(location.hash==='#admin')renderAdmin();else render();}catch(e){toast(e.message);}
}
function projectMore51(kind,id,host){if(!host||!canDeleteProjectUI(kind))return;const more=document.createElement('details');more.className='warehouse-more';more.innerHTML='<summary>更多操作</summary><button type="button" class="danger-button">刪除專案</button>';more.querySelector('button').onclick=()=>archiveProject51(kind,id);host.append(more);}
