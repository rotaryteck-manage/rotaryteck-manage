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
function privatePhotoLink(href){const u=new URL(href,location.origin);return u.origin===location.origin&&['/api/logo','/api/receipts','/api/plating-photos','/api/wire-photos'].includes(u.pathname)&&!u.searchParams.has('export');}
function openPrivatePhoto(source){const popup=window.open('','_blank');if(!popup){toast('請允許開啟照片視窗');return;}popup.opener=null;popup.document.body.textContent='照片載入中…';cachedPhoto(source).then(url=>{if(!popup.closed)popup.location.replace(url);}).catch(error=>{if(!popup.closed)popup.document.body.textContent=error.message;});}
document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link||!privatePhotoLink(link.href)||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();openPrivatePhoto(link.href);});
const loginBeforePhotos=showLogin;showLogin=function(...args){clearPhotoCache();return loginBeforePhotos(...args);};
window.addEventListener('pagehide',clearPhotoCache);
const fetchBeforePhotos=apiFetch;apiFetch=async function(url,options){const response=await fetchBeforePhotos(url,options);if(response.ok&&options?.method==='DELETE'&&privatePhotoLink(url))clearPhotoCache();return response;};
// Size sibling action buttons together after rendering, including links styled as buttons.
let sizingControls=false;
function equalizeControls(){if(sizingControls)return;sizingControls=true;requestAnimationFrame(()=>{try{new Set([...document.querySelectorAll('button')].map(button=>button.parentElement)).forEach(group=>{const buttons=[...group.children].filter(el=>el.matches('button:not(.project-row):not(.wire-thumb):not(.plating-open):not(#close-modal),a.admin-back-button,a.admin-back-link'));if(buttons.length<2)return;group.removeAttribute('data-equal-controls');group.style.removeProperty('--action-width');const width=Math.ceil(Math.max(...buttons.map(b=>b.getBoundingClientRect().width)));if(width>0){group.setAttribute('data-equal-controls','');group.style.setProperty('--action-width',width+'px');}});}finally{sizingControls=false;}});}
new MutationObserver(equalizeControls).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('resize',equalizeControls);equalizeControls();
