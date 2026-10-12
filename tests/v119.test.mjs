import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('dist/meetings117.js','utf8');
function load(name,next){const context=vm.createContext({});vm.runInContext(source.slice(source.indexOf('function '+name+'('),source.indexOf(next,source.indexOf('function '+name+'('))),context);return context[name]}
const convert=load('meetingHashtag119','\nscheduleNotificationRoute941();');
function input(value,caret=value.length){return{value,selectionStart:caret,selectionEnd:caret,setRangeText(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);this.selectionStart=this.selectionEnd=start+text.length}}}
test('11.9v hashtag converts only after a space and preserves text and caret in the middle',()=>{
 for(const value of ['#FAA ','#中文項目 ','#105測試　']){const field=input(value);convert(field);assert.equal(field.value,'【'+value.slice(1,-1)+'】');assert.equal(field.selectionStart,field.value.length)}
 const field=input('舊 #保留  新 #FAA 後方',15);field.selectionStart=field.selectionEnd=field.value.indexOf('後方');convert(field);assert.equal(field.value,'舊 #保留  新 【FAA】後方');assert.equal(field.selectionStart,field.value.indexOf('後方'));
});
test('11.9v unfinished/empty hashtags, newline, selection and existing brackets remain untouched',()=>{
 for(const value of ['#FAA','# ','#FAA\n','#FAA \n','【FAA】 ','#A B']){const field=input(value);convert(field);assert.equal(field.value,value)}
 const selected=input('#FAA ');selected.selectionEnd=2;convert(selected);assert.equal(selected.value,'#FAA ');
});
test('11.9v source panels move after all rules while preserving nodes and expanded state',()=>{
 const reorder=load('meetingSourcesBottom119','\nconst meetingSourceBefore119');
 const rule={id:'rule'},holiday={id:'holiday',open:true},closure={id:'closure',open:false},meeting={id:'meeting'};
 const box={children:[rule,holiday,closure,meeting],querySelectorAll(){return this.children.filter(x=>x===holiday||x===closure)},append(node){this.children=this.children.filter(x=>x!==node);this.children.push(node);this.moves=(this.moves||0)+1}};
 reorder(box);assert.deepEqual(box.children,[rule,meeting,holiday,closure]);assert.equal(holiday.open,true);assert.equal(closure.open,false);assert.equal(box.moves,2);reorder(box);assert.equal(box.moves,2);
 box.children.push({id:'new-rule'});reorder(box);assert.deepEqual(box.children.slice(-2),[holiday,closure]);
});
