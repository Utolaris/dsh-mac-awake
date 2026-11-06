import {test,expect} from 'bun:test';
import {probeDesktopApp} from './desktop-state.js';

test('accepts only the AppKit probe active response, without requiring focus', async () => {
  let script='';
  const exec=(bin,args,opts,cb)=>{script=args[3];cb(null,'active\n');};
  expect(await probeDesktopApp(123,exec)).toBe(true);
  expect(script).toContain('com.deepseek.dsh');
  expect(script).toContain('activationPolicy');
  expect(script).not.toContain('.hidden');
  expect(script).not.toContain('.active');
});

test('fails closed when app is absent, non-regular or query fails', async () => {
  expect(await probeDesktopApp(0,()=>{throw Error('should not execute')})).toBe(false);
  expect(await probeDesktopApp(123,(_b,_a,_o,cb)=>cb(null,'inactive\n'))).toBe(false);
  expect(await probeDesktopApp(123,(_b,_a,_o,cb)=>cb(new Error('timeout'),''))).toBe(false);
});
