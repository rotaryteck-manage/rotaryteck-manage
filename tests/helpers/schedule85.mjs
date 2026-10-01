import * as schedule from '../../worker/schedule.mjs';
import {migrations85} from './migrations85.mjs';
const initialized=new WeakSet();
function ready(env){if(env.DB?.db85&&!initialized.has(env.DB)){migrations85(env.DB.db85);initialized.add(env.DB);}}
export async function scheduleApi(request,env,employee){
 ready(env);
 if(env.DB?.db85&&request.method==='POST'&&request.headers.get('content-type')?.includes('application/json'))try{
  const input=await request.clone().json();
  if(input.kind!=='options'){
   const titles=(input.kind==='batch'?input.entries||[]:[input]).filter(x=>['weekly','daily'].includes(x.kind)&&typeof x.title==='string').map(x=>x.title);
   if(titles.length){const old=env.DB.db85.prepare('SELECT items,contents FROM schedule_options WHERE id=1').get(),items=[...new Set([...(old?JSON.parse(old.items):[]),...titles])];env.DB.db85.prepare('INSERT INTO schedule_options(id,items,contents) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET items=excluded.items').run(JSON.stringify(items),old?.contents||'[]');}
  }
 }catch{}
 return schedule.scheduleApi(request,env,employee);
}
export function schedulePhotoUpload(request,env,employee){ready(env);return schedule.schedulePhotoUpload(request,env,employee);}
export function schedulePhotoApi(request,env,employee){ready(env);return schedule.schedulePhotoApi(request,env,employee);}
export function scheduleMaterialUpload(request,env,employee){ready(env);return schedule.scheduleMaterialUpload(request,env,employee);}
export function scheduleMaterialPhotoApi(request,env,employee){ready(env);return schedule.scheduleMaterialPhotoApi(request,env,employee);}

export {scheduleUnique73} from '../../worker/schedule.mjs';
