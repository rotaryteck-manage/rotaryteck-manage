import fs from 'node:fs';
import {ECDH} from 'node:crypto';
// Fail the build before a truncated/invalid public key can be deployed again.
const vapidKey=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8')).vars?.VAPID_PUBLIC_KEY;
if(vapidKey){
 const bytes=Buffer.from(vapidKey,'base64url');
 if(!/^[A-Za-z0-9_-]{87}$/.test(vapidKey)||bytes.length!==65||bytes[0]!==4)
  throw Error('VAPID_PUBLIC_KEY 不完整，請設定完整的 87 字元公開金鑰');
 try{ECDH.convertKey(bytes,'prime256v1');}catch{throw Error('VAPID_PUBLIC_KEY 不是有效的 P-256 公開金鑰');}
}
const workflows=fs.readFileSync('worker/workflows.mjs','utf8').replace(/^export /gm,'');
fs.writeFileSync('dist/workflows.js',workflows);
const codec=fs.readFileSync('worker/state-codec.mjs','utf8').replace(/^export /gm,'');
fs.writeFileSync('dist/state-codec.js',codec);
const names=['notifications-v82.js','sw.js','enhancements-v81.js','enhancements-v81.css','mobile-v78.js','mobile-v78.css','enhancements-v76.js','enhancements-v76.css','enhancements-v75.js','enhancements-v73.js','enhancements-v73.css','enhancements-v72.js','enhancements-v72.css','enhancements-v71.js','enhancements-v71.css','manifest.webmanifest','schedule.js','schedule.css','records-export.js','schedule-v60.js','schedule-v63.js','schedule-v67.js','index.html','workflows.js','workflow-ui.js','appearance.js','ui-catalog44.js','release44.css','app.js','style.css','xlsx.full.min.js','favicon.svg','auth.js','cloud.js','admin.js','admin.css','uploads.js','cases.js','audit.js','roles.js','navigation.js','plating.js','state-codec.js','admin-layout.js','plating-ledger.js','wire.js','permissions.js','wire.css','sorting.js','photos.js','controls.css','bulk.js','warehouse-view.js','audit-view.js','warehouse-view.css'];
names.push('mobile-form-v84.js','mobile-form-v84.css','enhancements-v85.js','controls-v85.css','enhancements-v86.js','enhancements-v86.css','enhancements-v88.js','enhancements-v88.css','enhancements-v901.js','enhancements-v901.css','enhancements-v903.js','enhancements-v903.css','enhancements-v904.js','enhancements-v904.css','enhancements-v91.js','enhancements-v91.css','enhancements-v92.js','enhancements-v92.css','enhancements-v921.js','enhancements-v921.css','enhancements-v93.js','enhancements-v93.css');
const types={webmanifest:'application/manifest+json; charset=utf-8',html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'};
const assets=Object.fromEntries(names.map(n=>['/'+n,{body:fs.readFileSync('dist/'+n,'utf8'),type:types[n.split('.').pop()]}]));
assets['/index.html'].body=assets['/index.html'].body.replace('schedule-v67.js?v=79','schedule-v67.js?v=902').replace('uploads.js?v=67','uploads.js?v=902').replace('cloud.js?v=29','cloud.js?v=89').replace(
 '</head>',
 '<script src="notifications-v82.js?v=83" defer></script>'+
 '<script src="enhancements-v81.js?v=83" defer></script>'+
 '<link rel="stylesheet" href="enhancements-v81.css?v=81">'+
 '<script src="mobile-form-v84.js?v=84" defer></script>'+
 '<script src="enhancements-v85.js?v=87" defer></script>'+
 '<script src="enhancements-v86.js?v=86" defer></script>'+
 '<script src="enhancements-v88.js?v=902" defer></script>'+
 '<script src="enhancements-v901.js?v=903" defer></script>'+
 '<script src="enhancements-v903.js?v=903" defer></script>'+
 '<script src="enhancements-v904.js?v=904" defer></script>'+
 '<script src="enhancements-v91.js?v=911" defer></script>'+
 '<script src="enhancements-v92.js?v=921" defer></script>'+
 '<script src="enhancements-v921.js?v=921" defer></script>'+
 '<script src="enhancements-v93.js?v=93" defer></script>'+
 '<link rel="stylesheet" href="controls-v85.css?v=85">'+
 '<link rel="stylesheet" href="enhancements-v86.css?v=87">'+
 '<link rel="stylesheet" href="enhancements-v88.css?v=90">'+
 '<link rel="stylesheet" href="enhancements-v901.css?v=903">'+
 '<link rel="stylesheet" href="enhancements-v903.css?v=903">'+
 '<link rel="stylesheet" href="enhancements-v904.css?v=904">'+
 '<link rel="stylesheet" href="enhancements-v91.css?v=911">'+
 '<link rel="stylesheet" href="enhancements-v92.css?v=921">'+
 '<link rel="stylesheet" href="enhancements-v921.css?v=921">'+
 '<link rel="stylesheet" href="enhancements-v93.css?v=93">'+
 '<link rel="stylesheet" href="mobile-form-v84.css?v=84">'+
 '</head>'
);
fs.mkdirSync('dist/server',{recursive:true});
const code=fs.readFileSync('worker/server.mjs','utf8').replace(/^import .*from '\.\/.*';?\n/gm,'').replace("return new Response('Not found',{status:404});","const a=assets[path==='/'?'/index.html':path];if(!a)return new Response('Not found',{status:404});return new Response(a.body,{headers:{'Content-Type':a.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});");
fs.writeFileSync('dist/server/index.js',fs.readFileSync('worker/backup85.mjs','utf8').replace(/^export /gm,'')+'\n'+fs.readFileSync('worker/notifications85.mjs','utf8').replace(/^export /gm,'')+'\n'+fs.readFileSync('worker/alerts90.mjs','utf8').replace(/^export /gm,'')+'\n'+workflows+'\n'+codec+'\n'+fs.readFileSync('worker/wire-permissions.mjs','utf8').replace(/^import .*\n/gm,'').replace(/^export /gm,'')+'\nconst assets='+JSON.stringify(assets)+';\n'+fs.readFileSync('worker/schedule.mjs','utf8').replace(/^export /gm,'')+'\n'+fs.readFileSync('worker/records-export.mjs','utf8').replace(/^export /gm,'')+'\n'+fs.readFileSync('worker/holidays.mjs','utf8').replace(/^export /gm,'')+'\n'+code);
console.log('Built authenticated warehouse Worker');
