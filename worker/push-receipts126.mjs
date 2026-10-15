const receiptEncoder126=new TextEncoder();
async function receiptKey126(env){if(!env.VAPID_PRIVATE_KEY)throw Error('通知金鑰未設定');return crypto.subtle.importKey('raw',receiptEncoder126.encode('push-receipt126:'+env.VAPID_PRIVATE_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function pushReceiptToken126(env,key){const at=Date.now(),signature=await crypto.subtle.sign('HMAC',await receiptKey126(env),receiptEncoder126.encode(JSON.stringify([key,at])));return{key,at,proof:Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('')}}
export async function subscriptionFingerprint126(device){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',receiptEncoder126.encode(device.p256dh+'|'+device.auth))),b=>b.toString(16).padStart(2,'0')).join('')}
export async function pushReceiptApi126(request,env){
 if(request.method!=='POST')return Response.json({error:'不支援的操作'},{status:405});
 try{
  if(Number(request.headers.get('content-length')||0)>4096)return Response.json({error:'資料過大'},{status:413});
  const reader=request.body?.getReader(),decoder=new TextDecoder();let raw='',size=0;
  if(reader)for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return Response.json({error:'資料過大'},{status:413})}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode();const input=JSON.parse(raw),token=input.receipt;
  if(!token||typeof token.key!=='string'||token.key.length>600||!Number.isSafeInteger(token.at)||Date.now()-token.at>7*86400000||token.at>Date.now()+60000||!/^[a-f0-9]{64}$/.test(token.proof||'')||!['received','shown','error'].includes(input.stage))return Response.json({error:'回報驗證失敗'},{status:403});
  const signature=Uint8Array.from(token.proof.match(/../g),v=>parseInt(v,16));if(!await crypto.subtle.verify('HMAC',await receiptKey126(env),signature,receiptEncoder126.encode(JSON.stringify([token.key,token.at]))))return Response.json({error:'回報驗證失敗'},{status:403});
  const now=new Date().toISOString(),statement=input.stage==='shown'?env.DB.prepare("UPDATE notification_deliveries SET device_received_at126=COALESCE(NULLIF(device_received_at126,''),?),device_shown_at126=COALESCE(NULLIF(device_shown_at126,''),?),device_error126='' WHERE dedupe_key=?").bind(now,now,token.key):input.stage==='error'?env.DB.prepare("UPDATE notification_deliveries SET device_received_at126=COALESCE(NULLIF(device_received_at126,''),?),device_error126=? WHERE dedupe_key=? AND device_shown_at126=''").bind(now,String(input.error||'通知顯示失敗').slice(0,500),token.key):env.DB.prepare("UPDATE notification_deliveries SET device_received_at126=COALESCE(NULLIF(device_received_at126,''),?) WHERE dedupe_key=?").bind(now,token.key);
  await statement.run();return Response.json({saved:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'回報未完成'},{status:400})}
}
