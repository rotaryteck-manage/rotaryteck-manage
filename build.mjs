import fs from 'node:fs';
const names=['index.html','app.js','style.css','xlsx.full.min.js','favicon.svg','auth.js','cloud.js','admin.js','admin.css','uploads.js','cases.js','audit.js','roles.js','navigation.js'];
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'};
const assets=Object.fromEntries(names.map(n=>['/'+n,{body:fs.readFileSync('dist/'+n,'utf8'),type:types[n.split('.').pop()]}]));
fs.mkdirSync('dist/server',{recursive:true});
const code=fs.readFileSync('worker/server.mjs','utf8').replace("return new Response('Not found',{status:404});","const a=assets[path==='/'?'/index.html':path];if(!a)return new Response('Not found',{status:404});return new Response(a.body,{headers:{'Content-Type':a.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});");
fs.writeFileSync('dist/server/index.js','const assets='+JSON.stringify(assets)+';\n'+code);
console.log('Built authenticated warehouse Worker');
