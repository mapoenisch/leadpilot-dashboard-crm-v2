// Designprobe Dashboard-Testkachel (Teilauftrag 0): Vorschauseite ohne Anmeldung.
// Zeigt nur die Testkachel auf festen Beispieldaten; keine Produktivdaten, keine Speicherung.
import { DashboardDesignPreview } from './DashboardDesignPreview';

export function DashboardPreviewPage() {
  return (
    <main className="min-h-screen bg-[var(--color-background,#051413)] px-4 py-8 text-[var(--color-text-primary,#e6f3f1)] sm:px-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            Executive Dashboard · Designprobe
          </p>
          <h1 className="m-0 text-[24px] font-semibold">Testkachel</h1>
          <p className="m-0 max-w-[720px] text-[13px] text-[var(--color-text-muted)]">
            Darstellung oben umschalten, Größe unten wählen. Mit der Maus über das Diagramm fahren
            oder die Schaltflächen unter dem Diagramm nutzen. Alle Werte sind Beispieldaten.
          </p>
        </header>
        <DashboardDesignPreview />
      </div>
    </main>
  );
}
