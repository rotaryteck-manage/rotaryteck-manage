'use strict';
const materialText149=value=>String(value??'').normalize('NFKC').toLowerCase().trim();
const materialMatches149=(query,...fields)=>fields.some(value=>materialText149(value).includes(query));
const materialKind149={issued:'領料',received:'收料'};
function materialRows149(projects,dayOnly=''){
 const rows=[];
 for(const p of projects||[])for(const log of p.materialLogs||[]){
  const timestamp=Date.parse(log.time);
  const day=Number.isFinite(timestamp)?taipeiDate(log.time):'';
  if(dayOnly&&day!==dayOnly)continue;
  for(const bucket of ['issued','received'])for(const item of log[bucket]||[]){
   if(bucket==='issued'&&item.category&&item.category!=='領料')continue;
   rows.push({day,time:log.time,timestamp,kind:bucket,project:p.name,name:item.name,quantity:item.qty,actor:log.actor});
  }
 }
 return rows.sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
}
function materialTable149(rows,showKind){
 const headings=['時間',...(showKind?['類型']:[]),'案名','料件','數量','登記人'];
 return '<div class="material-table149"><table><thead><tr>'+headings.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(receiptTime(r.time))+'</td>'+(showKind?'<td>'+materialKind149[r.kind]+'</td>':'')+'<td>'+esc(r.project)+'</td><td>'+esc(r.name)+'</td><td>'+esc(r.quantity)+'</td><td>'+esc(r.actor||'－')+'</td></tr>').join('')+'</tbody></table></div>';
}
function warehouseMaterialHistory149(){
 if(!canDo('warehouse.view'))return;
 const rows=materialRows149((confirmed||state).projects),pageSize=50;
 let kind='all',page=0;
 modal('領／收料紀錄','<div class="material-filters149"><div class="material-tabs149" role="group" aria-label="紀錄類型"><button type="button" data-history-kind149="all">全部</button><button type="button" data-history-kind149="issued">領料</button><button type="button" data-history-kind149="received">收料</button></div><input type="search" data-history-search149 aria-label="搜尋案名或料件名稱" placeholder="搜尋案名或料件名稱"></div><div data-history-results149></div><div class="audit-pager material-pager149"><button type="button" data-history-prev149>上一頁</button><small data-history-status149 aria-live="polite"></small><button type="button" data-history-next149>下一頁</button></div>',null);
 const root=$('#modal'),search=root.querySelector('[data-history-search149]'),results=root.querySelector('[data-history-results149]'),tabs=[...root.querySelectorAll('[data-history-kind149]')],prev=root.querySelector('[data-history-prev149]'),next=root.querySelector('[data-history-next149]'),status=root.querySelector('[data-history-status149]');
 const draw=()=>{
  const q=materialText149(search.value),filtered=rows.filter(r=>(kind==='all'||kind===r.kind)&&(!q||materialMatches149(q,r.project,r.name))),pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  tabs.forEach(b=>{const active=b.dataset.historyKind149===kind;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});
  results.innerHTML=filtered.length?materialTable149(filtered.slice(page*pageSize,(page+1)*pageSize),kind==='all'):'<p class="muted">'+(q?'沒有符合的紀錄':'目前沒有紀錄')+'</p>';
  prev.disabled=page===0;next.disabled=page+1>=pages;status.textContent=filtered.length+' 筆'+(pages>1?' · 第 '+(page+1)+'／'+pages+' 頁':'');
 };
 tabs.forEach(b=>b.onclick=()=>{kind=b.dataset.historyKind149;page=0;draw()});
 search.addEventListener('input',()=>{page=0;draw()});
 prev.onclick=()=>{if(!prev.disabled){page--;draw()}};
 next.onclick=()=>{if(!next.disabled){page++;draw()}};
 draw();
}
function calendarIssues149(day){
 return canDo('warehouse.view')?calendarMaterialDays149.get(day)||[]:[];
}
function calendarOpenIssues149(day){
 if(!canDo('warehouse.view'))return;
 const rows=calendarIssues149(day);
 modal(day+' · 領料明細',rows.length?materialTable149(rows,false):'<p class="muted">當日沒有領料紀錄</p>',null);
}

let calendarMaterialDays149=new Map(),calendarSearch149='',calendarSearchKind149='all',calendarSearchOwner149=null;
function calendarMaterialRank149(entry){return entry?.category==='收料'?0:1}
function calendarMaterialOrder149(entries){
 return new Map(entries.filter(e=>e.kind==='material').map(e=>[String(e.id),e]));
}
function calendarJobMatch149(day,query,data){
 return (data.entries||[]).some(e=>e.kind==='daily'&&e.day<=day&&(e.end_day||e.day)>=day&&materialMatches149(query,e.title,e.category,...scheduleAssignees56(e)))||
  (data.reports||[]).some(r=>r.day===day&&materialMatches149(query,r.author_name,r.body,r.work_title,r.work_content));
}
function calendarJobQuery149(day){
 const q=materialText149(calendarSearch149);
 return q&&['all','jobs'].includes(calendarSearchKind149)&&calendarJobMatch149(day,q,scheduleData56)?q:'';
}
function calendarHighlightText149(node,query){
 const value=node.data,folded=value.normalize('NFKC').toLowerCase();
 if(!folded.includes(query))return null;
 const parts=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter().segment(value),p=>p.segment):value.match(/\P{M}\p{M}*|\p{M}+/gu)||[];
 const starts=[],ends=[];
 let offset=0;
 for(const part of parts){
  const width=part.normalize('NFKC').toLowerCase().length;
  for(let i=0;i<width;i++){starts.push(offset);ends.push(offset+part.length)}
  offset+=part.length;
 }
 if(starts.length!==folded.length)return null;
 const frag=document.createDocumentFragment();
 let first=null,last=0;
 for(let at=folded.indexOf(query);at!==-1;at=folded.indexOf(query,at+query.length)){
  const start=starts[at],end=ends[at+query.length-1];
  if(start<last)continue;
  frag.append(value.slice(last,start));
  const mark=document.createElement('mark');
  mark.className='calendar-record-hit149';mark.textContent=value.slice(start,end);
  frag.append(mark);first||=mark;last=end;
 }
 frag.append(value.slice(last));node.replaceWith(frag);
 return first;
}
function calendarRevealJobMatch149(query){
 if(!query)return;
 const dialog=$('#modal[open]'),list=dialog?.querySelector('.schedule-daily-list67');
 if(!list)return;
 const nodes=document.createTreeWalker(list,NodeFilter.SHOW_TEXT,{
  acceptNode:node=>node.parentElement.closest('.schedule-person-summary80,.schedule-avatar67,.schedule-bubble67>strong,.schedule-bubble67>p')?
   NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT,
 }),matches=[];
 while(nodes.nextNode())if(materialMatches149(query,nodes.currentNode.data))matches.push(nodes.currentNode);
 let first=null;
 for(const node of matches){const mark=calendarHighlightText149(node,query);first||=mark}
 if(!first)return;
 requestAnimationFrame(()=>{
  if(!dialog.open||!first.isConnected)return;
  for(let parent=first.parentElement;parent&&parent!==dialog;parent=parent.parentElement){
   if(parent.scrollHeight<=parent.clientHeight||!['auto','scroll'].includes(getComputedStyle(parent).overflowY))continue;
   const mark=first.getBoundingClientRect(),frame=parent.getBoundingClientRect();
   parent.scrollTop+=mark.top-frame.top+(mark.height-parent.clientHeight)/2;
  }
 });
}
function calendarSearchHits149(root,query,kind){
 const data=scheduleData56,entries=data.entries||[],materials=calendarMaterialOrder149(entries),hits=new Set();
 const allowed=key=>query&&(kind==='all'||kind===key);
 const check=(button,day,yes,key)=>{
  const match=Boolean(button&&day&&yes);
  button?.classList.toggle('calendar-hit149',match);
  if(match)hits.add(day+':'+key);
 };
 for(const cell of root.querySelectorAll('.schedule-calendar-day67[data-day],.mobile-day78[data-mobile-day]')){
  const day=cell.dataset.day||cell.dataset.mobileDay;
  const jobs=allowed('jobs')&&calendarJobMatch149(day,query,data);
  const leaves=allowed('leaves')&&canDo('schedule.leave.view')&&(data.leaves||[]).some(e=>leaveOnDay72(e,day)&&materialMatches149(query,e.reason,...(e.people||[]).map(p=>p.name)));
  check(cell.querySelector('[data-day-jobs],[data-mobile-section="jobs"]'),day,jobs,'jobs');
  check(cell.querySelector('.leave-link72,[data-mobile-section="leaves"]'),day,leaves,'leaves');
  for(const b of cell.querySelectorAll('[data-day-material-id],[data-mobile-material-id]')){
   const id=b.dataset.dayMaterialId||b.dataset.mobileMaterialId,e=materials.get(id);
   check(b,day,allowed('material')&&e&&materialMatches149(query,e.title,e.project_name),'material:'+id);
  }
  check(cell.querySelector('[data-day-issues149],[data-mobile-section="issues149"]'),day,allowed('material')&&calendarIssues149(day).some(r=>materialMatches149(query,r.name,r.project)),'issues');
 }
 return hits.size;
}
function calendarSearchDraw149(){
 const root=$('#schedule-content56'),status=$('[data-calendar-search-status149]');
 if(!root||!status)return;
 const q=materialText149(calendarSearch149),hits=calendarSearchHits149(root,q,calendarSearchKind149);
 const missing=Boolean(q&&!hits),field=status.closest('.calendar-search-field149');
 status.textContent=missing?'無結果':'';
 field.dataset.empty=String(missing);
 field.querySelector('.calendar-search-clear149').hidden=!q;
 field.dataset.filled=String(Boolean(q));
}
function calendarTools149(){
 const toolbar=$('.schedule-workspace .schedule-toolbar');
 if(!toolbar||scheduleTab56!=='daily')return;
 const owner=currentUser?.id;
 if(owner!==calendarSearchOwner149){calendarSearchOwner149=owner;calendarSearch149='';calendarSearchKind149='all'}
 if(toolbar.querySelector('[data-calendar-search149]'))return;
 const box=document.createElement('div');box.className='calendar-search149';
 box.innerHTML='<div class="calendar-search-field149"><input type="search" data-calendar-search149 aria-label="搜尋本頁紀錄" placeholder="搜尋本頁紀錄"><div class="calendar-search-end149"><button type="button" class="calendar-search-clear149" aria-label="清除搜尋" hidden>×</button><small data-calendar-search-status149 role="status"></small></div></div><select aria-label="搜尋類型"><option value="all">全部</option><option value="material">料件</option><option value="jobs">工作</option>'+(canDo('schedule.leave.view')?'<option value="leaves">請假</option>':'')+'</select>';
 const input=box.querySelector('input'),select=box.querySelector('select');
 input.value=calendarSearch149;select.value=calendarSearchKind149;
 if(!select.value)select.value=calendarSearchKind149='all';
 input.addEventListener('input',event=>{if(!event.isComposing){calendarSearch149=input.value;calendarSearchDraw149()}});
 input.addEventListener('compositionend',()=>{calendarSearch149=input.value;calendarSearchDraw149()});
 box.querySelector('.calendar-search-clear149').onclick=()=>{input.value=calendarSearch149='';calendarSearchDraw149();input.focus()};
 select.onchange=()=>{calendarSearchKind149=select.value;calendarSearchDraw149()};
 const queryRow=toolbar.querySelector('.schedule-daily-query163');
 if(queryRow)queryRow.append(box);
 else toolbar.querySelector('.schedule-action-controls').before(box);
}
function calendarIssueLabel149(count){return '領料紀錄('+count+')';}
const calendarRowsBefore149=mobileRows78;
mobileRows78=function(day){
 const rows=calendarRowsBefore149(day),rank=r=>r.section==='material'&&r.materialType!=='receipt'?1:0;
 rows.sort((a,b)=>rank(a)-rank(b));
 const n=calendarIssues149(day).length;
 if(n)rows.splice(rows.filter(r=>r.section==='jobs'||r.section==='leaves').length,0,{title:calendarIssueLabel149(n),section:'issues149'});
 return rows;
};
const mobileOpenBefore149=mobileOpen79;
mobileOpen79=function(day,section,...args){
 if(section==='jobs'){
  const q=calendarJobQuery149(day),result=mobileOpenBefore149.call(this,day,section,...args);
  calendarRevealJobMatch149(q);
  return result;
 }
 if(section!=='issues149')return mobileOpenBefore149(day,section,...args);
 mobileSelect78(day);return calendarOpenIssues149(day);
};
const mobileCalendarBefore149=mobileCalendar78;
mobileCalendar78=function(...args){const result=mobileCalendarBefore149.apply(this,args);if(scheduleTab56==='daily')calendarSearchDraw149();return result};
const calendarDrawBefore149=scheduleDraw56;
scheduleDraw56=function(...args){
 if(scheduleTab56!=='daily')return calendarDrawBefore149.apply(this,args);
 const root=$('#schedule-content56'),month=scheduleMonth56(scheduleAnchor56),days=new Map();
 if(canDo('warehouse.view')){
  const lower=scheduleShift56(month,-6),upper=scheduleShift56(month,41);
  for(const row of materialRows149((confirmed||state).projects)){
   if(row.kind!=='issued'||row.day<lower||row.day>upper)continue;
   if(!days.has(row.day))days.set(row.day,[]);
   days.get(row.day).push(row);
  }
 }
 calendarMaterialDays149=days;
 const result=calendarDrawBefore149.apply(this,args);
 if(!root)return result;
 const materials=calendarMaterialOrder149(scheduleData56.entries||[]);
 for(const cell of root.querySelectorAll('.schedule-calendar-day67[data-day]')){
  const day=cell.dataset.day,links=cell.querySelector('.schedule-calendar-links67');
  if(!links)continue;
  const buttons=[...links.querySelectorAll('button')];
  const rank=b=>b.hasAttribute('data-day-jobs')?0:b.classList.contains('leave-link72')?1:b.hasAttribute('data-day-issues149')?2:b.hasAttribute('data-day-material-id')?3+calendarMaterialRank149(materials.get(b.dataset.dayMaterialId)):5;
  const job=buttons.find(b=>b.hasAttribute('data-day-jobs'));
  if(job)job.onclick=()=>{
   const q=calendarJobQuery149(day);
   scheduleDayRecord56(day,'jobs');
   calendarRevealJobMatch149(q);
  };
  const n=calendarIssues149(day).length;
  if(n){
   const b=document.createElement('button');b.type='button';b.className='schedule-day-link67 schedule-issue149';b.dataset.dayIssues149=day;b.textContent=calendarIssueLabel149(n);b.onclick=()=>calendarOpenIssues149(day);buttons.push(b);
  }
  buttons.sort((a,b)=>rank(a)-rank(b));
  buttons.forEach((b,i)=>{b.style.gridRow=String(i+1);links.append(b)});
 }
 calendarTools149();calendarSearchDraw149();return result;
};
