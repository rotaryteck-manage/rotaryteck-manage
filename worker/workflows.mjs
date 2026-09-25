// Shared, deterministic rules used by the browser and the API.
export function taipeiDate(value=Date.now()){return new Date(value).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});}
export function preparedQuantity(p,i){const b=p.production?.baseline?.[i.id];return b?Math.max(0,b.stock+i.received-b.received):i.received;}
export function restockActive(r,now=Date.now()){return r.status==='low'||r.status==='ordered'||!!r.restock?.received&&now<Date.parse(r.restock.received.time)+7*86400000;}
export function restockTransition(reel,action,who,time=new Date().toISOString(),id){
 const r=structuredClone(reel),stamp={time,actor:who.name,actorId:String(who.id)};
 if(action==='low'){
  if(r.status==='low'||r.status==='ordered')return r;
  if(r.restock){r.restockHistory??=[];r.restockHistory.push({...r.restock,archivedAt:time});}
  r.restock={id,reported:stamp,events:[{action,...stamp}]};r.status='low';return r;
 }
 if(!['warehouse','supervisor'].includes(who.role))throw Error('只有倉管、主管可以登記或撤銷補貨');
 if(!r.restock){if(r.status!=='low')throw Error('請先標記需補貨');r.restock={id,events:[]};}
 const c=r.restock;
 if(action==='order'){if(r.status!=='low'||c.ordered||c.received)throw Error('此筆已登記，請重新整理');c.ordered=stamp;r.status='ordered';}
 else if(action==='receive'){if(!['low','ordered'].includes(r.status)||c.received)throw Error('此筆已入庫');c.received=stamp;r.status='enough';}
 else if(action==='undoReceive'){if(!c.received||!restockActive(r,Date.parse(time)))throw Error('此輪已進入歷史，不能撤銷');delete c.received;r.status=c.ordered?'ordered':'low';}
 else if(action==='undoOrder'){if(!c.ordered||c.received)throw Error('請先撤銷已入庫');delete c.ordered;r.status='low';}
 else throw Error('補貨操作不正確');
 c.events.push({action,...stamp});return r;
}
export function restockChangeAllowed(a,b,e,now=Date.now()){
 const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
 if(same(a.restock,b.restock)&&same(a.restockHistory,b.restockHistory))return !(a.status==='ordered'||b.status==='ordered')||a.status===b.status;
 const last=b.restock?.events?.at(-1);if(!last||last.actor!==e.name||last.actorId!==String(e.id)||!Number.isFinite(Date.parse(last.time))||Math.abs(Date.parse(last.time)-now)>300000)return false;
 if(last.action==='low'&&e.role!=='supervisor'&&!(e.permissions?.includes('wire.view')&&e.permissions?.includes('wire.cut')))return false;
 try{const expected=restockTransition(a,last.action,e,last.time,b.restock.id);return same(expected.restock,b.restock)&&same(expected.restockHistory,b.restockHistory)&&expected.status===b.status;}catch{return false;}
}
export function validDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;}
export function validateWorkflowState(s){
 if(s.appearance!==undefined){const a=s.appearance,areas=['global','cases','warehouse','plating','wire','audit','admin','login'];if(!a||typeof a!=='object'||Array.isArray(a))throw Error('外觀設定不正確');for(const [area,colors]of Object.entries(a.colors||{})){if(!areas.includes(area)||!colors||Object.values(colors).some(v=>typeof v!=='string'||!/^#[0-9a-fA-F]{6}$/.test(v)))throw Error('配色格式不正確');}for(const [area,labels]of Object.entries(a.text||{})){if(!areas.includes(area)||!labels||Object.entries(labels).some(([k,v])=>!k||k.length>500||typeof v!=='string'||!v.trim()||v.length>500))throw Error('文字設定不正確');}if(a.logoWidth!==undefined&&(!Number.isInteger(a.logoWidth)||a.logoWidth<32||a.logoWidth>240)||a.logoHeight!==undefined&&(!Number.isInteger(a.logoHeight)||a.logoHeight<24||a.logoHeight>100))throw Error('LOGO 尺寸超出範圍');}

 for(const c of s.cases||[])if(c.actualClosedDate&&!validDate(c.actualClosedDate))throw Error('實際結案日期不正確');
 for(const p of s.projects||[]){if(!p.production)continue;const c=p.production;if(!validDate(c.start)||!Number.isSafeInteger(c.sets)||c.sets<1||!c.baseline||!c.id)throw Error('本次製作資料不正確');for(const i of p.parts){if(i.sets!==c.sets)throw Error('零件套數必須與本次製作一致');const b=c.baseline[i.id];if(b&&(!Number.isSafeInteger(b.stock)||b.stock<0||!Number.isSafeInteger(b.received)||b.received<0))throw Error('備料基準不正確');}}
}
export function workflowChangeAllowed(before,after,e){
 for(const p of after.platingProjects||[])for(const s of p.shipments||[]){const old=before.platingProjects?.find(x=>x.id===p.id)?.shipments.find(x=>x.id===s.id);if(JSON.stringify(old)!==JSON.stringify(s)&&(!s.welderId?.trim()||!s.welderName?.trim()))return false;}
 for(const c of after.cases||[]){const old=before.cases?.find(x=>x.id===c.id);if(c.status==='結案'&&old?.status!=='結案'&&!validDate(c.actualClosedDate))return false;if(c.status!=='結案'&&c.actualClosedDate)return false;}
 return true;
}
