import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('dist/schedule-v67.js','utf8');
function fixture(overrides={}){
 const sizes=[],draws=[];let closed=0;
 const ctx=vm.createContext({File,Blob,FormData,URL,crypto,console,
  scheduleDraw56(){},scheduleDayRecord56(){},scheduleReportDialog56(){},scheduleMaterialDialog61(){},
  compressReceiptImage:async(file,limit)=>{sizes.push(limit);if(file.size<=limit)return file;throw Error('圖片壓縮後仍超過 800 KB，請先裁切後再上傳')},
  decodePhoto89:async()=>({width:6000,height:3000,close(){closed++}}),
  document:{createElement:()=>({width:0,height:0,getContext(){return {fillRect(){},drawImage(...args){draws.push(args)},set fillStyle(v){}}}})},
  canvasBlob:async canvas=>new Blob([new Uint8Array(canvas.width>300?900*1024:700*1024)],{type:'image/jpeg'}),...overrides});
 vm.runInContext(source,ctx);return {ctx,sizes,draws,closed:()=>closed,compress:file=>{ctx.file=file;return vm.runInContext('compressReportPhoto144(file)',ctx)}};
}
test('工作照片固定750KB目標，小圖保持原檔，其餘區域仍使用原壓縮器',async()=>{
 const f=fixture(),small=new File(['photo'],'small.jpg',{type:'image/jpeg'});assert.equal(await f.compress(small),small);assert.deepEqual(f.sizes,[750*1024]);
 const shared=fs.readFileSync('dist/uploads.js','utf8');assert.match(shared,/maxBytes=800\*1024/);
});
test('大圖持續縮小尺寸直到符合上限，保持整張畫面與比例，釋放圖片資源',async()=>{
 const f=fixture(),file=new File([new Uint8Array(790*1024)],'大照片.png',{type:'image/png'}),photo=await f.compress(file);
 assert.ok(photo.size<=750*1024);assert.equal(photo.type,'image/jpeg');assert.equal(photo.name,'大照片.jpg');assert.ok(f.draws.length>1);assert.equal(f.closed(),1);
 for(const args of f.draws){assert.equal(args.length,5);assert.equal(args[1],0);assert.equal(args[2],0);assert.ok(Math.abs(args[3]/args[4]-2)<.03)}
});
test('無法讀取或壓縮的照片顯示檔名及原因，壓縮失敗不會回傳超標檔案',async()=>{
 const file=new File(['x'],'失敗照片.heic',{type:'image/heic'}),f=fixture({compressReceiptImage:async()=>{throw Error('照片無法讀取')}});
 await assert.rejects(f.compress(file),/失敗照片.heic：照片無法讀取/);
 const broken=fixture({compressReceiptImage:async()=>new File([new Uint8Array(800*1024)],'large.jpg',{type:'image/jpeg'}),canvasBlob:async()=>new Blob([new Uint8Array(751*1024)],{type:'image/jpeg'})});
 await assert.rejects(broken.compress(file),/失敗照片.heic：裝置無法將照片壓縮至 750 KB/);assert.equal(broken.closed(),1);
});
test('多張回報先全部檢查，第二張失敗不送出，保留文字及待上傳照片供重試',async()=>{
 const element=()=>({style:{},children:[],value:'',files:[],disabled:false,dataset:{},setAttribute(){},append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},addEventListener(){},set innerHTML(v){this.children=[]},get innerHTML(){return ''}});
 const input=element(),hint=element(),preview=element(),day=element(),entry=element();day.isConnected=true;let save,posted=0,closed=0,fail=true,upload;
 const dialog={querySelector:s=>s.includes('photo-report80')?input:s.includes('paste-hint')?hint:s.includes('upload-preview')?preview:s.includes('entryId')?entry:s.includes('name=day')?day:element(),close(){closed++}};
 const f=fixture({$:()=>dialog,currentUser:{name:'小明'},state:{projects:[]},scheduleLoadedRange56:'daily:2026-11-01:2026-11-30',scheduleData56:{entries:[{id:'work',kind:'daily',day:'2026-11-05',end_day:'2026-11-05'}]},scheduleAssignees56:()=>['小明'],scheduleEsc56:String,scheduleLabel63:()=> 'FAA',modal:(_title,_body,_label,callback)=>{save=callback},alert(){},scheduleRender56(){},document:{createElement:element},compressReceiptImage:async(file,limit)=>{assert.equal(limit,750*1024);if(fail&&file.name==='second.jpg')throw Error('裝置無法讀取');return file},apiFetch:async(_url,options)=>{posted++;upload=options.body;return Response.json({ok:true})}});
 f.ctx.scheduleReportDialog56('2026-11-05');input.files=[new File(['a'],'first.jpg',{type:'image/jpeg'}),new File(['b'],'second.jpg',{type:'image/jpeg'})];input.onchange();
 const fd=new FormData();fd.set('day','2026-11-05');fd.set('entryId','work');fd.set('body','保留我的回報內容');
 await assert.rejects(save(fd),/second.jpg：裝置無法讀取/);assert.equal(posted,0);assert.equal(closed,0);assert.equal(preview.children.length,2);assert.equal(fd.get('body'),'保留我的回報內容');
 fail=false;await save(fd);assert.equal(posted,1);assert.equal(upload.getAll('photo').length,2);assert.equal(upload.get('body'),'保留我的回報內容');assert.equal(closed,1);
});

test('the unplanned report fields follow the selected date, and assigned reports keep the original fields',async()=>{
 const element=()=>({hidden:false,disabled:false,isConnected:true,value:'',innerHTML:'',addEventListener(){}});
 const selectors=['[name=day]','[name=entryId]','[name=title]','#schedule-report-assigned166','#schedule-report-unassigned166','[name=photo-report80]','#schedule-paste-hint','#schedule-upload-preview80'];
 const fields=Object.fromEntries(selectors.map(s=>[s,element()]));
 const date=fields['[name=day]'],entry=fields['[name=entryId]'],unassigned=fields['#schedule-report-unassigned166'];
 const job={id:'work',kind:'daily',day:'2026-11-18',end_day:'2026-11-18',assignee_ids:'["2"]'};
 let html,complete;
 const f=fixture({
  $:()=>({querySelector:s=>fields[s]}),currentUser:{id:2,name:'小明'},scheduleData56:{entries:[job],options:{items:['SJ105','治具維護']}},
  scheduleLoadedRange56:'daily:2026-11-01:2026-11-30',scheduleEsc56:String,scheduleLabel63:()=> '環片整理',
  modal:(_,body)=>{html=body},apiFetch:()=>new Promise(resolve=>{complete=resolve})
 });
 f.ctx.scheduleReportDialog56('2026-11-18');
 assert.equal(unassigned.hidden,true);assert.match(entry.innerHTML,/value="work"/);
 date.value='2026-11-19';date.onchange();
 assert.equal(entry.disabled,true);assert.equal(unassigned.hidden,false);assert.equal(fields['[name=title]'].disabled,false);
 assert.match(html,/回報未排程工作<select name="title"/);assert.doesNotMatch(html,/name="projectName"|placeholder="工作名稱"/);
 assert.match(fields['[name=title]'].innerHTML,/value="SJ105".*value="治具維護"/);
 date.value='2026-12-02';const lookup=date.onchange();
 assert.equal(unassigned.hidden,true);
 complete(Response.json({entries:[{...job,day:date.value,end_day:date.value}]}));await lookup;
 assert.equal(unassigned.hidden,true);assert.match(entry.innerHTML,/value="work"/);
 date.value='2026-12-03';const failed=date.onchange();
 complete(Response.json({error:'unavailable'},{status:503}));await failed;
 assert.equal(unassigned.hidden,true);assert.match(entry.innerHTML,/無法確認工作項目/);
});
