// Pure planner: clock, event eligibility and stable dedupe identifiers are testable without sending pushes.
export function notificationClock85(now=Date.now()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
 return{day:parts.year+'-'+parts.month+'-'+parts.day,time:parts.hour+':'+parts.minute};
}
export function notificationRulesValid85(rules){
 if(!Array.isArray(rules)||rules.length>100)throw Error('通知規則最多100項');const ids=new Set();
 for(const r of rules){if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!['work','report','wire','plating'].includes(r.type)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.time)||typeof r.enabled!=='boolean'||!['auto','selected'].includes(r.recipientMode)||!Array.isArray(r.recipientIds)||r.recipientIds.some(id=>!/^\d+$/.test(String(id)))||r.recipientMode==='selected'&&!r.recipientIds.length||['wire','plating'].includes(r.type)&&r.recipientMode!=='selected'||!Number.isInteger(r.firstDays)||r.firstDays<0||r.firstDays>365||!Number.isInteger(r.repeatDays)||r.repeatDays<0||r.repeatDays>365||!['work-record','work-report','wire-restock','plating-record'].includes(r.target))throw Error('通知規則格式不正確');for(const [key,max]of [['name',60],['title',100],['message',500]])if(typeof r[key]!=='string'||!r[key].trim()||r[key].length>max)throw Error('通知文字不完整');ids.add(r.id);}
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
    events=entries.filter(e=>{let ids=[];try{ids=JSON.parse(e.assignee_ids||'[]')}catch{}return e.kind==='daily'&&e.day===day&&ids.map(String).includes(String(person.id))&&(rule.type!=='report'||!reports.some(r=>r.entry_id===e.id&&r.author_id===String(person.id)))}).map(e=>({id:day+':'+e.id,title:e.title,days:0}));
   }else if(rule.type==='wire'){
    events=(state.wireReels||[]).filter(r=>['low','ordered'].includes(r.status)).map(r=>({id:r.id+':'+(r.restock?.id||''),date:r.restock?.reported?.time,title:(state.wireTypes||[]).find(t=>t.id===r.wireId)?.name||'',days:age(r.restock?.reported?.time)}));
   }else if(rule.type==='plating'){
    events=(state.platingProjects||[]).filter(p=>!p.archived).flatMap(p=>(p.shipments||[]).filter(s=>s.sent&&!s.returned).map(s=>({id:p.id+':'+s.id,date:s.sent,project:p.name,title:s.note||('第'+s.number+'次送鍍'),days:age(s.sent)})));
   }
   if(['wire','plating'].includes(rule.type))events=events.filter(e=>Number.isFinite(e.days)&&e.days>=(rule.firstDays||0));
   if(!events.length)continue;
   for(const event of (['work','report'].includes(rule.type)?[{id:day,title:events.map(e=>e.title).join('、'),days:0}]:events)){
    const period=['work','report'].includes(rule.type)?day:rule.repeatDays?Math.floor((event.days-(rule.firstDays||0))/rule.repeatDays):0;
    const replace=text=>String(text||'').replaceAll('{數量}',String(events.length)).replaceAll('{案件名稱}',event.project||'').replaceAll('{料件名稱}',event.title||'').replaceAll('{工作名稱}',event.title||'').replaceAll('{人員}',person.name).replaceAll('{逾期天數}',String(event.days));
    plans.push({ruleId:rule.id,employeeId:person.id,notificationType:rule.type,title:replace(rule.title),message:replace(rule.message),targetUrl:({'work-record':'/#schedule','work-report':'/#schedule','wire-restock':'/#wire','plating-record':'/#plating'})[rule.target]||'/',dedupeKey:'auto:'+rule.id+':'+person.id+':'+event.id+':'+period});
   }
  }
 }
 return plans;
}
