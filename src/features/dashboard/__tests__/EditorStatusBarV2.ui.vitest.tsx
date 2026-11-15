// Auftrag 159 (P10a): UI- und Branch-Coverage-Tests für die V2-Statusleiste.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  EditorStatusBarV2,
  formatByteSize,
  formatStatusTime,
  type EditorStatusBarV2Props,
} from '../components/editor/EditorStatusBarV2';
import type { EditorLiveStatus } from '../time/useEditorLiveStatus';

function baseStatus(overrides?: Partial<EditorLiveStatus>): EditorLiveStatus {
  return {
    connection: 'verbunden',
    lastEventAt: '2026-11-15T14:30:00.000Z',
    dataAsOf: '2026-11-15T14:30:00.000Z',
    pausedSince: null,
    ...overrides,
  };
}

function baseProps(overrides?: Partial<EditorStatusBarV2Props>): EditorStatusBarV2Props {
  return {
    liveStatus: baseStatus(),
    tileCount: 6,
    undoCount: 2,
    redoCount: 0,
    memoryBytes: 500 * 1024,
    ...overrides,
  };
}

describe('EditorStatusBarV2 Formatierungshelfer', () => {
  it('formatiert Bytes, KiB und MiB korrekt', () => {
    expect(formatByteSize(500)).toBe('500 B');
    expect(formatByteSize(1024)).toBe('1.0 KiB');
    expect(formatByteSize(10 * 1024 * 1024)).toBe('10.00 MiB');
  });

  it('formatiert ISO-Zeitstempel sicher und ignoriert ungültige Werte', () => {
    expect(formatStatusTime(null)).toBeNull();
    expect(formatStatusTime('ungueltig')).toBeNull();
    expect(formatStatusTime('2026-11-15T14:32:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('EditorStatusBarV2 Verbindung & Statusanzeigen', () => {
  it('zeigt alle Verbindungszustände mit zugehörigem Text und Icon', () => {
    const states: Array<EditorLiveStatus['connection']> = [
      'verbunden',
      'wiederverbinden',
      'offline',
      'nicht_konfiguriert',
      'kein_live_inhalt',
      'verbindet',
    ];

    for (const connection of states) {
      const { unmount } = render(
        <EditorStatusBarV2 {...baseProps({ liveStatus: baseStatus({ connection }) })} />,
      );
      const el = screen.getByTestId('connection-status');
      expect(el.getAttribute('data-connection')).toBe(connection);
      unmount();
    }
  });

  it('spricht Statusansagen bei Verbindungs- und Pausenwechsel an', () => {
    const { rerender } = render(
      <EditorStatusBarV2 {...baseProps({ liveStatus: baseStatus({ connection: 'verbindet' }) })} />,
    );

    // Initial mount hat keine Ansage
    expect(screen.getByTestId('live-status-announcement').textContent).toBe('');

    // Verbindungswechsel
    rerender(
      <EditorStatusBarV2 {...baseProps({ liveStatus: baseStatus({ connection: 'verbunden' }) })} />,
    );
    expect(screen.getByTestId('live-status-announcement').textContent).toBe(
      'Live-Verbindung hergestellt.',
    );

    rerender(
      <EditorStatusBarV2
        {...baseProps({ liveStatus: baseStatus({ connection: 'wiederverbinden' }) })}
      />,
    );
    expect(screen.getByTestId('live-status-announcement').textContent).toBe(
      'Live-Verbindung unterbrochen, verbinde neu.',
    );

    rerender(
      <EditorStatusBarV2 {...baseProps({ liveStatus: baseStatus({ connection: 'offline' }) })} />,
    );
    expect(screen.getByTestId('live-status-announcement').textContent).toBe(
      'Live-Verbindung getrennt.',
    );

    rerender(
      <EditorStatusBarV2
        {...baseProps({ liveStatus: baseStatus({ connection: 'nicht_konfiguriert' }) })}
      />,
    );
    expect(screen.getByTestId('live-status-announcement').textContent).toBe(
      'Live-Feed ist nicht konfiguriert.',
    );

    // Pausenwechsel mit Zeit
    rerender(
      <EditorStatusBarV2
        {...baseProps({
          liveStatus: baseStatus({ pausedSince: '2026-11-15T14:32:00.000Z' }),
        })}
      />,
    );
    expect(screen.getByTestId('live-status-announcement').textContent).toMatch(
      /^Anzeige angehalten um \d{2}:\d{2}\.$/,
    );

    // Fortsetzen
    rerender(
      <EditorStatusBarV2 {...baseProps({ liveStatus: baseStatus({ pausedSince: null }) })} />,
    );
    expect(screen.getByTestId('live-status-announcement').textContent).toBe('Anzeige fortgesetzt.');

    // Pausieren mit ungültiger Zeit
    rerender(
      <EditorStatusBarV2
        {...baseProps({
          liveStatus: baseStatus({ pausedSince: 'ungueltiges-datum' }),
        })}
      />,
    );
    expect(screen.getByTestId('live-status-announcement').textContent).toBe('Anzeige angehalten.');
  });

  it('unterscheidet Zeitstände für Live, Pause und fehlende Daten', () => {
    // Live mit Datenstand
    const { rerender } = render(
      <EditorStatusBarV2
        {...baseProps({
          liveStatus: baseStatus({
            lastEventAt: '2026-11-15T14:30:00.000Z',
            dataAsOf: '2026-11-15T14:30:00.000Z',
            pausedSince: null,
          }),
        })}
      />,
    );
    expect(screen.getByTestId('live-last-event').textContent).toContain('Letzte neue Daten:');
    expect(screen.getByTestId('data-timestamp').textContent).toContain('Datenstand:');

    // Live ohne Events und ohne Datenstand
    rerender(
      <EditorStatusBarV2
        {...baseProps({
          liveStatus: baseStatus({ lastEventAt: null, dataAsOf: null, pausedSince: null }),
        })}
      />,
    );
    expect(screen.getByTestId('live-last-event').textContent).toContain(
      'Noch keine Daten empfangen',
    );
    expect(screen.getByTestId('data-timestamp').textContent).toContain('Kein aktueller Datenstand');

    // Pausiert mit Zeit
    rerender(
      <EditorStatusBarV2
        {...baseProps({
          liveStatus: baseStatus({ pausedSince: '2026-11-15T14:32:00.000Z' }),
        })}
      />,
    );
    expect(screen.getByTestId('data-timestamp').textContent).toContain('Angehalten seit');

    // Pausiert mit ungültigem ISO
    rerender(
      <EditorStatusBarV2
        {...baseProps({
          liveStatus: baseStatus({ pausedSince: 'kaputt' }),
        })}
      />,
    );
    expect(screen.getByTestId('data-timestamp').textContent).toBe('Angehalten');
  });

  it('zeigt Kachelbudget in Normal-, Warn- und Voll-Zustand sowie mit Teilaktivierung', () => {
    const { rerender } = render(
      <EditorStatusBarV2 {...baseProps({ tileCount: 10, maxTiles: 24 })} />,
    );
    expect(screen.getByTestId('tile-budget-counter').textContent).toBe('10 / 24 Kacheln');

    // Warnstufe (21 von 24)
    rerender(<EditorStatusBarV2 {...baseProps({ tileCount: 21, maxTiles: 24 })} />);
    expect(screen.getByTestId('tile-budget-counter').className).toContain('text-amber-400');

    // Vollstufe (24 von 24)
    rerender(<EditorStatusBarV2 {...baseProps({ tileCount: 24, maxTiles: 24 })} />);
    expect(screen.getByTestId('tile-budget-counter').className).toContain('text-rose-400');

    // activeTileCount != tileCount
    rerender(
      <EditorStatusBarV2 {...baseProps({ tileCount: 12, activeTileCount: 8, maxTiles: 24 })} />,
    );
    expect(screen.getByTestId('tile-budget-counter').textContent).toBe('8 von 12 aktiv (max. 24)');
  });

  it('stellt Verlauf, Redo-Zähler und Speicherwarnung dar', () => {
    const { rerender } = render(
      <EditorStatusBarV2
        {...baseProps({
          undoCount: 1,
          redoCount: 0,
          memoryBytes: 2 * 1024 * 1024,
          memoryWarning: false,
        })}
      />,
    );
    expect(screen.getByTestId('history-stats').textContent).toContain('1 Schritt');
    expect(screen.getByTestId('history-stats').textContent).not.toContain('(+');

    // Mehrere Schritte & Redo vorhanden & Speicherwarnung
    rerender(
      <EditorStatusBarV2
        {...baseProps({
          undoCount: 5,
          redoCount: 2,
          memoryBytes: 16 * 1024 * 1024,
          memoryWarning: true,
        })}
      />,
    );
    expect(screen.getByTestId('history-stats').textContent).toContain('5 Schritte (+2)');
    expect(screen.getByTestId('history-stats').textContent).toContain('Budget > 15 MB');
    expect(screen.getByTestId('history-stats').className).toContain('text-amber-400');
  });
});
