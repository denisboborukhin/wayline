export type Segment = { id:string; from:string; to:string; flight:string; departure:string; arrival:string; departureOffset:string; arrivalOffset:string };
export type Ticket = { id:string; url:string; price:string; currency:string; departureDate?:string; segments:Segment[] };
export type Option = { id:string; name:string; tickets:Ticket[]; dayNotes?:Record<string,string>; dayTexts?:Record<string,string> };
export const id = () => crypto.randomUUID();
export const blankSegment = ():Segment => ({id:id(),from:'',to:'',flight:'',departure:'',arrival:'',departureOffset:'+00:00',arrivalOffset:'+00:00'});
export const blankTicket = ():Ticket => ({id:id(),url:'',price:'',currency:'RUB',segments:[blankSegment()]});
export function parseLink(raw:string):Ticket {
 const url = new URL(raw);
 if (!['http:','https:'].includes(url.protocol)) throw Error('Use an http or https flight link.');
 const t = blankTicket(); t.url=url.href;
 if (!(url.hostname==='trip.com'||url.hostname.endsWith('.trip.com'))) return t;
 const p=url.searchParams; t.currency=/^[A-Z]{3}$/.test(p.get('curr')||'')?p.get('curr')!:'RUB';
 const price=p.get('midSelectPrice')||'';
 if (/^\d+(?:\.\d{1,2})?$/.test(price)&&Number.isFinite(Number(price))) t.price=price;
 const departureDate=p.get('ddate')||'';
 if (/^\d{4}-\d{2}-\d{2}$/.test(departureDate)&&Number.isFinite(Date.parse(departureDate))&&new Date(departureDate).toISOString().slice(0,10)===departureDate) t.departureDate=departureDate;
 const route=(p.get('midpolicyid')||'').split('|').map(v=>v.match(/^\d+:([A-Z]{3})-([A-Z]{3}):(.+)$/i)).filter(v=>v!==null);
 t.segments=route.length?route.map(m=>({...blankSegment(),from:m[1].toUpperCase(),to:m[2].toUpperCase(),flight:m[3]})):[{...blankSegment(),from:(p.get('dcity')||'').toUpperCase(),to:(p.get('acity')||'').toUpperCase()}];
 return t;
}
export function instant(local:string,offset:string):number {return local?Date.parse(local+offset):NaN;}
export function times(s:Segment){return [instant(s.departure,s.departureOffset),instant(s.arrival,s.arrivalOffset)];}
// Calendar positions use airport-local clocks; times() remains the real UTC instant.
export function boardTimes(s:Segment){return [s.departure?Date.parse(s.departure+'Z'):NaN,s.arrival?Date.parse(s.arrival+'Z'):NaN];}
export function total(tickets:Ticket[]){const currencies:Record<string,number>={}; let incomplete=false; for(const t of tickets){if(t.price===''){incomplete=true;continue;} currencies[t.currency]=(currencies[t.currency]||0)+Number(t.price);} return {currencies,incomplete};}
export function validate(t:Ticket):string {
 if(t.price!==''&&(!Number.isFinite(Number(t.price))||Number(t.price)<0)) return 'Enter a valid non-negative price.';
 let previous=-Infinity;
 for(const s of t.segments){
  if(!s.from.trim()||!s.to.trim()) return 'Enter both cities or airport codes for every flight.';
  const [d,a]=times(s);
  if((s.departure&&!Number.isFinite(d))||(s.arrival&&!Number.isFinite(a)))return 'Check the dates and UTC offsets.';
  if(Number.isFinite(d)&&Number.isFinite(a)&&a<=d) return 'Arrival must be after departure, accounting for UTC offsets.';
  if(Number.isFinite(d)&&d<previous)return 'A connection cannot depart before the previous flight arrives.';
  previous=Number.isFinite(a)?a:previous;
 }
 return '';
}
export function bounds(options:Option[]){
 const stamps=options.flatMap(o=>[...o.tickets.flatMap(t=>t.segments.flatMap(boardTimes)),...Object.keys({...o.dayNotes,...o.dayTexts}).map(day=>Date.parse(day+'T00:00Z'))]).filter(Number.isFinite);
 const start=stamps.length?Math.floor(Math.min(...stamps)/86400000)*86400000:Math.floor(Date.now()/86400000)*86400000;
 return {start,end:Math.max(start+3*86400000,stamps.length?Math.ceil(Math.max(...stamps)/86400000)*86400000:start)+86400000};
}
export function setDayText(option:Option,date:string,text:string):Option {
 // Retain empty strings: deleting everything must not regenerate the flight lines.
 return {...option,dayTexts:{...option.dayTexts,[date]:text}};
}
