import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../dist/material-history149.js',import.meta.url),'utf8').split('const calendarRowsBefore149')[0];
const context=(extra={})=>vm.createContext({taipeiDate:value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(new Date(value)),...extra});
const item=(name,qty,category)=>({name,qty,category});
test('warehouse history keeps receipts and issues separate and uses Taipei day and newest time',()=>{
 const c=context();vm.runInContext(source,c);
 const rows=c.materialRows149([{name:'SJ70-40',materialLogs:[
  {time:'2026-11-11T15:58:00Z',actor:'倉管',issued:[item('螺絲',3)],received:[]},
  {time:'2026-11-11T16:05:00Z',actor:'倉管',issued:[item('墊片',2),item('已送貨',1,'送貨')],received:[item('固定座',8)]},
  {time:'2026-11-11T16:12:00Z',actor:'倉管',correction:{delta:2}},
 ]}]);
 assert.deepEqual(Array.from(rows,r=>[r.day,r.kind,r.name,r.quantity]),[
  ['2026-11-12','issued','墊片',2],['2026-11-12','received','固定座',8],['2026-11-11','issued','螺絲',3],
 ]);
});
test('calendar highlights the existing chips without changing their labels or bypassing permissions',()=>{
 const button=textContent=>({textContent,dataset:{},active:false,classList:{toggle(_,value){this.owner.active=value}},});
 const [job,leave,receive,issue,adjacent]=['工作紀錄','請假紀錄','SJ70-40固定座','領料 · 3 筆','工作紀錄'].map(button);
 for(const b of [job,leave,receive,issue,adjacent])b.classList.owner=b;
 receive.dataset.dayMaterialId='receive';
 const cell=(day,buttons,material=[])=>({dataset:{day},querySelector:s=>buttons.find(([prefix])=>s.startsWith(prefix))?.[1],querySelectorAll:()=>material});
 const root={querySelectorAll:()=>[cell('2026-11-12',[['[data-day-jobs]',job],['.leave-link72',leave],['[data-day-issues149]',issue]],[receive]),cell('2026-10-31',[['[data-day-jobs]',adjacent]])]};
 const c=context({scheduleMonth56:d=>d.slice(0,7)+'-01',scheduleAnchor56:'2026-11-01',scheduleAssignees56:e=>e.assignee,leaveOnDay72:()=>true,canDo:()=>true,scheduleData56:{
  entries:[{kind:'daily',day:'2026-10-31',end_day:'2026-11-12',title:'固定座組裝',assignee:['甲']},{kind:'material',id:'receive',title:'固定座',project_name:'SJ70-40'}],
  reports:[],leaves:[{people:[{name:'甲'}],reason:'特休'}],
 }});
 vm.runInContext(source+'\ncalendarMaterialDays149.set("2026-11-12",[{name:"固定座",project:"SJ70-40"}]);',c);
 assert.equal(c.calendarSearchHits149(root,'固定座','all'),3);
 assert.deepEqual([job,leave,receive,issue,adjacent].map(b=>b.active),[true,false,true,true,false]);
 assert.equal(issue.textContent,'領料 · 3 筆');
 assert.equal(c.calendarSearchHits149(root,'甲','leaves'),1);assert.equal(leave.active,true);
 c.canDo=()=>false;assert.equal(c.calendarSearchHits149(root,'甲','leaves'),0);assert.equal(leave.active,false);
 assert.equal(c.calendarSearchHits149(root,'','all'),0);
});
