// Pure planner: clock, event eligibility and stable dedupe identifiers are testable without sending pushes.
export function notificationClock85(now=Date.now()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
 return{day:parts.year+'-'+parts.month+'-'+parts.day,time:parts.hour+':'+parts.minute};
}
function notificationSignature92(values){
 let hash=2166136261;
 for(const character of values.join('|')){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619)}
 return (hash>>>0).toString(36);
}
export function notificationRulesValid85(rules){
 if(!Array.isArray(rules)||rules.length>100)throw Error('通知規則最多100項');const ids=new Set();
 if(rules.filter(r=>r?.type==='leave').length>1)throw Error('假別通知只能設定一項');
 for(const r of rules.filter(r=>r?.type==='leave')){
  if(r.recipientMode!=='auto'||r.target!=='leave-record'||r.recipientIds?.length)throw Error('假別通知固定發給當事人及主管，並前往該筆紀錄');
 }
 for(const r of rules){if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!['work','report','wire','plating','material','custom','holiday','closure','leave'].includes(r.type)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.time)||typeof r.enabled!=='boolean'||!['auto','selected'].includes(r.recipientMode)||!Array.isArray(r.recipientIds)||r.recipientIds.some(id=>!/^\d+$/.test(String(id)))||r.recipientMode==='selected'&&!r.recipientIds.length||['wire','plating','custom'].includes(r.type)&&r.recipientMode!=='selected'||!Number.isInteger(r.firstDays)||r.firstDays<0||r.firstDays>365||!Number.isInteger(r.repeatDays)||r.repeatDays<0||r.repeatDays>365||!['work-record','work-report','wire-restock','plating-record','plating-overview','plating-pending','material-record','leave-record','schedule','warehouse','home'].includes(r.target))throw Error('通知規則格式不正確');if(r.type==='custom'&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.startDate||'')||Number.isNaN(Date.parse(r.startDate))))throw Error('自訂提醒日期不正確');if(r.type==='closure'&&([r.city===undefined?'高雄市':r.city,r.district===undefined?'左營區':r.district].some(x=>typeof x!=='string'||!x.trim()||x.length>30)))throw Error('停班地區不正確');if(r.type==='material'&&r.materialCategories!==undefined&&(!Array.isArray(r.materialCategories)||!r.materialCategories.length||r.materialCategories.some(x=>!['收料','出貨','送貨'].includes(x))))throw Error('料件通知類型不正確');if(r.category!==undefined&&(typeof r.category!=='string'||!r.category.trim()||r.category.length>30))throw Error('通知分類不正確');for(const [key,max]of [['name',60],['title',100],['message',500]])if(typeof r[key]!=='string'||!r[key].trim()||r[key].length>max)throw Error('通知文字不完整');ids.add(r.id);}
}
// Stored rules are validated independently at run time. A malformed legacy rule
// is reported and skipped, but must not stop unrelated scheduled notifications.
export function notificationValidRules103(rules,onInvalid=()=>{}){
 const valid=[],ids=new Set(),leave=false;
 for(const rule of Array.isArray(rules)?rules:[]){
  try{
   if(ids.has(rule?.id))throw Error('通知規則編號重複');
   if(rule?.type==='leave'&&leave)throw Error('假別通知只能設定一項');
   notificationRulesValid85([rule]);ids.add(rule.id);if(rule.type==='leave')leave=true;valid.push(rule);
  }catch(error){onInvalid(rule,error)}
 }
 return valid;
}
export function notificationPlan85(rules,state,entries,reports,people,now=Date.now()){
 const {day,time}=notificationClock85(now),plans=[];const age=date=>Math.floor((Date.parse(day)-Date.parse(String(date||'').slice(0,10)))/86400000);
 for(const rule of rules||[]){
  if(!rule.enabled||time<rule.time)continue;
  const chosen=new Set((rule.recipientIds||[]).map(String));
  for(const person of people){
   if(person.enabled===0||rule.recipientMode==='selected'&&!chosen.has(String(person.id)))continue;
   let events=[];
   if(rule.type==='work'||rule.type==='report'){
    events=entries.filter(e=>{let ids=[];try{ids=JSON.parse(e.assignee_ids||'[]')}catch{}return e.kind==='daily'&&e.day<=day&&(e.end_day||e.day)>=day&&ids.map(String).includes(String(person.id))&&(rule.type!=='report'||!reports.some(r=>r.entry_id===e.id&&r.author_id===String(person.id)))}).map(e=>{let contents=[];try{contents=JSON.parse(e.category||'[]')}catch{}return{id:day+':'+e.id,title:e.title,content:Array.isArray(contents)?contents.join('、'):'',days:0}});
   }else if(rule.type==='wire'){
    events=(state.wireReels||[]).filter(r=>r.status==='low'&&!r.restock?.ordered&&!r.restock?.received).map(r=>({id:r.id+':'+(r.restock?.id||''),date:r.restock?.reported?.time,title:(state.wireTypes||[]).find(t=>t.id===r.wireId)?.name||'',days:age(r.restock?.reported?.time)}));
   }else if(rule.type==='plating'){
    events=(state.platingProjects||[]).filter(p=>!p.archived).flatMap(p=>(p.shipments||[]).filter(s=>s.sent&&!s.returned).map(s=>({id:p.id+':'+s.id,date:s.sent,project:p.name,title:s.note||('第'+s.number+'次送鍍'),days:age(s.sent)})));
   }else if(rule.type==='custom'){
    const elapsed=Math.floor((Date.parse(day)-Date.parse(rule.startDate))/86400000);if(elapsed>=0&&(rule.repeatDays>0?elapsed%rule.repeatDays===0:elapsed===0))events=[{id:day,title:rule.name,days:elapsed}];
   }else if(['material','holiday','closure'].includes(rule.type))continue;
   if(['wire','plating'].includes(rule.type))events=events.filter(e=>{
    if(!Number.isFinite(e.days)||e.days<(rule.firstDays||0))return false;
    return !rule.repeatDays||((e.days-(rule.firstDays||0))%rule.repeatDays===0);
   });
   if(!events.length)continue;
   const summarized=['work','report'].includes(rule.type);
   const signature=notificationSignature92(events.map(event=>event.id+':'+(rule.repeatDays?Math.floor((event.days-(rule.firstDays||0))/rule.repeatDays):0)).sort());
   const plannedEvents=summarized?[{id:rule.type+':'+day,legacySignature:signature,title:events.map(e=>e.title).filter(Boolean).join('、'),content:events.map(e=>e.content).filter(Boolean).join('、'),project:[...new Set(events.map(e=>e.project).filter(Boolean))].join('、'),days:0}]:events;
   for(const event of plannedEvents){
    // Scheduled wire/plating reminders are identified by the record and local day.
    // Editing its date/content or moving the rule time must never create a second
    // automatic notification on the same day. A zero repeat interval stays once-only.
    const period=['work','report'].includes(rule.type)?day:['wire','plating'].includes(rule.type)?(rule.repeatDays?day:'once'):rule.repeatDays?Math.floor((event.days-(rule.firstDays||0))/rule.repeatDays):0;
    const listed=summarized?events:[event],workList=listed.map(e=>e.title+(e.content?'（'+e.content+'）':'')).join('、');const replace=text=>String(text||'').replaceAll('{數量}',String(listed.length)).replaceAll('{日期}',day).replaceAll('{通知名稱}',rule.name||'').replaceAll('{案件名稱}',event.project||'').replaceAll('{料件名稱}',event.title||'').replaceAll('{線材名稱}',rule.type==='wire'?event.title||'':'').replaceAll('{電鍍內容}',rule.type==='plating'?event.title||'':'').replaceAll('{工作名稱}',event.title||'').replaceAll('{工作內容}',event.content||'').replaceAll('{工作清單}',workList).replaceAll('{人員}',person.name).replaceAll('{逾期天數}',String(event.days));
    const targetUrl=rule.target==='work-record'||rule.target==='work-report'?'/?notificationDay='+encodeURIComponent(day)+'&notificationSection=jobs#schedule':rule.target==='wire-restock'?'/?notificationSection=restock&notificationWireCriteria='+encodeURIComponent(JSON.stringify({day,firstDays:rule.firstDays||0,repeatDays:rule.repeatDays||0}))+'#wire':rule.target==='plating-record'?'/?notificationPlatingProject='+encodeURIComponent(String(event.id||'').split(':')[0])+'&notificationPlatingShipment='+encodeURIComponent(String(event.id||'').split(':')[1]||'')+'#plating':rule.target==='plating-overview'?'/?notificationPlatingOverview=all#plating':rule.target==='plating-pending'?'/?notificationPlatingOverview=pending#plating':({'schedule':'/#schedule','warehouse':'/#warehouse','home':'/'})[rule.target]||'/';
    const legacyDedupePattern=['work','report'].includes(rule.type)?'auto:'+rule.id+':'+person.id+':'+rule.type+':'+day+':%:%':(['wire','plating'].includes(rule.type)?'auto:'+rule.id+':'+person.id+':'+rule.type+':%:'+event.legacySignature+':'+period+':%':'');
    plans.push({...(rule.type==='wire'?{wireCriteria944:{day,firstDays:rule.firstDays||0,repeatDays:rule.repeatDays||0},wireRound944:event.id,wireTemplate944:rule.message.includes('{數量}')?replace(rule.message.replaceAll('{數量}','__WIRE_COUNT944__')):'線材補貨區有 __WIRE_COUNT944__ 筆尚未訂購，請安排訂購。'}:{}),ruleId:rule.id,employeeId:person.id,notificationType:rule.type,category:rule.category||(rule.type==='work'?'工作排程':rule.type==='report'?'工作回報':rule.type==='wire'?'線材提醒':rule.type==='plating'?'電鍍提醒':'自訂提醒'),title:replace(rule.title),message:replace(rule.message),targetUrl:notificationContext945(targetUrl,rule,event.id,{day,firstDays:rule.firstDays||0,repeatDays:rule.repeatDays||0}),dedupeKey:'auto:'+rule.id+':'+person.id+':'+event.id+':'+period,legacyDedupePattern,eventCount:listed.length});
   }
  }
 }
 const priority={work:1,report:2,holiday:3,closure:3,material:4,wire:5,plating:5,custom:6};
 return plans.sort((a,b)=>(priority[a.notificationType]||9)-(priority[b.notificationType]||9)||String(a.employeeId).localeCompare(String(b.employeeId)));
}

// Preserve per-record receipts while formatting each delivered batch only once.
export function notificationBatchContent944(plans){
 const first=plans[0];if(first?.notificationType!=='wire')return {message:plans.map(p=>p.message).join('\n')};
 const rounds=[...new Set(plans.map(p=>p.wireRound944).filter(Boolean))];
 return {message:(first.wireTemplate944||'線材補貨區有 __WIRE_COUNT944__ 筆尚未訂購，請安排訂購。').replaceAll('__WIRE_COUNT944__',String(rounds.length)),eventCount:rounds.length,targetUrl:first.targetUrl||('/?notificationSection=restock&notificationWireCriteria='+encodeURIComponent(JSON.stringify(first.wireCriteria944))+'#wire')};
}

// Keep immutable notification identity separately from its configurable destination.
export function notificationContext945(value,rule,event='',criteria=null){
 if(!['wire','plating'].includes(rule.type))return value;
 const url=new URL(value,'https://notification.local');
 url.searchParams.set('notificationRule945',rule.id);
 url.searchParams.set('notificationType945',rule.type);
 if(rule.type==='plating'&&event)url.searchParams.set('notificationEvent945',event);
 if(rule.type==='wire'&&criteria)url.searchParams.set('notificationWireCriteria',JSON.stringify(criteria));
 return url.pathname+url.search+url.hash;
}
export function notificationTarget945(rules,value,context={}){
 const url=new URL(value,'https://notification.local'),q=url.searchParams;
 if(url.origin!=='https://notification.local')throw Error('通知連結不正確');
 let ruleId=context.ruleId||q.get('notificationRule945')||'';
 const source=context.sourceKey||'';
 if(!ruleId&&source){const matches=rules.filter(r=>['auto:','batch:','manual-catchup:'].some(prefix=>source.startsWith(prefix+r.id+':')));if(matches.length===1)ruleId=matches[0].id;}
 let rule=rules.find(r=>r.id===ruleId);
 const type=rule?.type||(['wire','plating'].includes(context.type)?context.type:'')||q.get('notificationType945')||(q.has('notificationWire')||q.get('notificationSection')==='restock'||url.hash==='#wire'?'wire':q.has('notificationPlatingProject')||q.has('notificationPlatingOverview')||url.hash==='#plating'?'plating':'');
 const scoped=['wire','plating'].includes(type);
 let notice='';
 if(!rule&&!ruleId&&scoped){const candidates=rules.filter(r=>r.type===type);if(candidates.length===1)rule=candidates[0];else if(candidates.length>1)notice='這則舊通知無法辨識原通知規則，已開啟該區總覽。';}
 let event=q.get('notificationEvent945')||'';
 if(!event&&rule&&source.startsWith('auto:'+rule.id+':')){
  const pieces=source.slice(('auto:'+rule.id+':').length).split(':');
  // employee, project, shipment, period (subscription suffix is removed by API)
  if(pieces.length===4&&type==='plating')event=pieces[1]+':'+pieces[2];
 }
 const project=q.get('notificationPlatingProject')||event.split(':')[0]||'',shipment=q.get('notificationPlatingShipment')||event.split(':')[1]||'';
 const criteria=q.get('notificationWireCriteria'),wire=q.get('notificationWire'),day=q.get('notificationDay');
 for(const key of [...q.keys()])if(/^notification(?:Rule945|Type945|Event945|Inbox945|Tag945|Resolve945)$/.test(key))q.delete(key);
 if(!scoped)return {targetUrl:url.pathname+url.search+url.hash,notice};
 const target=rule?.target||(notice?(type==='plating'?'plating-overview':'wire-restock'):null);
 if(target){
  for(const key of [...q.keys()])if(key.startsWith('notification'))q.delete(key);
  if(target==='plating-record'){
   url.hash='#plating';
   if(project&&shipment){q.set('notificationPlatingProject',project);q.set('notificationPlatingShipment',shipment);}
   else{q.set('notificationPlatingOverview','all');notice='這則通知沒有指定紀錄資訊，已開啟電鍍總覽。';}
  }else if(target==='plating-overview'||target==='plating-pending'){url.hash='#plating';q.set('notificationPlatingOverview',target==='plating-pending'?'pending':'all');}
  else if(target==='wire-restock'){url.hash='#wire';q.set('notificationSection','restock');if(criteria)q.set('notificationWireCriteria',criteria);else if(type==='wire')q.set('notificationWireCriteria',JSON.stringify({day:notificationClock85().day,firstDays:0,repeatDays:0}));if(wire)q.set('notificationWire',wire);}
  else if(target==='work-record'||target==='work-report'){url.hash='#schedule';q.set('notificationSection','jobs');if(day)q.set('notificationDay',day);}
  else url.hash=({schedule:'#schedule',warehouse:'#warehouse',home:''})[target]||'';
 }
 if(url.hash==='#plating'&&!q.has('notificationPlatingProject')&&!q.has('notificationPlatingOverview'))q.set('notificationPlatingOverview','all');
 if(url.hash==='#wire'&&!q.has('notificationSection'))q.set('notificationSection','restock');
 return {targetUrl:url.pathname+url.search+url.hash,notice};
}
