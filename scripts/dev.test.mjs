import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
function invoke(args, overrides = {}) {
  // Security-negative CLI fixtures only. These deliberately invalid targets must never connect.
  const env = { ...process.env, DB_URL: 'jdbc:postgresql://invalid.example/forbidden?sslmode=require', DB_USERNAME: 'fixture', DB_PASSWORD: 'fixture-do-not-print', ...overrides };
  const result = spawnSync(process.execPath, ['scripts/dev.mjs', ...args], { cwd: root, env, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.error, undefined);
  const output = result.stdout + result.stderr;
  assert.ok(!output.includes('fixture-do-not-print'));
  assert.ok(!output.includes('DO_NOT_PRINT_OVERRIDE_VALUE'));
  return { status: result.status, output };
}
test('unapproved migration exits before operator credentials or any database action', () => {
  const result = invoke(['migrate']); assert.equal(result.status, 1); assert.match(result.output, /Explicit operator approval required/); assert.doesNotMatch(result.output, /FlywayExecutor|PRIMARY=/);
});
test('approval flag cannot be attached to a status command', () => {
  const result = invoke(['status', '--approved']); assert.equal(result.status, 1); assert.match(result.output, /Invalid startup arguments/);
});
test('a non-PRIMARY target fails before JDBC instead of silently falling back', () => {
  const result = invoke(['status']); assert.equal(result.status, 1); assert.match(result.output, /PRIMARY Neon JDBC URL/); assert.doesNotMatch(result.output, /FlywayExecutor|PRIMARY=/);
});
test('hidden Spring config overrides are rejected by name without leaking values', () => {
  const result = invoke(['status'], { SPRING_CONFIG_LOCATION: 'DO_NOT_PRINT_OVERRIDE_VALUE' }); assert.equal(result.status, 1); assert.match(result.output, /Conflicting startup override SPRING_CONFIG_LOCATION/); assert.doesNotMatch(result.output, /FlywayExecutor|PRIMARY=/);
});
