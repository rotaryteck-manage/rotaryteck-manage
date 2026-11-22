'use strict';
let pcbAccess177={enabled:true,allowed:false,canConfigure:false,loaded:false},pcbAccessUser177='',pcbAccessPending177=null,pcbAccessEpoch177=0,pcbAccessTime177=0,pcbGateToken177=0;
function pcbAccessSession177(){
 const user=String(currentUser?.id||'');
 if(user!==pcbAccessUser177){pcbAccessUser177=user;pcbAccessEpoch177++;pcbAccessPending177=null;pcbAccessTime177=0;pcbAccess177={enabled:true,allowed:false,canConfigure:false,loaded:false};pcbData171={projects:[],links:[],fixtures:[],photos:[],events:[]};}
 return user;
}
async function pcbLoadAccess177(force=false){
 const user=pcbAccessSession177(),epoch=pcbAccessEpoch177;
 if(!user)throw Error('請先登入');
 if(pcbAccessPending177)return pcbAccessPending177;
 if(!force&&pcbAccess177.loaded&&Date.now()-pcbAccessTime177<30000)return pcbAccess177;
 const pending=(async()=>{const r=await apiFetch('/api/pcb-access177'),d=await r.json();if(!r.ok)throw Error(d.error||'無法確認PCB狀態');if(epoch!==pcbAccessEpoch177||String(currentUser?.id||'')!==user)throw Error('登入帳號已變更');pcbAccess177={...d,loaded:true};pcbAccessTime177=Date.now();return pcbAccess177})();
 pcbAccessPending177=pending;try{return await pending}finally{if(pcbAccessPending177===pending)pcbAccessPending177=null;}
}
function pcbNotice177(root,message='施工中'){
 if(!root){$('.pcb-workspace171')?.remove();root=document.createElement('section');root.className='workspace pcb-workspace171';$('main')?.append(root);}
 root.replaceChildren();const box=document.createElement('div');box.className='pcb-construction177';box.setAttribute('role','status');const title=document.createElement('h2');title.textContent=message;box.append(title);root.append(box);
}
function pcbDeny177(){
 pcbAccess177={...pcbAccess177,enabled:true,allowed:false,loaded:true};pcbAccessTime177=Date.now();pcbData171={projects:[],links:[],fixtures:[],photos:[],events:[]};pcbProjectId171='';
 if(location.hash==='#pcb'){const m=$('#modal');if(m?.open){m.close();m.replaceChildren()}pcbNotice177();}
}
const pcbOpenBefore177=pcbOpen171;
pcbOpen171=function(...args){pcbAccessSession177();if(!pcbAccess177.loaded||!pcbAccess177.allowed){pcbDeny177();return}return pcbOpenBefore177(...args)};
const pcbPhotosBefore177=pcbPhotos171;
pcbPhotos171=function(...args){pcbAccessSession177();if(!pcbAccess177.loaded||!pcbAccess177.allowed){pcbDeny177();return}return pcbPhotosBefore177(...args)};
const pcbTransportBefore177=apiFetch;
apiFetch=async function(url,options){
 const response=await pcbTransportBefore177(url,options);
 if(String(url).split('?')[0]==='/api/pcb'&&response.status===423){try{if((await response.clone().json()).code==='PCB_CONSTRUCTION')pcbDeny177()}catch{}}
 return response;
};
const pcbPagesBefore177=managementPages;
managementPages=function(){
 const pages=pcbPagesBefore177();
 if((!pcbAccess177.loaded||pcbAccess177.enabled)&&!pages.some(p=>p.id==='pcb')){const wire=pages.findIndex(p=>p.id==='wire'),schedule=pages.findIndex(p=>p.id==='schedule');pages.splice(wire>=0?wire+1:schedule>=0?schedule:pages.length,0,{id:'pcb',title:'PCB管理'});}
 return pages;
};
const pcbRenderPaneBefore177=pcbRender171;
pcbRender171=function(){
 pcbAccessSession177();$('.pcb-workspace171')?.remove();pcbProjectId171='';const main=$('main');if(!main)return;
 const root=document.createElement('section');root.className='workspace pcb-workspace171';main.append(root);pcbNotice177(root,'載入中');const token=++pcbGateToken177;
 pcbLoadAccess177(true).then(access=>{if(token!==pcbGateToken177||!root.isConnected||location.hash!=='#pcb')return;if(!access.allowed){pcbNotice177(root);return}if(!pcbCanUI171('view')){pcbNotice177(root,'沒有PCB管理查看權限');return}root.remove();pcbRenderPaneBefore177()}).catch(error=>{if(root.isConnected)pcbNotice177(root,error.message)});
};
const pcbRenderPageBefore177=render;
render=function(){
 const user=pcbAccessSession177();pcbRenderPageBefore177();
 if(location.hash==='#pcb'&&!pcbCanUI171('view'))pcbRender171();
 if(user&&!pcbAccess177.loaded)pcbLoadAccess177().then(access=>{if(!access.enabled&&!pcbCanUI171('view')&&document.querySelector('[data-management-page="pcb"]'))render()}).catch(()=>{});
};
async function pcbAdminControl177(){
 if(!canDo('admin.settings'))return;const host=document.querySelector('[data-section-key="website-settings"]');if(!host||host.querySelector('[data-pcb-gate177]'))return;
 try{
  const access=await pcbLoadAccess177();if(!access.canConfigure||!host.isConnected||host.querySelector('[data-pcb-gate177]'))return;
  const card=document.createElement('div');card.className='pcb-admin-access177';card.dataset.pcbGate177='';card.innerHTML='<h3>PCB施工管制</h3><p>開啟時僅你的帳號可使用，其他人點擊會顯示「施工中」。關閉後恢復原有權限規則。</p><label><input type="checkbox" role="switch" '+(access.enabled?'checked':'')+'> 啟用施工管制</label><small>變更會自動儲存</small>';host.append(card);
  const input=card.querySelector('input'),settingsUser=String(currentUser.id);let saved=access;
  input.onchange=async()=>{const enabled=input.checked;input.disabled=true;try{const r=await apiFetch('/api/pcb-access177',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled,revision:saved.revision})}),d=await r.json();if(!r.ok)throw Error(d.error||'設定未儲存');if(String(currentUser?.id||'')!==settingsUser)return;saved=d;pcbAccess177={...d,loaded:true};pcbAccessTime177=Date.now();input.checked=d.enabled;toast(d.enabled?'PCB施工管制已開啟':'PCB施工管制已關閉')}catch(error){input.checked=saved.enabled;toast(error.message);pcbAccessTime177=0}finally{input.disabled=false}};
 }catch(error){toast(error.message)}
}
if(typeof renderAdmin==='function'){
 const pcbAdminBefore177=renderAdmin;
 renderAdmin=function(){pcbAccessSession177();pcbAdminBefore177();pcbAdminControl177()};
}
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&location.hash==='#pcb')pcbLoadAccess177(true).then(access=>{if(!access.allowed)pcbDeny177()}).catch(()=>{})});
