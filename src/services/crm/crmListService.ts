// G60 (Auftrag 067N, Step 3): Frontend-Service für serverseitig paginierte CRM-Listen
// Ruft die Edge Function /functions/v1/crm-query-export mit dem Bearer-Token des Nutzers auf.
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';

export type CrmResource = 'companies' | 'contacts' | 'deals';

export interface CrmListQueryParams {
  resource: CrmResource;
  q?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface CrmPageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  resource: CrmResource;
}

export type CrmServiceErrorCode =
  'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_QUERY' | 'NOT_FOUND' | 'SERVER_ERROR';

export const SAFE_CLIENT_ERROR_MESSAGES: Record<CrmServiceErrorCode, string> = {
  UNAUTHORIZED: 'Sitzung abgelaufen oder nicht authentifiziert. Bitte melden Sie sich erneut an.',
  FORBIDDEN: 'Zugriff verweigert. Fehlende Berechtigung für diese CRM-Aktion.',
  INVALID_QUERY: 'Ungültige Abfrageparameter. Bitte überprüfen Sie Ihre Filter- und Sucheingaben.',
  NOT_FOUND: 'Die angeforderte CRM-Ressource wurde nicht gefunden.',
  SERVER_ERROR: 'Ein interner Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
};

export function resolveSafeErrorMessage(code: CrmServiceErrorCode): string {
  return SAFE_CLIENT_ERROR_MESSAGES[code] || SAFE_CLIENT_ERROR_MESSAGES.SERVER_ERROR;
}

export class CrmServiceError extends Error {
  constructor(
    public readonly code: CrmServiceErrorCode,
    message: string = resolveSafeErrorMessage(code),
  ) {
    super(message);
    this.name = 'CrmServiceError';
  }
}

function normalizeErrorCode(rawCode?: string): CrmServiceErrorCode {
  if (rawCode === 'UNAUTHORIZED') return 'UNAUTHORIZED';
  if (rawCode === 'FORBIDDEN') return 'FORBIDDEN';
  if (rawCode === 'INVALID_QUERY') return 'INVALID_QUERY';
  if (rawCode === 'NOT_FOUND') return 'NOT_FOUND';
  return 'SERVER_ERROR';
}

export async function fetchCrmList<T>(params: CrmListQueryParams): Promise<CrmPageResult<T>> {
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
        action: 'list',
        resource: params.resource,
        q: params.q,
        filters: params.filters,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
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

  const result = (await response.json()) as CrmPageResult<T>;
  return result;
}
