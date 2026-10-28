import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = path.join(root, 'backend');
const state = path.join(backend, 'target', 'primary-dev');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: backend, stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed; startup stopped (exit ${result.status ?? 'unavailable'}).`);
}
function database(action, approved = false) {
  mkdirSync(state, { recursive: true });
  const classpathFile = path.join(state, 'classpath.txt');
  const source = path.join(backend, 'scripts', 'PrimaryDatabase.java');
  const compiled = path.join(state, 'classes', 'PrimaryDatabase.class');
  if (!existsSync(classpathFile) || statSync(path.join(backend, 'pom.xml')).mtimeMs > statSync(classpathFile).mtimeMs) {
    const args = ['-q', 'dependency:build-classpath', '-DincludeScope=runtime', '-Dmdep.outputFile=target/primary-dev/classpath.txt'];
    if (process.platform === 'win32') run(path.join(process.env.SystemRoot, 'System32', 'cmd.exe'), ['/d', '/s', '/c', 'mvn ' + args.join(' ')]);
    else run('mvn', args);
  }
  const dependencies = readFileSync(classpathFile, 'utf8').trim();
  if (!existsSync(compiled) || statSync(source).mtimeMs > statSync(compiled).mtimeMs || statSync(classpathFile).mtimeMs > statSync(compiled).mtimeMs) {
    mkdirSync(path.dirname(compiled), { recursive: true });
    run('javac', ['-encoding', 'UTF-8', '-cp', dependencies, '-d', path.dirname(compiled), source]);
  }
  run('java', ['-cp', path.dirname(compiled) + path.delimiter + dependencies, 'PrimaryDatabase', action, ...(approved ? ['--approved'] : [])]);
}
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  if (!response.ok) throw new Error('Health HTTP failure');
  return response.text();
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function monitor() {
  const deadline = Date.now() + 120000;
  let ready = false, failures = 0;
  while (true) {
    try {
      const [api, , proxy] = await Promise.all([get('http://localhost:8080/api/v1/genres'), get('http://localhost:3000'), get('http://localhost:3000/api/v1/genres')]);
      if (JSON.stringify(JSON.parse(api)) !== JSON.stringify(JSON.parse(proxy))) throw new Error('API proxy mismatch');
      failures = 0;
      if (!ready) {
        const status = JSON.parse(readFileSync(path.join(state, 'status.json'), 'utf8'));
        console.log(`READY: PRIMARY Neon V${status.installed}/V${status.source}; pending=${status.pending}; failed=${status.failed}; backend/frontend/API proxy PASS`);
        ready = true;
      }
    } catch {
      if (!ready && Date.now() >= deadline || ready && ++failures >= 3) throw new Error('Backend/frontend/proxy health failed; no readiness inferred from Maven BUILD SUCCESS.');
    }
    await pause(2000);
  }
}
async function start() {
  database('check');
  console.log('PRIMARY schema current. Starting normal Spring Boot and Next.js; Ctrl+C stops all services.');
  const quote = value => `"${value}"`;
  const monitorCommand = `${quote(process.execPath)} ${quote(fileURLToPath(import.meta.url))} monitor`;
  const { result } = concurrently([
    { command: 'cd backend && mvn spring-boot:run', name: 'backend', prefixColor: 'blue' },
    { command: 'pnpm --dir frontend dev', name: 'frontend', prefixColor: 'magenta' },
    { command: monitorCommand, name: 'health', prefixColor: 'green' },
  ], { cwd: root, ...(process.platform === 'win32' ? { shell: path.join(process.env.SystemRoot, 'System32', 'cmd.exe') } : {}), killOthersOn: ['failure', 'success'], restartTries: 0, prefix: 'name' });
  try { await result; } catch { process.exitCode = 1; }
}
try {
  const action = process.argv[2] ?? 'start';
  const flags = process.argv.slice(3).filter(value => value !== '--');
  if (flags.some(value => value !== '--approved') || flags.length > 1 || flags.length && action !== 'migrate') throw new Error('Invalid startup arguments.');
  if (action === 'status') database('status');
  else if (action === 'migrate') {
    if (!flags.includes('--approved')) throw new Error('Explicit operator approval required: pnpm db:migrate --approved');
    database('migrate', true);
  } else if (action === 'monitor') await monitor();
  else if (action === 'start') await start();
  else throw new Error('Unknown startup action.');
} catch (failure) { console.error(failure.message); process.exitCode = 1; }
