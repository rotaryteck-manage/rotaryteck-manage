import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/qc-view129.js',import.meta.url),'utf8');
function setup(permissions=['manage','delete','export','restore']){
 let html='',calls=[],urls=[],revoked=[],timers=[],downloads=[];
 class Element extends EventTarget{
  constructor(){super();this.open=false;this.isConnected=true;this.scrollTop=32;this.classList={add(){},remove(){}};this.nodes=new Map();this.children=[];this.disabled=false;this.hidden=false;this.textContent=''}
  querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s)}
  querySelectorAll(){return[]}
  setAttribute(){}
  append(el){this.children.push(el)}
  replaceChildren(){this.children=[]}
  showModal(){this.open=true}
  close(){this.open=false;this.dispatchEvent(new Event('close'))}
  remove(){this.isConnected=false}
  focus(){this.focused=true}
 }
 const box=new Element(),root=new Element();box.open=true;const opener=new Element();
 const data={projects:[{id:'p',name:'SJ99-24',revision:9}],uploads:[{id:'new',project_id:'p',stamp:'2026-10-19T13:30'},{id:'old',project_id:'p',stamp:'2026-10-16T11:49'}],files:[{id:'newfile',upload_id:'new',project_id:'p',order_no:3,position:1,original_name:'新.pdf',author_name:'新增人'},{id:'replacement',upload_id:'old',project_id:'p',order_no:1,position:1,original_name:'<更新>.pdf',author_name:'倉管'},{id:'second',upload_id:'old',project_id:'p',order_no:2,position:2,original_name:'二.pdf',author_name:'主管'},{id:'history',upload_id:'old',project_id:'p',order_no:1,position:1,original_name:'舊.pdf',superseded_by:'replacement'}],logs:[]};
 const context={qcData124:data,qcSelected124:'',qcOpen124(){},qcViewPDF124(){},qcCanUI124:k=>permissions.includes(k),uiCatalogue44:{global:[]},document:{documentElement:{dataset:{}},body:root,activeElement:opener,createElement:()=>new Element()},navigator:{pdfViewerEnabled:true},currentUser:{id:1},$:()=>box,modal:(title,body)=>{html=body},receiptTime:s=>s,esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),toast:message=>calls.push(message),qcUpload124(){},qcProject124(){},qcExport124(){},qcAction124(){},qcEdit124(){},apiFetch:async(path,options)=>{calls.push({path,options});return new Response('%PDF-1.7\ntest',{headers:{'content-type':'application/pdf'}})},qcDownload124:(blob,name)=>downloads.push({blob,name}),URL:{createObjectURL:()=>{const u='blob:test'+urls.length;urls.push(u);return u},revokeObjectURL:u=>revoked.push(u)},Blob,AbortController,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){}};
 vm.createContext(context);vm.runInContext(source,context);
 return {context,run:code=>vm.runInContext(code,context),html:()=>html,data,calls,root,box,opener,urls,revoked,timers,downloads};
}
test('QC main has four compact commands and flat escaped file rows without authors, groups or edit controls',()=>{
 const f=setup();f.run("qcOpen124('p')");const html=f.html();
 assert.match(html,/>新增<\/button>.*>匯出<\/button>.*>編輯<\/button>.*>刪除<\/button>/);
 assert.match(html,/3\. SJ99-24｜20261019_13:30｜新.pdf/);
 assert.match(html,/1\. SJ99-24｜20261016_11:49｜&lt;更新&gt;.pdf/);
 assert.ok(html.indexOf('data-qc-file="newfile"')<html.indexOf('data-qc-file="replacement"'));
 assert.doesNotMatch(html,/qc-author129|qc-entry124|data-qc-replace|data-qc-delete-file|data-qc-edit-project|登記資料與其他操作/);
 assert.doesNotMatch(html,/<details[^>]* open/);
});
test('edit screen shows authors and individual controls, retaining registration editing and restoration',()=>{
 const f=setup();f.run("qcOpen124('p',true)");assert.match(f.html(),/新增人員：倉管/);assert.match(f.html(),/data-qc-replace="replacement"/);assert.match(f.html(),/data-qc-delete-file="second"/);assert.match(f.html(),/data-qc-edit-project/);assert.match(f.html(),/登記資料與其他操作/);assert.match(f.html(),/data-qc-edit="old"/);assert.match(f.html(),/刪除紀錄與舊版附件/);
 f.run("qcOpen124('p')");assert.match(f.html(),/完成編輯/);f.run("qcOpen124('p',false)");assert.doesNotMatch(f.html(),/qc-author129/);
});
test('QC permission combinations never expose unauthorized mutations or old PDFs',()=>{
 const f=setup([]);f.run("qcOpen124('p',true)");assert.doesNotMatch(f.html(),/data-qc-add|data-qc-edit-mode|data-qc-delete|data-qc-replace|data-qc-export-case|刪除紀錄與舊版附件/);
 const d=setup(['delete']);d.run("qcOpen124('p',true)");assert.match(d.html(),/data-qc-delete-file/);assert.doesNotMatch(d.html(),/data-qc-replace|data-qc-edit-project|data-qc-edit="/);
 const m=setup(['manage']);m.run("qcOpen124('p',true)");assert.match(m.html(),/data-qc-replace/);assert.doesNotMatch(m.html(),/data-qc-delete-file|data-qc-delete-upload/);
});
test('PDF preview uses one authorized read and native top-layer dialog, with exact original download name',async()=>{
 const f=setup();await f.run("qcViewPDF124('replacement')");const dialog=f.root.children[0];assert.equal(dialog.open,true);assert.equal(f.box.open,true);assert.equal(f.calls.length,1);assert.equal(f.calls[0].path,'/api/qc-reports?file=replacement');assert.ok(f.calls[0].options.signal);assert.equal(dialog.querySelector('.qc-pdf-content129').children[0].type,'application/pdf');
 await f.run("qcViewPDF124('replacement')");assert.equal(f.calls.length,1);
 dialog.querySelector('[data-pdf-download]').onclick();dialog.querySelector('[data-pdf-download]').onclick();assert.equal(f.downloads.length,1);assert.equal(f.downloads[0].name,'<更新>.pdf');
 dialog.querySelector('[data-pdf-close]').onclick();assert.equal(dialog.isConnected,false);assert.equal(f.box.open,true);assert.equal(f.box.scrollTop,32);assert.equal(f.opener.focused,true);assert.deepEqual(f.revoked,f.urls);
});
test('closing a pending preview aborts its request and cannot create a stale object URL',async()=>{
 const f=setup();let finish;f.context.apiFetch=(path,options)=>new Promise(resolve=>{finish=resolve;f.calls.push(options)});
 const pending=f.run("qcViewPDF124('replacement')");f.root.children[0].close();assert.equal(f.calls[0].signal.aborted,true);finish(new Response('%PDF-1.7\nlate'));await pending;assert.equal(f.urls.length,0);assert.equal(f.box.open,true);
});
test('PDF failures remain readable without a stuck download; unsupported viewer retains download fallback',async()=>{
 const f=setup();f.context.apiFetch=async()=>Response.json({error:'沒有讀取權限'},{status:403});await f.run("qcViewPDF124('replacement')");let dialog=f.root.children[0];assert.equal(dialog.querySelector('[role=status]').textContent,'沒有讀取權限');assert.equal(dialog.querySelector('[data-pdf-download]').disabled,true);dialog.close();
 f.context.apiFetch=async()=>new Response('%PDF-1.7\nfile');f.context.navigator.pdfViewerEnabled=false;await f.run("qcViewPDF124('replacement')");dialog=f.root.children[1];assert.match(dialog.querySelector('[role=status]').textContent,/不支援框內預覽/);assert.equal(dialog.querySelector('[data-pdf-download]').disabled,false);assert.equal(f.urls.length,0);
});
test('PDF account change and invalid content do not display stale or non-PDF data',async()=>{
 const f=setup();f.context.apiFetch=async()=>{f.context.currentUser={id:2};return new Response('%PDF-1.7\nfile')};await f.run("qcViewPDF124('replacement')");assert.equal(f.root.children[0].isConnected,false);assert.equal(f.urls.length,0);
 f.context.apiFetch=async()=>new Response('<html>login</html>');await f.run("qcViewPDF124('replacement')");assert.match(f.root.children[1].querySelector('[role=status]').textContent,/不是有效的 PDF/);assert.equal(f.root.children[1].querySelector('[data-pdf-download]').disabled,true);
});
