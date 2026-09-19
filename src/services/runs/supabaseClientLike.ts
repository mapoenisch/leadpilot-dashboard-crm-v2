import { supabase } from '@/services/db/supabaseClient';

// 067F / G49 — minimaler struktureller Client-Typ für Supabase-Zugriffe.
// Der echte Client wird per Cast übergeben (dokumentiert); Tests nutzen
// schlanke Mocks derselben Form.

export interface DbResult {
  data: unknown;
  error: { message: string } | null;
}

export interface QueryBuilder {
  eq: (column: string, value: unknown) => Promise<DbResult>;
}

export interface SelectBuilder {
  select: (columns: string) => QueryBuilder;
}

export interface SupabaseLike {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<DbResult>;
  from: (table: string) => SelectBuilder;
}

export function resolveClient(client?: SupabaseLike | null): SupabaseLike | null {
  if (client !== undefined) return client;
  if (!supabase) return null;
  return supabase as unknown as SupabaseLike;
}

export function resultData<T>(result: DbResult, context: string): T {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data as T;
}
