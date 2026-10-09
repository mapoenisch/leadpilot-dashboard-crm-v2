// Auftrag 087 (Paket D, Designmuster): Muster zur Sichtabnahme durch Marc.
// Richtung „ruhige Weiterentwicklung“ mit 3D-Tiefe (Entscheidung Marc 09.10.2026, Variante B):
// bestehende Farben/Schriften und Depth3d-Diagramme, kompakter Kopf, Kennzahl vorn, klare
// Quellenzeile, Touchfläche ≥ 44 px. Je Muster: Normalfall, langer Titel, Fehler, keine Daten.
// Daten: belegte Quartalswerte aus dem Faktenblatt (src/domain/vertriebData.ts), keine Fantasiezahlen.
// Nur in der Vorschau (dashboard-vorschau.html?bereich=muster), kein Produkt-Schalter.
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ChartTile, LANGER_TITEL, NumberTile } from './designPatternTiles';
import { EditorPattern, FunnelPattern, MobileHomePattern } from './designPatternScreens';

type Theme = 'dark' | 'light';
function PatternSection(props: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section aria-labelledby={props.id} className="flex flex-col gap-3">
      <h2 id={props.id} className="m-0 text-[18px] font-semibold [overflow-wrap:anywhere]">
        {props.title}
      </h2>
      <p className="m-0 max-w-[720px] text-[13px] text-[var(--color-text-muted)]">{props.hint}</p>
      {props.children}
    </section>
  );
}

export function DesignPatternPreview() {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return (
    <div data-muster-seite className="flex flex-col gap-8">
      {/* Werte über den Säulen sind im Diagramm fest weiß – im hellen Modus unlesbar. Im Muster folgt
          die Farbe dem Textton. Das Fehlerrot (#ff5a5f) erreicht auf dunkler Fläche nur 4,46:1 und wird im
          Muster aufgehellt. Die Produktdarstellung ändert sich erst nach Marcs Freigabe. */}
      <style>{`[data-muster] svg text[font-weight="700"] { fill: var(--color-text-primary); } [data-muster] svg text:not([font-weight="700"]) { fill: var(--color-text-muted); } [data-muster-seite] button { white-space: normal; text-align: left; flex-shrink: 1; min-width: 44px; min-height: 44px; max-width: 100%; } [data-theme="dark"] [data-muster] .text-error { color: #ff7a7e; }`}</style>
      <header className="flex flex-col gap-2">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Paket D · Designmuster zur Sichtabnahme
        </p>
        <h1 className="m-0 text-[24px] font-semibold [overflow-wrap:anywhere]">
          Ruhige Weiterentwicklung mit 3D-Tiefe
        </h1>
        <p className="m-0 max-w-[720px] text-[13px] text-[var(--color-text-muted)]">
          Bestehende Farben, Schriften und 3D-Diagramme. Jedes Muster zeigt Normalfall, langen
          Titel, Fehler und fehlende Daten. Werte aus dem Faktenblatt v1.1.
        </p>
        <div role="group" aria-label="Farbmodus" className="flex gap-2">
          {(['dark', 'light'] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={theme === mode ? 'primary' : 'secondary'}
              aria-pressed={theme === mode}
              className="min-h-[44px]"
              onClick={() => setTheme(mode)}
            >
              {mode === 'dark' ? 'Dunkel' : 'Hell'}
            </Button>
          ))}
        </div>
      </header>

      <PatternSection
        id="muster-zahl"
        title="Muster 1 – Kompakte Zahlkachel"
        hint="Kennzahl groß vorn, Einordnung daneben. Fehler zeigt „Nicht verfügbar“ statt 0."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberTile id="zahl-normal" title="Neukunden 2025" state="bereit" />
          <NumberTile id="zahl-lang" title={LANGER_TITEL} state="bereit" />
          <NumberTile id="zahl-fehler" title="Neukunden 2025" state="fehler" />
          <NumberTile id="zahl-leer" title="Neukunden 2025" state="leer" />
        </div>
      </PatternSection>

      <PatternSection
        id="muster-verlauf"
        title="Muster 2 – Verlauf/Verteilung mit 3D-Tiefe"
        hint="Summe vorn, darunter die 3D-Säulen. Werte über den Säulen folgen dem Textton (im hellen Modus lesbar)."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ChartTile id="verlauf-normal" title="Neukunden je Quartal 2025" state="bereit" />
          <ChartTile id="verlauf-lang" title={LANGER_TITEL} state="bereit" />
          <ChartTile id="verlauf-fehler" title="Neukunden je Quartal 2025" state="fehler" />
          <ChartTile id="verlauf-leer" title="Neukunden je Quartal 2025" state="leer" />
        </div>
      </PatternSection>

      <PatternSection
        id="muster-mobil-start"
        title="Muster 3 – Mobile Dashboard-Startseite"
        hint="375 px: Filter zunächst zu, vier Schlüsselzahlen im 2er-Raster, darunter die Kacheln."
      >
        <MobileHomePattern />
      </PatternSection>

      <PatternSection
        id="muster-funnel-seite"
        title="Muster 4 – Funnel-Fachseite"
        hint="Echte HTML-Seite statt Bild: 3D-Balken und Tabelle aus derselben Faktenblatt-Quelle."
      >
        <FunnelPattern />
      </PatternSection>

      <PatternSection
        id="muster-editor-ansicht"
        title="Muster 5 – Vereinfachter Editor"
        hint="Eine Aktionsleiste je Kachel statt vier Knöpfen; Einstellungen in vier Bereichen; Speichern bleibt sichtbar."
      >
        <EditorPattern />
      </PatternSection>
    </div>
  );
}
