#!/usr/bin/env node
// Erzeugt ein GitHub App Installation Access Token für marcs-PR-reviewer (App ID 5385259).
// Nutzung:
//   export GH_TOKEN=$(node scripts/getReviewerToken.mjs)
// Oder mit explizitem Pfad zum Private Key:
//   export GH_TOKEN=$(node scripts/getReviewerToken.mjs --key=/pfad/zu/key.pem)

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_APP_ID = '5385259';
const DEFAULT_REPO = 'mapoenisch/leadpilot-dashboard-crm-v2';

export function createJWT(appId, privateKeyPem) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 10 * 60,
      iss: String(appId),
    })
  ).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKeyPem, 'base64url');
  return `${header}.${payload}.${signature}`;
}

export function resolvePrivateKey(explicitPath) {
  if (explicitPath) {
    const resolved = path.resolve(explicitPath.replace(/^~(?=$|\/)/, os.homedir()));
    if (!fs.existsSync(resolved)) {
      throw new Error(`Angegebener Private Key nicht gefunden: ${resolved}`);
    }
    return fs.readFileSync(resolved, 'utf8');
  }

  if (process.env.GITHUB_APP_PRIVATE_KEY && process.env.GITHUB_APP_PRIVATE_KEY.includes('BEGIN')) {
    return process.env.GITHUB_APP_PRIVATE_KEY;
  }

  if (process.env.GITHUB_APP_PRIVATE_KEY_PATH) {
    return resolvePrivateKey(process.env.GITHUB_APP_PRIVATE_KEY_PATH);
  }

  const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const userHome = os.homedir();
  const candidates = [
    path.join(projectRoot, '.secrets', 'marcs-pr-reviewer.private-key.pem'),
    path.join(projectRoot, 'marcs-pr-reviewer.private-key.pem'),
    path.join(userHome, '.secrets', 'marcs-pr-reviewer.private-key.pem'),
  ];

  // Im Projekt .secrets nach beliebigen .pem suchen
  const secretsDir = path.join(projectRoot, '.secrets');
  if (fs.existsSync(secretsDir)) {
    try {
      for (const f of fs.readdirSync(secretsDir)) {
        if (f.endsWith('.pem')) candidates.push(path.join(secretsDir, f));
      }
    } catch {
      // Fehler ignorieren
    }
  }

  // Im Root nach *.private-key.pem suchen
  for (const f of fs.readdirSync(projectRoot)) {
    if (f.endsWith('.private-key.pem')) candidates.push(path.join(projectRoot, f));
  }

  // In ~/.secrets nach beliebigen .pem suchen
  const userSecretsDir = path.join(userHome, '.secrets');
  if (fs.existsSync(userSecretsDir)) {
    try {
      for (const f of fs.readdirSync(userSecretsDir)) {
        if (f.endsWith('.pem')) candidates.push(path.join(userSecretsDir, f));
      }
    } catch {
      // Zugriff verweigert ignorieren
    }
  }

  // In ~/Downloads suchen
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  if (fs.existsSync(downloadsDir)) {
    try {
      for (const f of fs.readdirSync(downloadsDir)) {
        if (f.includes('marcs-pr-reviewer') && f.endsWith('.pem')) {
          candidates.push(path.join(downloadsDir, f));
        } else if (f.endsWith('.private-key.pem')) {
          candidates.push(path.join(downloadsDir, f));
        }
      }
    } catch {
      // Zugriff verweigert ignorieren
    }
  }

  for (const cand of candidates) {
    try {
      if (fs.existsSync(cand)) {
        return fs.readFileSync(cand, 'utf8');
      }
    } catch {
      // Weiter mit nächstem Kandidaten, falls Zugriff verweigert wird
    }
  }

  throw new Error(
    'Kein Private Key (.pem) gefunden!\n' +
      'Bitte den aus GitHub heruntergeladenen Schlüssel ablegen unter:\n' +
      '  .secrets/marcs-pr-reviewer.private-key.pem\n' +
      'Oder den Pfad direkt übergeben:\n' +
      '  node scripts/getReviewerToken.mjs --key=/pfad/zur/datei.pem'
  );
}

export async function getInstallationToken({
  appId = process.env.GITHUB_APP_ID ?? DEFAULT_APP_ID,
  repoFull = process.env.GITHUB_REPOSITORY ?? DEFAULT_REPO,
  privateKeyPath,
} = {}) {
  const pem = resolvePrivateKey(privateKeyPath);
  const jwt = createJWT(appId, pem);

  const installRes = await fetch(`https://api.github.com/repos/${repoFull}/installation`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'LeadPilot-Token-Generator',
    },
  });

  if (!installRes.ok) {
    const err = await installRes.text();
    throw new Error(`Installation für ${repoFull} nicht gefunden (${installRes.status}): ${err}`);
  }

  const { id: installationId } = await installRes.json();

  const tokenRes = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'LeadPilot-Token-Generator',
    },
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token-Generierung fehlgeschlagen (${tokenRes.status}): ${err}`);
  }

  return await tokenRes.json();
}

async function main() {
  const keyArg = process.argv.find((a) => a.startsWith('--key='));
  const explicitPath = keyArg ? keyArg.slice(6) : undefined;
  const isJson = process.argv.includes('--json');

  try {
    const data = await getInstallationToken({ privateKeyPath: explicitPath });
    if (isJson) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      process.stdout.write(data.token);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
