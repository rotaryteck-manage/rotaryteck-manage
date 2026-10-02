// 行政院人事行政總處開放資料，115/116 年辦公日曆表。
const governmentHolidayFiles60={
  2026:'https://www.dgpa.gov.tw/FileConversion?filename=dgpa%2Ffiles%2F202506%2Fa52331bd-a189-466b-b0f0-cae3062bbf74.csv&name=115.csv&nfix=',
  2027:'https://www.dgpa.gov.tw/FileConversion?filename=dgpa%2Ffiles%2F202607%2Ff538b1ff-ba60-4c63-9477-10db8e6612d1.csv&name=116.csv&nfix='
};
function holidayCSV60(value){const lines=[],row=[];let field='',quoted=false;for(let i=0;i<value.length;i++){const c=value[i];if(c==='"'){if(quoted&&value[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field.trim());field=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&value[i+1]==='\n')i++;row.push(field.trim());if(row.some(Boolean))lines.push([...row]);row.length=0;field=''}else field+=c}row.push(field.trim());if(row.some(Boolean))lines.push(row);return lines}
export function parseGovernmentHolidays60(csv,year){const rows=holidayCSV60(csv.replace(/^\ufeff/,'')),header=rows.shift()?.map(s=>s.replace(/^\ufeff/,'').trim())||[],dayIndex=header.findIndex(v=>v.includes('西元日期')),offIndex=header.findIndex(v=>v.includes('是否放假')),noteIndex=header.findIndex(v=>v.includes('備註'));if(dayIndex<0||offIndex<0)throw Error('政府日曆格式已更改');const dates={};for(const row of rows){const digits=String(row[dayIndex]||'').replace(/\D/g,''),day=digits.length===8?digits.slice(0,4)+'-'+digits.slice(4,6)+'-'+digits.slice(6):'';if(!day.startsWith(year+'-'))continue;const note=String(row[noteIndex]||'').trim();dates[day]={off:String(row[offIndex]).trim()==='2',name:note.length<=100?note:''}}if(Object.keys(dates).length<360)throw Error('政府日曆內容不完整');return dates}
async function discoverGovernmentHolidayFile60(year){const r=await fetch('https://data.gov.tw/dataset/14718',{signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error('找不到年度日曆來源');const html=await r.text();if(html.length>600000)throw Error('政府資料頁格式不正確');const roc=year-1911;for(const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[^<]*CSV[^<]*<\/a>([^<]{0,150})/gi)){if(!match[2].includes(roc+'年')||match[2].includes('Google'))continue;const u=new URL(match[1].replaceAll('&amp;','&'),'https://data.gov.tw');if(u.hostname==='www.dgpa.gov.tw'&&u.pathname==='/FileConversion')return u.href}throw Error('政府尚未發布此年度日曆')}
export function namedGovernmentHoliday60(value){const name=String(value?.name||'').trim();return Boolean(value?.off&&name&&!/^(星期[六日]|週[六日]|休息日|例假日)$/.test(name))}
export async function governmentHolidayData60(year,base='https://rotaryteck.invalid'){
 const cache=globalThis.caches?.default,cacheKey=new Request(new URL('/official-holidays?year='+year,base)),cached=await cache?.match(cacheKey);if(cached)return cached.json();
 const url=governmentHolidayFiles60[year]||await discoverGovernmentHolidayFile60(year),remote=await fetch(url,{signal:AbortSignal.timeout(9000)});if(!remote.ok)throw Error('政府日曆暫時無法讀取');const bytes=await remote.arrayBuffer();if(bytes.byteLength>200000)throw Error('政府日曆檔案過大');let csv=new TextDecoder('utf-8').decode(bytes);if(csv.includes('\ufffd'))csv=new TextDecoder('big5').decode(bytes);const result={year,dates:parseGovernmentHolidays60(csv,year),available:true},response=Response.json(result,{headers:{'Cache-Control':'public, max-age=86400'}});await cache?.put(cacheKey,response.clone());return result;
}
export async function holidayApi60(request,env){
 const year=Number(new URL(request.url).searchParams.get('year'));if(request.method!=='GET')return Response.json({error:'不支援的操作'},{status:405});if(!Number.isInteger(year)||year<2020||year>2100)return Response.json({error:'年份不正確'},{status:400});
 try{
  const result=await governmentHolidayData60(year,request.url),dates={...result.dates};
  if(env?.DB)try{
   const rows=await env.DB.prepare("SELECT effective_date,detail FROM notification_source_state90 WHERE status='closed' AND effective_date>=? AND effective_date<=?").bind(year+'-01-01',year+'-12-31').all();
   for(const row of rows.results||[]){let detail={};try{detail=JSON.parse(row.detail||'{}')}catch{}dates[row.effective_date]={off:true,name:(detail.city||'高雄市')+(detail.district||'左營區')+'停班'};}
  }catch{}
  return Response.json({year,dates,available:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({year,dates:{},available:false},{headers:{'Cache-Control':'no-store'}})}
}
