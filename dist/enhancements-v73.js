'use strict';
// Absolute correction values are independent; ordinary receipts/issues keep their original workflow.
function quantityCorrection73(p,i,fd){
 const oldPrepared=preparedQuantity(p,i),oldStock=inStock(p,i.id),parse=(field,old)=>fd.has?.(field)?integer(fd.get(field),0,Number.MAX_SAFE_INTEGER):old;
 const prepared=parse('prepared73:'+i.id,oldPrepared),stock=parse('stock73:'+i.id,oldStock),changedPrepared=prepared!==oldPrepared,changed=changedPrepared||stock!==oldStock;
 if(changedPrepared&&!canDo('warehouse.preparedAdjust')||stock!==oldStock&&!canDo('warehouse.stockAdjust'))throw Error('沒有修正此數量的權限');
 if(changed&&(Number(fd.get('q:'+i.id))||Number(fd.get('out:'+i.id))))throw Error(i.name+'：請先儲存數量修正，再登記此料件的收料或領料');
 const plain={...i};delete plain.preparedAdjustment73;const adjustment=prepared-preparedQuantity(p,plain);if(!Number.isSafeInteger(adjustment))throw Error('本次已備數量超出安全範圍');
 return{oldPrepared,oldStock,prepared,stock,adjustment,changedPrepared,changed};
}
const partChangedBefore73=partChanged;
partChanged=function(i,fd){const p=state.projects.find(p=>p.parts.includes(i))||project();return partChangedBefore73(i,fd)||!!p&&['prepared73','stock73'].some((k,n)=>fd.get(k+':'+i.id)!=null&&Number(fd.get(k+':'+i.id))!==(n?inStock(p,i.id):preparedQuantity(p,i)))};
const warehouseToolsBefore73=warehouseTools44;
warehouseTools44=function(){
 warehouseToolsBefore73();$('#receipt-correction')?.remove();const heading=$('#receipt-form th:nth-child(4)');if(heading)heading.textContent='本次已備';const p=project(),form=$('#receipt-form');if(!p||!form||!canDo('warehouse.preparedAdjust')&&!canDo('warehouse.stockAdjust'))return;
 for(const row of form.querySelectorAll('tr[data-item]')){const i=p.parts.find(x=>x.id===row.dataset.item);if(!i)continue;
  for(const [index,key,label,value]of [[3,'prepared73','本次已備',preparedQuantity(p,i)],[6,'stock73','現有庫存',inStock(p,i.id)]]){if(!canDo(key==='prepared73'?'warehouse.preparedAdjust':'warehouse.stockAdjust'))continue;const cell=row.cells[index];cell.innerHTML='<input type="number" min="0" step="1" max="9007199254740991" name="'+key+':'+esc(i.id)+'" class="part-edit-value qty quantity-edit73" aria-label="'+esc(i.name+' '+label)+'" value="'+esc(drafts[p.id]?.[key+':'+i.id]??value)+'" required><span class="part-read-value">'+esc(value)+'</span>';}
 }
 const hint=document.createElement('p');hint.className='quantity-hint73';hint.textContent='編輯時可直接修正本次已備與現有庫存；兩欄各自修改。同一料件請勿同時修正數量與登記收領料。';form.querySelector('.warehouse-list-tools')?.after(hint);
};
const scheduleDrawBefore73=scheduleDraw56;
scheduleDraw56=function(){scheduleDrawBefore73();
 if(scheduleTab56==='daily'){const b=$('[data-leave-new72]'),report=$('[data-schedule-report]'),bar=$('.schedule-action-controls');if(b&&report)report.before(b);$('.leave-toolbar72')?.remove();bar?.classList.add('daily-actions73');}
 document.querySelectorAll('.schedule-plan-group64').forEach(bar=>{if(bar.querySelector('.schedule-bar-actions73'))return;const buttons=[...bar.querySelectorAll('.schedule-bar-edit,.schedule-bar-delete70')];if(!buttons.length)return;const actions=document.createElement('div');actions.className='schedule-bar-actions73';actions.append(...buttons);bar.append(actions)});if(scheduleTab56==='weekly')scheduleLayout63($('#schedule-content56'));
};
let scheduleWasActive73=false;
const scheduleRenderBefore73=scheduleRender56;
scheduleRender56=function(){const active=location.hash==='#schedule';if(active&&!scheduleWasActive73){scheduleTab56='daily';scheduleAnchor56=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'})}scheduleWasActive73=active;scheduleRenderBefore73();const bar=$('.schedule-action-controls'),old=[...(bar?.querySelectorAll('[data-dedupe73]')||[])];let b=old.shift();old.forEach(x=>x.remove());if(scheduleTab56==='weekly'&&canDo('schedule.dedupe')&&bar){if(!b){b=document.createElement('button');b.type='button';b.textContent='整理重複排程';b.dataset.dedupe73='';bar.append(b)}b.hidden=false;b.onclick=dedupeWeek73}else if(b)b.hidden=true};
async function dedupeWeek73(){
 if(scheduleBusy71)return;const week=scheduleWeek56(scheduleAnchor56);scheduleBusy71=true;const close=busyDialog71('正在檢查本週重複排程…');
 try{const r=await apiFetch('/api/schedule?view=dedupe&weekStart='+week),data=await r.json();if(!r.ok)throw Error(data.error);close();
  if(!data.items.length){toast('本週沒有可整理的重複排程');return}
  modal('整理重複排程','<p>'+week+' 至 '+scheduleShift56(week,6)+'：預計移除 '+data.removedRows+' 筆重複工作，共 '+data.assignments+' 個重複人員指派。</p><p>保留各人的一份安排與所有工作回報；跨出本週的工作不列入這次整理。</p><div class="dedupe-preview73">'+data.items.map(e=>'<p>'+esc(e.action+'｜'+e.people.join('、')+'｜'+e.day+' 至 '+e.endDay+'｜'+e.title)+'</p>').join('')+'</div>','確認整理',async()=>{await scheduleSend56({kind:'dedupe_week',weekStart:week,token:data.token});$('#modal').close();scheduleRender56();toast('重複排程已整理')});
 }catch(e){close();toast(e.message)}finally{scheduleBusy71=false}
}
let palette73=null,paletteRequest73=null;
async function loadPalette73(){if(!paletteRequest73)paletteRequest73=(async()=>{const r=await apiFetch('/api/schedule?view=palette'),v=await r.json();if(!r.ok)throw Error(v.error);palette73=v;return v})().finally(()=>paletteRequest73=null);return paletteRequest73;}
function paletteEditor73(index,input,host){
 const d=document.createElement('dialog');d.className='palette-dialog73';d.innerHTML='<form><h3>設定全公司常用色</h3><label>第 <select name="slot">'+Array.from({length:10},(_,i)=>'<option value="'+i+'" '+(i===index?'selected':'')+'>'+(i+1)+'</option>').join('')+' 格<input type="color" name="color" value="'+palette73.colors[index]+'"></label><p role="alert"></p><div><button type="button" data-close>取消</button><button type="submit">確定</button></div></form>';document.body.append(d);d.showModal();const version=palette73.revision,colors=[...palette73.colors];d.querySelector('[name=slot]').onchange=e=>d.querySelector('[name=color]').value=colors[Number(e.target.value)];const close=()=>{d.close();d.remove()};d.querySelector('[data-close]').onclick=close;d.addEventListener('cancel',()=>d.remove());
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();const submit=d.querySelector('[type=submit]');if(submit.disabled)return;submit.disabled=true;try{const slot=Number(d.querySelector('[name=slot]').value);colors[slot]=d.querySelector('[name=color]').value;const result=await scheduleSend56({kind:'palette',colors,revision:version});palette73={colors:result.colors,revision:result.revision};close();drawPalette73(input,host);toast('全公司常用色已儲存')}catch(err){d.querySelector('[role=alert]').textContent=err.message;submit.disabled=false}};
}
function drawPalette73(input,host){
 host.replaceChildren();if(!palette73)return;const slots=document.createElement('div');slots.className='palette-slots73';host.append(slots);
 palette73.colors.forEach((color,index)=>{const b=document.createElement('button');b.type='button';b.style.backgroundColor=color;b.setAttribute('aria-label','常用色 '+(index+1));b.title='常用色 '+(index+1)+(canDo('schedule.palette')?'：單擊套用，雙擊設定':'：單擊套用');b.classList.toggle('selected',input.value.toLowerCase()===color);b.onclick=()=>{input.value=color;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));slots.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b))};if(canDo('schedule.palette'))b.ondblclick=()=>paletteEditor73(index,input,host);slots.append(b)});
 if(canDo('schedule.palette')){const b=document.createElement('button');b.type='button';b.className='palette-settings73';b.textContent='設定常用色';b.onclick=()=>paletteEditor73(0,input,host);host.append(b)}
}
function enhancePalette73(){
 for(const input of document.querySelectorAll('#modal input[type=color][name=color],#modal input[type=color][name=groupColor]')){if(input.dataset.palette73)continue;input.dataset.palette73='1';input.classList.add('palette-source73');const host=document.createElement('div');host.className='palette73';host.textContent='正在載入常用色…';input.after(host);loadPalette73().then(()=>{if(input.isConnected)drawPalette73(input,host)}).catch(e=>{host.textContent=e.message;input.classList.remove('palette-source73')});}
}
new MutationObserver(enhancePalette73).observe(document.body,{childList:true,subtree:true});
function locationOptions73(){return state.warehouseOptions73||{cabinets:cabinetOptions.map(x=>x+'櫃'),shelves:shelfOptions.map(x=>x+'層')};}
function parseLocation73(value){
 const raw=String(value||'').trim(),options=locationOptions73();if(!raw)return{cabinet:options.cabinets[0]||'',shelf:options.shelves[0]||''};
 for(const c of [...options.cabinets].sort((a,b)=>b.length-a.length))for(const s of [...options.shelves].sort((a,b)=>b.length-a.length))if(raw===c+' '+s)return{cabinet:c,shelf:s};
 const conventional=raw.match(/^(.*櫃)\s*(\S+層)$/);if(conventional)return{cabinet:conventional[1].trim(),shelf:conventional[2]};
 // Preserve unrecognised legacy locations verbatim instead of silently changing them.
 return{cabinet:raw,shelf:''};
}
locationFields=function(value='',cabinetValue,shelfValue){const parsed=parseLocation73(value),options=locationOptions73(),c=cabinetValue??parsed.cabinet,s=shelfValue??parsed.shelf;const select=(title,name,list,chosen)=>'<label class="field location-input">'+title+'<select name="'+name+'">'+[...new Set([...list,chosen])].map(v=>'<option value="'+esc(v)+'" '+(v===chosen?'selected':'')+'>'+esc(v||'未指定')+'</option>').join('')+'</select></label>';return select('庫房櫃','cabinet',options.cabinets,c)+select('庫房層','shelf',options.shelves,s)};
locationFromForm=function(fd){return [String(fd.get('cabinet')||''),String(fd.get('shelf')||'')].filter(Boolean).join(' ')};
function warehouseOptionsDialog73(){if(!canDo('warehouse.options'))return;const options=locationOptions73();modal('庫房位置選單','<p>每行一個選項，可新增、修改、刪除或調整順序。請填完整名稱，例如 A櫃、1層。既有位置不會隨選項刪除而改變。</p><div class="form-grid"><label class="field">庫房櫃<textarea name="cabinets" rows="10" required>'+esc(options.cabinets.join('\n'))+'</textarea></label><label class="field">庫房層<textarea name="shelves" rows="10" required>'+esc(options.shelves.join('\n'))+'</textarea></label></div>','儲存選單',async fd=>{const value={};for(const key of ['cabinets','shelves']){const list=String(fd.get(key)).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(!list.length||list.length>100||list.some(s=>s.length>40)||new Set(list).size!==list.length)throw Error('每類須有 1 至 100 個不重複選項，每項最多 40 字');value[key]=list}const next=structuredClone(state);next.warehouseOptions73=value;await commit44(next,'修改庫房位置選單','庫房櫃：'+value.cabinets.join('、')+'｜庫房層：'+value.shelves.join('、'),'管理後台 > 庫房');$('#modal').close();renderAdmin();toast('庫房位置選單已儲存')});}
const renderAdminBefore73=renderAdmin;
renderAdmin=function(){renderAdminBefore73();if(!canDo('warehouse.options'))return;const host=document.querySelector('[data-section-key="warehouse"] .admin-card-body')||document.querySelector('[data-section-key="warehouse"]');if(host&&!host.querySelector('[data-warehouse-options73]')){const b=document.createElement('button');b.type='button';b.dataset.warehouseOptions73='';b.textContent='設定庫房櫃／庫房層選單';b.onclick=warehouseOptionsDialog73;host.prepend(b)}};
