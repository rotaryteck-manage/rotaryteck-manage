'use strict';
const mobileQuery78=matchMedia('(max-width:700px)');
const mobileMaterialOrder78=(a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id||'').localeCompare(String(b.id||''));
function mobileRows78(day){
 const entries=scheduleData56.entries||[],rows=[];
 const jobs=entries.some(e=>e.kind==='daily'&&e.day<=day&&(e.end_day||e.day)>=day);
 const reports=(scheduleData56.reports||[]).some(e=>e.day===day);

 if(jobs||reports)rows.push({title:'工作紀錄',section:'jobs'});
 if(canDo('schedule.leave.view')&&(scheduleData56.leaves||[]).some(e=>leaveOnDay72(e,day)))rows.push({title:'請假紀錄',section:'leaves'});

 entries
 .filter(e=>e.kind==='material'&&e.day===day)
 .sort(mobileMaterialOrder78)
 .forEach(e=>{
  const materialType=({
   收料:'receipt',
   出貨:'outgoing',
   送貨:'delivery'
  }[e.category]||'receipt');

  rows.push({
   title:(e.project_name||'')+(e.title||''),
   section:'material',
   materialId:e.id,
   materialType
  });
 });

 return rows;
}
function mobileOpen79(day,section,materialId=''){
 mobileSelect78(day);
 if(section==='leaves')return leaveRecords72(day);
 if(section==='material')return scheduleDayRecord56(day,'materials',materialId,'current');
 if(section==='legacy')return scheduleDayRecord56(day,'materials','','legacy');
 scheduleDayRecord56(day,section);
}
function mobileSelect78(day){scheduleAnchor56=day;document.querySelectorAll('.mobile-day78').forEach(c=>{const selected=c.dataset.mobileDay===day;c.classList.toggle('selected78',selected);c.querySelector('.mobile-date78').setAttribute('aria-pressed',String(selected));});const label=$('.mobile-selected78');if(label)label.textContent='已選 '+day;}
function mobileDay78(day){
 mobileSelect78(day);const rows=mobileRows78(day),special=(scheduleData56.entries||[]).filter(e=>e.kind==='special'&&e.day<=day&&(e.end_day||e.day)>=day);
 modal(day+' · 當日內容','<div class="mobile-detail78">'+special.map(e=>'<p>'+esc(e.title)+'</p>').join('')+rows.map(e=>'<button type="button" data-mobile-section="'+e.section+'" '+(e.materialId?'data-mobile-material-id="'+esc(e.materialId)+'"':'')+'>'+esc(e.title)+'</button>').join('')+(!rows.length?'<p>當日沒有紀錄，可關閉後使用下方按鈕新增。</p>':'')+'</div>',null);
 $('#modal').querySelectorAll('[data-mobile-section]').forEach(b=>b.onclick=()=>mobileOpen79(day,b.dataset.mobileSection,b.dataset.mobileMaterialId||''));
}
function mobileCalendar78(){
 const root=$('#schedule-content56');if(!root||scheduleTab56!=='daily')return;root.querySelector('.mobile-calendar78')?.remove();if(!mobileQuery78.matches)return;
 const cells=[...root.querySelectorAll('.schedule-calendar-day67[data-day]')],today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'}),month=cells.find(c=>!c.classList.contains('schedule-adjacent70'))?.dataset.day.slice(0,7)||scheduleAnchor56.slice(0,7);
 const grid=document.createElement('div');grid.className='mobile-calendar78';grid.setAttribute('aria-label','每日排程月曆');
 grid.innerHTML=['日','一','二','三','四','五','六'].map(s=>'<div class="mobile-weekday78">'+s+'</div>').join('')+cells.map(c=>{const day=c.dataset.day,rows=mobileRows78(day),off=c.classList.contains('schedule-holiday60'),holiday=holidayName60(day);return '<section class="mobile-day78 '+(off?'off78 ':'')+(day.slice(0,7)!==month?'adjacent78 ':'')+(day===today?'today78 ':'')+(day===scheduleAnchor56?'selected78':'')+'" data-mobile-day="'+day+'"><button type="button" class="mobile-date78" aria-label="'+day+' 當日內容" aria-pressed="'+(day===scheduleAnchor56)+'">'+(Number(day.slice(5,7))+'/'+Number(day.slice(8)))+'</button>'+(holiday?'<span class="mobile-holiday78 '+(holiday.includes('補假')?'is-makeup103':'')+'" title="'+esc(holiday)+'">'+esc(holiday)+'</span>':'')+'<div class="mobile-slots79">'+rows.map(e=>'<button type="button" class="mobile-entry78 mobile-'+e.section+'79 '+(e.materialType?'mobile-material-'+e.materialType+'79':'')+'" data-mobile-section="'+e.section+'" '+(e.materialId?'data-mobile-material-id="'+e.materialId+'"':'')+' title="'+esc(e.title)+'">'+esc(e.title)+'</button>').join('')+'</div></section>';}).join('');
 root.append(grid);grid.querySelectorAll('.mobile-day78').forEach(cell=>{cell.querySelector('.mobile-date78').onclick=()=>mobileDay78(cell.dataset.mobileDay);cell.querySelectorAll('[data-mobile-section]').forEach(b=>b.onclick=()=>mobileOpen79(cell.dataset.mobileDay,b.dataset.mobileSection,b.dataset.mobileMaterialId||''));});requestAnimationFrame(mobileFitMaterialText78);
}
function mobileFitMaterialText78(){
 document.querySelectorAll('.mobile-entry78.mobile-material79').forEach(el=>{
  el.style.whiteSpace='nowrap';
  el.style.overflow='hidden';
  el.style.textOverflow='ellipsis';
  el.style.fontSize='';

  let size=parseFloat(getComputedStyle(el).fontSize);

  while(el.scrollWidth>el.clientWidth&&size>10){
   size-=0.5;
   el.style.fontSize=size+'px';
  }
 });
}
function mobileTools78(){
 const section=$('.schedule-workspace');if(!section)return;section.querySelectorAll('.mobile-footer78,.mobile-selected78').forEach(x=>x.remove());if(!mobileQuery78.matches)return;
 const label=document.createElement('p');label.className='mobile-selected78';label.textContent='已選 '+scheduleAnchor56;section.querySelector('.schedule-head').after(label);
 const bar=document.createElement('nav');bar.className='mobile-footer78';bar.setAttribute('aria-label','排程操作');
 const items=[['新增排程',scheduleAction75(scheduleTab56,'create'),()=>scheduleEntryDialog56()],['新增料件',scheduleAction75('material','create'),()=>scheduleMaterialDialog61()],['請假登記',canDo('schedule.leave.create'),()=>leaveDialog72()],['工作回報',canDo('schedule.report'),()=>scheduleReportDialog56(scheduleAnchor56)]];
 for(const [text,allowed,action]of items){const b=document.createElement('button');b.type='button';b.innerHTML=mobileIcon79(text)+'<span>'+text+'</span>';b.disabled=!allowed;b.title=allowed?text:'未授權此功能';b.onclick=()=>{if(allowed)action();};bar.append(b);}section.append(bar);
}
const drawBefore78=scheduleDraw56;scheduleDraw56=function(){drawBefore78();mobileCalendar78();mobileTools78();};
const renderBefore78=scheduleRender56;scheduleRender56=function(){renderBefore78();mobileTools78();};
 const decorateBefore78=scheduleDecorate60;scheduleDecorate60=function(){decorateBefore78();if(mobileQuery78.matches&&$('.mobile-calendar78')){document.querySelectorAll('.mobile-day78').forEach(c=>{const d=c.dataset.mobileDay;c.classList.toggle('off78',!!holidayData60(d)?.off||[0,6].includes(new Date(d+'T00:00:00Z').getUTCDay()));const name=holidayName60(d);let label=c.querySelector('.mobile-holiday78');if(name&&!label){label=document.createElement('span');label.className='mobile-holiday78';c.querySelector('.mobile-date78').after(label);}if(label){if(!name){label.remove();return}label.textContent=name;label.title=name;label.classList.toggle('is-makeup103',name.includes('補假'))}});}};
mobileQuery78.addEventListener('change',()=>{if(location.hash==='#schedule'){mobileCalendar78();mobileTools78();}});

function mobileIcon79(text){
 const paths={'新增排程':'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-8 3v5m-2.5-2.5h5"/>','新增料件':'<path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4M12 11v10M7 5l9 4"/>','請假登記':'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6m-6 4h6m-6 4 2 2 4-4"/>','工作回報':'<path d="M4 4h16v12H9l-5 4ZM8 8h8m-8 4h5"/>'};
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths[text]+'</svg>';
}
