import { describe, it, expect } from 'vitest';
import {
  isDataOlderThanMaxAlarmAge,
  MAX_ALARM_DATA_AGE_MS,
  MAX_ALARM_DATA_AGE_HOURS,
} from '../model/alarmDataAge';

describe('alarmDataAge (Auftrag 168 / P13c)', () => {
  it('exports correct constants', () => {
    expect(MAX_ALARM_DATA_AGE_HOURS).toBe(24);
    expect(MAX_ALARM_DATA_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('returns false for empty or falsy timestamps', () => {
    expect(isDataOlderThanMaxAlarmAge(undefined)).toBe(false);
    expect(isDataOlderThanMaxAlarmAge(null)).toBe(false);
    expect(isDataOlderThanMaxAlarmAge('')).toBe(false);
  });

  it('evaluates string ISO timestamps correctly', () => {
    const now = 1700000000000;
    const freshIso = new Date(now - 1000).toISOString();
    const staleIso = new Date(now - MAX_ALARM_DATA_AGE_MS - 5000).toISOString();

    expect(isDataOlderThanMaxAlarmAge(freshIso, now)).toBe(false);
    expect(isDataOlderThanMaxAlarmAge(staleIso, now)).toBe(true);
  });

  it('evaluates Date instances correctly', () => {
    const now = 1700000000000;
    const freshDate = new Date(now - 1000);
    const staleDate = new Date(now - MAX_ALARM_DATA_AGE_MS - 10000);

    expect(isDataOlderThanMaxAlarmAge(freshDate, now)).toBe(false);
    expect(isDataOlderThanMaxAlarmAge(staleDate, now)).toBe(true);
  });

  it('evaluates numeric millisecond timestamps correctly', () => {
    const now = 1700000000000;
    const freshNum = now - 500;
    const staleNum = now - MAX_ALARM_DATA_AGE_MS - 1;

    expect(isDataOlderThanMaxAlarmAge(freshNum, now)).toBe(false);
    expect(isDataOlderThanMaxAlarmAge(staleNum, now)).toBe(true);
  });

  it('returns false for invalid timestamps that evaluate to NaN', () => {
    expect(isDataOlderThanMaxAlarmAge('invalid-date-string')).toBe(false);
    expect(isDataOlderThanMaxAlarmAge(NaN)).toBe(false);
  });
});
