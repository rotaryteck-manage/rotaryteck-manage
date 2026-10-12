// RFC 8291/8292 Web Push, using asynchronous platform cryptography.
// Used by scheduled notifications only; manual/test delivery stays unchanged.
const pushEncoder116=new TextEncoder();
const pushVapidCache116=new Map();
function pushJoin116(...parts){const result=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length}return result}
function pushDecode116(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('推播金鑰格式不正確');const binary=atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4));return Uint8Array.from(binary,c=>c.charCodeAt(0))}
function pushEncode116(value){return btoa(String.fromCharCode(...value)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
async function pushHmac116(key,value){const imported=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',imported,value))}
async function pushExpand116(key,label){return pushHmac116(key,pushJoin116(pushEncoder116.encode(label),new Uint8Array([1])))}

export async function encryptPush116(subscription,payload){
 const recipient=pushDecode116(subscription.keys.p256dh),auth=pushDecode116(subscription.keys.auth),plain=pushEncoder116.encode(payload);
 if(recipient.length!==65||recipient[0]!==4||auth.length!==16)throw Error('推播裝置金鑰不完整');
 if(plain.length>3993)throw Error('推播內容超過單筆加密長度限制');
 const sender=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']),senderPublic=new Uint8Array(await crypto.subtle.exportKey('raw',sender.publicKey));
 const recipientKey=await crypto.subtle.importKey('raw',recipient,{name:'ECDH',namedCurve:'P-256'},false,[]),shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:recipientKey},sender.privateKey,256));
 const prkKey=await pushHmac116(auth,shared),ikm=await pushHmac116(prkKey,pushJoin116(pushEncoder116.encode('WebPush: info\0'),recipient,senderPublic,new Uint8Array([1])));
 const salt=crypto.getRandomValues(new Uint8Array(16)),prk=await pushHmac116(salt,ikm),cek=(await pushExpand116(prk,'Content-Encoding: aes128gcm\0')).slice(0,16),nonce=(await pushExpand116(prk,'Content-Encoding: nonce\0')).slice(0,12);
 const aes=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,tagLength:128},aes,pushJoin116(plain,new Uint8Array([2]))));
 const recordSize=new Uint8Array(4);new DataView(recordSize.buffer).setUint32(0,4096);
 return pushJoin116(salt,recordSize,new Uint8Array([senderPublic.length]),senderPublic,cipher);
}

export async function pushAuthorization116(endpoint,details,clock=Date.now()){
 const publicKey=pushDecode116(details.publicKey),privateKey=pushDecode116(details.privateKey),subject=details.subject;
 if(publicKey.length!==65||publicKey[0]!==4||privateKey.length!==32||!/^mailto:[^\s]+@[^\s]+$|^https:\/\/[^\s]+$/.test(subject))throw Error('VAPID 金鑰或聯絡資訊不完整');
 const origin=new URL(endpoint).origin,cacheKey=origin+'|'+details.publicKey+'|'+details.privateKey+'|'+subject,cached=pushVapidCache116.get(cacheKey);
 if(cached&&cached.expires>clock+60000)return cached.header;
 const key=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:pushEncode116(publicKey.slice(1,33)),y:pushEncode116(publicKey.slice(33)),d:details.privateKey},{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const expires=clock+12*60*60*1000,headerPart=pushEncode116(pushEncoder116.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),claimsPart=pushEncode116(pushEncoder116.encode(JSON.stringify({aud:origin,exp:Math.floor(expires/1000),sub:subject}))),unsigned=headerPart+'.'+claimsPart;
 const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,pushEncoder116.encode(unsigned))),header='vapid t='+unsigned+'.'+pushEncode116(signature)+', k='+details.publicKey;
 if(pushVapidCache116.size>=16)pushVapidCache116.delete(pushVapidCache116.keys().next().value);
 pushVapidCache116.set(cacheKey,{expires,header});return header;
}

export async function sendNativePush116(subscription,payload,options,fetcher=fetch){
 const endpoint=new URL(subscription.endpoint);
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw Error('推播網址不正確');
 const [body,authorization]=await Promise.all([encryptPush116(subscription,payload),pushAuthorization116(endpoint.href,options.vapidDetails)]);
 const response=await fetcher(endpoint.href,{method:'POST',redirect:'error',signal:AbortSignal.timeout(options.timeout||15000),headers:{Authorization:authorization,'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',TTL:String(options.TTL||3600),Urgency:'normal'},body});
 if(!response.ok){const error=Error('推播服務回應 HTTP '+response.status);error.statusCode=response.status;error.body=(await response.text()).slice(0,1000);throw error}
 await response.body?.cancel();return{statusCode:response.status};
}
