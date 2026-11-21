import {bounds,total,type Option} from './model.ts';
import {dayEvents,dayNoteText} from './timeline.ts';

const DAY=86400000;
const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function escapeText(text:string){
 return text.replace(/[&<>\\|#*_~`[\]]/g,char=>/[&<>\\]/.test(char)?`&#${char.charCodeAt(0)};`:`\\${char}`)
  .replace(/\r\n?|\n/g,'<br>');
}

function tableRow(...cells:string[]){
 return '| '+cells.join(' | ')+' |';
}

export function exportMarkdown(options:Option[]){
 const calendars:string[]=[];
 const prices:string[]=[];
 options.forEach((option,index)=>{
  const name=escapeText(option.name.trim()||`Option ${index+1}`);
  const events=dayEvents(option.tickets);
  const {start,end}=bounds([option],'calendar');
  calendars.push(`### ${name}`,'',tableRow(...weekdays),tableRow(...weekdays.map(()=>'---')));
  for(let monday=start;monday<end;monday+=weekdays.length*DAY){
   const cells=weekdays.map((_,i)=>{
    const date=new Date(monday+i*DAY).toISOString().slice(0,10);
    const lines=(events[date]??[]).map(event=>event.text);
    const text=dayNoteText(lines,option.dayTexts?.[date],option.dayNotes?.[date]);
    return `**${date}**`+(text.trim()?`<br>${escapeText(text)}`:'');
   });
   calendars.push(tableRow(...cells));
  }
  calendars.push('');
  const {currencies,incomplete}=total(option.tickets);
  const sums=Object.entries(currencies).map(([code,amount])=>`${code} ${amount.toFixed(2)}`);
  const status=option.tickets.length?(incomplete?'Missing ticket prices':'Complete'):'No tickets';
  prices.push(tableRow(name,escapeText(sums.join('\n')||'—'),status));
 });
 return [
  '# Travel plans','',
  '## Calendars','',
  ...calendars,
  '## Ticket prices','',
  '| Option | Known ticket totals | Status |','| --- | --- | --- |',...prices,'',
 ].join('\n');
}
