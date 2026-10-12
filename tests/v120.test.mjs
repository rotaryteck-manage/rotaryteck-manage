import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('dist/meetings117.js','utf8');
function functions(name,end,globals={}){const context=vm.createContext({receiptTime:value=>value,...globals});vm.runInContext(source.slice(source.indexOf('function '+name+'('),source.indexOf(end,source.indexOf('function '+name+'('))),context);return context}
const item={id:'m120',day:'2026-01-01',time:'08:30',place:'會議室',attendees:[{id:1,name:'出席甲'},{id:2,name:'出席乙'}],notes:[{content:'【FAA】\n(出席甲)→2天完成',suggestion:'備註完整保留'},{content:'第二列',suggestion:'最後一列備註'}],updated_at:'2026-01-01 09:00',editor_name:'主管'},text={tab:'週會紀錄',place:'會議地點',time:'會議時間',number:'筆記',content:'內容',suggestion:'備註',lastEdit:'最後編輯'};
test('12.0v reading record keeps attendees, multiline notes and suggestions; noon and midnight display correctly',()=>{
 const c=functions('meetingTime120','\nfunction meetingRead120');const record=c.meetingRecordText120(item,text);assert.equal(record.title,'2026/01/01週會紀錄');assert.equal(record.metadata[0][1],'出席甲、出席乙');assert.equal(record.metadata[2][1],'2026/01/01 08:30 AM');assert.equal(record.notes[0][1],item.notes[0].content);assert.equal(record.notes[1][2],'最後一列備註');assert.match(record.lastEdit,/主管/);
 assert.match(c.meetingTime120({...item,time:'00:05'}),/12:05 AM/);assert.match(c.meetingTime120({...item,time:'12:30'}),/12:30 PM/);assert.match(c.meetingTime120({...item,time:'23:40'}),/11:40 PM/);
});
test('12.0v image includes metadata and every content/suggestion line, with full height for long notes',()=>{
 const drawn=[],ctx={font:'',measureText:value=>({width:[...value].length*12}),scale(){},fillRect(){},strokeRect(){},fillText(value){drawn.push(value)}},canvas={getContext:()=>ctx};
 const c=functions('meetingTime120','\nasync function meetingCopy120',{document:{createElement:()=>canvas}});const long={...item,notes:[...item.notes,{content:Array.from({length:80},(_,i)=>'長內容第'+(i+1)+'行').join('\n'),suggestion:'圖片底部備註不能遺漏'}]};c.meetingCanvas120(long,text);
 for(const value of ['2026/01/01週會紀錄','參加人員：出席甲、出席乙','會議時間：2026/01/01 08:30 AM','【FAA】','(出席甲)→2天完成','備註完整保留','最後一列備註','長內容第80行','圖片底部備註不能遺漏'])assert.ok(drawn.includes(value),value);assert.ok(canvas.height>4500);assert.ok(canvas.width>1200);
});
test('12.0v wrapping preserves line breaks and complete emoji graphemes',()=>{
 const c=functions('meetingWrap120','\nfunction meetingCanvas120');const family='👨‍👩‍👦';const lines=c.meetingWrap120({measureText:value=>({width:value===family?10:[...value].length*10})},'甲\n'+family+'乙',10);assert.deepEqual(Array.from(lines),['甲',family,'乙']);
});
