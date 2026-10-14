import {notificationRuntimeWithServices125,runScheduledEvent116} from '../../worker/server.mjs';
export async function scheduled125(event,env){const r=runtime125(env,globalThis.fetch);try{await runScheduledEvent116(event,env,r.ctx);await r.drain()}finally{r.restore()}}
export function runtime125(env,provider=async()=>new Response(null,{status:201}),environment=()=>env){
 const original=globalThis.fetch,pending=[];let invocations=0,pushes=0;
 const ctx={waitUntil(task){pending.push(task)}};
 globalThis.fetch=async(url,options)=>{
  if(String(url).includes('/api/notification-runtime125')){invocations++;return notificationRuntimeWithServices125(new Request(url,options),environment(url,options),ctx)}
  pushes++;return provider(url,options);
 };
 return{ctx,async drain(){while(pending.length)await Promise.all(pending.splice(0))},restore(){globalThis.fetch=original},counts(){return{invocations,pushes}}};
}
