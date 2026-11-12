import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script=fs.readFileSync(new URL('../dist/material-history149.js',import.meta.url),'utf8');
const source=script.split('const calendarRowsBefore149')[0];
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
 assert.equal(c.calendarSearchHits149(root,'固定座','all'),4);
 assert.deepEqual([job,leave,receive,issue,adjacent].map(b=>b.active),[true,false,true,true,true]);
 assert.equal(issue.textContent,'領料 · 3 筆');
 assert.equal(c.calendarSearchHits149(root,'甲','leaves'),1);assert.equal(leave.active,true);
 c.canDo=()=>false;assert.equal(c.calendarSearchHits149(root,'甲','leaves'),0);assert.equal(leave.active,false);
 assert.equal(c.calendarSearchHits149(root,'','all'),0);
 assert.equal(adjacent.active,false);
});
test('work details highlight the exact original text including full-width matches',()=>{
 let output;
 const c=context({document:{
  createDocumentFragment:()=>({parts:[],append(value){this.parts.push(value)}}),
  createElement:tag=>({tag}),
 }});
 vm.runInContext(source,c);
 const node={data:'先記錄，９２６２試堆疊，另外有9262 <文字>',replaceWith(frag){output=frag.parts}};
 const first=c.calendarHighlightText149(node,'9262');
 assert.equal(first.textContent,'９２６２');
 assert.deepEqual(Array.from(output,p=>p.tag?[p.tag,p.textContent]:p),[
  '先記錄，',['mark','９２６２'],'試堆疊，另外有',['mark','9262'],' <文字>',
 ]);
});
test('desktop and mobile insert issues after jobs and leaves without reordering existing material chips',()=>{
 const day='2026-11-12',entries=['收料','送貨','收料'].map((category,id)=>({kind:'material',category,id:String(id)}));
 const button=(key,textContent,id)=>({textContent,dataset:{dayMaterialId:id},style:{},
  hasAttribute(name){return name===key||(name==='data-day-issues149'&&!!this.dataset.dayIssues149)},
  classList:{contains:name=>name===key},
 });
 for(const [jobs,leaves] of [[true,true],[true,false],[false,false]]){
  const prior=[...(jobs?['jobs']:[]),...(leaves?['leaves']:[])];
  const original=[...(jobs?[button('data-day-jobs','jobs')]:[]),...(leaves?[button('leave-link72','leaves')]:[]),
   ...entries.map(e=>button('data-day-material-id',e.id,e.id))];
  const sorted=[],links={querySelectorAll:()=>original,append:b=>sorted.push(b)};
  const cell={dataset:{day},querySelector:()=>links},root={querySelectorAll:()=>[cell]};
  const c=context({scheduleDraw56(){},mobileRows78:()=>[...prior.map(section=>({section,title:section})),...entries.map(e=>({section:'material',title:e.id,materialType:e.category==='收料'?'receipt':'delivery'}))],
   mobileOpen79(){},mobileCalendar78(){},canDo:()=>true,scheduleTab56:'daily',scheduleAnchor56:day,
   scheduleMonth56:()=>day,scheduleShift56:(_,n)=>n<0?'2026-11-01':'2026-12-01',
   scheduleData56:{entries},confirmed:{projects:[{name:'demo',materialLogs:[{time:day+'T00:00:00Z',issued:[item('固定座',1)]}]}]},
   $:selector=>selector==='#schedule-content56'?root:null,document:{createElement:()=>button()},
  });
  vm.runInContext(script,c);
  c.scheduleDraw56();
  const expected=[...prior,'領料 · 1 筆','0','2','1'];
  assert.deepEqual(sorted.map(b=>b.textContent),expected);
  assert.deepEqual(Array.from(c.mobileRows78(day),r=>r.title),expected);
 }
});

test('calendar search finds 105 on both visible month boundaries, but not offscreen records',()=>{
 const chip=dataset=>{const b={dataset,matched:false};b.classList={toggle:(_,value)=>{b.matched=value}};return b};
 const sep=chip({dayMaterialId:'sep'}),nov=chip({mobileMaterialId:'nov'}),offscreen=chip({dayMaterialId:'offscreen'});
 const cells=[{dataset:{day:'2026-09-30'},querySelector:()=>null,querySelectorAll:()=>[sep]},
  {dataset:{mobileDay:'2026-11-01'},querySelector:()=>null,querySelectorAll:()=>[nov]}];
 const c=context({scheduleAnchor56:'2026-10-01',canDo:()=>false,scheduleAssignees56:()=>[],scheduleData56:{
  entries:[{kind:'material',id:'sep',title:'105環片送鍍'},{kind:'material',id:'nov',project_name:'105',title:'收料'},{kind:'material',id:'offscreen',title:'105未顯示'}],
  reports:[{day:'2026-09-30',body:'105 測試'}],
 }});
 vm.runInContext(source+"\ncalendarSearch149='105';",c);
 assert.equal(c.calendarSearchHits149({querySelectorAll:()=>cells},'105','material'),2);
 assert.deepEqual([sep.matched,nov.matched,offscreen.matched],[true,true,false]);
 assert.equal(c.calendarJobQuery149('2026-09-30'),'105');
 assert.equal(c.calendarSearchHits149({querySelectorAll:()=>cells},'105未顯示','all'),0);
});
