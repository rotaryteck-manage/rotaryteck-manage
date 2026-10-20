'use strict';
// Scoped labels: do not let old generic image-copy translations rename the
// independent date-copy action, and never alter saved work or meeting notes.
const copyDailyLabelKey126='工作紀錄：複製排程按鈕';
const meetingExtraText126={copyImage:'複製圖片',edit:'編輯',delete:'刪除',participantsLabel:'參加人員',workArea:'工作區',meetingRoom:'會議室',otherPlace:'其他',prevPage:'上一頁',nextPage:'下一頁',reload:'重新載入',textTab:'文字記錄',close:'關閉'};
const meetingLabelDefaults126={...meetingDefaultText117,...meetingExtraText126};
let meetingServerText126=null;
function meetingText126(text={}){const labels=state.appearance?.text?.schedule||{};return Object.fromEntries(Object.entries(meetingLabelDefaults126).map(([key,label])=>[key,labels['週會：'+label]||text[key]||label]))}
const meetingRequestBefore126=meetingRequest117;
meetingRequest117=async function(query='',input=null,method='POST'){const data=await meetingRequestBefore126(query,input,method);if(!input&&query!=='?view=settings'&&data.text){meetingServerText126={...data.text};data.text=meetingText126(data.text)}return data};
const meetingValueBefore126=meetingTextValue117;
meetingTextValue117=key=>meetingText126(meetingServerText126||meetingLabels117||{})[key]||meetingValueBefore126(key);
scheduleTextSections63['新增排程功能']=[copyDailyLabelKey126,'確認複製','目標日期','複製排程','來源','只複製工作安排，不包含回報及照片。'];
scheduleTextSections63['週會紀錄']=Object.values(meetingLabelDefaults126).map(label=>'週會：'+label);
uiCatalogue44.schedule=[...new Set([...uiCatalogue44.schedule,...Object.values(scheduleTextSections63).flat()])];
uiCatalogue44.global=[...new Set([...uiCatalogue44.global,'品檢報告','新增案件','匯出全部','文字紀錄','新增PDF','匯出此案','刪除紀錄／復原','登記日期時間','原始檔名','新增人員','登記備註','儲存PDF','PDF排序','上移','下移','替換PDF','新增PDF檔案','復原案件','復原登記','復原PDF'])];
const scheduleTextBefore126=scheduleTextDialog63;
scheduleTextDialog63=async function(){
 try{const data=await meetingRequestBefore126('?view=labels');meetingServerText126=data.text}catch{}
 scheduleTextBefore126();const dialog=$('#modal');
 for(const [key,label]of Object.entries(meetingLabelDefaults126)){const input=[...dialog.querySelectorAll('input[data-source]')].find(input=>input.dataset.source==='週會：'+label);if(input){input.maxLength=100;input.placeholder=meetingServerText126?.[key]||label}}
 const copy=[...dialog.querySelectorAll('input[data-source]')].find(input=>input.dataset.source===copyDailyLabelKey126);if(copy)copy.placeholder='複製排程';
};
const meetingAdminBefore126=meetingAdmin117;
meetingAdmin117=function(){meetingAdminBefore126();document.querySelector('[data-meeting-settings117]')?.remove()};
const dayRecordBefore126=scheduleDayRecord56;
scheduleDayRecord56=function(...args){const result=dayRecordBefore126(...args),button=$('#modal [data-copy-daily124]');if(button){button.dataset.uiContent='';button.textContent=state.appearance?.text?.schedule?.[copyDailyLabelKey126]||'複製排程'}return result};
document.documentElement.dataset.appVersion='13.2v';
