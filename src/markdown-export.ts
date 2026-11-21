import {total,type Option} from './model.ts';
import {dayEvents,dayNoteText} from './timeline.ts';

function tableRow(...cells:string[]){
 return '| '+cells.map(cell=>cell
  .replace(/[&<>\\]/g,char=>`&#${char.charCodeAt(0)};`)
  .replace(/[|*_~`[\]]/g,'\\$&')
  .replace(/\r\n?|\n/g,'<br>')
 ).join(' | ')+' |';
}

export function exportMarkdown(options:Option[]){
 const notes:string[]=[];
 const prices:string[]=[];
 options.forEach((option,index)=>{
  const name=option.name||`Option ${index+1}`;
  const events=dayEvents(option.tickets);
  const dates=new Set([...Object.keys(events),...Object.keys(option.dayNotes??{}),...Object.keys(option.dayTexts??{})]);
  for(const date of [...dates].sort()){
   const lines=(events[date]??[]).map(event=>event.text);
   const text=dayNoteText(lines,option.dayTexts?.[date],option.dayNotes?.[date]);
   if(text.trim())notes.push(tableRow(name,date,text));
  }
  const {currencies,incomplete}=total(option.tickets);
  const sums=Object.entries(currencies).map(([code,amount])=>`${code} ${amount.toFixed(2)}`);
  const status=option.tickets.length?(incomplete?'Missing ticket prices':'Complete'):'No tickets';
  prices.push(tableRow(name,sums.join('\n')||'—',status));
 });
 return [
  '# Travel plans','',
  '## Day plans','',
  ...(notes.length?['| Option | Date | Day plan |','| --- | --- | --- |',...notes]:['No day notes.']),
  '',
  '## Ticket prices','',
  '| Option | Known ticket totals | Status |','| --- | --- | --- |',...prices,'',
 ].join('\n');
}
