import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blankTicket,blankSegment,type Ticket} from './model.ts';
import {layoutTickets} from './timeline.ts';
function ticket(departure:string,arrival:string):Ticket{
 const t=blankTicket();Object.assign(t.segments[0],{from:'A',to:'B',departure,arrival});return t;
}
test('independent tickets on the same day stack even when their times do not overlap',()=>{
 const a=ticket('2026-12-30T07:00','2026-12-30T09:00'),b=ticket('2026-12-30T17:00','2026-12-30T19:00');
 const layout=layoutTickets([a,b]);assert.deepEqual(layout.flights.map(f=>f.lane),[0,1]);assert.equal(layout.laneCount,2);assert.deepEqual(layout.connections,[]);
});
test('overlapping tickets stack, while tickets on a later day reuse a lane',()=>{
 const layout=layoutTickets([ticket('2026-12-30T07:00','2026-12-30T11:00'),ticket('2026-12-30T08:00','2026-12-30T10:00'),ticket('2026-12-31T07:00','2026-12-31T09:00')]);
 assert.deepEqual(layout.flights.map(f=>f.lane),[0,1,0]);assert.deepEqual(layout.connections,[]);
});
test('all connecting flights stay together, with no connector to an independent ticket',()=>{
 const a=ticket('2026-12-30T07:00','2026-12-30T09:00');
 a.segments.push({...blankSegment(),from:'B',to:'C',departure:'2026-12-31T10:00',arrival:'2026-12-31T12:00'});
 const b=ticket('2026-12-30T10:00','2026-12-30T12:00');
 const layout=layoutTickets([a,b]);assert.deepEqual(layout.flights.map(f=>f.lane),[0,0,1]);
 assert.deepEqual(layout.connections,[{id:a.segments[1].id,from:Date.parse('2026-12-30T09:00Z'),to:Date.parse('2026-12-31T10:00Z'),lane:0,duration:25*3600000}]);
});
test('incomplete flights do not create lanes or connections across missing details',()=>{
 const a=ticket('2026-12-30T07:00','2026-12-30T09:00');a.segments.push(blankSegment(),{...blankSegment(),from:'C',to:'D',departure:'2026-12-30T17:00',arrival:'2026-12-30T19:00'});
 const layout=layoutTickets([blankTicket(),a]);assert.equal(layout.laneCount,1);assert.equal(layout.flights.length,2);assert.deepEqual(layout.connections,[]);
 assert.equal(layoutTickets([blankTicket()]).laneCount,0);
});
test('stacking uses local calendar days, including overnight and offset flights',()=>{
 const a=ticket('2026-12-30T23:00','2026-12-31T02:00');
 const b=ticket('2026-12-31T08:00','2026-12-31T10:00');
 assert.deepEqual(layoutTickets([a,b]).flights.map(f=>f.lane),[0,1]);
 const c=ticket('2026-12-31T02:00','2026-12-31T03:00');c.segments[0].departureOffset='+08:00';c.segments[0].arrivalOffset='+08:00';
 assert.deepEqual(layoutTickets([ticket('2026-12-30T07:00','2026-12-30T09:00'),c]).flights.map(f=>f.lane),[0,0]);
 const midnight=ticket('2026-12-30T23:00','2026-12-31T00:00');
 assert.deepEqual(layoutTickets([midnight,b]).flights.map(f=>f.lane),[0,0]);
});

test('day boxes collect simple city/time lines together, including both transit events',async()=>{
 const {dayEvents}=await import('./timeline.ts');
 const t=ticket('2026-12-30T07:00','2026-12-30T09:00');t.segments[0].from='CKG · Chongqing';t.segments[0].to='PVG · Shanghai';
 t.segments.push({...blankSegment(),from:'SHA · Shanghai',to:'TBS · Tbilisi',departure:'2026-12-30T10:00',arrival:'2026-12-30T18:00'});
 assert.deepEqual(dayEvents([t])['2026-12-30'].map(e=>e.text),['Chongqing: departure at 07:00','Shanghai: arrival at 09:00','Shanghai: departure at 10:00','Tbilisi: arrival at 18:00']);
});
test('day boxes retain local calendar dates across time zones',async()=>{
 const {dayEvents}=await import('./timeline.ts');const t=ticket('2026-12-31T02:00','2027-01-01T10:00');
 t.segments[0].departureOffset='+08:00';t.segments[0].arrivalOffset='+08:00';
 const events=dayEvents([t]);assert.deepEqual(Object.keys(events),['2026-12-31','2027-01-01']);assert.equal(events['2026-12-31'][0].text,'A: departure at 02:00');
 assert.deepEqual(dayEvents([blankTicket()]),{});
});

test('day text is fully editable, including empty content, and old notes are preserved',async()=>{
 const {dayNoteText,insertFlightInfo}=await import('./timeline.ts');const lines=['Moscow: arrival at 07:00'];
 assert.equal(dayNoteText(lines,undefined,'Hotel booking'),'Moscow: arrival at 07:00\n\nHotel booking');
 assert.equal(dayNoteText(lines,'Before\nMoscow: arrival at 07:00\nAfter'),'Before\nMoscow: arrival at 07:00\nAfter');
 assert.equal(dayNoteText(lines,''),'');assert.equal(insertFlightInfo('',lines),'Moscow: arrival at 07:00');
 const inserted=insertFlightInfo('Breakfast\nMoscow: arrival at 07:00\nHotel', [...lines,'Moscow: departure at 12:00']);
 assert.equal(inserted,'Breakfast\nMoscow: arrival at 07:00\nHotel\nMoscow: departure at 12:00');
 assert.equal(insertFlightInfo(inserted,[...lines,'Moscow: departure at 12:00']),inserted);
});
