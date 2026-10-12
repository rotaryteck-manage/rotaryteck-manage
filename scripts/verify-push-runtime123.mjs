// Optional local workerd smoke test; no real push service or company data.
// node scripts/verify-push-runtime123.mjs /absolute/path/to/miniflare/dist/src/index.js
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
const {Miniflare}=await import(pathToFileURL(process.argv[2]).href);
const ec=createECDH('prime256v1');ec.generateKeys();
const subscription={endpoint:'https://fcm.googleapis.com/success',keys:{p256dh:ec.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}},vapid={...webpush.generateVAPIDKeys(),subject:'mailto:test@local.test'};
const code=fs.readFileSync(new URL('../worker/push116.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
const mf=new Miniflare({workers:[
 {name:'main',modules:true,compatibilityDate:'2026-08-06',serviceBindings:{PROVIDER:'provider'},bindings:{SUB:JSON.stringify(subscription),VAPID:JSON.stringify(vapid)},script:code+`\nexport default {async fetch(request,env){try{const sub=JSON.parse(env.SUB);sub.endpoint='https://fcm.googleapis.com'+new URL(request.url).pathname;const result=await sendNativePush116(sub,'local runtime smoke',{vapidDetails:JSON.parse(env.VAPID)},(url,options)=>env.PROVIDER.fetch(url,options));return Response.json(result)}catch(error){return Response.json({error:error.message,statusCode:error.statusCode},{status:500})}}}`},
 {name:'provider',modules:true,compatibilityDate:'2026-08-06',script:`export default {fetch(request){if(request.redirect!=='manual')return new Response('wrong redirect mode',{status:400});return new URL(request.url).pathname==='/redirect'?new Response(null,{status:302,headers:{Location:'https://different.test/'}}):new Response(null,{status:201})}}`}
]});
try{const ok=await mf.dispatchFetch('http://local.test/success');assert.equal(ok.status,200);assert.equal((await ok.json()).statusCode,201);const redirect=await mf.dispatchFetch('http://local.test/redirect');assert.equal(redirect.status,500);assert.equal((await redirect.json()).statusCode,302);console.log('workerd runtime: manual push accepted; redirect rejected; no external push sent')}finally{await mf.dispose()}
