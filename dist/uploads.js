function canDeleteTextLog(){return ['warehouse','supervisor'].includes(currentUser.role);}
function textLogDeleteButton(id){return canDeleteTextLog()?'<button type="button" class="text-log-delete" data-text-log-delete="'+esc(id)+'" aria-label="刪除此筆文字紀錄">刪除</button>':'';}
function textLogLine(entry,text){return '<div class="text-history-row" data-history-log="'+esc(entry.id)+'"><span class="text-history-content">'+esc(text)+'</span>'+textLogDeleteButton(entry.id)+'</div>';}
async function deleteTextLog(id){
 if(!canDeleteTextLog()||cloudBusy||failedCandidate)return false;
 if(!state.logs.some(x=>x.id===id))return false;
 if(!await confirmAction('確定刪除此筆文字紀錄？只刪除紀錄文字，不會撤銷庫存、裁線或其他資料變更，刪除後無法還原。'))return false;
 if(cloudBusy||failedCandidate)return false;
 state.logs=state.logs.filter(x=>x.id!==id);await saveCloud(state);
 if(failedCandidate){toast('紀錄尚未刪除成功，請處理儲存提示');return false;}
 document.querySelectorAll('[data-history-log]').forEach(row=>{if(row.dataset.historyLog===id)row.remove();});
 const p=project();if(p&&$('#project-history-list'))refreshProjectHistory(p);
 document.querySelectorAll('.wire-history,.plating-history').forEach(box=>{const summary=box.querySelector('summary');if(summary)summary.textContent=summary.textContent.replace(/（\d+）/, '（'+box.querySelectorAll('[data-history-log]').length+'）');});
 toast('文字紀錄已刪除');return true;
}
document.addEventListener('click',async e=>{const button=e.target.closest('[data-text-log-delete]');if(!button)return;e.preventDefault();e.stopPropagation();button.disabled=true;try{await deleteTextLog(button.dataset.textLogDelete);}finally{if(button.isConnected)button.disabled=false;}});
'use strict';
let imageUploading=false;
function showLogo(){const brand=$('.brand');if(!brand||brand.querySelector('.site-logo'))return;const img=document.createElement('img');img.className='site-logo';img.alt='網站 LOGO';img.hidden=true;img.onload=()=>{img.hidden=false;brand.querySelector('.mark')?.remove();};img.dataset.photoSrc='/api/logo';img.dataset.photoThumb='1';brand.prepend(img);}
function canvasBlob(canvas,type,quality){return new Promise(resolve=>canvas.toBlob(resolve,type,quality));}
async function compressReceiptImage(file,maxBytes=2*1024*1024){
 if(!file)throw Error('請先選擇圖片');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('請選擇 JPG、PNG 或 WebP 圖片');
 if(file.size<=maxBytes)return file;
 let image;try{image=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw Error('這張圖片無法讀取，請改用 JPG、PNG 或 WebP');}
 let width=image.width,height=image.height,scale=Math.min(1,3000/Math.max(width,height));width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});let blob=null;
 for(let round=0;round<7;round++){
  canvas.width=width;canvas.height=height;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
  for(const quality of [.9,.82,.74,.66,.58,.5]){blob=await canvasBlob(canvas,'image/jpeg',quality);if(blob&&blob.size<=maxBytes)break;}
  if(blob&&blob.size<=maxBytes)break;width=Math.max(1,Math.round(width*.82));height=Math.max(1,Math.round(height*.82));
 }
 image.close?.();if(!blob||blob.size>maxBytes)throw Error('圖片壓縮後仍超過 2 MB，請先裁切後再上傳');
 const name=file.name.replace(/\.[^.]+$/, '')+'.jpg';return new File([blob],name,{type:'image/jpeg',lastModified:file.lastModified});
}
async function uploadImage(file,url,limit){if(!file)throw Error('請先選擇圖片');if((url.startsWith('/api/receipts')||url.startsWith('/api/plating-photos')||url.startsWith('/api/wire-photos')))file=await compressReceiptImage(file);if(file.size>limit*1024*1024)throw Error('圖片限 '+limit+' MB');if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('請選擇 JPG、PNG 或 WebP 圖片');const thumbnail=await makePhotoThumbnail(file);const body=new FormData();body.append('photo',file);if(url.startsWith('/api/logo'))body.append('appIcon',await makeAppIcon52(file),'app-icon.png');body.append('thumbnail',thumbnail,'thumbnail.jpg');const r=await apiFetch(url,{method:'POST',headers:{'X-File-Name':encodeURIComponent(file.name)},body});const d=await r.json();if(!r.ok)throw Error(d.error||'上傳失敗');if(url.startsWith('/api/logo'))clearPhotoCache();return{...d,uploadedName:file.name,uploadedSize:file.size};}
const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function zipDate(value){const d=new Date(value||Date.now()),year=Math.max(1980,d.getFullYear());return{time:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),date:((year-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()};}
function zipPart(size,writer){const bytes=new Uint8Array(size),view=new DataView(bytes.buffer),put16=(offset,value)=>view.setUint16(offset,value,true),put32=(offset,value)=>view.setUint32(offset,value>>>0,true);writer({bytes,put16,put32});return bytes;}
function makeZip(entries){const encoder=new TextEncoder(),local=[],central=[];let offset=0;for(const entry of entries){const name=encoder.encode(entry.name),data=entry.data instanceof Uint8Array?entry.data:new Uint8Array(entry.data),crc=crc32(data),stamp=zipDate(entry.date);const head=zipPart(30+name.length,({bytes,put16,put32})=>{put32(0,0x04034b50);put16(4,20);put16(6,0x0800);put16(8,0);put16(10,stamp.time);put16(12,stamp.date);put32(14,crc);put32(18,data.length);put32(22,data.length);put16(26,name.length);put16(28,0);bytes.set(name,30);});const directory=zipPart(46+name.length,({bytes,put16,put32})=>{put32(0,0x02014b50);put16(4,20);put16(6,20);put16(8,0x0800);put16(10,0);put16(12,stamp.time);put16(14,stamp.date);put32(16,crc);put32(20,data.length);put32(24,data.length);put16(28,name.length);put16(30,0);put16(32,0);put16(34,0);put16(36,0);put32(38,0);put32(42,offset);bytes.set(name,46);});local.push(head,data);central.push(directory);offset+=head.length+data.length;}const centralSize=central.reduce((sum,x)=>sum+x.length,0),end=zipPart(22,({put16,put32})=>{put32(0,0x06054b50);put16(4,0);put16(6,0);put16(8,entries.length);put16(10,entries.length);put32(12,centralSize);put32(16,offset);put16(20,0);});return new Blob([...local,...central,end],{type:'application/zip'});}
function safeFileName(value){return String(value||'未命名').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/[. ]+$/,'').slice(0,80)||'未命名';}
function photoStamp(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return'時間未記錄';const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'_'+pad(d.getHours())+pad(d.getMinutes());}
function csvCell(value){return'"'+String(value??'').replaceAll('"','""')+'"';}
async function projectPhotoEntries(p,folder,manifest,status){const listResponse=await apiFetch('/api/receipts?export=1&project='+encodeURIComponent(p.id)),list=await listResponse.json();if(!listResponse.ok)throw Error(list.error||'無法讀取 '+p.name+' 的照片');const entries=[];for(const [index,item] of (list.items||[]).entries()){if(status)status('正在整理 '+p.name+'：'+(index+1)+' / '+list.items.length);const response=await apiFetch('/api/receipts?export=1&project='+encodeURIComponent(p.id)+'&id='+encodeURIComponent(item.id));if(!response.ok)throw Error('照片下載失敗：'+p.name);const type=response.headers.get('content-type')||'',extension=type.includes('png')?'png':type.includes('webp')?'webp':'jpg',fileName='圖片'+String(index+1).padStart(2,'0')+'_'+photoStamp(item.created)+'.'+extension;entries.push({name:folder+'/'+fileName,data:new Uint8Array(await response.arrayBuffer()),date:item.created});manifest.push([p.name,projectDate(p),item.name||'',receiptTime(item.created),item.actor||'未記錄人員',folder+'/'+fileName]);}return entries;}
async function downloadBlob(blob,name){if(!await authorizeExport())return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function canExportPhotos(){return currentUser?.role==='supervisor';}
async function exportProjectPhotos(p){if(!canExportPhotos())return toast('只有主管可以匯出照片');if(!await authorizeExport())return;const button=$('#export-project-photos');if(button)button.disabled=true;try{const manifest=[['專案名稱','專案日期','原始檔名','上傳時間','上傳人員','ZIP 位置']],folder=safeFileName(projectDate(p)+'_'+p.name),entries=await projectPhotoEntries(p,folder,manifest,text=>toast(text));if(!entries.length)throw Error('這個專案目前沒有照片');entries.push({name:'照片清單.csv',data:new TextEncoder().encode('\ufeff'+manifest.map(row=>row.map(csvCell).join(',')).join('\r\n'))});downloadBlob(makeZip(entries),safeFileName(p.name)+'_照片.zip');addAudit('匯出專案照片',p.name+' · '+(entries.length-1)+' 張','庫房管理 > '+p.name,p.id);persist();toast('本案照片已整理完成');}catch(e){toast(e.message||'照片匯出失敗');}finally{if(button)button.disabled=false;}}
async function exportAllPhotos(){if(!canExportPhotos())return toast('只有主管可以匯出照片');if(!await authorizeExport())return;const button=$('#export-all-photos-main')||$('#export-all-photos');if(button)button.disabled=true;try{const projects=[...(state.projects||[]),...(state.deletedProjects||[]).map(x=>x.project)],manifest=[['專案名稱','專案日期','原始檔名','上傳時間','上傳人員','ZIP 位置']],entries=[];for(const p of projects){const folder=safeFileName(projectDate(p)+'_'+p.name);entries.push(...await projectPhotoEntries(p,folder,manifest,text=>toast(text)));}if(!entries.length)throw Error('目前沒有可匯出的照片');entries.push({name:'照片清單.csv',data:new TextEncoder().encode('\ufeff'+manifest.map(row=>row.map(csvCell).join(',')).join('\r\n'))});downloadBlob(makeZip(entries),'庫房照片備份_'+new Date().toISOString().slice(0,10)+'.zip');addAudit('匯出全部照片',(entries.length-1)+' 張照片','庫房管理 > 照片備份');persist();toast('全部照片已整理完成');}catch(e){toast(e.message||'照片匯出失敗');}finally{if(button)button.disabled=false;}}
function logoDialog(){modal('上傳 LOGO','<p>支援 JPG、PNG、WebP，限 2 MB。上傳成功後立即顯示。</p><p id="logo-upload-time" class="muted">正在讀取目前 LOGO 時間…</p><label class="field">選擇 LOGO<input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp" required></label>','上傳 LOGO',async()=>{const b=$('#submit-modal'),file=$('#logo-file').files[0];b.disabled=true;imageUploading=true;try{const result=await uploadImage(file,'/api/logo',2);addAudit('新增／更換網站 LOGO',file.name,'管理後台 > LOGO 圖片');persist();$('#modal').close();routeAdmin();toast('LOGO 已更新，上傳時間 '+receiptTime(result.created));}finally{imageUploading=false;b.disabled=false;}});apiFetch('/api/logo?meta=1').then(r=>r.json()).then(d=>{const el=$('#logo-upload-time');if(el)el.textContent=d.exists?'目前 LOGO 上傳時間：'+receiptTime(d.created):'目前尚未上傳 LOGO';}).catch(()=>{const el=$('#logo-upload-time');if(el)el.textContent='目前 LOGO 時間無法讀取';});}
function receiptTime(value){const date=new Date(value);return Number.isNaN(date.getTime())?'時間未記錄':new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);}
function conciseProjectLog(x,p){let action=x.action||'操作',detail=String(x.detail||'');if(action==='更新零件與收／領料'){const direct=detail.split('｜').filter(item=>item.startsWith('收料：')||item.startsWith('領料：'));if(direct.length)return direct.join('｜');const received=[],issued=[];for(const item of detail.split('、')){const m=item.match(/(?:^|；)([^；：]+)：每套 .*；收到 (\d+)／領出 (\d+)$/);if(!m)continue;if(Number(m[2]))received.push(m[1]+' '+m[2]+'件');if(Number(m[3]))issued.push(m[1]+' '+m[3]+'件');}const parts=[];if(received.length)parts.push('收料：'+received.join('、'));if(issued.length)parts.push('領料：'+issued.join('、'));return parts.join('｜');}if(action==='新增庫房管理紀錄'){action='建立專案';detail='';}if(action==='新增照片'){action='上傳照片';detail=detail.split('｜')[0];}if(action==='刪除照片')action='刪除照片';if(action==='刪除零件')detail=detail.split('；')[0];if(detail===p.name)detail='';return[action,detail].filter(Boolean).join('｜');}
function projectHistoryEntries(p){return(state.logs||[]).filter(x=>x.project===p.id).map(x=>({x,text:conciseProjectLog(x,p)})).filter(row=>row.text);}
function projectHistoryRows(p){const rows=projectHistoryEntries(p);return rows.length?rows.map(({x,text})=>textLogLine(x,receiptTime(x.time)+'｜'+(x.actor||'使用者')+'｜'+text)).join(''):'<div class="material-log-line muted">尚無操作紀錄</div>';}
function refreshProjectHistory(p){const box=$('#project-history-list'),count=$('#project-history-count'),rows=projectHistoryEntries(p);if(box)box.innerHTML=projectHistoryRows(p);if(count)count.textContent=rows.length;}
async function loadReceipts(p,box){try{const r=await apiFetch('/api/receipts?project='+encodeURIComponent(p.id)),d=await r.json();if(!r.ok)throw Error(d.error);const items=(d.items||[]).sort((a,b)=>new Date(a.created)-new Date(b.created));box.innerHTML=items.map((i,index)=>{const url='/api/receipts?project='+encodeURIComponent(p.id)+'&id='+encodeURIComponent(i.id),label='圖片 '+String(index+1).padStart(2,'0')+'｜'+receiptTime(i.created);return '<div class="receipt-file-row"><a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(label)+'</a>'+(canDo('warehouse.photos')?'<button type="button" class="small danger-button" data-delete-receipt="'+esc(i.id)+'" data-receipt-label="'+esc(label)+'">刪除</button>':'')+'</div>';}).join('');document.querySelectorAll('[data-delete-receipt]').forEach(el=>el.onclick=async()=>{if(!(await confirmAction('確定刪除「'+el.dataset.receiptLabel+'」？刪除後無法復原。')))return;el.disabled=true;try{const response=await apiFetch('/api/receipts?project='+encodeURIComponent(p.id)+'&id='+encodeURIComponent(el.dataset.deleteReceipt),{method:'DELETE'}),data=await response.json();if(!response.ok)throw Error(data.error||'圖片刪除失敗');addAudit('刪除照片',el.dataset.receiptLabel,'庫房管理 > '+p.name+' > 收據圖片',p.id);persist();refreshProjectHistory(p);await loadReceipts(p,box);toast('照片已刪除');}catch(error){el.disabled=false;toast(error.message||'圖片刪除失敗');}});}catch(e){box.textContent=e.message||'圖片載入失敗，請重新展開專案。';}}
function addReceipts(){const p=project(),detail=$('.project-detail');if(!p||!detail||$('#receipt-images'))return;const section=document.createElement('section');section.className='receipt-upload-panel';const logCount=projectHistoryEntries(p).length;section.innerHTML='<div class="receipt-upload-row"><label class="field">選擇收據圖片（可多選）<input id="receipt-files" type="file" multiple accept="image/png,image/jpeg,image/webp"></label><button type="button" id="upload-receipts">上傳收據</button></div><p id="image-status" role="status"></p><div id="receipt-images" class="receipt-file-list"></div><details class="project-history"><summary>文字紀錄（<span id="project-history-count">'+logCount+'</span>）</summary><div id="project-history-list" class="material-history">'+projectHistoryRows(p)+'</div></details>';detail.append(section);const box=$('#receipt-images');loadReceipts(p,box);$('#upload-receipts').onclick=async()=>{const input=$('#receipt-files'),files=[...input.files],status=$('#image-status'),button=$('#upload-receipts'),uploaded=[];if(!files.length){status.textContent='請先選擇圖片。';return;}button.disabled=true;input.disabled=true;imageUploading=true;let count=0;try{for(const file of files){status.textContent='正在上傳 '+(count+1)+' / '+files.length+'…';const result=await uploadImage(file,'/api/receipts?project='+encodeURIComponent(p.id),10);uploaded.push({name:file.name,created:result.created});count++;}input.value='';status.textContent='已上傳 '+count+' 張收據。';}catch(e){status.textContent='已上傳 '+count+' 張；'+e.message+'。其餘圖片請重新選擇後上傳。';}finally{if(uploaded.length){for(const item of uploaded)addAudit('新增照片',item.name+'｜'+receiptTime(item.created),'庫房管理 > '+p.name+' > 收據圖片',p.id);persist();refreshProjectHistory(p);}button.disabled=false;input.disabled=false;imageUploading=false;await loadReceipts(p,box);}};}
function makeReceiptListCollapsible(){const box=$('#receipt-images');if(!box||box.closest('.receipt-files-fold'))return;const details=document.createElement('details'),summary=document.createElement('summary'),label=document.createElement('span'),count=document.createElement('small');details.className='receipt-files-fold';label.textContent=siteText('warehouseReceiptListLabel');summary.append(label,count);box.before(details);details.append(summary,box);const update=()=>{const total=box.querySelectorAll('.receipt-file-row').length;count.textContent=total?'（'+total+' 張）':'（0 張）';};new MutationObserver(update).observe(box,{childList:true});update();}
function addProjectPhotoExport(){const row=$('.receipt-upload-row'),p=project();if(!row||!p||$('#export-project-photos'))return;if(canExportPhotos()){const button=document.createElement('button');button.type='button';button.id='export-project-photos';button.textContent=siteText('warehousePhotoExportButton');button.onclick=()=>exportProjectPhotos(p);row.append(button);}const note=document.createElement('small');note.className='photo-compress-note';note.textContent='超過 2 MB 的照片會在上傳前自動壓縮。';row.after(note);}
const baseBindRows=bindRows;bindRows=function(){baseBindRows();addReceipts();makeReceiptListCollapsible();addProjectPhotoExport();};
const baseRender=render;render=function(){baseRender();showLogo();};
const baseRenderAdmin=renderAdmin;renderAdmin=function(){baseRenderAdmin();showLogo();const actions=$('.admin-actions');if(actions){const b=document.createElement('button');b.textContent=adminText('logoButton');b.onclick=logoDialog;actions.prepend(b);}const warehouseActions=$('#export-warehouse-admin')?.parentElement;if(warehouseActions&&!$('#export-all-photos')){const b=document.createElement('button');b.id='export-all-photos';b.textContent=siteText('warehouseAllPhotoExportButton');b.onclick=exportAllPhotos;warehouseActions.append(b);}};
const baseRenderContent=renderContent;renderContent=function(...args){baseRenderContent(...args);showLogo();};
window.addEventListener('beforeunload',e=>{if(imageUploading){e.preventDefault();e.returnValue='';}});

async function makeAppIcon52(file){
 const bitmap=await createImageBitmap(file);
 try{const canvas=document.createElement('canvas');drawAppIcon53(bitmap,canvas,'#f3e8dc',true);return await appIconBlob53(canvas);}finally{bitmap.close();}
}

// Keep the phone icon independent from the site's original logo.
function drawAppIcon53(bitmap,canvas,background,removeWhite){
 canvas.width=canvas.height=512;
 const source=document.createElement('canvas'),shrink=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));source.width=Math.max(1,Math.round(bitmap.width*shrink));source.height=Math.max(1,Math.round(bitmap.height*shrink));
 const sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(bitmap,0,0,source.width,source.height);
 const pixels=sc.getImageData(0,0,source.width,source.height);
 if(removeWhite)for(let i=0;i<pixels.data.length;i+=4){
  const opacity=Math.min(1,Math.max(0,(255-Math.min(pixels.data[i],pixels.data[i+1],pixels.data[i+2]))/40));
  pixels.data[i+3]=Math.round(pixels.data[i+3]*opacity);
 }
 sc.putImageData(pixels,0,0);
 let left=source.width,top=source.height,right=-1,bottom=-1;
 for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(pixels.data[(y*source.width+x)*4+3]>24){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 if(right<left)throw Error('圖示內容是空白，請換一張圖片');
 const width=right-left+1,height=bottom-top+1,scale=410/Math.max(width,height),w=width*scale,h=height*scale;
 const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,512,512);
 ctx.drawImage(source,left,top,width,height,(512-w)/2,(512-h)/2,w,h);
}
function appIconBlob53(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('手機圖示產生失敗')),'image/png'));}
function mobileIconDialog53(){
 if(currentUser.role!=='supervisor')return;
 modal('手機主畫面圖示','<p>這裡只調整手機桌面圖示，網站與登入畫面的 LOGO 不會改變。</p><label class="field">手機圖示專用圖片（選填）<input type="file" id="mobile-icon-file" accept="image/png,image/jpeg,image/webp"></label><label class="field">背景顏色 <input id="mobile-icon-background" type="color" value="#f3e8dc"></label><label><input id="mobile-icon-remove-white" type="checkbox" checked> 移除圖片原有的白色背景</label><p class="muted">保留原比例並自動置中。若原圖片本身已變形，請選擇未變形的原始圖片。</p><canvas id="mobile-icon-preview" width="512" height="512" style="display:block;width:160px;height:160px;max-width:100%;border-radius:34px;margin:12px auto;border:1px solid #ddd" aria-label="手機圖示預覽"></canvas>','儲存手機圖示',async()=>{
  if(!source||!ready)throw Error('請等待手機圖示預覽完成');
  const canvas=$('#mobile-icon-preview'),blob=await appIconBlob53(canvas);
  if(blob.size>2*1024*1024)throw Error('圖示超過 2 MB，請選擇較小的圖片');
  const body=new FormData();body.append('photo',blob,'app-icon.png');
  const response=await apiFetch('/api/app-icon',{method:'POST',body});
  const result=await response.json();if(!response.ok)throw Error(result.error||'手機圖示儲存失敗');
  $('#modal').close();toast('手機圖示已更新。舊桌面圖示需移除後重新加入主畫面。');
 });
 let source=null,bitmap=null,version=0,ready=false;
 const draw=async()=>{
  const token=++version;ready=false;
  try{
   if(!source)return;
   const next=await createImageBitmap(source);if(token!==version){next.close();return;}
   bitmap?.close();bitmap=next;
   drawAppIcon53(bitmap,$('#mobile-icon-preview'),$('#mobile-icon-background').value,$('#mobile-icon-remove-white').checked);
   ready=true;
   $('#form-error').textContent='';
  }catch(e){const box=$('#form-error');if(box)box.textContent=e.message||'無法預覽圖片';}
 };
 $('#mobile-icon-file').onchange=e=>{source=e.target.files[0]||null;draw();};
 $('#mobile-icon-background').oninput=$('#mobile-icon-remove-white').onchange=()=>{if(bitmap)try{drawAppIcon53(bitmap,$('#mobile-icon-preview'),$('#mobile-icon-background').value,$('#mobile-icon-remove-white').checked);ready=true;$('#form-error').textContent='';}catch(e){ready=false;$('#form-error').textContent=e.message;}};
 apiFetch('/api/logo').then(r=>{if(!r.ok)throw Error('尚未上傳公司 LOGO，請選擇手機圖示圖片');return r.blob();}).then(b=>{if(source)return;source=b;draw();}).catch(e=>{if(!source)$('#form-error').textContent=e.message;});
}
const logoDialogBeforeMobile53=logoDialog;
logoDialog=function(){
 logoDialogBeforeMobile53();
 const button=document.createElement('button');button.type='button';button.id='edit-mobile-icon';button.textContent='調整手機圖示';
 button.onclick=mobileIconDialog53;
 $('#logo-upload-time')?.after(button);
};
