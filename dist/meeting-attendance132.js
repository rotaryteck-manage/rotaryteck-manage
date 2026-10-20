'use strict';
const meetingAttendanceLabels132={attendance:'簽到名單',copyAttendance:'複製文字',shareAttendance:'分享到 LINE',attendanceRead:'已簽到',attendanceUnread:'未簽到',attendanceName:'人員',attendanceTime:'首次閱讀時間',attendanceAll:'全員已簽到',attendanceEmpty:'本次沒有需簽到的人員',attendanceLoading:'正在讀取簽到名單…',attendanceRetry:'重新讀取',attendanceLegacy:'自功能啟用後開始記錄',attendanceReminderTitle:'【週會紀錄閱讀提醒】',attendancePending:'尚未簽到',attendanceReminder:'請開啟該則週會紀錄閱讀，系統會自動完成簽到。',attendanceCopied:'已複製',attendanceManualCopy:'瀏覽器未允許複製，請選取下方文字後自行複製。',attendanceShareHelp:'由你選擇 LINE 群組並確認送出，不會自動發送。',attendanceFailed:'簽到尚未完成，請點簽到名單重試。'};
Object.assign(meetingLabelDefaults126,meetingAttendanceLabels132);
const attendanceSettingsLabels133={attendanceAudience:'應簽到人員',attendanceSelected:'已選',attendanceUnit:'人',attendanceSelectAll:'全選',attendanceSelectNone:'清除選取',attendanceSettingsHint:'儲存後同步既有及之後新增的週會簽到名單；保留既有簽到時間，不發送或補發通知。通知接收對象另行設定。'};
Object.assign(meetingAttendanceLabels132,attendanceSettingsLabels133);
Object.assign(meetingLabelDefaults126,attendanceSettingsLabels133);
scheduleTextSections63['週會紀錄']=[...new Set([...scheduleTextSections63['週會紀錄'],...Object.values(meetingAttendanceLabels132).map(s=>'週會：'+s)])];
uiCatalogue44.schedule=[...new Set([...uiCatalogue44.schedule,...scheduleTextSections63['週會紀錄']])];
const attendanceLabel132=key=>meetingTextValue117(key)||meetingAttendanceLabels132[key]||key;
const attendanceAccount132=()=>String(currentUser?.id||currentUser?.email||'');
function attendanceSettingsUI133(fields,settings,people){
 const details=document.createElement('details');details.className='attendance-settings133';details.dataset.uiContent='';
 const selected=new Set((settings.attendanceIds||[]).map(String)),initial=[...selected].sort((a,b)=>Number(a)-Number(b));
 // Retain selected disabled accounts in the editor so an unrelated setting save cannot silently remove them.
 const visible=[...people];for(const id of selected)if(!visible.some(p=>String(p.id)===id))visible.push({id,name:'帳號 '+id+'（未啟用，可取消選取）'});
 details.innerHTML='<summary>'+esc(attendanceLabel132('attendanceAudience'))+' <small data-attendance-count133></small></summary><p class="muted">'+esc(attendanceLabel132('attendanceSettingsHint'))+'</p><div class="attendance-select-tools133"><button type="button" data-attendance-all133>'+esc(attendanceLabel132('attendanceSelectAll'))+'</button><button type="button" data-attendance-none133>'+esc(attendanceLabel132('attendanceSelectNone'))+'</button></div><div class="meeting-recipient-list118">'+visible.map(p=>'<label><input type="checkbox" name="attendanceIds133" value="'+esc(String(p.id))+'" '+(selected.has(String(p.id))?'checked':'')+'> '+esc(p.name)+'</label>').join('')+'</div>';
 fields.querySelector('[data-people118]').after(details);
 const ids=()=>[...details.querySelectorAll('input:checked')].map(p=>p.value).sort((a,b)=>Number(a)-Number(b));
 const update=()=>{details.querySelector('[data-attendance-count133]').textContent=attendanceLabel132('attendanceSelected')+' '+ids().length+' '+attendanceLabel132('attendanceUnit')};
 details.onchange=update;details.querySelector('[data-attendance-all133]').onclick=()=>{details.querySelectorAll('input').forEach(p=>{if(people.some(person=>String(person.id)===p.value))p.checked=true});update()};details.querySelector('[data-attendance-none133]').onclick=()=>{details.querySelectorAll('input').forEach(p=>p.checked=false);update()};update();
 return {collect:()=>JSON.stringify(ids())===JSON.stringify(initial)?{}:{attendanceIds:ids(),attendanceRevision:settings.attendanceRevision}};
}
async function attendanceRequest132(id,mark=false,signal){
 const response=await apiFetch('/api/meeting-attendance132'+(mark?'':'?id='+encodeURIComponent(id)),mark?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id}),signal}:{signal});
 const data=await response.json();if(!response.ok)throw Error(data.error||'簽到操作未完成');return data;
}
function attendanceReminder132(data){
 const names=data.people.filter(p=>!p.firstReadAt).map(p=>p.name);
 if(!names.length)return '';
 return attendanceLabel132('attendanceReminderTitle')+'\n'+data.day.replaceAll('-','/')+' '+meetingTextValue117('tab')+'\n'+attendanceLabel132('attendancePending')+'：'+names.join('、')+'\n\n'+attendanceLabel132('attendanceReminder');
}
function attendanceShareURL132(data,text){
 const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
 if(mobile)return 'https://line.me/R/share?text='+encodeURIComponent(text);
 const link=new URL('/',location.origin);link.searchParams.set('notificationMeeting',data.id);link.hash='schedule';
 return 'https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(link.href)+'&text='+encodeURIComponent(text);
}
function attendanceDialog132(item,parent,mark){
 const account=attendanceAccount132(),opener=document.activeElement,scroll=parent.querySelector('.meeting-dialog-body117'),top=scroll?.scrollTop||0;
 const dialog=document.createElement('dialog');dialog.className='attendance-dialog132';dialog.dataset.uiContent='';dialog.setAttribute('aria-labelledby','attendance-title132');
 dialog.innerHTML='<div class="attendance-head132"><h2 id="attendance-title132">'+esc(attendanceLabel132('attendance'))+'</h2><button type="button" data-attendance-close132>'+esc(meetingTextValue117('close')||'關閉')+'</button></div><div class="attendance-body132"><p class="attendance-meeting132">'+esc(item.day.replaceAll('-','/')+' '+meetingTextValue117('tab'))+'</p><div class="attendance-tools132"><button type="button" data-attendance-copy132 disabled>'+esc(attendanceLabel132('copyAttendance'))+'</button><button type="button" data-attendance-share132 disabled>'+esc(attendanceLabel132('shareAttendance'))+'</button></div><p class="attendance-status132" role="status"></p><div data-attendance-content132></div><textarea class="attendance-fallback132" readonly hidden aria-label="'+esc(attendanceLabel132('copyAttendance'))+'"></textarea><small class="attendance-help132">'+esc(attendanceLabel132('attendanceShareHelp'))+'</small></div>';
 const controller=new AbortController(),status=dialog.querySelector('[role=status]'),content=dialog.querySelector('[data-attendance-content132]'),copy=dialog.querySelector('[data-attendance-copy132]'),share=dialog.querySelector('[data-attendance-share132]'),fallback=dialog.querySelector('textarea');
 let closed=false,busy=false,data=null,requestNo=0,pendingWindow=null;
 const alive=()=>!closed&&dialog.isConnected&&attendanceAccount132()===account;
 const buttons=()=>{const empty=!data?.people.some(p=>!p.firstReadAt);copy.disabled=share.disabled=busy||empty};
 const close=()=>{if(dialog.open)dialog.close()};
 const cleanup=()=>{if(closed)return;closed=true;requestNo++;controller.abort();pendingWindow?.close();parent.removeEventListener('close',parentClosed);dialog.remove();if(parent.open){if(scroll?.isConnected)scroll.scrollTop=top;if(opener?.isConnected)opener.focus({preventScroll:true})}};
 const parentClosed=()=>{if(!parent.open)close()};parent.addEventListener('close',parentClosed);dialog.addEventListener('close',cleanup,{once:true});dialog.querySelector('[data-attendance-close132]').onclick=close;
 function draw(value){
  data=value;const read=value.people.filter(p=>p.firstReadAt),unread=value.people.filter(p=>!p.firstReadAt);
  content.innerHTML=(value.legacy?'<p class="attendance-legacy132">'+esc(attendanceLabel132('attendanceLegacy')+'：'+receiptTime(value.startedAt))+'</p>':'')+'<h3>'+esc(attendanceLabel132('attendanceRead'))+' '+read.length+' 人</h3>'+(read.length?'<table><thead><tr><th>'+esc(attendanceLabel132('attendanceName'))+'</th><th>'+esc(attendanceLabel132('attendanceTime'))+'</th></tr></thead><tbody>'+read.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+esc(receiptTime(p.firstReadAt))+'</td></tr>').join('')+'</tbody></table>':'<p>—</p>')+'<h3>'+esc(attendanceLabel132('attendanceUnread'))+' '+unread.length+' 人</h3><p class="attendance-names132">'+esc(unread.length?unread.map(p=>p.name).join('、'):value.people.length?attendanceLabel132('attendanceAll'):attendanceLabel132('attendanceEmpty'))+'</p>';
  buttons();
 }
 async function refresh(){
  const number=++requestNo;await mark();const result=await attendanceRequest132(item.id,false,controller.signal);
  if(!alive()){close();throw Error('帳號或視窗已變更')}
  if(number!==requestNo)throw Error('名單已重新載入');
  if(!Array.isArray(result.people)||result.id!==item.id)throw Error('簽到名單格式不正確');draw(result);return result;
 }
 async function load(){
  if(busy||!alive())return;busy=true;buttons();status.textContent=attendanceLabel132('attendanceLoading');
  try{await refresh();if(alive())status.textContent=''}catch(error){if(alive()){status.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.textContent=attendanceLabel132('attendanceRetry');retry.onclick=load;content.replaceChildren(retry);data=null}}
  finally{busy=false;if(alive())buttons()}
 }
 async function freshText(){const value=await refresh(),text=attendanceReminder132(value);if(!text)throw Error(value.people.length?attendanceLabel132('attendanceAll'):attendanceLabel132('attendanceEmpty'));return{text,value}}
 copy.onclick=async()=>{
  if(busy||copy.disabled)return;busy=true;buttons();status.textContent=attendanceLabel132('attendanceLoading');fallback.hidden=true;
  const fresh=freshText();fresh.catch(()=>{});
  try{
   if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined')await navigator.clipboard.write([new ClipboardItem({'text/plain':fresh.then(({text})=>new Blob([text],{type:'text/plain'}))})]);
   else{const {text}=await fresh;if(!navigator.clipboard?.writeText)throw Error('剪貼簿無法使用');await navigator.clipboard.writeText(text)}
   if(alive()){status.textContent=attendanceLabel132('attendanceCopied');toast(attendanceLabel132('attendanceCopied'))}
  }catch(error){
   if(alive())try{const {text}=await fresh;fallback.value=text;fallback.hidden=false;fallback.focus();fallback.select();status.textContent=attendanceLabel132('attendanceManualCopy')}catch(latest){status.textContent=latest.message}
  }finally{busy=false;if(alive())buttons()}
 };
 share.onclick=async()=>{
  if(busy||share.disabled)return;busy=true;buttons();fallback.hidden=true;status.textContent=attendanceLabel132('attendanceLoading');
  // Reserve the window within the click gesture; populate only after a fresh authorized roster.
  const target=window.open('about:blank','_blank');pendingWindow=target;if(target)target.opener=null;
  try{if(!target)throw Error('瀏覽器阻擋分享視窗，請允許彈出視窗或使用複製文字。');const {text,value}=await freshText();if(!alive()){target.close();return}target.location.href=attendanceShareURL132(value,text);pendingWindow=null;status.textContent=attendanceLabel132('attendanceShareHelp')}
  catch(error){target?.close();pendingWindow=null;if(alive())status.textContent=error.message}
  finally{busy=false;if(alive())buttons()}
 };
 document.body.append(dialog);dialog.showModal();load();return dialog;
}
function attendanceAttach132(parent,item){
 if(!parent?.open||!item||parent.querySelector('[data-meeting-attendance132]')||parent.meetingViewer132&&parent.meetingViewer132!==attendanceAccount132())return;
 const account=attendanceAccount132(),button=document.createElement('button');button.type='button';button.dataset.meetingAttendance132='';button.dataset.uiContent='';button.textContent=attendanceLabel132('attendance');parent.querySelector('.meeting-head-actions117').prepend(button);
 let inFlight=null,done=false,popup=null;
 const mark=()=>{if(attendanceAccount132()!==account)return Promise.reject(Error('帳號已變更，請重新開啟會議'));if(done)return Promise.resolve();if(inFlight)return inFlight;inFlight=attendanceRequest132(item.id,true,AbortSignal.timeout(15000)).then(data=>{if(attendanceAccount132()!==account)throw Error('帳號已變更');done=true;button.title=data.registered?attendanceLabel132('attendanceRead'):attendanceLabel132('attendance');return data}).catch(error=>{button.title=attendanceLabel132('attendanceFailed');throw error}).finally(()=>inFlight=null);return inFlight};
 button.onclick=()=>{if(popup?.open){popup.focus();return}popup=attendanceDialog132(item,parent,mark)};
 mark().catch(error=>console.warn('週會簽到等待重試',error.message));
}
const meetingReadBefore132=meetingRead120;
meetingRead120=function(item,text,canEdit){
 const before=new Set(document.querySelectorAll('.meeting-read-dialog120')),result=meetingReadBefore132(item,text,canEdit);
 const parent=[...document.querySelectorAll('.meeting-read-dialog120')].find(d=>!before.has(d)&&d.open);attendanceAttach132(parent,item);return result;
};
// A notification may have opened its record while deferred scripts were still loading.
document.querySelectorAll('.meeting-read-dialog120[open]').forEach(parent=>attendanceAttach132(parent,parent.meetingRecord132));
document.documentElement.dataset.appVersion='13.3v';
