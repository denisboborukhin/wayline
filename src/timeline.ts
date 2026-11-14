import {times,boardTimes,type Segment,type Ticket} from './model.ts';
const DAY=86400000;
export function layoutTickets(tickets:Ticket[]){
 const flights:{s:Segment;t:Ticket;lane:number}[]=[];
 const connections:{id:string;from:number;to:number;lane:number;duration:number}[]=[];
 const laneEnds:number[]=[];
 const groups=tickets.map(t=>{
  const complete=t.segments.filter(s=>times(s).every(Number.isFinite));
  return {t,complete,start:Math.floor(Math.min(...complete.map(s=>boardTimes(s)[0]))/DAY)*DAY,end:Math.ceil(Math.max(...complete.flatMap(boardTimes))/DAY)*DAY};
 }).filter(g=>g.complete.length).sort((a,b)=>a.start-b.start);
 for(const {t,complete,start,end} of groups){
  let lane=laneEnds.findIndex(last=>last<=start);
  if(lane===-1)lane=laneEnds.length;
  laneEnds[lane]=Math.max(start+DAY,end);
  flights.push(...complete.map(s=>({s,t,lane})));
  // Only consecutive flights belonging to this ticket form a connection.
  for(let i=1;i<t.segments.length;i++){
   const previous=times(t.segments[i-1]),next=times(t.segments[i]);
   const from=boardTimes(t.segments[i-1])[1],to=boardTimes(t.segments[i])[0];
   if([...previous,...next].every(Number.isFinite)&&next[0]>previous[1]&&to>from)connections.push({id:t.segments[i].id,from,to,lane,duration:next[0]-previous[1]});
  }
 }
 return {flights,connections,laneCount:laneEnds.length};
}
export function dayEvents(tickets:Ticket[]){
 const days:Record<string,{id:string;text:string;local:string;offset:string;stamp:number;t:Ticket}[]>={};
 for(const t of tickets)for(const s of t.segments){
  const stamps=times(s);
  for(const [i,name,local,offset] of [[0,s.from,s.departure,s.departureOffset],[1,s.to,s.arrival,s.arrivalOffset]] as const){
   if(!Number.isFinite(stamps[i])||!name.trim())continue;
   const city=(name.includes(' · ')?name.split(' · ').slice(1).join(' · '):name).trim();
   const date=local.slice(0,10);
   (days[date]??=[]).push({id:s.id+'-'+i,text:`${city}: ${i===0?'departure':'arrival'} at ${local.slice(11)}`,local,offset,stamp:stamps[i],t});
  }
 }
 for(const events of Object.values(days))events.sort((a,b)=>a.stamp-b.stamp);
 return days;
}

export function dayNoteText(lines:string[],saved:string|undefined,legacy=''){
 return saved!==undefined?saved:[lines.join('\n'),legacy].filter(Boolean).join('\n\n');
}
export function insertFlightInfo(text:string,lines:string[]){
 const existing=new Set(text.split('\n').map(line=>line.trim()));
 const missing=lines.filter(line=>!existing.has(line.trim()));
 return missing.length?text+(text&&!text.endsWith('\n')?'\n':'')+missing.join('\n'):text;
}
