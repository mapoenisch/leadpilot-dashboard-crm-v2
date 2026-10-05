// Designprobe Dashboard-Testkachel (Teilauftrag 0) und Kachelgalerie (Auftrag 073): Vorschauseite
// ohne Anmeldung. Feste Beispiel- bzw. Testdaten; keine Produktivdaten, keine Speicherung.
// `?ansicht=<Darstellung>` zeigt nur Galeriekacheln dieser Darstellung und blendet die Testkachel
// aus (sie startet mit Säulen und würde sonst immer das Säulenmodul laden): Netzwerknachweis.
import { DashboardDesignPreview } from './DashboardDesignPreview';
import { TileGalleryPreview } from './TileGalleryPreview';
import type { DashboardView } from '../model/dashboardCatalog';

const VIEWS: readonly DashboardView[] = [
  'zahl',
  'tabelle',
  'saeulen',
  'balken',
  'kreis',
  'ring',
  'linie',
  'flaeche',
  'uebersicht',
];

export function readViewFilter(search: string): DashboardView | undefined {
  const value = new URLSearchParams(search).get('ansicht');
  return VIEWS.find((view) => view === value);
}

export function DashboardPreviewPage({
  search = typeof window === 'undefined' ? '' : window.location.search,
}: {
  search?: string;
}) {
  const onlyView = readViewFilter(search);
  return (
    <main className="min-h-screen bg-[var(--color-background,#051413)] px-4 py-8 text-[var(--color-text-primary,#e6f3f1)] sm:px-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        {onlyView ? <h1 className="sr-only">Kachelgalerie: {onlyView}</h1> : null}
        {onlyView ? null : (
          <>
            <header className="flex flex-col gap-2">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                Executive Dashboard · Designprobe
              </p>
              <h1 className="m-0 text-[24px] font-semibold">Testkachel</h1>
              <p className="m-0 max-w-[720px] text-[13px] text-[var(--color-text-muted)]">
                Darstellung oben umschalten, Größe unten wählen. Mit der Maus über das Diagramm
                fahren oder die Schaltflächen unter dem Diagramm nutzen. Alle Werte sind
                Beispieldaten.
              </p>
            </header>
            <DashboardDesignPreview />
          </>
        )}
        <TileGalleryPreview onlyView={onlyView} />
      </div>
    </main>
  );
}
