import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSiteText,offsetAt} from './site-parser.ts';
const fixture=readFileSync(new URL('./fixtures/trip-itinerary.txt',import.meta.url),'utf8');
const url='https://ru.trip.com/flights/passenger?dcity=ckg&acity=evn&ddate=2026-12-30&midSelectPrice=41542&curr=RUB';
test('parses the observed complete three-flight itinerary and local offsets',()=>{
 const t=parseSiteText(fixture,url);
 assert.equal(t.price,'41542');assert.equal(t.segments.length,3);
 assert.deepEqual(t.segments.map(s=>[s.from,s.to,s.flight,s.departure,s.arrival,s.departureOffset,s.arrivalOffset]),[
 ['CKG · Chongqing','PVG · Shanghai','MU5424','2026-12-30T07:25','2026-12-30T10:00','+08:00','+08:00'],
 ['PVG · Shanghai','TBS · Tbilisi','MU285','2026-12-30T12:25','2026-12-30T19:00','+08:00','+04:00'],
 ['TBS · Tbilisi','EVN · Yerevan','3F3584','2026-12-31T13:00','2026-12-31T13:40','+04:00','+04:00']]);
});
test('rejects truncated, empty, mismatched-duration and unknown-airport text',()=>{
 assert.throws(()=>parseSiteText('07:25 CKG',url));assert.throws(()=>parseSiteText('',url));assert.throws(()=>parseSiteText(fixture.slice(0,fixture.indexOf('31 дек.')),url),/incomplete/);
 assert.throws(()=>parseSiteText(fixture.replace('2 ч 35 мин','3 ч 35 мин'),url),/duration/);
 assert.throws(()=>parseSiteText(fixture.replace('07:25 CKG','07:25 ZZZ'),url),/Unknown airport/);
});
test('rolls December into the next year',()=>{const t=parseSiteText('23:00 PVG MU1234 1 янв. 01:00 PVG',url.replace('2026-12-30','2026-12-31'));assert.equal(t.segments[0].arrival,'2027-01-01T01:00');});
test('offsets follow summer time and reject ambiguous clocks',()=>{
 assert.equal(offsetAt('2026-07-01T12:00','Europe/London'),'+01:00');
 assert.equal(offsetAt('2026-12-01T12:00','Europe/London'),'+00:00');
 assert.throws(()=>offsetAt('2026-10-25T01:30','Europe/London'),/ambiguous/);
});

test('pasted details need no URL when they include a full Russian departure date',()=>{
 const t=parseSiteText(fixture.replace('ср., 30 дек.','30 декабря 2026'));
 assert.equal(t.url,'');assert.equal(t.segments.length,3);assert.equal(t.departureDate,'2026-12-30');
 assert.equal(t.segments[2].arrival,'2026-12-31T13:40');
});
test('pasted details can use a date field instead of a URL',()=>{
 const t=parseSiteText(fixture,'','2026-12-30');assert.equal(t.url,'');assert.equal(t.segments[0].departure,'2026-12-30T07:25');
});
test('missing year asks for a date, not a URL, without borrowing a later connection date',()=>{
 assert.throws(()=>parseSiteText(fixture),/departure date/);
 assert.throws(()=>parseSiteText(fixture+' 1 января 2027'),/departure date/);
 assert.throws(()=>parseSiteText(fixture,'','2026-02-30'),/departure date/);
});
test('pasted ISO date is accepted, and a broken optional link does not block parsing',()=>{
 const t=parseSiteText('2026-12-30\n07:25 CKG MU5424 10:00 PVG','not a link');
 assert.equal(t.url,'');assert.equal(t.segments[0].departure,'2026-12-30T07:25');
});
