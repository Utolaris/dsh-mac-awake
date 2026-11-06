import { execFile } from 'node:child_process';

/**
 * Check whether the DSH Desktop parent is a regular macOS application.
 * This does not depend on focus, window visibility, lock-screen, or minimization.
 * A missing process, background-only activation policy, timeout, or error fails closed.
 */
export function probeDesktopApp(pid, exec = execFile) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return Promise.resolve(false);
  const script = [
    "ObjC.import('AppKit');",
    'const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(' + pid + ');',
    "if (app.isNil()) { 'inactive'; } else {",
    "const bundle = app.bundleIdentifier.isNil() ? '' : ObjC.unwrap(app.bundleIdentifier);",
    "(bundle === 'com.deepseek.dsh' && Number(app.activationPolicy) === 0 && !Boolean(app.terminated)) ? 'active' : 'inactive';",
    '}',
  ].join('\n');
  return new Promise((resolve) => {
    exec('/usr/bin/osascript', ['-l', 'JavaScript', '-e', script],
      { timeout: 5000, maxBuffer: 4096 }, (error, stdout) => {
        resolve(!error && stdout.trim() === 'active');
      });
  });
}
