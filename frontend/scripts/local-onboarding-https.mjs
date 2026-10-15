// Local-only HTTPS reverse proxy. No trust-store modifications or request logging.
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import { readFile } from 'node:fs/promises';

const privateRoot = new URL('../../backend/target/staff-onboarding-local-e2e-2026-10-15/private/', import.meta.url);
const server = https.createServer({
  key: await readFile(new URL('tls-key.pem', privateRoot)),
  cert: await readFile(new URL('tls-cert.pem', privateRoot)), minVersion: 'TLSv1.2',
}, (request, response) => {
  if (!request.url?.startsWith('/') || !['127.0.0.1:8443', '127.0.0.1'].includes(request.headers.host)) { response.writeHead(400); response.end(); return; }
  const upstream = http.request({
    hostname: '127.0.0.1', port: 3000, method: request.method, path: request.url,
    headers: { ...request.headers, host: '127.0.0.1:3000', 'x-forwarded-host': '127.0.0.1:8443', 'x-forwarded-proto': 'https' },
  }, incoming => {
    const activation = new URL(request.url, 'https://127.0.0.1:8443').pathname === '/staff/activate';
    response.writeHead(incoming.statusCode ?? 502, { ...incoming.headers, ...(activation ? { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } : {}) });
    incoming.pipe(response);
  });
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end('Local frontend unavailable.'); });
  request.on('aborted', () => upstream.destroy()); request.pipe(upstream);
});
// Next dev's Turbopack transport needs the real upstream WebSocket handshake.
server.on('upgrade', (request, socket, head) => {
  if (!request.url?.startsWith('/_next/') || request.headers.host !== '127.0.0.1:8443') { socket.destroy(); return; }
  const upstream = net.connect(3000, '127.0.0.1', () => {
    const headers = { ...request.headers, host: '127.0.0.1:3000', 'x-forwarded-host': '127.0.0.1:8443', 'x-forwarded-proto': 'https' };
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`);
    for (const [key, value] of Object.entries(headers)) if (value !== undefined) upstream.write(`${key}: ${Array.isArray(value) ? value.join(', ') : value}\r\n`);
    upstream.write('\r\n'); if (head.length) upstream.write(head);
    socket.pipe(upstream); upstream.pipe(socket);
  });
  upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy());
  socket.on('close', () => upstream.destroy());
});
server.listen(8443, '127.0.0.1', () => console.log('Local HTTPS ready:127.0.0.1:8443; upstream127.0.0.1:3000; no request logging.'));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
