// Designprobe Dashboard-Testkachel (Teilauftrag 0): Pfad der Vorschauroute.
// Die Route gibt es nur im Entwicklungsmodus oder in einem Build mit VITE_DASHBOARD_PREVIEW=true
// (CI-Artefakt `dashboard-preview`). Die Bedingung steht als statischer Ausdruck in src/app/App.tsx,
// damit ein normaler Produktionsbuild Import und Chunk der Vorschau ganz weglässt.
export const DASHBOARD_PREVIEW_PATH = '/dashboard-vorschau';
