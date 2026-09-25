import test from 'node:test';
import assert from 'node:assert/strict';
import {stateChangeAllowed} from '../worker/server.mjs';
import {builtinProfiles,canDeleteProject} from '../worker/wire-permissions.mjs';
const keys={cases:'cases',warehouse:'projects',wire:'wireTypes',plating:'platingProjects'};
const base=()=>({cases:[{id:'c',name:'案'}],projects:[{id:'p',name:'庫房'}],deletedProjects:[],wireTypes:[{id:'w',name:'AWG26'}],wireReels:[],wireCuts:[],platingProjects:[{id:'e',name:'電鍍',shipments:[]}],logs:[]});
function del(s,kind){const n=structuredClone(s),key=keys[kind];if(['wire','plating'].includes(kind))Object.assign(n[key][0],{archived:true,deletedAt:new Date().toISOString(),purgeAfter:new Date(Date.now()+7*86400000).toISOString()});else {const p=n[key].shift();if(kind==='warehouse')n.deletedProjects.push({project:p,index:0});}return n;}
for(const kind of Object.keys(keys))test(kind+' deletion requires both role and independent capability',()=>{const s=base(),n=del(s,kind);for(const role of ['viewer','warehouse','supervisor']){const expected=role==='supervisor'||role==='warehouse'&&['wire','plating'].includes(kind);const e={role,name:'員工',id:1,permissions:[kind+'.deleteProject']};assert.equal(canDeleteProject(e,kind),expected);assert.equal(stateChangeAllowed(s,n,e),expected);assert.equal(stateChangeAllowed(s,n,{...e,permissions:[kind+'.manage','wire.edit','wire.delete']}),false);}});
test('delete-only capability cannot rename or alter retained records',()=>{for(const kind of ['wire','plating']){const s=base(),n=del(s,kind);n[keys[kind]][0].name='changed';assert.equal(stateChangeAllowed(s,n,{role:'warehouse',permissions:[kind+'.deleteProject']}),false);}});
test('builtin role defaults provide expected delete rights',()=>{for(const p of builtinProfiles)for(const kind of Object.keys(keys))assert.equal(canDeleteProject({...p,role:p.id},kind),p.id==='supervisor'||p.id==='warehouse'&&['wire','plating'].includes(kind));});
