// eslint.config.js — Flat Config für LeadPilot Dashboard-CRM
// Gate G30: Baseline-Messung. Kein --fix, kein eslint-disable ohne Begründung.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // ── Globale Ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'scripts/**',
      'tools/**',
      '*.config.js',
      '*.config.ts',
      '*.mjs',
      'eslint.config.js',
    ],
  },

  // ── Basis: JS-Empfehlungen ───────────────────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript: Empfehlungen (breit, für alle TS-Dateien) ───────────────────
  ...tseslint.configs.recommended,

  // ── App-Code: strenge Regeln nur auf src/**/*.{ts,tsx} ───────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      'eslint-comments': eslintComments,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // ── TypeScript ──────────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // ── Konsolen-Ausgaben ───────────────────────────────────────────────────
      'no-console': 'error',

      // ── React Hooks ─────────────────────────────────────────────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // ── JSX A11y ────────────────────────────────────────────────────────────
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',

      // ── React ───────────────────────────────────────────────────────────────
      'react/jsx-no-target-blank': 'error',

      // ── Datei-Größe ─────────────────────────────────────────────────────────
      'max-lines': [
        'error',
        { max: 400, skipBlankLines: true, skipComments: true },
      ],

      // ── Schichtenarchitektur (import/no-restricted-paths) ───────────────────
      // Erlaubte Richtung: app → features → components → services → simulation | domain | types
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // components darf nicht aus features importieren
            {
              target: './src/components',
              from: './src/features',
              message:
                'Layering-Verstoß: components → features verboten. Refactor nach G35.',
            },
            // services darf nicht aus components oder features importieren
            {
              target: './src/services',
              from: './src/components',
              message:
                'Layering-Verstoß: services → components verboten. Refactor nach G35.',
            },
            {
              target: './src/services',
              from: './src/features',
              message:
                'Layering-Verstoß: services → features verboten. Refactor nach G35.',
            },
            // simulation darf nicht aus components oder features importieren
            {
              target: './src/simulation',
              from: './src/components',
              message:
                'Layering-Verstoß: simulation → components verboten. Refactor nach G35.',
            },
            {
              target: './src/simulation',
              from: './src/features',
              message:
                'Layering-Verstoß: simulation → features verboten. Refactor nach G35.',
            },
            // domain und types dürfen aus keiner höheren Ebene importieren
            {
              target: './src/domain',
              from: ['./src/components', './src/features', './src/services', './src/simulation'],
              message:
                'Layering-Verstoß: domain darf nur von unten importieren. Refactor nach G35.',
            },
            {
              target: './src/types',
              from: ['./src/components', './src/features', './src/services', './src/simulation'],
              message:
                'Layering-Verstoß: types darf nur von unten importieren. Refactor nach G35.',
            },
            // Feature-zu-Feature-Imports:
            // import/no-restricted-paths kann horizontale Feature-Grenzen nicht sauber prüfen.
            // Das Plugin interpretiert `target` als Dateipfad (kein Regex). Eine per-Feature-Zone
            // mit `except: ['./src/features/X']` schließt intra-Feature-Subimporte (z.B.
            // FeatureView.tsx → ./pages/FooPage) nicht aus — sie würden als Verstöße gemeldet.
            // Dediziertes Werkzeug (z.B. eslint-plugin-boundaries oder custom rule) in G35.
            // Bekannter Verstoß: src/features/crm/pages/LiveSimulationPage.tsx → @/features/simulation/
          ],
        },
      ],



      // ── ESLint-Kommentar-Disziplin ──────────────────────────────────────────
      'eslint-comments/require-description': 'error',
    },
  },

  // ── Prettier muss letzter Eintrag sein (schaltet kollidierendes ab) ───────────
  prettier,
);
