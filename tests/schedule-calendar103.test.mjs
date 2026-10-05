import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
const shift=(day,n)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const entries=[
 {kind:'material',id:'z-last',day:'2026-10-05',project_name:'',title:'測試',created_at:'2026-10-05T09:03:00Z'},
 {kind:'material',id:'a-first',day:'2026-10-05',project_name:'',title:'105',created_at:'2026-10-05T09:01:00Z'},
 {kind:'material',id:'b-second',day:'2026-10-05',project_name:'',title:'105',created_at:'2026-10-05T09:02:00Z'},
 {kind:'material',id:'c-third',day:'2026-10-05',project_name:'',title:'測試',created_at:'2026-10-05T09:02:30Z'},
 {kind:'daily',id:'work',day:'2026-10-05',end_day:'2026-10-05',created_at:'2026-10-05T08:00:00Z'}
];

test('desktop and mobile put work and leave before material in creation order',()=>{
 const mobile={matchMedia:()=>({matches:true}),scheduleData56:{entries,reports:[],leaves:[{start_at:'2026-10-05T08:30',end_at:'2026-10-05T17:30'}]},canDo:()=>true,leaveOnDay72:()=>true};
 const mobileSource=read('mobile-v78.js');vm.runInNewContext(mobileSource.slice(0,mobileSource.indexOf('function mobileOpen79')),mobile);
 assert.deepEqual(Array.from(mobile.mobileRows78('2026-10-05'),x=>x.title),['工作紀錄','請假紀錄','105','105','測試','測試']);
 const root={innerHTML:'',querySelectorAll:()=>[]},desktop={scheduleDraw56(){},scheduleDayRecord56(){},scheduleData56:{entries,reports:[]},scheduleTab56:'daily',scheduleAnchor56:'2026-10-05',scheduleMonth56:day=>day.slice(0,7)+'-01',scheduleShift56:shift,scheduleEsc56:String,scheduleDecorate60(){},$:()=>root};
 vm.runInNewContext(read('schedule-v67.js'),desktop);desktop.scheduleDraw56();
 const day=root.innerHTML.match(/data-day="2026-10-05"[^]*?(?=<\/div><div class="schedule-calendar-day|<\/div><\/div>$)/)?.[0]||root.innerHTML;
 const ids=Array.from(day.matchAll(/data-day-material-id="([^"]+)"/g),m=>m[1]);
 assert.deepEqual(ids.slice(0,4),['a-first','b-second','c-third','z-last']);
});
