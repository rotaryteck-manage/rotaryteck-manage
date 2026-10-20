import {meetingAudienceSettings133,meetingAudienceStatements133} from './meeting-audience133.mjs';
// Isolated weekly meeting storage and first-save notification outbox.
export const meetingText117={tab:'週會紀錄',newButton:'新增週會紀錄',date:'開會日期',time:'開會時間',people:'會議人員',place:'會議地點',number:'筆記',content:'內容',suggestion:'建議',add:'新增筆記',save:'存檔',empty:'目前沒有週會紀錄',contentHint:'輸入 @ 可選擇人名',lastEdit:'最後編輯'};
export const meetingDefaults117={name:'週會紀錄通知',category:'週會紀錄',recipientMode:'auto',recipientIds:[],target:'meeting-record',deleted:false,enabled:true,title:'週會紀錄已新增',message:'{會議日期} {會議時間}｜{會議地點}｜{記錄人}已新增週會紀錄，請點開查看。',text:meetingText117};
const meetingJSON117=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const meetingError117=(message,status=400)=>Object.assign(Error(message),{status});
const meetingManager117=employee=>employee?.status==='active'&&employee.role==='supervisor';
const meetingDate117=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const meetingString117=(value,max,required=false)=>typeof value==='string'&&value.length<=max&&(!required||value.trim().length>0);
export function validateMeetingSettings117(input){
 if(!input||typeof input.enabled!=='boolean'||!meetingString117(input.title,100,true)||!meetingString117(input.message,500,true)||!input.text||Array.isArray(input.text))throw meetingError117('週會設定格式不正確');
 const text={};for(const key of Object.keys(meetingText117)){if(!meetingString117(input.text[key],100,true))throw meetingError117('版面文字不可空白或超過100字');text[key]=input.text[key].trim()}
 const allowed=new Set(['會議日期','會議時間','會議地點','記錄人','出席人員','筆記數','人員','日期','通知名稱','數量']);for(const value of [input.title,input.message])for(const match of value.matchAll(/\{([^{}]+)\}/g))if(!allowed.has(match[1]))throw meetingError117('不支援的通知變數：'+match[1]);
 const name=input.name??meetingDefaults117.name,category=input.category??meetingDefaults117.category,recipientMode=input.recipientMode??'auto',recipientIds=input.recipientIds??[],target=input.target??'meeting-record',deleted=input.deleted??false;
 if(!meetingString117(name,60,true)||!meetingString117(category,30,true)||!['auto','selected'].includes(recipientMode)||!Array.isArray(recipientIds)||recipientIds.length>200||recipientIds.some(id=>!/^\d+$/.test(String(id)))||new Set(recipientIds.map(String)).size!==recipientIds.length||recipientMode==='selected'&&!recipientIds.length||target!=='meeting-record'||typeof deleted!=='boolean'||deleted&&input.enabled)throw meetingError117('週會通知名稱、接收人員或前往位置不正確');
 return{name:name.trim(),category:category.trim(),recipientMode,recipientIds:recipientMode==='auto'?[]:recipientIds.map(String),target,deleted,enabled:input.enabled,title:input.title.trim(),message:input.message.trim(),text};
}
export async function meetingSettings117(env){const row=await env.DB.prepare('SELECT body,revision FROM meeting_settings117 WHERE id=1').first();return row?{...meetingDefaults117,...JSON.parse(row.body),revision:row.revision}:{...meetingDefaults117,revision:0}}
function meetingRead117(row){return row?{...row,attendees:JSON.parse(row.attendees),notes:JSON.parse(row.notes)}:null}
function meetingValue117(record){return{day:record.day,time:record.time,place:record.place,attendees:record.attendees,notes:record.notes}}
export function meetingAuditDetail117(before,after){
 const names={day:'開會日期',time:'開會時間',place:'會議地點',attendees:'會議人員',notes:'會議紀錄'};
 const show=(key,value)=>key==='attendees'?value.map(p=>p.name).join('、'):key==='notes'?value.map((n,i)=>'筆記'+(i+1)+'：'+n.content+'｜建議：'+(n.suggestion||'無')).join('；'):String(value||'');
 if(!before)return Object.keys(names).map(key=>names[key]+'：'+show(key,after[key])).join('；');
 if(!after)return '刪除紀錄｜'+Object.keys(names).map(key=>names[key]+'：'+show(key,before[key])).join('；');
 return Object.keys(names).filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key])).map(key=>names[key]+'：'+show(key,before[key])+' → '+show(key,after[key])).join('；');
}
export function auditStatements117(env,entry,guardId=''){
 const condition=guardId?' WHERE EXISTS(SELECT 1 FROM schedule_text71 WHERE id=?)':'';
 const statement=env.DB.prepare('INSERT INTO state_records(record_key,body,revision) SELECT ?,?,1'+condition);
 const args=[JSON.stringify(['log',entry.id]),JSON.stringify(entry)];if(guardId)args.push(guardId);
 return[statement.bind(...args),env.DB.prepare('UPDATE state_storage_meta SET revision=revision+1 WHERE singleton=1'+(guardId?' AND EXISTS(SELECT 1 FROM schedule_text71 WHERE id=?)':'')).bind(...(guardId?[guardId]:[]))];
}
export function meetingPayload117(settings,meeting,person){
 const values={會議日期:meeting.day.replaceAll('-','/'),會議時間:meeting.time,會議地點:meeting.place,記錄人:meeting.author_name,出席人員:meeting.attendees.map(x=>x.name).join('、'),筆記數:String(meeting.notes.length),人員:person.name,日期:meeting.day,通知名稱:settings.name||'週會紀錄通知',數量:String(meeting.notes.length)},replace=value=>value.replace(/\{([^{}]+)\}/g,(_,key)=>values[key]||''),key='meeting117:'+meeting.id+':'+person.id;
 return{ruleId:'meeting-first117',notificationType:'meeting',category:settings.category||'週會紀錄',title:replace(settings.title),message:replace(settings.message),targetUrl:'/?notificationMeeting='+encodeURIComponent(meeting.id)+'#schedule',sourceKey:key,dedupeKey:key};
}
async function meetingCommit117(env,statements){try{return await env.DB.batch(statements)}catch(error){if(/meeting_guards117|CHECK constraint|UNIQUE constraint.*meetings117/i.test(String(error)))throw meetingError117('紀錄已由他人修改，請重新載入；未存內容仍保留。',409);throw error}}
export async function meetingApi117(request,env,employee,services={}){
 try{
  if(!employee||employee.status!=='active')return meetingJSON117({error:'請先登入啟用帳號'},401);
  const url=new URL(request.url),settings=await meetingSettings117(env),manager=meetingManager117(employee);
  if(request.method==='GET'){
   if(url.searchParams.get('view')==='labels')return meetingJSON117({text:settings.text});
   if(url.searchParams.get('view')==='settings'){if(!manager||!employee.permissions?.includes('admin.settings'))throw meetingError117('沒有設定權限',403);return meetingJSON117({...settings,...await meetingAudienceSettings133(env)})}
   const id=url.searchParams.get('id');if(id){const item=meetingRead117(await env.DB.prepare("SELECT * FROM meetings117 WHERE id=? AND deleted_at=''").bind(id).first());if(!item)throw meetingError117('此週會紀錄已刪除或不存在',404);return meetingJSON117({item,text:settings.text,canEdit:manager})}
   const page=Math.max(1,Math.min(10000,Number(url.searchParams.get('page'))||1)),rows=await env.DB.prepare("SELECT id,day,time,place,editor_name,updated_at FROM meetings117 WHERE deleted_at='' ORDER BY day DESC,time DESC,created_at DESC,id DESC LIMIT 51 OFFSET ?").bind((page-1)*50).all(),people=await env.DB.prepare("SELECT e.id,e.name FROM employees e LEFT JOIN app_employee_settings x ON x.employee_id=e.id WHERE e.status='active' ORDER BY COALESCE(x.position,e.id),e.id").all();
   return meetingJSON117({items:rows.results.slice(0,50),hasMore:rows.results.length>50,page,people:people.results,text:settings.text,canEdit:manager,notificationEnabled:settings.enabled&&!settings.deleted,notificationAudience:settings.recipientMode==='selected'?'指定人員：'+people.results.filter(person=>settings.recipientIds.map(String).includes(String(person.id))).map(person=>person.name).join('、'):'全公司啟用帳號'});
  }
  if(!manager)throw meetingError117('只有主管可新增、編輯或刪除週會紀錄',403);
  if(request.headers.get('origin')!==url.origin)throw meetingError117('來源驗證失敗',403);
  if(!['POST','DELETE'].includes(request.method))throw meetingError117('不支援的操作',405);
  if(!request.headers.get('content-type')?.includes('application/json'))throw meetingError117('格式不正確',415);
  const body=await request.text();if(new TextEncoder().encode(body).length>250000)throw meetingError117('資料過大',413);const input=JSON.parse(body);
  if(url.searchParams.get('view')==='labels')return meetingJSON117({text:settings.text});
   if(url.searchParams.get('view')==='settings'){
   if(request.method!=='POST'||!employee.permissions?.includes('admin.settings'))throw meetingError117('沒有設定權限',403);
   const value=validateMeetingSettings117(input),rev=settings.revision;if(input.revision!==rev)throw meetingError117('設定已更新，請重新開啟設定',409);
   await services.ensureStorage?.(env);const token=crypto.randomUUID(),now=new Date().toISOString(),entry={id:crypto.randomUUID(),time:now,actor:employee.name,action:'修改週會設定',category:'system',location:'管理後台 > 週會紀錄',target:'週會紀錄設定',detail:'通知：'+(value.enabled?'啟用':'停用')+'；'+JSON.stringify(value)};
   const audience=await meetingAudienceStatements133(env,input,token);if(audience.length)entry.detail+='；應簽到人員：'+input.attendanceIds.join('、')+'（同步既有會議，不發送通知）';
   await meetingCommit117(env,[env.DB.prepare('INSERT INTO meeting_guards117(id,valid) VALUES(?,COALESCE((SELECT revision=? FROM meeting_settings117 WHERE id=1),?))').bind(token,rev,rev===0?1:0),env.DB.prepare('INSERT INTO meeting_settings117(id,body,revision) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,revision=excluded.revision').bind(JSON.stringify(value),rev+1),...audience,...auditStatements117(env,entry),env.DB.prepare('DELETE FROM meeting_guards117 WHERE id=?').bind(token)]);return meetingJSON117({saved:true,revision:rev+1});
  }
  if(!meetingString117(input.id,80,true)||!meetingString117(input.requestId,80,true)||!Number.isInteger(input.revision)||input.revision<0)throw meetingError117('紀錄編號或版本不正確');
  const signature=JSON.stringify({method:request.method,id:input.id,revision:input.revision,day:input.day,time:input.time,place:input.place,attendeeIds:input.attendeeIds,notes:input.notes,actor:employee.id}),previousRequest=await env.DB.prepare('SELECT signature,result FROM meeting_requests117 WHERE request_id=?').bind(input.requestId).first();
  if(previousRequest){if(previousRequest.signature!==signature)throw meetingError117('操作編號已使用，請重新存檔',409);return meetingJSON117({...JSON.parse(previousRequest.result),already:true})}
  const old=meetingRead117(await env.DB.prepare('SELECT * FROM meetings117 WHERE id=?').bind(input.id).first());if(old?.deleted_at)throw meetingError117('此週會紀錄已刪除',404);if((old?.revision||0)!==input.revision)throw meetingError117('紀錄已由他人修改，請重新載入；未存內容仍保留。',409);
  if(request.method==='DELETE'&&!old)throw meetingError117('找不到紀錄',404);
  const now=new Date().toISOString(),token=crypto.randomUUID(),statements=[env.DB.prepare("INSERT INTO meeting_guards117(id,valid) VALUES(?,COALESCE((SELECT revision=? AND deleted_at='' FROM meetings117 WHERE id=?),?))").bind(token,input.revision,input.id,input.revision===0?1:0)];let next=null,events=[];
  if(request.method==='POST'){
   if(!meetingDate117(input.day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)||!meetingString117(input.place,200,true)||!Array.isArray(input.attendeeIds)||!input.attendeeIds.length||input.attendeeIds.length>200||new Set(input.attendeeIds.map(String)).size!==input.attendeeIds.length||!Array.isArray(input.notes)||input.notes.length>100)throw meetingError117('請填寫日期、時間、地點與出席人員');
   const rows=await env.DB.prepare("SELECT id,name FROM employees WHERE status='active'").all(),people=new Map(rows.results.map(x=>[String(x.id),x])),oldPeople=new Map((old?.attendees||[]).map(x=>[String(x.id),x])),attendees=input.attendeeIds.map(id=>{const person=oldPeople.get(String(id))||people.get(String(id));if(!person)throw meetingError117('出席名單已更新，請重新選擇');return{id:Number(person.id),name:person.name}}),notes=[];
   for(const note of input.notes){if(!note||!meetingString117(note.content,4000)||!meetingString117(note.suggestion,2000))throw meetingError117('筆記內容或建議過長');const item={content:note.content.trim(),suggestion:note.suggestion.trim()};if(item.content||item.suggestion)notes.push(item)}
   if(!notes.some(n=>n.content))throw meetingError117('至少填寫一列會議內容才能存檔');
   next={id:input.id,day:input.day,time:input.time,place:input.place.trim(),attendees,notes,revision:input.revision+1,author_id:old?.author_id||employee.id,author_name:old?.author_name||employee.name,editor_id:employee.id,editor_name:employee.name,created_at:old?.created_at||now,updated_at:now,deleted_at:''};
   if(old)statements.push(env.DB.prepare('UPDATE meetings117 SET day=?,time=?,place=?,attendees=?,notes=?,revision=revision+1,editor_id=?,editor_name=?,updated_at=? WHERE id=?').bind(next.day,next.time,next.place,JSON.stringify(attendees),JSON.stringify(notes),employee.id,employee.name,now,input.id));
   else{statements.push(env.DB.prepare('INSERT INTO meetings117(id,day,time,place,attendees,notes,revision,author_id,author_name,editor_id,editor_name,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?,?,?,?)').bind(input.id,next.day,next.time,next.place,JSON.stringify(attendees),JSON.stringify(notes),employee.id,employee.name,employee.id,employee.name,now,now));
    if(settings.enabled&&!settings.deleted)for(const person of rows.results.filter(person=>settings.recipientMode!=='selected'||settings.recipientIds.map(String).includes(String(person.id)))){const payload=meetingPayload117(settings,next,person);events.push(payload.sourceKey);statements.push(env.DB.prepare("INSERT INTO meeting_events117(event_key,meeting_id,recipient_id,payload,status,attempts,last_error,created_at,updated_at) VALUES(?,?,?,?,'pending',0,'',?,?)").bind(payload.sourceKey,input.id,person.id,JSON.stringify(payload),now,now));if(services.inboxStatement)statements.push(services.inboxStatement(env,person.id,payload));}
   }
  }else{statements.push(env.DB.prepare('UPDATE meetings117 SET deleted_at=?,updated_at=?,editor_id=?,editor_name=?,revision=revision+1 WHERE id=?').bind(now,now,employee.id,employee.name,input.id));statements.push(env.DB.prepare("UPDATE meeting_events117 SET status='cancelled',updated_at=? WHERE meeting_id=? AND status IN ('pending','processing')").bind(now,input.id))}
  await services.ensureStorage?.(env);
  const entry={id:crypto.randomUUID(),time:now,actor:employee.name,action:request.method==='DELETE'?'刪除週會紀錄':old?'修改週會紀錄':'新增週會紀錄',category:'meeting',location:'工作排程 > 週會紀錄',target:(next||old).day+' - 週會紀錄',project:'meeting:'+input.id,detail:meetingAuditDetail117(old&&meetingValue117(old),next&&meetingValue117(next))||'存檔（內容未變更）'},result={saved:true,id:input.id,revision:input.revision+1,created:!old,notifications:events.length};
  statements.push(...auditStatements117(env,entry),env.DB.prepare('INSERT INTO meeting_requests117(request_id,signature,result) VALUES(?,?,?)').bind(input.requestId,signature,JSON.stringify(result)),env.DB.prepare('DELETE FROM meeting_guards117 WHERE id=?').bind(token));
  try{await meetingCommit117(env,statements)}catch(error){const previous=await env.DB.prepare('SELECT signature,result FROM meeting_requests117 WHERE request_id=?').bind(input.requestId).first();if(previous?.signature===signature)return meetingJSON117({...JSON.parse(previous.result),already:true});throw error}
  if(events.length){const task=services.dispatch?.(env,events);if(task){if(services.ctx?.waitUntil)services.ctx.waitUntil(task);else await task}}
  return meetingJSON117(result);
 }catch(error){return meetingJSON117({error:error.message||'週會操作未完成'},error.status||400)}
}
export async function runMeetingNotifications117(env,dispatch,keys=null){
 const cutoff=new Date(Date.now()-10*60*1000).toISOString();await env.DB.prepare("UPDATE meeting_events117 SET status='pending' WHERE status='processing' AND updated_at<?").bind(cutoff).run();
 const rows=await env.DB.prepare("SELECT * FROM meeting_events117 WHERE created_at>=COALESCE((SELECT cutoff FROM notification_release123 WHERE singleton=1),'1970-01-01T00:00:00.000Z') AND status='pending' AND attempts<3 AND (? IS NULL OR event_key IN (SELECT value FROM json_each(?))) ORDER BY created_at,event_key LIMIT 32").bind(keys?JSON.stringify(keys):null,keys?JSON.stringify(keys):null).all(),budget={remaining:2};
 for(const row of rows.results){if(budget.remaining<=0)break;const claim=await env.DB.prepare("UPDATE meeting_events117 SET status='processing',updated_at=? WHERE event_key=? AND status='pending'").bind(new Date().toISOString(),row.event_key).run();if(claim.meta?.changes!==1)continue;const settings=await meetingSettings117(env),meeting=await env.DB.prepare("SELECT id FROM meetings117 WHERE id=? AND deleted_at=''").bind(row.meeting_id).first();if(!settings.enabled||settings.deleted||!meeting){await env.DB.prepare("UPDATE meeting_events117 SET status='cancelled',updated_at=? WHERE event_key=? AND status='processing'").bind(new Date().toISOString(),row.event_key).run();continue}
  try{const result=await dispatch({...env,NOTIFICATION_RUNTIME116:true},row.recipient_id,JSON.parse(row.payload),budget),done=!result.failed&&!result.deferred;await env.DB.prepare("UPDATE meeting_events117 SET status=?,attempts=attempts+?,last_error=?,updated_at=? WHERE event_key=? AND status='processing'").bind(done?'sent':'pending',result.deferred&&!result.failed?0:1,done?'':'裝置通知尚未全部成功',new Date().toISOString(),row.event_key).run()}catch(error){await env.DB.prepare("UPDATE meeting_events117 SET status='pending',attempts=attempts+1,last_error=?,updated_at=? WHERE event_key=? AND status='processing'").bind(String(error.message).slice(0,500),new Date().toISOString(),row.event_key).run()}
 }
 return rows.results.length;
}

// Each new meeting recipient gets a separate immediate invocation, keeping
// database and CPU limits independent of the first-save transaction.
async function meetingSignature117(env,key,at){
 if(!env.VAPID_PRIVATE_KEY)throw Error('通知秘密金鑰尚未設定');
 const secret=await crypto.subtle.importKey('raw',new TextEncoder().encode('meeting-dispatch117:'+env.VAPID_PRIVATE_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode(JSON.stringify([key,at])));
 return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function queueMeetingNotifications117(env,keys=null,origin='https://rotaryteck-manage.rotaryteckserve.workers.dev'){
 const rows=await env.DB.prepare("SELECT event_key FROM meeting_events117 WHERE created_at>=COALESCE((SELECT cutoff FROM notification_release123 WHERE singleton=1),'1970-01-01T00:00:00.000Z') AND attempts<3 AND (status='pending' OR (status='processing' AND updated_at<?)) AND (? IS NULL OR event_key IN (SELECT value FROM json_each(?))) ORDER BY created_at LIMIT 32").bind(new Date(Date.now()-10*60*1000).toISOString(),keys?JSON.stringify(keys):null,keys?JSON.stringify(keys):null).all();
 for(let index=0;index<rows.results.length;index+=4)await Promise.all(rows.results.slice(index,index+4).map(async row=>{
  try{const at=Date.now(),signature=await meetingSignature117(env,row.event_key,at),response=await fetch(origin+'/api/meeting-dispatch117',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:row.event_key,at,signature}),redirect:'manual',signal:AbortSignal.timeout(25000)});if(!response.ok)console.error('週會背景發送等待重試',response.status);await response.body?.cancel();}catch(error){console.error('週會背景發送等待重試',error.message)}
 }));return rows.results.length;
}
export async function meetingDispatchApi117(request,env,dispatch){
 try{if(request.method!=='POST'||!request.headers.get('content-type')?.includes('application/json'))return meetingJSON117({error:'不支援的操作'},405);
 const body=await request.text();if(body.length>2000)return meetingJSON117({error:'資料過大'},413);const input=JSON.parse(body);
 if(!meetingString117(input.key,300,true)||!input.key.startsWith('meeting117:')||!Number.isSafeInteger(input.at)||Math.abs(Date.now()-input.at)>60000||typeof input.signature!=='string'||!/^[a-f0-9]{64}$/.test(input.signature))return meetingJSON117({error:'發送驗證失敗'},403);
 const expected=await meetingSignature117(env,input.key,input.at);let difference=0;for(let i=0;i<64;i++)difference|=expected.charCodeAt(i)^input.signature.charCodeAt(i);if(difference)return meetingJSON117({error:'發送驗證失敗'},403);
 await runMeetingNotifications117(env,dispatch,[input.key]);return meetingJSON117({checked:true});
 }catch(error){console.error('週會背景發送失敗',error.message);return meetingJSON117({error:'週會背景發送未完成'},500)}
}
