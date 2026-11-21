import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {extractItineraries} from '../../extension/extract.js';
import {parseFlightImport} from '../../src/flight-import.ts';
const fixture=await readFile(new URL('../../src/fixtures/trip-itinerary.txt',import.meta.url),'utf8');
const escaped=fixture.replaceAll('&','&amp;').replaceAll('<','&lt;');
const summary=text=>`<section aria-label="Сегмент 1 Вылет рейса"><pre>${text}</pre></section>`;
const source='https://ru.trip.com/flights/passenger?ddate=2026-12-30&midSelectPrice=41542&curr=RUB&remarkTokenKey=PRIVATE&txid=PRIVATE';
test('installed extension and static planner import without a scraper backend',{timeout:90000},async t=>{
 const profile=await mkdtemp(join(tmpdir(),'wayline-extension-test-'));
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging']});
 const browserErrors=[];context.on('page',page=>page.on('pageerror',error=>browserErrors.push(error.message)));
 let server;
 try{
  const page=context.pages()[0],cdp=await context.browser().newBrowserCDPSession();
  const {id}=await cdp.send('Extensions.loadUnpacked',{path:resolve('extension')});
  let body=summary(escaped)+'<p>PRIVATE CONTACT</p><input value="PRIVATE PASSENGER">';
  await context.route('https://ru.trip.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><meta charset="utf-8"><body>${body}</body></html>`}));
  await page.goto(source);
  const {targetInfos}=await cdp.send('Target.getTargets',{filter:[{type:'tab',exclude:false}]});
  await cdp.send('Extensions.triggerAction',{id,targetId:targetInfos.find(target=>target.url===source).targetId});
  // Headless toolbar popups are not Playwright pages. Load the same popup UI in
  // a tab after the real toolbar action grants activeTab to the flight page.
  const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
  await page.bringToFront();
  await popup.evaluate(()=>document.querySelector('#retry').click());
  await popup.locator('#preview').waitFor();
  let capture;
  await t.test('real extension action, script injection and clipboard preserve the three-flight itinerary',async()=>{
   assert.match(await popup.locator('#preview').inputValue(),/MU5424/);
   assert.ok(!(await popup.locator('#preview').inputValue()).includes('PRIVATE'));
   assert.equal(await popup.locator('#date').inputValue(),'2026-12-30');
   await popup.locator('#copy').click();
   await popup.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Copied.'));
   await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://ru.trip.com'});
   await page.bringToFront();capture=await page.evaluate(()=>navigator.clipboard.readText());
   assert.ok(!capture.includes('PRIVATE'));const ticket=parseFlightImport(capture);
   assert.equal(ticket.segments.length,3);assert.equal(ticket.price,'41542');assert.equal(ticket.segments[2].arrival,'2026-12-31T13:40');
  });
  await t.test('capture excludes forms and hidden summaries, separates alternatives, and never reads the whole body',async()=>{
   body=summary(escaped+'<input value="PRIVATE"><textarea>PRIVATE</textarea><form>PRIVATE CONTACT</form><span hidden>PRIVATE HIDDEN</span>')+summary('2026-12-30\n15:00 CKG MU9999 17:35 PVG')+'<div hidden>'+summary(escaped)+'</div><p>PRIVATE BODY</p>';
   await page.goto(source);const result=await page.evaluate(extractItineraries);
   assert.equal(result.itineraries.length,2);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
   body='<p>'+escaped+'</p><input value="PRIVATE">';await page.goto(source);
   assert.match((await page.evaluate(extractItineraries)).error,/Expand/);
   await page.evaluate(()=>{const range=document.createRange();range.selectNodeContents(document.querySelector('p'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});
   assert.equal((await page.evaluate(extractItineraries)).itineraries.length,1);
   await page.goto('data:text/html,<p>07:25 CKG MU5424 10:00 PVG</p>');
   assert.match((await page.evaluate(extractItineraries)).error,/Trip.com flight page/);
  });
  await t.test('static app imports captures and manual text, persists notes, edits tickets and supports mobile',async()=>{
   const dist=resolve('dist');
   server=createServer(async(req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(dist+sep)){res.writeHead(404).end();return;}
    try{const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
   });
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   const app=await context.newPage();const requests=[];app.on('request',r=>requests.push(r.url()));
   await app.setViewportSize({width:1440,height:1000});await app.goto(`http://127.0.0.1:${server.address().port}`);
   await app.getByRole('button',{name:'+ Add option',exact:true}).click();
   await app.getByRole('button',{name:'+ Add ticket',exact:true}).click();
   assert.equal(await app.getByRole('button',{name:'Read site',exact:true}).count(),0);
   await app.getByLabel('Flight details or extension capture',{exact:true}).fill(capture);
   await app.getByRole('button',{name:'Import details',exact:true}).click();
   assert.equal(await app.getByLabel('Ticket price',{exact:true}).inputValue(),'41542');
   assert.equal(await app.getByLabel('Flight link (optional)').inputValue(),JSON.parse(capture).url);
   await app.getByRole('button',{name:'Save ticket',exact:true}).click();
   assert.equal(await app.locator('.flight-box').count(),3);
   const notes=app.locator('.day-note-box textarea').first();await notes.fill('Breakfast\nLeave early');
   await app.locator('.day-box-actions button').first().click();assert.match(await notes.inputValue(),/Breakfast/);assert.match(await notes.inputValue(),/departure at/);
   await app.reload();assert.match(await notes.inputValue(),/Leave early/);
   await app.locator('.flight-box').first().click();assert.equal(await app.getByLabel('Ticket price',{exact:true}).inputValue(),'41542');
   await app.getByRole('button',{name:'Close editor',exact:true}).click();
   await app.getByRole('button',{name:'+ Add ticket',exact:true}).click();
   await app.getByLabel('Flight details or extension capture',{exact:true}).fill(fixture);
   await app.getByLabel('Departure date (if missing from text)').fill('2026-12-30');
   await app.getByRole('button',{name:'Import details',exact:true}).click();
   await app.getByLabel('Ticket price',{exact:true}).fill('50000');
   await app.getByRole('button',{name:'Save ticket',exact:true}).click();assert.equal(await app.locator('.flight-box').count(),6);
   await app.getByRole('button',{name:'Zoom out',exact:true}).click();await app.getByRole('button',{name:'Reset',exact:true}).click();
   await app.setViewportSize({width:390,height:844});assert.ok(await app.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await app.locator('.flight-box').first().click();await app.getByRole('button',{name:'Delete ticket',exact:true}).click();assert.equal(await app.locator('.flight-box').count(),3);
   await app.getByRole('button',{name:'+ Add ticket',exact:true}).click();
   await app.getByLabel('Flight link (optional)').fill(source);
   await app.getByRole('button',{name:'Read link',exact:true}).click();
   assert.equal(await app.getByLabel('Ticket price',{exact:true}).inputValue(),'41542');
   assert.equal(await app.getByLabel('Departure · local',{exact:true}).inputValue(),'');
   await app.getByRole('button',{name:'Close editor',exact:true}).click();
   const [download]=await Promise.all([
    app.waitForEvent('download'),
    app.getByRole('button',{name:'Export Markdown',exact:true}).click(),
   ]);
   assert.equal(download.suggestedFilename(),'travel-plans.md');
   const markdown=await readFile(await download.path(),'utf8');
   assert.match(markdown,/### Option 1\n\n\| Monday \| Tuesday \| Wednesday \| Thursday \| Friday \| Saturday \| Sunday \|/);
   assert.match(markdown,/^\| \*\*2026-12-28\*\* \| \*\*2026-12-29\*\* \| \*\*2026-12-30\*\*<br>Breakfast<br>Leave early<br>.*\| \*\*2027-01-03\*\* \|$/m);
   assert.match(markdown,/\| Option 1 \| RUB 50000\.00 \| Complete \|/);
   assert.ok(!requests.some(url=>url.includes('/api/')));assert.deepEqual(browserErrors,[]);
  });
  await t.test('calendar groups each option into Monday-to-Sunday weeks and shares notes with the timeline',async()=>{
   const app=await context.newPage();
   const origin=`http://127.0.0.1:${server.address().port}`;
   await app.setViewportSize({width:1440,height:1000});
   await app.goto(origin);
   await app.evaluate(()=>{
    const ticket=(id,departure,arrival)=>({id,url:'',price:'100',currency:'RUB',segments:[{
     id,from:'TBS',to:'EVN',flight:id,departure,arrival,departureOffset:'+00:00',arrivalOffset:'+00:00',
    }]});
    localStorage.removeItem('wayline.view');
    localStorage.setItem('wayline.v1',JSON.stringify([
     {id:'trip',name:'Trip',tickets:[
      ticket('FIRST','2026-12-22T10:00','2026-12-22T11:00'),
      ticket('OVERNIGHT','2026-12-27T23:00','2026-12-28T02:00'),
     ]},
     {id:'later-trip',name:'Later trip',tickets:[ticket('LATER','2027-01-03T10:00','2027-01-03T11:00')]},
    ]));
   });
   await app.reload();
   const toggle=app.getByRole('button',{name:'Calendar view',exact:true});
   const rows=app.locator('.board-row');
   const groups=app.locator('.calendar-option');
   const dates=()=>rows.evaluateAll(elements=>elements.map(row=>[...row.querySelectorAll('.day-header strong')].map(day=>day.textContent)));
   assert.equal(await toggle.getAttribute('aria-pressed'),'false');
   assert.equal(await rows.count(),1);
   assert.equal((await dates())[0][0],'Dec 22');
   await toggle.click();
   const secondWeek=['Mon, Dec 28','Tue, Dec 29','Wed, Dec 30','Thu, Dec 31','Fri, Jan 1','Sat, Jan 2','Sun, Jan 3'];
   assert.deepEqual(await dates(),[
    ['Mon, Dec 21','Tue, Dec 22','Wed, Dec 23','Thu, Dec 24','Fri, Dec 25','Sat, Dec 26','Sun, Dec 27'],
    secondWeek,secondWeek,
   ]);
   assert.deepEqual(await groups.evaluateAll(elements=>elements.map(group=>({
    names:[...group.querySelectorAll('.option-label input')].map(input=>input.value),
    weeks:group.querySelectorAll('.board-row').length,
    flights:[...group.querySelectorAll('.flight-box')].map(button=>button.textContent),
   }))),[
    {names:['Trip'],weeks:2,flights:['FIRST','OVERNIGHT','OVERNIGHT']},
    {names:['Later trip'],weeks:1,flights:['LATER']},
   ]);
   assert.deepEqual(await rows.evaluateAll(elements=>elements.map(row=>row.querySelectorAll('.day-note-box').length)),[7,7,7]);
   assert.ok(await app.locator('.scroll').evaluate(element=>element.scrollWidth===element.clientWidth));
   const overnight=app.getByRole('button',{name:/^OVERNIGHT:/});
   assert.equal(await overnight.count(),2);
   const [first,second]=await overnight.evaluateAll(buttons=>buttons.map(button=>{
    const box=button.getBoundingClientRect(),track=button.parentElement.getBoundingClientRect();
    return {fromLeft:box.left-track.left,toRight:track.right-box.right,width:box.width};
   }));
   assert.ok(Math.abs(first.toRight)<1&&Math.abs(second.fromLeft)<1&&Math.abs(2*first.width-second.width)<1);
   await overnight.last().click();
   assert.equal(await app.getByLabel('Flight number').inputValue(),'OVERNIGHT');
   await app.getByRole('button',{name:'Close editor',exact:true}).click();
   const noteName={name:'Notes for 2026-12-28',exact:true};
   const note=groups.first().getByRole('textbox',noteName);
   await note.fill('Hotel check-in');
   await app.reload();
   assert.equal(await toggle.getAttribute('aria-pressed'),'true');
   assert.equal(await note.inputValue(),'Hotel check-in');
   assert.equal(await groups.last().getByRole('textbox',noteName).inputValue(),'');
   await groups.last().getByRole('button',{name:'+ Add ticket',exact:true}).click();
   assert.match(await app.getByRole('dialog').innerText(),/Later trip/);
   await app.getByRole('button',{name:'Close editor',exact:true}).click();

   await app.setViewportSize({width:390,height:844});
   assert.ok(await app.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.ok(await app.locator('.scroll').evaluate(element=>element.scrollWidth>element.clientWidth));
   assert.equal((await dates())[0].length,7);
   await toggle.click();
   assert.equal(await rows.count(),1);
   assert.equal(await overnight.count(),1);
   assert.equal(await rows.locator('.option-section').first().getByRole('textbox',noteName).inputValue(),'Hotel check-in');
   assert.deepEqual(browserErrors,[]);
   await app.close();
  });
 }finally{
  await context.close();if(server)await new Promise(resolve=>server.close(resolve));await rm(profile,{recursive:true,force:true});
 }
});
