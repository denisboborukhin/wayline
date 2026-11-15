import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {load} from 'cheerio';
const start=Date.parse('2026-12-30T00:00Z');
function ticket(id,departure,arrival){return {id,url:'',price:'',currency:'RUB',segments:[{id:'flight-'+id,from:'TBS · Tbilisi',to:'EVN · Yerevan',flight:'3F3584',departure,arrival,departureOffset:'+00:00',arrivalOffset:'+00:00'}]};}
test('flight lines and personal notes occupy one editable field, without duplicate date headings',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 try{
  const {DayTimeline}=await server.ssrLoadModule('/src/DayTimeline.tsx');
  const html=renderToStaticMarkup(React.createElement(DayTimeline,{tickets:[ticket('a','2026-12-30T13:00','2026-12-30T13:40'),ticket('b','2026-12-30T14:00','2026-12-30T14:40')],start,days:2,dayWidth:480,color:0,onOpen(){},onNoteChange(){},dayNotes:{'2026-12-30':'Hotel check-in\nDinner at 19:00'}}));
  const $=load(html);assert.equal($('.flight-box').length,2);assert.equal($('.connection').length,0);assert.equal($('.day-flight-line').length,0);assert.equal($('.day-note-box h3').length,0);
  assert.equal($('.day-note-box textarea').length,2);assert.match($('.day-note-box textarea').first().text(),/Tbilisi: departure at 13:00/);assert.match($('.day-note-box textarea').first().text(),/Hotel check-in\nDinner at 19:00/);
  assert.equal($('.day-note-box button').first().text(),'Insert flight info');assert.ok($('.day-note-box button').last().is('[disabled]'));
  assert.match($('.day-track').attr('style'),/padding-top:48px/);
 }finally{await server.close();}
});
test('deleted text stays empty, edited text is verbatim, and HTML-like notes remain plain text',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 try{
  const {DayTimeline}=await server.ssrLoadModule('/src/DayTimeline.tsx');
  const html=renderToStaticMarkup(React.createElement(DayTimeline,{tickets:[ticket('a','2026-12-30T23:00','2026-12-31T01:00')],start,days:3,dayWidth:480,color:0,onOpen(){},onNoteChange(){},dayTexts:{'2026-12-30':'','2026-12-31':'Breakfast\nYerevan: arrival at 01:00\nHotel','2027-01-01':'<script>plain note</script>'}}));
  const $=load(html);assert.equal($('.flight-box').length,1);assert.equal($('.day-note-box textarea').first().text(),'');assert.equal($('.day-note-box textarea').eq(1).text(),'Breakfast\nYerevan: arrival at 01:00\nHotel');
  assert.equal($('.day-note-box textarea').eq(2).text(),'<script>plain note</script>');assert.equal($('script').length,0);
 }finally{await server.close();}
});
test('early local departures do not draw on the previous UTC day and elapsed duration stays correct',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 try{
  const {DayTimeline}=await server.ssrLoadModule('/src/DayTimeline.tsx');
  const t=ticket('a','2026-12-31T02:00','2026-12-31T12:00');t.segments[0].departureOffset='+08:00';t.segments[0].arrivalOffset='+04:00';
  const html=renderToStaticMarkup(React.createElement(DayTimeline,{tickets:[t],start,days:2,dayWidth:480,color:0,onOpen(){},onNoteChange(){}}));
  const $=load(html);const left=Number.parseFloat($('.flight-box').attr('style').split('left:')[1]);assert.ok(Math.abs(left-520)<0.01);assert.match($('.flight-box').attr('title'),/14h 0m/);
  assert.equal($('.day-note-box textarea').first().text(),'');assert.match($('.day-note-box textarea').last().text(),/departure at 02:00/);
 }finally{await server.close();}
});
test('westbound flights span both local endpoints and point towards the earlier arrival clock',async()=>{
 const server=await createServer({configFile:false,server:{middlewareMode:true,ws:false},appType:'custom'});
 try{
  const {DayTimeline}=await server.ssrLoadModule('/src/DayTimeline.tsx');
  for(const [departure,arrival,left,width] of [['2026-12-30T20:00','2026-12-30T08:00',160,240],['2026-12-31T02:00','2026-12-30T14:00',280,240]]){
   const t=ticket('westbound',departure,arrival);Object.assign(t.segments[0],{from:'HND · Tokyo',to:'HNL · Honolulu',departureOffset:'+09:00',arrivalOffset:'-10:00'});
   const html=renderToStaticMarkup(React.createElement(DayTimeline,{tickets:[t],start,days:2,dayWidth:480,color:0,onOpen(){},onNoteChange(){}}));
   const $=load(html),box=$('.flight-box');
   assert.equal(Number.parseFloat(box.attr('style').split('left:')[1]),left);
   assert.equal(Number.parseFloat(box.attr('style').split('width:')[1]),width);
   assert.match(box.text(),/^←/);assert.match(box.attr('title'),/7h 0m/);assert.match(box.attr('title'),/earlier local/);
   assert.match($(`textarea[aria-label="Notes for ${departure.slice(0,10)}"]`).text(),/Tokyo: departure/);
   assert.match($(`textarea[aria-label="Notes for ${arrival.slice(0,10)}"]`).text(),/Honolulu: arrival/);
  }
 }finally{await server.close();}
});
