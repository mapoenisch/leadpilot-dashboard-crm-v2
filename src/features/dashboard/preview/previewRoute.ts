// Designprobe Dashboard-Testkachel (Teilauftrag 0): Adresse der Vorschau.
// Die Vorschau ist eine eigene HTML-Seite mit eigenem Einstieg (previewMain.tsx), getrennt von der
// Produktiv-App. Vite liefert sie im Dev-Modus aus; gebaut wird sie nur mit VITE_DASHBOARD_PREVIEW=true
// (CI-Artefakt `dashboard-preview`, siehe vite.config.ts). Ein normaler Produktionsbuild enthält sie nicht.
export const DASHBOARD_PREVIEW_PATH = '/dashboard-vorschau.html';
