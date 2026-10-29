import { managerBookingFixture } from './manager-booking.mjs';

// HTTP response fixtures only. Every request is intercepted; no real login/DB mutation.
export async function installManagerBookingFixtures(page, role = 'MANAGER') {
  await page.addInitScript(role => localStorage.setItem('smart-cinema.auth-session', JSON.stringify({ accessToken: 'fixture-manager-booking', tokenType: 'Bearer', expiresAt: Date.now() + 3600000, refreshToken: 'fixture-only', refreshExpiresAt: Date.now() + 86400000, user: { id: 61, email: 'manager@example.test', fullName: 'Trần Nhật Minh', role } })), role);
  const detail = structuredClone(managerBookingFixture);
  const cinema = { id: '11', name: 'Smart Cinema Landmark 81', address: 'Địa chỉ QA', contact: null, operatingInformation: null, status: 'ACTIVE' };
  const rows = [detail.booking, ...[
    ['9007199254740994','BK-88419','Avatar: Fire and Ash','PENDING','620000.0000','12:00:00'],
    ['9007199254740995','BK-88410','Oppenheimer','PAID','210000.0000','10:15:00'],
    ['9007199254740996','BK-88395','Dune: Part Two','CANCELLED','140000.0000','09:00:00'],
    ['9007199254740997','BK-88382','Spider-Man: Beyond','PAID','490000.0000','08:30:00'],
  ].map(([id,bookingCode,movieTitle,status,finalAmount,time], i) => ({ ...detail.booking, id,bookingCode,movieTitle,status,storedStatus:status,finalAmount,startsAt:`2026-04-14T${time}Z`, createdAt:`2026-04-14T11:${String(40-i).padStart(2,'0')}:00Z`, latestPayment: status === 'PENDING' ? { ...detail.payments[0], status:'PENDING', completedAt:null } : detail.payments[0] }))];
  /** @type {{path:string,query:string,method:string,authorization:string|undefined}[]} */
  const requests=[];
  /** @type {string[]} */
  const writes=[];
  const state = { detail, rows, requests, writes, failure: 0, denied: false, malformed: false, delay: 0, large: false };
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    state.requests.push({ path, query: url.search, method: request.method(), authorization: request.headers().authorization });
    if (request.method() !== 'GET') { state.writes.push(path); return route.fulfill({ status: 405, json: {} }); }
    if (path.startsWith('/api/v1/manager/') && (role !== 'MANAGER' || state.denied)) return route.fulfill({ status: 403, json: {} });
    if (path === '/api/v1/manager/cinemas') return route.fulfill({ json: [cinema] });
    if (path.startsWith('/api/v1/manager/bookings')) {
      if (state.delay) await new Promise(r => setTimeout(r,state.delay));
      if (state.failure) return route.fulfill({ status: state.failure, json: { detail: 'private SQL/signature' }, headers: state.failure === 429 ? { 'Retry-After':'1' } : {} });
      if (state.malformed) return route.fulfill({ json: { secret: 'must not render' } });
      if (path !== '/api/v1/manager/bookings') return path === `/api/v1/manager/bookings/${detail.booking.id}` ? route.fulfill({ json: state.detail }) : route.fulfill({ status: 404, json: {} });
      const q = url.searchParams, size = Number(q.get('size') ?? 20), index = Number(q.get('page') ?? 0);
      const filtered = state.rows.filter(b => ['cinemaId','showtimeId','bookingCode','status'].every(k=>!q.has(k)||b[k]===q.get(k)) && (!q.has('bookingId')||b.id===q.get('bookingId')) && (!q.has('paymentStatus')||b.latestPayment?.status===q.get('paymentStatus')) && (!q.has('createdFrom')||b.createdAt>=q.get('createdFrom')) && (!q.has('createdTo')||b.createdAt<q.get('createdTo')));
      const items = state.large ? Array.from({length:25},(_,i)=>({...state.rows[0],id:String(9007199254740993n+BigInt(i)),bookingCode:`BK-${88421-i}`})) : filtered;
      return route.fulfill({ json: { items:items.slice(index*size,(index+1)*size),page:index,size,totalElements:items.length,totalPages:Math.ceil(items.length/size),serverTime:detail.serverTime } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return state;
}
