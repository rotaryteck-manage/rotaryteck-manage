'use strict';
function scheduleWorkHTML71(e){const color=/^#[0-9a-f]{6}$/i.test(e.color||'')?e.color:'#eaf6ec';return '<span class="work-title71" style="background:'+color+';color:'+scheduleInk56(color)+'">【'+esc(e.title)+'】</span><span class="work-content71">'+(scheduleContents60(e).length?' _ ('+esc(scheduleContents60(e).join('、'))+')':'')+'</span>'}
function schedulePeopleOptions71(entry){const selected=String(entry?.author_id||currentUser.id),people=[...(scheduleData56.people||[])];if(!people.some(p=>String(p.id)===selected))people.push({id:selected,name:entry?.author_name||currentUser.name});return people.map(p=>'<option value="'+esc(p.id)+'" '+(String(p.id)===selected?'selected':'')+'>'+esc(p.name)+'</option>').join('')}

// All image pickers use the same paste, preview, and remove path as choosing a file.
let imageTarget71=null;
const imagePreviews71=new Map();
function imageInputs71(root=document){return [...root.querySelectorAll('input[type=file]')].filter(i=>/image\//.test(i.accept)&&!i.disabled&&i.getClientRects().length)}
function previewImages71(input){
 const old=imagePreviews71.get(input);if(old){old.urls.forEach(URL.revokeObjectURL);old.box.remove()}
 const box=document.createElement('div');box.className='paste-preview71';const urls=[];
 [...input.files].forEach((file,index)=>{const tile=document.createElement('div'),img=document.createElement('img'),remove=document.createElement('button'),url=URL.createObjectURL(file);urls.push(url);img.src=url;img.alt=file.name;remove.type='button';remove.textContent='移除';remove.onclick=()=>{const data=new DataTransfer();[...input.files].filter((_,i)=>i!==index).forEach(f=>data.items.add(f));input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}))};tile.append(img,remove);box.append(tile)});
 input.after(box);imagePreviews71.set(input,{box,urls});
}
function enhanceImageInputs71(){
 for(const [input,value] of imagePreviews71)if(!input.isConnected){value.urls.forEach(URL.revokeObjectURL);imagePreviews71.delete(input)}
 for(const input of document.querySelectorAll('input[type=file]'))if(
 /image\//.test(input.accept)&&
 !input.dataset.paste71&&
 input.name!=='photo-report80'&&
input.name!=='material-photo80'
){input.dataset.paste71='1';const hint=document.createElement('button');hint.type='button';hint.className='paste-target71';hint.textContent='點此後按 Ctrl＋V 貼上照片';hint.onclick=()=>{imageTarget71=input;document.querySelectorAll('.paste-target71').forEach(b=>b.classList.remove('selected'));hint.classList.add('selected');hint.focus()};input.after(hint);input.addEventListener('focus',()=>imageTarget71=input);input.addEventListener('click',()=>imageTarget71=input);input.addEventListener('change',()=>previewImages71(input))}
}
document.addEventListener('paste',event=>{
 const files=[...(event.clipboardData?.items||[])].filter(i=>i.kind==='file'&&i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);if(!files.length)return;
 const dialog=[...document.querySelectorAll('dialog[open]')].at(-1),inputs=imageInputs71(dialog||document);if(!inputs.length)return;
 let target=inputs.includes(imageTarget71)?imageTarget71:inputs.length===1?inputs[0]:null;
 event.preventDefault();event.stopImmediatePropagation();if(!target){toast('請先點選要貼上的照片欄位，再按 Ctrl＋V');return}
 const allowed=files.filter(f=>['image/png','image/jpeg','image/webp'].includes(f.type));if(!allowed.length){toast('請貼上 JPG、PNG 或 WebP 照片');return}
 const data=new DataTransfer();if(target.multiple)[...target.files].forEach(f=>data.items.add(f));(target.multiple?allowed:allowed.slice(0,1)).forEach((f,i)=>data.items.add(new File([f],f.name||'貼上照片-'+i+'.png',{type:f.type})));target.files=data.files;target.dispatchEvent(new Event('change',{bubbles:true}));
},true);

let scheduleBusy71=false;
function busyDialog71(message){const d=document.createElement('dialog');d.className='busy71';d.innerHTML='<p role="status">'+esc(message)+'</p>';d.addEventListener('cancel',e=>e.preventDefault());document.body.append(d);d.showModal();return()=>{d.close();d.remove()}}
scheduleCopy56=async function(){if(scheduleBusy71)return;scheduleBusy71=true;const close=busyDialog71('正在複製上週排程，請稍候…');try{const r=await scheduleSend56({kind:'copy_week',weekStart:scheduleWeek56(scheduleAnchor56)});close();toast(r.already?'已經完成複製':'複製完成');scheduleRender56()}catch(e){close();toast(e.message)}finally{scheduleBusy71=false}};
async function resetWeek71(){if(scheduleBusy71)return;const week=scheduleWeek56(scheduleAnchor56);if(!await confirmAction('確定清空 '+week+' 至 '+scheduleShift56(week,6)+' 的每週排程與備註？工作回報與其他週的安排會保留。'))return;scheduleBusy71=true;const close=busyDialog71('正在重置本週排程…');try{await scheduleSend56({kind:'reset_week',weekStart:week});close();toast('本週排程已重置，可以重新複製上週');scheduleRender56()}catch(e){close();toast(e.message)}finally{scheduleBusy71=false}}
const scheduleRenderBefore71=scheduleRender56;
scheduleRender56=function(){scheduleRenderBefore71();const tabs=document.querySelector('.schedule-tabs');if(!tabs)return;const b=document.createElement('button');b.type='button';b.textContent='文字記錄';b.onclick=()=>scheduleTextRecords71();if(canDo('schedule.text.daily')||canDo('schedule.text.weekly'))tabs.append(b);if(scheduleTab56==='weekly'&&canDo('schedule.reset')){const reset=document.createElement('button');reset.type='button';reset.textContent='重置本週排程';reset.onclick=resetWeek71;document.querySelector('.schedule-action-controls').append(reset)}};
async function scheduleTextRecords71(kind=scheduleTab56){
 if(!canDo('schedule.text.daily')&&!canDo('schedule.text.weekly'))return;
 modal('文字記錄','<div class="form-grid"><label class="field">紀錄類型<select id="text-kind71"><option value="daily">每日文字記錄</option><option value="weekly">每週文字記錄</option></select></label>'+field('開始日期','from',scheduleMonth56(scheduleAnchor56),'type="date" id="text-from71"')+field('結束日期','to',scheduleShift56(scheduleMonth56(scheduleAnchor56),31),'type="date" id="text-to71"')+'</div><p class="muted">刪除只移除文字紀錄，不會撤銷排程、工作回報或庫存變更。</p><div id="text-list71" aria-live="polite"></div>',null);
 $('#text-kind71').querySelectorAll('option').forEach(o=>{if(!canDo('schedule.text.'+o.value))o.remove()});$('#text-kind71').value=canDo('schedule.text.'+kind)?kind:$('#text-kind71').options[0]?.value;let token=0;
 const load=async()=>{const t=++token,box=$('#text-list71');box.textContent='正在讀取紀錄…';try{const query=new URLSearchParams({view:'text',kind:$('#text-kind71').value,from:$('#text-from71').value,to:$('#text-to71').value}),r=await apiFetch('/api/schedule?'+query),d=await r.json();if(!r.ok)throw Error(d.error);if(t!==token||!box.isConnected)return;box.innerHTML=d.items.map(e=>'<div class="text-history-row"><span class="text-history-content">'+esc(receiptTime(e.created_at)+'｜'+e.actor+'｜'+e.body)+'</span><button type="button" data-delete-text71="'+esc(e.id)+'">刪除</button></div>').join('')||'<p class="muted">此範圍沒有文字記錄</p>';box.querySelectorAll('[data-delete-text71]').forEach(b=>b.onclick=async()=>{if(!await confirmAction('確定刪除此筆文字紀錄？不會刪除排程或撤銷實際資料。'))return;b.disabled=true;try{await scheduleSend56({kind:'text_delete',id:b.dataset.deleteText71},'DELETE');await load()}catch(e){toast(e.message);b.disabled=false}})}catch(e){if(t===token)box.textContent=e.message}};
 ['#text-kind71','#text-from71','#text-to71'].forEach(s=>$(s).onchange=load);await load();
}
function workSelects71(){
 let list=document.querySelector('#schedule-items85');
 if(!list&&document.querySelector('#modal .schedule-task60')){list=document.createElement('datalist');list.id='schedule-items85';list.innerHTML=(scheduleData56.options?.items||[]).map(x=>'<option value="'+esc(x)+'"></option>').join('');document.querySelector('#modal .modal-body').append(list);}
 document.querySelectorAll('#modal .schedule-task60 input[name^="item-"]').forEach(input=>input.setAttribute('list','schedule-items85'));
}

function accountButton71(){const badge=$('#current-role');if(!badge||badge.dataset.switch71)return;badge.dataset.switch71='1';badge.tabIndex=0;badge.setAttribute('role','button');badge.setAttribute('aria-label','切換帳號');badge.title='點擊切換帳號';badge.onclick=()=>switchAccount71().catch(e=>toast(e.message));badge.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();badge.click()}}}
window.addEventListener('storage',e=>{if(e.key===AUTH_STORAGE&&e.oldValue!==e.newValue){clearPhotoCache();document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('#app').textContent='帳號已切換，正在重新載入…';location.reload()}});

function scheduleLegacyControls71(e){let html='';if(canDo('warehouse.historyEdit'))html+='<button type="button" data-legacy71="'+esc(JSON.stringify([e.projectId,e.logId,e.bucket,e.index]))+'">編輯</button>';if(e.photo?.id&&e.photo?.projectId){const url='/api/receipts?project='+encodeURIComponent(e.photo.projectId)+'&id='+encodeURIComponent(e.photo.id);html+='<img class="legacy-photo71" data-photo-src="'+esc(url)+'" data-zoom-url="'+esc(url)+'" alt="料件照片">'}return html}
// Apply both inventory legs before checking balances, so unchanged depleted receipts remain editable.
function legacyParts71(p){return [...(p.parts||[]),...(p.archivedParts||[]).map(x=>x.part)]}
function legacyLog71(p,id){return String(id).startsWith('legacy:')?p?.materialLogs?.[Number(String(id).slice(7))]:p?.materialLogs?.find(l=>l.id===id)}
function reviseLegacy71(source,ref,value){
 const next=structuredClone(source),[projectId,logId,bucket,index]=ref,p=next.projects.find(p=>p.id===projectId),log=legacyLog71(p,logId),item=log?.[bucket]?.[index];if(!item)throw Error('紀錄已變更，請重新開啟');
 const oldPart=legacyParts71(p).find(x=>x.id===value.oldPartId),target=next.projects.find(x=>x.id===value.projectId),part=target&&legacyParts71(target).find(x=>x.id===value.partId);
 if(!oldPart||!part)throw Error('請選擇對應的庫存料件');if(!Number.isSafeInteger(value.quantity)||value.quantity<1)throw Error('數量需為正整數');
 const adjust=(project,part,qty,receive)=>{project.inventory??={};project.inventory[part.id]=Number(project.inventory[part.id]||0)+(receive?qty:-qty);if(receive)part.received+=qty};
 adjust(p,oldPart,-item.qty,bucket==='received');adjust(target,part,value.quantity,value.category==='收料');
 for(const [project,checkedPart] of [[p,oldPart],[target,part]])if(!Number.isSafeInteger(project.inventory[checkedPart.id])||project.inventory[checkedPart.id]<0||!Number.isSafeInteger(checkedPart.received)||checkedPart.received<0)throw Error('修改後庫存或累計收料會小於零或超出範圍，請先核對已領出的數量');
 const saved={...item,name:value.title,partId:part.id,qty:value.quantity,category:value.category};if(value.removePhoto)delete saved.photo;if(value.photo)saved.photo=value.photo;
 log[bucket].splice(index,1);if(!log.received.length&&!log.issued.length)p.materialLogs=p.materialLogs.filter(x=>x!==log);
 const received=value.category==='收料';target.materialLogs??=[];target.materialLogs.unshift({id:crypto.randomUUID(),time:value.day+'T00:00:00.000Z',actor:value.actor,received:received?[saved]:[],issued:received?[]:[saved],updatedAt:new Date().toISOString(),updatedBy:currentUser.name});
 return next;
}
function legacyDialog71(ref){
 if(!canDo('warehouse.historyEdit'))return;const [pid,lid,bucket,index]=ref,p=state.projects.find(p=>p.id===pid),log=legacyLog71(p,lid),item=log?.[bucket]?.[index];if(!item){toast('找不到紀錄');return}
 const matches=legacyParts71(p).filter(x=>item.partId?x.id===item.partId:x.name===item.name),oldPartId=matches.length===1?matches[0].id:'',parts=project=>'<option value="">請選擇對應料件</option>'+legacyParts71(project).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name+' '+(x.spec||''))+'</option>').join(''),category=bucket==='received'?'收料':item.category||'領料',original=JSON.stringify(log);
 modal('編輯既有料件紀錄','<p class="muted">修改會同步校正對應料件的庫存；日期、登記人只套用本筆。</p><div class="form-grid">'+field('日期','day',taipeiDate(log.time),'type="date" required')+'<label class="field">類型<select name="category">'+['收料','領料','出貨','送貨'].map(v=>'<option '+(v===category?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label class="field">原紀錄對應庫存料件<select name="oldPartId" required>'+parts(p)+'</select></label><label class="field">案件<select name="projectId" required>'+state.projects.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')+'</select></label><label class="field">修改後對應庫存料件<select name="partId" required>'+parts(p)+'</select></label>'+field('料件名稱','title',item.name,'required maxlength="160"')+field('數量','quantity',item.qty,'type="number" min="1" step="1" required')+field('登記人','actor',log.actor,'required maxlength="80"')+'<label class="field">照片（選填，選新照片替換本筆照片）<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label></div>','儲存料件',async fd=>{
  if(JSON.stringify(legacyLog71(state.projects.find(x=>x.id===pid),lid))!==original)throw Error('紀錄已變更，請重新開啟');
  const value=Object.fromEntries(['day','category','oldPartId','projectId','partId','title','actor'].map(k=>[k,String(fd.get(k)||'').trim()]));value.quantity=Number(fd.get('quantity'));let next=reviseLegacy71(state,ref,value);
  const photo=fd.get('photo');if(photo?.size){const result=await uploadImage(photo,'/api/receipts?project='+encodeURIComponent(value.projectId),10);value.photo={id:result.id,projectId:value.projectId};next=reviseLegacy71(state,ref,value)}
  await commit44(next,'修改既有料件紀錄','修改前：'+JSON.stringify({day:log.time,category,project:p.name,item,actor:log.actor})+'｜修改後：'+JSON.stringify(value),'工作排程 > 每日料件',value.projectId);$('#modal').close();scheduleRender56();
 });const form=$('#dialog-form');form.elements.oldPartId.value=oldPartId;form.elements.partId.value=oldPartId;form.elements.projectId.value=pid;form.elements.projectId.onchange=()=>{form.elements.partId.innerHTML=parts(state.projects.find(x=>x.id===form.elements.projectId.value))};form.elements.partId.onchange=()=>{const project=state.projects.find(x=>x.id===form.elements.projectId.value),part=legacyParts71(project).find(x=>x.id===form.elements.partId.value);if(part)form.elements.title.value=part.name};
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-legacy71]');if(b)legacyDialog71(JSON.parse(b.dataset.legacy71))});
let enhancementQueued71=false;
new MutationObserver(()=>{if(enhancementQueued71)return;enhancementQueued71=true;queueMicrotask(()=>{enhancementQueued71=false;enhanceImageInputs71();workSelects71();accountButton71()})}).observe(document.body,{childList:true,subtree:true});
enhanceImageInputs71();accountButton71();
