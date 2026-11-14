import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLink,blankTicket,instant,validate,total,bounds,setDayText,boardTimes} from './model.ts';
test('Trip.com imports all connections, but never invents return, price or times',()=>{const t=parseLink('https://ru.trip.com/flights/showfarefirst?dcity=ckg&acity=evn&ddate=2026-12-30&rdate=2027-01-02&triptype=ow&curr=RUB&midpolicyid=1%3ACKG-SHA%3AMU5424%7C2%3ASHA-TBS%3AMU285%7C3%3ATBS-EVN%3A3F3584');assert.equal(t.segments.length,3);assert.equal(t.segments[2].to,'EVN');assert.equal(t.price,'');assert.equal(t.segments[0].departure,'');});
test('time zones and overnight flights use absolute time',()=>{assert.equal(instant('2026-12-30T12:00','+08:00'),instant('2026-12-30T04:00','+00:00'));const t=blankTicket();Object.assign(t.segments[0],{from:'A',to:'B',departure:'2026-12-30T23:00',arrival:'2026-12-31T02:00'});assert.equal(validate(t),'');t.segments[0].arrival='2026-12-30T22:00';assert.match(validate(t),/Arrival/);});
test('totals do not multiply ticket price by connections or mix currencies',()=>{const a=blankTicket();a.price='100';const b=blankTicket();b.price='20';b.currency='USD';assert.deepEqual(total([a,b,blankTicket()]),{currencies:{RUB:100,USD:20},incomplete:true});});
test('unsupported links remain editable and dangerous schemes rejected',()=>{assert.equal(parseLink('https://example.com').segments.length,1);assert.throws(()=>parseLink('javascript:alert(1)'));});
test('empty board always has finite bounds',()=>{const b=bounds([]);assert.ok(Number.isFinite(b.start)&&b.end>b.start);});

test('passenger links import selected price and departure date without inventing schedule',()=>{const t=parseLink('https://ru.trip.com/flights/passenger?dcity=ckg&acity=evn&ddate=2026-12-30&midSelectPrice=41542&curr=RUB');assert.equal(t.price,'41542');assert.equal(t.departureDate,'2026-12-30');assert.equal(t.segments[0].departure,'');assert.equal(t.segments[0].arrival,'');});
 test('invalid prices and dates do not become ticket data',()=>{const t=parseLink('https://ru.trip.com/flights/passenger?ddate=2026-02-30&midSelectPrice=-50');assert.equal(t.departureDate,undefined);assert.equal(t.price,'');});

test('day notes survive saving/reloading and stay attached to the option and calendar date',()=>{
 const original={id:'a',name:'Option A',tickets:[blankTicket()],dayNotes:{'2026-12-30':'Hotel booking'}};
 const edited=setDayText(original,'2026-12-31','Meet friends\nDinner at 19:00');
 const restored=JSON.parse(JSON.stringify(edited));
 assert.equal(restored.dayTexts['2026-12-31'],'Meet friends\nDinner at 19:00');assert.equal(restored.dayNotes['2026-12-30'],'Hotel booking');
 assert.deepEqual(original.dayNotes,{'2026-12-30':'Hotel booking'});assert.equal(edited.tickets,original.tickets);
 const cleared=setDayText(edited,'2026-12-31','');assert.equal(cleared.dayTexts['2026-12-31'],'');assert.equal(cleared.dayNotes['2026-12-30'],'Hotel booking');
});
test('notes keep their date visible even after flights are removed, and local arrival days are included',()=>{
 const noteBounds=bounds([{id:'a',name:'A',tickets:[],dayNotes:{'2027-01-02':'Stay overnight'}}]);
 const noteDay=Date.parse('2027-01-02T00:00Z');assert.ok(noteBounds.start<=noteDay&&noteBounds.end>noteDay);
 const t=blankTicket();Object.assign(t.segments[0],{departure:'2026-12-30T23:30',arrival:'2026-12-31T00:30',departureOffset:'+08:00',arrivalOffset:'+08:00'});
 const b=bounds([{id:'a',name:'A',tickets:[t]}]);assert.ok(b.end>Date.parse('2026-12-31T00:00Z'));
});

test('calendar placement keeps an early local departure on its local day',()=>{
 const t=blankTicket();Object.assign(t.segments[0],{departure:'2026-12-30T07:25',arrival:'2026-12-30T10:00',departureOffset:'+08:00',arrivalOffset:'+08:00'});
 const b=bounds([{id:'a',name:'A',tickets:[t]}]);assert.equal(b.start,Date.parse('2026-12-30T00:00Z'));
 assert.equal(boardTimes(t.segments[0])[0],Date.parse('2026-12-30T07:25Z'));
 assert.equal(instant(t.segments[0].departure,t.segments[0].departureOffset),Date.parse('2026-12-29T23:25Z'));
});
