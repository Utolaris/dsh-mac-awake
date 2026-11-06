import { strict as assert } from 'node:assert';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { apply } from './index.js';

function caffeineChild(parent) {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], {encoding:'utf8'}).split('\n');
  for (const row of rows) {
    const m = row.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
    if (m && Number(m[2]) === parent && m[3].includes('caffeinate') && m[3].includes('-i -w ' + parent)) return Number(m[1]);
  }
  return null;
}
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { if (e.code === 'ESRCH') return false; throw e; }
}
let dispose;
let pid;
try {
  apply({effect(fn) { dispose = fn(); }});
  await delay(200);
  pid = caffeineChild(process.pid);
  assert.ok(pid, 'plugin must start a caffeinate child tied to the host');
  const report = execFileSync('pmset', ['-g', 'assertions'], {encoding:'utf8'});
  const line = report.split('\n').find(line => line.includes('pid ' + pid + '(caffeinate)') && line.includes('PreventUserIdleSystemSleep'));
  assert.ok(line, 'caffeinate must hold PreventUserIdleSystemSleep');
  assert.ok(!report.split('\n').some(line => line.includes('pid ' + pid + '(caffeinate)') && line.includes('PreventUserIdleDisplaySleep')), 'must not prevent display sleep');
} finally { if (dispose) dispose(); }
await delay(300);
assert.equal(alive(pid), false, 'disposal must stop caffeinate');
console.log('PASS: idle sleep blocked; display sleep allowed; dispose releases assertion');

const script = `import {apply} from './index.js'; apply({effect(fn){fn()}}); console.log('READY'); setInterval(()=>{},1000);`;
const host = spawn(process.execPath, ['-e', script], {cwd: process.cwd(), stdio:['ignore','pipe','pipe']});
let childPid;
try {
  const ready = await Promise.race([once(host.stdout,'data'), delay(5000).then(() => {throw new Error('host did not start');})]);
  assert.match(ready[0].toString(), /READY/);
  await delay(200);
  childPid = caffeineChild(host.pid);
  assert.ok(childPid, 'fixture must start caffeinate');
} finally {
  host.kill('SIGTERM');
  if (host.exitCode === null && host.signalCode === null) await once(host, 'exit');
}
await delay(700);
assert.equal(alive(childPid), false, 'caffeinate -w must stop after host exits');
console.log('PASS: unexpected host exit releases assertion');
