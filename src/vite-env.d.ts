/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom/vitest" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Auftrag 077: `true` schaltet die persönliche Executive-Ansicht ein (Standard aus). */
  readonly VITE_EXECUTIVE_DASHBOARD_V2?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
