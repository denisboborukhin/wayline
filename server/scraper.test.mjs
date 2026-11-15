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
 assert.equal(status,403);assert.match(body.error,/same origin/);
});
async function requestStatus({origin,host='wayline.example',encrypted=false,configuredOrigin,forwardedProto}){
 const {Readable}=await import('node:stream');
 const req=Readable.from(['{"url":"https://unsupported.example/flights/passenger"}']);
 Object.assign(req,{url:'/api/import-flight',method:'POST',headers:{origin,host,'x-forwarded-proto':forwardedProto},socket:{encrypted}});
 let status;
 await importMiddleware({origin:configuredOrigin})(req,{setHeader(){},set statusCode(v){status=v;},end(){}},()=>{});
 return status;
}
test('same-origin HTTP, TLS and explicitly configured HTTPS proxy requests reach URL validation',async()=>{
 assert.equal(await requestStatus({origin:'http://wayline.example'}),422);
 assert.equal(await requestStatus({origin:'https://wayline.example',encrypted:true}),422);
 assert.equal(await requestStatus({origin:'https://wayline.example',host:'127.0.0.1:5173',configuredOrigin:'https://wayline.example'}),422);
});
test('origin checks reject other hosts, schemes, ports and untrusted forwarded headers',async()=>{
 for(const origin of ['https://evil.example','https://wayline.example.evil.test','https://wayline.example:8443','http://wayline.example','null']){
  assert.equal(await requestStatus({origin,encrypted:true}),403);
 }
 assert.equal(await requestStatus({origin:'https://wayline.example',forwardedProto:'https'}),403);
 assert.equal(await requestStatus({origin:'http://127.0.0.1:5173',host:'127.0.0.1:5173',configuredOrigin:'https://wayline.example'}),403);
});
test('configured public origin must be an HTTP(S) origin without a path or credentials',()=>{
 for(const origin of ['file:///tmp','https://user:secret@wayline.example','https://wayline.example/path','not-a-url','https://wayline.example/'])assert.throws(()=>importMiddleware({origin}));
});
