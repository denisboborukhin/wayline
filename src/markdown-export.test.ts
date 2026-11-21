import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportMarkdown} from './markdown-export.ts';
import {blankTicket,type Ticket} from './model.ts';

const ticket:Ticket={id:'flight',url:'',price:'120.50',currency:'EUR',segments:[{
 id:'leg',from:'CDG · Paris',to:'NCE · Nice',flight:'AF1234',
 departure:'2026-12-21T18:00',arrival:'2026-12-21T19:30',departureOffset:'+01:00',arrivalOffset:'+01:00',
}]};

test('exports day box text in date order, with legacy notes and deliberately cleared boxes',()=>{
 const md=exportMarkdown([
  {id:'first',name:'Train | flight',tickets:[ticket],
   dayNotes:{'2026-12-21':'Check in','2026-12-23':'Old note'},
   dayTexts:{'2026-12-24':'Plane *or* train | decide\r\nMeet <Alex> at C:\\trips','2026-12-23':'','2026-12-20':'Pack'}},
  {id:'second',name:'Other trip',tickets:[ticket],dayTexts:{'2026-12-21':''}},
 ]);
 const rows=md.split('\n').filter(line=>line.includes('| 2026-'));
 assert.deepEqual(rows,[
  '| Train \\| flight | 2026-12-20 | Pack |',
  '| Train \\| flight | 2026-12-21 | Paris: departure at 18:00<br>Nice: arrival at 19:30<br><br>Check in |',
  '| Train \\| flight | 2026-12-24 | Plane \\*or\\* train \\| decide<br>Meet &#60;Alex&#62; at C:&#92;trips |',
 ]);
});

test('lists known ticket totals by option and currency and flags missing prices',()=>{
 const md=exportMarkdown([
  {id:'a',name:'Outbound and return',tickets:[ticket,{...ticket,price:'20.25'},{...ticket,currency:'USD',price:'50'},blankTicket()]},
  {id:'b',name:'Notes only',tickets:[]},
 ]);
 assert.ok(md.includes('| Outbound and return | EUR 140.75<br>USD 50.00 | Missing ticket prices |'));
 assert.ok(md.includes('| Notes only | — | No tickets |'));
});
