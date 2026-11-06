import { spawn } from 'node:child_process';

export const name = 'mac-stay-awake-local';

// The idle-system-sleep assertion leaves display sleep and screen locking alone.
// -w also releases the assertion if the DSH host exits without disposing.
export function apply(ctx) {
  ctx.effect(() => {
    if (process.platform !== 'darwin') {
      console.warn('[mac-stay-awake-local] macOS only; no assertion created');
      return () => {};
    }

    const child = spawn('/usr/bin/caffeinate', ['-i', '-w', String(process.pid)], {
      stdio: 'ignore',
    });
    let disposing = false;
    child.on('error', (error) => {
      console.error('[mac-stay-awake-local] failed to start caffeinate:', error.message);
    });
    child.on('exit', (code, signal) => {
      if (!disposing) console.warn('[mac-stay-awake-local] caffeinate stopped unexpectedly:', code, signal);
    });
    child.unref();
    return () => {
      disposing = true;
      if (child.exitCode === null && child.signalCode === null) child.kill();
    };
  });
}
