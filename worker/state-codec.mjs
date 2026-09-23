// Shared storage codec; the build also produces a browser copy.
export const recordCollections=['projects','cases','platingProjects','deletedProjects'];
export function recordKey(kind,id){return JSON.stringify([kind,id]);}
export function normalizeLogIds(s){const seen=new Set();for(const l of s.logs||[]){if(typeof l.id!=='string'||!l.id||seen.has(l.id))l.id=crypto.randomUUID();seen.add(l.id);}return s;}
export function stableJSON(value){if(Array.isArray(value))return '['+value.map(stableJSON).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJSON(value[k])).join(',')+'}';return JSON.stringify(value);}
export function splitState(s){
 const out=Object.create(null);
 for(const [name,value]of Object.entries(s)){
  if(recordCollections.includes(name)){
   if(!Array.isArray(value))throw Error('案件清單格式不正確');const ids=[];
   for(const item of value){const id=name==='deletedProjects'?item.project?.id:item.id;if(typeof id!=='string'||!id||ids.includes(id))throw Error('案件編號缺少或重複');ids.push(id);out[recordKey(name,id)]=item;}
   out[recordKey('order',name)]=ids;
  }else if(name==='logs'){
   const ids=new Set();for(const entry of [...value].reverse()){if(typeof entry.id!=='string'||!entry.id||ids.has(entry.id))throw Error('操作紀錄編號缺少或重複');ids.add(entry.id);out[recordKey('log',entry.id)]=entry;}
  }else out[recordKey('root',name)]=value;
 }return out;
}
export function joinRecords(records){
 const out=Object.create(null),collections=Object.create(null),orders=Object.create(null),logs=[];
 for(const [key,value]of Object.entries(records)){
  const [kind,id]=JSON.parse(key);if(value===undefined)continue;
  if(kind==='root'){if(['__proto__','constructor','prototype',...recordCollections,'logs'].includes(id))throw Error('設定名稱不正確');out[id]=value;}
  else if(kind==='order')orders[id]=value;
  else if(kind==='log')logs.push(value);
  else if(recordCollections.includes(kind)){collections[kind]??=new Map();collections[kind].set(id,value);}
  else throw Error('資料類型不正確');
 }
 for(const name of recordCollections){const entries=collections[name]||new Map(),order=orders[name];if(order===undefined){if(entries.size)throw Error('缺少案件排序');continue;}if(!Array.isArray(order)||order.length!==entries.size||new Set(order).size!==order.length||order.some(id=>!entries.has(id)))throw Error('案件排序與資料不一致');out[name]=order.map(id=>entries.get(id));}
 out.logs=logs.reverse();out.projects??=[];return out;
}
export function diffRecords(before,after,versions={}){
 const a=splitState(before),b=splitState(after),changes=[];
 for(const key of new Set([...Object.keys(a),...Object.keys(b)]))if(stableJSON(a[key])!==stableJSON(b[key]))changes.push({key,version:versions[key]||0,value:Object.hasOwn(b,key)?b[key]:null,deleted:!Object.hasOwn(b,key)});
 return changes;
}
