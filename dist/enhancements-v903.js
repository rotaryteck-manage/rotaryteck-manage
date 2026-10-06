'use strict';

// v90.3: final notification wording, compact horizontal weekly grid and export readability.
function notificationRuleTiming903(rule){
 const time=String(rule.time||'09:00');
 if(rule.type==='material')return '新增後立即發送';
 if(rule.type==='leave')return '新請假登記、異動或取消後立即發送';
 if(rule.type==='closure')return '官方公告確認後立即發送（每 5 分鐘檢查）';
 if(rule.type==='holiday')return '放假前一天 '+time;
 if(['work','report','report-check'].includes(rule.type))return '每日 '+time;
 if(rule.type==='wire'||rule.type==='plating')return '每日檢查 · '+time+(Number(rule.repeatDays)>0?' · 每 '+Number(rule.repeatDays)+' 天重複':'');
 return (rule.startDate?rule.startDate+' · ':'')+time+(Number(rule.repeatDays)>0?' · 每 '+Number(rule.repeatDays)+' 天':'');
}
const renderNotificationRulesBefore903=renderNotificationRules81;
renderNotificationRules81=function(){
 renderNotificationRulesBefore903();
 for(const row of document.querySelectorAll('[data-rule-type88]')){
  const rule=(state.notificationRules||[]).find(item=>String(item.type)===row.dataset.ruleType88&&String(item.id)===String(row.querySelector('[data-notification-edit81]')?.dataset.notificationEdit81));
  const small=row.querySelector('small');if(rule&&small)small.textContent=(notificationTypeNames88[rule.type]||rule.type)+' · '+notificationRuleTiming903(rule);
 }
};

function notificationPreviewValues903(type,mode,actual){
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),tomorrow=scheduleShift56(today,1),values={...(actual?.values||{})};
 if(type==='holiday'&&mode==='simulated')Object.assign(values,{假日名稱:'模擬國定假日',假日日期:tomorrow,日期:tomorrow});
 if(type==='closure'&&mode!=='actual')Object.assign(values,{縣市:'高雄市',行政區:'左營區',停班日期:tomorrow,日期:tomorrow,停班狀態:mode==='resumed'?'恢復上班':'停止上班',公告時間:'官方公告確認後'});
 if(type==='report-check'&&mode!=='actual'){
  const examples={all:{完成數:5,總人數:5,核對結果:'全員皆已完成工作回報。'},partial:{完成數:3,總人數:5,核對結果:'王小明：尚未回報「105、M60」\n陳小華：尚未回報「SJ7195-25」'},none:{完成數:0,總人數:5,核對結果:'王小明：尚未回報「105、M60」\n陳小華：尚未回報「SJ7195-25」\n林小美：尚未回報「70-40」\n張大同：尚未回報「99-24」\n李小安：尚未回報「105環片」'},text:{完成數:4,總人數:5,核對結果:'王小明：尚未回報「105、M60」'},photo:{完成數:4,總人數:5,核對結果:'陳小華：尚未回報「SJ7195-25」'}};
  Object.assign(values,examples[mode]||examples.partial,{日期:today});
 }
 return values;
}
notificationRulePreview89=async function(id){
 const rule=(state.notificationRules||[]).find(item=>String(item.id)===String(id));if(!rule)return toast('找不到這筆通知規則');
 try{
  const actual=await notificationPreviewData90(rule.type,true),special=['holiday','closure','report-check'].includes(rule.type),modes=rule.type==='holiday'?[['actual','目前官方資料'],['simulated','模擬有國定假日']]:rule.type==='closure'?[['actual','目前官方狀態'],['closed','模擬停止上班'],['resumed','模擬恢復上班']]:rule.type==='report-check'?[['actual','今日實際資料'],['all','模擬全員完成'],['partial','模擬部分未完成'],['none','模擬全員未完成'],['text','模擬只有文字、沒有照片'],['photo','模擬只有照片、沒有文字']]:[['actual','目前資料']];
  modal('通知發送預覽','<div class="notification-preview-dialog89">'+(special?'<label class="field">預覽情境<select data-preview-mode903>'+modes.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('')+'</select></label>':'')+'<aside class="notification-phone88"><small>擎正科技</small><strong data-preview-title903></strong><p data-preview-message903></p><span data-preview-target903></span></aside><p class="muted" data-preview-note903></p><button type="button" data-preview-self903>發送這個預覽給自己</button></div>',null);
  const modeInput=$('[data-preview-mode903]'),render=()=>{const mode=modeInput?.value||'actual',simulated=mode!=='actual',values=notificationPreviewValues903(rule.type,mode,actual),available=simulated||actual.available,title=notificationExample89(rule.title||'通知標題',rule.type,rule.name,values),message=available?notificationExample89(rule.message||'通知內容',rule.type,rule.name,values):actual.note,targetDate=values.假日日期||values.停班日期||actual.targetDate,targetUrl=targetDate&&['work','report','report-check','holiday','closure'].includes(rule.type)?'/?notificationDay='+encodeURIComponent(targetDate)+'&notificationSection=jobs#schedule':notificationRuleTargetUrl89(rule.target);$('[data-preview-title903]').textContent=title;$('[data-preview-message903]').textContent=message;$('[data-preview-target903]').textContent='點擊後：'+notificationTargetLabel88(targetUrl);$('[data-preview-note903]').textContent=simulated?'這是測試預覽，只會發給你，不會改變正式通知、回報資料或發送紀錄。':actual.note;$('[data-preview-self903]').disabled=!available;return{title,message,targetUrl}};
  modeInput?.addEventListener('change',render);render();
  $('[data-preview-self903]').onclick=async()=>{try{if(!await confirmAction('確定發送這則測試預覽？測試不會寫入正式鈴鐺，但會使用通知發送額度。'))return;const payload=render(),employeeId=Number(currentUser.id);if(!employeeId)throw Error('找不到目前登入人員');payload.title='測試預覽｜'+payload.title;if(['wire','plating'].includes(rule.type)){const link=new URL(payload.targetUrl,location.href);link.searchParams.set('notificationRule945',rule.id);link.searchParams.set('notificationType945',rule.type);payload.targetUrl=link.pathname+link.search+link.hash;}const response=await apiFetch('/api/push-test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId,confirmed:true,source:'rule-simulation-preview',...payload})}),data=await response.json();if(!response.ok)throw Error(data.error||'預覽發送失敗');toast('測試預覽已發送到你的 '+data.sent+' 台裝置')}catch(error){toast(error.message||'預覽發送失敗')}};
 }catch(error){toast(error.message||'無法產生預覽')}
};

const notificationRuleDialogBefore903=notificationRuleDialog81;
notificationRuleDialog81=async function(id=''){
 await notificationRuleDialogBefore903(id);const form=$('#dialog-form');if(!form?.elements?.type)return;
 const sync=()=>{const type=form.elements.type.value;if(type==='holiday'&&(!id||form.elements.time.value==='17:00'))form.elements.time.value='18:00';const start=form.querySelector('[data-start88]'),time=form.querySelector('[data-time88]');if(start)start.hidden=type!=='custom';if(time)time.hidden=type==='material'||type==='closure'||type==='leave'};
 form.elements.type.addEventListener('change',()=>queueMicrotask(sync));sync();
};

let notificationUpgradeRunning903=false;
async function ensureNotificationDefaults903(){
 if((typeof canAdmin75==='function'&&!canAdmin75())||state.notificationVersion903===1||notificationUpgradeRunning903)return;notificationUpgradeRunning903=true;let changed=false;
 for(const rule of state.notificationRules||[])if(rule.type==='holiday'&&(!rule.time||rule.time==='17:00')){rule.time='18:00';rule.updatedAt=new Date().toISOString();changed=true}
 state.notificationVersion903=1;try{await saveCloud(state)}finally{notificationUpgradeRunning903=false}
}

function accountCleanup903(){document.querySelector('.header-actions #edit-site')?.remove()}
new MutationObserver(accountCleanup903).observe(document.body,{childList:true,subtree:true});
accountCleanup903();

drawPalette73=function(input,host){
 host.replaceChildren();if(!palette73)return;const slots=document.createElement('div');slots.className='palette-slots73';host.append(slots);
 palette73.colors.forEach((color,index)=>{const button=document.createElement('button');let lastTap=0;button.type='button';button.style.backgroundColor=color;button.setAttribute('aria-label','常用色 '+(index+1));button.title='常用色 '+(index+1)+(canDo('schedule.palette')?'：點一下套用，快速點兩下設定':'：點一下套用');button.classList.toggle('selected',input.value.toLowerCase()===color);const apply=()=>{input.value=color;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));slots.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===button))};button.onclick=apply;if(canDo('schedule.palette')){button.ondblclick=event=>{event.preventDefault();paletteEditor73(index,input,host)};button.addEventListener('touchend',event=>{const now=Date.now();if(now-lastTap<450){event.preventDefault();lastTap=0;paletteEditor73(index,input,host)}else{lastTap=now;apply()}},{passive:false})}slots.append(button)});
 if(canDo('schedule.palette')){const button=document.createElement('button');button.type='button';button.className='palette-settings73';button.textContent='設定常用色';button.onclick=()=>paletteEditor73(0,input,host);host.append(button)}
};
function enhanceTaskPalette903(){for(const input of document.querySelectorAll('#modal input[type=color][name^="color-"]')){if(input.dataset.palette73)continue;input.dataset.palette73='1';input.classList.add('palette-source73');const host=document.createElement('div');host.className='palette73';host.textContent='正在載入常用色…';input.after(host);loadPalette73().then(()=>{if(input.isConnected)drawPalette73(input,host)}).catch(error=>{host.textContent=error.message;input.classList.remove('palette-source73')})}}
new MutationObserver(enhanceTaskPalette903).observe(document.body,{childList:true,subtree:true});

function weeklyVisibleDays903(start){
 const entries=(scheduleData56.entries||[]).filter(e=>e.kind==='weekly'&&e.day<=scheduleShift56(start,6)&&e.end_day>=start),on=n=>entries.some(e=>e.day<=scheduleShift56(start,n)&&e.end_day>=scheduleShift56(start,n));
 return on(6)?7:on(5)?6:5;
}
function weeklyEntriesOn903(row,day){return row.entries.filter(e=>e.day<=day&&e.end_day>=day)}
function weeklyContent903(entry){return scheduleContents60(entry)[0]||''}
function weeklyCellDialog903(name,day,items){
 modal(name+' · '+day,'<div class="weekly-detail903">'+items.map(entry=>'<article style="--job-color:'+scheduleEsc56(entry.color||'#cdebdc')+'"><strong>'+scheduleEsc56(entry.title)+'</strong><p>'+scheduleEsc56(weeklyContent903(entry)||'未填寫工作內容')+'</p><small>'+scheduleEsc56(scheduleAssignees56(entry).join('、'))+'</small>'+(scheduleCan56('weekly')?'<div><button type="button" data-week-edit903="'+scheduleEsc56(entry.id)+'">編輯</button><button type="button" class="danger-button" data-week-delete903="'+scheduleEsc56(entry.id)+'">刪除</button></div>':'')+'</article>').join('')+'</div>',null);
 document.querySelectorAll('[data-week-edit903]').forEach(button=>button.onclick=()=>scheduleEntryDialog56(items.find(entry=>entry.id===button.dataset.weekEdit903)));
 document.querySelectorAll('[data-week-delete903]').forEach(button=>button.onclick=()=>scheduleDeleteEntries70([button.dataset.weekDelete903]));
}
function scheduleWeeklyDecorate903(){
 for(const head of document.querySelectorAll('[data-week-day903]')){const day=head.dataset.weekDay903,index=Number(head.dataset.weekIndex903),holiday=typeof holidayData60==='function'?holidayData60(day):null;head.classList.toggle('schedule-holiday60',Boolean(holiday?.off)||index>=5);const label=head.querySelector('.holiday-label60'),name=typeof holidayName60==='function'?holidayName60(day):'';if(label)label.textContent=name}
}
function scheduleWeeklyDraw903(){
 const root=$('#schedule-content56');if(!root||scheduleTab56!=='weekly')return;const start=scheduleWeek56(scheduleAnchor56),end=scheduleShift56(start,6),count=weeklyVisibleDays903(start),days=Array.from({length:count},(_,i)=>scheduleShift56(start,i)),rows=scheduleWeeklyRows56(start),entries=scheduleData56.entries||[],notes=scheduleData56.weeklyNotes?.find(n=>n.week_start===start)?.body||'';
 $('#schedule-period56').textContent=start+' 至 '+end;
 root.innerHTML='<details class="schedule-week weekly903" open><summary><strong>'+start+' 至 '+end+'</strong><span>'+entries.filter(e=>e.kind==='weekly'&&e.day<=end&&e.end_day>=start).length+' 項安排</span></summary><div class="weekly-scroll903 '+(count>5?'has-weekend903':'')+'"><div class="weekly-grid903" style="--week-days903:'+count+'"><div class="weekly-head903 weekly-person903">人員</div>'+days.map((day,i)=>'<div class="weekly-head903" data-week-day903="'+day+'" data-week-index903="'+i+'"><strong>'+['一','二','三','四','五','六','日'][i]+'｜'+day.slice(5).replace('-','/')+'</strong><small class="holiday-label60"></small></div>').join('')+rows.map(row=>'<div class="weekly-person903">'+scheduleEsc56(row.name)+'</div>'+days.map(day=>{const items=weeklyEntriesOn903(row,day);return '<div class="weekly-cell903 '+(items.length?'has-jobs903':'')+'" data-week-person903="'+scheduleEsc56(row.name)+'" data-week-date903="'+day+'">'+items.map(entry=>'<button type="button" class="weekly-job903" data-week-job903="'+scheduleEsc56(entry.id)+'" style="--job-color:'+scheduleEsc56(entry.color||'#cdebdc')+'" title="'+scheduleEsc56(entry.title+' '+weeklyContent903(entry))+'"><strong>'+scheduleEsc56(entry.title)+'</strong><span>'+scheduleEsc56(weeklyContent903(entry))+'</span></button>').join('')+(items.length>2?'<button type="button" class="weekly-more903">＋'+(items.length-2)+'</button>':'')+'</div>'}).join('')).join('')+'</div></div>'+(notes?'<div class="weekly-note903"><strong>備註</strong><span>'+scheduleEsc56(notes)+'</span></div>':'')+'</details>';
 root.querySelectorAll('.weekly-cell903.has-jobs903').forEach(cell=>cell.onclick=event=>{event.preventDefault();const row=rows.find(item=>item.name===cell.dataset.weekPerson903),items=weeklyEntriesOn903(row,cell.dataset.weekDate903);weeklyCellDialog903(row.name,cell.dataset.weekDate903,items)});scheduleWeeklyDecorate903();
}
const scheduleDrawBefore903=scheduleDraw56;
scheduleDraw56=function(){scheduleDrawBefore903();if(scheduleTab56==='weekly')scheduleWeeklyDraw903()};
const scheduleDecorateBefore903=scheduleDecorate60;
scheduleDecorate60=function(){scheduleDecorateBefore903();scheduleWeeklyDecorate903()};

schedulePlanCanvas56=function(start){
 const days=scheduleWeekDays56(start),rows=scheduleWeeklyRows56(start),entries=scheduleData56.entries||[],specials=days.map(day=>[...entries.filter(e=>e.kind==='special'&&e.day<=day&&e.end_day>=day).map(e=>e.title),...(typeof holidayName60==='function'&&holidayName60(day)?[holidayName60(day)]:[])]),labelW=170,dayW=197,width=labelW+dayW*7,scale=2,measure=document.createElement('canvas').getContext('2d');measure.font='bold 20px sans-serif';
 const groups=rows.map(row=>scheduleGroups69(row,start,days[6])),lines=groups.map(list=>list.map(group=>{const left=days.findIndex(day=>day>=group.start),right=days.findLastIndex(day=>day<=group.end),textWidth=Math.max(dayW-28,(right-left+1)*dayW-34);return group.entries.map(entry=>scheduleWrap56(measure,scheduleJobLabel64(entry,group),textWidth))})),groupHeights=lines.map(list=>list.map(parts=>Math.max(64,16+parts.reduce((n,line)=>n+line.length*28+8,0)))),lanes=groups.map(scheduleLanes70),laneHeights=groupHeights.map((list,i)=>{const out=[];list.forEach((h,j)=>out[lanes[i][j]]=Math.max(out[lanes[i][j]]||0,h));return out}),heights=laneHeights.map(list=>Math.max(72,12+list.reduce((a,b)=>a+b+8,0))),note=scheduleData56.weeklyNotes?.find(n=>n.week_start===start)?.body||'',noteLines=note?scheduleWrap56(measure,note,width-220):[],noteHeight=noteLines.length?Math.max(78,28+noteLines.length*28):0,height=118+82+heights.reduce((a,b)=>a+b,0)+34+noteHeight,canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.fillStyle='#234336';ctx.font='bold 30px sans-serif';ctx.fillText(typeof displayText44==='function'?displayText44('每週工作計畫表','schedule'):'每週工作計畫表',22,45);ctx.font='bold 20px sans-serif';ctx.fillText(start+' 至 '+days[6],22,82);let y=118;ctx.strokeStyle='#cbd8cb';ctx.lineWidth=1;function cell(x,yy,w,h,bg){ctx.fillStyle=bg;ctx.fillRect(x,yy,w,h);ctx.strokeRect(x+.5,yy+.5,w,h)}function off(day,n){return n>=5||(typeof holidayData60==='function'&&holidayData60(day)?.off)}cell(0,y,labelW,82,'#e8eedf');ctx.fillStyle='#234336';ctx.font='bold 22px sans-serif';ctx.fillText('人員',20,y+47);days.forEach((day,n)=>{const x=labelW+n*dayW;cell(x,y,dayW,82,off(day,n)?'#fff0ee':'#e8eedf');ctx.fillStyle='#234336';ctx.font='bold 20px sans-serif';ctx.fillText(['一','二','三','四','五','六','日'][n]+'｜'+day.slice(5).replace('-','/'),x+10,y+31);if(specials[n].length){ctx.font='bold 15px sans-serif';ctx.fillStyle='#a85a08';ctx.fillText(specials[n].join('、').slice(0,15),x+10,y+61)}});y+=82;
 rows.forEach((row,i)=>{const h=heights[i];cell(0,y,labelW,h,i%2?'#fff':'#f3f7ef');ctx.font='bold 22px sans-serif';ctx.fillStyle='#234336';ctx.fillText(row.name.slice(0,8),15,y+40);days.forEach((day,n)=>cell(labelW+n*dayW,y,dayW,h,off(day,n)?'#fff0ee':'#fff'));groups[i].forEach((group,j)=>{const yy=y+6+laneHeights[i].slice(0,lanes[i][j]).reduce((sum,h)=>sum+h+8,0),left=days.findIndex(day=>day>=group.start),right=days.findLastIndex(day=>day<=group.end),gh=groupHeights[i][j];if(left>=0&&right>=left){const x=labelW+left*dayW+3,w=(right-left+1)*dayW-6;ctx.fillStyle=group.color;ctx.fillRect(x,yy,w,gh);ctx.fillStyle=scheduleInk56(group.color);ctx.font='bold 20px sans-serif';let textY=yy+28;for(const parts of lines[i][j]){for(const part of parts){ctx.fillText(part,x+12,textY);textY+=28}textY+=8}}});y+=h});if(noteLines.length){cell(0,y,labelW,noteHeight,'#fff5e8');ctx.fillStyle='#673d16';ctx.font='bold 22px sans-serif';ctx.fillText('備註',17,y+41);cell(labelW,y,width-labelW,noteHeight,'#fff5e8');ctx.font='bold 20px sans-serif';noteLines.forEach((line,i)=>ctx.fillText(line,labelW+14,y+36+i*28))}return canvas;
};

window.addEventListener('load',()=>{ensureNotificationDefaults903();accountCleanup903()});
