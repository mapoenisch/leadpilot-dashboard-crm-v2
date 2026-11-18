import { formatTileValue } from '../components/tileFormat';
import { THRESHOLD_MESSAGES } from './thresholdMessages';

export type ThresholdArt = 'hoch_ist_schlecht' | 'niedrig_ist_schlecht' | 'zielbereich';

export interface ThresholdRuleV2 {
  formatVersion: 2;
  enabled: boolean;
  art: ThresholdArt;
  einheit: string;
  warnung?: number;
  kritisch?: number;
  untenWarnung?: number;
  obenWarnung?: number;
  untenKritisch?: number;
  obenKritisch?: number;
}

export interface LegacyTileThresholdRule {
  formatVersion?: 1;
  enabled: boolean;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between';
  warningValue?: number;
  criticalValue?: number;
  secondaryWarningValue?: number;
  secondaryCriticalValue?: number;
}

export type TileThresholdRule = LegacyTileThresholdRule | ThresholdRuleV2;

export type ThresholdEvaluationLevel =
  'normal' | 'warnung' | 'kritisch' | 'keine_daten' | 'nicht_bewertet' | 'regel_ungueltig';

export interface ThresholdEvaluationResult {
  stufe: ThresholdEvaluationLevel;
  grenze?: number;
  text: string;
}

export function isThresholdRuleV2(rule: unknown): rule is ThresholdRuleV2 {
  return (
    typeof rule === 'object' &&
    rule !== null &&
    'formatVersion' in rule &&
    (rule as { formatVersion?: unknown }).formatVersion === 2
  );
}

export function validateThresholdRuleV2(
  rule: Partial<ThresholdRuleV2> | undefined,
  catalogEntry?: { unit?: string } | null,
): { ok: true } | { ok: false; grund: string; feld?: string } {
  if (!rule) {
    return { ok: false, grund: 'Keine Regel angegeben.' };
  }

  if (
    catalogEntry?.unit !== undefined &&
    rule.einheit !== undefined &&
    rule.einheit !== catalogEntry.unit
  ) {
    return {
      ok: false,
      grund: THRESHOLD_MESSAGES.einheitenWechsel(catalogEntry.unit, rule.einheit),
      feld: 'einheit',
    };
  }

  const art = rule.art;
  if (!art || !['hoch_ist_schlecht', 'niedrig_ist_schlecht', 'zielbereich'].includes(art)) {
    return { ok: false, grund: 'Ungültige Regelart.', feld: 'art' };
  }

  const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

  if (art === 'hoch_ist_schlecht') {
    if (!isNum(rule.warnung)) {
      return {
        ok: false,
        grund: 'Warnwert ist erforderlich und muss eine Zahl sein.',
        feld: 'warnung',
      };
    }
    if (rule.kritisch !== undefined) {
      if (!isNum(rule.kritisch)) {
        return { ok: false, grund: 'Kritischer Wert muss eine Zahl sein.', feld: 'kritisch' };
      }
      if (rule.kritisch <= rule.warnung) {
        return {
          ok: false,
          grund: 'Kritischer Wert muss größer als der Warnwert sein.',
          feld: 'kritisch',
        };
      }
    }
    return { ok: true };
  }

  if (art === 'niedrig_ist_schlecht') {
    if (!isNum(rule.warnung)) {
      return {
        ok: false,
        grund: 'Warnwert ist erforderlich und muss eine Zahl sein.',
        feld: 'warnung',
      };
    }
    if (rule.kritisch !== undefined) {
      if (!isNum(rule.kritisch)) {
        return { ok: false, grund: 'Kritischer Wert muss eine Zahl sein.', feld: 'kritisch' };
      }
      if (rule.kritisch >= rule.warnung) {
        return {
          ok: false,
          grund: 'Kritischer Wert muss kleiner als der Warnwert sein.',
          feld: 'kritisch',
        };
      }
    }
    return { ok: true };
  }

  // Zielbereich
  if (!isNum(rule.untenWarnung)) {
    return {
      ok: false,
      grund: 'Untere Warngrenze ist erforderlich und muss eine Zahl sein.',
      feld: 'untenWarnung',
    };
  }
  if (!isNum(rule.obenWarnung)) {
    return {
      ok: false,
      grund: 'Obere Warngrenze ist erforderlich und muss eine Zahl sein.',
      feld: 'obenWarnung',
    };
  }
  if (rule.untenWarnung >= rule.obenWarnung) {
    return {
      ok: false,
      grund: 'Obere Warngrenze muss größer als die untere Warngrenze sein.',
      feld: 'obenWarnung',
    };
  }

  if (rule.untenKritisch !== undefined) {
    if (!isNum(rule.untenKritisch)) {
      return {
        ok: false,
        grund: 'Untere kritische Grenze muss eine Zahl sein.',
        feld: 'untenKritisch',
      };
    }
    if (rule.untenKritisch >= rule.untenWarnung) {
      return {
        ok: false,
        grund: 'Untere kritische Grenze muss kleiner als die untere Warngrenze sein.',
        feld: 'untenKritisch',
      };
    }
  }

  if (rule.obenKritisch !== undefined) {
    if (!isNum(rule.obenKritisch)) {
      return {
        ok: false,
        grund: 'Obere kritische Grenze muss eine Zahl sein.',
        feld: 'obenKritisch',
      };
    }
    if (rule.obenKritisch <= rule.obenWarnung) {
      return {
        ok: false,
        grund: 'Obere kritische Grenze muss größer als die obere Warngrenze sein.',
        feld: 'obenKritisch',
      };
    }
  }

  return { ok: true };
}

export function validateThresholdRuleForm(
  th: unknown,
): { ok: true } | { ok: false; error: string } {
  if (!th || typeof th !== 'object' || Array.isArray(th)) {
    return { ok: false, error: 'threshold muss ein Objekt sein' };
  }
  const r = th as Record<string, unknown>;
  if (r.formatVersion === 2) {
    if (typeof r.enabled !== 'boolean')
      return { ok: false, error: 'threshold.enabled muss ein Boolean sein' };
    if (typeof r.art !== 'string')
      return { ok: false, error: 'threshold.art muss ein String sein' };
    if (typeof r.einheit !== 'string')
      return { ok: false, error: 'threshold.einheit muss ein String sein' };
    const numKeys = [
      'warnung',
      'kritisch',
      'untenWarnung',
      'obenWarnung',
      'untenKritisch',
      'obenKritisch',
    ];
    for (const key of numKeys) {
      if (r[key] !== undefined && (typeof r[key] !== 'number' || !Number.isFinite(r[key]))) {
        return { ok: false, error: `threshold.${key} muss eine endliche Zahl sein` };
      }
    }
  }
  return { ok: true };
}

export function normalizeLegacyThresholdRule(
  alt: unknown,
  catalogEntry?: { unit?: string } | null,
): { regel: ThresholdRuleV2 } | { ungueltig: string } {
  if (!alt || typeof alt !== 'object') {
    return { ungueltig: 'Keine gültige Schwellenwert-Regel vorhanden.' };
  }

  if (isThresholdRuleV2(alt)) {
    const val = validateThresholdRuleV2(alt, catalogEntry);
    if (!val.ok) {
      return { ungueltig: val.grund };
    }
    return { regel: alt };
  }

  const legacy = alt as Partial<LegacyTileThresholdRule>;
  if (legacy.operator === 'eq') {
    return { ungueltig: THRESHOLD_MESSAGES.altGleichUngueltig };
  }
  if (legacy.operator === 'between') {
    return { ungueltig: THRESHOLD_MESSAGES.altZwischenUngueltig };
  }

  if (['gt', 'gte', 'lt', 'lte'].includes(legacy.operator ?? '')) {
    if (typeof legacy.warningValue !== 'number' || !Number.isFinite(legacy.warningValue)) {
      return { ungueltig: THRESHOLD_MESSAGES.altFehlendeGrenze };
    }
    const isHigh = legacy.operator === 'gt' || legacy.operator === 'gte';
    const hasCrit =
      typeof legacy.criticalValue === 'number' && Number.isFinite(legacy.criticalValue);
    if (
      hasCrit &&
      (isHigh
        ? legacy.criticalValue! <= legacy.warningValue
        : legacy.criticalValue! >= legacy.warningValue)
    ) {
      return { ungueltig: THRESHOLD_MESSAGES.altReihenfolgeUngueltig };
    }
    return {
      regel: {
        formatVersion: 2,
        enabled: Boolean(legacy.enabled),
        art: isHigh ? 'hoch_ist_schlecht' : 'niedrig_ist_schlecht',
        einheit: catalogEntry?.unit ?? '',
        warnung: legacy.warningValue,
        kritisch: hasCrit ? legacy.criticalValue : undefined,
      },
    };
  }

  return { ungueltig: 'Unbekannter Schwellenwert-Operator.' };
}

export function evaluateThresholdV2(
  regel: unknown,
  wert: number | null | undefined,
  kachelzustand?: string | null,
  katalogeinheit?: string,
): ThresholdEvaluationResult {
  if (!regel) {
    return { stufe: 'nicht_bewertet', text: THRESHOLD_MESSAGES.inaktiv };
  }

  const normalized = normalizeLegacyThresholdRule(regel, { unit: katalogeinheit });
  if ('ungueltig' in normalized) {
    return { stufe: 'regel_ungueltig', text: normalized.ungueltig };
  }

  const rule = normalized.regel;
  if (!rule.enabled) {
    return { stufe: 'nicht_bewertet', text: THRESHOLD_MESSAGES.inaktiv };
  }

  if (katalogeinheit !== undefined && rule.einheit !== '' && rule.einheit !== katalogeinheit) {
    return {
      stufe: 'regel_ungueltig',
      text: THRESHOLD_MESSAGES.einheitenWechsel(katalogeinheit, rule.einheit),
    };
  }

  if (kachelzustand === 'fehler' || kachelzustand === 'veraltet' || kachelzustand === 'offline') {
    const msg =
      kachelzustand === 'fehler'
        ? THRESHOLD_MESSAGES.nichtBewertetFehler
        : kachelzustand === 'veraltet'
          ? THRESHOLD_MESSAGES.nichtBewertetVeraltet
          : THRESHOLD_MESSAGES.nichtBewertetOffline;
    return { stufe: 'nicht_bewertet', text: msg };
  }

  if (wert === null || wert === undefined) {
    return { stufe: 'keine_daten', text: THRESHOLD_MESSAGES.keineDaten };
  }
  if (typeof wert !== 'number' || !Number.isFinite(wert)) {
    return { stufe: 'nicht_bewertet', text: THRESHOLD_MESSAGES.nichtBewertetUngueltig };
  }

  if (rule.art === 'hoch_ist_schlecht') {
    if (rule.kritisch !== undefined && wert >= rule.kritisch) {
      return {
        stufe: 'kritisch',
        grenze: rule.kritisch,
        text: `Kritisch (ab ${formatTileValue(rule.kritisch, rule.einheit, 'exakt')})`,
      };
    }
    if (rule.warnung !== undefined && wert >= rule.warnung) {
      return {
        stufe: 'warnung',
        grenze: rule.warnung,
        text: `Warnung (ab ${formatTileValue(rule.warnung, rule.einheit, 'exakt')})`,
      };
    }
    return { stufe: 'normal', text: THRESHOLD_MESSAGES.normal };
  }

  if (rule.art === 'niedrig_ist_schlecht') {
    if (rule.kritisch !== undefined && wert <= rule.kritisch) {
      return {
        stufe: 'kritisch',
        grenze: rule.kritisch,
        text: `Kritisch (ab ${formatTileValue(rule.kritisch, rule.einheit, 'exakt')})`,
      };
    }
    if (rule.warnung !== undefined && wert <= rule.warnung) {
      return {
        stufe: 'warnung',
        grenze: rule.warnung,
        text: `Warnung (ab ${formatTileValue(rule.warnung, rule.einheit, 'exakt')})`,
      };
    }
    return { stufe: 'normal', text: THRESHOLD_MESSAGES.normal };
  }

  // Zielbereich
  if (rule.untenKritisch !== undefined && wert <= rule.untenKritisch) {
    return {
      stufe: 'kritisch',
      grenze: rule.untenKritisch,
      text: `Kritisch (unter ${formatTileValue(rule.untenKritisch, rule.einheit, 'exakt')})`,
    };
  }
  if (rule.obenKritisch !== undefined && wert >= rule.obenKritisch) {
    return {
      stufe: 'kritisch',
      grenze: rule.obenKritisch,
      text: `Kritisch (über ${formatTileValue(rule.obenKritisch, rule.einheit, 'exakt')})`,
    };
  }
  if (rule.untenWarnung !== undefined && wert < rule.untenWarnung) {
    return {
      stufe: 'warnung',
      grenze: rule.untenWarnung,
      text: `Warnung (unter ${formatTileValue(rule.untenWarnung, rule.einheit, 'exakt')})`,
    };
  }
  if (rule.obenWarnung !== undefined && wert > rule.obenWarnung) {
    return {
      stufe: 'warnung',
      grenze: rule.obenWarnung,
      text: `Warnung (über ${formatTileValue(rule.obenWarnung, rule.einheit, 'exakt')})`,
    };
  }
  return { stufe: 'normal', text: THRESHOLD_MESSAGES.normal };
}

export function describeThresholdV2(rule: ThresholdRuleV2): string {
  if (rule.art === 'hoch_ist_schlecht' || rule.art === 'niedrig_ist_schlecht') {
    const w = formatTileValue(rule.warnung ?? 0, rule.einheit, 'exakt');
    if (rule.kritisch !== undefined) {
      const k = formatTileValue(rule.kritisch, rule.einheit, 'exakt');
      return `Warnung ab ${w}, Kritisch ab ${k}`;
    }
    return `Warnung ab ${w}`;
  }

  // Zielbereich
  const uw = formatTileValue(rule.untenWarnung ?? 0, rule.einheit, 'exakt');
  const ow = formatTileValue(rule.obenWarnung ?? 0, rule.einheit, 'exakt');
  let desc = `Zielbereich: ${uw} – ${ow}`;
  if (rule.untenKritisch !== undefined) {
    desc += `, Kritisch unter ${formatTileValue(rule.untenKritisch, rule.einheit, 'exakt')}`;
  }
  if (rule.obenKritisch !== undefined) {
    desc += `, Kritisch über ${formatTileValue(rule.obenKritisch, rule.einheit, 'exakt')}`;
  }
  return desc;
}
