import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
test('private photo memory cache deduplicates, bounds concurrency and clears on login',async()=>{
 let calls=0,active=0,peak=0;const revoked=[];class CacheURL extends URL{}CacheURL.createObjectURL=()=> 'blob:'+Math.random();CacheURL.revokeObjectURL=u=>revoked.push(u);
 const ctx=vm.createContext({URL:CacheURL,location:{origin:'https://test.local'},document:{documentElement:{},querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},MutationObserver:class{observe(){}},requestAnimationFrame:fn=>fn(),showLogin(){},apiFetch:async()=>{calls++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,3));active--;return new Response(new Blob(['photo'],{type:'image/png'}));}});
 vm.runInContext(fs.readFileSync('dist/photos.js','utf8'),ctx);
 await vm.runInContext("Promise.all([cachedPhoto('/api/logo',true),cachedPhoto('/api/logo',true)])",ctx);assert.equal(calls,1);
 await vm.runInContext("Promise.all(Array.from({length:8},(_,i)=>cachedPhoto('/api/receipts?project=A&id='+i)))",ctx);assert.equal(peak,3);
 vm.runInContext('showLogin()',ctx);assert.equal(revoked.length,9);
 await vm.runInContext("cachedPhoto('/api/logo',true)",ctx);assert.equal(calls,10);
 vm.runInContext('clearPhotoCache()',ctx);
});
