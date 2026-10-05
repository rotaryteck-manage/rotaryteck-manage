'use strict';
async function makePhotoThumbnail(file){
 const image=await createImageBitmap(file,{imageOrientation:'from-image'});
 try{const scale=Math.min(1,360/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);for(const quality of [.75,.55,.35]){const blob=await canvasBlob(canvas,'image/jpeg',quality);if(blob&&blob.size<=96*1024)return blob;}throw Error('縮圖產生失敗，請更換圖片後重試');}finally{image.close?.();}
}
// Memory only: no persistent browser storage or public cache of private photographs.
const photoCache=new Map(),photoWaiting=[];let photoActive=0,photoGeneration=0,photoBytes=0;
function clearPhotoCache(){photoGeneration++;for(const entry of photoCache.values())if(entry.url)URL.revokeObjectURL(entry.url);photoCache.clear();photoBytes=0;}
function photoQueue(task){return new Promise((resolve,reject)=>{photoWaiting.push({task,resolve,reject});pumpPhotos();});}
function pumpPhotos(){while(photoActive<3&&photoWaiting.length){const job=photoWaiting.shift();photoActive++;Promise.resolve().then(job.task).then(job.resolve,job.reject).finally(()=>{photoActive--;pumpPhotos();});}}
function cachedPhoto(source,thumb=false){
 const u=new URL(source,location.origin);u.searchParams.delete('t');if(thumb)u.searchParams.set('thumb','1');const key=u.pathname+u.search;
 if(photoCache.has(key))return photoCache.get(key).promise;
 const generation=photoGeneration,entry={url:null,size:0,promise:null};
 entry.promise=photoQueue(async()=>{if(generation!==photoGeneration)throw Error('圖片已清除');const response=await apiFetch(key);if(!response.ok)throw Error('照片讀取失敗，請重新開啟重試');const blob=await response.blob();if(generation!==photoGeneration)throw Error('圖片已清除');entry.url=URL.createObjectURL(blob);entry.size=blob.size;photoBytes+=blob.size;
 // Cap retained data; loaded image elements have already decoded their own pixels.
 for(const [oldKey,old]of photoCache){if(photoBytes<=40*1024*1024)break;if(old!==entry&&old.url){URL.revokeObjectURL(old.url);photoBytes-=old.size;photoCache.delete(oldKey);}}
 return entry.url;}).catch(error=>{if(photoCache.get(key)===entry)photoCache.delete(key);throw error;});photoCache.set(key,entry);return entry.promise;
}
function loadPrivateImage(img){if(img.dataset.photoLoading)return;img.dataset.photoLoading='1';img.decoding='async';cachedPhoto(img.dataset.photoSrc,img.dataset.photoThumb==='1').then(url=>{if(img.isConnected)img.src=url;}).catch(()=>{delete img.dataset.photoLoading;img.alt='照片讀取失敗，點此重試';img.onclick=()=>loadPrivateImage(img);});}
const photoObserver=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){photoObserver.unobserve(e.target);loadPrivateImage(e.target);}},{rootMargin:'150px'}):null;
function discoverPhotos(){document.querySelectorAll('img[data-photo-src]:not([data-photo-seen])').forEach(img=>{img.dataset.photoSeen='1';if(photoObserver&&img.loading==='lazy')photoObserver.observe(img);else loadPrivateImage(img);});}
new MutationObserver(discoverPhotos).observe(document.documentElement,{childList:true,subtree:true});discoverPhotos();
function privatePhotoLink(href){const u=new URL(href,location.origin);return u.origin===location.origin&&['/api/logo','/api/receipts','/api/plating-photos','/api/wire-photos','/api/schedule-material-photo'].includes(u.pathname)&&!u.searchParams.has('export');}
let privatePhotoViewer102=null;
function closePrivatePhoto102(){if(privatePhotoViewer102?.open)privatePhotoViewer102.close();}
async function openPrivatePhoto(source,label='照片'){
 closePrivatePhoto102();const dialog=document.createElement('dialog');dialog.className='private-photo-viewer102';dialog.innerHTML='<button type="button" class="private-photo-close102" aria-label="關閉照片">×</button><div class="private-photo-body102"><p role="status">照片載入中…</p></div>';document.body.append(dialog);privatePhotoViewer102=dialog;
 const close=()=>dialog.open&&dialog.close();dialog.querySelector('.private-photo-close102').onclick=close;dialog.addEventListener('click',event=>{if(event.target===dialog)close()});dialog.addEventListener('cancel',event=>{event.preventDefault();close()});dialog.addEventListener('close',()=>{dialog.remove();if(privatePhotoViewer102===dialog)privatePhotoViewer102=null},{once:true});dialog.showModal();
 const load=async()=>{const body=dialog.querySelector('.private-photo-body102');body.innerHTML='<p role="status">照片載入中…</p>';try{const url=await cachedPhoto(source);if(!dialog.isConnected)return;const img=document.createElement('img');img.src=url;img.alt=label;body.replaceChildren(img);}catch(error){if(!dialog.isConnected)return;body.innerHTML='<p class="error">'+esc(error.message||'照片讀取失敗')+'</p><button type="button" class="private-photo-retry102">重新載入</button>';body.querySelector('button').onclick=load;}};await load();
}
document.addEventListener('click',event=>{if(event.button!==0)return;const link=event.target.closest('a[href]');if(link&&privatePhotoLink(link.href)&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();openPrivatePhoto(link.href,link.textContent?.trim()||'照片');return;}const img=event.target.closest('img[data-material-photo],img.legacy-photo71[data-zoom-url]');if(!img||!privatePhotoLink(img.dataset.zoomUrl||''))return;event.preventDefault();openPrivatePhoto(img.dataset.zoomUrl,img.alt||'料件照片');});
const loginBeforePhotos=showLogin;showLogin=function(...args){clearPhotoCache();return loginBeforePhotos(...args);};
window.addEventListener('pagehide',clearPhotoCache);
const fetchBeforePhotos=apiFetch;apiFetch=async function(url,options){const response=await fetchBeforePhotos(url,options);if(response.ok&&options?.method==='DELETE'&&privatePhotoLink(url))clearPhotoCache();return response;};
// Size sibling action buttons together after rendering, including links styled as buttons.
let sizingControls=false;
function equalizeControls(){
 document.querySelectorAll('[data-equal-controls]').forEach(group=>{group.removeAttribute('data-equal-controls');group.style.removeProperty('--action-width');group.style.removeProperty('--action-height')});
}

new MutationObserver(equalizeControls).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('resize',equalizeControls);equalizeControls();

document.fonts?.ready.then(equalizeControls);
