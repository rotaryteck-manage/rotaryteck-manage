'use strict';
function adminSectionKey(card){if(card.id)return card.id;for(const [selector,key]of [['#export-warehouse-admin','warehouse'],['#add-field','fields'],['#add-page','pages'],['#plating-text','plating']])if(card.querySelector(selector))return key;return null;}
function orderedAdminKeys(keys,saved){return [...new Set([...(Array.isArray(saved)?saved:[]).filter(k=>keys.includes(k)),...keys])];}
const renderAdminBeforeLayout=renderAdmin;
renderAdmin=function(){
 renderAdminBeforeLayout();if(currentUser.role!=='supervisor')return;
 const main=$('main'),cards=[...main.querySelectorAll(':scope > .admin-card')],map=new Map(cards.map(c=>[adminSectionKey(c),c]).filter(([k])=>k));
 const keys=orderedAdminKeys([...map.keys()],state.adminSectionOrder),grid=document.createElement('div');grid.className='admin-section-grid';cards[0]?.before(grid);
 keys.forEach((key,index)=>{const card=map.get(key);card.dataset.sectionKey=key;grid.append(card);const controls=document.createElement('span');controls.className='admin-section-moves';
 for(const [label,delta,title]of [['↑',-2,'上移'],['↓',2,'下移'],['←',-1,'前移'],['→',1,'後移']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',card.querySelector('h2').textContent+' '+title);const columns=()=>getComputedStyle(grid).gridTemplateColumns.split(' ').length;const step=()=>Math.abs(delta)===2?Math.sign(delta)*columns():delta;const target=index+step();b.disabled=target<0||target>=keys.length;b.onclick=async e=>{e.preventDefault();e.stopPropagation();if(cloudBusy||failedCandidate)return;const to=index+step();if(to<0||to>=keys.length)return;const next=[...keys];[next[index],next[to]]=[next[to],next[index]];state.adminSectionOrder=next;addAudit('調整後台區塊順序',card.querySelector('h2').textContent,'管理後台');await saveCloud(state);renderAdmin();};controls.append(b);}
 card.querySelector('summary').append(controls);});
 const actions=$('#export-all')?.parentElement;if(actions){const b=document.createElement('button');b.id='export-every-photo';b.textContent=adminText('exportEveryPhotoButton');b.onclick=()=>exportEveryPhoto(b);actions.append(b);}
};
async function collectPhotoPages(url){const items=[],seen=new Set();let cursor='';do{const r=await apiFetch(url+(cursor?'&cursor='+encodeURIComponent(cursor):'')),data=await r.json();if(!r.ok)throw Error(data.error||'照片清單讀取失敗');if(!Array.isArray(data.items))throw Error('照片清單格式不正確');items.push(...data.items);if(!data.truncated)break;if(!data.cursor||seen.has(data.cursor))throw Error('照片清單不完整，請重試');cursor=data.cursor;seen.add(cursor);}while(true);return items.sort((a,b)=>String(a.created).localeCompare(String(b.created))||String(a.id).localeCompare(String(b.id)));}
let everyPhotoBusy=false;
async function exportEveryPhoto(button){
 if(currentUser.role!=='supervisor'||everyPhotoBusy)return;
 everyPhotoBusy=true;button.disabled=true;const original=button.textContent,snapshot=structuredClone(state),entries=[],rows=[['管理區','案名','送鍍次數','類別','人員','上傳時間','原始檔名','ZIP位置']];let bytes=0;
 async function append(url,path,item,meta){const r=await apiFetch(url);if(!r.ok)throw Error('照片下載失敗：'+meta[1]);const type=r.headers.get('content-type')||'';if(!type.startsWith('image/'))throw Error('照片格式不正確');const data=new Uint8Array(await r.arrayBuffer());bytes+=data.length;if(bytes>250*1024*1024||entries.length>=60000)throw Error('照片量較大，請改用各管理區的分案匯出');const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg',name=path+'.'+ext;entries.push({name,data,date:item.created});rows.push([...meta,item.actor||'未記錄人員',receiptTime(item.created),item.name||'',name]);button.textContent='正在整理 '+entries.length+' 張照片…';}
 try{
 const warehouse=[...(snapshot.projects||[]).map(p=>({p,deleted:false})),...(snapshot.deletedProjects||[]).map(x=>({p:x.project,deleted:true}))];
 for(const [i,{p,deleted}]of warehouse.entries()){const url='/api/receipts?project='+encodeURIComponent(p.id)+'&export=1',items=await collectPhotoPages(url),folder='庫房管理/'+(deleted?'已刪除案件/':'')+String(i+1).padStart(3,'0')+'_'+safeFileName(p.name);
 for(const [j,item]of items.entries())await append(url+'&id='+encodeURIComponent(item.id),folder+'/收據_'+String(j+1).padStart(3,'0')+'_'+photoStamp(item.created),item,['庫房管理',p.name,'','收據']);}
 for(const [i,p]of (snapshot.platingProjects||[]).entries())for(const s of p.shipments||[]){const url=platingPhotoUrl(p,s)+'&export=1',items=await collectPhotoPages(url),folder='電鍍管理/'+String(i+1).padStart(3,'0')+'_'+safeFileName(p.name)+'/第'+s.number+'次送鍍';for(const [j,item]of items.entries()){const kind=platingPhotoKind(item)==='area'?'表面積':'出貨單';await append(url+'&id='+encodeURIComponent(item.id),folder+'/'+kind+'/'+String(j+1).padStart(3,'0')+'_'+photoStamp(item.created),item,['電鍍管理',p.name,s.number,kind]);}}
 const logoResponse=await apiFetch('/api/logo?meta=1');if(!logoResponse.ok)throw Error('LOGO 讀取失敗');const logo=await logoResponse.json();if(logo.exists)await append('/api/logo','網站設定/LOGO',{created:new Date().toISOString(),name:'LOGO'},['網站設定','','','LOGO']);
 if(!entries.length)throw Error('目前沒有可匯出的照片');entries.push({name:'照片總表.csv',data:platingCsv(rows)});entries.push({name:'備份說明.txt',data:new TextEncoder().encode('照片依管理區、案件、送鍍次數與種類分類。照片總表列出原始檔名、上傳人員及時間。庫房包含仍保留照片的已刪除案件。LOGO 日期為匯出時間。此 ZIP 為照片備份，文字資料請另外匯出全部資料。\n匯出時間：'+new Date().toISOString())});downloadBlob(makeZip(entries),'全部照片_'+photoStamp(new Date())+'.zip');toast('全部照片已匯出，共 '+(rows.length-1)+' 張');
 }catch(e){toast(e.message||'匯出失敗，請重試');}finally{everyPhotoBusy=false;button.disabled=false;button.textContent=original;}
}
