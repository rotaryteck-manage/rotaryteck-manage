'use strict';
// Presentation only: all writes, exports and permission checks use the existing QC handlers.
let qcEditingProject129='',qcOpenToken129=0,qcPreview129=null;
uiCatalogue44.global=[...new Set([...uiCatalogue44.global,'新增','匯出','編輯','刪除','完成編輯','修改案名','替換','下載','關閉','登記資料與其他操作','修改日期／備註','補加 PDF','刪除整次登記'])];
function qcRows129(project){
 const uploads=qcData124.uploads.filter(u=>u.project_id===project&&!u.deleted_at);
 const files=qcData124.files.filter(f=>f.project_id===project&&!f.deleted_at&&!f.superseded_by);
 const numbers=new Map([...files].sort((a,b)=>a.order_no-b.order_no||a.id.localeCompare(b.id)).map((f,i)=>[f.id,i+1]));
 return {uploads,files,numbers,rows:uploads.flatMap(u=>files.filter(f=>f.upload_id===u.id).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).map(f=>({u,f,number:numbers.get(f.id)})))};
}
function qcHistory129(p){
 return (qcCanUI124('restore')?'<details class="qc-history124"><summary>刪除紀錄與舊版附件</summary>'+qcData124.files.filter(f=>f.project_id===p.id&&(f.deleted_at||f.superseded_by)).map(f=>'<div class="receipt-file-row"><button type="button" data-qc-file="'+esc(f.id)+'">'+esc(f.original_name)+'</button><small>'+esc(f.superseded_by?'替換舊版':'已刪除｜'+receiptTime(f.deleted_at))+'</small>'+(!f.superseded_by?'<button type="button" data-qc-restore-file="'+esc(f.id)+'">復原附件</button>':'')+'</div>').join('')+qcData124.uploads.filter(u=>u.project_id===p.id&&u.deleted_at).map(u=>'<div class="receipt-file-row"><span>'+esc(u.stamp.replace('T',' '))+'｜已刪除登記</span><button type="button" data-qc-restore-upload="'+esc(u.id)+'">復原整次登記</button></div>').join('')+'</details>':'')+'<details class="qc-history124"><summary>文字紀錄</summary>'+qcData124.logs.filter(l=>l.project_id===p.id).map(l=>'<p><small>'+esc(receiptTime(l.created_at))+'｜'+esc(l.actor)+'</small><br>'+esc(l.action)+'｜'+esc(l.detail)+'</p>').join('')+'</details>';
}
function qcForm129(open){$('#modal').classList.remove('qc-dialog129');open()}
qcOpen124=function(project,editing=null){
 const p=qcData124.projects.find(p=>p.id===project&&!p.deleted_at);if(!p)return;
 const canEdit=qcCanUI124('manage')||qcCanUI124('delete'),edit=canEdit&&(editing===null?qcEditingProject129===project:editing);
 qcEditingProject129=edit?project:'';qcSelected124=project;
 const {uploads,files,rows}=qcRows129(project),button=(label,attr,cls='')=>'<button type="button" class="small '+cls+'" '+attr+'>'+label+'</button>';
 const toolbar=edit?button('完成編輯','data-qc-done','primary')+(qcCanUI124('manage')?button('修改案名','data-qc-edit-project'):''):
 (qcCanUI124('manage')?button('新增','data-qc-add','primary'):'')+(qcCanUI124('export')?button('匯出','data-qc-export-case'):'')+(canEdit?button('編輯','data-qc-edit-mode'):'')+(qcCanUI124('delete')?button('刪除','data-qc-delete-project','danger-button'):'');
 const list=rows.map(({u,f,number})=>'<div class="qc-row129"><button type="button" class="qc-link129" data-ui-content data-qc-file="'+esc(f.id)+'">'+number+'. '+esc(p.name)+'｜'+esc(u.stamp.slice(0,10).replaceAll('-','')+'_'+u.stamp.slice(11))+'｜'+esc(f.original_name)+'</button>'+(edit?'<span class="qc-author129" data-ui-content>新增人員：'+esc(f.author_name)+'</span><span class="qc-actions129">'+(qcCanUI124('manage')?button('替換','data-qc-replace="'+esc(f.id)+'"'):'')+(qcCanUI124('delete')?button('刪除','data-qc-delete-file="'+esc(f.id)+'"','danger-button'):'')+'</span>':'')+'</div>').join('');
 const registration=edit?'<details class="qc-history124"><summary>登記資料與其他操作</summary>'+uploads.map(u=>'<div class="qc-registration129"><span>'+esc(u.stamp.replace('T',' '))+(u.note?'｜'+esc(u.note):'')+'</span><span>'+(qcCanUI124('manage')?button('修改日期／備註','data-qc-edit="'+esc(u.id)+'"')+button('補加 PDF','data-qc-append="'+esc(u.id)+'"'):'')+(qcCanUI124('delete')?button('刪除整次登記','data-qc-delete-upload="'+esc(u.id)+'"','danger-button'):'')+'</span></div>').join('')+'</details>':'';
 modal(p.name+' _ 品檢報告','<div class="qc-toolbar129">'+toolbar+'</div><div class="qc-list129'+(edit?' is-editing':'')+'">'+(list||'<p class="muted">目前沒有 PDF，請按新增。</p>')+'</div>'+registration+qcHistory129(p),null);
 const box=$('#modal'),token=++qcOpenToken129;box.classList.add('qc-dialog124','qc-dialog129');
 // An earlier form's queued close event can arrive after this dialog has reopened.
 // Keep the current listener until its actual close, so QC styles cannot leak to other forms.
 const onClose=()=>{if(token!==qcOpenToken129){box.removeEventListener('close',onClose);return}if(box.open)return;box.classList.remove('qc-dialog124','qc-dialog129');qcEditingProject129='';box.removeEventListener('close',onClose)};
 box.addEventListener('close',onClose);
 box.querySelector('[data-qc-add]')?.addEventListener('click',()=>qcForm129(()=>qcUpload124(p)));
 box.querySelector('[data-qc-edit-project]')?.addEventListener('click',()=>qcForm129(()=>qcProject124(p)));
 box.querySelector('[data-qc-edit-mode]')?.addEventListener('click',()=>qcOpen124(project,true));
 box.querySelector('[data-qc-done]')?.addEventListener('click',()=>qcOpen124(project,false));
 box.querySelector('[data-qc-export-case]')?.addEventListener('click',e=>qcExport124(p.id,e.currentTarget));
 box.querySelector('[data-qc-delete-project]')?.addEventListener('click',e=>qcAction124('delete_project',p.id,p.id,e.currentTarget));
 for(const [selector,action]of [['delete-upload','delete_upload'],['delete-file','delete_file'],['restore-file','restore_file'],['restore-upload','restore_upload']])box.querySelectorAll('[data-qc-'+selector+']').forEach(b=>b.onclick=()=>qcAction124(action,b.getAttribute('data-qc-'+selector),p.id,b));
 box.querySelectorAll('[data-qc-file]').forEach(b=>b.onclick=()=>qcViewPDF124(b.dataset.qcFile));
 box.querySelectorAll('[data-qc-edit]').forEach(b=>b.onclick=()=>qcForm129(()=>qcEdit124(p,uploads.find(u=>u.id===b.dataset.qcEdit))));
 box.querySelectorAll('[data-qc-append]').forEach(b=>b.onclick=()=>qcForm129(()=>qcUpload124(p,uploads.find(u=>u.id===b.dataset.qcAppend))));
 box.querySelectorAll('[data-qc-replace]').forEach(b=>b.onclick=()=>{const f=files.find(f=>f.id===b.dataset.qcReplace);qcForm129(()=>qcUpload124(p,uploads.find(u=>u.id===f.upload_id),f))});
};
qcViewPDF124=async function(id){
 if(qcPreview129?.id===id&&qcPreview129.dialog.open){qcPreview129.dialog.focus();return}
 qcPreview129?.close();
 const file=qcData124.files.find(f=>f.id===id);if(!file){toast('找不到這份 PDF，請重新開啟案件');return}
 const account=String(currentUser?.id||currentUser?.email||''),parent=$('#modal'),opener=document.activeElement;
 const body=parent?.querySelector('.modal-body'),scroll=parent?.scrollTop||0,bodyScroll=body?.scrollTop||0;
 const dialog=document.createElement('dialog');dialog.className='qc-pdf129';dialog.setAttribute('aria-labelledby','qc-pdf-title129');
 dialog.innerHTML='<div class="qc-pdf-head129"><h2 id="qc-pdf-title129" data-ui-content>'+esc(file.original_name)+'</h2><button type="button" data-pdf-download disabled>下載</button><button type="button" data-pdf-close aria-label="關閉 PDF 預覽">關閉</button></div><p class="qc-pdf-status129" role="status">正在讀取 PDF…</p><div class="qc-pdf-content129"></div><p class="qc-pdf-help129" hidden>若此裝置無法顯示 PDF，請按上方「下載」開啟檔案。</p>';
 const controller=new AbortController(),state={id,dialog,close:()=>{if(dialog.open)dialog.close();else cleanup()}},download=dialog.querySelector('[data-pdf-download]'),status=dialog.querySelector('[role=status]'),content=dialog.querySelector('.qc-pdf-content129'),help=dialog.querySelector('.qc-pdf-help129');
 let blob=null,url='',closed=false,timeout=false,downloadBusy=false;
 const timer=setTimeout(()=>{timeout=true;controller.abort()},45000);
 function cleanup(){if(closed)return;closed=true;clearTimeout(timer);controller.abort();content.replaceChildren();if(url)URL.revokeObjectURL(url);dialog.remove();if(qcPreview129===state)qcPreview129=null;if(parent?.open){parent.scrollTop=scroll;if(body?.isConnected)body.scrollTop=bodyScroll;if(opener?.isConnected)opener.focus({preventScroll:true})}}
 qcPreview129=state;document.body.append(dialog);dialog.addEventListener('close',cleanup,{once:true});dialog.querySelector('[data-pdf-close]').onclick=state.close;
 download.onclick=()=>{if(!blob||downloadBusy||closed)return;if(String(currentUser?.id||currentUser?.email||'')!==account){state.close();return}downloadBusy=true;download.disabled=true;qcDownload124(blob,file.original_name);setTimeout(()=>{downloadBusy=false;if(!closed)download.disabled=false},700)};
 try{
  dialog.showModal();
  const r=await apiFetch('/api/qc-reports?file='+encodeURIComponent(id),{signal:controller.signal});
  if(!r.ok){let error='PDF讀取失敗（'+r.status+'）';try{error=(await r.json()).error||error}catch{}throw Error(error)}
  blob=await r.blob();if(closed)return;
  if(String(currentUser?.id||currentUser?.email||'')!==account){state.close();return}
  if((await blob.slice(0,5).text())!=='%PDF-')throw Error('檔案不是有效的 PDF，請重新確認附件');
  if(closed)return;clearTimeout(timer);download.disabled=false;help.hidden=false;
  if(navigator.pdfViewerEnabled===false){status.textContent='此瀏覽器不支援框內預覽，請按「下載」查看。';return}
  url=URL.createObjectURL(new Blob([blob],{type:'application/pdf'}));
  const viewer=document.createElement('object');viewer.type='application/pdf';viewer.data=url;viewer.setAttribute('aria-label',file.original_name);viewer.textContent='無法在此裝置預覽，請按上方「下載」查看 PDF。';
  viewer.addEventListener('error',()=>{if(!closed){status.hidden=false;status.textContent='PDF 預覽無法載入，請按「下載」查看。'}});
  content.append(viewer);status.textContent='';status.hidden=true;
 }catch(error){if(!closed){status.hidden=false;status.textContent=timeout?'PDF讀取逾時，請關閉後重試。':error.message||'PDF讀取失敗';content.replaceChildren();download.disabled=true}}
 finally{clearTimeout(timer)}
};
document.documentElement.dataset.appVersion='13.1v';
