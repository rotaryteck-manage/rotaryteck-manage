'use strict';

// Keep the work-report action in the dialog footer so it stays visible while
// the daily record list scrolls. Moving the existing button preserves all
// permissions and its original click handler.
const scheduleDayRecordBefore106=scheduleDayRecord56;
scheduleDayRecord56=function(...args){
 const result=scheduleDayRecordBefore106.apply(this,args);
 const modal=document.querySelector('#modal[open]');
 const button=modal?.querySelector('.schedule-records67 #schedule-add-report');
 const footer=modal?.querySelector('#dialog-form>.modal-foot');
 if(button&&footer){
  footer.dataset.workRecordFooter106='';
  footer.prepend(button);
 }
 return result;
};

document.documentElement.dataset.appVersion='10.9v';
