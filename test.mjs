import { strict as assert } from 'node:assert';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createController } from './index.js';

function caffeineChild(parent) {
  const rows = execFileSync('ps', ['-axo','pid=,ppid=,command='], {encoding:'utf8'}).split('\n');
  for (const row of rows) {
    const m = row.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
    if (m && Number(m[2]) === parent && m[3].includes('caffeinate') && m[3].includes('-i -w ' + parent)) return Number(m[1]);
  }
  return null;
}
function alive(pid) {
  try { process.kill(pid,0); return true; } catch(e) { if (e.code === 'ESRCH') return false; throw e; }
}
const controller = createController({desktopPid:12,currentParent:()=>12,probe:async()=>true});
let pid;
try {
  await controller.refresh(); await delay(200);
  pid = caffeineChild(process.pid);
  assert.ok(pid, 'controller must start caffeinate tied to host');
  const report = execFileSync('pmset',['-g','assertions'],{encoding:'utf8'});
  const lines=report.split('\n').filter(line=>line.includes('pid '+pid+'(caffeinate)'));
  assert.ok(lines.some(line=>line.includes('PreventUserIdleSystemSleep')));
  assert.ok(!lines.some(line=>line.includes('PreventUserIdleDisplaySleep')));
} finally { controller.dispose(); }
await delay(300);
assert.equal(alive(pid),false,'disposing must stop caffeinate');
console.log('PASS: idle assertion present, display unaffected, disposal releases');

const script = `import {createController} from './index.js'; const c=createController({desktopPid:12,currentParent:()=>12,probe:async()=>true}); await c.refresh(); console.log('READY'); setInterval(()=>{},1000);`;
const host=spawn(process.execPath,['-e',script],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
let childPid;
try {
  const ready=await Promise.race([once(host.stdout,'data'),delay(5000).then(()=>{throw new Error('host did not start');})]);
  assert.match(ready[0].toString(),/READY/); await delay(200);
  childPid=caffeineChild(host.pid); assert.ok(childPid,'host fixture must start caffeinate');
} finally {
  host.kill('SIGTERM');
  if (host.exitCode===null && host.signalCode===null) await once(host,'exit');
}
await delay(700);
assert.equal(alive(childPid),false,'caffeinate -w must stop after host exits');
console.log('PASS: unexpected host exit releases assertion');
