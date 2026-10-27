import concurrently from 'concurrently';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const scriptPath = path.join(projectRoot, 'scripts', 'local-dev.ps1');
const powershellPath = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const { result } = concurrently([
  { action: 'Backend', name: 'backend', prefixColor: 'blue' },
  { action: 'Frontend', name: 'frontend', prefixColor: 'magenta' },
  { action: 'Monitor', name: 'health', prefixColor: 'green' },
].map(({ action, name, prefixColor }) => ({
  command: `"${powershellPath}" -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Action ${action}`,
  name,
  prefixColor,
})), {
  cwd: projectRoot,
  shell: path.join(process.env.SystemRoot, 'System32', 'cmd.exe'),
  killOthersOn: ['failure', 'success'],
  restartTries: 0,
  prefix: 'name',
});

try {
  await result;
} catch {
  process.exitCode = 1;
}
