// Designprobe Dashboard-Testkachel (Teilauftrag 0) und Kachelgalerie (Auftrag 073): Vorschauseite
// ohne Anmeldung. Feste Beispiel- bzw. Testdaten; keine Produktivdaten, keine Speicherung.
// `?ansicht=<Darstellung>` zeigt nur Galeriekacheln dieser Darstellung und blendet die Testkachel
// aus (sie startet mit Säulen und würde sonst immer das Säulenmodul laden): Netzwerknachweis.
// Der Arbeitsbereich (Auftrag 074) steht unter der Galerie; `?bereich=editor` zeigt nur ihn, und
// `?ansicht=` blendet ihn aus, damit der Netzwerknachweis der Galerie unverändert bleibt.
import { DashboardDesignPreview } from './DashboardDesignPreview';
import { DashboardEditorPreview } from './DashboardEditorPreview';
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

export function readEditorOnly(search: string): boolean {
  return new URLSearchParams(search).get('bereich') === 'editor';
}

export function readTileCount(search: string): number | undefined {
  const count = Number(new URLSearchParams(search).get('kacheln'));
  return Number.isInteger(count) && count > 0 && count <= 24 ? count : undefined;
}

export function readLoading(search: string): boolean {
  return new URLSearchParams(search).get('status') === 'laden';
}

export function DashboardPreviewPage({
  search = typeof window === 'undefined' ? '' : window.location.search,
}: {
  search?: string;
}) {
  const onlyView = readViewFilter(search);
  const editorOnly = readEditorOnly(search);
  return (
    <main className="min-h-screen bg-[var(--color-bg-deep,#051413)] px-4 py-8 text-[var(--color-text-soft,#e6f3f1)] sm:px-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        {onlyView ? <h1 className="sr-only">Kachelgalerie: {onlyView}</h1> : null}
        {editorOnly ? <h1 className="sr-only">Dashboard-Arbeitsbereich</h1> : null}
        {onlyView || editorOnly ? null : (
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
        {editorOnly ? null : <TileGalleryPreview onlyView={onlyView} />}
        {onlyView ? null : (
          <DashboardEditorPreview loading={readLoading(search)} tileCount={readTileCount(search)} />
        )}
      </div>
    </main>
  );
}
