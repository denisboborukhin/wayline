import type {ReactNode} from 'react';
import {layoutTickets,dayEvents,dayNoteText,insertFlightInfo} from './timeline';
import {times,boardTimes,type Ticket} from './model';
const DAY=86400000;
const duration=(ms:number)=>`${Math.floor(ms/3600000)}h ${Math.round(ms/60000)%60}m`;
export function DayTimeline({tickets,start,days,dayWidth,color,onOpen,summary,dayNotes={},dayTexts={},onNoteChange}:{tickets:Ticket[];start:number;days:number;dayWidth:number;color:number;onOpen:(ticket:Ticket)=>void;summary?:ReactNode;dayNotes?:Record<string,string>;dayTexts?:Record<string,string>;onNoteChange:(date:string,text:string)=>void}){
 const {flights,connections,laneCount}=layoutTickets(tickets);
 const eventsByDay=dayEvents(tickets);
 const position=(n:number)=>(n-start)/DAY*dayWidth;
 const width=days*dayWidth;
 const backgroundSize=`${dayWidth}px 100%, ${dayWidth/4}px 100%, ${dayWidth/24}px 100%`;
 return <div className="option-section">
 <div className="option-flight-row">{summary||<div className="option-label"/>}<div className="day-track" style={{width,paddingTop:Math.max(28,laneCount*20+8),backgroundSize}}>
 {connections.map(c=><div key={'gap'+c.id} className="connection day-connection" style={{top:13+c.lane*20,left:position(c.from),width:position(c.to)-position(c.from)}} title={`${duration(c.duration)} layover`}/>)}
 {flights.map(({s,t,lane})=>{const [d,a]=boardTimes(s),actual=times(s);return <button key={s.id} className={`flight-box color-${color}`} style={{top:6+lane*20,left:position(d),width:Math.max(3,position(a)-position(d))}} onClick={()=>onOpen(t)} aria-label={`${s.flight||'Flight'}: ${s.from} to ${s.to}, ${s.departure.slice(11)}–${s.arrival.slice(11)} local`} title={`${s.flight} · ${s.from} → ${s.to} · ${s.departure} (UTC${s.departureOffset}) → ${s.arrival} (UTC${s.arrivalOffset}) · ${duration(actual[1]-actual[0])}`}><span>{s.flight||'Flight'}</span></button>;})}
 {(!tickets.length||tickets.some(t=>t.segments.some(s=>!times(s).every(Number.isFinite))))&&<div className="pending">{tickets.filter(t=>t.segments.some(s=>!times(s).every(Number.isFinite))).map(t=><button key={t.id} onClick={()=>onOpen(t)}>{t.segments.map(s=>s.from||'…').join(' → ')} → {t.segments.at(-1)?.to||'…'} <span>Needs details ↗</span></button>)}{!tickets.length&&<span>Add a ticket to see this route.</span>}</div>}
 </div></div>
 <div className="day-notes-row"><div className="day-notes-label">Day plan</div><div className="day-boxes" style={{width}}>
 {Array.from({length:Math.ceil(days)},(_,i)=>{
  const date=new Date(start+i*DAY).toISOString().slice(0,10);
  const label=new Date(date+'T00:00Z').toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  return <section className="day-note-box" key={date} style={{width:dayWidth}} aria-label={label}>
   <textarea aria-label={`Notes for ${date}`} placeholder="Write your day plan…" value={dayNoteText((eventsByDay[date]||[]).map(e=>e.text),dayTexts[date],dayNotes[date])} onChange={e=>onNoteChange(date,e.target.value)}/>
   <div className="day-box-actions"><button type="button" disabled={!eventsByDay[date]?.length} onClick={()=>onNoteChange(date,insertFlightInfo(dayNoteText((eventsByDay[date]||[]).map(e=>e.text),dayTexts[date],dayNotes[date]),(eventsByDay[date]||[]).map(e=>e.text)))}>Insert flight info</button></div>
  </section>;
 })}
 </div></div>
 </div>;
}
