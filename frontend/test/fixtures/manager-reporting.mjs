// Synthetic HTTP responses ONLY. Not Neon accounts, sales, issuance or provider evidence.
export const reportFixtureRange = { from: '2026-05-10', to: '2026-05-17', cinemaId: '11' };
/** @returns {import('../../src/features/manager/manager-report.types').ReportMetrics} */
export function reportMetricsFixture(overrides = {}) {
  return { confirmedRevenue:'128500000.0000',grossAmount:'131200000.0000',discountAmount:'2700000.0000',seatGrossAmount:'100200000.0000',concessionGrossAmount:'31000000.0000',confirmedBookings:'748',ticketsSold:'1256',guestsSold:'1380',bookingsCreated:'842',showtimes:'96',capacitySeatUnits:'2000',soldSeatUnits:'1370',occupancyPercent:'68.5000',...overrides };
}
/** @returns {import('../../src/features/manager/manager-report.types').ManagerReportActivity} */
export function reportActivityFixture(empty = false) {
  const counts = {bookingsByStatus:[['PENDING','54'],['PAID','748'],['EXPIRED','25'],['CANCELLED','15']],paymentsByStatus:[['INITIATED','40'],['PENDING','14'],['SUCCESS','748'],['FAILED','30'],['CANCELLED','10']],ticketsByStatus:[['VALID','56'],['CHECKED_IN','1180'],['EXPIRED','10'],['CANCELLED','10']],showtimesByStatus:[['DRAFT','4'],['SCHEDULED','20'],['OPEN_FOR_BOOKING','50'],['STARTED','10'],['ENDED','16'],['CANCELLED','2']]};
  return { ...Object.fromEntries(Object.entries(counts).map(([k,rows])=>[k,rows.map(([status,count])=>({status,count:empty?'0':count}))])),checkedInTickets:empty?'0':'1180',reconciliationAttempts:empty?'0':'2' };
}
export function reportPeriodFixture(q = reportFixtureRange) {
  const midnight = d => new Date(Date.parse(`${d}T00:00:00Z`)-7*3600000).toISOString().replace('.000Z','Z');
  return {...q,cinemaId:q.cinemaId??null,movieId:q.movieId??null,showtimeId:q.showtimeId??null,startInclusive:midnight(q.from),endExclusive:midnight(q.to),timezone:'Asia/Ho_Chi_Minh',currency:'VND',paymentEnvironment:'SANDBOX'};
}
export function reportSummaryFixture(q = reportFixtureRange, empty = false) {
  // Dashboard and summary MUST be identical for the same period and scope.
  const metrics = reportMetricsFixture(q.from.endsWith('-01')?{confirmedRevenue:'184250000.0000',grossAmount:'186950000.0000',seatGrossAmount:'142800000.0000',concessionGrossAmount:'44150000.0000'}:{});
  if(empty)for(const key of Object.keys(metrics))metrics[key]=key==='occupancyPercent'?null:key.endsWith('Amount')||key==='confirmedRevenue'?'0.0000':'0';
  return {period:reportPeriodFixture(q),metrics,activity:reportActivityFixture(empty)};
}
export function reportDailyFixture(q = reportFixtureRange, empty = false) {
  const values=['14800000.0000','12200000.0000','15500000.0000','16800000.0000','21400000.0000','26400000.0000','21400000.0000'];
  const items=[];
  const days=(Date.parse(`${q.to}T00:00:00Z`)-Date.parse(`${q.from}T00:00:00Z`))/86400000;
  const weights=days===16?[112,215,215,68,82,132,84,128,215,215,63,76,124,88,134,210]:Array.from({length:days},(_,i)=>BigInt(values[i%7].replace('.','')));
  const weightTotal=weights.reduce((sum,n)=>sum+BigInt(n),0n), totals=reportSummaryFixture(q).metrics;
  const remaining=Object.fromEntries(['confirmedRevenue','grossAmount','discountAmount','seatGrossAmount','concessionGrossAmount'].map(k=>[k,BigInt(totals[k].replace('.',''))]));
  for(let cursor=new Date(`${q.from}T00:00:00Z`);cursor.toISOString().slice(0,10)<q.to;cursor.setUTCDate(cursor.getUTCDate()+1)) {
    const date=cursor.toISOString().slice(0,10), index=items.length;
    const amounts=Object.fromEntries(Object.keys(remaining).map(k=>{const n=index===days-1?remaining[k]:BigInt(totals[k].replace('.',''))*BigInt(weights[index])/weightTotal;remaining[k]-=n;return[k,`${n/10000n}.${String(n%10000n).padStart(4,'0')}`]}));
    items.push({date,metrics:empty?reportSummaryFixture(q,true).metrics:reportMetricsFixture(amounts),activity:reportActivityFixture(empty)});
  }
  return {period:reportPeriodFixture(q),items};
}
export function reportBreakdownsFixture(q = reportFixtureRange, dimension = 'MOVIE', page = 0, size = 5, large = false, empty = false) {
  const names=['Dune: Part Two','Godzilla x Kong','Kung Fu Panda 4','Mai','Exhuma: Quật Mộ Trùng Ma'];
  const total=empty?0:dimension==='CINEMA'?1:large?12:5;
  const items=Array.from({length:total},(_,i)=>({id:dimension==='CINEMA'?'11':q.movieId&&dimension==='MOVIE'?q.movieId:q.showtimeId&&dimension==='SHOWTIME'?q.showtimeId:String(9007199254740993n+BigInt(i)),name:dimension==='CINEMA'?'Smart Cinema Landmark 81':dimension==='SHOWTIME'?`${names[i%5]} · Landmark 81 · Phòng ${i+1}`:names[i%5],cinemaId:dimension==='SHOWTIME'?'11':null,movieId:dimension==='SHOWTIME'?'51':null,startsAt:dimension==='SHOWTIME'?'2026-05-14T12:30:00Z':null,metrics:reportMetricsFixture({confirmedRevenue:['54200000.0000','38000000.0000','21400000.0000','14900000.0000','0.0000'][i%5],ticketsSold:['542','380','214','120','0'][i%5]}),activity:reportActivityFixture()}));
  return {period:reportPeriodFixture(q),dimension,page,size,totalElements:String(total),items:items.slice(page*size,(page+1)*size)};
}
export function reportConcessionsFixture(q = reportFixtureRange, page = 0, size = 5, large = false, empty = false) {
  const names=['Coca-Cola 32oz','Combo Mega Duo','Bắp phô mai lớn (L)','Bắp caramel lớn (L)','Nước suối Dasani 500ml'];
  const total=empty?0:large?8:5;
  return {period:reportPeriodFixture(q),page,size,totalElements:String(total),items:Array.from({length:total},(_,i)=>({id:String(9007199254740893n+BigInt(i)),name:names[i%5],category:['DRINK','COMBO','POPCORN','POPCORN','DRINK'][i%5],quantity:['420','310','280','160','110'][i%5],grossAmount:['12600000.0000','10100000.0000','12600000.0000','7200000.0000','1650000.0000'][i%5],confirmedBookings:'100'})).slice(page*size,(page+1)*size)};
}
