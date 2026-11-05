'use strict';
const wireWords={lowWarning:'裁線時若發現線材快用完，請記得將狀態改為「需補貨」。',markLow:'這捆線快用完了，標記需補貨',exportRecords:'匯出本項紀錄',exportAllRecords:'匯出整區紀錄',restockList:'補貨名單',batchCutHint:'可同時填不同線材、顏色及長度；空白列略過，已填列請填完整。',addFive:'再增加 5 列',batchHint:'空白列不儲存；儲存後編號會接續現有線捆，自動連續排列。',ordinal:'編號',selectReel:'選擇線捆',wireBinding:'線材種類',sortSettings:'調整排序',cutRecords:'裁線紀錄',modifiedBy:'修改人員',title:'線材管理',suffix:'_庫存',name:'線材名稱',newType:'新增線材',newReel:'新增線捆',number:'線捆編號',color:'顏色',status:'補貨狀態',enough:'足量',low:'需補貨',newCut:'新增裁線紀錄',length:'每條長度（cm）',quantity:'條數',total:'總長度（cm）',actor:'人員',time:'時間',history:'文字紀錄',ledger:'線材紀錄總覽',search:'搜尋線材、編號、顏色、人員',all:'全部',from:'開始日期',to:'結束日期',edit:'修改',delete:'刪除',save:'儲存',cancel:'取消',close:'關閉',back:'返回線材',empty:'尚無紀錄',textSettings:'修改本區文字',open:'開啟線材管理',exportTable:'匯出目前表格',previous:'前移',next:'後移',up:'上移',down:'下移',drag:'拖曳排序',processing:'處理中…',duplicate:'名稱或編號已存在',deletePrompt:'確定刪除？有照片或裁線紀錄的線捆會保留，不能刪除。',saved:'已儲存',readonly:'目前沒有編輯權限',required:'請完整填寫資料',updated:'修改時間',createAction:'新增',editAction:'修改',statusAction:'調整補貨狀態',sortAction:'調整順序',deleteAction:'刪除',saveFail:'尚未儲存，請處理頁面上方提示'};
Object.assign(wireWords,{projectName:'案名',projectHint:'輸入或選擇曾使用的案名',unfiled:'未歸檔',lastCut:'最後登記時間',lastActor:'最後登記人員',batchCount:'紀錄筆數',detailCount:'明細列數',caseCuts:'案件裁線紀錄',cutHistory:'歷次裁線紀錄',cutDetails:'查看明細',caseUsage:'線材耗用總表',allUsage:'全部線材使用量',usageQuantity:'累計條數',usageLength:'累計長度（m）',usageStart:'統計起點',usageBeginning:'全部歷史',resetAllUsage:'全部重新累計',resetOneUsage:'個別重新累計',resetUsagePrompt:'確定從現在重新累計？原始裁線紀錄與單案耗用保留。',deleteCutPrompt:'確定刪除指定裁線明細？用量會重新計算。',usageSources:'查看來源明細',backLedger:'返回總覽',caseSearch:'搜尋案名、線材、編號、顏色、人員',cutNotFound:'找不到該筆裁線紀錄',cutSaved:'裁線紀錄已儲存',rowNumber:'列',chooseWire:'請選擇線材',chooseColor:'請選擇顏色',chooseWireFirst:'請先選擇線材',cutRowRequired:'請選擇線材與顏色，填寫有效長度與整數條數',cutRowsRequired:'請至少填寫一列裁線明細'});
function wt(k){return state.wireText?.[k]??wireWords[k]??k;}
function we(k){return esc(wt(k));}
function wireTypes(){return (state.wireTypes||[]).filter(t=>!t.archived);}
function wireReels(typeId){return (state.wireReels||[]).filter(r=>!typeId||r.wireId===typeId);}
function wireReelOrdinal(r,source=state){return String((source.wireReels||[]).filter(x=>x.wireId===r.wireId).findIndex(x=>x.id===r.id)+1);}
function wireCuts(reelId){return (state.wireCuts||[]).filter(c=>!reelId||c.reelId===reelId).sort((a,b)=>b.time.localeCompare(a.time)||b.id.localeCompare(a.id));}
function wireType(id){return wireTypes().find(x=>x.id===id);}
function wireReel(id){return wireReels().find(x=>x.id===id);}
function wirePhotoUrl(r,id,exp=false){return '/api/wire-photos?reel='+encodeURIComponent(r.id)+(id?'&id='+encodeURIComponent(id):'')+(exp?'&export=1':'');}
function wireCanEditCut(c){return canDo('wire.editAll')||(canDo('wire.editOwn')&&c.actorId===String(currentUser.id));}
function wireModal(title,body,submit,handler){modal(esc(title),body,submit?wt(submit):'',handler);$('#dialog-form').dataset.processingLabel=wt('processing');$('#cancel-modal').textContent=wt(submit?'cancel':'close');$('#close-modal').setAttribute('aria-label',wt('close'));}
function wireHistory(id){const logs=(state.logs||[]).filter(l=>l.project==='wire:'+id);return '<details class="wire-history"><summary>'+we('history')+'（'+logs.length+'）</summary>'+logs.map(l=>textLogLine(l,receiptTime(l.time)+'｜'+l.actor+'｜'+l.action+(l.detail?'｜'+l.detail:''))).join('')+'</details>';}
async function wireCommit(next,action,typeId,detail){if(cloudBusy||failedCandidate)throw Error(wt('saveFail'));state=next;addAudit(action,detail,wt('title')+' > '+(wireType(typeId)?.name||''),'wire:'+typeId);await saveCloud(state);if(failedCandidate)throw Error(wt('saveFail'));if(location.hash==='#admin')renderAdmin();else render();}
function wireActions(){return '<div class="wire-tools"><input id="wire-search" placeholder="'+we('search')+'" aria-label="'+we('search')+'">'+(canDo('wire.create')?'<button type="button" class="primary" id="wire-new">＋ '+we('newType')+'</button>':'')+(canDo('wire.cut')?'<button type="button" id="wire-batch-cut">＋ '+we('newCut')+'</button>':'')+'<button type="button" id="wire-restock">'+we('restockList')+'</button><button type="button" id="wire-ledger">'+we('ledger')+'</button>'+(canDo('admin.export')?'<button type="button" id="wire-export">'+we('exportAllRecords')+'</button>':'')+'</div>';}
function renderWire(){
 const panel=document.createElement('section');panel.className='workspace wire-workspace';panel.innerHTML='<div class="wire-head"><h2>'+we('title')+'</h2>'+wireActions()+'</div><div class="plating-grid" id="wire-grid"></div>';$('main').append(panel);
 function draw(q=''){
 const grid=$('#wire-grid'),visible=wireTypes().filter(t=>t.name.toLowerCase().includes(q.toLowerCase()));
 grid.innerHTML=visible.map(t=>'<div class="plating-tile" data-wire-tile="'+esc(t.id)+'"><button type="button" class="plating-open" data-wire-open="'+esc(t.id)+'">'+esc(t.name)+we('suffix')+'</button>'+'</div>').join('')||'<p>'+we('empty')+'</p>';
 const ids=visible.map(t=>t.id),step=direction=>({up:-wireGridColumns(grid),down:wireGridColumns(grid),previous:-1,next:1})[direction];
 grid.updateWireControls=()=>grid.querySelectorAll('[data-wire-move]').forEach(b=>{const to=ids.indexOf(b.dataset.wireMove)+step(b.dataset.direction);b.disabled=to<0||to>=ids.length;});grid.updateWireControls();
 grid.querySelectorAll('[data-wire-open]').forEach(b=>b.onclick=()=>openWire(b.dataset.wireOpen));
 grid.querySelectorAll('[data-wire-move]').forEach(b=>b.onclick=()=>{const target=ids[ids.indexOf(b.dataset.wireMove)+step(b.dataset.direction)];return moveWireTile(b.dataset.wireMove,target,ids,false,q);});

 }
 $('#wire-batch-cut')?.addEventListener('click',openWireBatchCut);$('#wire-restock').onclick=()=>openWireRestock(false);$('#wire-search').oninput=e=>draw(e.target.value);$('#wire-new')?.addEventListener('click',()=>editWireType());$('#wire-ledger').onclick=()=>openWireLedger();$('#wire-export')?.addEventListener('click',()=>exportWire());draw();
}
function wireGridColumns(grid){const columns=getComputedStyle(grid).gridTemplateColumns.trim();const repeat=columns.match(/^repeat\((\d+),/);if(repeat)return Number(repeat[1]);if(columns&&columns!=='none')return columns.split(/\s+/).length;return window.innerWidth<=350?1:window.innerWidth<=650?2:window.innerWidth<=1000?3:4;}
window.addEventListener('resize',()=>$('#wire-grid')?.updateWireControls?.());
async function moveWireTile(id,target,visibleIds,insert=false,search=''){
 if(!canDo('wire.edit')||cloudBusy||failedCandidate||!target||id===target)return;
 const ids=[...visibleIds],from=ids.indexOf(id),to=ids.indexOf(target);if(from<0||to<0)return;
 if(insert)ids.splice(to,0,ids.splice(from,1)[0]);else [ids[from],ids[to]]=[ids[to],ids[from]];
 const next=structuredClone(state),items=new Map(next.wireTypes.map(t=>[t.id,t]));let at=0;
 next.wireTypes=next.wireTypes.map(t=>visibleIds.includes(t.id)?items.get(ids[at++]):t);
 try{await wireCommit(next,wt('sortAction'),id,'第 '+(from+1)+' 位 → 第 '+(to+1)+' 位');const input=$('#wire-search');if(input){input.value=search;input.dispatchEvent(new Event('input'));}}catch(e){toast(e.message);}
}
const renderBeforeWire=render;render=function(){renderBeforeWire();if(activeManagementPage().id==='wire')renderWire();};
function editWireType(id){const old=wireType(id);if(!canDo(old?'wire.edit':'wire.create'))return;wireModal(wt(old?'edit':'newType'),field(we('name'),'name',old?.name||'','required maxlength="100"'),'save',async fd=>{const name=String(fd.get('name')||'').trim();if(!name)throw Error(wt('required'));if((state.wireTypes||[]).some(t=>!t.archived&&t.id!==id&&t.name.trim().toLowerCase()===name.toLowerCase()))throw Error(wt('duplicate'));if(old?.name===name){openWire(id);return;}const next=structuredClone(state),item=old?next.wireTypes.find(t=>t.id===id):{id:crypto.randomUUID(),name};if(old)item.name=name;else{next.wireTypes??=[];next.wireTypes.push(item);}await wireCommit(next,wt(old?'editAction':'createAction'),item.id,old?old.name+' → '+name:name);openWire(item.id);});}
function openWire(id){
 const t=wireType(id);if(!t)return;const reels=wireReels(id);
 wireModal(t.name+wt('suffix'),'<div class="wire-tools">'+(canDo('wire.edit')?'<button type="button" id="wire-rename">'+we('edit')+'</button><button type="button" id="wire-reel-sort">'+we('sortSettings')+'</button>':'')+(canDo('wire.create')?'<button type="button" id="wire-reel-new">＋ '+we('newReel')+'</button>':'')+(canDo('admin.export')?'<button type="button" id="wire-one-export">'+we('exportRecords')+'</button>':'')+'</div><div class="ledger-scroll"><table class="ledger-table wire-table"><thead><tr>'+['ordinal','color','status','edit'].map(k=>'<th>'+we(k)+'</th>').join('')+'</tr></thead><tbody>'+reels.map(r=>{const p=r.photos.at(-1);return '<tr><td>'+esc(wireReelOrdinal(r))+'</td><td>'+esc(r.color)+'</td><td>'+(canDo('wire.restock')||canDo('wire.cut')?'<select class="wire-status '+r.status+'" data-reel-status="'+esc(r.id)+'" aria-label="'+we('status')+'">'+['enough','low'].map(s=>'<option value="'+s+'" '+(s===r.status?'selected':'')+' '+(s==='enough'&&!canDo('wire.restock')?'disabled':'')+'>'+we(s)+'</option>').join('')+'</select>':'<span class="wire-status '+r.status+'">'+we(r.status)+'</span>')+'</td><td><button type="button" class="small" data-reel-open="'+esc(r.id)+'">'+we('cutRecords')+'</button>'+(canDo('wire.edit')?'<button type="button" class="small" data-reel-edit="'+esc(r.id)+'">'+we('edit')+'</button>':'')+(canDo('wire.delete')&&!r.photos.length&&!wireCuts(r.id).length?'<button type="button" class="small danger-button" data-reel-delete="'+esc(r.id)+'">'+we('delete')+'</button>':'')+'</td></tr>';}).join('')+'</tbody></table></div>'+(!reels.length?'<p>'+we('empty')+'</p>':'')+wireHistory(id));
 projectMore51('wire',id,$('#modal .wire-tools'));
 $('#wire-reel-sort')?.addEventListener('click',()=>sortWireReels(id));$('#wire-rename')?.addEventListener('click',()=>editWireType(id));$('#wire-reel-new')?.addEventListener('click',()=>editWireReel(id));$('#wire-one-export')?.addEventListener('click',()=>exportWire(id));
 document.querySelectorAll('[data-reel-open]').forEach(b=>b.onclick=()=>openWireReel(b.dataset.reelOpen));document.querySelectorAll('[data-reel-edit]').forEach(b=>b.onclick=()=>editWireReel(id,b.dataset.reelEdit));
 document.querySelectorAll('[data-reel-delete]').forEach(b=>b.onclick=()=>deleteWireReel(b.dataset.reelDelete));
 document.querySelectorAll('[data-reel-status]').forEach(select=>select.onchange=async()=>{select.disabled=true;const old=wireReel(select.dataset.reelStatus),value=select.value;if(old.status===value)return;try{const next=structuredClone(state);next.wireReels.find(r=>r.id===old.id).status=value;await wireCommit(next,wt('statusAction'),id,wireReelOrdinal(old)+'｜'+old.color+'：'+wt(old.status)+' → '+wt(value));openWire(id);}catch(e){select.value=old.status;toast(e.message);}finally{select.disabled=false;}});
}
function nextWireReelNumber(typeId){const values=wireReels(typeId).map(r=>Number(r.number)).filter(n=>Number.isSafeInteger(n)&&n>0);return String(Math.max(0,...values)+1);}
function sortWireReels(typeId){if(!canDo('wire.edit'))return;const reels=wireReels(typeId);numberedOrderDialog(wt('sortSettings'),reels.map(r=>({id:r.id,label:r.color})),async ids=>{const next=structuredClone(state),map=new Map(next.wireReels.map(r=>[r.id,r]));let i=0;next.wireReels=next.wireReels.map(r=>r.wireId===typeId?map.get(ids[i++]):r);await wireCommit(next,wt('sortAction'),typeId,ids.map((id,i)=>(i+1)+'｜'+map.get(id).color).join(' → '));},()=>openWire(typeId));}
function newWireReels(typeId){
 if(!canDo('wire.create')||!wireType(typeId))return;
 const base=wireReels(typeId).length;let rows=0;
 wireModal(wt('newReel'),'<p class="muted">'+we('batchHint')+'</p><div id="wire-reel-batch"></div><button type="button" id="wire-reel-add-five">＋ '+we('addFive')+'</button>','save',async fd=>{
  if(!canDo('wire.create')||!wireType(typeId))throw Error(wt('readonly'));
  const colors=fd.getAll('reelColor').map(x=>String(x).trim()).filter(Boolean);
  if(!colors.length)throw Error(wt('required'));
  if(colors.some(x=>x.length>100))throw Error('顏色最多 100 個字');
  const next=structuredClone(state);next.wireReels??=[];let number=Number(nextWireReelNumber(typeId));const created=[];
  for(const color of colors){if(!Number.isSafeInteger(number))throw Error('線捆編號超出可用範圍');const r={id:crypto.randomUUID(),wireId:typeId,number:String(number++),color,photos:[],status:'enough'};next.wireReels.push(r);created.push(wireReelOrdinal(r,next)+'｜'+color);}
  await wireCommit(next,wt('createAction'),typeId,created.join('；'));openWire(typeId);
 });
 const add=()=>{const box=$('#wire-reel-batch');for(let i=0;i<5;i++){rows++;const label=document.createElement('label');label.className='wire-reel-batch-row';label.innerHTML='<span>'+we('ordinal')+' '+(base+rows)+'</span><input name="reelColor" maxlength="100" placeholder="'+we('color')+'" aria-label="'+we('ordinal')+' '+(base+rows)+' '+we('color')+'">';box.append(label);}};
 $('#wire-reel-add-five').onclick=()=>{const first=rows;add();$('#wire-reel-batch').children[first].querySelector('input').focus();};add();
}
function editWireReel(typeId,id){const old=wireReel(id);if(!canDo(old?'wire.edit':'wire.create'))return;if(!old){newWireReels(typeId);return;}
 wireModal(wt(old?'edit':'newReel'),'<div class="form-grid">'+field(we('color'),'color',old?.color||'','required maxlength="100"')+'</div>'+(old&&canDo('wire.delete')&&!old.photos.length&&!wireCuts(id).length?'<button type="button" class="danger-button" id="reel-delete">'+we('delete')+'</button>':''),'save',async fd=>{const number=old?.number||nextWireReelNumber(typeId),color=String(fd.get('color')||'').trim();if(!number||!color)throw Error(wt('required'));if(wireReels(typeId).some(r=>r.id!==id&&r.number===number))throw Error(wt('duplicate'));const next=structuredClone(state),r=old?next.wireReels.find(r=>r.id===id):{id:crypto.randomUUID(),wireId:typeId,photos:[],status:'enough'};const changes=[];for(const [k,v]of [['number',number],['color',color]]){if(old&&old[k]!==v)changes.push(wt(k)+'：'+old[k]+' → '+v);r[k]=v;}if(old&&!changes.length){openWire(typeId);return;}if(!old){next.wireReels??=[];next.wireReels.push(r);}await wireCommit(next,wt(old?'editAction':'createAction'),typeId,old?changes.join('；'):wireReelOrdinal(r,next)+'｜'+color);openWire(typeId);});
 $('#reel-delete')?.addEventListener('click',async()=>{if(!await confirmAction(wt('deletePrompt')))return;try{const next=structuredClone(state);next.wireReels=next.wireReels.filter(r=>r.id!==id);await wireCommit(next,wt('deleteAction'),typeId,wireReelOrdinal(old)+'｜'+old.color);openWire(typeId);}catch(e){toast(e.message);}});
}
async function deleteWireReel(id){const old=wireReel(id);if(!old||!canDo('wire.delete')||!await confirmAction(wt('deletePrompt')))return;try{const next=structuredClone(state);next.wireReels=next.wireReels.filter(r=>r.id!==id);await wireCommit(next,wt('deleteAction'),old.wireId,wireReelOrdinal(old)+'｜'+old.color);openWire(old.wireId);}catch(e){toast(e.message);}}
function wireCutRows(cuts){const reels=new Map(wireReels().map(r=>[r.id,r])),types=new Map((state.wireTypes||[]).map(t=>[t.id,t]));return cuts.map(c=>{const r=reels.get(c.reelId),t=types.get(r?.wireId);return {c,r,t};}).filter(x=>x.r&&x.t);}
function wireCutTable(rows,withType=true){return '<div class="ledger-scroll"><table class="ledger-table wire-table"><thead><tr>'+['time',...(withType?['name','ordinal','color']:[]),'actor','length','quantity','edit'].map(k=>'<th>'+we(k)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(({c,r,t})=>'<tr><td>'+esc(receiptTime(c.time))+'</td>'+(withType?'<td>'+esc(t.name)+'</td><td>'+esc(wireReelOrdinal(r))+'</td><td>'+esc(r.color)+'</td>':'')+'<td>'+esc(c.actor)+'</td><td>'+c.length+'</td><td>'+c.quantity+'</td><td>'+(wireCanEditCut(c)?'<button type="button" class="small" data-cut-edit="'+esc(c.id)+'">'+we('edit')+'</button>':'')+'</td></tr>').join('')+'</tbody></table></div>'+(!rows.length?'<p>'+we('empty')+'</p>':'');}
function bindCutEdits(){document.querySelectorAll('[data-cut-edit]').forEach(b=>b.onclick=()=>{const c=(state.wireCuts||[]).find(x=>x.id===b.dataset.cutEdit);editWireCut(c.reelId,c.id);});}
function openWireReel(id){const r=wireReel(id),t=wireType(r?.wireId);if(!r||!t)return;
 wireModal(t.name+'｜'+wireReelOrdinal(r)+'｜'+r.color,'<div class="wire-tools"><button type="button" id="wire-back">← '+we('back')+'</button>'+(canDo('wire.cut')?'<button type="button" class="primary" id="wire-cut-new">＋ '+we('newCut')+'</button>':'')+(canDo('admin.export')?'<button type="button" id="wire-reel-export">'+we('exportRecords')+'</button>':'')+'</div>'+wireCutTable(wireCutRows(wireCuts(id)),false));$('#wire-back').onclick=()=>openWire(t.id);$('#wire-cut-new')?.addEventListener('click',()=>editWireCut(id));$('#wire-reel-export')?.addEventListener('click',()=>exportWire(t.id,id));bindCutEdits();
}
function chooseWireCutReel(typeId){
 if(!canDo('wire.cut'))return;
 const reels=wireReels(typeId),t=wireType(typeId);if(!t||!reels.length)return;
 wireModal(t.name+' · '+wt('newCut'),'<label class="field">'+we('selectReel')+'<select id="wire-cut-reel" name="reelId" required><option value="">'+we('selectReel')+'</option>'+reels.map(r=>'<option value="'+esc(r.id)+'">'+esc(wireReelOrdinal(r))+'｜'+esc(r.color)+'</option>').join('')+'</select></label>');
 $('#wire-cut-reel').onchange=e=>{if(wireReels(typeId).some(r=>r.id===e.target.value))editWireCut(e.target.value);};
}
function wireLowField(r){return '<p class="wire-low-warning">'+we('lowWarning')+'</p>'+(canDo('wire.cut')||canDo('wire.restock')?'<label class="wire-low-check"><input type="checkbox" name="markLow" '+(['low','ordered'].includes(r.status)?'checked disabled':'')+'> '+we('markLow')+'</label>':'');}
function editWireCut(reelId,id,onReturn){const r=wireReel(reelId),old=(state.wireCuts||[]).find(c=>c.id===id);if(!r||!(old?wireCanEditCut(old):canDo('wire.cut')))return;
 wireModal(((state.wireTypes||[]).find(t=>t.id===r.wireId)?.name||'')+'｜'+r.color+' · '+wt(old?'edit':'newCut'),'<p>'+we('actor')+'：'+esc(old?.actor||currentUser.name)+'</p><p>'+we('wireBinding')+'：'+esc((state.wireTypes||[]).find(t=>t.id===r.wireId)?.name||'')+'｜'+esc(r.color)+'</p>'+(!old?.batchId?wireProjectField137(old?.projectName||'',!old):'')+wireLowField(r)+'<div class="form-grid">'+field(we('length'),'length',old?.length||'','type="number" min="0.01" max="1000000" step="0.01" required')+field(we('quantity'),'quantity',old?.quantity||'','type="number" min="1" max="1000000" step="1" required')+'</div><p id="wire-cut-total"></p>','save',async fd=>{
 const projectName=wireProjectName137(fd.get('projectName')),length=Number(fd.get('length')),quantity=Number(fd.get('quantity')),low=fd.get('markLow')==='on';if(!old&&!projectName)throw Error(wt('required'));if(!Number.isFinite(length)||length<=0||length>1000000||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000000)throw Error(wt('required'));
 const next=structuredClone(state),reel=next.wireReels.find(x=>x.id===reelId),changes=[];if(old&&!old.batchId&&projectName!==(old.projectName||''))changes.push(wt('projectName')+'：'+projectName);if(old&&old.length!==length)changes.push(wt('length')+'：'+old.length+' → '+length);if(old&&old.quantity!==quantity)changes.push(wt('quantity')+'：'+old.quantity+' → '+quantity);if(low&&reel.status==='enough'){Object.assign(reel,restockTransition(reel,'low',currentUser,actionTime44(),crypto.randomUUID()));changes.push(wt('low'));}if(old&&!changes.length){onReturn?onReturn():openWireReel(reelId);return;}
 const c=old?next.wireCuts.find(x=>x.id===id):{id:crypto.randomUUID(),reelId,actorId:String(currentUser.id),actor:currentUser.name,time:actionTime44(),photoId:''};Object.assign(c,{length,quantity});if(!old)c.batchId=c.id;if(!old?.batchId){if(projectName)c.projectName=projectName;else delete c.projectName;}if(old){c.updatedAt=new Date().toISOString();c.updatedBy=currentUser.name;}else{next.wireCuts??=[];next.wireCuts.unshift(c);}await wireCommit(next,wt(old?'editAction':'createAction')+' '+wt('cutRecords'),r.wireId,wireReelOrdinal(r)+'｜'+r.color+'｜'+(old?changes.join('；'):length+' cm × '+quantity+(low?'｜'+wt('low'):'')));onReturn?onReturn():openWireReel(reelId);
 });const calc=()=>{const l=Number($('#modal [name=length]').value),q=Number($('#modal [name=quantity]').value);$('#wire-cut-total').textContent=wt('total')+'：'+(Number.isFinite(l*q)?Math.round(l*q*100)/100:0);};$('#modal [name=length]').oninput=calc;$('#modal [name=quantity]').oninput=calc;calc();
}
let wireUploading=false;window.addEventListener('beforeunload',e=>{if(wireUploading){e.preventDefault();e.returnValue='';}});
function lockWireModal(){wireUploading=true;const dialog=$('#modal'),form=$('#dialog-form'),inputs=[...form.querySelectorAll('input,button,select')].map(el=>[el,el.disabled]);inputs.forEach(([el])=>el.disabled=true);const prevent=e=>e.preventDefault();dialog.addEventListener('cancel',prevent);return()=>{wireUploading=false;dialog.removeEventListener('cancel',prevent);inputs.forEach(([el,disabled])=>el.disabled=disabled);};}
function wireCsvRows(rows,source=state){return [[wt('projectName'),wt('time'),wt('name'),wt('ordinal'),wt('color'),wt('actor'),wt('length'),wt('quantity'),wt('total'),wt('updated'),wt('modifiedBy')],...rows.map(({c,r,t})=>[c.projectName||wt('unfiled'),receiptTime(c.time),t.name,wireReelOrdinal(r,source),r.color,c.actor,c.length,c.quantity,Math.round(c.length*c.quantity*100)/100,c.updatedAt?receiptTime(c.updatedAt):'',c.updatedBy||''])];}
function wireProjectKey137(name){return String(name||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();}
function wireProjectName137(value){const name=String(value||'').trim().replace(/\s+/g,' '),key=wireProjectKey137(name);return key?(state.wireCuts||[]).find(c=>wireProjectKey137(c.projectName)===key)?.projectName||name:'';}
function wireProjectField137(value='',required=true){
 const names=new Map();for(const c of state.wireCuts||[])if(c.projectName)names.set(wireProjectKey137(c.projectName),c.projectName);
 return '<label class="field">'+we('projectName')+'<input name="projectName" list="wire-project-options137" maxlength="100" placeholder="'+we('projectHint')+'" value="'+esc(value)+'" '+(required?'required':'')+'></label><datalist id="wire-project-options137">'+[...names.values()].map(name=>'<option value="'+esc(name)+'"></option>').join('')+'</datalist>';
}
function wireGroup137(rows,keyOf){const map=new Map();for(const row of rows){const key=keyOf(row);if(!map.has(key))map.set(key,[]);map.get(key).push(row);}return map;}
function wireBatchKey137(c){return c.batchId||c.id;}
function wireTable137(headers,body){return '<div class="ledger-scroll"><table class="ledger-table wire-table"><thead><tr>'+headers.map(k=>'<th>'+we(k)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';}
function openWireLedger(typeId='',filters={}){
 wireModal(wt('ledger'),'<div class="wire-tools wire-ledger-tools142"><input id="wire-ledger-query" placeholder="'+we('caseSearch')+'" aria-label="'+we('caseSearch')+'"><select id="wire-ledger-type" aria-label="'+we('name')+'"><option value="">'+we('all')+'</option>'+(state.wireTypes||[]).map(t=>'<option value="'+esc(t.id)+'" '+(t.id===typeId?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select><label>'+we('from')+'<input type="date" id="wire-ledger-from"></label><label>'+we('to')+'<input type="date" id="wire-ledger-to"></label>'+(canDo('admin.export')?'<button type="button" id="wire-ledger-export">'+we('exportTable')+'</button>':'')+'<button type="button" id="wire-all-usage137">'+we('allUsage')+'</button></div><div id="wire-ledger-table"></div>');
 let shown=[];const ids=['query','type','from','to'],el=id=>$('#wire-ledger-'+id),values=()=>Object.fromEntries(ids.map(id=>[id,el(id).value]));
 for(const id of ids)if(filters[id]!==undefined)el(id).value=filters[id];
 function draw(){const {query,type,from,to}=values(),q=wireProjectKey137(query);
  shown=wireCutRows(wireCuts()).filter(({c,r,t})=>{const day=(from||to)?new Date(c.time).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}):'';return(!type||t.id===type)&&(!from||day>=from)&&(!to||day<=to)&&(!q||wireProjectKey137([c.projectName||wt('unfiled'),t.name,wireReelOrdinal(r),r.color,c.actor].join(' ')).includes(q));});
  const cases=[...wireGroup137(shown,x=>wireProjectKey137(x.c.projectName))],summary=cases.map(([key,rows],i)=>{const c=rows[0].c;return '<tr tabindex="0" data-wire-case137="'+i+'"><td>'+esc(c.projectName||wt('unfiled'))+'</td><td>'+esc(receiptTime(c.time))+'</td><td>'+esc(c.actor)+'</td><td>'+new Set(rows.map(x=>wireBatchKey137(x.c))).size+'</td></tr>';}).join('');
  const box=el('table');box.innerHTML=summary?wireTable137(['projectName','lastCut','lastActor','batchCount'],summary):'<p>'+we('empty')+'</p>';
  for(const row of box.querySelectorAll('[data-wire-case137]')){row.onclick=()=>{const saved=values();openWireCase137(cases[Number(row.dataset.wireCase137)][0],'',()=>openWireLedger(typeId,saved));};row.onkeydown=e=>{if(e.target===row&&['Enter',' '].includes(e.key)){e.preventDefault();row.click();}};}
 }
 for(const id of ids)el(id).oninput=draw;
 $('#wire-all-usage137').onclick=()=>openWireUsage137(null,draw);
 $('#wire-ledger-export')?.addEventListener('click',async()=>{if(!await authorizeExport())return;await downloadBlob(new Blob([platingCsv(wireCsvRows(shown))],{type:'text/csv;charset=utf-8'}),wt('ledger')+'.csv');});draw();
}
// Keep ledger and totals aligned with the management tile order.
function wireCompare141(a,b){
 const types=state.wireTypes||[],rank=id=>{const index=types.findIndex(t=>t.id===id);return index<0?types.length:index;};
 const colors=['黑','棕','紅','橙','黃','綠','藍','紫','灰','白'],colorRank=color=>{const index=colors.indexOf(String(color||'').trim());return index<0?colors.length:index;};
 return rank(a.t.id)-rank(b.t.id)||a.t.id.localeCompare(b.t.id)||colorRank(a.r.color)-colorRank(b.r.color)||Number(wireReelOrdinal(a.r))-Number(wireReelOrdinal(b.r))||String(b.c.time).localeCompare(String(a.c.time))||String(b.c.id).localeCompare(String(a.c.id));
}
function wireSorted141(rows){return [...rows].sort(wireCompare141);}
function wireCutRow137({c,r,t},selectable=false,focused=false){return (focused?'<tr class="notification-focus93">':'<tr>')+(selectable?'<td>'+(wireCanEditCut(c)?'<input type="checkbox" aria-label="'+we('archivePick139')+'" data-wire-archive139="'+esc(c.id)+'">':'')+'</td>':'')+[c.projectName||wt('unfiled'),receiptTime(c.time),c.actor,t.name,wireReelOrdinal(r),r.color,c.length,c.quantity,Math.round(c.length*c.quantity*100)/100].map(value=>'<td>'+esc(String(value))+'</td>').join('')+'<td><div class="wire-tools">'+(wireCanEditCut(c)?'<button type="button" data-wire-edit137="'+esc(c.id)+'">'+we('edit')+'</button>':'')+(canDo('wire.delete')?'<button type="button" data-wire-delete137="'+esc(c.id)+'">'+we('delete')+'</button>':'')+'</div></td></tr>';}
function wireDetailTable137(rows,selected=''){return rows.length?wireTable137(['projectName','time','actor','name','ordinal','color','length','quantity','total','edit'],wireSorted141(rows).map(row=>wireCutRow137(row,false,!!selected&&wireBatchKey137(row.c)===selected)).join('')):'<p>'+we('empty')+'</p>';}
async function wireDeleteCut137(id){
 if(!canDo('wire.delete'))return false;const c=(state.wireCuts||[]).find(x=>x.id===id),r=wireReel(c?.reelId);if(!c||!r)return false;
 if(!await confirmAction(wt('deleteCutPrompt')+' '+[c.projectName||wt('unfiled'),receiptTime(c.time),c.actor,c.length+' cm × '+c.quantity].join('｜')))return false;
 const next=structuredClone(state);next.wireCuts=next.wireCuts.filter(x=>x.id!==id);await wireCommit(next,wt('delete')+' '+wt('cutRecords'),r.wireId,[c.projectName||wt('unfiled'),receiptTime(c.time),c.actor,r.color,c.length+' cm × '+c.quantity].join('｜'));return true;
}
function wireBindDetails137(box,done,editDone=done){
 for(const b of box.querySelectorAll('[data-wire-edit137]'))b.onclick=()=>{const c=(state.wireCuts||[]).find(x=>x.id===b.dataset.wireEdit137);if(c)editWireCut(c.reelId,c.id,editDone);};
 for(const b of box.querySelectorAll('[data-wire-delete137]'))b.onclick=async()=>{try{if(await wireDeleteCut137(b.dataset.wireDelete137))done();}catch(e){toast(e.message);}};
}
Object.assign(wireWords,{archivePick139:'選取裁線紀錄',archiveAll139:'全選可歸檔紀錄',archiveSave139:'歸檔所選紀錄',archiveEmpty139:'請選擇要歸檔的紀錄',archiveConfirm139:'確定將所選裁線紀錄歸檔至',archiveChanged139:'紀錄已變更，請重新選取'});
function openWireUnfiled139(rows,back){
 const allow=rows.some(x=>wireCanEditCut(x.c)),controls='<div class="wire-tools"><button type="button" id="wire-unfiled-back139">← '+we('backLedger')+'</button><button type="button" id="wire-unfiled-usage139">'+we('caseUsage')+'</button></div>';
 const form=allow?wireProjectField137()+'<label><input type="checkbox" id="wire-archive-all139"> '+we('archiveAll139')+'</label> <output id="wire-archive-count139" aria-live="polite"></output>':'';
 wireModal(wt('unfiled')+'｜'+wt('caseCuts'),controls+form+(rows.length?wireTable137([...(allow?['archivePick139']:[]),'projectName','time','actor','name','ordinal','color','length','quantity','total','edit'],wireSorted141(rows).map(row=>wireCutRow137(row,allow)).join('')):'<p>'+we('empty')+'</p>'),allow?'archiveSave139':undefined,async fd=>{
  const ids=new Set(boxes.filter(x=>x.checked).map(x=>x.dataset.wireArchive139)),name=wireProjectName137(fd.get('projectName'));
  if(!ids.size)throw Error(wt('archiveEmpty139'));if(!name)throw Error(wt('required'));
  if(!await confirmAction(wt('archiveConfirm139')+' '+name+'（'+ids.size+'）？'))return;
  const next=structuredClone(state),cuts=(next.wireCuts||[]).filter(c=>ids.has(c.id));
  if(cuts.length!==ids.size||cuts.some(c=>c.batchId||c.projectName||!wireCanEditCut(c)))throw Error(wt('archiveChanged139'));
  const time=actionTime44();for(const c of cuts)Object.assign(c,{projectName:name,updatedAt:time,updatedBy:currentUser.name});
  await wireCommit(next,wt('archiveSave139'),wireReel(cuts[0].reelId)?.wireId||'usage',name+'｜'+ids.size);
  openWireCase137(wireProjectKey137(name),'',back);
 });
 $('#wire-unfiled-back139').onclick=back;$('#wire-unfiled-usage139').onclick=()=>openWireUsage137('');
 const dialog=$('#dialog-form'),boxes=[...dialog.querySelectorAll('[data-wire-archive139]')],all=$('#wire-archive-all139');
 if(all){const update=()=>{const count=boxes.filter(x=>x.checked).length;all.checked=count===boxes.length;all.indeterminate=count>0&&count<boxes.length;$('#wire-archive-count139').textContent=count+' / '+boxes.length;};all.onchange=()=>{for(const box of boxes)box.checked=all.checked;update();};for(const box of boxes)box.onchange=update;update();}
 wireBindDetails137(dialog,()=>openWireCase137('','',back));
}
function openWireCase137(key,selected='',back=()=>openWireLedger()){
 const rows=wireCutRows(wireCuts()).filter(x=>wireProjectKey137(x.c.projectName)===key),name=rows[0]?.c.projectName||wt('unfiled');
 if(!key)return openWireUnfiled139(rows,back);
 wireModal(name+'｜'+wt('caseCuts'),'<div class="wire-tools"><button type="button" id="wire-case-back137">← '+we('backLedger')+'</button><button type="button" id="wire-case-usage137">'+we('caseUsage')+'</button></div><h3>'+we('cutHistory')+'</h3><div id="wire-case-batches137">'+wireDetailTable137(rows,selected)+'</div>');
 $('#wire-case-back137').onclick=back;$('#wire-case-usage137').onclick=()=>openWireUsage137(key);
 const box=$('#wire-case-batches137');wireBindDetails137(box,()=>openWireCase137(key,selected,back));
 if(selected)box.querySelector('.notification-focus93')?.scrollIntoView({block:'nearest'});
}
function wireUsageRows137(rows,cutoffs){
 return [...wireGroup137(rows,x=>x.r.id)].map(([id,items])=>{const start=[cutoffs?.all||'',cutoffs?.reels?.[id]||''].sort().at(-1),active=items.filter(x=>!start||Date.parse(x.c.time)>Date.parse(start));
  return {...items[0],start,quantity:active.reduce((n,x)=>n+x.c.quantity,0),meters:active.reduce((n,x)=>n+x.c.length*x.c.quantity,0)/100,items};
 }).sort(wireCompare141);
}
function wireUsageTypes138(groups){
 const byType=wireGroup137(groups,x=>x.t.id),order=new Set([...wireTypes().map(t=>t.id),...byType.keys()]);
 return [...order].filter(id=>byType.has(id)).map(id=>{
  const reels=byType.get(id);
  return {id,name:reels[0].t.name,reels,quantity:reels.reduce((sum,x)=>sum+x.quantity,0),meters:reels.reduce((sum,x)=>sum+x.meters,0)};
 });
}
function openWireUsage137(caseKey=null,onChange=()=>{}){
 const all=caseKey===null,dialog=document.createElement('dialog');dialog.className='wire-usage-dialog137';dialog.innerHTML='<div class="modal-head"><h2>'+(all?we('allUsage'):we('caseUsage'))+'</h2><button type="button" aria-label="'+we('close')+'" data-close-wire137>×</button></div><div class="modal-body"></div><div class="modal-foot"><button type="button" data-close-wire137>'+we('close')+'</button></div>';
 const body=dialog.querySelector('.modal-body'),expanded=new Set();dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.querySelectorAll('[data-close-wire137]').forEach(b=>b.onclick=()=>dialog.close());document.body.append(dialog);draw();dialog.showModal();
 async function reset(id){
  if(!canDo('wire.edit')||!await confirmAction(wt('resetUsagePrompt')))return;
  const next=structuredClone(state),time=actionTime44(),usage=next.wireUsage137||{all:'',reels:{}};
  if(id)usage.reels[id]=time;else{usage.all=time;usage.reels={};}next.wireUsage137=usage;
  await wireCommit(next,wt(id?'resetOneUsage':'resetAllUsage'),wireReel(id)?.wireId||'usage',time);onChange();draw();
 }
 function draw(){
  const rows=wireCutRows(wireCuts()).filter(x=>all||wireProjectKey137(x.c.projectName)===caseKey),groups=wireUsageRows137(rows,all?state.wireUsage137:null);
  const openTypes=new Set([...body.querySelectorAll('[data-wire-usage-type138][open]')].map(d=>d.dataset.wireUsageType138));
  const table=reels=>wireTable137(['name','ordinal','color','usageQuantity','usageLength',...(all?['usageStart','edit']:[])],reels.map(({r,t,quantity,meters,start,items})=>'<tr>'+[t.name,wireReelOrdinal(r),r.color,quantity,Number(meters.toFixed(6)),...(all?[start?receiptTime(start):wt('usageBeginning')]:[])].map(value=>'<td>'+esc(String(value))+'</td>').join('')+(all?'<td><div class="wire-tools">'+(canDo('wire.edit')?'<button type="button" data-wire-reset137="'+esc(r.id)+'">'+we('resetOneUsage')+'</button>':'')+'<button type="button" data-wire-source137="'+esc(r.id)+'">'+we('usageSources')+'</button></div></td>':'')+'</tr>'+(all&&expanded.has(r.id)?'<tr><td colspan="7">'+wireDetailTable137(items)+'</td></tr>':'')).join(''));
  const content=!groups.length?'<p>'+we('empty')+'</p>':!all?table(groups):wireUsageTypes138(groups).map(({id,name,reels,quantity,meters})=>
   '<details class="wire-usage-type138" data-wire-usage-type138="'+esc(id)+'" '+(openTypes.has(id)?'open':'')+'><summary><strong>'+esc(name)+'</strong><span>'+we('usageQuantity')+'：'+quantity+'</span><span>'+we('usageLength')+'：'+Number(meters.toFixed(6))+'</span></summary>'+table(reels)+'</details>').join('');
  body.innerHTML=(all?'<div class="wire-tools"><span>'+we('usageStart')+'：'+(state.wireUsage137?.all?esc(receiptTime(state.wireUsage137.all)):we('usageBeginning'))+'</span>'+(canDo('wire.edit')?'<button type="button" data-wire-reset137="">'+we('resetAllUsage')+'</button>':'')+'</div>':'')+content;
  body.querySelectorAll('[data-wire-reset137]').forEach(b=>b.onclick=()=>reset(b.dataset.wireReset137).catch(e=>toast(e.message)));
  body.querySelectorAll('[data-wire-source137]').forEach(b=>b.onclick=()=>{const id=b.dataset.wireSource137;if(expanded.has(id))expanded.delete(id);else expanded.add(id);draw();});
  body.querySelectorAll('[data-wire-edit137]').forEach(b=>b.remove());
  wireBindDetails137(body,()=>{onChange();draw();});
 }
}
function wireCutTarget137(){
 if(!cloudReady||cloudBusy)return false;if(!canDo('wire.view'))return true;const url=new URL(location.href),id=url.searchParams.get('notificationWireCut');if(!id)return true;if(url.hash!=='#wire'){location.hash='#wire';return false;}if(activeManagementPage().id!=='wire'||!$('#wire-grid'))return false;
 url.searchParams.delete('notificationWireCut');history.replaceState(history.state,'',url);const c=(state.wireCuts||[]).find(x=>wireBatchKey137(x)===id);
 if(c)openWireCase137(wireProjectKey137(c.projectName),id);else{openWireLedger();toast(wt('cutNotFound'));}return true;
}

let wireExportBusy=false;
async function exportWire(typeId='',reelId=''){
 if(wireExportBusy)return;wireExportBusy=true;if(!await authorizeExport()){wireExportBusy=false;return;}const snapshot=structuredClone(state),types=(snapshot.wireTypes||[]).filter(t=>!typeId||t.id===typeId),reels=(snapshot.wireReels||[]).filter(r=>types.some(t=>t.id===r.wireId)&&(!reelId||r.id===reelId)),cuts=(snapshot.wireCuts||[]).filter(c=>reels.some(r=>r.id===c.reelId)).sort((a,b)=>b.time.localeCompare(a.time));const entries=[];
 try{
 const rows=cuts.map(c=>{const r=reels.find(r=>r.id===c.reelId);return {c,r,t:types.find(t=>t.id===r.wireId)};});entries.push({name:'補貨歷史.csv',data:platingCsv([['線材','顏色','動作','時間','人員'],...reels.flatMap(r=>[...(r.restockHistory||[]),...(r.restock?[r.restock]:[])].flatMap(c=>(c.events||[]).map(e=>[types.find(t=>t.id===r.wireId).name,r.color,({low:'需補貨',order:'已訂購',receive:'已入庫',undoOrder:'撤銷訂購',undoReceive:'撤銷入庫'})[e.action],receiptTime(e.time),e.actor])))])},{name:'裁線紀錄.csv',data:platingCsv(wireCsvRows(rows,snapshot))},{name:'線捆庫存.csv',data:platingCsv([[wt('name'),wt('ordinal'),wt('color'),wt('status')],...reels.map(r=>[types.find(t=>t.id===r.wireId).name,wireReelOrdinal(r,snapshot),r.color,wt(r.status)])])},{name:'文字紀錄.csv',data:platingCsv([['時間','人員','動作','內容'],...(snapshot.logs||[]).filter(l=>types.some(t=>l.project==='wire:'+t.id)).map(l=>[receiptTime(l.time),l.actor,l.action,l.detail])])});await downloadBlob(makeZip(entries),'線材紀錄_'+photoStamp(new Date())+'.zip');
 }catch(e){toast(e.message);}finally{wireExportBusy=false;}
}
const renderAdminBeforeWire=renderAdmin;renderAdmin=function(){renderAdminBeforeWire();if(!canAdmin75())return;const card=document.createElement('details');card.id='wire-admin';card.className='admin-card';card.innerHTML='<summary><h2>'+we('title')+'</h2></summary><div class="admin-card-body"><div class="wire-tools"><button type="button" id="wire-text">'+we('textSettings')+'</button><button type="button" id="wire-admin-new">＋ '+we('newType')+'</button><a class="admin-back-button" href="#wire">'+we('open')+'</a></div>'+wireTypes().map(t=>'<div class="admin-row"><strong>'+esc(t.name)+we('suffix')+'</strong><button type="button" data-wire-admin-open="'+esc(t.id)+'">'+we('edit')+'</button></div>').join('')+'</div>';$('main').append(card);$('#wire-admin-new').onclick=()=>editWireType();card.querySelectorAll('[data-wire-admin-open]').forEach(b=>b.onclick=()=>openWire(b.dataset.wireAdminOpen));$('#wire-text').onclick=()=>wireModal(wt('textSettings'),Object.keys(wireWords).map(k=>field(esc(wireWords[k]),k,wt(k),'required maxlength="100"')).join(''),'save',async fd=>{const next=structuredClone(state);next.wireText=Object.fromEntries(Object.keys(wireWords).map(k=>[k,String(fd.get(k)||'').trim()]));if(Object.values(next.wireText).some(v=>!v))throw Error(wt('required'));if(stableJSON(next.wireText)===stableJSON(state.wireText)){$('#modal').close();return;}await wireCommit(next,wt('editAction')+' '+wt('textSettings'),'','');$('#modal').close();renderAdmin();});};

function openWireRestock(){
 wireModal(wt('restockList'),'<p class="muted">最新新增的補貨紀錄固定顯示在最上方；更新訂購或入庫狀態不會重新排序。</p><div id="wire-restock-list"></div>');
 const stamp=r=>r.restock?.reported?.time||'';
 function draw(){const rows=wireReels().filter(r=>['low','ordered'].includes(r.status)&&wireType(r.wireId)).sort((a,b)=>stamp(b).localeCompare(stamp(a))||String(b.restock?.id||'').localeCompare(String(a.restock?.id||'')));$('#wire-restock-list').innerHTML='<div class="wire-restock-tools94"><strong>待處理 '+rows.length+' 捆</strong>'+(canDo('wire.restock')&&rows.length?'<button type="button" class="danger-button" id="wire-restock-delete94">刪除補貨紀錄</button>':'')+'</div><div class="ledger-scroll"><table class="ledger-table wire-table"><thead><tr><th class="wire-restock-select94"></th><th>線材</th><th>編號</th><th>顏色</th><th>補貨狀態</th><th>登記／處理時間</th></tr></thead><tbody>'+rows.map(r=>'<tr data-restock-row="'+esc(r.id)+'"><td>'+(canDo('wire.restock')?'<input type="checkbox" data-restock-select94="'+esc(r.id)+'" aria-label="選擇 '+esc((state.wireTypes||[]).find(t=>t.id===r.wireId)?.name||'')+' '+esc(r.color)+'">':'')+'</td><td>'+esc((state.wireTypes||[]).find(t=>t.id===r.wireId)?.name||'')+'</td><td>'+esc(wireReelOrdinal(r))+'</td><td>'+esc(r.color)+'</td><td>'+(canDo('wire.restock')?'<select data-restock-status="'+esc(r.id)+'" class="wire-status '+r.status+'"><option value="low" '+(r.status==='low'?'selected':'')+'>'+we('low')+'</option><option value="ordered" '+(r.status==='ordered'?'selected':'')+'>'+we('ordered')+'</option><option value="enough">'+we('enough')+'</option></select>':'<span class="wire-status '+r.status+'">'+we(r.status)+'</span>')+'</td><td><small>需補貨：'+esc(r.restock?.reported?.time?receiptTime(r.restock.reported.time):'—')+(r.restock?.ordered?.time?'<br>已訂購：'+esc(receiptTime(r.restock.ordered.time)):'')+'</small></td></tr>').join('')+'</tbody></table></div>'+(!rows.length?'<p>目前沒有待處理的線捆。</p>':'');
 document.querySelectorAll('[data-restock-status]').forEach(select=>select.onchange=async()=>{if(!canDo('wire.restock'))return;const r=wireReel(select.dataset.restockStatus),value=select.value;if(value===r.status)return;select.disabled=true;try{const action=value==='ordered'?'order':value==='enough'?'receive':'undoOrder',next=structuredClone(state),changed=restockTransition(next.wireReels.find(x=>x.id===r.id),action,currentUser,actionTime44());Object.assign(next.wireReels.find(x=>x.id===r.id),changed);await wireCommit(next,wt('statusAction'),r.wireId,wireReelOrdinal(r)+'｜'+r.color+'：'+wt(r.status)+' → '+wt(value));draw();}catch(e){select.value=r.status;select.disabled=false;toast(e.message);}});
 $('#wire-restock-delete94')?.addEventListener('click',async()=>{const ids=[...document.querySelectorAll('[data-restock-select94]:checked')].map(x=>x.dataset.restockSelect94);if(!ids.length)return toast('請先勾選要刪除的補貨紀錄');if(!await confirmAction('確定刪除已選的 '+ids.length+' 筆補貨紀錄？線材與裁線歷史會保留。'))return;const next=structuredClone(state),details=[];for(const id of ids){const old=next.wireReels.find(x=>x.id===id);if(!old)continue;details.push((wireType(old.wireId)?.name||'')+'｜'+old.color);Object.assign(old,restockTransition(old,'deleteRestock',currentUser,actionTime44()));}state=next;draw();try{addAudit('刪除補貨紀錄',details.join('；'),wt('title')+' > '+wt('restockList'),'wire:restock');await saveCloud(state);if(failedCandidate)throw Error(wt('saveFail'));toast('已刪除 '+details.length+' 筆補貨紀錄');}catch(e){draw();toast(e.message||wt('saveFail'));}});
 }draw();
}
function openWireBatchCut(){
 if(!canDo('wire.cut'))return;const reels=wireReels().filter(r=>wireType(r.wireId));
 if(!reels.length){toast('請先新增線材與線捆');return;}
 let serial=0;
 wireModal(wt('newCut'),'<p>'+we('actor')+'：'+esc(currentUser.name)+'</p><p class="muted">'+we('batchCutHint')+'</p><p class="wire-low-warning">'+we('lowWarning')+'</p>'+wireProjectField137()+'<div class="wire-batch-scroll"><table class="wire-batch-table"><thead><tr>'+['rowNumber','name','color','length','quantity','total','low'].map(k=>'<th>'+we(k)+'</th>').join('')+'</tr></thead><tbody id="wire-cut-batch-rows"></tbody></table></div><button type="button" id="wire-cut-add-five">＋ '+we('addFive')+'</button>','save',async fd=>{
  const projectName=wireProjectName137(fd.get('projectName'));if(!projectName)throw Error(wt('required'));
  if(!canDo('wire.cut')||cloudBusy||failedCandidate)throw Error(wt('saveFail'));
  const entries=[];for(const row of document.querySelectorAll('#wire-cut-batch-rows tr')){const typeId=row.querySelector('[data-batch-type]').value,reelId=row.querySelector('[data-batch-reel]').value,l=row.querySelector('[data-batch-length]').value,q=row.querySelector('[data-batch-quantity]').value,low=row.querySelector('[data-batch-low]').checked;if(!typeId&&!reelId&&!l&&!q&&!low)continue;const length=Number(l),quantity=Number(q),r=wireReel(reelId);if(!r||r.wireId!==typeId||!wireType(r.wireId)||!Number.isFinite(length)||length<=0||length>1000000||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000000)throw Error(wt('rowNumber')+' '+row.dataset.batchRow+'：'+wt('cutRowRequired'));entries.push({rowId:row.dataset.batchRow,r,length,quantity,low});}
  if(!entries.length)throw Error(wt('cutRowsRequired'));
  const restore=lockWireModal();try{
   const next=structuredClone(state);next.wireCuts??=[];const now=actionTime44(),batchId=crypto.randomUUID();let first=true;
   for(const e of entries){const r=next.wireReels.find(x=>x.id===e.r.id);if(e.low)Object.assign(r,restockTransition(r,'low',currentUser,now,crypto.randomUUID()));next.wireCuts.unshift({id:first?batchId:crypto.randomUUID(),batchId,projectName,reelId:r.id,actorId:String(currentUser.id),actor:currentUser.name,time:now,length:e.length,quantity:e.quantity,photoId:''});first=false;}
   state=next;for(const e of entries)addAudit(wt('createAction')+' '+wt('cutRecords'),wireReelOrdinal(e.r)+'｜'+e.r.color+'｜'+e.length+' cm × '+e.quantity+(e.low?'｜'+wt('low'):''),wt('title')+' > '+wireType(e.r.wireId).name,'wire:'+e.r.wireId);
   await saveCloud(state);if(failedCandidate)throw Error(wt('saveFail'));$('#modal').close();render();toast(wt('cutSaved'));
  }finally{restore();}
 });
 function add(){const body=$('#wire-cut-batch-rows');for(let i=0;i<5;i++){const tr=document.createElement('tr');tr.dataset.batchRow=String(++serial);tr.innerHTML='<td>'+serial+'</td><td><select data-batch-type aria-label="第 '+serial+' 列線材"><option value="">'+we('chooseWire')+'</option>'+wireTypes().filter(t=>reels.some(r=>r.wireId===t.id)).map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select></td><td><select data-batch-reel disabled aria-label="第 '+serial+' 列顏色"><option value="">'+we('chooseWireFirst')+'</option></select></td><td><input data-batch-length type="number" min="0.01" max="1000000" step="0.01" aria-label="每條長度 cm"></td><td><input data-batch-quantity type="number" min="1" max="1000000" step="1" aria-label="條數"></td><td data-batch-total>0</td><td>'+'<input data-batch-low type="checkbox" aria-label="需補貨">'+'</td>';tr.querySelector('[data-batch-type]').onchange=e=>{const colors=tr.querySelector('[data-batch-reel]');colors.innerHTML='<option value="">'+(e.target.value?we('chooseColor'):we('chooseWireFirst'))+'</option>'+reels.filter(r=>r.wireId===e.target.value).map(r=>'<option value="'+esc(r.id)+'">'+esc(r.color)+'</option>').join('');colors.disabled=!e.target.value;colors.value='';tr.querySelector('[data-batch-low]').checked=false;tr.querySelector('[data-batch-low]').disabled=false;};tr.querySelector('[data-batch-reel]').onchange=e=>{const r=wireReel(e.target.value),check=tr.querySelector('[data-batch-low]');check.checked=r?.status==='low';check.disabled=['low','ordered'].includes(r?.status);check.title=r?.status==='ordered'?'已進貨中，不需重複標記':'';};tr.oninput=()=>{const total=Number(tr.querySelector('[data-batch-length]').value)*Number(tr.querySelector('[data-batch-quantity]').value);tr.querySelector('[data-batch-total]').textContent=Number.isFinite(total)?String(Math.round(total*100)/100):'—';};body.append(tr);}}
 $('#wire-cut-add-five').onclick=add;add();
}
