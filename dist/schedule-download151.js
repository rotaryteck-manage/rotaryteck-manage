'use strict';

const scheduleDayShift151=(day,amount)=>new Date(Date.parse(day)+amount*86400000).toISOString().slice(0,10);
const scheduleMonthEnd151=month=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);
const scheduleMonthCount151=(a,b)=>12*(Number(b.slice(0,4))-Number(a.slice(0,4)))+Number(b.slice(5))-Number(a.slice(5))+1;
const scheduleFile151=(content,type,name)=>exportDownload59(new Blob([content],{type}),name);
const scheduleXlsxType151='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const scheduleMaterialHeaders151=['日期','案名','料件','數量','登記人','登記時間','來源'];
const scheduleFormatTime151=value=>value?receiptTime(value):'';
const scheduleDailyTypes151=[
 ['plans','每日工作安排','',true],['reports','工作回報','',true],
 ['received','收料紀錄','',false],['issued','領料紀錄','warehouse.view',false],['leaves','請假紀錄','schedule.leave.view',false],
];
function scheduleSheet151(book,title,rows,widths){
 const sheet=XLSX.utils.aoa_to_sheet(rows);
 sheet['!cols']=widths.map(wch=>({wch}));
 XLSX.utils.book_append_sheet(book,sheet,title);
 return sheet;
}
function scheduleWeeklySheets151(data){
 const sheets=data.months.map(month=>({month,rows:[],merges:[]}));
 const byMonth=new Map(sheets.map(s=>[s.month,s]));
 const notes=new Map(data.notes.map(n=>[n.week_start,n.body]));
 for(let day=data.from;day<=data.to;day=scheduleDayShift151(day,7)){
  const last=scheduleDayShift151(day,6);
  const month=(day<data.start?data.start:day).slice(0,7),sheet=byMonth.get(month);
  if(!sheet)continue;
  const {rows,merges}=sheet,entries=data.entries.filter(e=>e.day<=last&&e.end_day>=day);
  const staff=[...new Set([...data.people,...entries.flatMap(e=>e.people)])].filter(name=>entries.some(e=>e.people.includes(name)));
  const mergeRow=(row,start,end)=>{if(start<end)merges.push({s:{r:row,c:start},e:{r:row,c:end}})};
  mergeRow(rows.length,0,7);
  rows.push([day+' 至 '+last],['人員',...['一','二','三','四','五','六','日'].map((name,i)=>'週'+name+' '+scheduleDayShift151(day,i).slice(5))]);
  for(const person of staff){
   const jobs=entries.filter(e=>e.people.includes(person)).sort((a,b)=>(a.sort_index||0)-(b.sort_index||0)||a.day.localeCompare(b.day)||String(a.created_at||'').localeCompare(String(b.created_at||''))||a.id.localeCompare(b.id));
   for(const [i,e] of jobs.entries()){
    const start=Math.max(0,Math.round((Date.parse(e.day)-Date.parse(day))/86400000))+1;
    const end=Math.min(6,Math.round((Date.parse(e.end_day)-Date.parse(day))/86400000))+1;
    const row=Array(8).fill('');row[0]=i?'':person;row[start]='【'+e.title+'】'+(e.content?' '+e.content:'');
    mergeRow(rows.length,start,end);rows.push(row);
   }
  }
  if(!staff.length){mergeRow(rows.length,0,7);rows.push(['當週沒有排程'])}
  const note=notes.get(day)||[...new Map(entries.filter(e=>e.note).map(e=>[e.id,e.title+'：'+e.note])).values()].join('\n');
  if(note)for(const [i,line] of note.split(/\r?\n/).entries()){mergeRow(rows.length,1,7);rows.push([i?'':'備註',line])}
  rows.push([]);
 }
 return sheets;
}
function scheduleWorkbook151(data,mode,types){
 if(!window.XLSX)throw Error('Excel 元件尚未載入，請重新整理');
 const book=XLSX.utils.book_new();
 if(mode==='weekly')for(const {month,rows,merges} of scheduleWeeklySheets151(data)){
  const sheet=scheduleSheet151(book,month,rows,[17,28,28,28,28,28,28,28]);sheet['!merges']=merges;
 }else{
  const records={
   plans:[['開始日期','結束日期','人員','工作項目','工作內容','備註'],data.plans.map(r=>[r.day,r.end_day,r.people.join('、'),r.title,r.content,r.note]),[14,14,24,25,42,42]],
   reports:[['日期','回報人','工作項目','工作內容','回報文字','回報時間'],data.reports.map(r=>[r.day,r.author_name,r.work_title,r.work_content,r.body,scheduleFormatTime151(r.created_at)]),[14,17,25,34,52,22]],
   received:[scheduleMaterialHeaders151,data.received.map(r=>[...r.slice(0,5),scheduleFormatTime151(r[5]),r[6]]),[14,24,30,10,17,22,16]],
   issued:[scheduleMaterialHeaders151,data.issued.map(r=>[...r.slice(0,5),scheduleFormatTime151(r[5]),r[6]]),[14,24,30,10,17,22,16]],
   leaves:[['開始時間','結束時間','請假人員','假別','事由','登記人'],data.leaves,[22,22,27,18,36,17]],
  };
  for(const [key,title] of scheduleDailyTypes151)if(types.includes(key)){
   const [head,rows,widths]=records[key];scheduleSheet151(book,title,[head,...rows],widths);
  }
 }
 return new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx',compression:true}));
}
async function scheduleTimed152(task,signal,ms,message){
 if(signal.aborted)throw signal.reason;
 const controller=new AbortController();
 let timer,stop;
 const interrupt=new Promise((_,reject)=>{
  stop=()=>{controller.abort(signal.reason);reject(signal.reason)};
  signal.addEventListener('abort',stop,{once:true});
  timer=setTimeout(()=>{
   const error=Object.assign(Error(message),{retryable:true});
   controller.abort(error);reject(error);
  },ms);
 });
 try{return await Promise.race([interrupt,Promise.resolve().then(()=>task(controller.signal))])}
 finally{clearTimeout(timer);signal.removeEventListener('abort',stop)}
}
async function schedulePhotoBatch152(list,loaded,getPhoto,show,signal,maxBytes){
 const queue=list.filter(item=>!loaded.has(item.key)),active=new Map(),attempts=new Map();
 let limit=10,errors=0,size=list.reduce((sum,item)=>sum+(loaded.get(item.key)?.bytes.length||0),0),completed=list.length-queue.length;
 show(completed,list.length);
 if(size>maxBytes)throw Error('照片總量超過 120 MB，請縮短日期範圍或取消勾選照片');
 for(let cursor=0;cursor<queue.length||active.size;){
  if(signal.aborted)throw signal.reason;
  while(cursor<queue.length&&active.size<limit){
   const item=queue[cursor++];attempts.set(item.key,(attempts.get(item.key)||0)+1);
   active.set(item.key,Promise.resolve().then(()=>getPhoto(item)).then(value=>({item,value}),error=>({item,error})));
  }
  const {item,value,error}=await Promise.race(active.values());
  active.delete(item.key);
  if(signal.aborted)throw signal.reason;
  if(error){
   if(error.retryable||error.name==='TypeError'){
    if(++errors>=2)limit=4;
    if(attempts.get(item.key)<2){queue.splice(cursor,0,item);show(completed,list.length,limit===4?'連線較慢，正在重試':'正在重試照片');continue}
    throw Error('有照片下載逾時或連線失敗。按「下載 Excel」可重試，已下載的照片會保留。');
   }
   throw error;
  }
  size+=value.bytes.length;
  if(size>maxBytes)throw Error('照片總量超過 120 MB，請縮短日期範圍或取消勾選照片');
  loaded.set(item.key,value);show(++completed,list.length,limit===4?'已降低同時下載數':'');
 }
}
async function schedulePhotoZip151(data,xlsx,name,status,signal,loaded){
 const list=data.reports.flatMap(report=>(report.photoIndexes||[]).map(index=>({report,index,key:report.id+':'+index})));
 if(list.length>800)throw Error('照片超過 800 張，請縮短日期範圍或取消勾選照片');
 if(!list.length){scheduleFile151(xlsx,scheduleXlsxType151,name+'.xlsx');return false}
 const limit=120*1024*1024-xlsx.length,available=new Set(list.map(item=>item.key));
 for(const key of loaded.keys())if(!available.has(key))loaded.delete(key);
 const getPhoto=({report,index})=>scheduleTimed152(async photoSignal=>{
  const query=new URLSearchParams({id:report.id,index,export:'schedule'}),response=await apiFetch('/api/schedule-photo?'+query,{signal:photoSignal}),type=response.headers.get('content-type')||'';
  if(!response.ok||!/^image\/(jpeg|png|webp)(?:;|$)/.test(type)){
   if([401,403].includes(response.status))throw Error('照片下載權限已變更，請重新整理後再試');
   throw Object.assign(Error('部分照片無法讀取，請重試或取消勾選照片'),{retryable:response.status===408||response.status===429||response.status>=500});
  }
  return {bytes:new Uint8Array(await response.arrayBuffer()),ext:type.includes('png')?'png':type.includes('webp')?'webp':'jpg'};
 },signal,20000,'單張照片下載逾時');
 await schedulePhotoBatch152(list,loaded,getPhoto,(done,total,extra)=>{status.textContent='照片已下載 '+done+'／'+total+(extra?' · '+extra:'')},signal,limit);
 status.textContent='正在打包 Excel 和照片…';
 await new Promise(resolve=>setTimeout(resolve,0));
 if(signal.aborted)throw signal.reason;
 const entries=[{name:name+'.xlsx',data:xlsx}],manifest=[['日期','回報人','工作項目','照片檔案']];
 for(const [i,{report,key}] of list.entries()){
  const {bytes,ext}=loaded.get(key);
  const path='工作回報照片/'+report.day+'/'+String(i+1).padStart(3,'0')+'_'+safeFileName(report.author_name||'回報人')+'.'+ext;
  entries.push({name:path,data:bytes});manifest.push([report.day,report.author_name,report.work_title,path]);
 }
 entries.push({name:'照片清單.csv',data:platingCsv(manifest)});
 exportDownload59(makeZip(entries),name+'.zip');return true;
}
function scheduleExportDialog151(mode){
 if(!canDo('schedule.download')||!canDo('schedule.view'))return;
 let current=null,cacheKey='';const loaded=new Map();
 const weekly=mode==='weekly',month=scheduleAnchor56.slice(0,7),title=weekly?'匯出每週排程':'匯出每日紀錄';
 const dateFields=weekly
  ?'<div class="form-grid">'+field('開始月份','first',month,'type="month" required')+field('結束月份','last',month,'type="month" required')+'</div><div class="schedule-export-year151"><label>年度 <input name="year" aria-label="全年匯出的年度" type="number" min="1900" max="9998" step="1" value="'+month.slice(0,4)+'"></label><button type="button" data-export-year151>全年</button></div><p class="muted">最多 12 個月。跨月保留整週，同一週只匯出一次。</p><fieldset class="schedule-export-types151"><legend>下載格式</legend><label><input type="radio" name="format" value="pdf" checked> PDF（網頁版型）</label><label><input type="radio" name="format" value="xlsx"> Excel（可編輯）</label></fieldset>'
  :'<div class="form-grid">'+field('開始日期','from',month+'-01','type="date" required')+field('結束日期','to',scheduleMonthEnd151(month),'type="date" required')+'</div><fieldset class="schedule-export-types151"><legend>紀錄類型</legend>'+scheduleDailyTypes151.filter(([, ,key])=>!key||canDo(key)).map(([key,label,,checked])=>'<label><input type="checkbox" name="types" value="'+key+'" '+(checked?'checked':'')+'> '+label+'</label>').join('')+'</fieldset><label class="schedule-export-photos151"><input type="checkbox" name="photos"> 包含工作回報照片（Excel 和照片打包成 ZIP）</label>';
 modal(title,'<div class="schedule-export151"><div class="schedule-export-fields152">'+dateFields+'</div><p role="status" data-export-status151></p></div>',weekly?'下載 PDF':'下載 Excel',async form=>{
  const dialog=$('#modal'),status=dialog.querySelector('[data-export-status151]'),params=new URLSearchParams({mode});
  const types=weekly?[]:form.getAll('types'),photos=!weekly&&form.has('photos');
  if(weekly){
   const first=String(form.get('first')),last=String(form.get('last')),count=scheduleMonthCount151(first,last);
   if(!/^\d{4}-\d{2}$/.test(first)||!/^\d{4}-\d{2}$/.test(last)||count<1||count>12)throw Error('請選擇連續 1 到 12 個月');
   params.set('first',first);params.set('last',last);
  }else{
   const from=String(form.get('from')),to=String(form.get('to'));
   if(!from||!to||to<from||Date.parse(to)-Date.parse(from)>=366*86400000)throw Error('請選擇一年內的日期範圍');
   if(!types.length)throw Error('請至少勾選一種紀錄');
   params.set('from',from);params.set('to',to);params.set('types',types.join(','));if(photos)params.set('photos','1');
  }
  const controller=new AbortController(),cancel=()=>controller.abort(),fields=dialog.querySelector('.schedule-export-fields152'),cancelButton=dialog.querySelector('#cancel-modal');
  current=controller;fields.inert=true;cancelButton.textContent='取消下載';
  dialog.addEventListener('close',cancel,{once:true});
  const key=String(currentUser?.id||'')+'|'+params.toString();
  if(cacheKey!==key){loaded.clear();cacheKey=key}
  try{
   status.textContent='正在整理紀錄…';
   const data=await scheduleTimed152(async signal=>{
    const response=await apiFetch('/api/schedule-download?'+params,{signal}),payload=await response.json();
    if(!response.ok){if([401,403].includes(response.status))loaded.clear();throw Error(payload.error||'匯出失敗')}
    return payload;
   },controller.signal,30000,'讀取匯出資料逾時，請重試或縮短日期範圍');
   const name=title+'_'+(weekly?params.get('first')+'_'+params.get('last'):params.get('from')+'_'+params.get('to'));
   if(weekly&&form.get('format')!=='xlsx'){
    const pdf=await weeklyPdf153(data,getComputedStyle(dialog).fontFamily,status,controller.signal);
    if(controller.signal.aborted)throw controller.signal.reason;
    exportDownload59(pdf,name+'.pdf');toast('已下載每週排程 PDF');
   }else{
    const xlsx=scheduleWorkbook151(data,mode,types);
    if(photos){const zipped=await schedulePhotoZip151(data,xlsx,name,status,controller.signal,loaded);toast(zipped?'已下載 Excel 與工作回報照片':'已下載 Excel，所選紀錄沒有工作回報照片')}
    else{scheduleFile151(xlsx,scheduleXlsxType151,name+'.xlsx');toast('已下載 Excel')}
   }
   dialog.close();
  }catch(error){
   if(controller.signal.aborted){status.textContent='已取消下載，可重新開始。'}
   else{status.textContent='';if(/權限/.test(error.message||''))loaded.clear();throw error}
  }finally{
   controller.abort();
   current=null;fields.inert=false;cancelButton.textContent='取消';
   dialog.removeEventListener('close',cancel);
   if(!dialog.open)loaded.clear();
  }
 });
 const form=$('#dialog-form'),dialog=$('#modal');
 form.dataset.scheduleExport152='';
 const cancelOrClose=()=>{if(current){current.abort();return}loaded.clear();dialog.close()};
 form.querySelector('#cancel-modal').onclick=cancelOrClose;
 form.querySelector('#close-modal').onclick=cancelOrClose;
 dialog.oncancel=event=>{event.preventDefault();cancelOrClose()};
 if(weekly){
  form.querySelector('[data-export-year151]').onclick=()=>{
   const year=form.elements.year.value;
   if(!/^\d{4}$/.test(year)||!form.elements.year.reportValidity())return;
   form.elements.first.value=year+'-01';form.elements.last.value=year+'-12';
  };
  for(const option of form.querySelectorAll('[name=format]'))option.onchange=()=>{form.querySelector('#submit-modal').textContent=option.value==='xlsx'?'下載 Excel':'下載 PDF'};
 }
 else{
  const reports=form.querySelector('[value="reports"]'),photos=form.elements.photos;
  const sync=()=>{photos.disabled=!reports.checked;if(photos.disabled)photos.checked=false};
  reports.addEventListener('change',sync);sync();
 }
}
function scheduleAddDownload151(){
 if(!canDo('schedule.download')||!canDo('schedule.view')||!['daily','weekly'].includes(scheduleTab56))return;
 const toolbar=$('.schedule-workspace .schedule-toolbar');if(!toolbar)return;
 const weekly=scheduleTab56==='weekly',className=weekly?'schedule-week-export151':'schedule-day-export151';
 let button=toolbar.querySelector('.'+className);
 if(!button){
  button=document.createElement('button');button.type='button';button.className=className;
  button.textContent=weekly?'匯出每週排程':'匯出每日紀錄';
  button.onclick=()=>scheduleExportDialog151(weekly?'weekly':'daily');
 }
 if(weekly){
  if(mobileQuery78.matches){if(button.parentElement!==toolbar)toolbar.append(button)}
  else{const copy=toolbar.querySelector('[data-schedule-image]');if(copy&&copy.nextElementSibling!==button)copy.after(button)}
 }else if(!button.parentElement)toolbar.querySelector('.calendar-search149')?.append(button);
}
mobileQuery78.addEventListener('change',scheduleAddDownload151);
const scheduleRenderBefore151=scheduleRender56;
scheduleRender56=function(...args){const result=scheduleRenderBefore151.apply(this,args);scheduleAddDownload151();return result};
const scheduleDrawBefore151=scheduleDraw56;
scheduleDraw56=function(...args){const result=scheduleDrawBefore151.apply(this,args);scheduleAddDownload151();return result};

// An image-backed A4 PDF keeps Traditional Chinese available on any PDF reader
// without downloading a separate font or sending meeting content to a service.
function meetingPdfFile151(images,width,height){
 const chunks=[],offsets=[0],encoder=new TextEncoder(),landscape=width>height,pageWidth=landscape?841.89:595.28,pageHeight=landscape?595.28:841.89;
 let size=0;
 const push=value=>{const part=typeof value==='string'?encoder.encode(value):value;chunks.push(part);size+=part.length};
 const obj=(id,write)=>{offsets[id]=size;push(id+' 0 obj\n');write();push('\nendobj\n')};
 push('%PDF-1.4\n%');push(new Uint8Array([0xe2,0xe3,0xcf,0xd3,10]));
 obj(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));
 obj(2,()=>push('<< /Type /Pages /Count '+images.length+' /Kids ['+images.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
 for(const [i,bytes] of images.entries()){
  const id=3+i*3,content='q\n'+pageWidth+' 0 0 '+pageHeight+' 0 0 cm\n/PageImage Do\nQ\n';
  obj(id,()=>push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageWidth+' '+pageHeight+'] /Resources << /XObject << /PageImage '+(id+2)+' 0 R >> >> /Contents '+(id+1)+' 0 R >>'));
  obj(id+1,()=>push('<< /Length '+content.length+' >>\nstream\n'+content+'endstream'));
  obj(id+2,()=>{push('<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>\nstream\n');push(bytes);push('\nendstream')});
 }
 const xref=size;
 push('xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(chunks,{type:'application/pdf'});
}
const meetingPdfWidth153=1240,meetingPdfHeight153=1754;
async function meetingPdfPages153(item,text,font,signal){
 await document.fonts.ready;
 const record=meetingRecordText120(item,text),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw Error('瀏覽器無法產生 PDF');
 const width=meetingPdfWidth153,height=meetingPdfHeight153,pad=68,bottom=height-pad-38,cols=[90,720,width-pad*2-810],line=34,rowPad=13,images=[];
 canvas.width=width;canvas.height=height;
 let y=0,page=0;
 const ink='#214536',muted='#53645a',stroke='#c3d3c8',fill='#e8f1e9';
 const set=(size=24,weight='')=>{ctx.font=(weight?weight+' ':'')+size+'px '+font;ctx.textBaseline='top'};
 const write=(s,x,at,color=ink)=>{ctx.fillStyle=color;ctx.fillText(s,x,at)};
 const label=(s,x,at,size,max,weight='',color=ink)=>{
  set(size,weight);const lines=meetingWrap120(ctx,s,max);
  for(const [i,value] of lines.entries())write(value,x,at+i*(size+9),color);
  return lines.length*(size+9);
 };
 const reset=()=>{
  page++;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);y=pad;
  y+=label(record.title,pad,y,page===1?41:32,width-pad*2,'bold')+18;
  if(page===1)for(const [key,value] of record.metadata)y+=label(key+'：'+value,pad,y,25,width-pad*2,'',muted)+7;
 };
 const head=()=>{
  y+=15;let x=pad;
  for(const [i,key] of record.heads.entries()){
   ctx.fillStyle=fill;ctx.fillRect(x,y,cols[i],55);ctx.strokeStyle=stroke;ctx.strokeRect(x,y,cols[i],55);
   set(25,'bold');write(key,x+rowPad,y+15);x+=cols[i];
  }
  y+=55;
 };
 const finish=async()=>{
  if(signal?.aborted)throw signal.reason;
  set(20);write('第 '+page+' 頁',pad,height-pad,muted);
  const image=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
  if(!image)throw Error('無法產生 PDF 頁面');
  images.push(new Uint8Array(await image.arrayBuffer()));
 };
 reset();head();
 for(const [number,content,note] of record.notes){
  set();
  const blocks=[meetingWrap120(ctx,content,cols[1]-2*rowPad),meetingWrap120(ctx,note,cols[2]-2*rowPad)];
  const total=Math.max(...blocks.map(lines=>lines.length));
  for(let offset=0;offset<total;){
   let available=Math.floor((bottom-y-2*rowPad)/line);
   if(available<1){await finish();reset();head();available=Math.floor((bottom-y-2*rowPad)/line)}
   const count=Math.min(available,total-offset),rowHeight=count*line+2*rowPad;
   const values=[[offset?'續 '+number:number],...blocks.map(lines=>lines.slice(offset,offset+count))];
   let x=pad;
   for(const [i,lines] of values.entries()){
    if(i===0){ctx.fillStyle='#f4f7f4';ctx.fillRect(x,y,cols[i],rowHeight)}
    ctx.strokeStyle=stroke;ctx.strokeRect(x,y,cols[i],rowHeight);set();
    for(const [n,value] of lines.entries())write(value,x+rowPad,y+rowPad+n*line);
    x+=cols[i];
   }
   y+=rowHeight;offset+=count;
  }
 }
 if(record.lastEdit){
  set(20);const lines=meetingWrap120(ctx,record.lastEdit,width-pad*2);
  if(y+26+29*lines.length>bottom){await finish();reset()}
  label(record.lastEdit,pad,y+20,20,width-pad*2,'',muted);
 }
 await finish();
 return images;
}
async function meetingPdf151(item,text,font){return meetingPdfFile151(await meetingPdfPages153(item,text,font),meetingPdfWidth153,meetingPdfHeight153)}
const meetingReadBefore151=meetingRead120;
meetingRead120=function(item,...args){
 const result=meetingReadBefore151.call(this,item,...args);
 const dialog=$('.meeting-read-dialog120[open]'),copy=dialog?.querySelector('[data-meeting-copy120]');
 if(!copy||!canDo('schedule.download')||dialog.querySelector('[data-meeting-pdf151]'))return result;
 const button=document.createElement('button');button.type='button';button.dataset.meetingPdf151='';button.textContent='下載 PDF';copy.after(button);
 button.onclick=async()=>{
  button.disabled=true;button.textContent='正在產生 PDF…';
  try{
   const data=await meetingRequest117('?id='+encodeURIComponent(item.id)+'&download=1');
   const file=await meetingPdf151(data.item,data.text,getComputedStyle(dialog).fontFamily);
   exportDownload59(file,data.item.day+'_週會紀錄.pdf');
   toast('已下載週會紀錄 PDF');
  }catch(error){toast(error.message||'無法下載 PDF')}
  finally{button.disabled=false;button.textContent='下載 PDF'}
 };
 return result;
};

function weeklyPdfWeeks153(data){
 const notes=new Map(data.notes.map(n=>[n.week_start,n.body])),weeks=[];
 for(let start=data.from;start<=data.to;start=scheduleDayShift151(start,7)){
  const end=scheduleDayShift151(start,6),entries=data.entries.filter(e=>e.day<=end&&e.end_day>=start),note=notes.get(start)||'';
  if(!entries.length&&!note)continue;
  const on=i=>{const day=scheduleDayShift151(start,i);return entries.some(e=>e.day<=day&&e.end_day>=day)};
  const days=Array.from({length:on(6)?7:on(5)?6:5},(_,i)=>scheduleDayShift151(start,i));
  const staff=[...new Set([...data.people,...entries.flatMap(e=>e.people)])].filter(name=>entries.some(e=>e.people.includes(name)));
  const rows=staff.map(name=>({name,...weeklyRuns904({entries:entries.filter(e=>e.people.includes(name))},start,days.at(-1))}));
  weeks.push({start,end,days,rows,note,count:entries.length});
 }
 return weeks;
}
function pdfPageCollector153(){
 const images=[];
 let size=0;
 return {images,add(page){
  size+=page.length;
  if(size>80*1024*1024||images.length>=220)throw Error('PDF 內容太多，請縮短月份範圍');
  images.push(page);
 }};
}
async function weeklyPdf153(data,font,status,signal){
 const weeks=weeklyPdfWeeks153(data);
 if(!weeks.length)throw Error('所選月份沒有每週排程或備註');
 await document.fonts.ready;
 const width=1754,height=1240,pad=64,nameW=170,tableW=width-2*pad,bottom=height-92,line=30,headingH=66,tableY=171;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('瀏覽器無法產生 PDF');
 const out=pdfPageCollector153(),ink='#234336',border='#c6d4c7',head='#e8eedf',off='#fff0ee',noteFill='#fff5e8';
 const set=(size=25,bold=false)=>{ctx.font=(bold?'bold ':'')+size+'px '+font;ctx.textBaseline='top'};
 const write=(text,x,y,color=ink)=>{ctx.fillStyle=color;ctx.fillText(text,x,y)};
 const box=(x,y,w,h,color,stroke=border)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.strokeStyle=stroke;ctx.strokeRect(x+.5,y+.5,w-1,h-1)};
 for(const [index,week] of weeks.entries()){
  if(signal.aborted)throw signal.reason;
  status.textContent='正在排版第 '+(index+1)+'／'+weeks.length+' 週';
  const dayW=(tableW-nameW)/week.days.length;
  const holiday=(day,i)=>i>=5||(typeof holidayData60==='function'&&holidayData60(day)?.off);
  let y=0,part=0;
  const startPage=()=>{
   part++;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
   set(40,true);write('每週工作計畫表',pad,pad);
   set(25,true);write(week.start+' 至 '+week.end+(part>1?'（續）':''),pad,pad+60);
   set(24);write(week.count+' 項安排',width-pad-115,pad+61);
   box(pad,tableY,nameW,headingH,head);set(24,true);write('人員',pad+16,tableY+20);
   week.days.forEach((day,i)=>{
    const x=pad+nameW+i*dayW;
    box(x,tableY,dayW,headingH,holiday(day,i)?off:head);write(['一','二','三','四','五','六','日'][i]+'｜'+day.slice(5).replace('-','/'),x+13,tableY+20);
   });
   y=tableY+headingH;
  };
  const finishPage=async()=>{
   if(signal.aborted)throw signal.reason;
   set(19);write('第 '+(out.images.length+1)+' 頁',pad,height-58,'#53645a');
   const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
   if(!jpeg)throw Error('無法產生排程 PDF 頁面');
   out.add(new Uint8Array(await jpeg.arrayBuffer()));
  };
  const nextPage=async()=>{await finishPage();startPage()};
  startPage();
  const maxLines=Math.floor((bottom-tableY-headingH-24)/line);
  for(const [rowIndex,row] of week.rows.entries()){
   set(24,true);
   const names=meetingWrap120(ctx,row.name,nameW-28),lanes=Array.from({length:row.lanes},()=>[]);
   for(const run of row.runs){
    const left=week.days.indexOf(run.start),right=week.days.indexOf(run.end);
    if(left<0||right<left)continue;
    const w=dayW*(right-left+1)-10;
    const lines=meetingWrap120(ctx,run.title+(run.content?'（'+run.content+'）':''),w-24);
    lanes[run.lane].push({x:pad+nameW+dayW*left+5,w,lines,color:/^#[a-f0-9]{6}$/i.test(run.color)?run.color:'#cdebdc'});
   }
   const bands=[];
   for(const lane of lanes){
    const total=Math.max(1,...lane.map(run=>run.lines.length));
    for(let offset=0;offset<total;offset+=maxLines)bands.push({offset,lane,h:Math.max(66,Math.min(total-offset,maxLines)*line+24)});
   }
   const minimum=Math.min(bottom-tableY-headingH,names.length*line+20);
   for(let i=0;i<bands.length;){
    if(y+Math.max(bands[i].h,minimum)>bottom)await nextPage();
    let j=i,groupH=0;
    while(j<bands.length&&y+groupH+bands[j].h<=bottom){groupH+=bands[j].h;j++}
    const stopY=y+Math.max(groupH,minimum);
    groupH=stopY-y;
    box(pad,y,nameW,groupH,rowIndex%2?'#ffffff':'#f3f7ef');
    set(24,true);names.forEach((name,n)=>write(name,pad+14,y+10+n*line));
    week.days.forEach((day,k)=>box(pad+nameW+k*dayW,y,dayW,groupH,holiday(day,k)?off:'#fff'));
    for(;i<j;i++){
     const band=bands[i];
     for(const run of band.lane){
      const lines=run.lines.slice(band.offset,band.offset+maxLines);
      if(!lines.length)continue;
      box(run.x,y+5,run.w,band.h-10,run.color,'#718478');
      set(24,true);
      lines.forEach((value,n)=>write(value,run.x+12,y+12+n*line,typeof scheduleInk56==='function'?scheduleInk56(run.color):ink));
     }
     y+=band.h;
    }
    y=stopY;
   }
  }
  if(!week.rows.length){box(pad,y,tableW,64,'#fff');set(24);write('當週沒有工作安排',pad+16,y+17);y+=64}
  if(week.note){
   set(24);
   const lines=meetingWrap120(ctx,week.note,tableW-nameW-30);
   for(let i=0;i<lines.length;){
    let count=Math.floor((bottom-y-22)/line);
    if(count<1){await nextPage();count=Math.floor((bottom-y-22)/line)}
    const chunk=lines.slice(i,i+count),h=chunk.length*line+22;
    box(pad,y,nameW,h,noteFill,'#d8a969');box(pad+nameW,y,tableW-nameW,h,noteFill,'#d8a969');
    set(24,true);write(i?'備註（續）':'備註',pad+16,y+10,'#673d16');
    set(24);chunk.forEach((value,j)=>write(value,pad+nameW+14,y+10+j*line,'#673d16'));
    y+=h;i+=chunk.length;
   }
  }
  await finishPage();
 }
 return meetingPdfFile151(out.images,width,height);
}

function meetingExportDialog153(){
 if(!canDo('schedule.download'))return;
 const month=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
 let current=null;
 modal('匯出週會紀錄','<div class="schedule-export151"><div class="schedule-export-fields152"><div class="form-grid">'+field('開始月份','first',month,'type="month" required')+field('結束月份','last',month,'type="month" required')+'</div><p class="muted">最多 12 個月，依日期合成一份 PDF，每場會議從新的一頁開始。</p></div><p role="status" data-export-status151></p></div>','下載 PDF',async values=>{
  const first=String(values.get('first')),last=String(values.get('last')),count=scheduleMonthCount151(first,last);
  if(!/^\d{4}-\d{2}$/.test(first)||!/^\d{4}-\d{2}$/.test(last)||count<1||count>12)throw Error('請選擇連續 1 到 12 個月');
  const dialog=$('#modal'),fields=dialog.querySelector('.schedule-export-fields152'),status=dialog.querySelector('[data-export-status151]'),button=dialog.querySelector('#cancel-modal');
  const controller=new AbortController(),cancel=()=>controller.abort();current=controller;
  dialog.addEventListener('close',cancel,{once:true});fields.inert=true;button.textContent='取消下載';
  try{
   status.textContent='正在讀取週會紀錄…';
   const params=new URLSearchParams({view:'export',first,last});
   const data=await scheduleTimed152(async signal=>{
    const response=await apiFetch('/api/meetings?'+params,{signal}),payload=await response.json();
    if(!response.ok)throw Error(payload.error||'讀取週會紀錄失敗');
    return payload;
   },controller.signal,30000,'讀取週會紀錄逾時，請重試或縮短月份範圍');
   if(!data.items.length)throw Error('所選月份沒有週會紀錄');
   const out=pdfPageCollector153(),font=getComputedStyle(dialog).fontFamily;
   for(const [index,item] of data.items.entries()){
    if(controller.signal.aborted)throw controller.signal.reason;
    status.textContent='正在排版第 '+(index+1)+'／'+data.items.length+' 場會議';
    for(const page of await meetingPdfPages153(item,data.text,font,controller.signal))out.add(page);
   }
   if(controller.signal.aborted)throw controller.signal.reason;
   exportDownload59(meetingPdfFile151(out.images,meetingPdfWidth153,meetingPdfHeight153),'週會紀錄_'+first+(first===last?'':'_'+last)+'.pdf');
   toast('已下載 '+data.items.length+' 場週會紀錄');dialog.close();
  }catch(error){
   if(controller.signal.aborted)status.textContent='已取消下載，可重新開始。';
   else{status.textContent='';throw error}
  }finally{
   controller.abort();current=null;fields.inert=false;button.textContent='取消';dialog.removeEventListener('close',cancel);
  }
 });
 const dialog=$('#modal'),form=$('#dialog-form');form.dataset.scheduleExport152='';
 const close=()=>{if(current)current.abort();else dialog.close()};
 form.querySelector('#cancel-modal').onclick=close;form.querySelector('#close-modal').onclick=close;
 dialog.oncancel=event=>{event.preventDefault();close()};
}
const meetingRenderBefore153=meetingRender117;
meetingRender117=function(...args){
 const result=meetingRenderBefore153.apply(this,args),tools=$('.meeting-workspace117 .meeting-tools117');
 if(tools&&canDo('schedule.download')&&!tools.querySelector('[data-meeting-export153]')){
  const button=document.createElement('button');button.type='button';button.dataset.meetingExport153='';
  button.textContent='匯出週會紀錄';button.onclick=meetingExportDialog153;tools.append(button);
 }
 return result;
};
document.documentElement.dataset.appVersion='15.5v';
