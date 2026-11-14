export const POSTGREST_PAGE_SIZE = 1000;

export interface FetchChunkedOptions {
  pageSize?: number;
  orderColumn?: string;
  ascending?: boolean;
  tieBreakColumn?: string;
  filter?: { column: string; value: unknown };
}

interface ChainableBuilder {
  eq?: (column: string, value: unknown) => unknown;
  order?: (column: string, options?: { ascending?: boolean }) => unknown;
  range?: (from: number, to: number) => unknown;
}

export interface PagingClient {
  from: (table: string) => { select: (columns: string) => unknown };
}

/**
 * Universeller seitenweiser Vollbestandsabruf gegen Supabase / PostgREST (Auftrag 156).
 *
 * Hintergrund:
 * PostgREST begrenzt Antworten standardmäßig auf 1.000 Zeilen (config.toml max_rows = 1000).
 * Ohne .range(...) werden größere Tabellen stillschweigend abgeschnitten.
 *
 * Diese Hilfsfunktion lädt Chunks bis zum vollständigen Datenbestand:
 * - Chunk-Größe: standardmäßig 1.000 Zeilen.
 * - .range(from, from + pageSize - 1).
 * - Stabile Primärschlüssel-/Spalten-Sortierung mit optionalem Tie-Break (z. B. 'id').
 * - Abbruchbedingung: chunk.length < pageSize.
 */
export async function fetchChunkedTable<Row>(
  client: PagingClient,
  table: string,
  options: FetchChunkedOptions = {},
): Promise<Row[]> {
  const pageSize = options.pageSize ?? POSTGREST_PAGE_SIZE;
  const rows: Row[] = [];

  for (let from = 0; ; from += pageSize) {
    let builder: unknown = client.from(table).select('*');
    if (options.filter) {
      const withFilter = (builder as ChainableBuilder).eq?.(
        options.filter.column,
        options.filter.value,
      );
      if (withFilter !== undefined) {
        builder = withFilter;
      }
    }

    const orderFn = (builder as ChainableBuilder).order;
    if (options.orderColumn && typeof orderFn === 'function') {
      builder = orderFn.call(builder, options.orderColumn, {
        ascending: options.ascending ?? true,
      });
      const tieBreakFn = (builder as ChainableBuilder).order;
      if (
        options.tieBreakColumn &&
        options.tieBreakColumn !== options.orderColumn &&
        typeof tieBreakFn === 'function'
      ) {
        builder = tieBreakFn.call(builder, options.tieBreakColumn, { ascending: true });
      }
    } else if (options.tieBreakColumn && typeof orderFn === 'function') {
      builder = orderFn.call(builder, options.tieBreakColumn, { ascending: true });
    }

    const rangeFn = (builder as ChainableBuilder).range;
    if (typeof rangeFn === 'function') {
      builder = rangeFn.call(builder, from, from + pageSize - 1);
    }

    const result = (await builder) as { data: unknown[] | null; error: unknown } | null | undefined;
    if (result && result.error) {
      throw result.error;
    }
    const chunk = ((result && result.data) ?? []) as Row[];
    rows.push(...chunk);

    if (typeof rangeFn !== 'function' || chunk.length < pageSize) {
      break;
    }
  }

  return rows;
}
