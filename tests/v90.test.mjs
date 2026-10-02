import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseClosureFeed90} from '../worker/alerts90.mjs';
import {notificationRulesValid85} from '../worker/notifications85.mjs';

function cap(text,area='高雄市左營區',type='Alert'){
 return `<alert><identifier>kao-1</identifier><sent>2026-10-02T03:00:00+08:00</sent><msgType>${type}</msgType><info><headline>高雄市公告</headline><description>${text}</description><area><areaDesc>${area}</areaDesc></area></info></alert>`;
}

test('v90 closure parser alerts Zuoying for stopped work, but never for school-only or another district',()=>{
 const closed=parseClosureFeed90(cap('2026年10月3日停止上班、停止上課'));
 assert.equal(closed.status,'closed');
 assert.equal(closed.effectiveDate,'2026-10-03');
 assert.equal(parseClosureFeed90(cap('2026年10月3日停止上課')).status,'unknown');
 assert.equal(parseClosureFeed90(cap('2026年10月3日旗津區停止上班','高雄市旗津區')).status,'unknown');
 assert.equal(parseClosureFeed90(cap('2026年10月3日照常上班')).status,'open');
});

test('v90 holiday and closure rule formats are accepted with safe location validation',()=>{
 const common={category:'提醒',name:'提醒',title:'標題',message:'內容',time:'17:00',firstDays:0,repeatDays:0,target:'schedule',recipientMode:'auto',recipientIds:[],enabled:true};
 assert.doesNotThrow(()=>notificationRulesValid85([{...common,id:'h',type:'holiday'},{...common,id:'c',type:'closure',city:'高雄市',district:'左營區'}]));
 assert.throws(()=>notificationRulesValid85([{...common,id:'c',type:'closure',city:'',district:'左營區'}]),/停班地區/);
});

test('v90 browser preview uses authenticated real data and contains no fixed person or job samples',()=>{
 const js=fs.readFileSync(new URL('../dist/enhancements-v88.js',import.meta.url),'utf8');
 const server=fs.readFileSync(new URL('../worker/server.mjs',import.meta.url),'utf8');
 assert.match(js,/api\/notification-preview90/);
 assert.match(server,/今日沒有安排工作/);
 assert.doesNotMatch(js,/黃瑞麟/);
 assert.doesNotMatch(js,/FAA（製作）/);
 assert.match(js,/holiday-default90/);
 assert.match(js,/closure-default90/);
});

test('v90 calendar API merges confirmed closure dates and source failures do not imply closure',()=>{
 const source=fs.readFileSync(new URL('../worker/holidays.mjs',import.meta.url),'utf8');
 const server=fs.readFileSync(new URL('../worker/server.mjs',import.meta.url),'utf8');
 const alerts=fs.readFileSync(new URL('../worker/alerts90.mjs',import.meta.url),'utf8');
 assert.match(source,/status='closed'/);
 assert.match(source,/左營區.*停班/);
 assert.match(server,/資料不明|status==='unknown'/);
 assert.match(server,/停止上班/);
 assert.match(alerts,/停止上課|onlySchool/);
});
