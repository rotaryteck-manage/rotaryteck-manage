'use strict';
let pcbData171={projects:[],links:[],fixtures:[],photos:[],events:[]},pcbProjectId171='',pcbTab171='pcb',pcbSearch171='',pcbLoadToken171=0;
const pcbEsc171=x=>esc(String(x??''));
const pcbCanUI171=cap=>canDo('pcb.'+cap);
const pcbAuditAllowed172=()=>currentUser.role==='supervisor';
const pcbTabs172=()=>[['pcb','PCB庫存'],['fixture','治具管理'],...(pcbAuditAllowed172()?[['events','異動紀錄']]:[])];
const pcbTime171=x=>x?receiptTime(x):'';
const pcbCompare176=(a,b)=>String(a).localeCompare(String(b),'zh-Hant',{numeric:true,sensitivity:'base'});
const pcbLinks171=id=>pcbData171.links.filter(l=>l.project_id===id).sort((a,b)=>pcbCompare176(a.label,b.label));
function pcbSets171(links){
 if(!links.length||links.some(l=>!Number.isInteger(l.per_set)||l.per_set<=0))return null;
 const map=new Map();for(const l of links){const x=map.get(l.item_id)||{stock:l.stock,need:0};x.need+=l.per_set;map.set(l.item_id,x);}
 return Math.min(...[...map.values()].map(x=>Math.floor(x.stock/x.need)));
}
function pcbOptions171(values,value=''){return values.map(([id,label])=>'<option value="'+pcbEsc171(id)+'" '+(String(id)===String(value)?'selected':'')+'>'+pcbEsc171(label)+'</option>').join('');}
function pcbPhotoList171(type,id){return pcbData171.photos.filter(p=>p.entity_type===type&&p.entity_id===id);}
function pcbThumb171(type,id){
 const photos=pcbPhotoList171(type,id);
 return '<button type="button" class="pcb-thumb171" data-pcb-photos171="'+pcbEsc171(type)+'" data-pcb-entity171="'+pcbEsc171(id)+'" aria-label="'+(photos.length?'查看照片，共 '+photos.length+' 張':'新增照片')+'">'+(photos.length?'<img loading="lazy" src="/api/pcb?photo='+encodeURIComponent(photos[0].id)+'" alt="照片">':'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 5h8l2 3h3v12H3V8h3z"/><circle cx="12" cy="13" r="3"/></svg>')+'</button>';
}
async function pcbFetch171(project=''){
 const response=await apiFetch('/api/pcb'+(project?'?project='+encodeURIComponent(project):'')),data=await response.json();
 if(!response.ok)throw Error(data.error||'PCB資料讀取失敗');return data;
}
async function pcbRefresh171(project=pcbProjectId171){
 const data=await pcbFetch171(project);pcbData171=data;pcbPaint171();
 if(project)pcbOpen171(project,pcbTab171);
}
async function pcbSend171(input){const response=await apiFetch('/api/pcb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),data=await response.json();if(!response.ok)throw Error(data.error||'儲存失敗');return data;}
function pcbForm171(title,body,submit,getInput,after){
 let previous='',requestId='';
 modal(title,body,submit,async fd=>{
  const input=getInput(fd),signature=JSON.stringify(input);
  if(signature!==previous){requestId=crypto.randomUUID();previous=signature;}
  const result=await pcbSend171({...input,requestId});if(after)await after(result);else await pcbRefresh171();toast('已儲存');
 });
 if(pcbProjectId171){
  $('#cancel-modal').textContent='返回案件';
  $('#cancel-modal').onclick=$('#close-modal').onclick=()=>{if($('#dialog-form')?.dataset.busy!=='1')pcbOpen171(pcbProjectId171,pcbTab171)};
 }
}
function pcbPaint171(){
 const root=$('.pcb-workspace171');if(!root)return;
 const filtered=pcbData171.projects.filter(p=>(p.name+' '+p.note+' '+pcbLinks171(p.id).map(l=>l.label).join(' ')).toLowerCase().includes(pcbSearch171.toLowerCase())).sort((a,b)=>pcbCompare176(a.name,b.name));
 root.querySelector('[data-pcb-grid171]').innerHTML=filtered.map(p=>{
  const links=pcbLinks171(p.id),sets=pcbSets171(links),missing=links.filter(l=>l.per_set&&l.stock<l.per_set).map(l=>l.label),taken=pcbData171.fixtures.filter(f=>f.project_id===p.id&&f.holder_id);
  return '<button type="button" class="pcb-project171" data-pcb-project171="'+pcbEsc171(p.id)+'"><strong>'+pcbEsc171(p.name)+'</strong><span>'+(!links.length?'尚未建立PCB':sets===null?'每套用量未設定':'可製作 '+sets+' 套')+'</span>'+((links.length||taken.length)?'<small>'+(links.length?'<span>'+links.length+' 種PCB</span>':'')+(taken.length?'<span>'+taken.length+' 組治具領用中</span>':'')+'</small>':'')+(missing.length?'<small class="error">不足一套：'+pcbEsc171(missing.join('、'))+'</small>':'')+'</button>';
 }).join('')||'<p class="muted">'+(pcbSearch171?'找不到符合的案件':'尚無PCB案件，請新增案件開始登記。')+'</p>';
 root.querySelectorAll('[data-pcb-project171]').forEach(b=>b.onclick=async()=>{try{pcbProjectId171=b.dataset.pcbProject171;pcbTab171='pcb';await pcbRefresh171()}catch(e){toast(e.message)}});
}
const pcbPagesBefore171=managementPages;
managementPages=function(){
 const pages=pcbPagesBefore171();if(!pcbCanUI171('view'))return pages;
 const at=pages.findIndex(p=>p.id==='wire'),fallback=pages.findIndex(p=>p.id==='schedule');
 pages.splice(at>=0?at+1:fallback>=0?fallback:pages.length,0,{id:'pcb',title:'PCB管理'});return pages;
};
const pcbRenderBefore171=render;
render=function(){pcbRenderBefore171();if(location.hash==='#pcb'&&pcbCanUI171('view'))pcbRender171();};
function pcbRender171(){
 $('.pcb-workspace171')?.remove();pcbProjectId171='';
 const main=$('main');if(!main)return;
 const root=document.createElement('section');root.className='workspace pcb-workspace171';
 const tools=(pcbCanUI171('fixture')?'<button type="button" data-pcb-holders171>治具領用總覽</button>':'')+(pcbCanUI171('export')?'<button type="button" data-pcb-export171>匯出PCB資料</button>':'')+(pcbCanUI171('manage')&&pcbCanUI171('stock')?'<button type="button" data-pcb-import171>匯入原表</button>':'');
 root.innerHTML='<div class="pcb-head171"><h2>PCB管理</h2><div class="pcb-tools171"><input type="search" data-pcb-search171 placeholder="搜尋案件或PCB編號" aria-label="搜尋PCB案件" value="'+pcbEsc171(pcbSearch171)+'">'+(pcbCanUI171('manage')?'<button type="button" class="primary" data-pcb-new171>＋ 新增案件</button>':'')+(tools?'<details class="pcb-more-menu176"><summary>更多</summary><div class="pcb-menu-items176">'+tools+'</div></details>':'')+'</div></div><div data-pcb-grid171 class="pcb-grid171">正在載入PCB資料…</div>';
 main.append(root);
 root.querySelector('.pcb-menu-items176')?.addEventListener('click',e=>{if(e.target.closest('button'))root.querySelector('.pcb-more-menu176').open=false});
 root.querySelector('[data-pcb-search171]').oninput=e=>{pcbSearch171=e.target.value;pcbPaint171()};
 root.querySelector('[data-pcb-import171]')?.addEventListener('click',()=>pcbImport171());
 root.querySelector('[data-pcb-new171]')?.addEventListener('click',()=>pcbProjectForm171());
 root.querySelector('[data-pcb-export171]')?.addEventListener('click',()=>pcbExport171());
 root.querySelector('[data-pcb-holders171]')?.addEventListener('click',()=>pcbHolders171());
 const token=++pcbLoadToken171;
 pcbFetch171().then(data=>{if(token!==pcbLoadToken171||!root.isConnected)return;pcbData171=data;pcbPaint171()}).catch(error=>{if(!root.isConnected)return;const grid=root.querySelector('[data-pcb-grid171]');if(grid)grid.textContent='載入失敗：'+error.message+'。請重新開啟PCB管理重試。'});
}
function pcbProjectForm171(p){
 pcbForm171(p?'修改案件':'新增PCB案件',field('案名','name',p?.name||'','required maxlength="100"')+'<label class="field">備註<textarea class="pcb-edit-note176" name="note" rows="2" maxlength="1000">'+pcbEsc171(p?.note||'')+'</textarea></label>','儲存',fd=>({action:'project',...(p?{id:p.id,revision:p.revision}:{}),name:String(fd.get('name')).trim(),note:String(fd.get('note')||'')}),async result=>{pcbProjectId171=result.id;pcbTab171='pcb';await pcbRefresh171()});
}
function pcbOpen171(id,tab='pcb'){
 if(!pcbTabs172().some(([key])=>key===tab))tab='pcb';
 const p=pcbData171.projects.find(x=>x.id===id);if(!p)return;
 pcbProjectId171=id;pcbTab171=tab;const links=pcbLinks171(id),fixtures=pcbData171.fixtures.filter(f=>f.project_id===id);
 let body='<div class="pcb-case-controls173"><div class="pcb-tabs171">'+pcbTabs172().map(([k,label])=>'<button type="button" data-pcb-tab171="'+k+'" class="'+(tab===k?'selected':'')+'">'+label+'</button>').join('')+'</div>'+(pcbCanUI171('manage')?'<button type="button" data-pcb-edit-project171>修改案件</button>':'')+'</div>';
 if(tab==='pcb'){
  const sets=pcbSets171(links);
  body+='<div class="pcb-toolbar171"><strong>'+(sets===null?'整案可製作套數：未設定':'整案可製作 '+sets+' 套')+'</strong><div>'+(pcbCanUI171('stock')?'<button type="button" data-pcb-set171>整套領料</button>':'')+(pcbCanUI171('manage')?'<button type="button" data-pcb-add-link171>＋ 新增PCB</button>':'')+'</div></div><div class="pcb-scroll171"><table class="pcb-table171 pcb-inventory176"><thead><tr><th>照片</th><th>PCB編號</th><th>存量</th><th>每套用量</th><th>可製作套數</th><th>操作</th></tr></thead><tbody>'+
   links.map(l=>{
    const shared=[...new Set(pcbData171.links.filter(x=>x.item_id===l.item_id&&x.project_id!==id).map(x=>pcbData171.projects.find(p=>p.id===x.project_id)?.name).filter(Boolean))];
    return '<tr><td>'+pcbThumb171('pcb',l.item_id)+'</td><td><strong>'+pcbEsc171(l.label)+'</strong>'+(l.note?'<small class="pcb-note176" title="'+pcbEsc171(l.note)+'">'+pcbEsc171(l.note)+'</small>':'')+(shared.length?'<small class="pcb-shared171" title="共用同一份庫存，收料與領料會同步">共用：'+pcbEsc171(shared.join('、'))+'</small>':'')+'</td><td class="'+(l.per_set&&l.stock<l.per_set?'error':'')+'">'+l.stock+'</td><td>'+(l.per_set??'未設定')+'</td><td>'+(l.per_set?Math.floor(l.stock/l.per_set):'未設定')+'</td><td><div class="pcb-row-actions171">'+(pcbCanUI171('stock')?'<button type="button" data-pcb-stock171="receipt" data-link="'+l.id+'">收料</button><button type="button" data-pcb-stock171="issue" data-link="'+l.id+'">領料</button>':'')+'<button type="button" class="pcb-text-action176" data-pcb-detail171="'+l.id+'">'+(pcbCanUI171('manage')?'修改':'查看')+'</button></div></td></tr>';
   }).join('')+'</tbody></table></div>'+(!links.length?'<p class="muted">尚無PCB，請新增編號與每套用量。</p>':'');
 }else if(tab==='fixture'){
  body+='<div class="pcb-toolbar171"><strong>治具清單</strong>'+(pcbCanUI171('manage')?'<button type="button" data-pcb-add-fixture171>＋ 新增治具</button>':'')+'</div><div class="pcb-fixtures171">'+fixtures.map(f=>{
   let applies=[];try{applies=JSON.parse(f.applies)}catch{}
   return '<article class="pcb-fixture171 pcb-fixture176">'+pcbThumb171('fixture',f.id)+'<div><strong>'+pcbEsc171(f.name)+'</strong><small>適用：'+pcbEsc171(applies.map(id=>links.find(l=>l.id===id)?.label).filter(Boolean).join('、')||'未設定')+'</small><span class="pcb-status171 '+(f.holder_id?'taken':'')+'">'+(f.holder_id?'領用中 · '+pcbEsc171(f.holder_name):'在庫')+'</span>'+(f.taken_at?'<small class="pcb-fixture-time176">'+pcbEsc171(pcbTime171(f.taken_at))+'</small>':'')+(f.note?'<small class="pcb-note176" title="'+pcbEsc171(f.note)+'">'+pcbEsc171(f.note)+'</small>':'')+'</div><div class="pcb-fixture-actions171">'+(pcbCanUI171('fixture')?'<button type="button" data-pcb-take171="'+f.id+'">'+(f.holder_id?'歸還':'領用')+'</button>':'')+(pcbCanUI171('manage')?'<button type="button" class="pcb-text-action176" data-pcb-edit-fixture171="'+f.id+'">修改</button>':'')+'</div></article>';
  }).join('')+'</div>'+(!fixtures.length?'<p class="muted">尚無治具。可建立一組適用A、B、C，或分別建立三組治具。</p>':'');
 }else{
  body+='<label class="field pcb-event-filter171">紀錄類型<select data-pcb-event-filter171><option value="">全部</option><option value="PCB">PCB收領料</option><option value="治具">治具領用／歸還</option></select></label><div class="pcb-scroll171"><table class="pcb-audit172"><thead><tr><th>時間</th><th>操作人</th><th>動作</th><th>內容</th></tr></thead><tbody>'+pcbData171.events.filter(ev=>ev.project_id===id).map(ev=>'<tr data-pcb-event-type171="'+(ev.type.includes('治具')?'治具':ev.type.includes('料')||ev.type==='庫存校正'||ev.type==='變更庫存來源'?'PCB':'其他')+'"><td class="pcb-audit-time172">'+pcbEsc171(pcbTime171(ev.created_at))+'</td><td>'+pcbEsc171(ev.actor_name)+'</td><td class="pcb-audit-action172">'+pcbEsc171(ev.type)+'</td><td class="pcb-audit-detail172">'+pcbEsc171(pcbEventDetail171(ev)||'—')+'</td></tr>').join('')+'</tbody></table></div><small class="muted">'+(pcbData171.events.some(ev=>ev.project_id===id)?'顯示最近300筆紀錄。':'尚無異動紀錄。')+'</small>';
 }
 modal(p.name,body,null);
 $('#modal').classList.add('pcb-dialog171');
 $('#modal').querySelectorAll('[data-pcb-tab171]').forEach(b=>b.onclick=()=>pcbOpen171(id,b.dataset.pcbTab171));
 $('[data-pcb-edit-project171]')?.addEventListener('click',()=>pcbProjectForm171(p));
 $('[data-pcb-add-link171]')?.addEventListener('click',()=>pcbLinkForm171());
 $('[data-pcb-set171]')?.addEventListener('click',()=>pcbSetForm171());
 $('[data-pcb-add-fixture171]')?.addEventListener('click',()=>pcbFixtureForm171());
 $('#modal').querySelectorAll('[data-pcb-stock171]').forEach(b=>b.onclick=()=>pcbStockForm171(links.find(l=>l.id===b.dataset.link),b.dataset.pcbStock171));
 $('#modal').querySelectorAll('[data-pcb-detail171]').forEach(b=>b.onclick=()=>{const l=links.find(l=>l.id===b.dataset.pcbDetail171);if(pcbCanUI171('manage'))pcbLinkForm171(l);else pcbLinkDetail171(l)});
 $('#modal').querySelectorAll('[data-pcb-edit-fixture171]').forEach(b=>b.onclick=()=>pcbFixtureForm171(fixtures.find(f=>f.id===b.dataset.pcbEditFixture171)));
 $('#modal').querySelectorAll('[data-pcb-take171]').forEach(b=>b.onclick=()=>pcbTakeForm171(fixtures.find(f=>f.id===b.dataset.pcbTake171)));
 pcbBindPhotos171();
 $('[data-pcb-event-filter171]')?.addEventListener('change',e=>$('#modal').querySelectorAll('[data-pcb-event-type171]').forEach(row=>row.hidden=!!e.target.value&&row.dataset.pcbEventType171!==e.target.value));
}
function pcbEventDetail171(ev){
 let d;try{d=JSON.parse(ev.detail)}catch{return ev.detail}
 if(d.changes)return[d.reason,...d.changes.map(c=>{
  const labels=(d.items||[]).filter(i=>i.itemId===c.itemId).map(i=>i.label).join('、');
  return labels+'：'+c.before+' → '+c.after+'（'+(c.delta>0?'+':'')+c.delta+'）';
 })].join('\n');
 return [d.name,d.label,d.fixture,d.holder?'領用人：'+d.holder:'',d.location?'位置：'+d.location:'',d.note,d.reason,d.file,d.count?(ev.type==='新增照片'?'照片 '+d.count+' 張':'PCB '+d.count+' 項'):''].filter(Boolean).join('｜');
}
function pcbSourcePlan175(l,sourceCount,mode,sourceId){
 if(!l)return mode==='shared'&&!sourceId?'missing':'new';
 if(mode==='independent')return sourceCount>1?'split':'none';
 if(!sourceId)return 'missing';
 if(sourceId===l.item_id)return 'none';
 return sourceCount>1?'switch':'join';
}
function pcbLinkForm171(l){
 const sourceCount=l?(l.source_count??pcbData171.links.filter(x=>x.item_id===l.item_id).length):0;
 const initialMode=l&&sourceCount>1?'shared':'independent',initialSource=initialMode==='shared'?l.item_id:'';
 const canChange=!l||pcbCanUI171('stock');
 const items=new Map();
 for(const x of pcbData171.links){if(x.id!==l?.id&&!items.has(x.item_id))items.set(x.item_id,x)}
 if(initialSource&&!items.has(initialSource))items.set(initialSource,l);
 const sourceLabel=x=>{const aliases=pcbData171.links.filter(y=>y.item_id===x.item_id&&y.id!==l?.id),rows=aliases.length?aliases:[x];return rows.map(y=>(pcbData171.projects.find(p=>p.id===y.project_id)?.name||'')+' · '+y.label).join('／')+'（存量 '+x.stock+'）'};
 const locked=canChange?'':'disabled';
 pcbForm171(l?'修改PCB':'新增PCB',
  '<div class="pcb-basic-grid176">'+field('PCB編號／版本','label',l?.label||'','required maxlength="100"')+field('每套用量','perSet',l?.per_set??'','type="number" min="1" max="1000000" step="1" placeholder="未設定"')+'</div>'+
  (!l?'<div data-pcb-initial175>'+field('初始庫存','stock','0','type="number" min="0" max="1000000000" step="1" required')+'</div>':'<div class="pcb-stock-summary176"><span>庫存 <strong>'+l.stock+'</strong> 片</span><span>'+(l.per_set?'可製作 '+Math.floor(l.stock/l.per_set)+' 套':'每套用量未設定')+'</span></div>')+
  '<label class="field">備註<textarea class="pcb-edit-note176" name="note" rows="2" maxlength="1000">'+pcbEsc171(l?.note||'')+'</textarea></label>'+
  '<details class="pcb-source-settings176" data-pcb-source-settings176><summary><span>庫存來源</span><span data-pcb-source-summary176>'+(initialMode==='shared'?'共用 · '+pcbEsc171(sourceLabel(items.get(initialSource))):'獨立庫存')+'</span><em>變更</em></summary><div class="pcb-source-body176">'+
  '<label class="field">庫存來源<select name="sourceMode" '+locked+'>'+pcbOptions171([['independent','獨立庫存'],['shared','共用其他 PCB']],initialMode)+'</select></label>'+
  '<label class="field" data-pcb-source175>共用來源<select name="sharedItemId" '+locked+'><option value="">請選擇案件／PCB</option>'+pcbOptions171([...items.values()].sort((a,b)=>pcbCompare176(sourceLabel(a),sourceLabel(b))).map(x=>[x.item_id,sourceLabel(x)]),initialSource)+'</select></label>'+
  (!canChange?'<p class="muted">變更來源需要庫存操作權限。</p>':'')+
  (l?'<div data-pcb-split175>'+field('分配到獨立庫存的數量','transferQuantity','','type="number" min="0" max="'+l.stock+'" step="1"')+'</div><label class="field" data-pcb-merge175>原庫存如何處理<select name="mergeMode"><option value="">請選擇</option><option value="same">同一批庫存，使用來源數量（不相加）</option><option value="combine">兩批不同庫存，數量合併相加</option></select></label><div class="pcb-source-preview175" data-pcb-preview175 aria-live="polite"></div><label class="pcb-source-confirm175" data-pcb-confirm175><input type="checkbox" name="confirmSource">已確認以上庫存處理方式</label>':'')+
  '<small class="muted">共用庫存會連動，各案件可製作套數不可相加。</small></div></details>'+
  (l&&pcbCanUI171('stock')?'<details class="pcb-extra176"><summary>其他操作</summary><button type="button" data-pcb-correct176>盤點校正</button></details>':''),
  '儲存',fd=>{
   const mode=canChange?String(fd.get('sourceMode')):initialMode,sharedItemId=mode==='shared'?(canChange?String(fd.get('sharedItemId')||''):initialSource):'';
   if(mode==='shared'&&!sharedItemId)throw Error('請選擇共用來源');
   return{action:'link',projectId:pcbProjectId171,...(l?{id:l.id,revision:l.revision,stockRevision:l.stock_revision,sourceCount,targetStockRevision:items.get(sharedItemId)?.stock_revision,transferQuantity:Number(fd.get('transferQuantity')),mergeMode:String(fd.get('mergeMode')||''),confirmSource:fd.get('confirmSource')==='on'}:{stock:Number(fd.get('stock')||0)}),sharedItemId,label:String(fd.get('label')).trim(),perSet:String(fd.get('perSet')).trim()?Number(fd.get('perSet')):null,note:String(fd.get('note')||'')};
  });
 const root=$('#modal'),mode=root.querySelector('[name=sourceMode]'),source=root.querySelector('[name=sharedItemId]'),quantity=root.querySelector('[name=transferQuantity]'),merge=root.querySelector('[name=mergeMode]'),confirm=root.querySelector('[name=confirmSource]');
 const update=(reset=true)=>{
  const shared=mode.value==='shared',plan=pcbSourcePlan175(l,sourceCount,mode.value,source.value),changing=['split','join','switch'].includes(plan),target=items.get(source.value);
  root.querySelector('[data-pcb-source175]').hidden=!shared;source.disabled=!shared||!canChange;source.required=shared;
  root.querySelector('[data-pcb-source-summary176]').textContent=shared?(target?'共用 · '+sourceLabel(target):'尚未選擇來源'):'獨立庫存';
  if(!l){root.querySelector('[data-pcb-initial175]').hidden=shared;root.querySelector('[name=stock]').disabled=shared;return}
  root.querySelector('[data-pcb-split175]').hidden=plan!=='split';quantity.disabled=plan!=='split';quantity.required=plan==='split';
  root.querySelector('[data-pcb-merge175]').hidden=plan!=='join';merge.disabled=plan!=='join';merge.required=plan==='join';
  root.querySelector('[data-pcb-confirm175]').hidden=!changing;confirm.disabled=!changing;confirm.required=changing;if(reset)confirm.checked=false;
  const preview=root.querySelector('[data-pcb-preview175]');preview.hidden=!changing;
  let text='';
  if(plan==='split')text=quantity.value===''?'請填寫要分配到獨立庫存的數量。':'獨立庫存：'+quantity.value+' 片；原共用庫存：'+l.stock+' → '+(l.stock-Number(quantity.value))+' 片。';
  if(plan==='join')text=!merge.value?'請確認兩邊是否為同一批實物，再選擇原庫存的處理方式。':'原獨立庫存：'+l.stock+' → 0 片；'+sourceLabel(target)+' → '+(target.stock+(merge.value==='combine'?l.stock:0))+' 片。'+(merge.value==='same'?'同一批數量不相加。':'兩份數量合併。');
  if(plan==='switch')text='改用 '+sourceLabel(target)+'。原共用庫存 '+l.stock+' 片繼續供其他PCB使用，兩邊數量不變。';
  preview.textContent=text;
 };
 mode.onchange=source.onchange=()=>update();if(quantity)quantity.oninput=()=>update();if(merge)merge.onchange=()=>update();update();
 root.querySelector('[data-pcb-correct176]')?.addEventListener('click',async()=>{const fd=new FormData(root.querySelector('#dialog-form')),dirty=String(fd.get('label')).trim()!==l.label||String(fd.get('note')||'')!==l.note||(String(fd.get('perSet')).trim()?Number(fd.get('perSet')):null)!==l.per_set||mode.value!==initialMode||source.value!==initialSource;if(dirty&&!await confirmAction('有尚未儲存的修改，是否放棄並進行盤點校正？'))return;pcbStockForm171(l,'adjust')});
 root.querySelector('#dialog-form').addEventListener('invalid',e=>{const details=e.target.closest('details');if(details)details.open=true},true);
}

function pcbLinkDetail171(l){
 modal(l.label,'<div class="pcb-toolbar171"><strong>目前存量 '+l.stock+'</strong><div>'+(pcbCanUI171('manage')?'<button type="button" data-pcb-edit-link171>修改資料</button>':'')+(pcbCanUI171('stock')?'<button type="button" data-pcb-adjust171>盤點校正</button>':'')+'</div></div><p>'+pcbEsc171(l.note||'尚無備註')+'</p>'+pcbThumb171('pcb',l.item_id),null);
 $('#cancel-modal').textContent='返回案件';$('#cancel-modal').onclick=$('#close-modal').onclick=()=>{if($('#dialog-form')?.dataset.busy!=='1')pcbOpen171(pcbProjectId171,pcbTab171)};
 $('[data-pcb-edit-link171]')?.addEventListener('click',()=>pcbLinkForm171(l));$('[data-pcb-adjust171]')?.addEventListener('click',()=>pcbStockForm171(l,'adjust'));pcbBindPhotos171();
}
function pcbStockForm171(l,action){
 const label=({receipt:'PCB收料',issue:'PCB領料',adjust:'盤點校正'})[action];
 pcbForm171(label+' · '+l.label,'<p>目前存量：'+l.stock+'</p>'+field(action==='adjust'?'盤點後實際庫存':'數量','quantity',action==='adjust'?l.stock:'','type="number" min="'+(action==='adjust'?0:1)+'" max="1000000000" step="1" required')+field('用途／原因','reason','','required maxlength="500"'),'確認'+label,fd=>({action,projectId:pcbProjectId171,linkId:l.id,stockRevision:l.stock_revision,quantity:Number(fd.get('quantity')),reason:String(fd.get('reason')).trim()}));
}
function pcbSetForm171(){
 const links=pcbLinks171(pcbProjectId171);if(!links.length||links.some(l=>!l.per_set))return toast('請先設定全部PCB的每套用量');
 pcbForm171('整套領料',field('製作套數','sets','1','type="number" min="1" max="1000000" step="1" required')+'<div data-pcb-set-preview171></div>'+field('用途／原因','reason','','required maxlength="500"'),'確認扣庫存',fd=>({action:'issue_set',projectId:pcbProjectId171,sets:Number(fd.get('sets')),projectRevision:pcbData171.projects.find(p=>p.id===pcbProjectId171).revision,reason:String(fd.get('reason')).trim(),revisions:Object.fromEntries(links.map(l=>[l.id,l.revision])),stockRevisions:Object.fromEntries(links.map(l=>[l.item_id,l.stock_revision]))}));
 const input=$('#modal [name=sets]'),draw=()=>{$('[data-pcb-set-preview171]').innerHTML=links.map(l=>'<p>'+pcbEsc171(l.label)+'：'+l.per_set+' × '+Number(input.value||0)+' = '+l.per_set*Number(input.value||0)+' 片</p>').join('')};input.oninput=draw;draw();
}
function pcbFixtureForm171(f){
 let applies=[];try{applies=JSON.parse(f?.applies||'[]')}catch{}
 pcbForm171(f?'修改治具':'新增治具',field('治具名稱','name',f?.name||'','required maxlength="100"')+
  '<fieldset class="pcb-applies171"><legend>適用PCB（可複選）</legend>'+pcbLinks171(pcbProjectId171).map(l=>'<label><input type="checkbox" name="applies" value="'+l.id+'" '+(applies.includes(l.id)?'checked':'')+'> '+pcbEsc171(l.label)+'</label>').join('')+'</fieldset>'+
  '<label class="field">備註<textarea class="pcb-fixture-note174" name="note" rows="2" maxlength="1000">'+pcbEsc171(f?.note||'')+'</textarea></label>','儲存',fd=>({action:'fixture',projectId:pcbProjectId171,...(f?{id:f.id,revision:f.revision}:{}),name:String(fd.get('name')).trim(),location:f?.location||'',note:String(fd.get('note')||''),applies:fd.getAll('applies').map(String)}));
}
async function pcbTakeForm171(f){
 try{
  let people=[];
  if(!f.holder_id){people=pcbData171.people||[];if(!people.length)throw Error('沒有可選的領用人員');}
  pcbForm171((f.holder_id?'歸還':'領用')+' · '+f.name,f.holder_id?'<p>目前領用人：'+pcbEsc171(f.holder_name)+'</p>'+field('歸還備註','note','','maxlength="500"'):'<label class="field">實際領用人<select name="holderId" required>'+pcbOptions171(people.map(p=>[p.id,p.name]),currentUser.id)+'</select></label>'+field('領用備註','note','','maxlength="500"'),f.holder_id?'確認歸還':'確認領用',fd=>({action:f.holder_id?'return':'take',projectId:pcbProjectId171,id:f.id,revision:f.revision,holderId:String(fd.get('holderId')||''),note:String(fd.get('note')||'')}));
 }catch(e){toast(e.message)}
}
function pcbBindPhotos171(){
 $('#modal').querySelectorAll('[data-pcb-photos171]').forEach(b=>b.onclick=()=>pcbPhotos171(b.dataset.pcbPhotos171,b.dataset.pcbEntity171));
}
function pcbPhotos171(type,id,pending=[]){
 const photos=pcbPhotoList171(type,id);
 let queue=[],urls=[],uploadId=crypto.randomUUID(),uploadFiles=null;
 modal(type==='pcb'?'PCB照片':'治具照片','<div class="pcb-gallery171 pcb-photo-view176" data-photo-size176="'+(photos.length<=1?'single':photos.length===2?'double':'multiple')+'">'+photos.map(p=>'<figure><a aria-label="查看大圖" href="/api/pcb?photo='+encodeURIComponent(p.id)+'" target="_blank" rel="noopener"><img loading="lazy" src="/api/pcb?photo='+encodeURIComponent(p.id)+'" alt="'+pcbEsc171(p.file_name)+'"></a><figcaption>'+pcbEsc171([p.actor_name,pcbTime171(p.created_at)].filter(Boolean).join(' · '))+'</figcaption>'+(pcbCanUI171('photos')?'<button type="button" class="pcb-text-action176 pcb-photo-remove176" data-pcb-remove-photo171="'+p.id+'">移除照片</button>':'')+'</figure>').join('')+'</div>'+
  (pcbCanUI171('photos')?'<details class="pcb-upload176" data-pcb-upload176 '+(!photos.length?'open':'')+'><summary>＋ 新增照片</summary><div class="pcb-tools171"><button type="button" data-pcb-choose176>選擇照片</button><button type="button" data-pcb-camera171>直接拍照</button><button type="button" class="pcb-paste176" data-pcb-paste171>貼上照片（Ctrl＋V）</button><input hidden type="file" name="pcbPhotos" accept="image/*" multiple><input hidden type="file" name="pcbCamera" accept="image/*" capture="environment"></div><small class="muted">一次最多10張，會自動壓縮。</small><div class="pcb-gallery171" data-pcb-queue171></div></details>':''),
  pcbCanUI171('photos')?'上傳照片':null,async()=>{
   if(!queue.length)throw Error('請先選擇照片');
   const form=new FormData();form.set('requestId',uploadId);form.set('projectId',pcbProjectId171);form.set('entityType',type);form.set('entityId',id);
   if(!uploadFiles){uploadFiles=[];for(const file of queue)uploadFiles.push(await compressReportPhoto144(file));}
   for(const file of uploadFiles)form.append('photo',file,file.name||'photo.jpg');
   const r=await apiFetch('/api/pcb',{method:'POST',body:form}),data=await r.json();if(!r.ok)throw Error(data.error||'上傳失敗');
   urls.forEach(URL.revokeObjectURL);pcbData171=await pcbFetch171(pcbProjectId171);pcbPhotos171(type,id);toast('已上傳 '+data.count+' 張照片');
  });
 const back=()=>{if($('#dialog-form')?.dataset.busy==='1')return;urls.forEach(URL.revokeObjectURL);pcbOpen171(pcbProjectId171,pcbTab171)};
 $('#cancel-modal').textContent='返回案件';$('#cancel-modal').onclick=$('#close-modal').onclick=back;
 const upload=rootPhotoUpload176();
 function rootPhotoUpload176(){const d=$('#modal [data-pcb-upload176]'),button=$('#submit-modal');if(d&&button){button.hidden=!d.open;d.ontoggle=()=>{if(!d.open&&$('#dialog-form')?.dataset.busy==='1'){d.open=true;return}button.hidden=!d.open}}return d}
 const add=files=>{
  const next=[...files].filter(f=>f.type.startsWith('image/'));if(queue.length+next.length>10)return toast('一次最多10張，請先移除待上傳照片');
  if(upload)upload.open=true;uploadId=crypto.randomUUID();uploadFiles=null;queue.push(...next);urls.forEach(URL.revokeObjectURL);urls=[];
  $('[data-pcb-queue171]').innerHTML=queue.map((f,i)=>{const url=URL.createObjectURL(f);urls.push(url);return '<figure><img src="'+url+'" alt="待上傳照片"><button type="button" data-pcb-drop171="'+i+'">移除</button></figure>'}).join('');
  $('#modal').querySelectorAll('[data-pcb-drop171]').forEach(b=>b.onclick=()=>{queue.splice(Number(b.dataset.pcbDrop171),1);add([])});
 };
 if(pcbCanUI171('photos')){
  const input=$('#modal [name=pcbPhotos]'),camera=$('#modal [name=pcbCamera]');
  input.onchange=()=>{add(input.files);input.value=''};camera.onchange=()=>{add(camera.files);camera.value=''};
  $('[data-pcb-choose176]').onclick=()=>input.click();$('[data-pcb-camera171]').onclick=()=>camera.click();$('[data-pcb-paste171]').onclick=e=>e.currentTarget.focus();
  $('#modal').onpaste=e=>{const files=[...e.clipboardData?.items||[]].filter(x=>x.kind==='file').map(x=>x.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();add(files)}};
 }
 $('#modal').querySelectorAll('[data-pcb-remove-photo171]').forEach(b=>b.onclick=async()=>{try{if(!await confirmAction('確定移除這張照片？'))return;await pcbSend171({action:'remove_photo',requestId:crypto.randomUUID(),projectId:photos.find(p=>p.id===b.dataset.pcbRemovePhoto171).project_id,id:b.dataset.pcbRemovePhoto171});pcbData171=await pcbFetch171(pcbProjectId171);urls.forEach(URL.revokeObjectURL);pcbPhotos171(type,id,queue)}catch(e){toast(e.message)}});
 if(pending.length&&pcbCanUI171('photos'))add(pending);
}
function pcbHolders171(){
 const fixtures=pcbData171.fixtures.filter(f=>f.holder_id);
 modal('治具領用總覽','<div class="pcb-events171">'+(fixtures.map(f=>'<article><strong>'+pcbEsc171(pcbData171.projects.find(p=>p.id===f.project_id)?.name)+' · '+pcbEsc171(f.name)+'</strong><p>領用人：'+pcbEsc171(f.holder_name)+'</p><small>'+pcbEsc171(pcbTime171(f.taken_at))+'</small><button type="button" data-pcb-holder-project171="'+f.project_id+'">查看案件</button></article>').join('')||'<p class="muted">目前沒有領用中的治具。</p>')+'</div>',null);
 $('#modal').querySelectorAll('[data-pcb-holder-project171]').forEach(b=>b.onclick=async()=>{try{pcbProjectId171=b.dataset.pcbHolderProject171;pcbTab171='fixture';await pcbRefresh171()}catch(e){toast(e.message)}});
}
async function pcbExport171(){
 try{
  const r=await apiFetch('/api/pcb?export=1'),d=await r.json();if(!r.ok)throw Error(d.error);
  const rows=[['案名','PCB編號','存量','每套用量','可製作套數','共用庫存編號','備註'],...d.links.map(l=>[d.projects.find(p=>p.id===l.project_id)?.name,l.label,l.stock,l.per_set??'',l.per_set?Math.floor(l.stock/l.per_set):'未設定',l.item_id,l.note])];
  const cell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
  const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='PCB庫存.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }catch(e){toast(e.message)}
}

function pcbImportRows171(rows){
 const at=rows.findIndex(r=>r.some(v=>String(v).trim()==='案名')&&r.some(v=>String(v).trim()==='存量'));if(at<0)throw Error('找不到「案名、編號、存量、一套所需量」標題');
 const head=rows[at].map(v=>String(v).trim()),pi=head.indexOf('案名'),li=head.indexOf('編號'),si=head.indexOf('存量'),qi=head.indexOf('一套所需量'),fi=head.indexOf('治具是否歸庫');
 if([pi,li,si,qi].some(i=>i<0))throw Error('缺少案名、編號、存量或一套所需量欄位');
 let project='';const out=[];
 for(const [index,r]of rows.slice(at+1).entries()){
  if(String(r[pi]??'').trim())project=String(r[pi]).trim();const label=String(r[li]??'').trim();if(!label)continue;
  const raw=String(r[si]??'').trim(),q=String(r[qi]??'').trim(),stock=Number(raw),perSet=q?Number(q):null;
  if(!project||!raw||!Number.isSafeInteger(stock)||stock<0||stock>1e9||(perSet!==null&&(!Number.isSafeInteger(perSet)||perSet<1||perSet>1e6)))throw Error('第 '+(at+index+2)+' 列的案名、庫存或每套用量不正確');
  const fixtureNote=fi>=0?String(r[fi]??'').trim():'';
  out.push({project,label,stock,perSet,fixtureNote,note:fi>=0?r.slice(fi+1).map(v=>String(v??'').trim()).filter(Boolean).join('、'):''});
 }
 // The original table explicitly identifies these two rows as one shared stock.
 const shared=out.find(r=>/與UEA網路共用/.test(r.label)),target=out.find(r=>r.project==='UEA網路'&&r.label==='A');
 if(shared){if(!target||shared.stock!==target.stock)throw Error('UEA網路共用庫存缺少對應A項或數量不一致');shared.sharedKey=target.sharedKey='uea-network-shared';}
 if(!out.length||out.length>300)throw Error('每次匯入1至300項PCB');return out;
}
function pcbImport171(){
 let rows=null,requestId=crypto.randomUUID();
 modal('匯入PCB原表','<p class="muted">建立新案件與初始庫存，不覆蓋既有案件。治具原表註記會保留在案件備註，實際治具另行建立。</p><label class="field">選擇Excel檔<input type="file" name="pcbImport" accept=".xlsx,.xls"></label><label class="field">或從原表複製含標題的資料貼到此處<textarea name="pcbPaste" rows="6" placeholder="案名、編號、存量、一套所需量…"></textarea></label><button type="button" data-pcb-preview-import171>預覽匯入</button><div data-pcb-import-preview171></div>','確認匯入',async()=>{
  if(!rows)throw Error('請先預覽並確認資料');const result=await pcbSend171({action:'import',requestId,rows});await pcbRefresh171('');$('#modal').close();toast('已匯入 '+result.projects+' 個案件、'+result.items+' 項PCB');
 });
 const source=$('#modal [name=pcbPaste]'),file=$('#modal [name=pcbImport]');const clear=()=>{rows=null;requestId=crypto.randomUUID();$('[data-pcb-import-preview171]').textContent=''};source.oninput=clear;file.onchange=clear;
 $('[data-pcb-preview-import171]').onclick=async()=>{try{
  rows=null;let raw;
  if(file.files[0]){if(file.files[0].size>5*1024*1024)throw Error('Excel檔案上限5MB');const wb=XLSX.read(await file.files[0].arrayBuffer(),{type:'array'});raw=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});}
  else raw=source.value.split(/\r?\n/).map(r=>r.split('\t'));
  const candidate=pcbImportRows171(raw),names=[...new Set(candidate.map(r=>r.project))];
  if(names.some(name=>pcbData171.projects.some(p=>p.name.trim().toLowerCase()===name.trim().toLowerCase())))throw Error('案名已存在，請先移除原表中重複的案件');
  rows=candidate;requestId=crypto.randomUUID();$('[data-pcb-import-preview171]').innerHTML='<p>共 '+names.length+' 個案件、'+rows.length+' 項PCB。完整套數採無條件捨去，每套用量空白會顯示「未設定」。</p><div class="pcb-scroll171"><table class="pcb-table171"><thead><tr><th>案名</th><th>編號</th><th>存量</th><th>每套</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+pcbEsc171(r.project)+'</td><td>'+pcbEsc171(r.label)+(r.sharedKey?'（共用）':'')+'</td><td>'+r.stock+'</td><td>'+(r.perSet??'未設定')+'</td></tr>').join('')+'</tbody></table></div>';
 }catch(e){$('#form-error').textContent=e.message}};
}

// The utility menu closes after an action, an outside click, or Escape.
if(typeof document!=='undefined'&&document.addEventListener){
 document.addEventListener('click',event=>{document.querySelectorAll('.pcb-more-menu176[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false})});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.pcb-more-menu176[open]').forEach(menu=>menu.open=false)});
}
