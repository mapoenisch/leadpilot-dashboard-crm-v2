/**
 * dealStageService.ts
 * Auftrag 138: Phasenwechsel laufen ausschließlich über die RPC `move_deal_stage`.
 * Der Service bildet die Datenbank-Fehlercodes auf feste Frontend-Codes ab und
 * gibt technische Rohmeldungen nicht nach außen weiter.
 */
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';

export type MoveDealStageErrorCode =
  'forbidden' | 'not_found' | 'conflict' | 'invalid_stage' | 'network';

export const MOVE_DEAL_STAGE_ERROR_MESSAGES: Record<MoveDealStageErrorCode, string> = {
  forbidden: 'Die Phase konnte nicht gespeichert werden.',
  not_found: 'Die Phase konnte nicht gespeichert werden.',
  conflict: 'Dieser Deal wurde inzwischen geändert. Die aktuelle Phase wird angezeigt.',
  invalid_stage: 'Die Phase konnte nicht gespeichert werden.',
  network: 'Die Phase konnte nicht gespeichert werden.',
};

export class MoveDealStageError extends Error {
  constructor(public readonly code: MoveDealStageErrorCode) {
    super(MOVE_DEAL_STAGE_ERROR_MESSAGES[code]);
    this.name = 'MoveDealStageError';
  }
}

export interface MoveDealStageInput {
  dealId: string;
  expectedStage: string;
  newStage: string;
}

export interface MoveDealStageResult {
  dealId: string;
  stage: string;
  stageEnteredAt: string | null;
}

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

const CODE_BY_SQLSTATE: Record<string, MoveDealStageErrorCode> = {
  LP403: 'forbidden',
  LP404: 'not_found',
  LP409: 'conflict',
  LP422: 'invalid_stage',
};

const CODE_BY_MESSAGE_PREFIX: Record<string, MoveDealStageErrorCode> = {
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  INVALID_STAGE: 'invalid_stage',
};

/** Ordnet SQLSTATE und Meldungspräfix der RPC einem festen Frontend-Code zu. */
export function classifyMoveDealStageError(
  error: PostgrestErrorLike | null | undefined,
): MoveDealStageErrorCode {
  const byState = error?.code ? CODE_BY_SQLSTATE[error.code] : undefined;
  if (byState) return byState;

  const message = error?.message ?? '';
  for (const [prefix, code] of Object.entries(CODE_BY_MESSAGE_PREFIX)) {
    if (message.startsWith(`${prefix}:`)) return code;
  }
  return 'network';
}

interface MoveDealStageRow {
  deal_id?: unknown;
  stage?: unknown;
  stage_entered_at?: unknown;
}

function parseResult(data: unknown): MoveDealStageResult {
  const row = (Array.isArray(data) ? data[0] : data) as MoveDealStageRow | null | undefined;
  if (
    !row ||
    typeof row.deal_id !== 'string' ||
    typeof row.stage !== 'string' ||
    (row.stage_entered_at !== null && typeof row.stage_entered_at !== 'string')
  ) {
    throw new MoveDealStageError('network');
  }
  return {
    dealId: row.deal_id,
    stage: row.stage,
    stageEnteredAt: row.stage_entered_at,
  };
}

/**
 * Verschiebt einen Deal in eine neue Phase.
 *
 * `expectedStage` muss der gespeicherte Rohwert sein (`stageRaw`), nicht das
 * normalisierte Label: `move_deal_stage` vergleicht den Datenbankwert.
 */
export async function moveDealStage(input: MoveDealStageInput): Promise<MoveDealStageResult> {
  if (!isSupabaseConfigured || !supabase) {
    throw new MoveDealStageError('network');
  }

  let data: unknown;
  let error: PostgrestErrorLike | null = null;
  try {
    const response = await supabase.rpc('move_deal_stage', {
      p_deal_id: input.dealId,
      p_expected_stage: input.expectedStage,
      p_new_stage: input.newStage,
    });
    data = response.data;
    error = response.error;
  } catch {
    throw new MoveDealStageError('network');
  }

  if (error) {
    throw new MoveDealStageError(classifyMoveDealStageError(error));
  }

  return parseResult(data);
}
