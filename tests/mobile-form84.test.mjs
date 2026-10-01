import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture(){
 const values=new Map(),events=new Map();
 const field={getBoundingClientRect:()=>({top:280,bottom:330})};
 const body={scrollTop:0,contains:node=>node===field,getBoundingClientRect:()=>({top:80,bottom:260})};
 const dialog={open:true,querySelector:()=>body};
 const viewport={height:844,offsetTop:0,scale:1,addEventListener:(name,fn)=>events.set('viewport:'+name,fn)};
 const document={documentElement:{style:{setProperty:(key,value)=>values.set(key,value)}},activeElement:field,
  querySelector:()=>dialog,addEventListener:(name,fn)=>events.set('document:'+name,fn)};
 const window={visualViewport:viewport,innerHeight:844,addEventListener:(name,fn)=>events.set('window:'+name,fn)};
 vm.runInNewContext(fs.readFileSync('dist/mobile-form-v84.js','utf8'),{window,document,matchMedia:()=>({matches:true}),requestAnimationFrame:fn=>fn()});
 return {values,events,field,body,viewport,document,window};
}

test('keyboard resize fits the visible area and closing it restores original height',()=>{
 const f=fixture();
 assert.equal(f.values.get('--mobile-viewport-height84'),'844px');
 f.viewport.height=360;f.viewport.offsetTop=120;f.events.get('viewport:resize')();
 assert.equal(f.values.get('--mobile-viewport-height84'),'360px');
 assert.equal(f.values.get('--mobile-viewport-top84'),'120px');
 f.viewport.height=844;f.viewport.offsetTop=0;f.events.get('viewport:resize')();
 assert.equal(f.values.get('--mobile-viewport-height84'),'844px');
 assert.equal(f.values.get('--mobile-viewport-top84'),'0px');
});

test('only the form content scrolls and tall fields do not cause backwards scrolling',()=>{
 const f=fixture();
 assert.equal(f.body.scrollTop,78);
 f.body.scrollTop=0;f.field.getBoundingClientRect=()=>({top:80,bottom:500});
 f.events.get('document:focusin')();assert.equal(f.body.scrollTop,0);
 f.document.activeElement={};f.events.get('viewport:resize')();assert.equal(f.body.scrollTop,0);
});
