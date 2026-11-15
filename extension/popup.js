import {extractItineraries} from './extract.js';
const status=document.querySelector('#status'),details=document.querySelector('#details'),select=document.querySelector('#itinerary'),preview=document.querySelector('#preview'),date=document.querySelector('#date'),copy=document.querySelector('#copy'),retry=document.querySelector('#retry');
let itineraries=[];
function message(text,error=false){status.textContent=text;status.toggleAttribute('data-error',error);}
function show(){
 const item=itineraries[Number(select.value)];preview.value=item.text;
 date.value=new URL(item.url).searchParams.get('ddate')||'';
 copy.textContent='Copy itinerary';message('Review this itinerary. Only these details and a cleaned flight link will be copied.');
}
async function read(){
 details.hidden=true;retry.disabled=true;message('Reading the active tab…');
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id)throw Error('Open a Trip.com flight tab and click the extension icon.');
  const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:extractItineraries});
  if(result?.result?.error)throw Error(result.result.error);
  itineraries=result?.result?.itineraries;
  if(!Array.isArray(itineraries)||!itineraries.length)throw Error('No flight summary found. Expand the itinerary and try again.');
  select.replaceChildren(...itineraries.map((item,i)=>{
   const option=document.createElement('option');option.value=String(i);
   const codes=item.text.match(/\b\d{1,2}:\d{2}\s+([A-Z]{3})\b/g)||[];
   option.textContent=`${i+1}. ${codes[0]||'Itinerary'} → ${codes.at(-1)||''}`;return option;
  }));
  details.hidden=false;show();
 }catch(error){message(error.message||'Cannot read this tab. Open the flight details on Trip.com and try again.',true);}
 finally{retry.disabled=false;}
}
select.addEventListener('change',show);retry.addEventListener('click',read);
copy.addEventListener('click',async()=>{
 copy.disabled=true;
 try{
  const item=itineraries[Number(select.value)];
  await navigator.clipboard.writeText(JSON.stringify({format:'wayline-flight-v1',...item,departureDate:date.value}));
  copy.textContent='Copied';message('Copied. Paste into the ticket’s flight-details field in Wayline.');
 }catch{message('Clipboard access failed. Select and copy the flight text below, then paste it into Wayline and set the departure date there.',true);}
 finally{copy.disabled=false;}
});
read();
