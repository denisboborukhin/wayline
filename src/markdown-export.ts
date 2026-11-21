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
  const {start,end}=bounds([option],'month');
  calendars.push(`### ${name}`,'');
  for(let month=start;month<end;){
   const first=new Date(month);
   const title=first.toLocaleDateString('en',{month:'long',year:'numeric',timeZone:'UTC'});
   const firstMonday=month-((first.getUTCDay()+6)%7)*DAY;
   const nextMonth=first.setUTCMonth(first.getUTCMonth()+1);
   calendars.push(`#### ${title}`,'',tableRow(...weekdays),tableRow(...weekdays.map(()=>'---')));
   for(let monday=firstMonday;monday<nextMonth;monday+=weekdays.length*DAY){
    const dates=weekdays.map((_,i)=>{
     const stamp=monday+i*DAY;
     return stamp>=month&&stamp<nextMonth?new Date(stamp):null;
    });
    calendars.push(tableRow(...dates.map(date=>date?`**${date.getUTCDate()}**`:'')));
    calendars.push(tableRow(...dates.map(day=>{
     if(!day)return '';
     const date=day.toISOString().slice(0,10);
     const lines=(events[date]??[]).map(event=>event.text);
     return escapeText(dayNoteText(lines,option.dayTexts?.[date],option.dayNotes?.[date]));
    })));
   }
   calendars.push('');
   month=nextMonth;
  }
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
