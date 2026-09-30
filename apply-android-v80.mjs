import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=process.argv[2]?path.resolve(process.argv[2]):path.dirname(fileURLToPath(import.meta.url));
const worker=path.join(root,'worker/server.mjs'),manifest=path.join(root,'dist/manifest.webmanifest');
try {
 const original=fs.readFileSync(worker,'utf8');
 if(original.includes('// Android install metadata v80')){console.log('Android v80 already applied.');process.exit(0);}
 const old="icons:[{src:'/api/app-icon?v='+settings.revision,purpose:'any'}]";
 if(original.split(old).length!==2)throw Error('Cannot identify manifest function. No files changed.');
 const anchor="return html.replace('<meta name=\"apple-mobile-web-app-title\" content=\"擎正管理\">'";
 if(original.split(anchor).length!==2)throw Error('Cannot identify HTML icon function. No files changed.');
 let updated=original.replace(old,"icons:[{src:'/api/app-icon?v='+settings.revision+'&android=80',sizes:'512x512',type:'image/png',purpose:'any'}]");
 updated=updated.replace(anchor,`// Android install metadata v80: use the current home-screen icon for shortcuts too.
 const homeIcon='/api/app-icon?v='+settings.revision+'&amp;android=80';
 html=html.replace(/<link\\b(?=[^>]*\\brel=["']icon["'])[^>]*>/i,'<link rel="icon" type="image/png" sizes="512x512" href="'+homeIcon+'">');
 return html.replace('<meta name="apple-mobile-web-app-title" content="擎正管理">'`);
 const oldManifest=fs.readFileSync(manifest,'utf8'),data=JSON.parse(oldManifest);
 data.icons=[{src:'/api/app-icon?android=80',sizes:'512x512',type:'image/png',purpose:'any'}];
 const backup=path.join(root,'android-v80-backup');
 if(fs.existsSync(backup))throw Error('Backup directory already exists. Inspect it before retrying.');
 fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'server.mjs'),original);fs.writeFileSync(path.join(backup,'manifest.webmanifest'),oldManifest);
 fs.writeFileSync(worker,updated);fs.writeFileSync(manifest,JSON.stringify(data)+'\n');
 console.log('Android v80 applied. Calendar, CSS and index.html were not changed. Run npm run build, then deploy.');
} catch(error){console.error(error.message);process.exitCode=1;}
