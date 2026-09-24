'use strict';
function managementOrderDialog(kind){
 const options={cases:{key:'cases',title:siteText('casesTitle'),can:canDo('cases.manage'),label:c=>c.name+' · '+caseBatchLabel(c)},plating:{key:'platingProjects',title:pt('title'),can:canDo('plating.manage'),label:p=>p.name},wire:{key:'wireTypes',title:wt('title'),can:canDo('wire.edit'),label:t=>t.name+wt('suffix')}};
 const option=options[kind];if(!option?.can||cloudBusy||failedCandidate)return;
 const items=(state[option.key]||[]).map(item=>({id:item.id,label:option.label(item)}));
 numberedOrderDialog(option.title+' · 調整排序',items,async ids=>{
  const next=structuredClone(state),map=new Map((next[option.key]||[]).map(item=>[item.id,item]));
  if(map.size!==ids.length||ids.some(id=>!map.has(id)))throw Error('清單已變更，請重新開啟排序');
  next[option.key]=ids.map(id=>map.get(id));state=next;
  ids.forEach((id,index)=>{const from=items.findIndex(item=>item.id===id);if(from!==index)addAudit('調整順序',option.label(map.get(id))+'：第 '+(from+1)+' 位 → 第 '+(index+1)+' 位',option.title,kind==='wire'?'wire:'+id:kind==='plating'?'plating:'+id:'');});
  await saveCloud(state);if(failedCandidate)throw Error('排序尚未儲存，請處理上方提示');
  if(location.hash==='#admin')renderAdmin();else render();
 });
}
function addManagementSortButton(host,kind){
 const allowed=canDo(kind==='wire'?'wire.edit':kind+'.manage');if(!host||!allowed||host.querySelector('[data-number-sort]'))return;
 const button=document.createElement('button');button.type='button';button.className='small';button.dataset.numberSort=kind;button.textContent=kind==='wire'?wt('sortSettings'):'調整排序';button.onclick=()=>managementOrderDialog(kind);host.append(button);
}
const renderBeforeNumberSorting=render;
render=function(){renderBeforeNumberSorting();addManagementSortButton(document.querySelector('.plating-workspace .plating-head'),'plating');addManagementSortButton(document.querySelector('.wire-workspace .wire-tools'),'wire');};
const adminBeforeNumberSorting=renderAdmin;
renderAdmin=function(){
 adminBeforeNumberSorting();if(currentUser.role!=='supervisor')return;
 document.querySelectorAll('[data-admin-case-up],[data-admin-case-down],[data-plating-admin-move]').forEach(el=>el.remove());
 addManagementSortButton(document.querySelector('#admin-cases .admin-actions'),'cases');
 addManagementSortButton(document.querySelector('[data-section-key="plating"] .plating-actions'),'plating');
 addManagementSortButton(document.querySelector('#wire-admin .wire-tools'),'wire');
 const sort=$('#admin-sort-toggle');if(sort){sort.textContent=adminText('sortButton');sort.setAttribute('aria-pressed','false');document.querySelector('.admin-sort-grid')?.remove();sort.onclick=()=>{
  const items=[...document.querySelectorAll('[data-admin-tab]')].map(b=>({id:b.dataset.adminTab,label:b.textContent}));
  numberedOrderDialog('管理區塊 · 調整排序',items,async ids=>{state.adminSectionOrder=ids;addAudit('調整後台區塊順序',ids.map(id=>items.find(x=>x.id===id).label).join(' → '),'管理後台');await saveCloud(state);if(failedCandidate)throw Error('排序尚未儲存');adminSorting=false;renderAdmin();});
 };}
};
