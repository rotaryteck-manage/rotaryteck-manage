import test from 'node:test';
import assert from 'node:assert/strict';
import {appIcon52} from '../worker/server.mjs';
import fs from 'node:fs';
test('public home icon uses generated icon and falls back to existing company logo',async()=>{for(const generated of [true,false]){const calls=[];const env={UPLOADS:{get:async key=>{calls.push(key);return key.startsWith('app-icons/')&&!generated?null:{body:generated?'square':'logo',httpMetadata:{contentType:'image/png'}};}}};const r=await appIcon52(new Request('https://example.com/api/app-icon'),env);assert.equal(await r.text(),generated?'square':'logo');assert.equal(calls.length,generated?1:2);assert.equal(r.headers.get('Content-Type'),'image/png');}});
test('icon has no write access and handles absent logo',async()=>{assert.equal((await appIcon52(new Request('https://example.com/api/app-icon',{method:'POST'}),{})).status,405);assert.equal((await appIcon52(new Request('https://example.com/api/app-icon'),{})).status,404);});
test('manifest and iPhone metadata reference public logo route',()=>{const m=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));assert.equal(m.start_url,'/');assert.equal(m.icons[0].src,'/api/app-icon');assert.equal(m.short_name,'擎正管理');assert.match(fs.readFileSync('dist/index.html','utf8'),/rel="apple-touch-icon" href="\/api\/app-icon"/);});
