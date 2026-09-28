'use strict';
// UI copy is configured separately from work items, names, and saved records.
const scheduleTextSections63={
 '頁面與操作':['工作排程','每週安排與每日工作回報','每週排程','每日排程','上一期','下一期','今天','新增排程','新增料件','工作回報','新增備註','複製上週','複製排程','查看紀錄','編輯'],
 '新增排程':['工作','工作項目','工作內容','人員（可複選）','手動輸入工作項目','手動輸入工作內容','開始日期','結束日期','＋ 新增工作','移除此工作','色塊','修改安排','儲存安排','刪除安排'],
 '每週備註':['備註','每週備註','備註內容','只有填寫後才會顯示備註欄','儲存備註'],
 '每日料件':['編輯料件','類型','收料','出貨','送貨','料件名稱','數量','儲存料件','刪除料件','當日料件／出送貨'],
 '工作回報與紀錄':['當日工作紀錄','排程工作','新增回報','新增工作回報','回報人','紀錄日期','工作進度','照片（選填，手機可選照片；電腦可 Ctrl+V 貼上）','儲存回報','刪除回報','收／領料紀錄','當日沒有排程工作','當日尚無回報']
};
// Also list these in the site's shared text editor for users who open it there.
uiCatalogue44.schedule=[...new Set(Object.values(scheduleTextSections63).flat())];
function scheduleTextDialog63(){
 const saved=state.appearance?.text?.schedule||{},groups=Object.entries(scheduleTextSections63).map(([title,labels])=>'<section class="schedule-text-group63"><h3>'+esc(title)+'</h3><div class="schedule-text-grid63">'+[...new Set(labels)].map(label=>'<label class="field">'+esc(label)+'<input data-source="'+esc(label)+'" value="'+esc(saved[label]||'')+'" maxlength="500" placeholder="沿用原文字"></label>').join('')+'</div></section>').join('');
 modal('工作排程文字與按鈕','<p class="muted">留白即使用原文字。這些設定只改畫面顯示，不會更動已填的工作、日期或人員。</p><div class="schedule-text-settings63">'+groups+'<section class="schedule-text-group63"><h3>補充其他畫面文字</h3><div class="form-grid">'+field('目前顯示文字','scheduleExtraSource63','','maxlength="500"')+field('想改成','scheduleExtraValue63','','maxlength="500"')+'</div><p class="muted">上面沒有列到的畫面文字，可在此填入原文字與新文字。</p></section></div>','儲存文字',async fd=>{
  const values={};for(const [source,replacement] of Object.entries(saved))if(!uiCatalogue44.schedule.includes(source))values[source]=replacement;
  document.querySelectorAll('#modal .schedule-text-grid63 input[data-source]').forEach(input=>{const value=input.value.trim();if(value)values[input.dataset.source]=value});
  const extra=String(fd.get('scheduleExtraSource63')||'').trim(),newValue=String(fd.get('scheduleExtraValue63')||'').trim();if(extra||newValue){if(!extra||!newValue)throw Error('補充文字請同時填寫原文字與新文字');values[extra]=newValue}
  const next=structuredClone(state);next.appearance??={};next.appearance.text??={};if(Object.keys(values).length)next.appearance.text.schedule=values;else delete next.appearance.text.schedule;
  await commit44(next,'修改工作排程文字','更新排程畫面文字與按鈕','管理後台 > 工作排程');$('#modal').close();renderAdmin();scheduleAppearance44();toast('排程文字已儲存');
 });
}
