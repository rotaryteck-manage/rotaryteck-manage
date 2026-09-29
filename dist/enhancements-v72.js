'use strict';
const leaveCan72=()=>['supervisor','warehouse'].includes(currentUser.role)&&canDo('schedule.daily');
function leaveOnDay72(e,day){return e.start_at<scheduleShift56(day,1)+'T00:00'&&e.end_at>day+'T00:00';}
function leaveDialog72(entry=null,day=scheduleAnchor56){
 if(!leaveCan72())return;
 const id=entry?.id||crypto.randomUUID(),selected=new Set((entry?.people||[]).map(p=>String(p.id))),people=scheduleData56.people||[];
 modal(entry?'編輯請假':'請假登記','<div class="form-grid"><label class="field">開始時間<input type="datetime-local" name="start" value="'+esc(entry?.start_at||day+'T08:30')+'" required></label><label class="field">結束時間<input type="datetime-local" name="end" value="'+esc(entry?.end_at||day+'T17:30')+'" required></label><label class="field">原因<select name="reason">'+['事假','病假','公假','其他'].map(v=>'<option '+(entry?.reason===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label class="field" id="leave-other74" hidden>其他原因<input name="reasonNote" maxlength="200" value="'+esc(entry?.reason_note||'')+'" placeholder="請填寫原因"></label></div><fieldset class="leave-people72"><legend>請假人員（可複選多人）</legend>'+people.map(p=>'<label><input type="checkbox" name="people" value="'+esc(p.id)+'" '+(selected.has(String(p.id))?'checked':'')+'>'+esc(p.name)+'</label>').join('')+'</fieldset><p class="muted">時間以台灣時間登記；跨日請假會顯示於各個請假日期。</p>','確認登記',async fd=>{
  const start=String(fd.get('start')),end=String(fd.get('end')),chosen=fd.getAll('people').map(String);
  if(!chosen.length)throw Error('請至少選擇一位人員');if(end<=start)throw Error('結束時間必須晚於開始時間');
  await scheduleSend56({kind:'leave',id,revision:entry?.revision||0,start,end,people:chosen,reason:String(fd.get('reason')),reasonNote:fd.get('reason')==='其他'?String(fd.get('reasonNote')||'').trim():''});$('#modal').close();scheduleRender56();toast('請假登記已儲存');
 });
 const reason=$('#modal [name=reason]'),note=$('#modal [name=reasonNote]'),field=$('#leave-other74');
 const sync=()=>{const other=reason.value==='其他';field.hidden=!other;note.disabled=!other;note.required=other;};reason.addEventListener('change',sync);sync();
}
function leaveRecords72(day){
 const entries=(scheduleData56.leaves||[]).filter(e=>leaveOnDay72(e,day));
 modal('請假紀錄 · '+day,'<div class="leave-records72">'+(entries.map(e=>'<article><div><strong>'+esc(e.people.map(p=>p.name).join('、'))+'</strong><span>'+esc(e.reason+(e.reason==='其他'&&e.reason_note?'：'+e.reason_note:''))+'</span><small>'+esc(e.start_at.replace('T',' ')+' 至 '+e.end_at.replace('T',' '))+'</small></div>'+(leaveCan72()?'<button type="button" data-leave-edit72="'+esc(e.id)+'">編輯</button><button type="button" data-leave-delete72="'+esc(e.id)+'">刪除</button>':'')+'</article>').join('')||'<p>當日沒有請假紀錄</p>')+'</div>',null);
 $('#modal').querySelectorAll('[data-leave-edit72]').forEach(b=>b.onclick=()=>leaveDialog72(entries.find(e=>e.id===b.dataset.leaveEdit72),day));
 $('#modal').querySelectorAll('[data-leave-delete72]').forEach(b=>b.onclick=async()=>{if(b.disabled)return;if(!await confirmAction('確定刪除這筆請假？會移除這筆登記內的所有人員及整段時間。'))return;b.disabled=true;try{const e=entries.find(e=>e.id===b.dataset.leaveDelete72);await scheduleSend56({kind:'leave',id:e.id,revision:e.revision},'DELETE');$('#modal').close();scheduleRender56()}catch(e){toast(e.message);b.disabled=false}});
}
const scheduleDrawBefore72=scheduleDraw56;
scheduleDraw56=function(){
 scheduleDrawBefore72();if(scheduleTab56!=='daily')return;
 const bar=$('.schedule-action-controls');if(bar&&leaveCan72()&&!document.querySelector('[data-leave-new72]')){const row=document.createElement('div');row.className='leave-toolbar72';row.innerHTML='<button type="button" data-leave-new72>請假登記</button>';bar.after(row);row.querySelector('button').onclick=()=>leaveDialog72();}
 document.querySelectorAll('.schedule-calendar-day67[data-day]').forEach(cell=>{
  const day=cell.dataset.day,records=(scheduleData56.leaves||[]).filter(e=>leaveOnDay72(e,day));if(!records.length)return;
  const links=cell.querySelector('.schedule-calendar-links67');
  for(const [slot,selector]of [[1,'[data-day-jobs]'],[2,'[data-day-reports]']]){let el=links.querySelector(selector);if(!el){el=document.createElement('span');el.className='leave-slot72';el.setAttribute('aria-hidden','true');links.prepend(el)}el.style.gridRow=String(slot);}
  const b=document.createElement('button');b.type='button';b.className='schedule-day-link67 leave-link72';b.textContent='請假紀錄';b.style.gridRow='3';b.onclick=()=>leaveRecords72(day);links.append(b);
 });
};
function warehouseRows72(){
 const p=project(),table=$('#warehouse-dialog .editable-bom');if(!p||!table)return;
 if(!table.querySelector('[data-date-heading72]')){
  for(const title of ['收料時間','領料時間']){const th=document.createElement('th');th.dataset.dateHeading72='';th.textContent=title;table.tHead.rows[0].append(th)}
  for(const row of table.querySelectorAll('tbody tr[data-item]')){const item=p.parts.find(i=>i.id===row.dataset.item);if(!item)continue;for(const [field,title]of [['receivedDate72','收料時間'],['issuedDate72','領料時間']]){const td=document.createElement('td');td.className='warehouse-date-cell72';const text=item[field]?item[field].replaceAll('-','/'):'－';if(currentUser.role==='supervisor'&&canDo('warehouse.manage')){const b=document.createElement('button');b.type='button';b.className='warehouse-date72';b.dataset.dateField72=field;b.textContent=text;b.setAttribute('aria-label',item.name+' '+title+' '+text);b.onclick=()=>warehouseDateDialog72(p.id,item.id,field,title);td.append(b)}else{td.textContent=text}row.append(td)}}
 }
 let ready=0,waiting=0;
 for(const row of table.querySelectorAll('tbody tr[data-item]')){const i=p.parts.find(x=>x.id===row.dataset.item);if(!i)continue;const complete=preparedQuantity(p,i)>=totalNeed(i)&&inStock(p,i.id)>=preparedQuantity(p,i);if(row.hidden)continue;const index=complete?ready++:waiting++;row.dataset.ready72=complete?'yes':'no';row.dataset.stripe72=String(index%2);}
}
function warehouseDateDialog72(projectId,partId,key,title){
 if(currentUser.role!=='supervisor'||!canDo('warehouse.manage'))return;
 if(cloudBusy||failedCandidate){toast('請先完成儲存或處理上方提示');return;}
 const p=state.projects.find(p=>p.id===projectId),i=p?.parts.find(i=>i.id===partId);if(!i)return;
 captureDraft();const before=i[key]||'';
 modal(title,'<p>'+esc(p.name+'｜'+i.name)+'</p><label class="field">'+title+'<input type="date" name="date" value="'+esc(before)+'" required></label><button type="button" id="clear-date72">清除</button>','確認',async fd=>save(String(fd.get('date'))));
 async function save(value){if(value&&!validDate(value))throw Error('請選擇正確日期');const next=structuredClone(state),item=next.projects.find(p=>p.id===projectId)?.parts.find(i=>i.id===partId);if(!item||(item[key]||'')!==before)throw Error('資料已更新，請重新開啟');item[key]=value;await commit44(next,'修改'+title,p.name+'｜'+i.name+'｜'+(before||'－')+' → '+(value||'－'),'庫房管理',projectId);$('#modal').close();const scroll=$('#warehouse-dialog')?.scrollTop||0;render();if($('#warehouse-dialog'))$('#warehouse-dialog').scrollTop=scroll;toast('日期已儲存');}
 $('#clear-date72').onclick=async()=>{if(!await confirmAction('確定清除'+i.name+'的'+title+'？'))return;const b=$('#clear-date72');b.disabled=true;try{await save('')}catch(e){$('#form-error').textContent=e.message;b.disabled=false}};
}
const warehouseDetailBefore72=enhanceWarehouseDetail;
enhanceWarehouseDetail=function(){warehouseDetailBefore72();warehouseRows72();const form=$('#receipt-form');form?.addEventListener('input',warehouseRows72);$('#part-status')?.addEventListener('change',warehouseRows72)};
