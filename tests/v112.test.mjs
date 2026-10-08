import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
function setup(){
 const badges=[],ctx=vm.createContext({navigator:{setAppBadge:async n=>badges.push(n),clearAppBadge:async()=>badges.push(0)},currentUser:{id:1},notificationInboxLoad88:async()=>({unread:3}),notificationRead88:async()=>({unread:2}),authWrite:()=>{},authRead:()=>null,AUTH_STORAGE:'auth',document:{hidden:true,addEventListener:()=>{}},window:{addEventListener:()=>{}},setInterval:()=>0,$:()=>null,notificationBadge88:()=>{}});
 vm.runInContext(read('dist/enhancements-v112.js'),ctx);return{ctx,badges};
}
test('personal unread count is used and reads update the badge',async()=>{
 const {ctx,badges}=setup();await ctx.notificationInboxLoad88();await ctx.notificationRead88({id:'own'});assert.deepEqual(badges,[3,2]);
});
test('zero clears and missing platform support is harmless',async()=>{
 const {ctx,badges}=setup();await ctx.personalBadge112(0);assert.deepEqual(badges,[0]);ctx.navigator={};await ctx.personalBadge112(5);
});
test('logout clears the previous employee badge',async()=>{
 const {ctx,badges}=setup();ctx.authWrite(null);assert.deepEqual(badges,[0]);
});
test('late response cannot set another account badge',async()=>{
 let finish;const {ctx,badges}=setup();ctx.inboxLoadBefore112=undefined;
 const source=read('dist/enhancements-v112.js');
 const other=vm.createContext({...ctx,notificationInboxLoad88:()=>new Promise(resolve=>finish=resolve)});
 vm.runInContext(source,other);const pending=other.notificationInboxLoad88();other.currentUser={id:2};finish({unread:9});await pending;assert.deepEqual(badges,[]);
});
test('worker badge fetch is authenticated and inbox operations remain employee-scoped',()=>{
 const sw=read('dist/sw.js'),server=read('worker/server.mjs');
 assert.match(sw,/credentials:'same-origin'/);assert.match(sw,/syncPersonalBadge112\(\)/);assert.doesNotMatch(sw,/setAppBadge\(data\./);
 assert.match(server,/WHERE employee_id=\? AND read_at=''/);assert.match(server,/WHERE id=\? AND employee_id=\? AND read_at=''/);
});
