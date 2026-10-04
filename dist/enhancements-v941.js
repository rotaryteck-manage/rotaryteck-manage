'use strict';

// v94.1: this file is intentionally loaded last.  Older workflow-ui code used
// to replace the replenishment screen after wire.js had already installed the
// new one, which made the v94 controls disappear in production.
openWireRestock=function(history=false){
 history=history===true;
 const manager=canDo('wire.restock'),entries=[];
 for(const r of wireReels().filter(r=>wireType(r.wireId))){
  if(history){for(const c of r.restockHistory||[])entries.push({r,c});if(r.restock&&!restockActive(r,Date.now()+serverClockOffset44))entries.push({r,c:r.restock});}
  else if(restockActive(r,Date.now()+serverClockOffset44))entries.push({r,c:r.restock||{}});
 }
 const reported=entry=>entry.c?.reported?.time||'';
 if(!history)entries.sort((a,b)=>reported(b).localeCompare(reported(a))||String(b.c?.id||'').localeCompare(String(a.c?.id||'')));
 function cell(r,c,key){
  const v=c[key],action=key==='ordered'?'order':'receive';
  if(v)return '<span>'+esc(time44(v.time)+'｜'+v.actor)+'</span>'+(!history&&manager?'<button type="button" class="mini-action" data-restock="'+r.id+'" data-action="'+(key==='ordered'?'undoOrder':'undoReceive')+'" '+(key==='ordered'&&c.received?'disabled title="請先撤銷已入庫"':'')+'>撤銷</button>':'')+(key==='received'&&!history?'<small class="retention-hint">＊'+esc(time44(Date.parse(v.time)+7*86400000))+' 自動移至補貨歷史</small>':'');
  return !history&&manager?'<label><input type="checkbox" data-restock="'+r.id+'" data-action="'+action+'" '+(key==='ordered'&&c.received?'disabled':'')+'> '+(key==='ordered'?'已訂購':'已入庫')+'</label>':'—';
 }
 wireModal(history?'補貨歷史':wt('restockList'),
  '<div class="wire-restock-head941"><strong>'+(history?'歷史紀錄 '+entries.length+' 筆':'待處理 '+entries.length+' 捆')+'</strong><div class="wire-tools">'+
  (!history&&manager&&entries.length?'<button type="button" class="danger-button" id="wire-restock-delete941">刪除補貨紀錄</button>':'')+
  (!history&&manager?'<button type="button" id="restock-bulk">批量操作</button>':'')+
  '<button type="button" id="restock-toggle">'+(history?'返回補貨名單':'補貨歷史')+'</button>'+
  (canDo('admin.export')?'<button type="button" id="restock-export">匯出補貨歷史</button>':'')+'</div></div>'+
  '<div id="restock-view44" data-history="'+history+'"></div><div class="ledger-scroll"><table class="ledger-table restock-table"><thead><tr>'+(!history&&manager?'<th class="wire-restock-select94"></th>':'')+'<th>線材／顏色</th><th>狀態</th><th>已訂購</th><th>已入庫</th>'+(history?'<th>操作歷史</th>':'')+'</tr></thead><tbody>'+entries.map(({r,c})=>'<tr data-restock-row="'+esc(r.id)+'">'+(!history&&manager?'<td><input type="checkbox" data-restock-select941="'+esc(r.id)+'" aria-label="選擇 '+esc(wireType(r.wireId).name+' '+r.color)+'"></td>':'')+'<td>'+esc(wireType(r.wireId).name+'｜'+r.color)+'</td><td><span class="wire-status '+(history?'enough':r.status)+'">'+esc(history?(c.received?'已入庫':'已結束'):wt(r.status))+'</span></td><td>'+cell(r,c,'ordered')+'</td><td>'+cell(r,c,'received')+'</td>'+(history?'<td><details><summary>查看</summary>'+(c.events||[]).map(e=>'<p>'+esc(({low:'標記需補貨',order:'已訂購',receive:'已入庫',undoOrder:'撤銷訂購',undoReceive:'撤銷入庫',deleteRestock:'刪除補貨紀錄'})[e.action]||e.action)+'｜'+time44(e.time)+'｜'+e.actor+'</p>').join('')+'</details></td>':'')+'</tr>').join('')+'</tbody></table></div>'+(!entries.length?'<p>目前沒有符合的紀錄</p>':''));
 $('#restock-bulk')?.addEventListener('click',()=>openRestockBulk46());
 $('#restock-toggle').onclick=()=>openWireRestock(!history);
 document.querySelectorAll('[data-restock]').forEach(b=>b.onclick=()=>{if(b.type==='checkbox')b.checked=false;restockAction(b.dataset.restock,b.dataset.action,()=>openWireRestock(history));});
 $('#restock-export')?.addEventListener('click',exportRestock44);
 $('#wire-restock-delete941')?.addEventListener('click',async()=>{
  const ids=[...document.querySelectorAll('[data-restock-select941]:checked')].map(x=>x.dataset.restockSelect941);
  if(!ids.length)return toast('請先勾選要刪除的補貨紀錄');
  if(!await confirmAction('確定刪除已選的 '+ids.length+' 筆補貨紀錄？\n線材、照片及裁線紀錄都會保留。'))return;
  const next=structuredClone(state),details=[];
  for(const id of ids){const old=next.wireReels.find(x=>x.id===id);if(!old)continue;details.push((wireType(old.wireId)?.name||'')+'｜'+old.color);Object.assign(old,restockTransition(old,'deleteRestock',currentUser,actionTime44()));}
  try{await wireCommit(next,'刪除補貨紀錄',ids.length===1?details[0]:details.length+' 筆');openWireRestock(false);toast('已刪除 '+details.length+' 筆補貨紀錄');}catch(error){toast(error.message||'刪除失敗');openWireRestock(false);}
 });
};

let notificationRouteToken941='';
function notificationRoute941(){
 if(typeof cloudReady!=='undefined'&&!cloudReady)return false;
 const q=new URLSearchParams(location.search),hash=location.hash;
 if(![q.get('notificationWire'),q.get('notificationPlatingProject'),q.get('notificationPlatingOverview')].some(Boolean))return true;
 const token=location.pathname+location.search+hash;if(token===notificationRouteToken941)return true;
 if(q.get('notificationWire')&&hash==='#wire'){
  notificationRouteToken941=token;const id=q.get('notificationWire');openWireRestock(false);
  setTimeout(()=>{const row=document.querySelector('[data-restock-row="'+CSS.escape(id)+'"]');if(row){row.classList.add('notification-focus93');row.scrollIntoView({block:'center'});}else toast('這筆線材已處理或已刪除，已開啟補貨名單。');},80);
  history.replaceState(null,'',location.pathname+'#wire');return true;
 }
 if(q.get('notificationPlatingProject')&&hash==='#plating'){
  notificationRouteToken941=token;const project=q.get('notificationPlatingProject'),shipment=q.get('notificationPlatingShipment'),p=platingFind(project),s=p?.shipments?.find(x=>x.id===shipment);
  if(s)editPlatingShipment(project,shipment);else{ledgerFilter='all';openPlatingLedger();toast('這筆電鍍紀錄已處理或已刪除，已開啟電鍍總覽。');}
  history.replaceState(null,'',location.pathname+'#plating');return true;
 }
 if(q.get('notificationPlatingOverview')&&hash==='#plating'){
  notificationRouteToken941=token;ledgerFilter=q.get('notificationPlatingOverview')==='pending'?'sending':'all';openPlatingLedger();history.replaceState(null,'',location.pathname+'#plating');return true;
 }
 return false;
}
function scheduleNotificationRoute941(){let tries=0;const run=()=>{try{if(notificationRoute941()||++tries>=40)return;}catch(error){console.warn('通知跳轉等待中',error);}setTimeout(run,150);};run();}
for(const event of ['DOMContentLoaded','load','pageshow','hashchange','popstate'])addEventListener(event,scheduleNotificationRoute941);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleNotificationRoute941();});

document.documentElement.dataset.appVersion='94.1';
