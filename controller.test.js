import { test, expect } from 'bun:test';
import { EventEmitter } from 'node:events';
import { createController } from './index.js';
import { parsePeriods } from './schedule.js';

function setup() {
  let active = true, parent = 12, date = new Date(2026,0,2,11,59), starts = 0, stops = 0;
  const children = [];
  function makeChild(bin,args) {
    expect(bin).toBe('/usr/bin/caffeinate'); expect(args).toEqual(['-i','-w','777']);
    starts++;
    const c = new EventEmitter(); c.exitCode = null; c.signalCode = null; c.unref = () => {};
    c.kill = () => { stops++; c.signalCode = 'SIGTERM'; c.emit('exit',null,'SIGTERM'); };
    children.push(c); return c;
  }
  const controller = createController({periods:parsePeriods([{start:'12:00',end:'14:00'}]),hostPid:777,desktopPid:12,
    currentParent:()=>parent, now:()=>date, probe:async()=>active, spawnProcess:makeChild,
    logger:{warn(){},error(){}}});
  return {controller, setActive:v=>active=v, setParent:v=>parent=v, setTime:(h,m)=>date=new Date(2026,0,2,h,m),
    counts:()=>({starts,stops}), children};
}

test('keeps assertion only while desktop active and outside disabled times', async () => {
  const x=setup();
  await x.controller.refresh(); await x.controller.refresh(); expect(x.counts()).toEqual({starts:1,stops:0});
  x.setTime(12,0); await x.controller.refresh(); expect(x.counts()).toEqual({starts:1,stops:1});
  x.setTime(14,0); await x.controller.refresh(); expect(x.counts()).toEqual({starts:2,stops:1});
  x.setActive(false); await x.controller.refresh(); expect(x.counts()).toEqual({starts:2,stops:2});
  x.setActive(true); await x.controller.refresh(); expect(x.counts()).toEqual({starts:3,stops:2});
  x.setParent(1); await x.controller.refresh(); expect(x.counts()).toEqual({starts:3,stops:3});
  x.controller.dispose();
});

test('late desktop probes cannot revive a disposed controller', async () => {
  let resolveProbe, spawned=0;
  const c=createController({desktopPid:12,currentParent:()=>12,probe:()=>new Promise(resolve=>resolveProbe=resolve),
    spawnProcess:()=>{spawned++;},logger:{warn(){},error(){}}});
  const pending=c.refresh(); c.dispose(); resolveProbe(true); await pending; expect(spawned).toBe(0);
});

test('a delayed active result cannot restart during a newly disabled interval', async () => {
  let resolveProbe, spawned=0, date=new Date(2026,0,2,11,59);
  const c=createController({periods:parsePeriods([{start:'12:00',end:'14:00'}]),desktopPid:12,currentParent:()=>12,
    now:()=>date,probe:()=>new Promise(resolve=>resolveProbe=resolve),spawnProcess:()=>{spawned++;},
    logger:{warn(){},error(){}}});
  const pending=c.refresh(); date=new Date(2026,0,2,12,0); resolveProbe(true); await pending;
  expect(spawned).toBe(0); c.dispose();
});

test('a failed state query releases the existing assertion', async () => {
  const x=setup(); await x.controller.refresh(); x.setActive(false); await x.controller.refresh();
  expect(x.counts()).toEqual({starts:1,stops:1}); x.controller.dispose();
});
