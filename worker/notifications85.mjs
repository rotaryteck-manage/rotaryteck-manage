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
 for(const r of rules){if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!['work','report','wire','plating','material','custom','holiday','closure'].includes(r.type)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.time)||typeof r.enabled!=='boolean'||!['auto','selected'].includes(r.recipientMode)||!Array.isArray(r.recipientIds)||r.recipientIds.some(id=>!/^\d+$/.test(String(id)))||r.recipientMode==='selected'&&!r.recipientIds.length||['wire','plating','custom'].includes(r.type)&&r.recipientMode!=='selected'||!Number.isInteger(r.firstDays)||r.firstDays<0||r.firstDays>365||!Number.isInteger(r.repeatDays)||r.repeatDays<0||r.repeatDays>365||!['work-record','work-report','wire-restock','plating-record','material-record','schedule','warehouse','home'].includes(r.target))throw Error('通知規則格式不正確');if(r.type==='custom'&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.startDate||'')||Number.isNaN(Date.parse(r.startDate))))throw Error('自訂提醒日期不正確');if(r.type==='closure'&&([r.city===undefined?'高雄市':r.city,r.district===undefined?'左營區':r.district].some(x=>typeof x!=='string'||!x.trim()||x.length>30)))throw Error('停班地區不正確');if(r.type==='material'&&r.materialCategories!==undefined&&(!Array.isArray(r.materialCategories)||!r.materialCategories.length||r.materialCategories.some(x=>!['收料','出貨','送貨'].includes(x))))throw Error('料件通知類型不正確');if(r.category!==undefined&&(typeof r.category!=='string'||!r.category.trim()||r.category.length>30))throw Error('通知分類不正確');for(const [key,max]of [['name',60],['title',100],['message',500]])if(typeof r[key]!=='string'||!r[key].trim()||r[key].length>max)throw Error('通知文字不完整');ids.add(r.id);}
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
    events=(state.wireReels||[]).filter(r=>['low','ordered'].includes(r.status)).map(r=>({id:r.id+':'+(r.restock?.id||''),date:r.restock?.reported?.time,title:(state.wireTypes||[]).find(t=>t.id===r.wireId)?.name||'',days:age(r.restock?.reported?.time)}));
   }else if(rule.type==='plating'){
    events=(state.platingProjects||[]).filter(p=>!p.archived).flatMap(p=>(p.shipments||[]).filter(s=>s.sent&&!s.returned).map(s=>({id:p.id+':'+s.id,date:s.sent,project:p.name,title:s.note||('第'+s.number+'次送鍍'),days:age(s.sent)})));
   }else if(rule.type==='custom'){
    const elapsed=Math.floor((Date.parse(day)-Date.parse(rule.startDate))/86400000);if(elapsed>=0&&(rule.repeatDays>0?elapsed%rule.repeatDays===0:elapsed===0))events=[{id:day,title:rule.name,days:elapsed}];
   }else if(['material','holiday','closure'].includes(rule.type))continue;
   if(['wire','plating'].includes(rule.type))events=events.filter(e=>Number.isFinite(e.days)&&e.days>=(rule.firstDays||0));
   if(!events.length)continue;
   const summarized=['work','report','wire','plating'].includes(rule.type);
   const signature=notificationSignature92(events.map(event=>event.id+':'+(rule.repeatDays?Math.floor((event.days-(rule.firstDays||0))/rule.repeatDays):0)).sort());
   const plannedEvents=summarized?[{id:['work','report'].includes(rule.type)?rule.type+':'+day:rule.type+':'+signature,legacySignature:signature,title:events.map(e=>e.title).filter(Boolean).join('、'),content:events.map(e=>e.content).filter(Boolean).join('、'),project:[...new Set(events.map(e=>e.project).filter(Boolean))].join('、'),days:Math.max(0,...events.map(e=>Number(e.days)||0))}]:events;
   for(const event of plannedEvents){
    const period=['work','report'].includes(rule.type)?day:rule.repeatDays?Math.floor((event.days-(rule.firstDays||0))/rule.repeatDays):0;
    const workList=events.map(e=>e.title+(e.content?'（'+e.content+'）':'')).join('、');const replace=text=>String(text||'').replaceAll('{數量}',String(events.length)).replaceAll('{日期}',day).replaceAll('{通知名稱}',rule.name||'').replaceAll('{案件名稱}',event.project||'').replaceAll('{料件名稱}',event.title||'').replaceAll('{線材名稱}',rule.type==='wire'?event.title||'':'').replaceAll('{電鍍內容}',rule.type==='plating'?event.title||'':'').replaceAll('{工作名稱}',event.title||'').replaceAll('{工作內容}',event.content||'').replaceAll('{工作清單}',workList).replaceAll('{人員}',person.name).replaceAll('{逾期天數}',String(event.days));
    const targetUrl=rule.target==='work-record'||rule.target==='work-report'?'/?notificationDay='+encodeURIComponent(day)+'&notificationSection=jobs#schedule':({'wire-restock':'/#wire','plating-record':'/#plating','schedule':'/#schedule','warehouse':'/#warehouse','home':'/'})[rule.target]||'/';
    const legacyDedupePattern=['work','report'].includes(rule.type)?'auto:'+rule.id+':'+person.id+':'+rule.type+':'+day+':%:%':(['wire','plating'].includes(rule.type)?'auto:'+rule.id+':'+person.id+':'+rule.type+':%:'+event.legacySignature+':'+period+':%':'');
    plans.push({ruleId:rule.id,employeeId:person.id,notificationType:rule.type,category:rule.category||(rule.type==='work'?'工作排程':rule.type==='report'?'工作回報':rule.type==='wire'?'線材提醒':rule.type==='plating'?'電鍍提醒':'自訂提醒'),title:replace(rule.title),message:replace(rule.message),targetUrl,dedupeKey:'auto:'+rule.id+':'+person.id+':'+event.id+':'+period,legacyDedupePattern,eventCount:events.length});
   }
  }
 }
 const priority={work:1,report:2,holiday:3,closure:3,material:4,wire:5,plating:5,custom:6};
 return plans.sort((a,b)=>(priority[a.notificationType]||9)-(priority[b.notificationType]||9)||String(a.employeeId).localeCompare(String(b.employeeId)));
}
