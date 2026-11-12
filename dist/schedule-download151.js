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
async function schedulePhotoZip151(data,xlsx,name,status,signal){
 const list=data.reports.flatMap(report=>(report.photoIndexes||[]).map(index=>({report,index})));
 if(list.length>800)throw Error('照片超過 800 張，請縮短日期範圍或取消勾選照片');
 if(!list.length){scheduleFile151(xlsx,scheduleXlsxType151,name+'.xlsx');return false}
 const entries=[{name:name+'.xlsx',data:xlsx}],manifest=[['日期','回報人','工作項目','照片檔案']];
 let size=xlsx.length;
 for(const [i,{report,index}] of list.entries()){
  status.textContent='正在下載照片 '+(i+1)+'／'+list.length;
  const query=new URLSearchParams({id:report.id,index,export:'schedule'}),response=await apiFetch('/api/schedule-photo?'+query,{signal}),type=response.headers.get('content-type')||'';
  if(!response.ok||!/^image\/(jpeg|png|webp)(?:;|$)/.test(type))throw Error('部分照片讀取失敗，請重試或取消勾選照片');
  const bytes=new Uint8Array(await response.arrayBuffer());size+=bytes.length;
  if(size>120*1024*1024)throw Error('照片總量超過 120 MB，請縮短日期範圍或取消勾選照片');
  const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';
  const path='工作回報照片/'+report.day+'/'+String(i+1).padStart(3,'0')+'_'+safeFileName(report.author_name||'回報人')+'.'+ext;
  entries.push({name:path,data:bytes});manifest.push([report.day,report.author_name,report.work_title,path]);
 }
 entries.push({name:'照片清單.csv',data:platingCsv(manifest)});
 exportDownload59(makeZip(entries),name+'.zip');return true;
}
function scheduleExportDialog151(mode){
 if(!canDo('schedule.download')||!canDo('schedule.view'))return;
 const weekly=mode==='weekly',month=scheduleAnchor56.slice(0,7),title=weekly?'匯出每週排程':'匯出每日紀錄';
 const dateFields=weekly
  ?'<div class="form-grid">'+field('開始月份','first',month,'type="month" required')+field('結束月份','last',month,'type="month" required')+'</div><div class="schedule-export-year151"><label>年度 <input name="year" aria-label="全年匯出的年度" type="number" min="1900" max="9998" step="1" value="'+month.slice(0,4)+'"></label><button type="button" data-export-year151>全年</button></div><p class="muted">最多 12 個月，每月一張工作表。跨月保留整週，放在所選範圍內最早涵蓋該週的月份。</p>'
  :'<div class="form-grid">'+field('開始日期','from',month+'-01','type="date" required')+field('結束日期','to',scheduleMonthEnd151(month),'type="date" required')+'</div><fieldset class="schedule-export-types151"><legend>紀錄類型</legend>'+scheduleDailyTypes151.filter(([, ,key])=>!key||canDo(key)).map(([key,label,,checked])=>'<label><input type="checkbox" name="types" value="'+key+'" '+(checked?'checked':'')+'> '+label+'</label>').join('')+'</fieldset><label class="schedule-export-photos151"><input type="checkbox" name="photos"> 包含工作回報照片（Excel 和照片打包成 ZIP）</label>';
 modal(title,'<div class="schedule-export151">'+dateFields+'<p role="status" data-export-status151></p></div>','下載 Excel',async form=>{
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
  const controller=new AbortController(),cancel=()=>controller.abort();
  dialog.addEventListener('close',cancel,{once:true});
  try{
   status.textContent='正在整理紀錄…';
   const response=await apiFetch('/api/schedule-download?'+params,{signal:controller.signal}),data=await response.json();if(!response.ok)throw Error(data.error||'匯出失敗');
   const xlsx=scheduleWorkbook151(data,mode,types),name=title+'_'+(weekly?params.get('first')+'_'+params.get('last'):params.get('from')+'_'+params.get('to'));
   if(photos){const zipped=await schedulePhotoZip151(data,xlsx,name,status,controller.signal);toast(zipped?'已下載 Excel 與工作回報照片':'已下載 Excel，所選紀錄沒有工作回報照片')}
   else{scheduleFile151(xlsx,scheduleXlsxType151,name+'.xlsx');toast('已下載 Excel')}
   dialog.close();
  }catch(error){if(!controller.signal.aborted)throw error}
  finally{dialog.removeEventListener('close',cancel);status.textContent=''}
 });
 const form=$('#dialog-form');
 if(weekly)form.querySelector('[data-export-year151]').onclick=()=>{
  const year=form.elements.year.value;
  if(!/^\d{4}$/.test(year)||!form.elements.year.reportValidity())return;
  form.elements.first.value=year+'-01';form.elements.last.value=year+'-12';
 };
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
 const make=(suffix='')=>{const b=document.createElement('button');b.type='button';b.className=className+suffix;b.textContent=weekly?'匯出每週排程':'匯出每日紀錄';b.onclick=()=>scheduleExportDialog151(weekly?'weekly':'daily');return b};
 if(!toolbar.querySelector('.'+className)){
  if(weekly){toolbar.querySelector('[data-schedule-image]')?.after(make());toolbar.append(make(' schedule-week-export-mobile151'))}
  else toolbar.querySelector('.calendar-search149')?.append(make());
 }
}
const scheduleRenderBefore151=scheduleRender56;
scheduleRender56=function(...args){const result=scheduleRenderBefore151.apply(this,args);scheduleAddDownload151();return result};
const scheduleDrawBefore151=scheduleDraw56;
scheduleDraw56=function(...args){const result=scheduleDrawBefore151.apply(this,args);scheduleAddDownload151();return result};

// An image-backed A4 PDF keeps Traditional Chinese available on any PDF reader
// without downloading a separate font or sending meeting content to a service.
function meetingPdfFile151(images,width,height){
 const chunks=[],offsets=[0],encoder=new TextEncoder(),pageWidth=595.28,pageHeight=841.89;
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
async function meetingPdf151(item,text,font){
 await document.fonts.ready;
 const record=meetingRecordText120(item,text),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw Error('瀏覽器無法產生 PDF');
 const width=1240,height=1754,pad=68,bottom=height-pad-38,cols=[90,720,width-pad*2-810],line=34,rowPad=13,images=[];
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
 return meetingPdfFile151(images,width,height);
}
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
document.documentElement.dataset.appVersion='15.1v';
