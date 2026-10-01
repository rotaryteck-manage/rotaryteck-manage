'use strict';
// Follow the visible area when the software keyboard opens; preserve pinch zoom.
function mobileFormViewport84(){
 const viewport=window.visualViewport;
 const root=document.documentElement;
 root.style.setProperty('--mobile-viewport-height84',(viewport?.height||window.innerHeight)+'px');
 root.style.setProperty('--mobile-viewport-top84',(viewport?.offsetTop||0)+'px');

 if(!matchMedia('(max-width:700px), (pointer:coarse)').matches)return;
 const dialog=document.querySelector('#modal[open]');
 const active=document.activeElement;
 const body=dialog?.querySelector('.modal-body');
 if(!body||!active||!body.contains(active))return;
 // Scroll only the form's content, leaving its close/cancel/save controls visible.
 requestAnimationFrame(()=>{
  if(!dialog.open||document.activeElement!==active)return;
  const field=active.getBoundingClientRect(),area=body.getBoundingClientRect();
  if(field.top<area.top+8)body.scrollTop=Math.max(0,body.scrollTop+field.top-area.top-8);
  else if(field.bottom>area.bottom-8)body.scrollTop+=Math.max(0,Math.min(field.bottom-area.bottom+8,field.top-area.top-8));
 });
}
window.addEventListener('resize',mobileFormViewport84);
window.visualViewport?.addEventListener('resize',mobileFormViewport84);
window.visualViewport?.addEventListener('scroll',mobileFormViewport84);
document.addEventListener('focusin',mobileFormViewport84);
mobileFormViewport84();
