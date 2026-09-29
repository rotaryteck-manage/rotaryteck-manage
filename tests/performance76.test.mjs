import test from 'node:test';
import assert from 'node:assert/strict';
import {ensurePermissions,employeePermissions} from '../worker/wire-permissions.mjs';
function fixture(){
 const stats={batches:0,fail:false,permissions:['warehouse.view']};
 const DB={async batch(){stats.batches++;if(stats.fail){stats.fail=false;throw Error('temporary DB failure')}},prepare(sql){return {bind(){return this},async first(){if(sql.includes('app_permission_migrations'))return {id:'done'};if(sql.includes('app_employee_settings'))return null;if(sql.includes('app_permission_profiles'))return {name:'倉管',permissions:JSON.stringify(stats.permissions)};return null;}}}};
 return {DB,stats};
}
test('concurrent schema initialization is coalesced but changed role permissions are read fresh',async()=>{
 const {DB,stats}=fixture();await Promise.all([ensurePermissions({DB}),ensurePermissions({DB}),ensurePermissions({DB})]);assert.equal(stats.batches,1);
 assert.deepEqual((await employeePermissions({DB},{id:1,role:'warehouse'})).permissions,['warehouse.view']);
 stats.permissions=['warehouse.view','warehouse.issuedDate'];assert.deepEqual((await employeePermissions({DB},{id:1,role:'warehouse'})).permissions,stats.permissions);assert.equal(stats.batches,1);
 const another=fixture();await ensurePermissions(another);assert.equal(another.stats.batches,1);
});
test('failed schema initialization is not cached and can be retried',async()=>{
 const {DB,stats}=fixture();stats.fail=true;await assert.rejects(ensurePermissions({DB}),/temporary/);await ensurePermissions({DB});assert.equal(stats.batches,2);
});
