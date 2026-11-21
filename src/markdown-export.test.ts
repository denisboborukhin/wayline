import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportMarkdown} from './markdown-export.ts';
import {blankTicket,type Ticket} from './model.ts';

const ticket:Ticket={id:'flight',url:'',price:'120.50',currency:'EUR',segments:[{
 id:'leg',from:'CDG · Paris',to:'NCE · Nice',flight:'AF1234',
 departure:'2026-12-21T18:00',arrival:'2026-12-21T19:30',departureOffset:'+01:00',arrivalOffset:'+01:00',
}]};

test('exports complete Monday–Sunday weeks for each option, including empty weeks',()=>{
 const md=exportMarkdown([
  {id:'first',name:'Train | flight',tickets:[ticket],
   dayNotes:{'2026-12-21':'Check in','2026-12-23':'Old note'},
   dayTexts:{'2026-12-24':'Plane *or* train | decide\r\nMeet <Alex> at C:\\trips','2026-12-23':'','2026-12-20':'Pack','2027-01-04':'Unpack'}},
  {id:'second',name:'Other trip',tickets:[ticket],dayTexts:{'2026-12-21':''}},
 ]);
 const [first,second]=md.split(/^### /m).slice(1);
 assert.ok(first.startsWith('Train \\| flight\n\n| Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |'));
 const weeks=first.split('\n').filter(line=>line.startsWith('| **'));
 assert.deepEqual(weeks.map(line=>[...line.matchAll(/\*\*(\d{4}-\d{2}-\d{2})\*\*/g)].map(match=>match[1])),[
  ['2026-12-14','2026-12-15','2026-12-16','2026-12-17','2026-12-18','2026-12-19','2026-12-20'],
  ['2026-12-21','2026-12-22','2026-12-23','2026-12-24','2026-12-25','2026-12-26','2026-12-27'],
  ['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'],
  ['2027-01-04','2027-01-05','2027-01-06','2027-01-07','2027-01-08','2027-01-09','2027-01-10'],
 ]);
 assert.match(weeks[0],/\*\*2026-12-20\*\*<br>Pack/);
 assert.ok(weeks[1].includes('**2026-12-21**<br>Paris: departure at 18:00<br>Nice: arrival at 19:30<br><br>Check in'));
 assert.ok(weeks[1].includes('**2026-12-23** | **2026-12-24**<br>Plane \\*or\\* train \\| decide<br>Meet &#60;Alex&#62; at C:&#92;trips'));
 assert.ok(!weeks[2].includes('<br>'));
 assert.ok(!second.includes('**2026-12-21**<br>'));
 assert.equal(second.split('\n').filter(line=>line.startsWith('| **')).length,1);
});

test('lists known ticket totals by option and currency and flags missing prices',()=>{
 const md=exportMarkdown([
  {id:'a',name:'Outbound and return',tickets:[ticket,{...ticket,price:'20.25'},{...ticket,currency:'USD',price:'50'},blankTicket()]},
  {id:'b',name:'Notes only',tickets:[]},
 ]);
 assert.ok(md.includes('| Outbound and return | EUR 140.75<br>USD 50.00 | Missing ticket prices |'));
 assert.ok(md.includes('| Notes only | — | No tickets |'));
});
