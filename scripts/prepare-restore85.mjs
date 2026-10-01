import fs from 'node:fs';
import path from 'node:path';
import {backupTables85} from '../worker/backup85.mjs';
export function restoreSQL85(backup){
 if(backup.format!=='rotaryteck-backup'||backup.version!==85||!backup.tables||!backup.tables.state_records)throw Error('需要v85完整資料備份');
 const allowed=new Set(backupTables85),quote=v=>v===null?'NULL':typeof v==='number'&&Number.isFinite(v)?String(v):typeof v==='string'?"'"+v.replaceAll("'","''")+"'":(()=>{throw Error('資料型別不正確')})();
 const sql=['-- Only restore to an EMPTY database after applying the v85 migrations. Existing IDs cause failure; no DELETE or REPLACE is generated.'];
 for(const [table,rows]of Object.entries(backup.tables)){
  if(!allowed.has(table)||!Array.isArray(rows))throw Error('備份資料表不正確');
  for(const row of rows){const columns=Object.keys(row);if(!columns.length||columns.some(c=>!/^\w+$/.test(c)))throw Error('欄位格式不正確');sql.push('INSERT INTO "'+table+'" ('+columns.map(c=>'"'+c+'"').join(',')+') VALUES ('+columns.map(c=>quote(row[c])).join(',')+');');}
 }
 return sql.join('\n')+'\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const args=process.argv.slice(2);if(args.length!==2)throw Error('用法：node scripts/prepare-restore85.mjs 備份.json 還原預覽資料夾');
 const backup=JSON.parse(fs.readFileSync(args[0],'utf8')),directory=path.resolve(args[1]);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'restore-empty-database.sql'),restoreSQL85(backup),{flag:'wx'});console.log('已產生還原SQL供檢查；未連線、未修改任何資料庫。照片需使用ZIP內物件清單，依原儲存鍵值與metadata還原。');
}
