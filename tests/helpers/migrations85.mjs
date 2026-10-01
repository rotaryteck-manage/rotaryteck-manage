import fs from 'node:fs';
export function migrations85(db){
 db.exec("CREATE TABLE IF NOT EXISTS app_employee_settings(employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0)");
 for(const name of fs.readdirSync(new URL('../../drizzle/',import.meta.url)).filter(n=>/^\d.*\.sql$/.test(n)).sort()){
  if(name.startsWith('0017')||name.startsWith('0002'))continue; // Production history migration is exercised separately on an existing store.
  const source=fs.readFileSync(new URL('../../drizzle/'+name,import.meta.url),'utf8');
  for(let statement of source.split(';').map(s=>s.replace(/^\s*--[^\n]*\n/gm,'').trim()).filter(Boolean)){
   const alter=statement.match(/^ALTER TABLE\s+([\w`]+)\s+ADD(?: COLUMN)?\s+([\w`]+)/i);
   if(alter&&db.prepare('PRAGMA table_info('+alter[1]+')').all().some(c=>c.name===alter[2].replaceAll('`','')))continue;
   statement=statement.replace(/^CREATE TABLE (?!IF)/i,'CREATE TABLE IF NOT EXISTS ').replace(/^CREATE (UNIQUE )?INDEX (?!IF)/i,(_,u)=>'CREATE '+(u||'')+'INDEX IF NOT EXISTS ');
   db.exec(statement);
  }
 }
}
