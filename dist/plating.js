 'use strict';
const platingWords={title:'電鍍管理',tileSuffix:'（電鍍紀錄）',vendorSettings:'廠商選項設定',vendorAdd:'新增廠商',vendorEmpty:'請由主管在後台新增廠商',vendorChoose:'請選擇廠商',vendorOld:'原紀錄',vendorDeletePrompt:'確定移除此廠商選項？舊紀錄會保留。',photoOverview:'照片',dispatch:'出貨單',area:'表面積',uploadDispatch:'上傳出貨單',uploadArea:'上傳表面積截圖',exportProjectPhotos:'匯出本案紀錄與圖片',exportAllPhotos:'匯出全部紀錄與圖片',exportWorking:'正在整理紀錄與圖片…',exportDone:'紀錄與圖片匯出完成',photoUnknownActor:'未記錄人員',photoRetry:'重新讀取照片',photos:'出貨單照片',photoChoose:'選擇照片（可多選）',photoUpload:'上傳照片',photoSavedFirst:'儲存紀錄後即可上傳出貨單照片',photoEmpty:'尚無照片',photoLoading:'正在讀取照片…',photoUploading:'正在上傳…',photoDone:'照片已上傳',photoDelete:'確定刪除此張出貨單照片？',photoDeleted:'照片已刪除',photoLabel:'圖片',photoSelect:'請先選擇照片',photoCompress:'超過 2 MB 的照片會自動壓縮。',newProject:'新增案件',edit:'修改',save:'儲存',name:'案名',vendor:'電鍍廠商',newShipment:'新增送鍍',copy:'再次送鍍',number:'送鍍次數',sent:'寄出日期',returned:'回貨日期',groups:'環片配置',sets:'組數',ring:'環片名稱／規格',qty:'每組片數',addGroup:'新增配置',addRing:'新增環片',remove:'移除',inspection:'品檢',pending:'待品檢',passed:'合格',abnormal:'異常',note:'備註／異常說明',empty:'尚無紀錄',history:'文字紀錄',back:'返回案件',delete:'刪除',sending:'送鍍中',received:'已回貨待品檢',completed:'已完成',total:'合計',fixtures:'組治具',pieces:'片',previous:'前移',next:'後移',search:'搜尋案名',countPrefix:'第',countSuffix:'次送鍍',cancel:'取消',close:'關閉',processing:'處理中…',textSettings:'修改本區文字',open:'開啟電鍍管理',drag:'拖曳排序',deletePrompt:'確定刪除此筆送鍍紀錄？',deleteProjectPrompt:'確定刪除此案件及所有送鍍紀錄？',requiredName:'請填寫案名',duplicateName:'案名已存在',requiredVendor:'請填寫電鍍廠商',duplicateNumber:'送鍍次數重複，請修改',invalidReturn:'回貨日期不可早於寄出日期',requiredReturn:'請先填寫回貨日期',requiredNote:'請填寫異常說明',requiredRing:'請填寫環片名稱／規格'};
function pt(key){return state.platingText?.[key]??platingWords[key]??key;}
function pe(key){return esc(pt(key));}
function platingModal(title,body,submit,handler){
 modal(title,body,submit,handler);
 $('#dialog-form').dataset.processingLabel=pt('processing');
 const cancel=$('#cancel-modal'),close=$('#close-modal');if(cancel)cancel.textContent=pt(submit?'cancel':'close');if(close)close.setAttribute('aria-label',pt('close'));
}

function platingEditAllowed(){return ['supervisor','warehouse'].includes(currentUser.role);}
function platingProjects(){return state.platingProjects||[];}
function platingStatus(s){return !s.returned?'sending':s.inspection==='passed'?'completed':s.inspection==='abnormal'?'abnormal':'received';}
function platingTotals(groups){return groups.reduce((t,g)=>({sets:t.sets+g.sets,pieces:t.pieces+g.sets*g.rings.reduce((n,r)=>n+r.qty,0)}),{sets:0,pieces:0});}
function platingCount(s){return pt('countPrefix')+' '+s.number+' '+pt('countSuffix');}
function platingDate(d){return d?d.replaceAll('-','/'):'—';}
function platingVendors(){return state.platingVendors??[...new Set(platingProjects().flatMap(p=>p.shipments.map(s=>s.vendor.trim())).filter(Boolean))];}
function platingVendorControl(value,existing){
 const options=platingVendors(),old=existing&&value&&!options.includes(value);
 return '<label class="field">'+pe('vendor')+'<select name="vendor" required><option value="">'+pe(options.length?'vendorChoose':'vendorEmpty')+'</option>'+[...options,...(old?[value]:[])].map(v=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(v)+(old&&v===value?'（'+pe('vendorOld')+'）':'')+'</option>').join('')+'</select></label>';
}
async function savePlatingVendors(values,action,detail){
 if(currentUser.role!=='supervisor')throw Error('只有主管可以修改廠商選項');
 state.platingVendors=values;addAudit(action,detail,pt('title')+' > '+pt('vendorSettings'));
 await saveCloud(state);if(failedCandidate)throw Error('選項尚未儲存，請處理上方提示');renderAdmin();
}
function managePlatingVendors(){
 if(currentUser.role!=='supervisor')return;
 platingModal(pe('vendorSettings'),platingVendors().map((v,i)=>'<div class="admin-row"><strong>'+esc(v)+'</strong><button type="button" data-vendor-edit="'+i+'">'+pe('edit')+'</button><button type="button" class="danger-button" data-vendor-delete="'+i+'">'+pe('delete')+'</button></div>').join('')+'<button type="button" id="vendor-add">＋ '+pe('vendorAdd')+'</button>','',null);
 $('#vendor-add').onclick=()=>editPlatingVendor();
 document.querySelectorAll('[data-vendor-edit]').forEach(b=>b.onclick=()=>editPlatingVendor(Number(b.dataset.vendorEdit)));
 document.querySelectorAll('[data-vendor-delete]').forEach(b=>b.onclick=async()=>{if(!await confirmAction(pt('vendorDeletePrompt')))return;try{const values=[...platingVendors()],removed=values.splice(Number(b.dataset.vendorDelete),1)[0];await savePlatingVendors(values,'移除電鍍廠商選項',removed);managePlatingVendors();}catch(e){$('#form-error').textContent=e.message;}});
}
function editPlatingVendor(index){
 if(currentUser.role!=='supervisor')return;
 const values=[...platingVendors()],old=values[index];
 platingModal(pe(old?'edit':'vendorAdd'),field(pe('vendor'),'vendorName',old||'','required maxlength="100"'),pe('save'),async fd=>{
 const value=String(fd.get('vendorName')||'').trim();if(!value)throw Error(pt('requiredVendor'));
 if(values.some((v,i)=>i!==index&&v.toLowerCase()===value.toLowerCase()))throw Error('廠商名稱已存在');
 if(value===old){managePlatingVendors();return;}
 if(index===undefined)values.push(value);else values[index]=value;
 await savePlatingVendors(values,old?'修改電鍍廠商選項':'新增電鍍廠商選項',old?old+' → '+value:value);managePlatingVendors();
 });
}
function platingShipmentDraft(p,source,copy=false){
 const s=JSON.parse(JSON.stringify(source||{vendor:'',groups:[{sets:1,rings:[{name:'',qty:1}]}],note:''}));
 if(!source||copy){s.id=crypto.randomUUID();s.number=Math.max(0,...p.shipments.map(x=>x.number))+1;s.sent=new Date().toLocaleDateString('sv-SE');s.returned='';s.inspection='pending';s.note='';}
 if(!source||copy){const options=platingVendors();if(!options.includes(s.vendor))s.vendor=options[0]||'';}
 return s;
}
function platingFind(id){return platingProjects().find(p=>p.id===id);}
function platingChanges(before,after){
 const changes=[],show=(value)=>String(value??'').trim()||'未填';
 for(const [key,label]of [['number','送鍍次數'],['vendor','廠商'],['sent','寄出日期'],['returned','回貨日期'],['inspection','品檢'],['note','備註']]){
  if(before[key]===after[key])continue;
  const format=value=>key==='inspection'?pt(value):['sent','returned'].includes(key)?value?platingDate(value):'未填':show(value);
  changes.push(label+'：'+format(before[key])+' → '+format(after[key]));
 }
 const describe=g=>g.rings.map(r=>r.name+' '+r.qty+'片').join('、')+' × '+g.sets+'組';
 for(let i=0;i<Math.max(before.groups.length,after.groups.length);i++){
  const a=before.groups[i],b=after.groups[i],prefix='配置 '+(i+1)+' ';
  if(!a){changes.push('新增'+prefix+'：'+describe(b));continue;}
  if(!b){changes.push('移除'+prefix+'：'+describe(a));continue;}
  if(a.sets!==b.sets)changes.push(prefix+'組數：'+a.sets+' → '+b.sets);
  for(let j=0;j<Math.max(a.rings.length,b.rings.length);j++){
   const x=a.rings[j],y=b.rings[j];
   if(!x){changes.push(prefix+'新增環片：'+y.name+' '+y.qty+'片／組');continue;}
   if(!y){changes.push(prefix+'移除環片：'+x.name+' '+x.qty+'片／組');continue;}
   if(x.name!==y.name)changes.push(prefix+'環片：'+x.name+' → '+y.name);
   if(x.qty!==y.qty)changes.push(prefix+y.name+' 每組片數：'+x.qty+' → '+y.qty);
  }
 }return changes;
}
function concisePlatingLog(l){
 const action=l.action||'',detail=String(l.detail||'');
 if(l.platingChanges)return [action==='修改送鍍紀錄'?'':action,detail].filter(Boolean).join('｜');
 if(action==='調整電鍍案件順序')return '調整順序';
 if(action==='新增電鍍案件')return '新增案件';
 if(action==='修改送鍍紀錄'||action==='新增送鍍紀錄')return action+'｜'+detail.split(' · ')[0];
 return [action,detail].filter(Boolean).join('｜');
}
async function platingCommit(action,p,detail){
 if(!platingEditAllowed()||cloudBusy||failedCandidate)throw Error('目前無法儲存，請確認權限與連線狀態。');
 addAudit(action,detail,pt('title')+' > '+p.name,'plating:'+p.id);state.logs[0].platingChanges=true;
 await saveCloud(state);if(failedCandidate)throw Error('資料尚未儲存，請關閉視窗並處理上方提示。');
 if(location.hash==='#admin')renderAdmin();else render();
}
function renderPlating(){
 const section=document.createElement('section');section.className='workspace plating-workspace';
 section.innerHTML='<div class="plating-head"><h2>'+pe('title')+'</h2><input id="plating-search" aria-label="'+pe('search')+'" placeholder="'+pe('search')+'">'+(platingEditAllowed()?'<button type="button" id="plating-new" class="primary small">＋ '+pe('newProject')+'</button>':'')+'</div><div class="plating-grid"></div>';
 $('main').append(section);
 if(platingEditAllowed()){const b=document.createElement('button');b.type='button';b.className='small';b.textContent=pt('exportAllPhotos');b.onclick=()=>exportPlatingPhotos(platingProjects(),b);section.querySelector('.plating-head').append(b);}
 function draw(query=''){
 const grid=section.querySelector('.plating-grid');grid.innerHTML='';
 for(const p of platingProjects().filter(p=>p.name.toLowerCase().includes(query.toLowerCase()))){
 const index=platingProjects().indexOf(p),tile=document.createElement('div');tile.className='plating-tile';tile.dataset.id=p.id;
 tile.innerHTML='<button type="button" class="plating-open">'+esc(p.name)+pe('tileSuffix')+'</button>'+(platingEditAllowed()?'<div class="plating-order"><button type="button" class="small" data-move="-1" aria-label="'+pe('previous')+'" '+(index===0?'disabled':'')+'>←</button><button type="button" class="small" data-move="1" aria-label="'+pe('next')+'" '+(index===platingProjects().length-1?'disabled':'')+'>→</button><span class="plating-grip" draggable="true" title="'+pe('drag')+'">⠿</span></div>':'');
 tile.querySelector('.plating-open').onclick=()=>openPlating(p.id);
 tile.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>movePlating(p.id,platingProjects()[index+Number(b.dataset.move)]?.id));
 if(platingEditAllowed()){
 tile.querySelector('.plating-grip').ondragstart=e=>{e.dataTransfer.setData('text/plain',p.id);e.dataTransfer.effectAllowed='move';};
 tile.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';};tile.ondrop=e=>{e.preventDefault();movePlating(e.dataTransfer.getData('text/plain'),p.id);};
 }grid.append(tile);
 }if(!grid.children.length)grid.textContent=pt('empty');
 }
 section.querySelector('#plating-search').oninput=e=>draw(e.target.value);section.querySelector('#plating-new')?.addEventListener('click',()=>editPlatingProject());draw();
}
async function movePlating(id,target){
 if(!platingEditAllowed()||cloudBusy||failedCandidate||id===target)return;
 const list=platingProjects(),from=list.findIndex(p=>p.id===id),to=list.findIndex(p=>p.id===target);if(from<0||to<0)return;
 const p=list.splice(from,1)[0];list.splice(to,0,p);
 try{await platingCommit('調整順序',p,'第 '+(from+1)+' 位 → 第 '+(to+1)+' 位');}catch(e){toast(e.message);}
}
function editPlatingProject(id){
 if(!platingEditAllowed())return;const existing=platingFind(id);
 platingModal(pe(existing?'edit':'newProject'),field(pe('name'),'name',existing?.name||'','required maxlength="100"'),pe('save'),async fd=>{
 const name=String(fd.get('name')).trim();if(!name)throw Error(pt('requiredName'));if(platingProjects().some(p=>p.id!==id&&p.name.toLowerCase()===name.toLowerCase()))throw Error(pt('duplicateName'));
 if(existing?.name===name){openPlating(id);return;}
 const oldName=existing?.name;const p=existing||{id:crypto.randomUUID(),shipments:[]};p.name=name;if(!existing){state.platingProjects??=[];state.platingProjects.push(p);}await platingCommit(existing?'修改案名':'新增案件',p,existing?oldName+' → '+name:'');openPlating(p.id);
 });
}
function openPlating(id){
 const p=platingFind(id);if(!p)return;
 const can=platingEditAllowed(),logs=(state.logs||[]).filter(l=>l.project==='plating:'+id);
 platingModal(esc(p.name),'<div class="plating-actions">'+(can?'<button type="button" id="plating-rename">'+pe('edit')+'</button><button type="button" class="primary" id="shipment-new">＋ '+pe('newShipment')+'</button>':'')+'</div><div class="plating-shipments">'+(p.shipments.map(s=>'<button type="button" class="plating-shipment" data-shipment="'+esc(s.id)+'"><strong>'+esc(platingCount(s))+'</strong><span>'+esc(platingDate(s.sent))+'</span><span>'+pe(platingStatus(s))+'</span></button>').join('')||'<p>'+pe('empty')+'</p>')+'</div><details class="plating-history"><summary>'+pe('history')+'（'+logs.length+'）</summary>'+logs.map(l=>'<div>'+esc(receiptTime(l.time))+'｜'+esc(l.actor||'未記錄人員')+'｜'+esc(concisePlatingLog(l))+'</div>').join('')+'</details>','',null);
 attachPlatingPhotoOverview(p);
 $('#plating-rename')?.addEventListener('click',()=>editPlatingProject(id));$('#shipment-new')?.addEventListener('click',()=>editPlatingShipment(id));
 document.querySelectorAll('[data-shipment]').forEach(b=>b.onclick=()=>editPlatingShipment(id,b.dataset.shipment));
}
function editPlatingShipment(projectId,shipmentId,copy=false){
 const p=platingFind(projectId);if(!p)return;const source=p.shipments.find(s=>s.id===shipmentId),can=platingEditAllowed();
 const s=platingShipmentDraft(p,source,copy);
 const existing=!!source&&!copy;
 const select='<label class="field">'+pe('inspection')+'<select name="inspection">'+['pending','passed','abnormal'].map(k=>'<option value="'+k+'" '+(s.inspection===k?'selected':'')+'>'+pe(k)+'</option>').join('')+'</select></label>';
 platingModal(esc(p.name)+' · '+esc(platingCount(s)),'<button type="button" id="plating-back" class="small">← '+pe('back')+'</button><fieldset id="plating-fields" '+(!can?'disabled':'')+'><div class="form-grid">'+platingVendorControl(s.vendor,existing)+field(pe('number'),'number',s.number,'type="number" min="1" max="9999" required')+field(pe('sent'),'sent',s.sent,'type="date" required')+field(pe('returned'),'returned',s.returned,'type="date"')+'</div><h3>'+pe('groups')+'</h3><div id="plating-groups"></div>'+(can?'<button type="button" id="group-add" class="small">＋ '+pe('addGroup')+'</button>':'')+'<p id="plating-total"></p><div class="form-grid">'+select+field(pe('note'),'note',s.note,'maxlength="1000"')+'</div></fieldset>'+(can&&existing?'<div class="plating-actions"><button type="button" id="shipment-copy">'+pe('copy')+'</button><button type="button" id="shipment-delete" class="danger-button">'+pe('delete')+'</button></div>':''),can?pe('save'):'',async fd=>{
 const groups=readGroups();const next={...s,vendor:String(fd.get('vendor')).trim(),number:Number(fd.get('number')),sent:String(fd.get('sent')),returned:String(fd.get('returned')),inspection:String(fd.get('inspection')),note:String(fd.get('note')).trim(),groups};
 if(groups.length>100||groups.some(g=>g.rings.length>100)||!Number.isSafeInteger(platingTotals(groups).pieces))throw Error('配置或數量超過上限');
 if(!next.vendor)throw Error(pt('requiredVendor'));if(p.shipments.some(x=>x.id!==next.id&&x.number===next.number))throw Error(pt('duplicateNumber'));
 if(next.returned&&next.returned<next.sent)throw Error(pt('invalidReturn'));if(!next.returned&&next.inspection!=='pending')throw Error(pt('requiredReturn'));if(next.inspection==='abnormal'&&!next.note)throw Error(pt('requiredNote'));
 const changes=existing?platingChanges(source,next):[];
 if(existing&&!changes.length){openPlating(projectId);return;}
 if(existing)p.shipments[p.shipments.findIndex(x=>x.id===s.id)]=next;else p.shipments.push(next);
 await platingCommit(existing?'修改送鍍紀錄':'新增送鍍紀錄',p,platingCount(next)+(changes.length?'｜'+changes.join('；'):''));openPlating(projectId);
 });
 $('#plating-back').onclick=()=>openPlating(projectId);
 function readGroups(){return [...document.querySelectorAll('.plating-group')].map(g=>({sets:integer(g.querySelector('[data-sets]').value,1,1000000),rings:[...g.querySelectorAll('.plating-ring')].map(r=>{const name=r.querySelector('[data-ring-name]').value.trim();if(!name)throw Error(pt('requiredRing'));return {name,qty:integer(r.querySelector('[data-ring-qty]').value,1,1000000)};})}));}
 function updateTotal(){try{const t=platingTotals(readGroups());$('#plating-total').textContent=pt('total')+' '+t.sets+' '+pt('fixtures')+' · '+t.pieces+' '+pt('pieces');}catch{$('#plating-total').textContent='';}}
 function addRing(g,r={name:'',qty:1}){
 const row=document.createElement('div');row.className='plating-ring';row.innerHTML='<label>'+pe('ring')+'<input data-ring-name value="'+esc(r.name)+'" required maxlength="100"></label><label>'+pe('qty')+'<input data-ring-qty type="number" min="1" max="1000000" value="'+r.qty+'" required></label>'+(can?'<button type="button" class="small">'+pe('remove')+'</button>':'');
 row.querySelector('button')?.addEventListener('click',()=>{if(g.querySelectorAll('.plating-ring').length===1)return;row.remove();updateTotal();});g.querySelector('.plating-rings').append(row);
 }
 function addGroup(value={sets:1,rings:[{name:'',qty:1}]}){
 const g=document.createElement('div');g.className='plating-group';g.innerHTML='<div class="plating-actions"><label>'+pe('sets')+' <input data-sets type="number" min="1" max="1000000" value="'+value.sets+'" required></label>'+(can?'<button type="button" data-remove-group class="small">'+pe('remove')+'</button>':'')+'</div><div class="plating-rings"></div>'+(can?'<button type="button" data-add-ring class="small">＋ '+pe('addRing')+'</button>':'');
 $('#plating-groups').append(g);value.rings.forEach(r=>addRing(g,r));g.querySelector('[data-add-ring]')?.addEventListener('click',()=>addRing(g));g.querySelector('[data-remove-group]')?.addEventListener('click',()=>{if(document.querySelectorAll('.plating-group').length===1)return;g.remove();updateTotal();});g.oninput=updateTotal;
 }
 attachPlatingPhotos(p,s,existing);
 s.groups.forEach(addGroup);$('#group-add')?.addEventListener('click',()=>addGroup());updateTotal();
 $('#shipment-copy')?.addEventListener('click',()=>editPlatingShipment(projectId,shipmentId,true));
 $('#shipment-delete')?.addEventListener('click',async()=>{if(!await confirmAction(pt('deletePrompt')))return;try{p.shipments=p.shipments.filter(x=>x.id!==s.id);await platingCommit('刪除送鍍紀錄',p,platingCount(s));openPlating(projectId);}catch(e){$('#form-error').textContent=e.message;}});
}
const renderBeforePlating=render;render=function(){renderBeforePlating();if(activeManagementPage().id==='plating')renderPlating();};
async function deletePlatingProject(id){
 if(currentUser.role!=='supervisor'||cloudBusy||failedCandidate)return;
 const p=platingFind(id);if(!p||!await confirmAction(pt('deleteProjectPrompt')+' '+p.name))return;
 try{state.platingProjects=platingProjects().filter(x=>x.id!==id);await platingCommit('刪除電鍍案件',p,p.name);renderAdmin();}catch(e){toast(e.message);}
}
const renderAdminBeforePlating=renderAdmin;renderAdmin=function(){
 renderAdminBeforePlating();if(currentUser.role!=='supervisor')return;
 const card=document.createElement('details');card.className='admin-card';card.innerHTML='<summary><h2>'+pe('title')+'</h2></summary><div class="admin-card-body"><div class="plating-actions"><button type="button" id="plating-text">'+pe('textSettings')+'</button><button type="button" id="admin-plating-new">＋ '+pe('newProject')+'</button><a href="#plating">'+pe('open')+'</a></div>'+platingProjects().map((p,i)=>'<div class="admin-row"><strong>'+esc(p.name)+'</strong><button type="button" data-plating-admin-open="'+esc(p.id)+'">'+pe('edit')+'</button><button type="button" data-plating-admin-move="'+esc(p.id)+'" data-delta="-1" '+(i===0?'disabled':'')+'>'+pe('previous')+'</button><button type="button" data-plating-admin-move="'+esc(p.id)+'" data-delta="1" '+(i===platingProjects().length-1?'disabled':'')+'>'+pe('next')+'</button><button type="button" class="danger-button" data-plating-admin-delete="'+esc(p.id)+'">'+pe('delete')+'</button></div>').join('')+'</div>';$('main').append(card);
 const vendorButton=document.createElement('button');vendorButton.type='button';vendorButton.textContent=pt('vendorSettings');vendorButton.id='plating-vendors';vendorButton.onclick=managePlatingVendors;card.querySelector('.plating-actions').append(vendorButton);
 $('#admin-plating-new').onclick=()=>editPlatingProject();
 card.querySelectorAll('[data-plating-admin-open]').forEach(b=>b.onclick=()=>openPlating(b.dataset.platingAdminOpen));
 card.querySelectorAll('[data-plating-admin-delete]').forEach(b=>b.onclick=()=>deletePlatingProject(b.dataset.platingAdminDelete));
 card.querySelectorAll('[data-plating-admin-move]').forEach(b=>b.onclick=async()=>{const i=platingProjects().findIndex(p=>p.id===b.dataset.platingAdminMove);await movePlating(b.dataset.platingAdminMove,platingProjects()[i+Number(b.dataset.delta)]?.id);renderAdmin();});
 $('#plating-text').onclick=()=>platingModal(pe('textSettings'),Object.keys(platingWords).map(k=>field(esc(platingWords[k]),k,pt(k),'required maxlength="100"')).join(''),pe('save'),async fd=>{const words=Object.fromEntries(Object.keys(platingWords).map(k=>[k,String(fd.get(k)).trim()]));if(Object.values(words).some(v=>!v))throw Error('文字不可空白');state.platingText=words;addAudit('修改電鍍管理文字','','管理後台');await saveCloud(state);if(failedCandidate)throw Error('儲存失敗');$('#modal').close();renderAdmin();});
};

function platingPhotoUrl(p,s){return '/api/plating-photos?project='+encodeURIComponent(p.id)+'&shipment='+encodeURIComponent(s.id);}
async function listPlatingPhotos(p,s,forExport=false){
 const items=[];let cursor='';const seen=new Set();
 do{const r=await apiFetch(platingPhotoUrl(p,s)+(forExport?'&export=1':'')+(cursor?'&cursor='+encodeURIComponent(cursor):'')),d=await r.json();if(!r.ok)throw Error(d.error||'照片讀取失敗');items.push(...(d.items||[]));cursor=d.truncated?d.cursor:'';if(d.truncated&&(!cursor||seen.has(cursor)))throw Error('照片清單未完整讀取，請重試');seen.add(cursor);}while(cursor);
 return items.sort((a,b)=>new Date(a.created)-new Date(b.created));
}
function platingPhotoKind(item){return item.kind==='area'?'area':'dispatch';}
function platingPhotoLabel(s,item){return platingCount(s)+pt(platingPhotoKind(item))+'｜'+(item.actor||pt('photoUnknownActor'))+'｜'+receiptTime(item.created);}
async function platingPhotoOperation(status,action){
 if(imageUploading||cloudBusy||failedCandidate)return;
 const dialog=$('#modal'),controls=[...dialog.querySelectorAll('input,select,button')].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);
 const cancel=e=>e.preventDefault();dialog.addEventListener('cancel',cancel);imageUploading=true;status.textContent='';
 try{await action();}catch(e){status.textContent=e.message||'照片操作失敗';}
 finally{imageUploading=false;dialog.removeEventListener('cancel',cancel);controls.forEach(([el,disabled])=>el.disabled=disabled);}
}
function attachPlatingPhotos(p,s,saved){
 if(!platingEditAllowed())return;
 const panel=document.createElement('section');panel.className='plating-photo-panel';
 if(!saved){panel.innerHTML='<p class="muted">'+pe('photoSavedFirst')+'</p>';$('#plating-fields').after(panel);return;}
 panel.innerHTML=['dispatch','area'].map(kind=>'<div class="receipt-upload-row"><label class="field">'+pe(kind)+'<input type="file" multiple accept="image/jpeg,image/png,image/webp" data-photo-files="'+kind+'"></label><button type="button" data-photo-upload="'+kind+'">'+pe(kind==='area'?'uploadArea':'uploadDispatch')+'</button></div>').join('')+'<small>'+pe('photoCompress')+'</small><p data-photo-status role="status"></p>';
 $('#plating-fields').after(panel);const status=panel.querySelector('[data-photo-status]');
 panel.querySelectorAll('[data-photo-upload]').forEach(button=>button.onclick=async()=>{
  const kind=button.dataset.photoUpload,input=panel.querySelector('[data-photo-files="'+kind+'"]'),files=[...input.files];if(!files.length){status.textContent=pt('photoSelect');return;}
  await platingPhotoOperation(status,async()=>{
   let count=0,failure='';
   for(const file of files){try{status.textContent=pt('photoUploading')+' '+(count+1)+' / '+files.length;const result=await uploadImage(file,platingPhotoUrl(p,s)+'&kind='+kind,2);addAudit('上傳'+pt(kind),platingCount(s)+' · '+file.name+' · '+receiptTime(result.created),pt('title')+' > '+p.name,'plating:'+p.id);count++;}catch(e){failure=e.message;break;}}
   if(count){await saveCloud(state);if(failedCandidate)throw Error('已上傳 '+count+' 張，但文字紀錄未儲存，請處理上方提示');}
   input.value='';status.textContent=failure?'已上傳 '+count+' / '+files.length+' 張；'+failure+'。未成功的照片請重新選取。':pt('photoDone')+'（'+count+'）';
  });
 });
}
function attachPlatingPhotoOverview(p){
 const panel=document.createElement('section');panel.className='plating-photo-panel';
 panel.innerHTML=(platingEditAllowed()?'<button type="button" class="small" data-project-photo-export>'+pe('exportProjectPhotos')+'</button>':'')+'<details class="receipt-files-fold"><summary>'+pe('photoOverview')+' <span data-photo-count></span></summary><div data-photo-list></div></details><p data-photo-status role="status"></p>';
 $('.plating-history').before(panel);
 const fold=panel.querySelector('details'),list=panel.querySelector('[data-photo-list]'),status=panel.querySelector('[data-photo-status]');let loaded=false,loading=false;
 async function load(){
  if(loading)return;loading=true;list.textContent=pt('photoLoading');
  try{
   const rows=[];for(const s of [...p.shipments].sort((a,b)=>a.number-b.number))for(const item of await listPlatingPhotos(p,s))rows.push({s,item});
   list.replaceChildren();panel.querySelector('[data-photo-count]').textContent='（'+rows.length+'）';
   for(const {s,item}of rows){
    const row=document.createElement('div');row.className='receipt-file-row';const link=document.createElement('a');link.textContent=platingPhotoLabel(s,item);link.href=platingPhotoUrl(p,s)+'&id='+encodeURIComponent(item.id);link.target='_blank';link.rel='noopener';row.append(link);
    if(platingEditAllowed()){const b=document.createElement('button');b.type='button';b.className='small danger-button';b.textContent=pt('delete');b.onclick=async()=>{if(!await confirmAction(pt('photoDelete')))return;await platingPhotoOperation(status,async()=>{const r=await apiFetch(link.getAttribute('href'),{method:'DELETE'}),d=await r.json();if(!r.ok)throw Error(d.error||'照片刪除失敗');addAudit('刪除'+pt(platingPhotoKind(item)),platingPhotoLabel(s,item),pt('title')+' > '+p.name,'plating:'+p.id);await saveCloud(state);if(failedCandidate)throw Error('照片已刪除，但紀錄未儲存，請處理上方提示');status.textContent=pt('photoDeleted');});await load();};row.append(b);}list.append(row);
   }if(!rows.length)list.textContent=pt('photoEmpty');loaded=true;
  }catch(e){list.textContent=e.message;const retry=document.createElement('button');retry.type='button';retry.textContent=pt('photoRetry');retry.onclick=load;list.append(retry);}
  finally{loading=false;}
 }
 fold.ontoggle=()=>{if(fold.open&&!loaded)load();};
 panel.querySelector('[data-project-photo-export]')?.addEventListener('click',e=>exportPlatingPhotos([p],e.currentTarget,status));
}
function platingCsv(rows){return new TextEncoder().encode('\ufeff'+rows.map(row=>row.map(value=>{const v=String(value??'');return csvCell(/^[\s]*[=+@-]/.test(v)?"'"+v:v);}).join(',')).join('\r\n'));}
function platingRecordEntries(projects,logs){
 const records=[['案名','送鍍次數','電鍍廠商','寄出日期','回貨日期','狀態','品檢','配置','組數','環片名稱／規格','每組片數','環片總片數','本次治具總組數','本次環片總片數','備註／異常說明']];
 for(const p of projects){if(!p.shipments.length)records.push([p.name]);for(const s of p.shipments){const t=platingTotals(s.groups);s.groups.forEach((g,i)=>g.rings.forEach(r=>records.push([p.name,s.number,s.vendor,platingDate(s.sent),s.returned?platingDate(s.returned):'',pt(platingStatus(s)),pt(s.inspection),i+1,g.sets,r.name,r.qty,g.sets*r.qty,t.sets,t.pieces,s.note])));}}
 const ids=new Set(projects.map(p=>'plating:'+p.id)),history=[['時間','人員','操作','位置','內容']];for(const l of logs.filter(l=>ids.has(l.project)))history.push([receiptTime(l.time),l.actor||pt('photoUnknownActor'),l.action,l.location||'',l.detail]);
 return [{name:'送鍍紀錄.csv',data:platingCsv(records)},{name:'操作紀錄.csv',data:platingCsv(history)}];
}
let platingPhotoExportBusy=false;
async function exportPlatingPhotos(projects,button,status){
 if(!platingEditAllowed()||platingPhotoExportBusy)return;
 const targets=JSON.parse(JSON.stringify(projects)),logs=JSON.parse(JSON.stringify(state.logs||[]));platingPhotoExportBusy=true;const label=button?.textContent;if(button)button.disabled=true;
 const show=text=>{if(status)status.textContent=text;else toast(text);};
 try{
  show(pt('exportWorking'));const entries=platingRecordEntries(targets,logs),manifest=[['案名','送鍍次數','照片類別','人員','上傳時間','原始檔名','檔案位置']];
  for(const [pi,p]of targets.entries())for(const s of p.shipments){const items=await listPlatingPhotos(p,s,true);
   for(const [i,item]of items.entries()){
    const r=await apiFetch(platingPhotoUrl(p,s)+'&id='+encodeURIComponent(item.id));if(!r.ok)throw Error('照片下載失敗：'+p.name+' '+platingCount(s));
    const type=r.headers.get('content-type')||'',ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';
    const path=String(pi+1).padStart(3,'0')+'_'+safeFileName(p.name)+'/'+safeFileName(platingCount(s))+'/'+safeFileName(pt(platingPhotoKind(item)))+'_'+String(i+1).padStart(3,'0')+'_'+photoStamp(item.created)+'.'+ext;
    entries.push({name:path,data:new Uint8Array(await r.arrayBuffer()),date:item.created});manifest.push([p.name,s.number,pt(platingPhotoKind(item)),item.actor||pt('photoUnknownActor'),receiptTime(item.created),item.name||'',path]);
   }
  }
  if(!targets.length)throw Error(pt('empty'));
  entries.push({name:'照片清單.csv',data:platingCsv(manifest)});
  downloadBlob(makeZip(entries),safeFileName(targets.length===1?targets[0].name:pt('title'))+'_紀錄與圖片_'+new Date().toISOString().slice(0,10)+'.zip');show(pt('exportDone'));
 }catch(e){show(e.message||'照片匯出失敗');}finally{platingPhotoExportBusy=false;if(button){button.disabled=false;button.textContent=label;}}
}
