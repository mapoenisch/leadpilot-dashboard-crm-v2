/**
 * Validierung von Transformationsketten (Auftrag 169 / P14a).
 * Garantiert max. 3 Schritte, feste Positivliste und konsistente Einheitenfolge.
 */

import type { ActiveCatalogEntry, CatalogEntry } from '../dashboardCatalog';
import { getUnitConversion } from './unitConversions';
import type { TileTransformation, TransformationValidationResult } from './types';

export function validateSingleTransformation(
  t: unknown,
  currentUnit?: string,
  catalogEntry?: ActiveCatalogEntry | CatalogEntry | null,
): TransformationValidationResult & { nextUnit?: string } {
  if (!t || typeof t !== 'object') {
    return { ok: false, grund: 'Transformation muss ein Objekt sein.' };
  }

  const art = (t as { art?: unknown }).art;
  if (
    typeof art !== 'string' ||
    !['umbenennen', 'einheit_umrechnen', 'gleitender_durchschnitt'].includes(art)
  ) {
    return { ok: false, grund: `Unzulässige Transformationsart '${String(art)}'.` };
  }

  if (art === 'umbenennen') {
    const name = (t as { name?: unknown }).name;
    if (typeof name !== 'string' || name.trim().length === 0) {
      return { ok: false, grund: 'Anzeigename darf nicht leer sein.' };
    }
    if (name.length > 60) {
      return { ok: false, grund: 'Anzeigename darf höchstens 60 Zeichen lang sein.' };
    }
    return { ok: true, nextUnit: currentUnit };
  }

  if (art === 'einheit_umrechnen') {
    const von = (t as { von?: unknown }).von;
    const zu = (t as { zu?: unknown }).zu;
    if (typeof von !== 'string' || typeof zu !== 'string') {
      return { ok: false, grund: 'Ausgangs- und Zieleinheit müssen angegeben sein.' };
    }
    const def = getUnitConversion(von, zu);
    if (!def) {
      return {
        ok: false,
        grund: `Umrechnung von '${von}' nach '${zu}' ist nicht in der Positivliste.`,
      };
    }
    if (currentUnit !== undefined && currentUnit !== von) {
      return {
        ok: false,
        grund: `Ausgangseinheit '${von}' stimmt nicht mit aktueller Einheit '${currentUnit}' überein.`,
      };
    }
    return { ok: true, nextUnit: zu };
  }

  if (art === 'gleitender_durchschnitt') {
    const fenster = (t as { fenster?: unknown }).fenster;
    if (typeof fenster !== 'number' || !Number.isInteger(fenster) || fenster < 2 || fenster > 30) {
      return { ok: false, grund: 'Fenstergröße muss eine ganze Zahl zwischen 2 und 30 sein.' };
    }
    if (catalogEntry && (catalogEntry as ActiveCatalogEntry).history?.kind !== 'ereignisse') {
      return {
        ok: false,
        grund: 'Gleitender Durchschnitt ist nur bei Verlaufskacheln (Zeitreihen) zulässig.',
      };
    }
    return { ok: true, nextUnit: currentUnit };
  }

  return { ok: false, grund: 'Unbekannte Transformation.' };
}

export function validateTransformations(
  transformations?: readonly TileTransformation[] | null,
  initialUnit?: string,
  catalogEntry?: ActiveCatalogEntry | CatalogEntry | null,
): TransformationValidationResult & { finalUnit?: string } {
  if (!transformations || transformations.length === 0) {
    return { ok: true, finalUnit: initialUnit };
  }

  if (transformations.length > 3) {
    return { ok: false, grund: 'Maximal 3 Transformationsschritte je Kachel zulässig.' };
  }

  let runningUnit = initialUnit;

  for (let i = 0; i < transformations.length; i++) {
    const step = transformations[i];
    const res = validateSingleTransformation(step, runningUnit, catalogEntry);
    if (!res.ok) {
      return { ok: false, grund: res.grund, index: i };
    }
    if (res.nextUnit !== undefined) {
      runningUnit = res.nextUnit;
    }
  }

  return { ok: true, finalUnit: runningUnit };
}
