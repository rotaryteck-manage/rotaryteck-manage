'use strict';

// v90.4: restore connected weekly bars, dynamic export columns and compact account header.
function weeklyRunKey904(entry){
 return [String(entry.color||'#cdebdc').toLowerCase(),String(entry.title||'').trim(),weeklyContent903(entry).trim()].join('\u0001');
}
function weeklyRuns904(row,start,end){
 const buckets=new Map();
 for(const entry of row.entries||[]){
  const left=entry.day<start?start:entry.day,right=entry.end_day>end?end:entry.end_day;if(left>right)continue;
  const key=weeklyRunKey904(entry),list=buckets.get(key)||[];list.push({entry,start:left,end:right});buckets.set(key,list);
 }
 const runs=[];
 for(const list of buckets.values()){
  list.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
  for(const part of list){const last=runs.findLast?.(run=>run.key===weeklyRunKey904(part.entry)&&part.start<=scheduleShift56(run.end,1));if(last){if(part.end>last.end)last.end=part.end;last.entries.push(part.entry)}else runs.push({key:weeklyRunKey904(part.entry),start:part.start,end:part.end,color:part.entry.color||'#cdebdc',title:part.entry.title||'',content:weeklyContent903(part.entry),entries:[part.entry]})}
 }
 runs.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)||a.title.localeCompare(b.title,'zh-Hant'));
 const laneEnds=[];for(const run of runs){let lane=laneEnds.findIndex(endDay=>endDay<run.start);if(lane<0)lane=laneEnds.length;laneEnds[lane]=run.end;run.lane=lane}
 return{runs,lanes:Math.max(1,laneEnds.length)};
}
function weeklyRunDialog904(name,run){
 weeklyCellDialog903(name,run.start+(run.end!==run.start?' 至 '+run.end:''),[...new Map(run.entries.map(entry=>[entry.id,entry])).values()]);
}
function weeklyOff904(day,index){return index>=5||Boolean(typeof holidayData60==='function'&&holidayData60(day)?.off)}
function scheduleWeeklyDecorate904(){
 for(const cell of document.querySelectorAll('[data-week-day904]')){const index=Number(cell.dataset.weekIndex904);cell.classList.toggle('is-off904',weeklyOff904(cell.dataset.weekDay904,index))}
}
function scheduleWeeklyDraw904(){
 const root=$('#schedule-content56');if(!root||scheduleTab56!=='weekly')return;
 const start=scheduleWeek56(scheduleAnchor56),fullEnd=scheduleShift56(start,6),count=weeklyVisibleDays903(start),end=scheduleShift56(start,count-1),days=Array.from({length:count},(_,i)=>scheduleShift56(start,i)),rows=scheduleWeeklyRows56(start),entries=scheduleData56.entries||[],notes=scheduleData56.weeklyNotes?.find(n=>n.week_start===start)?.body||'',prepared=rows.map(row=>({row,...weeklyRuns904(row,start,end)}));
 $('#schedule-period56').textContent=start+' 至 '+fullEnd;
 root.innerHTML='<details class="schedule-week weekly904" open><summary><strong>'+start+' 至 '+fullEnd+'</strong><span>'+entries.filter(e=>e.kind==='weekly'&&e.day<=fullEnd&&e.end_day>=start).length+' 項安排</span></summary><div class="weekly-scroll904 '+(count>5?'has-weekend904':'')+'"><div class="weekly-head-grid904" style="--week-days904:'+count+'"><div class="weekly-head904 weekly-name-head904">人員</div>'+days.map((day,i)=>'<div class="weekly-head904" data-week-day904="'+day+'" data-week-index904="'+i+'"><strong>'+['一','二','三','四','五','六','日'][i]+'｜'+day.slice(5).replace('-','/')+'</strong></div>').join('')+'</div><div class="weekly-body904">'+prepared.map((item,rowIndex)=>'<div class="weekly-person-row904" style="--week-days904:'+count+';--week-lanes904:'+item.lanes+'"><div class="weekly-person904" style="grid-row:1 / span '+item.lanes+'">'+scheduleEsc56(item.row.name)+'</div>'+days.map((day,i)=>'<div class="weekly-day-bg904" data-week-day904="'+day+'" data-week-index904="'+i+'" style="grid-column:'+(i+2)+';grid-row:1 / span '+item.lanes+'"></div>').join('')+item.runs.map((run,index)=>{const left=days.indexOf(run.start),right=days.indexOf(run.end);return '<button type="button" class="weekly-run904" data-week-row904="'+rowIndex+'" data-week-run904="'+index+'" style="--job-color:'+scheduleEsc56(run.color)+';grid-column:'+(left+2)+' / '+(right+3)+';grid-row:'+(run.lane+1)+'" title="'+scheduleEsc56(run.title+(run.content?' ('+run.content+')':''))+'"><strong>'+scheduleEsc56(run.title)+'</strong>'+(run.content?'<span>('+scheduleEsc56(run.content)+')</span>':'')+'</button>'}).join('')+'</div>').join('')+'</div></div>'+(notes?'<div class="weekly-note904"><strong>備註</strong><span>'+scheduleEsc56(notes)+'</span></div>':'')+'</details>';
 root.querySelectorAll('[data-week-run904]').forEach(button=>button.onclick=()=>{const item=prepared[Number(button.dataset.weekRow904)],run=item?.runs[Number(button.dataset.weekRun904)];if(run)weeklyRunDialog904(item.row.name,run)});scheduleWeeklyDecorate904();
}

const scheduleDrawBefore904=scheduleDraw56;
scheduleDraw56=function(){scheduleDrawBefore904();if(scheduleTab56==='weekly')scheduleWeeklyDraw904()};
const scheduleDecorateBefore904=scheduleDecorate60;
scheduleDecorate60=function(){scheduleDecorateBefore904();scheduleWeeklyDecorate904()};

schedulePlanCanvas56=function(start){
 const count=weeklyVisibleDays903(start),days=Array.from({length:count},(_,i)=>scheduleShift56(start,i)),end=days.at(-1),rows=scheduleWeeklyRows56(start),labelW=170,width=1549,dayW=(width-labelW)/count,scale=2,measure=document.createElement('canvas').getContext('2d');measure.font='bold 22px sans-serif';
 const prepared=rows.map(row=>({row,...weeklyRuns904(row,start,end)})),lineSets=prepared.map(item=>item.runs.map(run=>scheduleWrap56(measure,run.title+(run.content?' ('+run.content+')':''),Math.max(dayW-26,(days.indexOf(run.end)-days.indexOf(run.start)+1)*dayW-30)))),laneHeights=prepared.map((item,i)=>{const heights=[];item.runs.forEach((run,j)=>heights[run.lane]=Math.max(heights[run.lane]||0,24+lineSets[i][j].length*28));return heights.length?heights:[64]}),rowHeights=laneHeights.map(list=>Math.max(72,12+list.reduce((sum,h)=>sum+h+8,0))),note=scheduleData56.weeklyNotes?.find(n=>n.week_start===start)?.body||'',noteLines=note?scheduleWrap56(measure,note,width-220):[],noteHeight=noteLines.length?Math.max(78,28+noteLines.length*28):0,height=118+76+rowHeights.reduce((a,b)=>a+b,0)+noteHeight,canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.fillStyle='#234336';ctx.font='bold 32px sans-serif';ctx.fillText(typeof displayText44==='function'?displayText44('每週工作計畫表','schedule'):'每週工作計畫表',22,45);ctx.font='bold 21px sans-serif';ctx.fillText(start+' 至 '+end,22,82);ctx.strokeStyle='#cbd8cb';ctx.lineWidth=1;let y=118;
 const cell=(x,yy,w,h,bg)=>{ctx.fillStyle=bg;ctx.fillRect(x,yy,w,h);ctx.strokeRect(x+.5,yy+.5,w,h)};
 cell(0,y,labelW,76,'#e8eedf');ctx.fillStyle='#234336';ctx.font='bold 22px sans-serif';ctx.fillText('人員',20,y+45);days.forEach((day,n)=>{const x=labelW+n*dayW;cell(x,y,dayW,76,weeklyOff904(day,n)?'#fff0ee':'#e8eedf');ctx.fillStyle='#234336';ctx.font='bold 22px sans-serif';ctx.fillText(['一','二','三','四','五','六','日'][n]+'｜'+day.slice(5).replace('-','/'),x+10,y+45)});y+=76;
 prepared.forEach((item,i)=>{const h=rowHeights[i];cell(0,y,labelW,h,i%2?'#fff':'#f3f7ef');ctx.fillStyle='#234336';ctx.font='bold 22px sans-serif';ctx.fillText(item.row.name.slice(0,8),14,y+39);days.forEach((day,n)=>cell(labelW+n*dayW,y,dayW,h,weeklyOff904(day,n)?'#fff0ee':'#fff'));item.runs.forEach((run,j)=>{const left=days.indexOf(run.start),right=days.indexOf(run.end),yy=y+6+laneHeights[i].slice(0,run.lane).reduce((sum,value)=>sum+value+8,0),rh=Math.max(58,laneHeights[i][run.lane]),x=labelW+left*dayW+3,w=(right-left+1)*dayW-6;ctx.fillStyle=run.color;ctx.fillRect(x,yy,w,rh);ctx.strokeStyle='#23433655';ctx.strokeRect(x+.5,yy+.5,w-1,rh-1);ctx.fillStyle=scheduleInk56(run.color);ctx.font='bold 22px sans-serif';lineSets[i][j].forEach((line,k)=>ctx.fillText(line,x+11,yy+29+k*28))});y+=h});
 if(noteLines.length){cell(0,y,labelW,noteHeight,'#fff5e8');ctx.fillStyle='#673d16';ctx.font='bold 22px sans-serif';ctx.fillText('備註',17,y+41);cell(labelW,y,width-labelW,noteHeight,'#fff5e8');ctx.font='bold 21px sans-serif';noteLines.forEach((line,i)=>ctx.fillText(line,labelW+14,y+36+i*28))}return canvas;
};

function accountCleanup904(){
 document.querySelectorAll('#edit-site,.header-actions>.admin-back-button').forEach(element=>element.remove());
 document.querySelector('.header')?.classList.add('header-account904');
}
const accountObserver904=new MutationObserver(()=>queueMicrotask(accountCleanup904));accountObserver904.observe(document.body,{childList:true,subtree:true});accountCleanup904();

// Re-evaluate the original completed-row rule from the values currently visible in edit mode.
warehouseRows72=function(){
 const p=project(),table=$('#warehouse-dialog .editable-bom');if(!p||!table)return;
 if(!table.querySelector('[data-date-heading72]')){for(const title of ['收料時間','領料時間']){const th=document.createElement('th');th.dataset.dateHeading72='';th.textContent=title;table.tHead.rows[0].append(th)}for(const row of table.querySelectorAll('tbody tr[data-item]')){const item=p.parts.find(i=>i.id===row.dataset.item);if(!item)continue;for(const [field,title]of [['receivedDate72','收料時間'],['issuedDate72','領料時間']]){const td=document.createElement('td');td.className='warehouse-date-cell72';const text=item[field]?item[field].replaceAll('-','/'):'－';if(canDo(field==='receivedDate72'?'warehouse.receivedDate':'warehouse.issuedDate')){const button=document.createElement('button');button.type='button';button.className='warehouse-date72';button.dataset.dateField72=field;button.textContent=text;button.setAttribute('aria-label',item.name+' '+title+' '+text);button.onclick=()=>warehouseDateDialog72(p.id,item.id,field,title);td.append(button)}else td.textContent=text;row.append(td)}}}
 let ready=0,waiting=0;for(const row of table.querySelectorAll('tbody tr[data-item]')){const i=p.parts.find(item=>item.id===row.dataset.item);if(!i)continue;const value=(name,fallback)=>{const input=row.querySelector('[name="'+name+':'+CSS.escape(i.id)+'"]');return input?Number(input.value):Number(fallback)},prepared=value('prepared73',preparedQuantity(p,i)),stock=value('stock73',inStock(p,i.id)),need=value('need',i.need),sets=value('sets',i.sets??1),complete=prepared>=need*sets&&stock>=prepared;if(row.hidden)continue;const index=complete?ready++:waiting++;row.dataset.ready72=complete?'yes':'no';row.dataset.stripe72=String(index%2)}
}

window.addEventListener('load',accountCleanup904);
