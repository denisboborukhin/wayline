import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportMarkdown} from './markdown-export.ts';
import {blankTicket,type Ticket} from './model.ts';

const ticket:Ticket={id:'flight',url:'',price:'120.50',currency:'EUR',segments:[{
 id:'leg',from:'CDG · Paris',to:'NCE · Nice',flight:'AF1234',
 departure:'2026-12-21T18:00',arrival:'2026-12-21T19:30',departureOffset:'+01:00',arrivalOffset:'+01:00',
}]};

test('exports whole months with separate rows for dates and notes',()=>{
 const md=exportMarkdown([
  {id:'first',name:'Train | flight',tickets:[ticket],
   dayNotes:{'2026-12-21':'Check in','2026-12-23':'Old note'},
   dayTexts:{'2026-12-24':'Plane *or* train | decide\r\nMeet <Alex> at C:\\trips','2026-12-23':'','2026-12-20':'Pack','2027-02-01':'Unpack'}},
  {id:'second',name:'Other trip',tickets:[ticket],dayTexts:{'2026-12-21':''}},
 ]);
 const [first,second]=md.split(/^### /m).slice(1);
 assert.ok(first.startsWith('Train \\| flight\n\n#### December 2026\n\n| Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |'));
 const months=first.split(/^#### /m).slice(1);
 assert.deepEqual(months.map(month=>month.split('\n')[0]),['December 2026','January 2027','February 2027']);
 const rows=(month:string)=>month.split('\n').filter(line=>line.startsWith('|')).slice(2);
 const [december,january,february]=months.map(rows);
 for(const [weeks,days] of [[december,31],[january,31],[february,28]] as const){
  const dates=weeks.filter((_,i)=>i%2===0).flatMap(row=>[...row.matchAll(/\*\*(\d+)\*\*/g)].map(match=>Number(match[1])));
  assert.deepEqual(dates,Array.from({length:days},(_,i)=>i+1));
 }
 assert.equal(december[0],'|  | **1** | **2** | **3** | **4** | **5** | **6** |');
 assert.equal(december[5],'|  |  |  |  |  |  | Pack |');
 assert.equal(december[6],'| **21** | **22** | **23** | **24** | **25** | **26** | **27** |');
 assert.equal(december[7],'| Paris: departure at 18:00<br>Nice: arrival at 19:30<br><br>Check in |  |  | Plane \\*or\\* train \\| decide<br>Meet &#60;Alex&#62; at C:&#92;trips |  |  |  |');
 assert.equal(january[0],'|  |  |  |  | **1** | **2** | **3** |');
 assert.ok(january.filter((_,i)=>i%2===1).every(row=>row==='|  |  |  |  |  |  |  |'));
 assert.equal(february[1],'| Unpack |  |  |  |  |  |  |');
 assert.doesNotMatch(second,/departure at 18:00/);
 assert.deepEqual([...second.matchAll(/^#### (.*)$/gm)].map(match=>match[1]),['December 2026']);
});

test('lists known ticket totals by option and currency and flags missing prices',()=>{
 const md=exportMarkdown([
  {id:'a',name:'Outbound and return',tickets:[ticket,{...ticket,price:'20.25'},{...ticket,currency:'USD',price:'50'},blankTicket()]},
  {id:'b',name:'Notes only',tickets:[]},
 ]);
 assert.ok(md.includes('| Outbound and return | EUR 140.75<br>USD 50.00 | Missing ticket prices |'));
 assert.ok(md.includes('| Notes only | — | No tickets |'));
});
