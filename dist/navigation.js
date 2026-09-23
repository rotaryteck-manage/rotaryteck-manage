'use strict';
function managementPages(){
 const pages=[{id:'cases',title:siteText('casesTitle')},{id:'warehouse',title:siteText('heading')}];
 for(const page of config().pages||[])pages.push({id:'page/'+page.id,title:page.title,page});
 if(currentUser.role==='supervisor')pages.push({id:'audit',title:siteText('auditTitle')});
 return pages;
}
function activeManagementPage(){
 let hash;try{hash=decodeURIComponent(location.hash.slice(1));}catch{hash='';}
 return managementPages().find(page=>page.id===hash)||managementPages()[0];
}
function navigateManagement(id){
 captureDraft();
 const hash='#'+encodeURI(id);
 if(location.hash===hash){render();return;}
 location.hash=hash;
}
function managementNavigation(active){
 const nav=document.createElement('nav');nav.className='management-nav';nav.setAttribute('aria-label','管理區域');
 for(const page of managementPages()){
  const button=document.createElement('button');button.type='button';button.textContent=page.title;
  button.dataset.managementPage=page.id;button.className=page.id===active?'selected':'';
  if(page.id===active)button.setAttribute('aria-current','page');
  button.onclick=()=>navigateManagement(page.id);nav.append(button);
 }
 return nav;
}
const renderBeforeNavigation=render;
render=function(){
 const active=activeManagementPage();caseSectionExpanded=true;warehouseExpanded=true;
 renderBeforeNavigation();
 const main=$('main'),banner=$('.demo');if(!main||!banner)return;
 document.querySelectorAll('main > .site-nav').forEach(el=>el.remove());
 banner.replaceChildren(managementNavigation(active.id));
 const badge=document.createElement('span');badge.className='management-brand';badge.textContent=siteText('bannerBadge');banner.append(badge);
 for(const [selector,id]of [['.case-workspace','cases'],['.warehouse-fold','warehouse'],['.audit-fold','audit']]){
  const panel=$(selector);if(panel&&active.id!==id)panel.remove();
 }
 if(active.page){
  const section=document.createElement('section');section.className='workspace management-content';
  const title=document.createElement('h1');title.textContent=active.title;section.append(title);
  for(const block of active.page.blocks||[]){
   const row=document.createElement('div');row.className='content-block';
   if(block.type==='text')row.textContent=block.text||'';
   else{
    const button=document.createElement('button');button.type='button';button.textContent=block.label||'';
    button.onclick=()=>{
     if(block.action==='page')navigateManagement('page/'+block.target);
     else if(block.action==='link'&&/^https?:\/\//i.test(block.target))window.open(block.target,'_blank','noopener,noreferrer');
     else{captureDraft();history.pushState(null,'','#warehouse');render();if(block.action==='new-project'&&isAdmin())newProject();}
    };row.append(button);
   }section.append(row);
  }main.append(section);
 }
 document.title=active.title+'｜'+siteText('brand');
};
const renderContentBeforeNavigation=renderContent;
renderContent=function(id,preview=false){
 if(preview)return renderContentBeforeNavigation(id,true);
 const page=config().pages.find(p=>p.id===id)||config().pages[0];
 captureDraft();history.replaceState(null,'',page?'#'+encodeURI('page/'+page.id):'#cases');render();
};
routeAdmin=function(){
 if(!cloudReady)return;
 captureDraft();
 if(location.hash==='#admin')renderAdmin();else render();
};
