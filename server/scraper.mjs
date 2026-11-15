import {load} from 'cheerio';
import {chromium} from 'playwright';
import {parseSiteText} from '../src/site-parser.ts';
export function checkUrl(raw){
 const url=new URL(raw);
 if(url.protocol!=='https:'||!['ru.trip.com','www.trip.com','trip.com'].includes(url.hostname)||url.port||url.username||url.password||!['/flights/passenger','/flights/showfarefirst'].includes(url.pathname))throw Error('Use a Trip.com passenger or flight-results HTTPS link.');
 return url;
}
export function parseHtml(html,url){
 const $=load(html);$('script,style,input,textarea').remove();
 const blocks=$('[aria-label]').toArray().filter(el=>/Вылет рейса/.test($(el).attr('aria-label')||''));
 for(const el of blocks){try{return parseSiteText($(el).text(),url);}catch{}}
 return parseSiteText($('body').text(),url);
}
export async function scrape(raw){
 const url=checkUrl(raw);let status;
 try{
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000)});status=response.status;
  if(response.ok){const html=await response.text();try{return parseHtml(html,url.href);}catch{}}
 }catch{}
 // Isolated, anonymous browser: never connects to the user's Chrome profile.
 let browser;
 try{
  browser=await chromium.launch({headless:true,timeout:10000});
  const context=await browser.newContext({locale:'ru-RU',serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const request=route.request(),target=new URL(request.url());
   if(request.isNavigationRequest()&&request.frame()===context.pages()[0]?.mainFrame()){
    try{checkUrl(target.href);}catch{return route.abort();}
   }
   if(!['https:','data:','blob:'].includes(target.protocol)||['image','media','font'].includes(request.resourceType()))return route.abort();
   return route.continue();
  });
  const page=await context.newPage();
  const response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:20000});
  if(response&&!response.ok())throw Error(`Trip.com returned HTTP ${response.status()}.`);
  const summary=page.locator('[aria-label*="Вылет рейса"]').first();
  await summary.waitFor({timeout:12000});
  try{await summary.click({timeout:2000});}catch{}
  return parseSiteText(await summary.innerText(),url.href);
 }catch(error){
  if(String(error).includes("Executable doesn't exist"))throw Error('Install the scraper browser with npm run setup:scraper, then retry. You can also paste expanded flight details below.');
  const reason=String(error).match(/net::ERR_[A-Z_]+|HTTP \d{3}/)?.[0];
  throw Error(`Trip.com could not be read automatically${reason?` (${reason})`:status?` (HTTP ${status})`:''}. The page may be blocked, expired, or require a session. Open the source, expand the itinerary, and paste only the flight details below.`);
 }finally{await browser?.close();}
}
export function importMiddleware({origin}={}){
 if(origin){
  const url=new URL(origin);
  if(!['http:','https:'].includes(url.protocol)||url.origin!==origin)throw Error('WAYLINE_ORIGIN must be an HTTP(S) origin without a path or credentials.');
 }
 let active=false;
 return async(req,res,next)=>{
  if(req.url!=='/api/import-flight')return next();
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  const reply=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
  if(req.method!=='POST')return reply(405,{error:'Use POST.'});
  // Reverse proxies use an explicit origin, never untrusted forwarding headers.
  const expectedOrigin=origin||`${req.socket?.encrypted?'https':'http'}://${req.headers.host}`;
  if(req.headers.origin&&req.headers.origin!==expectedOrigin)return reply(403,{error:'Use the Wayline page on the same origin.'});
  if(active)return reply(429,{error:'Another import is in progress. Please retry shortly.'});
  let body='';
  try{
   for await(const chunk of req){body+=chunk;if(body.length>16000)return reply(413,{error:'Flight link is too long.'});}
   const {url}=JSON.parse(body);checkUrl(url);if(active)return reply(429,{error:'Another import is in progress. Please retry shortly.'});active=true;
   try{reply(200,{ticket:await scrape(url)});}finally{active=false;}
  }catch(error){reply(422,{error:error.message||'Could not import this flight.'});}
 };
}
