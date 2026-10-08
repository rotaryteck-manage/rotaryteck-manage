'use strict';
const accountMobile113=matchMedia('(max-width:700px)');
function accountIdentity113(){
 const badge=document.querySelector('#current-role');if(!badge)return;
 const name=String(currentUser?.name||'使用者'),role=String(currentUser?.roleLabel||roleNames?.[currentUser?.role]||'未授權');
 if(!accountMobile113.matches){
  if(badge.querySelector('.account-name113'))badge.textContent=name+' · '+role+' ▾';
  return;
 }
 let nameNode=badge.querySelector('.account-name113'),roleNode=badge.querySelector('.account-role113');
 if(!nameNode||!roleNode){
  badge.textContent='';
  nameNode=document.createElement('span');nameNode.className='account-name113';
  roleNode=document.createElement('small');roleNode.className='account-role113';
  const arrow=document.createElement('span');arrow.className='account-arrow113';arrow.setAttribute('aria-hidden','true');arrow.textContent='▾';
  badge.append(nameNode,roleNode,arrow);
 }
 if(nameNode.textContent!==name)nameNode.textContent=name;
 if(roleNode.textContent!==role)roleNode.textContent=role;
 badge.setAttribute('aria-label',name+'，'+role+'，開啟帳號選單');
}
const accountObserver113=new MutationObserver(()=>queueMicrotask(accountIdentity113));
accountObserver113.observe(document.body,{childList:true,subtree:true});
accountMobile113.addEventListener?.('change',accountIdentity113);
addEventListener('load',accountIdentity113);accountIdentity113();
document.documentElement.dataset.appVersion='11.3v';
