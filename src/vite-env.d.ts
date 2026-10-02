/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom/vitest" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Designprobe Testkachel: Vorschauroute im Build einschalten (nur CI-Artefakt). */
  readonly VITE_DASHBOARD_PREVIEW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
