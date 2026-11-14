import {airports} from './airports.ts';
import {blankSegment,blankTicket,parseLink,validate,type Segment,type Ticket} from './model.ts';
const months=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const pad=(n:number)=>String(n).padStart(2,'0');
export function offsetAt(local:string,zone:string):string {
 const nominal=Date.parse(local+'Z');
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const candidates=new Set<number>();
 for(const delta of [-86400000,0,86400000]){
  const instant=nominal+delta;
  const p=Object.fromEntries(formatter.formatToParts(instant).map(x=>[x.type,x.value]));
  const offset=(Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}Z`)-instant)/60000;
  const actual=nominal-offset*60000;
  const q=Object.fromEntries(formatter.formatToParts(actual).map(x=>[x.type,x.value]));
  if(`${q.year}-${q.month}-${q.day}T${q.hour}:${q.minute}`===local)candidates.add(offset);
 }
 if(candidates.size!==1)throw Error('A local time is ambiguous or invalid at a daylight-saving transition. Enter this flight manually.');
 const n=[...candidates][0];return `${n<0?'-':'+'}${pad(Math.floor(Math.abs(n)/60))}:${pad(Math.abs(n)%60)}`;
}
// Parses the rendered Russian Trip.com itinerary, not passenger or contact forms.
export function parseSiteText(text:string,url='',departureDate=''):Ticket {
 let ticket:Ticket;
 try{ticket=url.trim()?parseLink(url):blankTicket();}catch{ticket=blankTicket();}
 const matches=[...text.replace(/\u00a0/g,' ').matchAll(/(?:(\d{1,2})\s+(янв\S*|фев\S*|мар\S*|апр\S*|мая|июн\S*|июл\S*|авг\S*|сен\S*|окт\S*|ноя\S*|дек\S*)\s+(?:(\d{4})\s*(?:г\.)?\s*)?)?(\d{1,2}:\d{2})\s+([A-Z]{3})\b/g)];
 if(matches.length<2||matches.length%2)throw Error('No complete itinerary found. Expand the flight details and copy all flights, including the airport codes and next-day date labels.');
 const header=text.slice(0,matches[0].index!+matches[0][0].length);
 const iso=header.match(/\b(\d{4}-\d{2}-\d{2})\b/);
 const written=header.match(/\b(\d{1,2})\s+(янв\S*|фев\S*|мар\S*|апр\S*|мая|июн\S*|июл\S*|авг\S*|сен\S*|окт\S*|ноя\S*|дек\S*)\s+(\d{4})\b/i);
 const textDate=iso?.[1]||(written?`${written[3]}-${pad(months.indexOf(written[2].slice(0,3).toLowerCase())+1)}-${pad(Number(written[1]))}`:'');
 const selectedDate=departureDate||textDate||ticket.departureDate||'';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)||!Number.isFinite(Date.parse(selectedDate))||new Date(selectedDate).toISOString().slice(0,10)!==selectedDate)throw Error('Choose a departure date below, or include a full departure date with year in the pasted details.');
 ticket.departureDate=selectedDate;
 let day=selectedDate,previous=-Infinity;
 const events=matches.map(m=>{
  const airport=airports[m[5]];
  if(!airport)throw Error(`Unknown airport ${m[5]}; enter its times and UTC offsets manually.`);
  if(m[1]){
   const month=months.indexOf(m[2].slice(0,3).toLowerCase());
   let year=m[3]?Number(m[3]):Number(day.slice(0,4));
   if(!m[3]&&month+1<Number(day.slice(5,7)))year++;
   day=`${year}-${pad(month+1)}-${pad(Number(m[1]))}`;
  }
  const clock=m[4].padStart(5,'0');let local=day+'T'+clock;
  let offset=offsetAt(local,airport[1]),stamp=Date.parse(local+offset);
  if(stamp<previous&&!m[1]){
   day=new Date(Date.parse(day+'T00:00Z')+86400000).toISOString().slice(0,10);
   local=day+'T'+clock;offset=offsetAt(local,airport[1]);stamp=Date.parse(local+offset);
  }
  if(stamp<previous)throw Error('The flight dates are not chronological. Check the copied itinerary.');
  previous=stamp;
  return {local,offset,stamp,code:m[5],name:`${m[5]} · ${airport[0]}`,index:m.index!,end:m.index!+m[0].length};
 });
 const segments:Segment[]=[];
 for(let i=0;i<events.length;i+=2){
  const d=events[i],a=events[i+1];
  const content=text.slice(d.end,a.index);
  const flight=content.match(/\b([A-Z0-9]{2})\s?(\d{2,4})\b/);
  const duration=content.match(/Продолжительность перелета:\s*(?:(\d+)\s*ч)?\s*(?:(\d+)\s*мин)?/i);
  if(duration&&(duration[1]||duration[2])&&Math.round((a.stamp-d.stamp)/60000)!==Number(duration[1]||0)*60+Number(duration[2]||0))throw Error('Flight duration does not match the parsed dates. Enter the dates manually.');
  segments.push({...blankSegment(),from:d.name,to:a.name,flight:flight?flight[1]+flight[2]:'',departure:d.local,arrival:a.local,departureOffset:d.offset,arrivalOffset:a.offset});
 }
 const duration=text.match(/Продолжительность:\s*(?:(\d+)\s*ч)?\s*(?:(\d+)\s*мин)?/i);
 if(duration&&(duration[1]||duration[2])&&Math.round((events.at(-1)!.stamp-events[0].stamp)/60000)!==Number(duration[1]||0)*60+Number(duration[2]||0))throw Error('The copied itinerary is incomplete or its dates do not match the total duration.');
 ticket.segments=segments;
 const error=validate(ticket);if(error)throw Error(error);
 return ticket;
}
