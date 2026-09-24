import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { CrmListQueryParams, CrmServiceError, CrmServiceErrorCode } from './crmListService';

export { CrmServiceError, type CrmServiceErrorCode };

export type CrmExportParams = Omit<CrmListQueryParams, 'page' | 'pageSize'>;

function normalizeErrorCode(rawCode?: string): CrmServiceErrorCode {
  if (rawCode === 'UNAUTHORIZED') return 'UNAUTHORIZED';
  if (rawCode === 'FORBIDDEN') return 'FORBIDDEN';
  if (rawCode === 'INVALID_QUERY') return 'INVALID_QUERY';
  if (rawCode === 'NOT_FOUND') return 'NOT_FOUND';
  return 'SERVER_ERROR';
}

export async function fetchCrmExportBlob(params: CrmExportParams): Promise<Blob> {
  if (!isSupabaseConfigured || !supabase) {
    throw new CrmServiceError('UNAUTHORIZED');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new CrmServiceError('UNAUTHORIZED');
  }

  const token = data.session.access_token;
  const baseUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const anonKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  const url = `${baseUrl}/functions/v1/crm-query-export`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        action: 'export',
        resource: params.resource,
        q: params.q,
        filters: params.filters,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }),
    });
  } catch {
    throw new CrmServiceError('SERVER_ERROR');
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const code = normalizeErrorCode(errorBody.code as string | undefined);
    throw new CrmServiceError(code);
  }

  const blob = await response.blob();
  return blob;
}

export async function downloadCrmExport(params: CrmExportParams): Promise<void> {
  const blob = await fetchCrmExportBlob(params);
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const filename = `${params.resource}-export.csv`;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
