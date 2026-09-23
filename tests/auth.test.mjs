import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('login captures form data before the first await',()=>{
 const source=fs.readFileSync(new URL('../dist/auth.js',import.meta.url),'utf8');
 const handler=source.slice(source.indexOf("$('#login-form').onsubmit"));
 assert.ok(handler.indexOf('new FormData(form)')>=0);
 assert.ok(handler.indexOf('new FormData(form)')<handler.indexOf('await getAuthConfig()'));
});
test('invited employees set their own password',()=>{
 const source=fs.readFileSync(new URL('../dist/auth.js',import.meta.url),'utf8');
 assert.match(source,/\['invite','recovery'\]\.includes\(type\)/);
 assert.match(source,/設定登入密碼/);
 assert.match(source,/\/auth\/v1\/user/);
});
test('forgotten passwords can be reset by email',()=>{
 const source=fs.readFileSync(new URL('../dist/auth.js',import.meta.url),'utf8');
 assert.match(source,/忘記密碼/);
 assert.match(source,/\/auth\/v1\/recover/);
 assert.match(source,/type==='recovery'/);
});
test('password setup remains mandatory after refreshing an invite or recovery link',()=>{
 const source=fs.readFileSync(new URL('../dist/auth.js',import.meta.url),'utf8');
 assert.match(source,/function pendingEmailAction\(\)/);
 assert.match(source,/params\.get\('invited'\)==='1'/);
 assert.match(source,/params\.get\('recovery'\)==='1'/);
 assert.match(source,/if\(pending\)\{showSetPassword\(session,pending\);return false;\}/);
});
test('logout clears unfinished email action markers',()=>{
 const source=fs.readFileSync(new URL('../dist/auth.js',import.meta.url),'utf8');
 assert.match(source,/function logout\(\)\{authWrite\(null\);history\.replaceState\(null,'',location\.pathname\);showLogin/);
});
