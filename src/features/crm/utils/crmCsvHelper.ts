/**
 * RFC 4180 konformer CSV-Parser und Serializer für den CRM-Export.
 * Unterstützt BOM (\uFEFF), Zellen mit Kommas, Zeilenumbrüchen (\r\n / \n)
 * sowie maskierten Anführungszeichen ("").
 *
 * Auftrag 138: Der Export nutzt ausschließlich die serverseitigen Filter;
 * das nachträgliche Überschreiben von Phasen im Browser entfällt.
 */
import { fetchCrmExportBlob } from '@/services/crm/crmExportService';

export async function readBlobAsText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Fehler beim Lesen des Blobs'));
    reader.readAsText(blob);
  });
}

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < clean.length && clean[i + 1] === '"') {
          cell += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cell += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        currentRow.push(cell);
        cell = '';
        i++;
      } else if (ch === '\r') {
        if (i + 1 < clean.length && clean[i + 1] === '\n') {
          i++;
        }
        currentRow.push(cell);
        rows.push(currentRow);
        currentRow = [];
        cell = '';
        i++;
      } else if (ch === '\n') {
        currentRow.push(cell);
        rows.push(currentRow);
        currentRow = [];
        cell = '';
        i++;
      } else {
        cell += ch;
        i++;
      }
    }
  }

  if (cell.length > 0 || currentRow.length > 0) {
    currentRow.push(cell);
    rows.push(currentRow);
  }

  // Entferne evtl. leere Abschlusszeilen
  if (rows.length > 1) {
    const last = rows[rows.length - 1];
    if (last && last.length === 1 && last[0] === '') {
      rows.pop();
    }
  }

  return rows;
}

export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Formelschutz gegen CSV-Injection (analog zu supabase/functions/crm-query-export)
  if (/^\s*[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeCsv(rows: string[][]): string {
  return '\uFEFF' + rows.map((r) => r.map((c) => sanitizeCsvCell(c)).join(',')).join('\r\n');
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportCrmDealsCsv(params: {
  searchTerm?: string;
  stageFilter?: string;
  sortField: string;
  sortOrder: string;
}): Promise<void> {
  const blob = await fetchCrmExportBlob({
    resource: 'deals',
    q: params.searchTerm,
    filters: params.stageFilter ? { stage: params.stageFilter } : undefined,
    sortBy: params.sortField,
    sortOrder: (params.sortOrder as 'asc' | 'desc') || 'desc',
  });
  triggerBlobDownload(blob, 'deals-export.csv');
}
