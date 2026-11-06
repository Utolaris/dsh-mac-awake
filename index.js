import { spawn } from 'node:child_process';
import { parsePeriods, isDisabledTime } from './schedule.js';
import { probeDesktopApp } from './desktop-state.js';

export const name = 'mac-stay-awake-local';
const PREFIX = '[mac-stay-awake-local]';

/** Controller is separated from the Cordis lifecycle for focused testing. */
export function createController({
  periods = [], probe = probeDesktopApp, now = () => new Date(),
  hostPid = process.pid, desktopPid = process.ppid,
  currentParent = () => process.ppid, spawnProcess = spawn,
  pollMs = 10000, logger = console,
} = {}) {
  let child = null;
  let disposed = false;
  let checking = false;
  let timer;

  function stop() {
    const previous = child;
    child = null;
    if (previous && previous.exitCode === null && previous.signalCode === null) previous.kill();
  }

  function start() {
    if (child) return;
    const current = spawnProcess('/usr/bin/caffeinate', ['-i', '-w', String(hostPid)], { stdio: 'ignore' });
    child = current;
    current.on('error', (error) => {
      if (child === current) child = null;
      logger.error(PREFIX, 'failed to start caffeinate:', error.message);
    });
    current.on('exit', (code, signal) => {
      if (child === current) {
        child = null;
        if (!disposed) logger.warn(PREFIX, 'caffeinate stopped unexpectedly:', code, signal);
      }
    });
    current.unref();
  }

  async function refresh() {
    if (disposed || checking) return;
    // Parent loss or a disabled interval takes effect without waiting for AppKit.
    if (desktopPid <= 1 || currentParent() !== desktopPid || isDisabledTime(periods, now())) {
      stop();
      return;
    }
    checking = true;
    let active = false;
    try { active = await probe(desktopPid); }
    catch (error) { logger.warn(PREFIX, 'desktop state check failed:', error.message); }
    finally { checking = false; }
    if (disposed) return;
    // Re-check after the async probe: time or parent may have changed meanwhile.
    if (active && currentParent() === desktopPid && !isDisabledTime(periods, now())) start();
    else stop();
  }

  function run() {
    void refresh();
    timer = setInterval(() => void refresh(), pollMs);
    timer.unref();
  }
  function dispose() {
    disposed = true;
    if (timer) clearInterval(timer);
    stop();
  }
  return { run, refresh, dispose };
}

export function apply(ctx, input = {}) {
  ctx.effect(() => {
    if (process.platform !== 'darwin') {
      console.warn(PREFIX, 'macOS only; no assertion created');
      return () => {};
    }
    const config = typeof input?.get === 'function' ? input.get() : input;
    let periods;
    try { periods = parsePeriods(config?.disabledPeriods); }
    catch (error) {
      // An invalid schedule must never leave the machine awake indefinitely.
      console.error(PREFIX, 'invalid configuration; keep-awake disabled:', error.message);
      return () => {};
    }
    const controller = createController({ periods });
    controller.run();
    return () => controller.dispose();
  });
}
