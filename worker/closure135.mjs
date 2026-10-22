export const closureGovernmentURL135='https://www.dgpa.gov.tw/typh/daily/nds.html';
function closureText135(html){return String(html).replace(/<!--[^]*?-->/g,'').replace(/<(script|style)\b[^>]*>[^]*?<\/\1>/gi,'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&#(x[\da-f]+|\d+);/gi,(_,v)=>{const n=v[0].toLowerCase()==='x'?parseInt(v.slice(1),16):Number(v);return n>0&&n<=0x10ffff?String.fromCodePoint(n):' '}).replace(/&(nbsp|amp|lt|gt|quot|apos);/gi,(_,v)=>({nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[v.toLowerCase()]).replace(/[\t\r ]+/g,' ').trim()}
const closureName135=value=>String(value).replaceAll('台','臺').replace(/\s/g,'');
function closureDay135(year,month,day){const y=Number(year)+(Number(year)<1911?1911:0),s=y+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');if(!/^\d{4}-\d\d-\d\d$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('官方停班公告日期不正確');return s}
function closureShift135(day,offset){return new Date(Date.parse(day+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10)}
function closureDateIn135(text,anchor){const full=text.match(/(?:(?:民國)?(\d{3,4})[年/.-]\s*)?(\d{1,2})[月/.-]\s*(\d{1,2})日?/);if(full)return closureDay135(full[1]||anchor.slice(0,4),full[2],full[3]);if(/明天|明日|翌日/.test(text))return closureShift135(anchor,1);return anchor}
function closureScope135(prefix,city,district){
 const value=closureName135(prefix).replaceAll(closureName135(city),'').replace(/[：:,，\s]/g,'');
 if(/學校|小學|中學|國小|國中|高中|高職|大學|幼兒園|分校|附幼|校區|機關|公所|醫院|公司|辦公室|中心|衛生所|圖書館/.test(value))return {kind:'school',priority:0,names:[]};
 const except=value.match(/^(?:全市|全縣|本市|本縣)?除(.+?)外(?:其餘地區|其餘各區|其餘)?$/);
 const namesOf=s=>{const names=s.match(/[\p{Script=Han}]{1,10}?(?:區|鄉|鎮|市)/gu)||[];const rest=names.reduce((t,n)=>t.replace(n,''),s).replace(/[、及與和]/g,'');return rest?'':names};
 if(except){const names=namesOf(except[1]);return names?{kind:'except',priority:2,names,applies:!names.includes(closureName135(district))}:{kind:'uncertain',priority:0,names:[]}}
 if(/^(?:其餘地區|其餘各區|其他地區)$/.test(value))return {kind:'rest',priority:1,names:[],applies:true};
 if(/^(?:全市|全縣|本市|本縣|全區|全部地區)?$/.test(value))return {kind:'all',priority:1,names:[],applies:true};
 const names=namesOf(value);if(names&&names.length)return {kind:'district',priority:3,names,applies:names.includes(closureName135(district))};
 return {kind:'uncertain',priority:0,names:[]};
}
function closurePeriod135(text){
 const normalized=text.replace(/\s/g,'').replaceAll('０','0').replaceAll('：',':'),half=normalized.match(/上午|下午|晚上|晚間|中午/),time=normalized.match(/(\d{1,2}):(\d{2})(?:分)?/);
 if(time){let h=Number(time[1]),m=Number(time[2]);if(h>23||m>59)throw Error('官方停班時段無法確認');if(/下午|晚上|晚間/.test(half?.[0]||'')&&h<12)h+=12;if(half?.[0]==='上午'&&h===12)h=0;const start=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'),rest=normalized.slice((time.index||0)+time[0].length),end=rest.match(/(?:至|到|~|～|-)(?:(上午|下午|晚上|晚間|中午))?(\d{1,2}):(\d{2})/);if(end){let eh=Number(end[2]);if(/下午|晚上|晚間/.test(end[1]||half?.[0]||'')&&eh<12)eh+=12;if(eh>24||Number(end[3])>59)throw Error('官方停班時段無法確認');const finish=String(eh).padStart(2,'0')+':'+end[3];return{key:start+'-'+finish,label:start+' 至 '+finish}}
  return {key:'from-'+start,label:start+' 起'};
 }
 if(half){const key={上午:'am',下午:'pm',晚上:'night',晚間:'night',中午:'noon'}[half[0]];return {key,label:key==='night'?'晚間':half[0]}}
 if(/\d+(?:時|點)/.test(normalized))throw Error('官方停班時段無法確認');return {key:'all',label:'全日'};
}
export function parseClosureGovernment135(html,city='高雄市',district='左營區',clock=Date.now()){
 if(/<WarningMessage\b|請先登入會員|cf-chl-/i.test(html))throw Error('官方停班來源要求登入或驗證，尚未取得公告');
 if(typeof html!=='string'||html.length>1500000||!/天然災害停止上班/.test(html))throw Error('官方停班資料格式不正確，尚未確認公告');
 const header=html.match(/class=["'][^"']*\bHeader_YMD\b[^"']*["'][^>]*>([^]*?)<\/div>/i),date=closureText135(header?.[1]||'').match(/(\d{3,4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
 if(!date)throw Error('官方停班公告日期無法辨識');const anchor=closureDay135(date[1],date[2],date[3]),today=new Date(clock).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),tomorrow=closureShift135(today,1);
 if(anchor<closureShift135(today,-1)||anchor>tomorrow)throw Error('官方停班頁面日期過期或異常，尚未確認最新公告');
 const update=html.match(/更新時間[：:]\s*(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{2}:\d{2}:\d{2})/),announcedAt=update?closureDay135(update[1],update[2],update[3])+'T'+update[4]+'+08:00':'';
 if(!announcedAt||Date.parse(announcedAt)>clock+10*60000||clock-Date.parse(announcedAt)>36*3600000)throw Error('官方停班頁面更新時間過期或異常');
 const matches=[];
 for(const tr of html.matchAll(/<tr\b[^>]*>([^]*?)<\/tr>/gi)){const cells=[...tr[1].matchAll(/<t[dh]\b[^>]*>([^]*?)<\/t[dh]>/gi)].map(m=>m[1]),index=cells.findIndex(cell=>closureName135(closureText135(cell))===closureName135(city));if(index>=0&&cells[index+1])matches.push(cells[index+1])}
 if(matches.length!==1)throw Error('官方停班表格缺少指定縣市或格式已改變');
 const row=closureText135(matches[0]),pieces=row.split(/[\n。；;]/).map(s=>s.trim()).filter(Boolean),entries=[];let inherited=null;
 for(const piece of pieces){
  const first=piece.search(/(?:民國)?\d{3,4}[年/.-]|\d{1,2}月\d{1,2}日|今天|今日|明天|明日|翌日|上午|下午|晚上|晚間|中午|停止上班|照常上班|正常上班|不停止上班|未達停止上班/);
  if(first<0)continue;const workIndex=piece.search(/照常上班|正常上班|不停止上班|未達停止上班|停止上班/);if(workIndex<0){const prefix=piece.slice(0,first);if(prefix.replace(/[：:,，\s]/g,''))inherited=closureScope135(prefix,city,district);continue}
  const prefix=piece.slice(0,workIndex).replace(/(?:民國)?\d{3,4}[年/.-]\s*\d{1,2}[月/.-]\s*\d{1,2}日?|\d{1,2}月\d{1,2}日|今天|今日|明天|明日|翌日/g,'').replace(/(?:上午|下午|晚上|晚間|中午)?\s*\d{1,2}[：:]\d{2}(?:分)?/g,'').replace(/原公告|公告|原定|取消|撤銷|更正為|更正|改為|改成|上午|下午|晚上|晚間|中午|全日|整天|開始|[起至到~～\-]/g,'').trim();
  const scope=prefix.replace(/[：:,，\s]/g,'')?closureScope135(prefix,city,district):(inherited||closureScope135('',city,district));if(prefix.replace(/[：:,，\s]/g,''))inherited=scope;
  if(['school','uncertain'].includes(scope.kind))continue;
  const date=closureDateIn135(piece,anchor);let offset=0;
  for(const match of piece.matchAll(/照常上班|正常上班|不停止上班|未達停止上班(?:標準)?|停止上班/g)){
   const context=piece.slice(offset,match.index),period=closurePeriod135(context),status=match[0]==='停止上班'?'closed':'open';offset=match.index+match[0].length;if(status==='closed'&&/取消|撤銷|原定/.test(context))continue;
   entries.push({date,scope,period,status});
  }
 }
 const announcements=[];
 for(const day of [today,tomorrow]){
  const list=entries.filter(e=>e.date===day),named=new Set(list.filter(e=>e.scope.kind==='district').flatMap(e=>e.scope.names));
  const applicable=list.filter(e=>e.scope.applies&&!(e.scope.kind==='rest'&&named.has(closureName135(district))));if(!applicable.length)continue;
  const priority=Math.max(...applicable.map(e=>e.scope.priority)),best=applicable.filter(e=>e.scope.priority===priority),closed=best.filter(e=>e.status==='closed'),chosen=closed.length?closed:best,status=closed.length?'closed':'open';
  const periods=[...new Map(chosen.map(e=>[e.period.key,e.period])).values()].sort((a,b)=>a.key.localeCompare(b.key));if(periods.some(p=>p.key==='all'))periods.splice(0,periods.length,{key:'all',label:'全日'});
  const periodKey=periods.map(p=>p.key).join(','),periodLabel=periods.map(p=>p.label).join('、'),scopeLabel=priority>=2?city+district:city+'全市',workText=(status==='closed'?'停止上班':'照常上班')+'（'+periodLabel+'）';
  announcements.push({status,effectiveDate:day,sourceId:'dgpa:'+closureName135(city)+':'+closureName135(district)+':'+day+':'+status+':'+periodKey,announcedAt,headline:scopeLabel+' '+workText,detail:row.slice(0,2000),city,district,periodKey,periodLabel,scopeLabel,workText,sourceURL:closureGovernmentURL135,pageDate:anchor});
 }
 const primary=[...announcements].sort((a,b)=>(a.status==='closed'?0:1)-(b.status==='closed'?0:1)||b.effectiveDate.localeCompare(a.effectiveDate))[0];
 return {...(primary||{status:'unknown',effectiveDate:'',sourceId:'',announcedAt,headline:'',detail:row.slice(0,2000),city,district,sourceURL:closureGovernmentURL135,pageDate:anchor,note:/尚未宣布/.test(row)?'官方尚未宣布指定地區停班消息':'目前公告未確認指定地區停止上班（可能僅限其他地區或學校）'}),announcements};
}
export function closureSourceStatement135(env,key,result,stamp,error=''){
 const detail=JSON.stringify({...result,sourceURL:closureGovernmentURL135,...(error?{error}:{}),announcements:undefined});
 if(error)return env.DB.prepare("INSERT INTO notification_source_state90(source_key,status,detail,checked_at) VALUES(?,'unknown',?,?) ON CONFLICT(source_key) DO UPDATE SET detail=excluded.detail,checked_at=excluded.checked_at").bind(key,detail,stamp);
 return env.DB.prepare("INSERT INTO notification_source_state90(source_key,status,source_id,effective_date,detail,checked_at,changed_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source_key) DO UPDATE SET status=excluded.status,source_id=excluded.source_id,effective_date=excluded.effective_date,detail=excluded.detail,checked_at=excluded.checked_at,changed_at=CASE WHEN excluded.status<>notification_source_state90.status OR excluded.effective_date<>notification_source_state90.effective_date OR excluded.source_id<>notification_source_state90.source_id THEN excluded.changed_at ELSE notification_source_state90.changed_at END").bind(key,result.status,result.sourceId||'',result.effectiveDate||'',detail,stamp,stamp);
}
export async function closureRecord135(env,rule,result,previous,clock,people,template){
 const key='closure:'+(rule.city||'高雄市')+':'+(rule.district||'左營區'),stamp=new Date(clock).toISOString(),statements=[];
 for(const announcement of result.announcements||[]){
  const latest=await env.DB.prepare('SELECT event_key,status,period_key,rowid AS sequence FROM notification_closure_events135 WHERE rule_id=? AND source_key=? AND effective_date=? ORDER BY rowid DESC LIMIT 1').bind(rule.id,key,announcement.effectiveDate).first();
  if(latest?.status===announcement.status&&latest.period_key===announcement.periodKey)continue;
  // A genuine reversal is a new correction; re-fetching the same current state is not.
  const eventKey='closure135:'+rule.id+':'+announcement.sourceId+':after:'+(latest?.sequence||0);
  if(announcement.status==='open'&&!(previous?.status==='closed'&&previous.effective_date===announcement.effectiveDate)&&!await env.DB.prepare("SELECT 1 AS n FROM notification_closure_events135 WHERE rule_id=? AND effective_date=? AND status='closed' LIMIT 1").bind(rule.id,announcement.effectiveDate).first())continue;
  const legacyPrefix='closure:'+rule.id+':'+announcement.effectiveDate+':',legacy=!latest&&announcement.periodKey==='all'?(await env.DB.prepare("SELECT source_key,employee_id FROM notification_device_scopes121 WHERE substr(source_key,1,length(?))=? AND instr(source_key,?)>0").bind(legacyPrefix,legacyPrefix,':'+announcement.status+':').all()).results:[],legacyPeople=new Map(legacy.map(row=>[Number(row.employee_id),row.source_key])),items=[];
  for(const person of people){
   // A source switch never appends recipients/devices to an already captured legacy notice.
   if(legacy.length&&!legacyPeople.has(Number(person.id)))continue;
   const deliveryKey=legacyPeople.get(Number(person.id))||eventKey+':'+person.id,values={人員:person.name,日期:announcement.effectiveDate,通知名稱:rule.name,縣市:announcement.city,行政區:announcement.district,停班日期:announcement.effectiveDate,停班狀態:announcement.workText,公告時間:announcement.announcedAt};
   const info='\n官方公告：'+announcement.effectiveDate+' '+announcement.scopeLabel+' '+announcement.workText,body=template(rule.message,values),message=body.slice(0,Math.max(0,500-info.length))+info;
   items.push({key:deliveryKey,employeeId:Number(person.id),inboxId:crypto.randomUUID(),payload:{ruleId:rule.id,notificationType:'closure',category:rule.category||'停班提醒',title:template(rule.title,values).slice(0,100),message,targetUrl:'/?notificationDay='+encodeURIComponent(announcement.effectiveDate)+'#schedule',sourceKey:deliveryKey,dedupeKey:deliveryKey}});
  }
  statements.push(
   env.DB.prepare('INSERT OR IGNORE INTO notification_closure_events135(event_key,rule_id,source_key,effective_date,status,period_key,created_at,sealed) VALUES(?,?,?,?,?,?,?,0)').bind(eventKey,rule.id,key,announcement.effectiveDate,announcement.status,announcement.periodKey,stamp),
   env.DB.prepare("UPDATE notification_closure_deliveries135 SET status='cancelled' WHERE status='pending' AND event_key IN (SELECT event_key FROM notification_closure_events135 WHERE rule_id=? AND effective_date=? AND event_key<>?)").bind(rule.id,announcement.effectiveDate,eventKey),
   env.DB.prepare("INSERT OR IGNORE INTO notification_closure_deliveries135(delivery_key,event_key,employee_id,inbox_id,payload,status,created_at) SELECT json_extract(j.value,'$.key'),?,json_extract(j.value,'$.employeeId'),json_extract(j.value,'$.inboxId'),json_extract(j.value,'$.payload'),'pending',? FROM json_each(?) j WHERE EXISTS(SELECT 1 FROM notification_closure_events135 WHERE event_key=? AND sealed=0)").bind(eventKey,stamp,JSON.stringify(items),eventKey),
   env.DB.prepare("INSERT OR IGNORE INTO notification_device_scopes121(source_key,employee_id,device_ids,created_at) SELECT d.delivery_key,d.employee_id,COALESCE((SELECT json_group_array(s.id) FROM push_subscriptions s WHERE s.employee_id=d.employee_id AND s.enabled=1),'[]'),? FROM notification_closure_deliveries135 d WHERE d.event_key=? AND EXISTS(SELECT 1 FROM notification_closure_events135 WHERE event_key=? AND sealed=0)").bind(stamp,eventKey,eventKey),
   env.DB.prepare("INSERT OR IGNORE INTO notification_inbox88(id,employee_id,category,title,message,target_url,source_key,created_at) SELECT d.inbox_id,d.employee_id,json_extract(d.payload,'$.category'),json_extract(d.payload,'$.title'),json_extract(d.payload,'$.message'),json_extract(d.payload,'$.targetUrl'),d.delivery_key,? FROM notification_closure_deliveries135 d WHERE d.event_key=? AND EXISTS(SELECT 1 FROM notification_closure_events135 WHERE event_key=? AND sealed=0)").bind(stamp,eventKey,eventKey),
   env.DB.prepare('UPDATE notification_closure_events135 SET sealed=1 WHERE event_key=?').bind(eventKey)
  );
 }
 statements.push(closureSourceStatement135(env,key,result,stamp));await env.DB.batch(statements);
}
export async function closurePending135(env,rule,day){
 const rows=await env.DB.prepare("SELECT d.delivery_key,d.employee_id,d.payload FROM notification_closure_deliveries135 d JOIN notification_closure_events135 e ON e.event_key=d.event_key WHERE d.status='pending' AND e.rule_id=? AND e.source_key=? AND e.effective_date IN (?,?) ORDER BY d.created_at,d.employee_id LIMIT 200").bind(rule.id,'closure:'+(rule.city||'高雄市')+':'+(rule.district||'左營區'),day,closureShift135(day,1)).all();return rows.results||[];
}
export async function closureComplete135(env,plans,result){
 if(result.failed||result.deferred)return;
 if(result.results?.some(r=>!r.ok&&!r.exhausted&&!r.held&&!r.disabled))return;
 const keys=plans.filter(p=>p.notificationType==='closure').map(p=>p.sourceKey||p.dedupeKey);if(!keys.length)return;
 const exhausted=result.results?.some(r=>!r.ok&&r.exhausted),status=exhausted?'failed':result.held||result.results?.some(r=>r.held)?'held':'done';
 await env.DB.prepare("UPDATE notification_closure_deliveries135 SET status=? WHERE delivery_key IN (SELECT value FROM json_each(?)) AND status='pending'").bind(status,JSON.stringify(keys)).run();
}
