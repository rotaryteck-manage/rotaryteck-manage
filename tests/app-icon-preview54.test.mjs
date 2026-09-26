import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('large source image is fitted onto preview before its content is measured',()=>{
 const code=fs.readFileSync(new URL('../dist/uploads.js',import.meta.url),'utf8');
 const functionSource=code.slice(code.indexOf('function drawAppIcon53('),code.indexOf('function appIconBlob53('));
 const calls=[];
 const source={width:0,height:0,getContext:()=>({
  drawImage(...args){calls.push(args);},
  getImageData(){const data=new Uint8ClampedArray(source.width*source.height*4);for(const x of [0,source.width-1]){const at=x*4;data[at]=170;data[at+1]=0;data[at+2]=0;data[at+3]=255;}return{data};},
  putImageData(){}
 })};
 const output={width:0,height:0,getContext:()=>({fillRect(){},drawImage(...args){calls.push(args);}})};
 const context={document:{createElement:()=>source},Math,Uint8ClampedArray};vm.createContext(context);vm.runInContext(functionSource,context);
 context.drawAppIcon53({width:3000,height:1500},output,'#f3e8dc',true);
 assert.deepEqual(calls[0].slice(1),[0,0,1024,512]);
 assert.equal(calls[1][3],1024);
 assert.equal(calls[1][7],410);
 assert.equal(output.width,512);
});
