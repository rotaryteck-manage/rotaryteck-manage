export const closureFeed90='https://alerts.ncdr.nat.gov.tw/RssAtomFeed.ashx?AlertType=33';

function text90(value=''){return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim()}
function tag90(xml,name){return text90(xml.match(new RegExp('<(?:\\w+:)?'+name+'\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?'+name+'>','i'))?.[1]||'')}
function date90(value,fallback=''){
 const western=[...value.matchAll(/(20\d{2})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})/g)].at(-1),roc=[...value.matchAll(/(?:民國)?(1\d{2})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})/g)].at(-1),match=western||roc;
 if(match){const year=western?Number(match[1]):Number(match[1])+1911;return year+'-'+String(match[2]).padStart(2,'0')+'-'+String(match[3]).padStart(2,'0')}
 const short=value.match(/(\d{1,2})月(\d{1,2})日/);if(short){const year=Number((fallback||new Date().toISOString()).slice(0,4));return year+'-'+String(short[1]).padStart(2,'0')+'-'+String(short[2]).padStart(2,'0')}
 return String(fallback||'').slice(0,10);
}
function blockStatus90(block,city,district){
 const plain=text90(block),areas=[...block.matchAll(/<(?:\w+:)?areaDesc\b[^>]*>([\s\S]*?)<\/(?:\w+:)?areaDesc>/gi)].map(x=>text90(x[1])),scope=(areas.join(' ')+' '+plain),mentionsCity=scope.includes(city),mentionsDistrict=scope.includes(district),citywide=areas.some(x=>x===city||x.includes(city+'全市'))||new RegExp(city+'(?:全市)?(?:於[^，。]{0,8})?(?:停止上班|停班)').test(plain);
 if(!mentionsCity||!mentionsDistrict&&!citywide)return null;
 const onlySchool=scope.includes('停止上課')&&!scope.includes('停止上班'),open=/照常上班|正常上班|未達停止上班|不停止上班/.test(scope),closed=!onlySchool&&/停止上班|停班/.test(scope);
 if(!closed&&!open&&!/Cancel|取消|撤銷/i.test(block))return null;
 const sent=tag90(block,'sent')||tag90(block,'updated')||tag90(block,'pubDate'),headline=tag90(block,'headline')||tag90(block,'title'),identifier=tag90(block,'identifier')||tag90(block,'id')||headline+':'+sent;
 return{status:closed&&!open?'closed':'open',sourceId:identifier.slice(0,300),effectiveDate:date90(scope,sent),announcedAt:sent,headline:headline||plain.slice(0,120),detail:plain.slice(0,2000),city,district};
}
export function parseClosureFeed90(xml,city='高雄市',district='左營區'){
 if(typeof xml!=='string'||xml.length>1500000)throw Error('停班公告格式不正確');
 const blocks=[...xml.matchAll(/<(?:\w+:)?(?:alert|entry|item)\b[^>]*>[\s\S]*?<\/(?:\w+:)?(?:alert|entry|item)>/gi)].map(x=>x[0]);if(!blocks.length)blocks.push(xml);
 const candidates=blocks.map(block=>blockStatus90(block,city,district)).filter(Boolean);return candidates.sort((a,b)=>String(b.announcedAt).localeCompare(String(a.announcedAt)))[0]||{status:'unknown',sourceId:'',effectiveDate:'',announcedAt:'',headline:'',detail:'',city,district};
}
export function closureDateActive901(result,day){
 const effective=String(result?.effectiveDate||'').slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(effective)||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const tomorrow=new Date(day+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
 return effective===day||effective===tomorrow.toISOString().slice(0,10);
}
export function closureStateChanged902(result,previous){
 return result?.status!=='unknown'&&(result?.status!==previous?.status||result?.effectiveDate!==previous?.effective_date);
}
export async function fetchClosureStatus90(city='高雄市',district='左營區',fetcher=fetch){
 const response=await fetcher(closureFeed90,{signal:AbortSignal.timeout(9000),headers:{Accept:'application/atom+xml, application/xml, text/xml'}});if(!response.ok)throw Error('官方停班資料暫時無法讀取');const xml=await response.text();if(xml.length>1500000)throw Error('官方停班資料過大');
 let result=parseClosureFeed90(xml,city,district);if(result.status!=='unknown')return result;
 const links=[...xml.matchAll(/(?:href=["']|<link>)(https:\/\/alerts\.ncdr\.nat\.gov\.tw\/[^"'<\s]+)/gi)].map(x=>x[1].replaceAll('&amp;','&')).slice(0,8);
 for(const url of links){try{const detail=await fetcher(url,{signal:AbortSignal.timeout(7000)});if(!detail.ok)continue;const parsed=parseClosureFeed90(await detail.text(),city,district);if(parsed.status!=='unknown'&&(!result.announcedAt||parsed.announcedAt>result.announcedAt))result=parsed}catch{}}
 return result;
}
