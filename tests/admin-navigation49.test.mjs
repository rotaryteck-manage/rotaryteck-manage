import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../dist/workflow-ui.js',import.meta.url),'utf8').split('// Admin operations stay on the admin route, including warehouse detail redraws.')[1];
test('admin redraw stays on admin and section links do not navigate to frontend',()=>{let admin=0,front=0,picked='';const link={getAttribute:()=> '#wire'};const c={location:{hash:'#admin'},currentUser:{role:'supervisor'},selectedId:'',renderAdmin:()=>admin++,render:()=>front++,closeWarehouseDetail:async()=>{},document:{querySelectorAll:()=>[link]},window:{scrollY:120,scrollTo(){}},$:()=>null};vm.createContext(c);vm.runInContext(source,c);c.render();assert.equal(admin,1);assert.equal(front,0);c.adminSectionPicker49=kind=>picked=kind;let prevented=false;link.onclick({preventDefault(){prevented=true}});assert(prevented);assert.equal(picked,'wire');assert.equal(c.location.hash,'#admin');c.location.hash='#warehouse';c.render();assert.equal(front,1);});
