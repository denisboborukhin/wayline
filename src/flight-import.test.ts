import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFlightImport} from './flight-import.ts';
const text=readFileSync(new URL('./fixtures/trip-itinerary.txt',import.meta.url),'utf8');
const url='https://ru.trip.com/flights/passenger?ddate=2026-12-30&midSelectPrice=41542&curr=RUB&remarkTokenKey=PRIVATE&txid=PRIVATE';
const capture={format:'wayline-flight-v1',text,url,departureDate:''};
test('extension capture imports all legs, URL price and date, while dropping session parameters',()=>{
 const ticket=parseFlightImport(JSON.stringify(capture));
 assert.equal(ticket.segments.length,3);assert.equal(ticket.price,'41542');assert.equal(ticket.currency,'RUB');assert.equal(ticket.departureDate,'2026-12-30');
 assert.equal(ticket.segments[2].arrival,'2026-12-31T13:40');assert.ok(!ticket.url.includes('PRIVATE'));
});
test('extension date and explicit manual override work without URL dates',()=>{
 const noDate={...capture,url:'https://ru.trip.com/flights/passenger',departureDate:'2026-12-30'};
 assert.equal(parseFlightImport(JSON.stringify(noDate)).segments.length,3);
 assert.throws(()=>parseFlightImport(JSON.stringify({...noDate,departureDate:'bad'})),/departure date/);
 assert.equal(parseFlightImport(JSON.stringify({...noDate,departureDate:'bad'}),'','2026-12-30').segments.length,3);
});
test('plain pasted flight details still need no URL',()=>{
 const ticket=parseFlightImport(text,'','2026-12-30');assert.equal(ticket.url,'');assert.equal(ticket.segments.length,3);
});
test('malformed captures and unsupported sources fail without importing',()=>{
 for(const value of ['{',JSON.stringify({...capture,format:'other'}),JSON.stringify({...capture,text:4}),JSON.stringify({...capture,text:'x'.repeat(50001)}),JSON.stringify({...capture,url:'https://evil.test/flights/passenger'}),JSON.stringify({...capture,url:'https://user:secret@ru.trip.com/flights/passenger'}),JSON.stringify({...capture,url:'https://ru.trip.com:8080/flights/passenger'})])assert.throws(()=>parseFlightImport(value));
});
