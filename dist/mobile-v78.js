'use strict';
const mobileQuery78=matchMedia('(max-width:700px)');
function mobileRows78(day){
 const rows=(scheduleData56.entries||[]).filter(e=>(e.kind==='daily'&&e.day<=day&&(e.end_day||e.day)>=day)||(e.kind==='material'&&e.day===day)).map(e=>({title:e.kind==='material'?(e.project_name||'未指定案件'):e.title,color:/^#[0-9a-f]{6}$/i.test(e.color||'')?e.color:'#4e8069',section:e.kind==='material'?'materials':'jobs',id:e.kind==='material'?e.id:''}));
 const seen=new Set();for(const e of scheduleMaterial56().filter(e=>e.day===day)){if(seen.has(e.projectId))continue;seen.add(e.projectId);rows.push({title:e.project,color:'#567f9b',section:'materials',id:''});}return rows;
}
function mobileSelect78(day){scheduleAnchor56=day;document.querySelectorAll('.mobile-day78').forEach(c=>{const selected=c.dataset.mobileDay===day;c.classList.toggle('selected78',selected);c.querySelector('.mobile-date78').setAttribute('aria-pressed',String(selected));});const label=$('.mobile-selected78');if(label)label.textContent='已選 '+day;}
function mobileDay78(day){
 mobileSelect78(day);const rows=mobileRows78(day),special=(scheduleData56.entries||[]).filter(e=>e.kind==='special'&&e.day<=day&&(e.end_day||e.day)>=day);
 modal(day+' · 當日內容','<div class="mobile-detail78">'+special.map(e=>'<p>'+esc(e.title)+'</p>').join('')+rows.map((e,i)=>'<button type="button" data-mobile-detail="'+i+'">'+esc(e.title)+'</button>').join('')+(!rows.length?'<p>當日沒有案件安排</p>':'')+'<button type="button" data-mobile-reports>工作回報</button>'+(canDo('schedule.leave.view')?'<button type="button" data-mobile-leaves>請假紀錄</button>':'')+'</div>',null);
 $('#modal').querySelectorAll('[data-mobile-detail]').forEach(b=>b.onclick=()=>{const r=rows[Number(b.dataset.mobileDetail)];scheduleDayRecord56(day,r.section,r.id);});$('#modal [data-mobile-reports]').onclick=()=>scheduleDayRecord56(day,'reports');const leave=$('#modal [data-mobile-leaves]');if(leave)leave.onclick=()=>leaveRecords72(day);
}
function mobileCalendar78(){
 const root=$('#schedule-content56');if(!root||scheduleTab56!=='daily')return;root.querySelector('.mobile-calendar78')?.remove();if(!mobileQuery78.matches)return;
 // The desktop calendar remains intact. Its dates are the authoritative visible range.
 const cells=[...root.querySelectorAll('.schedule-calendar-day67[data-day]')],today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'}),month=cells.find(c=>!c.classList.contains('schedule-adjacent70'))?.dataset.day.slice(0,7)||scheduleAnchor56.slice(0,7);
 const grid=document.createElement('div');grid.className='mobile-calendar78';grid.setAttribute('aria-label','每日排程月曆');
 grid.innerHTML=['一','二','三','四','五','六','日'].map(s=>'<div class="mobile-weekday78">'+s+'</div>').join('')+cells.map(c=>{const day=c.dataset.day,rows=mobileRows78(day),off=c.classList.contains('schedule-holiday60'),holiday=holidayName60(day),leaves=canDo('schedule.leave.view')&&(scheduleData56.leaves||[]).some(e=>leaveOnDay72(e,day)),reports=(scheduleData56.reports||[]).some(e=>e.day===day);return '<section class="mobile-day78 '+(off?'off78 ':'')+(day.slice(0,7)!==month?'adjacent78 ':'')+(day===today?'today78 ':'')+(day===scheduleAnchor56?'selected78':'')+'" data-mobile-day="'+day+'"><button type="button" class="mobile-date78" aria-label="'+day+' 當日內容" aria-pressed="'+(day===scheduleAnchor56)+'">'+(day.slice(0,7)!==month?Number(day.slice(5,7))+'/'+Number(day.slice(8)):Number(day.slice(8)))+'</button>'+(holiday?'<span class="mobile-holiday78" title="'+esc(holiday)+'">'+esc(holiday)+'</span>':'')+rows.slice(0,7).map(e=>'<button type="button" class="mobile-entry78" style="background:'+e.color+';color:'+scheduleInk56(e.color)+'" title="'+esc(e.title)+'">'+esc(e.title)+'</button>').join('')+(rows.length>7?'<button type="button" class="mobile-more78" aria-label="'+day+' 還有 '+(rows.length-7)+' 項">+'+(rows.length-7)+'</button>':'')+((leaves||reports)?'<span class="mobile-indicators78">'+(leaves?'假 ':'')+(reports?'回報':'')+'</span>':'')+'</section>';}).join('');
 root.append(grid);grid.querySelectorAll('.mobile-day78').forEach(cell=>cell.querySelectorAll('button').forEach(b=>b.onclick=()=>mobileDay78(cell.dataset.mobileDay)));
}
function mobileTools78(){
 const section=$('.schedule-workspace');if(!section)return;section.querySelectorAll('.mobile-footer78,.mobile-selected78').forEach(x=>x.remove());if(!mobileQuery78.matches)return;
 const label=document.createElement('p');label.className='mobile-selected78';label.textContent='已選 '+scheduleAnchor56;section.querySelector('.schedule-head').after(label);
 const bar=document.createElement('nav');bar.className='mobile-footer78';bar.setAttribute('aria-label','排程操作');
 const items=[['新增排程',scheduleAction75(scheduleTab56,'create'),()=>scheduleEntryDialog56()],['新增料件',scheduleAction75('material','create'),()=>scheduleMaterialDialog61()],['請假登記',canDo('schedule.leave.create'),()=>leaveDialog72()],['工作回報',canDo('schedule.report'),()=>scheduleReportDialog56(scheduleAnchor56)]];
 for(const [text,allowed,action]of items){const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=!allowed;b.title=allowed?text:'未授權此功能';b.onclick=()=>{if(allowed)action();};bar.append(b);}section.append(bar);
}
const drawBefore78=scheduleDraw56;scheduleDraw56=function(){drawBefore78();mobileCalendar78();mobileTools78();};
const renderBefore78=scheduleRender56;scheduleRender56=function(){renderBefore78();mobileTools78();};
const decorateBefore78=scheduleDecorate60;scheduleDecorate60=function(){decorateBefore78();if(mobileQuery78.matches&&$('.mobile-calendar78')){document.querySelectorAll('.mobile-day78').forEach(c=>{const d=c.dataset.mobileDay;c.classList.toggle('off78',!!holidayData60(d)?.off||[0,6].includes(new Date(d+'T00:00:00Z').getUTCDay()));const name=holidayName60(d);let label=c.querySelector('.mobile-holiday78');if(name&&!label){label=document.createElement('span');label.className='mobile-holiday78';c.querySelector('.mobile-date78').after(label);}if(label){label.textContent=name;label.title=name;}});}};
mobileQuery78.addEventListener('change',()=>{if(location.hash==='#schedule'){mobileCalendar78();mobileTools78();}});
