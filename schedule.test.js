import { describe, test, expect } from 'bun:test';
import { parseTime, parsePeriods, isDisabledTime } from './schedule.js';

function time(h, m) { return new Date(2026, 0, 2, h, m); }

describe('local disabled periods', () => {
  test('supports several ranges, exact boundaries and overnight ranges', () => {
    const p = parsePeriods([{start:'12:00', end:'14:00'}, {start:'22:00', end:'06:00'}]);
    for (const [h, m] of [[12,0],[13,59],[22,0],[23,59],[0,0],[5,59]]) expect(isDisabledTime(p, time(h,m))).toBe(true);
    for (const [h, m] of [[6,0],[11,59],[14,0],[21,59]]) expect(isDisabledTime(p, time(h,m))).toBe(false);
  });
  test('uses the union of overlapping periods and defaults to none', () => {
    const p = parsePeriods([{start:'12:00', end:'14:00'}, {start:'13:00', end:'15:00'}]);
    expect(isDisabledTime(p,time(14,30))).toBe(true);
    expect(isDisabledTime(parsePeriods(),time(12,0))).toBe(false);
  });
  test('rejects ambiguous and invalid input', () => {
    for (const t of ['24:00','6:00','12:60','-1:00','',null]) expect(() => parseTime(t)).toThrow();
    expect(() => parsePeriods('12:00')).toThrow();
    expect(isDisabledTime(parsePeriods([{start:'12:00',end:'12:00'}]),time(0,0))).toBe(true);
  });
});
