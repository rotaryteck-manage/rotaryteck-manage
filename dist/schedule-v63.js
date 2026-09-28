'use strict';
// UI copy is configured separately from work items, names, and saved records.
const scheduleTextSections63={
 '頁面與操作':['工作排程','每週安排與每日工作回報','每週排程','每日排程','上一期','下一期','今天','新增排程','新增料件','工作紀錄','料件紀錄','工作回報','新增備註','複製上週','複製排程','查看紀錄','編輯'],
 '新增排程':['工作','工作項目','工作內容','人員（可複選）','人員名單','全選','手動輸入工作項目','手動輸入工作內容','開始日期','結束日期','＋ 新增工作','移除此工作','色塊','色塊顏色（全部工作共用）','修改安排','儲存安排','刪除安排','編輯當日排程'],
 '每週備註':['備註','每週備註','備註內容','只有填寫後才會顯示備註欄','儲存備註'],
 '每日料件':['編輯料件','類型','收料','出貨','送貨','案件名稱','未指定案件','料件名稱','數量','登記人','照片（選填，收據或料件共用）','收據照片','料件照片','收據照片（選填）','料件照片（選填）','儲存料件','刪除料件','當日料件／出送貨'],
 '工作回報與紀錄':['當日工作紀錄','排程工作','新增回報','新增工作回報','回報人','紀錄日期','工作項目','工作進度','工作照片（必填，可選照片或貼上圖片）','照片（選填，手機可選照片；電腦可 Ctrl+V 貼上）','儲存回報','刪除回報','收／領料紀錄','當日沒有排程工作','當日尚無回報','尚無工作回報']
};
// Also list these in the site's shared text editor for users who open it there.
uiCatalogue44.schedule=[...new Set(Object.values(scheduleTextSections63).flat())];
function scheduleTextDialog63(){
 const saved=state.appearance?.text?.schedule||{},groups=Object.entries(scheduleTextSections63).map(([title,labels])=>'<section class="schedule-text-group63"><h3>'+esc(title)+'</h3><div class="schedule-text-grid63">'+[...new Set(labels)].map(label=>'<label class="field">'+esc(label)+'<input data-source="'+esc(label)+'" value="'+esc(saved[label]||'')+'" maxlength="500" placeholder="沿用原文字"></label>').join('')+'</div></section>').join('');
 modal('工作排程文字與按鈕','<p class="muted">留白即使用原文字。這些設定只改畫面顯示，不會更動已填的工作、日期或人員。</p><div class="schedule-text-settings63">'+groups+'<section class="schedule-text-group63"><h3>補充其他畫面文字</h3><div class="form-grid">'+field('目前顯示文字','scheduleExtraSource63','','maxlength="500"')+field('想改成','scheduleExtraValue63','','maxlength="500"')+'</div><p class="muted">上面沒有列到的畫面文字，可在此填入原文字與新文字。</p></section></div>','儲存文字',async fd=>{
  const values={};for(const [source,replacement] of Object.entries(saved))if(!uiCatalogue44.schedule.includes(source))values[source]=replacement;
  document.querySelectorAll('#modal .schedule-text-grid63 input[data-source]').forEach(input=>{const value=input.value.trim();if(value)values[input.dataset.source]=value});
  const extra=String(fd.get('scheduleExtraSource63')||'').trim(),newValue=String(fd.get('scheduleExtraValue63')||'').trim();if(extra||newValue){if(!extra||!newValue)throw Error('補充文字請同時填寫原文字與新文字');values[extra]=newValue}
  const next=structuredClone(state);next.appearance??={};next.appearance.text??={};if(Object.keys(values).length)next.appearance.text.schedule=values;else delete next.appearance.text.schedule;
  await commit44(next,'修改工作排程文字','更新排程畫面文字與按鈕','管理後台 > 工作排程');$('#modal').close();renderAdmin();scheduleAppearance44();toast('排程文字已儲存');
 });
}
function scheduleGroupDialog65(name,weekStart){
 if(!scheduleCan56('weekly'))return;
 const row=scheduleWeeklyRows56(weekStart).find(x=>x.name===name);if(!row?.entries.length){toast('排程已更新，請重新開啟');scheduleRender56();return}
 const original=new Map(row.entries.map(e=>[e.id,e])),active=(scheduleData56.people||[]).map(p=>p.name),group=scheduleGroup64(row);let serial=0;
 function task(entry){const index=serial++,selected=entry?scheduleAssignees56(entry):[name],people=[...new Set([...active,...selected])];return '<div class="schedule-task60 schedule-group-task65" data-task-index="'+index+'" '+(entry?'data-existing-id="'+scheduleEsc56(entry.id)+'"':'')+'><h3>工作 '+(index+1)+'</h3><div class="schedule-task-fields60"><label class="field">工作項目<input name="item-'+index+'" required maxlength="160" value="'+scheduleEsc56(entry?.title||'')+'"></label><label class="field">工作內容<input name="content-'+index+'" required maxlength="80" value="'+scheduleEsc56(scheduleContents60(entry||{})[0]||'')+'"></label><div class="field schedule-people63"><span>人員（可複選）</span><div class="schedule-choice60" role="group" aria-label="人員（可複選）">'+people.map(person=>'<label><input type="checkbox" name="people-'+index+'" value="'+scheduleEsc56(person)+'" '+(selected.includes(person)?'checked':'')+'> '+scheduleEsc56(person)+'</label>').join('')+'</div></div></div><div class="form-grid">'+field('開始日期','day-'+index,entry?.day||group.start,'type="date" required')+field('結束日期','end-'+index,entry?.end_day||group.end,'type="date" required')+'</div><button type="button" class="schedule-remove-task60">移除此工作</button></div>'}
 const body='<p class="muted">這裡會一起修改 '+scheduleEsc56(name)+' 的所有工作。若工作也指派給其他人，修改或移除會同步套用。</p><div id="schedule-group-list65">'+row.entries.map(task).join('')+'</div><button type="button" id="schedule-group-add65">＋ 新增工作</button><label class="field">色塊顏色（全部工作共用）<input type="color" name="groupColor" value="'+scheduleEsc56(group.color)+'"></label>';
 modal('編輯排程 · '+scheduleEsc56(name),body,'儲存安排',async fd=>{
  const blocks=[...document.querySelectorAll('#modal .schedule-group-task65')],kept=new Set(blocks.map(b=>b.dataset.existingId).filter(Boolean)),deletions=[...original.values()].filter(e=>!kept.has(e.id)).map(e=>({id:e.id,revision:e.revision})),maxOrder=Math.max(0,...(scheduleData56.entries||[]).filter(e=>e.kind==='weekly'&&e.day<=group.end&&e.end_day>=group.start).map(e=>Number(e.sort_index)||0));let additions=0;
  const entries=blocks.map((el,i)=>{const index=el.dataset.taskIndex,old=original.get(el.dataset.existingId),title=String(fd.get('item-'+index)||'').trim(),content=String(fd.get('content-'+index)||'').trim(),people=[...document.querySelectorAll('#modal [name="people-'+index+'"]:checked')].map(input=>input.value);if(!title||!content||!people.length)throw Error('工作 '+(i+1)+' 請填寫項目、內容並勾選人員');return{id:old?.id||crypto.randomUUID(),revision:old?.revision||0,kind:'weekly',day:String(fd.get('day-'+index)),endDay:String(fd.get('end-'+index)),title,category:JSON.stringify([content]),assignee:JSON.stringify(people),color:String(fd.get('groupColor')),note:old?.note||'',sortIndex:old?.sort_index||maxOrder+(++additions)}});
  if(!entries.length&&!deletions.length)throw Error('沒有可儲存的工作');await scheduleSend56({kind:'batch',entries,deletions});$('#modal').close();scheduleRender56();
 });
 const list=$('#schedule-group-list65');schedulePlacePeople69(list);list.addEventListener('click',event=>{if(!event.target.closest('.schedule-remove-task60'))return;event.target.closest('.schedule-group-task65').remove();list.querySelectorAll('.schedule-group-task65 h3').forEach((heading,i)=>heading.textContent='工作 '+(i+1));schedulePlacePeople69(list)});$('#schedule-group-add65').onclick=()=>{if(list.children.length>=20){toast('每次最多可編輯 20 項工作');return}list.insertAdjacentHTML('beforeend',task());list.querySelectorAll('.schedule-group-task65 h3').forEach((heading,i)=>heading.textContent='工作 '+(i+1));schedulePlacePeople69(list)};
}
