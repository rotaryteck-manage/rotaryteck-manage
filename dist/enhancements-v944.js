'use strict';
function accountStatus944(){
 const badge=document.querySelector('#current-role'),host=badge?.closest('.header-actions');
 if(!host)return;
 let tools=host.querySelector('.account-status944');
 if(!tools){tools=document.createElement('span');tools.className='account-status944';tools.innerHTML='<small>10.5v</small><button type="button" class="refresh944" title="重新整理" aria-label="重新整理">↻</button>';(badge.closest('.account-menu901')||badge).after(tools);tools.querySelector('button').onclick=async()=>{if(cloudBusy)return;if(await confirmAction('重新整理會放棄尚未儲存的輸入，確定？'))location.reload();};}
 const button=tools.querySelector('button');if(button.disabled!==cloudBusy)button.disabled=cloudBusy;
 const bar=document.querySelector('#cloud-status');if(bar)bar.classList.toggle('cloud-quiet944',cloudReady&&!cloudBusy&&!failedCandidate);
}
new MutationObserver(accountStatus944).observe(document.body,{childList:true,subtree:true});
addEventListener('load',accountStatus944);accountStatus944();
