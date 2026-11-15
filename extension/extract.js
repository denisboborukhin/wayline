// Self-contained: Chrome serializes this function into the active tab.
export function extractItineraries(){
 try{
 const source=new URL(location.href);
 if(source.protocol!=='https:'||!['ru.trip.com','www.trip.com','trip.com'].includes(source.hostname)||!source.pathname.startsWith('/flights/')||source.port||source.username||source.password)throw Error('Open a Trip.com flight page first.');
 const url=new URL(source.origin+source.pathname);
 for(const key of ['dcity','acity','dcityName','acityName','ddate','curr','midSelectPrice']){
  if(source.searchParams.has(key))url.searchParams.set(key,source.searchParams.get(key));
 }
 const itineraries=[];
 const add=text=>{
  text=text.replace(/\u00a0/g,' ').trim();
  if(text.length>50000)throw Error('Select just the flight details, not the whole page.');
  if((text.match(/\b\d{1,2}:\d{2}\s+[A-Z]{3}\b/g)||[]).length<2)return;
  if(!itineraries.some(item=>item.text===text))itineraries.push({text,url:url.href});
 };
 const selected=window.getSelection()?.toString().trim();
 if(selected){add(selected);if(!itineraries.length)throw Error('Select the complete flight details, including airport codes and times.');}
 else{
  const blocks=[...document.querySelectorAll('[aria-label*="Вылет рейса"]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  // Prefer complete outer summaries, without duplicating their nested blocks.
  for(const block of blocks.filter(el=>!blocks.some(other=>other!==el&&other.contains(el)))){
   const read=node=>{
    if(node.nodeType===Node.TEXT_NODE)return node.textContent;
    if(node.nodeType!==Node.ELEMENT_NODE||node.matches('script,style,input,textarea,select,form,[hidden],[aria-hidden="true"]'))return '';
    const style=getComputedStyle(node);
    if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return '';
    if(node.tagName==='BR')return '\n';
    const text=[...node.childNodes].map(read).join(' ');
    return /^(block|flex|grid|table|list-item)/.test(style.display)?'\n'+text+'\n':text;
   };
   add(read(block));
  }
 }
 if(!itineraries.length)throw Error('Expand the complete itinerary on Trip.com, then reopen this extension. If no summary is found, select only the flight details first.');
 return {itineraries};
 }catch(error){return {error:error.message||'Could not read this itinerary.'};}
}
