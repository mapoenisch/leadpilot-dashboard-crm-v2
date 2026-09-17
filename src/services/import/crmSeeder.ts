/**
 * G46 (Auftrag 067C): Browser-Seeder aus dem produktiven Pfad entfernt
 * (Design §10.3). Dieser Stub existiert nur, damit historische Verweise einen
 * harten, ehrlichen Fehler statt stiller Demo-Schreibpfade erzeugen —
 * analog zum LocalAuth-Stub aus G45. Kein Browser-Client, keine Inserts.
 * Ersatzpfad (einzige legitime Quelle synthetischer Demo-Daten): die
 * transactionale SQL-Bootstrap-Migration
 * supabase/migrations/20260920_demo_bootstrap.sql (BEGIN/COMMIT, idempotent
 * per ON CONFLICT, ausschließlich Demo-Organisation). Ein privilegierter
 * Ad-hoc-Seed außerhalb von Migrationen existiert nicht.
 */
export interface SeedResult {
  success: boolean;
  companiesInserted: number;
  contactsInserted: number;
  dealsInserted: number;
  message: string;
  error?: string;
}

export async function seedSupabaseDatabase(): Promise<SeedResult> {
  throw new Error(
    'Browser-Seed wurde in G46 entfernt. Demo-Daten kommen aus versionierten SQL-Migrationen.',
  );
}
