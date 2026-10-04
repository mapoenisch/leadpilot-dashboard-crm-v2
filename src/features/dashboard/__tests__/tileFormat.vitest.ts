// Auftrag 073 (Dashboard Teilauftrag 4): Formatierung der Kachelwerte und Kopfzeilen.
import { describe, expect, it } from 'vitest';
import {
  filterModeLabel,
  formatAsOf,
  formatPeriod,
  formatTileValue,
  SOURCE_LABEL,
  timeLabel,
} from '../components/tileFormat';

describe('formatTileValue', () => {
  it('kürzt EUR ab 1 Mio. nur in der Zahlansicht', () => {
    expect(formatTileValue(2_345_678, 'EUR', 'kompakt')).toBe('2,35 Mio. EUR');
    expect(formatTileValue(2_345_678, 'EUR', 'exakt')).toBe('2.345.678 EUR');
    expect(formatTileValue(950_000, 'EUR', 'kompakt')).toBe('950.000 EUR');
    expect(formatTileValue(-1_200_000, 'EUR', 'kompakt')).toBe('-1,2 Mio. EUR');
  });

  it('zeigt Vielfache und Prozent mit einer Nachkommastelle', () => {
    expect(formatTileValue(3.24, 'x', 'kompakt')).toBe('3,2x');
    expect(formatTileValue(3, 'x', 'exakt')).toBe('3,0x');
    expect(formatTileValue(12.48, '%', 'kompakt')).toBe('12,5 %');
  });

  it('hängt andere Einheiten an die Zahl an', () => {
    expect(formatTileValue(1234, 'Kunden', 'kompakt')).toBe('1.234 Kunden');
    expect(formatTileValue(12.5, 'FTE', 'exakt')).toBe('12,5 FTE');
    expect(formatTileValue(7, '', 'exakt')).toBe('7');
  });

  it('zeigt fehlende oder nicht endliche Werte als „Keine Daten“, nie als 0', () => {
    expect(formatTileValue(null, 'EUR', 'kompakt')).toBe('Keine Daten');
    expect(formatTileValue(Number.NaN, 'EUR', 'exakt')).toBe('Keine Daten');
    expect(formatTileValue(0, 'EUR', 'exakt')).toBe('0 EUR');
  });
});

describe('Zeitbezug und Quelle', () => {
  it('formatiert den Live-Zeitstempel in deutscher Zeit', () => {
    expect(formatAsOf('2026-10-04T12:05:00Z')).toBe('Stand 04.10.2026, 14:05');
    expect(formatAsOf('kein Datum')).toBeNull();
  });

  it('nennt die Zeitbasis und bei Live zusätzlich den Messzeitpunkt', () => {
    expect(timeLabel('Geschäftsjahr 2025', null)).toBe('Geschäftsjahr 2025');
    expect(timeLabel('Live', '2026-10-04T12:05:00Z')).toBe('Live · Stand 04.10.2026, 14:05');
  });

  it('formatiert Zeiträume als Kalendertage', () => {
    expect(formatPeriod({ from: '2026-01-01', to: '2026-03-31' })).toBe('01.01.2026 – 31.03.2026');
  });

  it('benennt Quelle und Filtermodus in Worten', () => {
    expect(SOURCE_LABEL).toEqual({ baseline: 'Stammdaten', crm: 'CRM', live: 'Live' });
    expect(filterModeLabel('dashboard')).toBe('Dashboard-Filter');
    expect(filterModeLabel('eigener_zeitraum')).toBe('Eigener Zeitraum');
    expect(filterModeLabel('fester_stand')).toBe('Fester historischer Stand');
  });
});
