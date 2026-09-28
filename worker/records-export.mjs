// The route is authenticated in server.mjs. This endpoint returns only the selected records.
export async function recordsExportApi(request,env,employee,readState,ownerKey){
 const fail=(message,status=400)=>Response.json({error:message},{status});
 if(request.method!=='GET')return fail('不支援的操作',405);
 if(!employee.permissions?.includes('records.export'))return fail('沒有匯出權限',403);
 const q=new URL(request.url).searchParams,from=q.get('from'),to=q.get('to'),types=(q.get('types')||'').split(','),photos=q.get('photos')==='1';
 const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
 if(!date(from)||!date(to)||to<from||Date.parse(to)-Date.parse(from)>366*86400000||!types.length||types.some(x=>!['weekly','daily','receipt','shipment'].includes(x))||new Set(types).size!==types.length)return fail('請選擇資料類型與一年內的日期範圍');
 try{
  const result={weekly:[],daily:[],receipt:[],shipment:[],photos:[]},selected=new Set(types),inRange=day=>day>=from&&day<=to;
  if(selected.has('weekly')){const rows=await env.DB.prepare("SELECT id,day,end_day,title,assignee,category,note,color,author_name,created_at FROM schedule_entries WHERE kind='weekly' AND day<=? AND end_day>=? ORDER BY day,id").bind(to,from).all();const notes=await env.DB.prepare('SELECT week_start,body,author_name,updated_at FROM schedule_weekly_notes WHERE week_start BETWEEN ? AND ?').bind(from,to).all();result.weekly=[...rows.results,...notes.results.map(n=>({day:n.week_start,end_day:n.week_start,title:'每週備註',note:n.body,author_name:n.author_name,created_at:n.updated_at}))].sort((a,b)=>a.day.localeCompare(b.day));}
  if(selected.has('daily')){
   const entries=await env.DB.prepare("SELECT id,day,title,assignee,category,note,author_name,created_at FROM schedule_entries WHERE kind='daily' AND day BETWEEN ? AND ? ORDER BY day,id").bind(from,to).all();
   const reports=await env.DB.prepare('SELECT id,day,body,photo_key,photo_name,author_name,created_at FROM schedule_reports WHERE day BETWEEN ? AND ? ORDER BY day,created_at,id').bind(from,to).all();
   result.daily=[...entries.results.map(e=>({...e,record_kind:'每日排程'})),...reports.results.map(e=>({...e,record_kind:'工作回報'}))].sort((a,b)=>a.day.localeCompare(b.day));
   if(photos)for(const row of reports.results)if(row.photo_key)result.photos.push({type:'每日工作紀錄',day:row.day,actor:row.author_name,name:row.photo_name,url:'/api/schedule-photo?id='+encodeURIComponent(row.id)+'&export=1'});
  }
  if(selected.has('receipt')||selected.has('shipment')){
   const state=await readState(env);
   if(selected.has('receipt'))for(const p of [...state.projects||[],...(state.deletedProjects||[]).map(x=>x.project)])for(const log of p.materialLogs||[])if(inRange(String(log.time||'').slice(0,10)))for(const item of log.received||[])result.receipt.push({day:log.time.slice(0,10),project:p.name,project_id:p.id,item:item.name,quantity:item.qty,actor:log.actor,created_at:log.time});
   if(selected.has('shipment'))for(const p of state.platingProjects||[])for(const shipment of p.shipments||[])if(inRange(shipment.sent))result.shipment.push({day:shipment.sent,project:p.name,project_id:p.id,shipment_id:shipment.id,number:shipment.number,vendor:shipment.vendor,returned:shipment.returned,note:shipment.note,welder:shipment.welderName,groups:shipment.groups});
   const added=await env.DB.prepare("SELECT id,day,title,category,quantity,note,author_name,created_at,receipt_photo_key,receipt_photo_name,item_photo_key,item_photo_name FROM schedule_entries WHERE kind='material' AND day BETWEEN ? AND ? ORDER BY day,id").bind(from,to).all();
   for(const row of added.results){const record={day:row.day,item:row.title,quantity:row.quantity,actor:row.author_name,note:row.note,created_at:row.created_at,source:'每日排程'};const selectedKind=row.category==='收料'?selected.has('receipt'):selected.has('shipment');if(row.category==='收料'&&selected.has('receipt'))result.receipt.push(record);if(['出貨','送貨'].includes(row.category)&&selected.has('shipment'))result.shipment.push({...record,direction:row.category});if(photos&&selectedKind)for(const [type,label]of [['receipt','收據照片'],['item','料件照片']])if(row[type+'_photo_key'])result.photos.push({type:row.category+'紀錄 · '+label,day:row.day,actor:row.author_name,name:row[type+'_photo_name'],url:'/api/schedule-material-photo?id='+encodeURIComponent(row.id)+'&type='+type+'&export=1'})}
   if(photos){
    if(!env.UPLOADS)throw Error('照片儲存空間尚未就緒');const root='images/'+await ownerKey('rotaryteck-manage')+'/';
    async function collect(prefix,make){let cursor;do{const page=await env.UPLOADS.list({prefix,limit:1000,cursor,include:['customMetadata']});for(const file of page.objects){if(result.photos.length>=5000)throw Error('照片超過 5000 張，請縮短日期範圍');const item=make(file);if(item)result.photos.push(item)}cursor=page.truncated?page.cursor:undefined}while(cursor)}
    if(selected.has('receipt'))for(const p of [...state.projects||[],...(state.deletedProjects||[]).map(x=>x.project)]){const prefix=root+'receipts/'+encodeURIComponent(p.id)+'/';await collect(prefix,file=>{const day=new Date(file.uploaded).toISOString().slice(0,10);if(!inRange(day))return null;return{type:'收料紀錄',day,actor:file.customMetadata?.actor||'',name:file.customMetadata?.name||'',project:p.name,url:'/api/receipts?export=1&project='+encodeURIComponent(p.id)+'&id='+encodeURIComponent(file.key.slice(prefix.length))}})}
    if(selected.has('shipment'))for(const row of result.shipment){if(!row.project_id)continue;const prefix=root+'plating/'+encodeURIComponent(row.project_id)+'/'+encodeURIComponent(row.shipment_id)+'/';await collect(prefix,file=>({type:'寄出紀錄',day:row.day,actor:file.customMetadata?.actor||'',name:file.customMetadata?.name||'',project:row.project,url:'/api/plating-photos?export=1&project='+encodeURIComponent(row.project_id)+'&shipment='+encodeURIComponent(row.shipment_id)+'&id='+encodeURIComponent(file.key.slice(prefix.length))}))}
   }
  }
  return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return fail(e.message||'匯出資料讀取失敗',500)}
}
