function leaveMinutes124(start,end,holidays={}){
 const a=Date.parse(start+'Z'),b=Date.parse(end+'Z');if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||b-a>366*86400000)return 0;
 let total=0;for(let t=Math.floor(a/86400000)*86400000;t<b;t+=86400000){const d=new Date(t),day=d.toISOString().slice(0,10);if([0,6].includes(d.getUTCDay())||holidays[day]?.off)continue;for(const [s,e]of [[510,720],[780,1050]])total+=Math.max(0,Math.min(b,t+e*60000)-Math.max(a,t+s*60000))/60000;}
 return Math.round(total);
}
function leaveUnits124(minutes){const n=Math.max(0,Math.floor(Number(minutes)||0));return[{value:Math.floor(n/480),unit:'D'},{value:Math.floor(n%480/60),unit:'H'},{value:n%60,unit:'M'}].filter(x=>x.value)}
function leaveLabel124(minutes){return leaveUnits124(minutes).map(x=>x.value+x.unit).join(' / ')||'0H'}
