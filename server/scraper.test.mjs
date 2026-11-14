import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkUrl,parseHtml,importMiddleware} from './scraper.mjs';
const url='https://ru.trip.com/flights/passenger?ddate=2026-12-30';
test('accepts only supported Trip.com HTTPS pages',()=>{
 assert.equal(checkUrl(url).hostname,'ru.trip.com');
 for(const bad of ['http://127.0.0.1/flights/passenger','https://ru.trip.com.evil.test/flights/passenger','file:///etc/passwd','https://ru.trip.com:8080/flights/passenger','https://user:password@ru.trip.com/flights/passenger','https://ru.trip.com/'])assert.throws(()=>checkUrl(bad));
});
test('HTML parser returns itinerary fields only',()=>{
 const text=readFileSync(new URL('../src/fixtures/trip-itinerary.txt',import.meta.url),'utf8');
 const t=parseHtml(`<html><body><div aria-label="Сегмент 1 Вылет рейса">${text}</div><input value="PRIVATE"><p>unrelated contact</p></body></html>`,url);
 assert.equal(t.segments.length,3);assert.ok(!JSON.stringify(t).includes('PRIVATE'));assert.ok(!JSON.stringify(t).includes('unrelated contact'));
});
test('middleware rejects cross-origin calls before scraping',async()=>{
 let status,body;const res={setHeader(){},set statusCode(v){status=v;},end(v){body=JSON.parse(v);}};
 await importMiddleware()({url:'/api/import-flight',method:'POST',headers:{origin:'https://example.com',host:'127.0.0.1:5173'}},res,()=>{});
 assert.equal(status,403);assert.match(body.error,/local/);
});
