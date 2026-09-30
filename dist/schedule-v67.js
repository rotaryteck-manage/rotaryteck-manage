'use strict';
// The daily calendar is an index: open the assigned work or conversation to see details.
const scheduleDrawBefore67=scheduleDraw56;
scheduleDraw56=function(){
 scheduleDrawBefore67();if(scheduleTab56!=='daily')return;
 const root=$('#schedule-content56');if(!root)return;
 const month=scheduleMonth56(scheduleAnchor56),first=new Date(month+'T00:00:00Z'),count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate(),offset=(first.getUTCDay()+6)%7,entries=scheduleData56.entries||[],reports=scheduleData56.reports||[];
 root.innerHTML='<div class="schedule-calendar schedule-calendar67">'+['一','二','三','四','五','六','日'].map(x=>'<div class="schedule-calendar-heading">'+x+'</div>').join('')+Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{
  const day=scheduleShift56(month,i-offset),weekday=(new Date(day+'T00:00:00Z').getUTCDay()+6)%7,special=entries.filter(e=>e.kind==='special'&&e.day<=day&&e.end_day>=day),jobs=entries.filter(e=>e.kind==='daily'&&e.day<=day&&e.end_day>=day),manual=entries.filter(e=>e.kind==='material'&&e.day===day),legacy=scheduleMaterial56().some(e=>e.day===day),reported=reports.some(r=>r.day===day);
  return '<div class="schedule-calendar-day schedule-calendar-day67 '+(day.slice(0,7)!==month.slice(0,7)?'schedule-adjacent70 ':'')+(weekday>=5?'weekend':'')+'" data-day="'+day+'"><header>'+(day.slice(0,7)!==month.slice(0,7)?day.slice(5).replace('-','/'):day.slice(8))+'｜'+['一','二','三','四','五','六','日'][weekday]+(special.length?' · '+special.map(e=>scheduleEsc56(e.title)).join('、'):'')+'</header><div class="schedule-calendar-links67">'+(jobs.length||reported?'<button type="button" class="schedule-day-link67" data-day-jobs="'+day+'">工作紀錄</button>':'')+manual.map(e=>'<button type="button" class="schedule-day-link67 schedule-day-material67 schedule-material-'+({收料:"receipt",出貨:"outgoing",送貨:"delivery"}[e.category]||"receipt")+'67" data-day-material-id="'+scheduleEsc56(e.id)+'" data-day-material-date="'+day+'" title="'+scheduleEsc56(e.project_name||'未指定案件')+'">'+scheduleEsc56(e.project_name||'未指定案件')+'</button>').join('')+(legacy?'<button type="button" class="schedule-day-link67 schedule-day-material67" data-day-materials="'+day+'">庫房紀錄</button>':'')+'</div></div>'
 }).join('')+'</div>';
 root.querySelectorAll('[data-day-jobs]').forEach(b=>b.onclick=()=>scheduleDayRecord56(b.dataset.dayJobs,'jobs'));
 root.querySelectorAll('[data-day-material-id]').forEach(b=>b.onclick=()=>scheduleDayRecord56(b.dataset.dayMaterialDate,'materials',b.dataset.dayMaterialId));
 root.querySelectorAll('[data-day-materials]').forEach(b=>b.onclick=()=>scheduleDayRecord56(b.dataset.dayMaterials,'materials'));
 scheduleDecorate60();root.querySelectorAll('.schedule-calendar-material').forEach(el=>el.remove());
};

scheduleDayRecord56=function(day,section='jobs',materialId='',materialSource='all'){
 const entries=scheduleData56.entries||[],jobs=entries.filter(e=>e.kind==='daily'&&e.day<=day&&e.end_day>=day),reports=(scheduleData56.reports||[]).filter(r=>r.day===day).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(b.id)),materials=entries.filter(e=>materialSource!=='legacy'&&e.kind==='material'&&e.day===day&&(!materialId||e.id===materialId)),legacy=materialId||materialSource==='current'?[]:scheduleMaterial56().filter(e=>e.day===day);
 let body='',title='';
 if(section==='jobs'){
  title='工作紀錄';const known=(scheduleData56.people||[]).map(p=>p.name),names=[...new Set([...known,...jobs.flatMap(scheduleAssignees56)])].filter(n=>jobs.some(e=>scheduleAssignees56(e).includes(n)));
  const sorted=[...jobs].sort((a,b)=>(a.sort_index||0)-(b.sort_index||0)||String(a.created_at).localeCompare(String(b.created_at))||a.id.localeCompare(b.id));
body='<div class="schedule-daily-list67">'+
 (jobs.length?'<div class="schedule-record-toolbar69">'+
  (scheduleCan56('daily')?'<button type="button" data-edit-daily-day="'+day+'">編輯當日排程</button>':'')+
 '</div>':'')+
 (names.map((name,index)=>{
   const personJobs=sorted.filter(e=>scheduleAssignees56(e).includes(name));
   return '<div class="schedule-person-summary80 '+(index%2?'schedule-person-green80':'schedule-person-white80')+'">'+
    '<strong>'+scheduleEsc56(name)+'：</strong>'+
    '<span>'+personJobs.map(e=>scheduleWorkHTML71(e)).join('、')+'</span>'+
   '</div>';
 }).join('')||'<p class="muted">當日沒有排程工作</p>')+
 '<div class="schedule-report-section80">'+
  '<h3>工作回報</h3>'+
  '<div class="schedule-chat67">'+
   (reports.map(r=>{
    const job=entries.find(e=>e.id===r.entry_id);
    return '<article class="schedule-message67" data-report-id75="'+scheduleEsc56(r.id)+'">'+
     '<span class="schedule-avatar67">'+scheduleEsc56(r.author_name)+'</span>'+
     '<div class="schedule-bubble67">'+
      (job?'<strong>'+scheduleEsc56(scheduleLabel63(job))+'</strong>':'')+
      '<p>'+scheduleEsc56(r.body)+'</p>'+
      (r.photo_count>0?'<div class="schedule-report-photos80">'+Array.from({length:Math.min(Number(r.photo_count)||1,10)},(_,i)=>'<img class="schedule-report-photo80" data-schedule-photo="'+scheduleEsc56(r.id)+'" data-photo-index="'+i+'" alt="'+scheduleEsc56(r.author_name)+' 的工作照片 '+(i+1)+'">').join('')+'</div>':'')+
      '<small>'+scheduleEsc56(String(r.created_at||'').replace('T',' ').slice(0,16))+'</small>'+
      (canReport75(r,'delete')?'<button type="button" data-schedule-delete-report="'+scheduleEsc56(r.id)+'">刪除回報</button>':'')+
     '</div>'+
    '</article>';
   }).join('')||'<p class="schedule-chat-empty67">尚無工作回報</p>')+
  '</div>'+
  (canDo('schedule.report')?'<button type="button" class="primary" id="schedule-add-report">新增工作回報</button>':'')+
 '</div>'+
'</div>';
 }else{
  title=materialId?materials[0]?.project_name||'未指定案件':'料件紀錄';body='<div class="schedule-daily-materials67">'+(materials.map(e=>'<div class="schedule-material-card67"><div class="schedule-material-row67 schedule-material-'+({'收料':'receipt','出貨':'outgoing','送貨':'delivery'}[e.category]||'receipt')+'67"><strong>'+scheduleEsc56(e.category)+'</strong><span>'+scheduleEsc56(e.title)+' × '+scheduleEsc56(e.quantity)+'</span><small>'+scheduleEsc56(e.author_name||'')+'</small>'+(scheduleCan56('material')?'<button type="button" data-edit-material="'+scheduleEsc56(e.id)+'">編輯</button>':'')+'</div>'+(e.receipt_photo_key||e.item_photo_key?'<div class="schedule-material-images67">'+(e.receipt_photo_key?'<figure><figcaption>收據照片</figcaption><img data-material-photo="'+scheduleEsc56(e.id)+'" data-photo-kind="receipt" alt="'+scheduleEsc56(e.title)+' 的收據照片"></figure>':'')+(e.item_photo_key?'<figure><figcaption>照片</figcaption><img data-material-photo="'+scheduleEsc56(e.id)+'" data-photo-kind="item" alt="'+scheduleEsc56(e.title)+' 的照片"></figure>':'')+'</div>':'')+'</div>').join('')+legacy.map(e=>'<div class="schedule-material-row67 schedule-material-receipt67"><strong>'+scheduleEsc56(e.kind)+'</strong><span>'+scheduleEsc56(e.project)+' · '+scheduleEsc56(e.name)+' × '+scheduleEsc56(e.qty)+'</span><small>'+scheduleEsc56(e.actor||'')+'</small>'+scheduleLegacyControls71(e)+'</div>').join('')||'<p class="muted">當日沒有料件紀錄</p>')+'</div>';
 }
 modal(title+' · '+day,'<div class="schedule-records schedule-records67">'+body+'</div>',null);
 $('#schedule-add-report')?.addEventListener('click',()=>scheduleReportDialog56(day));
 document.querySelectorAll('#modal [data-schedule-delete-entry]').forEach(b=>b.onclick=()=>scheduleDeleteEntries70([b.dataset.scheduleDeleteEntry]));
 document.querySelectorAll('#modal [data-edit-daily-day]').forEach(b=>b.onclick=()=>scheduleEntryDialog56(jobs[0]));
 document.querySelectorAll('#modal [data-edit-material]').forEach(b=>b.onclick=()=>scheduleMaterialDialog61(materials.find(e=>e.id===b.dataset.editMaterial)));
 document.querySelectorAll('#modal [data-schedule-delete-report]').forEach(b=>b.onclick=async()=>{if(!await confirmAction('確定刪除這筆工作回報？'))return;try{await scheduleSend56({kind:'report',id:b.dataset.scheduleDeleteReport},'DELETE');$('#modal').close();scheduleRender56()}catch(e){toast(e.message)}});
 if(section==='jobs')schedulePhotoLoad56($('#modal'));
 if(section==='materials')document.querySelectorAll('#modal [data-material-photo]').forEach(async img=>{try{const response=await apiFetch('/api/schedule-material-photo?id='+encodeURIComponent(img.dataset.materialPhoto)+'&type='+img.dataset.photoKind);if(!response.ok)throw Error('照片讀取失敗');const url=URL.createObjectURL(await response.blob());img.src=url;img.dataset.zoomUrl='/api/schedule-material-photo?id='+encodeURIComponent(img.dataset.materialPhoto)+'&type='+img.dataset.photoKind;img.onload=()=>URL.revokeObjectURL(url)}catch{img.alt='照片讀取失敗'}});
};

function scheduleAssigned67(day){return(scheduleData56.entries||[]).filter(e=>e.kind==='daily'&&e.day<=day&&e.end_day>=day&&scheduleAssignees56(e).includes(currentUser.name)).sort((a,b)=>(a.sort_index||0)-(b.sort_index||0)||String(a.created_at).localeCompare(String(b.created_at))||a.id.localeCompare(b.id))}
scheduleReportDialog56=function(day){
 day=day||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'});
 let pendingPhotos=[];

 const choices=chosen=>{
  const jobs=scheduleAssigned67(chosen);
  return jobs.length
   ?jobs.map(e=>'<option value="'+scheduleEsc56(e.id)+'">'+scheduleEsc56(scheduleLabel63(e))+'</option>').join('')
   :'<option value="">當日沒有指派給你的工作</option>';
 };

 modal(
  '新增工作回報',
  '<p class="muted">回報人：'+scheduleEsc56(currentUser.name)+'</p>'
  +'<label class="field">紀錄日期<input name="day" type="date" value="'+scheduleEsc56(day)+'" required></label>'
  +'<label class="field">工作項目<select name="entryId" required>'+choices(day)+'</select></label>'
  +'<label class="field">工作進度<textarea name="body" maxlength="3000" required></textarea></label>'
  +'<label class="field">工作照片（必填，最多10張，可重複選照片或 Ctrl+V 貼上）'
  +'<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" multiple>'
  +'</label>'
  +'<small id="schedule-paste-hint"></small>'
  +'<div id="schedule-upload-preview80" class="schedule-upload-preview80"></div>',
  '儲存回報',
  async fd=>{
   const date=String(fd.get('day'));
   const entryId=String(fd.get('entryId')||'');

   if(!scheduleAssigned67(date).some(e=>e.id===entryId)){
    throw Error('請選擇當天安排給自己的工作');
   }

   if(!pendingPhotos.length){
    throw Error('請先上傳工作照片');
   }

   if(pendingPhotos.length>10){
    throw Error('工作照片一次最多10張');
   }

   const form=new FormData();
   form.append('mode','create');
   form.append('id',crypto.randomUUID());
   form.append('day',date);
   form.append('entryId',entryId);
   form.append('body',String(fd.get('body')||'').trim());

   for(const photo of pendingPhotos){
    const compressed=await compressReceiptImage(photo);
    form.append('photo',compressed,photo.name||'photo.jpg');
   }

   const response=await apiFetch('/api/schedule-photo-upload',{
    method:'POST',
    body:form
   });

   const data=await response.json();

   if(!response.ok){
    throw Error(data.error||'照片上傳失敗，回報尚未儲存');
   }

   $('#modal').close();
   scheduleRender56();
  }
 );

 const dialog=$('#modal');
 const input=dialog.querySelector('[name=photo]');
 const hint=dialog.querySelector('#schedule-paste-hint');

 const renderPreview=()=>{
  const preview=dialog.querySelector('#schedule-upload-preview80');
  if(!preview)return;

  preview.innerHTML='';

  for(const file of pendingPhotos){
   const img=document.createElement('img');
   img.className='schedule-upload-thumb80';

   const url=URL.createObjectURL(file);
   img.src=url;
   img.alt='待上傳照片';
   img.onload=()=>URL.revokeObjectURL(url);

   preview.appendChild(img);
  }

  hint.textContent=pendingPhotos.length
   ?'目前共 '+pendingPhotos.length+' / 10 張照片'
   :'';
 };

 const addPhotos=files=>{
  const incoming=[...files].filter(
   file=>file instanceof File&&file.size&&file.type.startsWith('image/')
  );

  if(!incoming.length)return;

  const remaining=10-pendingPhotos.length;

  if(remaining<=0){
   alert('工作照片最多10張');
   return;
  }

  pendingPhotos.push(...incoming.slice(0,remaining));

  if(incoming.length>remaining){
   alert('工作照片最多10張，超過的照片未加入');
  }

  renderPreview();
 };

 dialog.querySelector('[name=day]').onchange=e=>{
  dialog.querySelector('[name=entryId]').innerHTML=choices(e.target.value);
 };

 input.onchange=()=>{
  addPhotos(input.files);

  // 清空檔案欄位，讓下一次「選擇照片」可以繼續追加
  input.value='';
 };

 dialog.onpaste=e=>{
  const files=[...(e.clipboardData?.files||[])].filter(
   file=>file.type.startsWith('image/')
  );

  if(!files.length){
   const items=[...(e.clipboardData?.items||[])];
   for(const item of items){
    if(!item.type.startsWith('image/'))continue;

    const blob=item.getAsFile();
    if(!blob)continue;

    files.push(
     new File(
      [blob],
      '貼上圖片'+(pendingPhotos.length+files.length+1)+'.png',
      {type:blob.type}
     )
    );
   }
  }

  if(!files.length)return;

  e.preventDefault();
  addPhotos(files);
 };
};

scheduleMaterialDialog61=function(entry){
 const day=entry?.day||scheduleAnchor56,
 photos=(entry?.receipt_photo_key||entry?.item_photo_key)?'<p class="muted">既有照片會保留；選新照片會替換原有的共用照片。點案件名稱可查看已存照片。</p>':'',
 projects=[...new Set((state.projects||[]).map(p=>p.name).filter(Boolean))];

 modal(
  entry?'編輯料件':'新增料件',
  (canDo('schedule.material.author')
   ?'<label class="field">登記人<select name="authorId">'+schedulePeopleOptions71(entry)+'</select></label>'
   :'<p class="muted">登記人：'+scheduleEsc56(entry?.author_name||currentUser.name)+'</p>'
  )
  +'<div class="form-grid">'
  +'<label class="field">日期<input name="day" type="date" value="'+scheduleEsc56(day)+'" required></label>'
  +'<label class="field">類型<select name="category">'
  +'<option value="收料" '+(entry?.category==='收料'?'selected':'')+'>收料</option>'
  +'<option value="出貨" '+(entry?.category==='出貨'?'selected':'')+'>出貨</option>'
  +'<option value="送貨" '+(entry?.category==='送貨'?'selected':'')+'>送貨</option>'
  +'</select></label>'
  +'<label class="field">案件名稱<input name="projectName" list="schedule-projects68" maxlength="160" value="'+scheduleEsc56(entry?.project_name||'')+'" required>'
  +'<datalist id="schedule-projects68">'+projects.map(name=>'<option value="'+scheduleEsc56(name)+'"></option>').join('')+'</datalist></label>'
  +'<label class="field">料件名稱<input name="title" maxlength="160" value="'+scheduleEsc56(entry?.title||'')+'" required></label>'
  +'<label class="field">數量<input name="quantity" type="number" min="1" max="1000000" step="1" value="'+scheduleEsc56(entry?.quantity||1)+'" required></label>'
  +'<label class="field">照片（選填，收據或料件共用）<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>'
  +'</div>'+photos,
  '儲存料件',
  async fd=>{
   const form=new FormData();

   for(const key of ['day','category','projectName','title','quantity','authorId']){
    form.append(key,String(fd.get(key)||''));
   }

   form.append('id',entry?.id||crypto.randomUUID());
   form.append('revision',String(entry?.revision||0));
   form.append('note',entry?.note||'');

   const file=fd.get('photo');

   if(
    !file?.size &&
    !entry?.receipt_photo_key &&
    !entry?.item_photo_key &&
    !await confirmAction(
     '尚未上傳照片，確定直接儲存嗎？',
     {confirmText:'確認儲存',cancelText:'返回補照片'}
    )
   )return;

   if(file?.size){
    form.append('photo',await compressReceiptImage(file));
   }

   const response=await apiFetch('/api/schedule-material-upload',{
    method:'POST',
    body:form
   });

   const data=await response.json();

   if(!response.ok)throw Error(data.error||'料件儲存失敗');

   $('#modal').close();
   scheduleRender56();
  }
 );

 if(entry&&scheduleAction75('material','delete')){
  const remove=document.createElement('button');
  remove.type='button';
  remove.className='danger-button';
  remove.textContent='刪除料件';

  remove.onclick=async()=>{
   if(!await confirmAction('確定刪除這筆料件紀錄與照片？'))return;

   try{
    await scheduleSend56({
     kind:'material',
     id:entry.id,
     revision:entry.revision
    },'DELETE');

    $('#modal').close();
    scheduleRender56();
   }catch(e){
    $('#form-error').textContent=e.message;
   }
  };

  $('#form-error').before(remove);
 }
};

// Keep the visible roster above the dates while each work item retains its own assignees.
function schedulePlacePeople69(list){
 const blocks=[...list.querySelectorAll('.schedule-task60')];let panel=list.parentNode.querySelector('#schedule-people-top69');
 if(!panel){panel=document.createElement('div');panel.id='schedule-people-top69';panel.className='schedule-people-top69';panel.setAttribute('aria-label','人員名單');const before=list.id==='schedule-task-list60'?list.previousElementSibling:list;list.parentNode.insertBefore(panel,before);
  panel.addEventListener('change',event=>{const row=event.target.closest('.schedule-people-row69');if(!row)return;const people=[...row.querySelectorAll('.schedule-choice60 input[type="checkbox"]')],all=row.querySelector('.schedule-all69 input');if(event.target===all)people.forEach(input=>{input.checked=all.checked});const selected=people.filter(input=>input.checked).length;all.checked=people.length>0&&selected===people.length;all.indeterminate=selected>0&&selected<people.length;scheduleTaskSummaries70(list,panel)});
 }
 for(const [i,block] of blocks.entries()){
  const key=block.dataset.taskIndex;let row=[...panel.children].find(node=>node.dataset.taskIndex===key);
  if(!row){const picker=block.querySelector('.schedule-people63');if(!picker)continue;row=document.createElement('section');row.className='schedule-people-row69';row.dataset.taskIndex=key;const heading=document.createElement('div');heading.className='schedule-people-heading69';heading.innerHTML='<strong></strong><label class="schedule-all69"><input type="checkbox"> 全選</label>';row.append(heading,picker)}
  row.querySelector('strong').textContent='人員名單 · 工作 '+(i+1);panel.append(row);
  const inputs=[...row.querySelectorAll('.schedule-choice60 input[type="checkbox"]')],checked=inputs.filter(input=>input.checked).length,all=row.querySelector('.schedule-all69 input');all.checked=inputs.length>0&&checked===inputs.length;all.indeterminate=checked>0&&checked<inputs.length;
 }
 for(const row of [...panel.children])if(!blocks.some(block=>block.dataset.taskIndex===row.dataset.taskIndex))row.remove();
 scheduleTaskSummaries70(list,panel);
}

function scheduleTaskSummaries70(list,panel){
 for(const [i,block] of [...list.querySelectorAll('.schedule-task60')].entries()){
  const heading=block.querySelector('h3'),row=[...panel.children].find(r=>r.dataset.taskIndex===block.dataset.taskIndex),names=[...row.querySelectorAll('.schedule-choice60 input:checked')].map(input=>input.value);
  heading.textContent='工作 '+(i+1)+'　';const summary=document.createElement('span');summary.className='schedule-task-assignees70';summary.textContent=names.join('、')||'尚未選擇人員';heading.append(summary);
  if(!block.querySelector('.schedule-add-near70')){const add=document.createElement('button');add.type='button';add.className='schedule-add-near70';add.textContent='＋ 新增工作';add.onclick=()=>{const count=list.children.length;document.querySelector(list.id==='schedule-task-list60'?'#schedule-add-task60':'#schedule-group-add65').click();if(list.children.length>count){const last=list.lastElementChild;last.scrollIntoView({block:'end',behavior:'smooth'});last.querySelector('input')?.focus({preventScroll:true})}};block.append(add)}
 }
}
async function scheduleDeleteEntries70(ids){
 const entries=(scheduleData56.entries||[]).filter(e=>ids.includes(e.id));if(!entries.length||entries.some(e=>!scheduleAction75(e.kind,'delete')))return;
 if(!await confirmAction('確定刪除「'+entries.map(e=>scheduleLabel63(e)).join('、')+'」？同項工作的所有指派人員都會同步移除，既有回報會保留。'))return;
 try{await scheduleSend56({kind:'batch',entries:[],deletions:entries.map(e=>({id:e.id,revision:e.revision}))});$('#modal')?.close();scheduleRender56()}catch(e){toast(e.message)}
}
