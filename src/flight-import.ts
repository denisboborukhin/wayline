import {parseSiteText} from './site-parser.ts';
export function parseFlightImport(text:string,url='',departureDate=''){
 if(!text.trimStart().startsWith('{'))return parseSiteText(text,url,departureDate);
 let data;
 try{data=JSON.parse(text);}catch{throw Error('The extension capture is incomplete. Copy the itinerary again.');}
 if(!data||data.format!=='wayline-flight-v1'||typeof data.text!=='string'||!data.text.trim()||data.text.length>50000||typeof data.url!=='string'||(data.departureDate!==undefined&&typeof data.departureDate!=='string'))throw Error('Invalid Wayline extension capture. Copy the itinerary again.');
 let source:URL;
 try{source=new URL(data.url);}catch{throw Error('Invalid Trip.com source in extension capture.');}
 if(source.protocol!=='https:'||!['ru.trip.com','www.trip.com','trip.com'].includes(source.hostname)||!source.pathname.startsWith('/flights/')||source.username||source.password||source.port)throw Error('Invalid Trip.com source in extension capture.');
 const clean=new URL(source.origin+source.pathname);
 for(const key of ['dcity','acity','dcityName','acityName','ddate','curr','midSelectPrice']){
  if(source.searchParams.has(key))clean.searchParams.set(key,source.searchParams.get(key)!);
 }
 return parseSiteText(data.text,clean.href,departureDate||data.departureDate||'');
}
