'use strict';

// Daily "修改安排" only: keep the stored work order stable and start every
// existing work card collapsed. Other schedule dialogs and views are untouched.
const scheduleEntryDialogBefore107=scheduleEntryDialog56;

function scheduleDailyOrder107(left,right){
 const leftOrder=Number(left.sort_index),rightOrder=Number(right.sort_index);
 const leftHas=Number.isFinite(leftOrder)&&leftOrder>=0,rightHas=Number.isFinite(rightOrder)&&rightOrder>=0;
 if(leftHas!==rightHas)return leftHas?-1:1;
 if(leftHas&&leftOrder!==rightOrder)return leftOrder-rightOrder;
 const created=String(left.created_at||'').localeCompare(String(right.created_at||''));
 return created||String(left.id||'').localeCompare(String(right.id||''));
}

scheduleEntryDialog56=function(entry){
 if(scheduleTab56!=='daily')return scheduleEntryDialogBefore107.apply(this,arguments);
 const original=scheduleData56.entries||[],day=entry?.day||scheduleAnchor56;
 const daily=original.filter(item=>item.kind==='daily'&&item.day<=day&&item.end_day>=day).sort(scheduleDailyOrder107);
 const ordered=daily.map((item,index)=>({...item,sort_index:index+1}));let position=0;
 scheduleData56.entries=original.map(item=>item.kind==='daily'&&item.day<=day&&item.end_day>=day?ordered[position++]:item);
 let result;
 try{result=scheduleEntryDialogBefore107.apply(this,arguments)}
 finally{scheduleData56.entries=original}
 if(!entry)return result;
 const list=document.querySelector('#modal[open] #schedule-task-list60');
 if(!list)return result;
 for(const task of list.querySelectorAll(':scope > .schedule-task60[data-existing-id]')){
  task.classList.add('is-collapsed88');
  task.querySelector('.schedule-card-toggle88')?.setAttribute('aria-expanded','false');
 }
 return result;
};

document.documentElement.dataset.appVersion='10.9v';
