#!/usr/bin/env node
// G65 (Auftrag 067S, Spec §19): Kein Produktivbuild mit fehlenden Pflichtwerten.
// Ohne Supabase-Werte startet die App bewusst im Demo-Modus (lokale
// Entwicklung, CI-Build). Für einen Produktivbuild (`npm run build:production`)
// ist das ein Fehler: Die Prüfung bricht vor `vite build` ab.
// Werte liest Vites loadEnv('production') genauso wie `vite build` im selben Lauf.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PLACEHOLDERS = ['your-project', 'your-anon-public-key'];

/**
 * Liefert die VITE_-Werte, die `vite build --mode production` für `root` verwendet:
 * .env, .env.local, .env.production, .env.production.local mit Vites Präzedenz,
 * VITE_-Variablen der Umgebung gewinnen.
 */
export async function readProductionEnv(root) {
  const { loadEnv } = await import('vite');
  return loadEnv('production', root, 'VITE_');
}

/** Rolle aus dem Payload eines Supabase-JWT, sonst null. */
function jwtRole(key) {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')).role ?? null;
  } catch {
    return null;
  }
}

/** Prüft die Pflichtwerte eines Produktivbuilds; liefert die Fehlerliste. */
export function checkProductionConfig(env) {
  const errors = [];
  const url = env.VITE_SUPABASE_URL ?? '';
  const key = env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!url) errors.push('VITE_SUPABASE_URL fehlt.');
  if (!key) errors.push('VITE_SUPABASE_ANON_KEY fehlt.');
  if (PLACEHOLDERS.some((p) => url.includes(p) || key.includes(p))) {
    errors.push('Platzhalter aus .env.example sind nicht ersetzt.');
  }
  if (url) {
    let parsed = null;
    try {
      parsed = new URL(url);
    } catch {
      errors.push('VITE_SUPABASE_URL ist keine gültige URL.');
    }
    if (parsed && parsed.protocol !== 'https:') {
      errors.push('VITE_SUPABASE_URL muss für Produktion https verwenden.');
    }
  }
  if (jwtRole(key) === 'service_role' || key.startsWith('sb_secret_')) {
    errors.push(
      'VITE_SUPABASE_ANON_KEY enthält einen privilegierten Schlüssel (service_role/secret).',
    );
  }
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // Dieselben Werte wie der anschließende `vite build`: Vites loadEnv im Modus
  // production liest .env, .env.local, .env.production, .env.production.local
  // mit Vites Präzedenz und lässt VITE_-Variablen der Umgebung gewinnen.
  const root = resolve(import.meta.dirname, '..');
  const errors = checkProductionConfig(await readProductionEnv(root));
  if (errors.length > 0) {
    for (const e of errors) console.error(`  ${e}`);
    console.error(
      'PRODUKTIVKONFIGURATION ROT: Build abgebrochen (siehe docs/operations/v2.3.0-runbook.md).',
    );
    process.exit(1);
  }
  console.log('PRODUKTIVKONFIGURATION GRÜN.');
}
