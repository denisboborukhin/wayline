import type {ReactNode} from 'react';
import {layoutTickets,dayEvents,dayNoteText,insertFlightInfo} from './timeline';
import {times,boardTimes,type Ticket} from './model';
const DAY=86400000;
const duration=(ms:number)=>`${Math.floor(ms/3600000)}h ${Math.round(ms/60000)%60}m`;
export function DayTimeline({tickets,start,days,dayWidth,calendarWidth,showPending=true,color,onOpen,summary,dayNotes={},dayTexts={},onNoteChange}:{tickets:Ticket[];start:number;days:number;dayWidth:number;calendarWidth?:string;showPending?:boolean;color:number;onOpen:(ticket:Ticket)=>void;summary?:ReactNode;dayNotes?:Record<string,string>;dayTexts?:Record<string,string>;onNoteChange:(date:string,text:string)=>void}){
 const {flights,connections,laneCount}=layoutTickets(tickets);
 const eventsByDay=dayEvents(tickets);
 const end=start+days*DAY;
 const width=calendarWidth??days*dayWidth;
 const unit=calendarWidth?'%':'px',scale=calendarWidth?100/days:dayWidth;
 const position=(n:number)=>(n-start)/DAY*scale;
 const backgroundSize=`${scale}${unit} 100%, ${scale/4}${unit} 100%, ${scale/24}${unit} 100%`;
 function range(from:number,to:number){
  if((from<start&&to<=start)||from>=end)return null;
  const left=position(Math.max(start,from));
  return {left:`${left}${unit}`,width:`${position(Math.min(end,to))-left}${unit}`};
 }
 return <div className="option-section">
 <div className="option-flight-row">{summary||<div className="option-label"/>}<div className="day-track" style={{width,paddingTop:Math.max(28,laneCount*20+8),backgroundSize}}>
 {connections.map(c=>{
  const span=range(c.from,c.to);
  return span&&<div key={'gap'+c.id} className="connection day-connection" style={{top:13+c.lane*20,...span}} title={`${duration(c.duration)} layover`}/>;
 })}
 {flights.map(({s,t,lane})=>{
  const [d,a]=boardTimes(s),actual=times(s),span=range(Math.min(d,a),Math.max(d,a));
  return span&&<button key={s.id} className={`flight-box color-${color}`} style={{top:6+lane*20,...span}} onClick={()=>onOpen(t)} aria-label={`${s.flight||'Flight'}: ${s.from} to ${s.to}, ${s.departure.slice(11)}–${s.arrival.slice(11)} local`} title={`${s.flight} · ${s.from} → ${s.to} · ${s.departure} (UTC${s.departureOffset}) → ${s.arrival} (UTC${s.arrivalOffset}) · ${duration(actual[1]-actual[0])}${a<d?' · Arrival uses an earlier local date or time.':''}`}><span>{a<d?'← ':''}{s.flight||'Flight'}</span></button>;
 })}
 {showPending&&(!tickets.length||tickets.some(t=>t.segments.some(s=>!times(s).every(Number.isFinite))))&&<div className="pending">{tickets.filter(t=>t.segments.some(s=>!times(s).every(Number.isFinite))).map(t=><button key={t.id} onClick={()=>onOpen(t)}>{t.segments.map(s=>s.from||'…').join(' → ')} → {t.segments.at(-1)?.to||'…'} <span>Needs details ↗</span></button>)}{!tickets.length&&<span>Add a ticket to see this route.</span>}</div>}
 </div></div>
 <div className="day-notes-row"><div className="day-notes-label">Day plan</div><div className="day-boxes" style={{width}}>
 {Array.from({length:Math.ceil(days)},(_,i)=>{
  const date=new Date(start+i*DAY).toISOString().slice(0,10);
  const label=new Date(date+'T00:00Z').toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  return <section className="day-note-box" key={date} style={{width:calendarWidth?`${scale}%`:dayWidth}} aria-label={label}>
   <textarea aria-label={`Notes for ${date}`} placeholder="Write your day plan…" value={dayNoteText((eventsByDay[date]||[]).map(e=>e.text),dayTexts[date],dayNotes[date])} onChange={e=>onNoteChange(date,e.target.value)}/>
   <div className="day-box-actions"><button type="button" disabled={!eventsByDay[date]?.length} onClick={()=>onNoteChange(date,insertFlightInfo(dayNoteText((eventsByDay[date]||[]).map(e=>e.text),dayTexts[date],dayNotes[date]),(eventsByDay[date]||[]).map(e=>e.text)))}>Insert flight info</button></div>
  </section>;
 })}
 </div></div>
 </div>;
}
