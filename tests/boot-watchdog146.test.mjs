import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('startup timeout offers a reload even without any application scripts',()=>{
 const html=fs.readFileSync('dist/index.html','utf8');
 const script=html.match(/<script id="boot-watchdog146">([\s\S]*?)<\/script>/)[1];
 function run(ready){
  let expire,click,reloads=0;
  const retry={hidden:true,style:{removeProperty(){}},addEventListener(type,fn){assert.equal(type,'click');click=fn}};
  const bars={style:{}},message={textContent:'正在載入管理系統'};
  const nodes={'boot-loading76':{classList:{contains:()=>ready}},'boot-bars146':bars,'boot-message146':message,'boot-retry146':retry};
  vm.runInNewContext(script,{document:{getElementById:id=>nodes[id]},window:{addEventListener(){}},setTimeout(fn,ms){assert.equal(ms,30000);expire=fn},location:{reload(){reloads++}}});
  expire();
  if(!ready){assert.equal(bars.style.display,'none');assert.match(message.textContent,/載入時間過久/);click();assert.equal(reloads,1)}
  assert.equal(retry.hidden,ready);
 }
 run(false);run(true);
});
