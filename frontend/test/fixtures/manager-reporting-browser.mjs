import { reportSummaryFixture, reportDailyFixture, reportBreakdownsFixture, reportConcessionsFixture } from './manager-reporting.mjs';

// Every API is intercepted. Fixture sessions are not real authentication evidence.
export async function installManagerReportingFixtures(page, role = 'MANAGER') {
  await page.addInitScript(role => localStorage.setItem('smart-cinema.auth-session',JSON.stringify({accessToken:'fixture-manager-reporting',tokenType:'Bearer',expiresAt:Date.now()+3600000,refreshToken:'fixture-only',refreshExpiresAt:Date.now()+86400000,user:{id:61,email:'manager@example.test',fullName:'Trần Nhật Minh',role}})),role);
  /** @type {{path:string,query:string,method:string,authorization:string|undefined}[]} */
  const requests=[];
  /** @type {string[]} */
  const writes=[];
  const state={requests,writes,failure:0,denied:false,malformed:false,mismatch:false,empty:false,large:false,zeroCapacity:false,delay:0,network:false,huge:false};
  await page.route('**/api/v1/**',async route=>{
    const r=route.request(),u=new URL(r.url()),path=u.pathname;
    requests.push({path,query:u.search,method:r.method(),authorization:r.headers().authorization});
    if(r.method()!=='GET'){writes.push(path);return route.fulfill({status:405,json:{}});}
    if(role!=='MANAGER'||state.denied)return route.fulfill({status:403,json:{}});
    if(path==='/api/v1/manager/cinemas')return route.fulfill({json:[{id:'11',name:'Smart Cinema Landmark 81',address:'Địa chỉ QA',contact:null,operatingInformation:null,status:'ACTIVE'},{id:'12',name:'Smart Cinema Sala Thủ Thiêm',address:'Địa chỉ QA',contact:null,operatingInformation:null,status:'ACTIVE'}]});
    if(!path.match(/^\/api\/v1\/manager\/(dashboard|reports\/(summary|daily|breakdowns|concessions))$/))return route.fulfill({status:404,json:{}});
    const delay=state.delay, failure=state.failure;
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    if(state.network)return route.abort('failed');
    if(failure)return route.fulfill({status:failure,headers:failure===429?{'Retry-After':'1'}:{},json:{detail:'private SQL must not render'}});
    if(state.malformed)return route.fulfill({json:{private:'private SQL must not render'}});
    const p=u.searchParams,q={from:p.get('from'),to:p.get('to'),...Object.fromEntries(['cinemaId','movieId','showtimeId'].filter(k=>p.has(k)).map(k=>[k,p.get(k)]))};
    const page=Number(p.get('page')??0),size=Number(p.get('size')??5);
    const body=path.endsWith('daily')?reportDailyFixture(q,state.empty):path.endsWith('breakdowns')?reportBreakdownsFixture(q,p.get('dimension'),page,size,state.large,state.empty):path.endsWith('concessions')?reportConcessionsFixture(q,page,size,state.large,state.empty):reportSummaryFixture(q,state.empty);
    if(state.mismatch)body.period.cinemaId='999';
    if('metrics'in body&&state.zeroCapacity){body.metrics.capacitySeatUnits='0';body.metrics.soldSeatUnits='0';body.metrics.occupancyPercent=null;}
    if('metrics'in body&&state.huge)body.metrics.confirmedRevenue='123456789012345678901234567890.1234';
    return route.fulfill({json:body});
  });
  return state;
}
