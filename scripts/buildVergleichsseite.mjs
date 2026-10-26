#!/usr/bin/env node
/**
 * Auftrag 119 (Paket I): Vorher/Nachher-Vergleichsseite für Marc.
 * Liest Baseline- und Nachher-JSON aus docs/reviews und schreibt eine lokale HTML-Seite
 * (Bild neben Bild, Messwerte je Ansicht). Bilder bleiben lokal und werden relativ eingebunden.
 * Aufruf: node scripts/buildVergleichsseite.mjs   →   test-results/auftrag-119/vergleich.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test-results/auftrag-119/vergleich.html');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const before = read('docs/reviews/2026-10-06-frontend-inventar.json');
const after = read('docs/reviews/2026-10-06-frontend-inventar-nachher.json');

const key = (s) => `${s.id}-${s.viewport?.requestedWidth ?? s.width}-${s.theme}`;
const esc = (v) =>
  String(v ?? '–').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
const rel = (dir, id, w, theme, kind) =>
  path.relative(
    path.dirname(OUT),
    path.join(ROOT, 'docs/screenshots', dir, `${id}-${w}-${theme}-${kind}.png`),
  );
const axeCount = (s) => (s.axe?.length ?? 0) + (s.axePage?.length ?? 0);

const beforeMap = new Map(before.shots.map((s) => [key(s), s]));
const rows = after.shots.map((a) => {
  const b = beforeMap.get(key(a));
  const w = a.viewport?.requestedWidth ?? a.width;
  const dh = b ? a.mainScrollHeight - b.mainScrollHeight : null;
  const same = b && b.hashes?.full === a.hashes?.full;
  const exists = (dir) =>
    fs.existsSync(path.join(ROOT, 'docs/screenshots', dir, `${a.id}-${w}-${a.theme}-first.png`));
  const img = (dir, kind) =>
    exists(dir)
      ? `<a href="${rel(dir, a.id, w, a.theme, 'full')}"><img loading="lazy" src="${rel(dir, a.id, w, a.theme, kind)}"></a>`
      : '<em>kein Bild</em>';
  return `<section class="row ${same ? 'same' : 'diff'}" data-theme="${a.theme}">
<h3>${esc(a.id)} · ${w}px · ${a.theme} <span>${same ? 'unverändert' : 'geändert'}</span></h3>
<div class="pair"><figure><figcaption>Vorher (${esc(before.commit)})</figcaption>${img('auftrag-081', 'first')}</figure>
<figure><figcaption>Nachher (${esc(after.commit)})</figcaption>${img('auftrag-081-nachher', 'first')}</figure></div>
<table><tr><th></th><th>Vorher</th><th>Nachher</th></tr>
<tr><td>Inhaltshöhe</td><td>${esc(b?.mainScrollHeight)} px</td><td>${esc(a.mainScrollHeight)} px${dh ? ` (${dh > 0 ? '+' : ''}${dh})` : ''}</td></tr>
<tr><td>Überlauf Dokument/Main</td><td>${esc(b && `${b.overflowDocument}/${b.overflowMain}`)}</td><td>${esc(`${a.overflowDocument}/${a.overflowMain}`)}</td></tr>
<tr><td>axe serious/critical</td><td>${esc(b && axeCount(b))}</td><td>${esc(axeCount(a))}</td></tr>
<tr><td>Zahlen im ersten Bildschirm</td><td>${esc(b?.numbersInFirstScreen)}</td><td>${esc(a.numbersInFirstScreen)}</td></tr>
<tr><td>Konsolenfehler</td><td>${esc(b?.consoleErrors)}</td><td>${esc(a.consoleErrors)}</td></tr></table></section>`;
});

const changed = rows.filter((r) => r.includes('class="row diff"')).length;
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vorher/Nachher – LeadPilot</title>
<style>body{font:14px system-ui;margin:0;padding:16px;background:#0f1115;color:#e6e8ee}h1{font-size:20px}
.row{border-top:1px solid #333;padding:12px 0}.row h3{font-size:14px;margin:0 0 8px}.row h3 span{font-weight:400;color:#8b93a5}
.diff h3 span{color:#f5a623}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}figcaption{color:#8b93a5;margin-bottom:4px}
img{width:100%;border:1px solid #333}table{margin-top:8px;border-collapse:collapse}td,th{padding:2px 12px 2px 0;text-align:left}
.bar{position:sticky;top:0;background:#0f1115;padding:8px 0}</style>
<h1>Vorher/Nachher: ${rows.length} Aufnahmen, ${changed} geändert</h1>
<div class="bar"><label><input type="checkbox" id="only"> nur geänderte</label>
<select id="th"><option value="">beide Themes</option><option>dark</option><option>light</option></select></div>
${rows.join('\n')}
<script>const f=()=>document.querySelectorAll('.row').forEach(r=>{r.hidden=(only.checked&&r.classList.contains('same'))||(th.value&&r.dataset.theme!==th.value)});only.onchange=th.onchange=f</script></html>`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`${rows.length} Aufnahmen, ${changed} geändert → ${path.relative(ROOT, OUT)}`);
