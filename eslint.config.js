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
            // Dediziertes Werkzeug (z.B. eslint-plugin-boundaries oder custom rule) in G38.
            // Der bekannte Verstoß (LiveSimulationPage crm → simulation) ist in G35
            // behoben (Page nach features/simulation/pages umgezogen); die enforcing
            // Regel für die horizontale Grenze kommt in G38.
          ],
        },
      ],



      // ── ESLint-Kommentar-Disziplin ──────────────────────────────────────────
      'eslint-comments/require-description': 'error',
    },
  },

  // ── G38: kein Inline-Style in Primitives + Design-System-Route ─────────────
  // Nur selbst erfundene style-Attribute sind verboten; zeilengenaue
  // eslint-disables (Passthrough Badge/Card/Button, Laufzeit-Geometrie
  // Charts) bleiben erlaubt. Scope bewusst nur Top-Level-*.tsx (die 19
  // migrierten Primitives): src/components/ui/charts/**-Helfer sind
  // unmigrierter G39-Scope und dürfen nicht rot werden (Dateien nicht
  // in diesem Auftrag anfassen). Gilt NICHT global (G39-Gebiet unangetastet).
  {
    files: ['src/components/ui/*.tsx', 'src/app/DesignSystemPage.tsx'],
    rules: {
      'react/forbid-dom-props': [
        'error',
        {
          forbid: [
            {
              propName: 'style',
              message:
                'G38: kein Inline-Style in Primitives — cva + Tailwind-Klassen nutzen (Ausnahmen nur zeilengenau mit Begründung).',
            },
          ],
        },
      ],
    },
  },

  // ── G39 Welle 1 (Auftrag 054, Block D): Scope um die 22 migrierten
  // Welle-1-Dateien erweitert (Entscheidung 5) — schützt vor Rückfällen.
  // Erlaubte Reste dort: Custom-Komponenten-Passthroughs (Badge/Card/
  // MetricToken/DiagramCanvas/FaceliftGlyph, kein DOM-Prop) + 1
  // Laufzeit-Geometrie (PipelineSnapshot-Balkenbreite) — jeweils mit
  // zeilengenauem Disable + Begründung, keine Datei-Ausnahme.
  {
    files: [
      'src/app/App.tsx',
      'src/app/NotFoundPage.tsx',
      'src/components/layout/*.tsx',
      'src/components/liveKpi/*.tsx',
      'src/components/executiveCockpit/*.tsx',
      'src/components/ai/*.tsx',
      'src/components/facelift/*.tsx',
    ],
    rules: {
      'react/forbid-dom-props': [
        'error',
        {
          forbid: [
            {
              propName: 'style',
              message:
                'G38: kein Inline-Style in Primitives — cva + Tailwind-Klassen nutzen (Ausnahmen nur zeilengenau mit Begründung).',
            },
          ],
        },
      ],
    },
  },

  // ── G39 Welle 2 (Auftrag 055, Block E): Scope um die 23 migrierten
  // Welle-2-Dateien erweitert (Verzeichnis-Globs; übrige Dateien dort
  // haben 0 style und werden nicht rot). Erlaubte Reste: Farben/
  // Geometrie aus Domain-Daten (jeweils zeilengenaues Disable +
  // Begründung, keine Datei-Ausnahme).
  {
    files: [
      'src/features/crm/**/*.tsx',
      'src/features/finanzen/**/*.tsx',
      'src/features/generic/*.tsx',
      'src/features/geschaeftsmodell/**/*.tsx',
      'src/features/kunden/**/*.tsx',
      'src/features/markt/**/*.tsx',
    ],
    rules: {
      'react/forbid-dom-props': [
        'error',
        {
          forbid: [
            {
              propName: 'style',
              message:
                'G39: kein Inline-Style in migrierten Dateien — cva + Tailwind-Klassen nutzen (Ausnahmen nur zeilengenau mit Begründung).',
            },
          ],
        },
      ],
    },
  },

  // ── G39 Welle 3 (Auftrag 056, Block E): Scope um die 27 migrierten
  // Welle-3-Dateien erweitert. Erlaubte Reste: Farben/Geometrie aus
  // Simulations-/Domain-Daten (jeweils zeilengenaues Disable +
  // Begründung, keine Datei-Ausnahme).
  {
    files: [
      'src/features/organisation/**/*.tsx',
      'src/features/overview/**/*.tsx',
      'src/features/produkt/**/*.tsx',
      'src/features/projektkontext/**/*.tsx',
      'src/features/recht/**/*.tsx',
      'src/features/simulation/**/*.tsx',
    ],
    rules: {
      'react/forbid-dom-props': [
        'error',
        {
          forbid: [
            {
              propName: 'style',
              message:
                'G39: kein Inline-Style in migrierten Dateien — cva + Tailwind-Klassen nutzen (Ausnahmen nur zeilengenau mit Begründung).',
            },
          ],
        },
      ],
    },
  },

  // ── Prettier muss letzter Eintrag sein (schaltet kollidierendes ab) ───────────
  prettier,
);
