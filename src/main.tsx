import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {blankSegment,blankTicket,bounds,id,parseLink,times,total,validate,setDayText,type Option,type Ticket,type Segment} from './model';
import {DayTimeline} from './DayTimeline';
import {parseFlightImport} from './flight-import';
import './style.css';
const KEY='wayline.v1';
const VIEW_KEY='wayline.view';
const DAY=86400000;
const DAYS_PER_WEEK=7;
function load():Option[]{try {const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(v)||v.some(o=>typeof o.name!=='string'||!Array.isArray(o.tickets)||o.tickets.some((t:Ticket)=>!Array.isArray(t.segments))))throw Error();return v;}catch{return [];}}
const money=(n:number,c:string)=>new Intl.NumberFormat('en',{style:'currency',currency:c,maximumFractionDigits:0}).format(n);
const date=(n:number,calendar:boolean)=>new Date(n).toLocaleDateString('en',{weekday:calendar?'short':undefined,month:'short',day:'numeric',timeZone:'UTC'});
function App(){
 const [options,setOptions]=useState<Option[]>(load),[editor,setEditor]=useState<{option:string,ticket:Ticket}|null>(null),[error,setError]=useState(''),[storageError,setStorageError]=useState(''),[zoom,setZoom]=useState(1),[siteText,setSiteText]=useState(''),[importNotice,setImportNotice]=useState('');
 const [calendar,setCalendar]=useState(()=>{
  try{return localStorage.getItem(VIEW_KEY)==='calendar';}catch{return false;}
 });
 function toggleCalendar(){
  setCalendar(!calendar);
  try{localStorage.setItem(VIEW_KEY,calendar?'timeline':'calendar');}catch{/* The view can still be changed for this session. */}
 }
 function update(next:Option[]){setOptions(next);try{localStorage.setItem(KEY,JSON.stringify(next));setStorageError('');}catch{setStorageError('Could not save to this browser. Your changes are only kept until this page closes.');}}
 function addOption(){const o={id:id(),name:`Option ${options.length+1}`,tickets:[]};update([...options,o]);}
 function open(option:string,ticket=blankTicket()){setError('');setSiteText('');setImportNotice('');setEditor({option,ticket:structuredClone(ticket)});}
 function readLink(){
  if(!editor)return;
  try{
   const ticket={...parseLink(editor.ticket.url),id:editor.ticket.id};
   setEditor({...editor,ticket});setError('');setImportNotice('Read available cities, date and price from the link. Use the extension or paste flight details to import the schedule.');
  }catch{setError('Enter a valid http or https flight link.');}
 }
 function patch(p:Partial<Ticket>){if(editor)setEditor({...editor,ticket:{...editor.ticket,...p}});}
 function segment(i:number,p:Partial<Segment>){if(editor)patch({segments:editor.ticket.segments.map((s,j)=>i===j?{...s,...p}:s)});}
 function save(e:React.FormEvent){e.preventDefault();if(!editor)return;const err=validate(editor.ticket);if(err){setError(err);return;}update(options.map(o=>o.id!==editor.option?o:{...o,tickets:[...o.tickets.filter(t=>t.id!==editor.ticket.id),editor.ticket]}));setEditor(null);}
 const {start,end}=bounds(options),days=(end-start)/DAY,dayWidth=480*zoom;
 const daysPerRow=calendar?DAYS_PER_WEEK:days;
 const columns=Math.min(days,daysPerRow);
 const rows=Array.from({length:Math.ceil(days/daysPerRow)},(_,i)=>({
  start:start+i*daysPerRow*DAY,
  days:Math.min(daysPerRow,days-i*daysPerRow),
 }));
 return <><header><a className="brand" href="./">wayline<span className="brand-divider"/> <small>Travel planner</small></a><span className="local">Saved on this device</span></header>
 <main><div className="intro"><div><h1>Flight plans</h1><p>Compare flight options and plan your days.</p></div><button className="primary" onClick={addOption}>+ Add option</button></div>
 {storageError&&<p role="alert" className="error">{storageError}</p>}
 <section className="board"><div className="board-toolbar"><div><strong>Itineraries</strong><span className="count">{options.length} {options.length===1?'option':'options'}</span></div><div className="tools"><span>Local airport times</span>
 <button type="button" aria-pressed={calendar} onClick={toggleCalendar}>Calendar view</button>
 {!calendar&&<><button onClick={()=>setZoom(Math.max(.5,zoom-.5))} aria-label="Zoom out">−</button><button onClick={()=>setZoom(zoom+.5)} aria-label="Zoom in">＋</button><button onClick={()=>setZoom(1)}>Reset</button></>}
 </div></div>
 <div className="scroll"><div className={calendar?'board-inner calendar-board':'board-inner'} style={{minWidth:`calc(var(--label-width) + ${calendar?columns*128:days*dayWidth}px)`}}>
 {rows.map((row,index)=>{
  const calendarWidth=calendar?`calc((100% - var(--label-width)) * ${row.days/columns})`:undefined;
  const width=calendarWidth??row.days*dayWidth;
  const columnWidth=calendar?`${100/row.days}%`:dayWidth;
  return <div className="board-row" key={index}>
   <div className="axis"><div className="axis-label">{index===0&&'Option'}</div><div className="day-axis" style={{width}}>
    {Array.from({length:row.days},(_,i)=><div className="day-header" key={i} style={{width:columnWidth}}><strong>{date(row.start+i*DAY,calendar)}</strong>
     <div className="hour-ruler">{Array.from({length:24},(_,hour)=>{
      const labelled=hour%(calendar?6:3)===0;
      return <span key={hour} style={{left:`${hour/24*100}%`}} className={labelled?'labelled-hour':''}>{labelled?String(hour).padStart(2,'0')+':00':''}</span>;
     })}</div>
    </div>)}
   </div></div>
   {options.map((o,optionIndex)=>{
    const sums=total(o.tickets);
    return <DayTimeline key={o.id} tickets={o.tickets} start={row.start} days={row.days}
     calendarWidth={calendarWidth} dayWidth={dayWidth} showPending={index===0}
     color={optionIndex%3} dayNotes={o.dayNotes} dayTexts={o.dayTexts}
     onNoteChange={(date,text)=>update(options.map(x=>x.id===o.id?setDayText(x,date,text):x))}
     onOpen={t=>open(o.id,t)}
     summary={<div className="option-label">
      <div className="option-number">{String(optionIndex+1).padStart(2,'0')}</div>
      <input aria-label={`Option ${optionIndex+1} name`} value={o.name} onChange={e=>update(options.map(x=>x.id===o.id?{...x,name:e.target.value}:x))}/>
      <div className="prices">{Object.entries(sums.currencies).map(([c,n])=><span key={c}>{money(n,c)} </span>)}{sums.incomplete&&<small> · incomplete price</small>}</div>
      <div className="row-actions">
       <button onClick={()=>open(o.id)}>+ Add ticket</button>
       <button className="quiet" aria-label={`Delete ${o.name}`} onClick={()=>{if(confirm(`Delete ${o.name} and its tickets?`))update(options.filter(x=>x.id!==o.id));}}>Delete</button>
      </div>
     </div>}/>;
   })}
  </div>;
 })}
 {!options.length&&<div className="empty"><h2>No trip options yet.</h2><p>Add an option to compare flights and plan each day.</p><button onClick={addOption}>+ Add an option</button></div>}
 </div></div><footer className="board-footer"><span><b className="legend"/> Flight <span className="line-legend"/> Connection</span>{!calendar&&<span>Scroll to explore your travel dates</span>}</footer></section>
 <div className="notes"><span>Group outbound and return tickets in the same option.</span><span>Day notes save automatically.</span></div></main>
 {editor&&<div className="backdrop"><section className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title"><div className="editor-head"><div><div className="eyebrow">{options.find(o=>o.id===editor.option)?.name}</div><h2 id="editor-title">Ticket details</h2></div><button aria-label="Close editor" onClick={()=>setEditor(null)}>✕</button></div><form onSubmit={save}><label>Flight link (optional)<div className="import"><input type="url" placeholder="Paste a Trip.com or other flight link" value={editor.ticket.url} onChange={e=>patch({url:e.target.value})}/><button type="button" onClick={readLink}>Read link</button></div></label><p className="hint">For exact times, open the itinerary on Trip.com and use the Wayline extension’s Copy itinerary button. Paste the capture below. Links alone may contain only cities, date and price.</p>
 {editor.ticket.departureDate&&<p className="hint">Departure date: <strong>{editor.ticket.departureDate}</strong>. Check this date against the imported flights.</p>}
 {importNotice&&<p className="import-notice" role="status">{importNotice}</p>}
 <details className="manual-import" open={!!error||!editor.ticket.url}><summary>Import flight details</summary><p className="hint">Paste an extension capture or the expanded itinerary, including airport codes and dates. No URL is required. Add a departure date below if missing.</p><label>Flight details or extension capture<textarea rows={6} value={siteText} onChange={e=>setSiteText(e.target.value)} placeholder="07:25 CKG … MU5424 … 10:00 PVG …"/></label><label>Departure date (if missing from text)<input type="date" value={editor.ticket.departureDate||''} onChange={e=>patch({departureDate:e.target.value})}/></label><button type="button" disabled={!siteText.trim()} onClick={()=>{try{const t=parseFlightImport(siteText,editor.ticket.url,editor.ticket.departureDate);patch({...t,id:editor.ticket.id,price:editor.ticket.price||t.price,currency:editor.ticket.price||!t.price?editor.ticket.currency:t.currency});setError('');setImportNotice(`Parsed ${t.segments.length} flights. Review inferred dates and UTC offsets before saving.`);setSiteText('');}catch(e){setError(e instanceof Error?e.message:'Could not parse the itinerary.');}}}>Import details</button></details>
 <div className="price-fields"><label>Ticket price<input type="number" min="0" step="0.01" placeholder="Unknown" value={editor.ticket.price} onChange={e=>patch({price:e.target.value})}/></label><label>Currency<select value={editor.ticket.currency} onChange={e=>patch({currency:e.target.value})}>{[...new Set(['RUB','USD','EUR','CNY','AMD','GEL','GBP',editor.ticket.currency])].map(c=><option key={c}>{c}</option>)}</select></label></div>
 {editor.ticket.segments.map((s,i)=><fieldset key={s.id}><legend>Flight {i+1}</legend><div className="segment-fields"><label>From city / airport<input required value={s.from} onChange={e=>segment(i,{from:e.target.value})} placeholder="CKG / Chongqing"/></label><label>To city / airport<input required value={s.to} onChange={e=>segment(i,{to:e.target.value})} placeholder="SHA / Shanghai"/></label><label>Departure · local<input type="datetime-local" value={s.departure} onChange={e=>segment(i,{departure:e.target.value})}/></label><label>Arrival · local<input type="datetime-local" value={s.arrival} onChange={e=>segment(i,{arrival:e.target.value})}/></label><label>Departure UTC offset<select value={s.departureOffset} onChange={e=>segment(i,{departureOffset:e.target.value})}>{offsets.map(v=><option key={v}>{v}</option>)}</select></label><label>Arrival UTC offset<select value={s.arrivalOffset} onChange={e=>segment(i,{arrivalOffset:e.target.value})}>{offsets.map(v=><option key={v}>{v}</option>)}</select></label><label>Flight number<input value={s.flight} onChange={e=>segment(i,{flight:e.target.value})} placeholder="MU5424"/></label><button type="button" disabled={editor.ticket.segments.length===1} onClick={()=>patch({segments:editor.ticket.segments.filter(x=>x.id!==s.id)})}>Remove flight</button></div></fieldset>)}
 <button type="button" onClick={()=>patch({segments:[...editor.ticket.segments,blankSegment()]})}>＋ Add connecting flight</button>{error&&<p className="error" role="alert">{error}</p>}<div className="editor-footer"><div>{editor.ticket.url&&/^https?:/.test(editor.ticket.url)&&<a href={editor.ticket.url} target="_blank" rel="noreferrer">Open source ↗</a>} {options.find(o=>o.id===editor.option)?.tickets.some(t=>t.id===editor.ticket.id)&&<button type="button" onClick={()=>{update(options.map(o=>o.id===editor.option?{...o,tickets:o.tickets.filter(t=>t.id!==editor.ticket.id)}:o));setEditor(null);}}>Delete ticket</button>}</div><button className="primary" type="submit">Save ticket</button></div></form></section></div>}
 </>;
}
const offsets=Array.from({length:105},(_,i)=>{const n=i*15-720;return `${n<0?'-':'+'}${String(Math.floor(Math.abs(n)/60)).padStart(2,'0')}:${String(Math.abs(n)%60).padStart(2,'0')}`;});
createRoot(document.getElementById('root')!).render(<App/>);
