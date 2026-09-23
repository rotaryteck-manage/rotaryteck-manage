import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/navigation.js',import.meta.url),'utf8');
function setup(){
 const nodes={};const element=()=>({children:[],dataset:{},setAttribute(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},remove(){this.removed=true;}});
 const ctx={caseSectionExpanded:true,warehouseExpanded:true,currentUser:{role:'supervisor'},siteText:x=>x,config:()=>({pages:[{id:'new',title:'設備管理',blocks:[]}]}),location:{hash:''},captureDraft(){ctx.captured++;},captured:0,render(){for(const name of ['main','.demo','.case-workspace','.warehouse-fold','.audit-fold'])nodes[name]=element();},renderContent(){},routeAdmin(){},cloudReady:true,renderAdmin(){ctx.admin=true;},$:s=>nodes[s],document:{createElement:element,querySelectorAll:()=>[]},history:{replaceState(a,b,hash){ctx.location.hash=hash;}},window:{},isAdmin:()=>true};
 vm.createContext(ctx);vm.runInContext(source,ctx);return{ctx,nodes};
}
test('navigation presents only selected section and preserves route after rerender',()=>{
 const {ctx,nodes}=setup();ctx.render();assert.equal(nodes['.case-workspace'].removed,undefined);assert.equal(nodes['.warehouse-fold'].removed,true);
 ctx.navigateManagement('warehouse');assert.equal(ctx.captured,1);ctx.routeAdmin();assert.equal(nodes['.case-workspace'].removed,true);assert.equal(nodes['.warehouse-fold'].removed,undefined);
 ctx.render();assert.equal(nodes['.warehouse-fold'].removed,undefined);
});
test('published custom pages join navigation and show their own content',()=>{
 const {ctx,nodes}=setup();ctx.location.hash='#page/new';ctx.render();assert.equal(nodes['.case-workspace'].removed,true);assert.equal(nodes['.warehouse-fold'].removed,true);assert.equal(nodes.main.children[0].className,'workspace management-content');assert.equal(nodes.main.children[0].children[0].textContent,'設備管理');
});
test('audit navigation remains restricted and unknown routes fall back to cases',()=>{
 const {ctx}=setup();assert.equal(ctx.managementPages().some(p=>p.id==='audit'),true);ctx.currentUser.role='viewer';assert.equal(ctx.managementPages().some(p=>p.id==='audit'),false);ctx.location.hash='#audit';assert.equal(ctx.activeManagementPage().id,'cases');ctx.location.hash='#missing';assert.equal(ctx.activeManagementPage().id,'cases');
});
