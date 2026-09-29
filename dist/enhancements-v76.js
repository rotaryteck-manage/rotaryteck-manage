'use strict';
const permissionNotes76={
'warehouse.historyEdit':'修改舊收領料的日期、人員、品項與數量，並同步校正庫存。',
'warehouse.purge':'永久清除已刪除的庫房專案，無法再復原。',
'schedule.view':'查看每日、每週排程與工作紀錄；請假及文字紀錄另行授權。',
'schedule.report':'填寫當天指派給自己的工作回報，需附工作照片。',
'records.export':'依日期匯出排程、工作紀錄及相關照片。',
'cases.deleteProject':'刪除案件專案；此區既有刪除無法復原。',
'warehouse.deleteProject':'將庫房專案移至已刪除清單，保留 7 天。',
'plating.deleteProject':'將電鍍專案及所屬紀錄移至已刪除清單，保留 7 天。',
'wire.deleteProject':'將線材專案移至已刪除清單，保留 7 天。',
'cases.view':'查看案件名稱、進度與案件資料。',
'cases.manage':'建立案件、修改案件內容或狀態，以及調整排序。',
'warehouse.view':'查看庫房專案、零件需求、庫存與收領料資料。',
'warehouse.manage':'建立及編輯專案、匯入 BOM、新增、修改或復原零件；數量修正另行授權。',
'warehouse.photos':'上傳或刪除庫房照片，不會更改庫存。',
'plating.view':'查看電鍍專案、送鍍與回貨紀錄。',
'plating.manage':'建立、修改或刪除送鍍紀錄，填寫回貨資料。',
'plating.photos':'上傳或刪除送鍍及區域照片。',
'wire.view':'查看線材、線捆、裁線及補貨資料。',
'wire.create':'新增線材種類或線捆。',
'wire.edit':'修改線材、線捆名稱、規格及排序。',
'wire.delete':'刪除沒有照片或裁線紀錄的空白線材／線捆。',
'wire.cut':'登記裁線長度與數量，也可標記需補貨。',
'wire.editOwn':'只可修改本人建立的裁線紀錄。',
'wire.photos':'上傳線材或裁線照片。',
'warehouse.receive':'登記本次收到數量，增加累計收料與庫存。',
'warehouse.issue':'登記領料數量，扣除庫存；不可超過現有數量。',
'warehouse.receivedDate':'設定或清除收料日期，不會改變庫存數量。',
'warehouse.issuedDate':'設定或清除領料日期，不會改變庫存數量。',
'warehouse.stockAdjust':'直接修正目前庫存數量，請先核對實際庫存。',
'warehouse.preparedAdjust':'修正本次製作已備數量，不會同時改動現有庫存。',
'warehouse.options':'新增、修改或刪除庫房櫃／層選項，保留既有資料中的舊名稱。',
'schedule.weekly.create':'新增每週工作，設定日期、內容與指派人員。',
'schedule.weekly.edit':'修改既有每週安排；多人共用的工作會同步修改。',
'schedule.weekly.delete':'刪除每週工作安排，既有工作回報保留。',
'schedule.daily.create':'在指定日期新增工作，可讓同一人安排多項工作。',
'schedule.daily.edit':'編輯當天已安排的工作內容與人員。',
'schedule.daily.delete':'刪除當日工作安排，既有工作回報保留。',
'schedule.copy':'將上週工作複製到選定週，系統會防止同週重複複製。',
'schedule.reset':'清除選定週的安排與備註，保留工作回報及其他週安排。',
'schedule.dedupe':'先列出重複安排，確認後整理；保留不同工作與既有回報。',
'schedule.note':'新增、修改或清除每週備註。',
'schedule.options':'管理工作項目下拉選單，既有工作保留原名稱。',
'schedule.palette':'設定全公司共用的 10 格常用色，不會改變舊工作的顏色。',
'schedule.material.create':'新增每日收料、出貨或送貨紀錄，可附照片。',
'schedule.material.edit':'修改既有每日料件紀錄的日期、品項、數量與照片。',
'schedule.material.delete':'刪除每日料件紀錄及該筆相關照片。',
'schedule.material.author':'變更每日料件紀錄的登記人。',
'schedule.report.editOwn':'只可修改本人填寫的工作回報。',
'schedule.report.editAll':'可修改任何人填寫的工作回報。',
'schedule.report.deleteOwn':'只可刪除本人的工作回報及其照片。',
'schedule.report.deleteAll':'可刪除任何人的工作回報及其照片。',
'schedule.leave.view':'查看請假人員、起訖時間及原因。',
'schedule.leave.create':'新增一人或多人的請假登記。',
'schedule.leave.edit':'修改既有請假登記的人員、時間及原因。',
'schedule.leave.delete':'刪除整筆請假登記，包含該筆所有人員與時段。',
'schedule.text.daily':'查看每日排程、料件與工作回報的文字紀錄。',
'schedule.text.weekly':'查看每週排程操作的文字紀錄。',
'schedule.text.delete':'刪除文字紀錄，不會撤銷排程或庫存異動。',
'wire.restock':'登記已訂購、已入庫，或撤銷該輪補貨操作。',
'wire.editAll':'可修改所有人的裁線紀錄。',
'plating.options':'新增、修改或刪除電鍍廠商選項。',
'admin.view':'開啟管理後台，只能操作另外授權的功能。',
'admin.settings':'修改網站文字、外觀、頁面、自訂欄位與 LOGO。',
'admin.employees':'邀請及管理人員；不能授予自己沒有的權限。',
'admin.permissions':'主管可設定角色權限；非主管即使勾選也不能使用。',
'admin.export':'下載完整資料備份、各區資料及照片。',
'admin.import':'追加舊備份資料，相同編號不覆蓋既有資料。',
'admin.audit':'查看操作紀錄；仍需通過既有資訊庫畫面鎖。',
'admin.auditDelete':'刪除操作紀錄，不會撤銷實際資料異動。',
'admin.photoPurge':'永久清除所選範圍的全部照片，無法復原。',
'warehouse.restore':'復原保留期內已刪除的庫房專案、零件與庫存。',
'plating.restore':'復原保留期內已刪除的電鍍專案。',
'wire.restore':'復原保留期內已刪除的線材專案。'
};
const supervisorRecommended76=new Set(['warehouse.historyEdit','warehouse.purge','cases.deleteProject','warehouse.deleteProject','plating.deleteProject','wire.deleteProject','warehouse.stockAdjust','warehouse.preparedAdjust','schedule.reset','schedule.dedupe','schedule.material.author','schedule.report.editAll','schedule.report.deleteAll','schedule.text.delete','wire.editAll','admin.settings','admin.employees','admin.permissions','admin.export','admin.import','admin.auditDelete','admin.photoPurge','records.export']);
function permissionCategory76(key){
 if(key==='schedule.report'||key.startsWith('schedule.report.'))return '工作回報';
 if(key.startsWith('schedule.leave.'))return '請假';
 if(key.startsWith('schedule.text.')||key==='records.export')return '文字紀錄';
 if(key.startsWith('schedule.'))return '工作排程';
 return {cases:'案件',warehouse:'庫房',plating:'電鍍',wire:'線材',admin:'後台'}[key.split('.')[0]]||'後台';
}
const permissionDialogBefore76=permissionDialog;
permissionDialog=function(profile){
 permissionDialogBefore76(profile);
 const box=$('#modal .permission-options');if(!box)return;
 const note=box.previousElementSibling;if(note?.matches('p'))note.textContent='勾選後開放該功能；紅字「建議僅主管」是授權提醒，不會自動限制倉管。權限管理維持主管限定。切換分類不會取消勾選。';
 const rows=[...box.querySelectorAll('label')];box.classList.add('permission-list76');
 for(const row of rows){const input=row.querySelector('input'),key=input.value;row.dataset.permissionCategory=permissionCategory76(key);row.className='permission-row76';const title=document.createElement('span');title.className='permission-title76';title.textContent=permissionCapabilities[key];const detail=document.createElement('small');detail.textContent=permissionNotes76[key]||'依此項目開放操作；仍需具備該區查看權限。';row.replaceChildren(input,title,detail);if(supervisorRecommended76.has(key)){title.classList.add('supervisor-recommended76');const tag=document.createElement('span');tag.className='permission-warning76';tag.textContent=key==='admin.permissions'?'主管限定':'建議僅主管';title.append(tag);}}
 const nav=document.createElement('nav');nav.className='permission-tabs76';nav.setAttribute('aria-label','權限分類');
 for(const category of ['全部','案件','庫房','電鍍','線材','工作排程','工作回報','請假','文字紀錄','後台']){const b=document.createElement('button');b.type='button';b.textContent=category;b.setAttribute('aria-pressed',String(category==='全部'));b.onclick=()=>{rows.forEach(row=>row.hidden=category!=='全部'&&row.dataset.permissionCategory!==category);nav.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};nav.append(b);}box.before(nav);
};
// Share concurrent reads only. Every later read still reaches the server for fresh permissions/data.
const readRequests76=new Map();
const apiFetchBefore76=apiFetch;
const transfers76=new Map();
function transferStatus76(id,message,done=false){
 if(done)transfers76.delete(id);else transfers76.set(id,message);
 let bar=$('#transfer-status76');if(!transfers76.size){bar?.remove();return;}
 if(!bar){bar=document.createElement('div');bar.id='transfer-status76';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');document.body.append(bar);}
 const host=document.querySelector('dialog[open]')||document.body;if(bar.parentElement!==host)host.append(bar);
 bar.textContent=[...transfers76.values()].join(' · ');
}
async function uploadFetch76(input,init){
 const session=await authSession();if(!session){showLogin('登入已逾時，請重新登入。');throw Error('請先登入');}
 const id=crypto.randomUUID();transferStatus76(id,'正在上傳照片…');
 try{return await new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest();xhr.open(init.method||'POST',input);xhr.timeout=60000;
  const headers=new Headers(init.headers||{});headers.set('Authorization','Bearer '+session.access_token);headers.forEach((v,k)=>xhr.setRequestHeader(k,v));
  const abort=()=>xhr.abort(),clean=()=>init.signal?.removeEventListener('abort',abort);
  xhr.upload.onprogress=e=>transferStatus76(id,e.lengthComputable?'照片上傳 '+Math.floor(e.loaded/e.total*100)+'%'+(e.loaded===e.total?'，伺服器儲存中…':''):'正在上傳照片…');
  xhr.onload=()=>{clean();if(!xhr.status){reject(Error('上傳連線中斷，請確認紀錄後重試。'));return;}const headers=new Headers();for(const line of xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)){const i=line.indexOf(':');if(i>0)headers.append(line.slice(0,i),line.slice(i+1).trim());}resolve(new Response(xhr.status===204?null:xhr.responseText,{status:xhr.status,headers}));};
  xhr.onerror=()=>{clean();reject(Error('上傳連線失敗，請保留表單並重試。'))};xhr.ontimeout=()=>{clean();reject(Error('上傳逾時，請先確認紀錄是否已存入，再重試。'))};xhr.onabort=()=>{clean();reject(Error('上傳已取消'))};
  if(init.signal?.aborted){reject(Error('上傳已取消'));return;}init.signal?.addEventListener('abort',abort,{once:true});xhr.send(init.body);
 });}finally{transferStatus76(id,'',true);}
}
apiFetch=async function(input,init={}){
 const method=(init.method||'GET').toUpperCase();
 if(method!=='GET'){readRequests76.clear();if(init.body instanceof FormData)return uploadFetch76(input,init);return apiFetchBefore76(input,init);}
 // Explicit headers/signals can represent distinct requests and are never combined.
 if(init.signal||init.headers)return apiFetchBefore76(input,init);
 const token=authRead()?.access_token||'',key=token+'\n'+String(input);
 let pending=readRequests76.get(key);
 if(!pending){pending=apiFetchBefore76(input,init);readRequests76.set(key,pending);pending.finally(()=>{if(readRequests76.get(key)===pending)readRequests76.delete(key)}).catch(()=>{});}
 return (await pending).clone();
};
// Reuse local photo work after selection; no files are sent until the user submits.
const preparedImages76=new WeakMap(),compressBefore76=compressReceiptImage;
compressReceiptImage=function(file,maxBytes=800*1024){
 if(!file)return compressBefore76(file,maxBytes);
 let sizes=preparedImages76.get(file);if(!sizes){sizes=new Map();preparedImages76.set(file,sizes);}
 if(!sizes.has(maxBytes)){const promise=compressBefore76(file,maxBytes);sizes.set(maxBytes,promise);promise.catch(()=>sizes.delete(maxBytes));}
 return sizes.get(maxBytes);
};
const uploadLocks76=new WeakMap(),uploadImageBefore76=uploadImage;
uploadImage=function(file,url,limit){
 if(!file)return uploadImageBefore76(file,url,limit);
 let urls=uploadLocks76.get(file);if(!urls){urls=new Map();uploadLocks76.set(file,urls);}if(urls.has(url))return urls.get(url);
 const pending=uploadImageBefore76(file,url,limit);urls.set(url,pending);pending.finally(()=>urls.delete(url)).catch(()=>{});return pending;
};
const previewURLs76=new Map();
function clearPreviews76(){for(const [input,entry]of previewURLs76)if(!input.isConnected){entry.urls.forEach(URL.revokeObjectURL);previewURLs76.delete(input);}}
document.addEventListener('change',e=>{
 const input=e.target;if(!input.matches('input[type=file]'))return;const files=[...input.files].filter(f=>f.type.startsWith('image/'));
 const old=previewURLs76.get(input);old?.urls.forEach(URL.revokeObjectURL);old?.box.remove();previewURLs76.delete(input);if(!files.length)return;
 const box=document.createElement('div');box.className='photo-preview76';box.setAttribute('aria-label','待上傳照片預覽');const urls=[];
 for(const file of files.slice(0,12)){const img=document.createElement('img'),url=URL.createObjectURL(file);urls.push(url);img.src=url;img.alt=file.name;img.title='本機預覽，尚未上傳';box.append(img);}
 const note=document.createElement('small');note.textContent='已選 '+files.length+' 張 · 本機預覽，送出後才會上傳';box.append(note);input.after(box);previewURLs76.set(input,{urls,box});
 // A single photo can be prepared while the user fills the rest of the form.
 if(files.length===1)compressReceiptImage(files[0]).catch(()=>{});
},true);
new MutationObserver(clearPreviews76).observe(document.body,{childList:true,subtree:true});
window.addEventListener('pagehide',()=>{for(const entry of previewURLs76.values())entry.urls.forEach(URL.revokeObjectURL);previewURLs76.clear();});
window.addEventListener('beforeunload',e=>{if(transfers76.size){e.preventDefault();e.returnValue='';}});

// Fade over the ready page; never hold up initialization or wait for the logo.
function finishBoot76(){
 const overlay=document.getElementById('boot-loading76');if(!overlay||overlay.classList.contains('boot-ready76'))return;
 overlay.classList.add('boot-ready76');overlay.setAttribute('aria-hidden','true');
 setTimeout(()=>overlay.remove(),250);
}
