import React, { useState } from 'react';
import { PROFILE_ROWS } from '../../../domain/execData';
import { Table } from '../../../components/ui/Table';

interface FieldItem {
  label: string;
  value: string;
}

export const CompanyRegisterCard: React.FC = () => {
  const [showRawTable, setShowRawTable] = useState(false);

  // Werte ausschließlich aus PROFILE_ROWS ableiten
  const getProfileValue = (label: string): string => {
    const row = PROFILE_ROWS.find(([k]) => k.toLowerCase() === label.toLowerCase());
    return row ? row[1] : '';
  };

  const firmenname = getProfileValue('Firmenname');
  const handelsregister = getProfileValue('Handelsregister');
  const gruendungsdatum = getProfileValue('Gründungsdatum');

  const identitaet: FieldItem[] = [
    { label: 'Firmenname', value: getProfileValue('Firmenname') },
    { label: 'Gegenstand des Unternehmens', value: getProfileValue('Gegenstand des Unternehmens') },
    { label: 'Sitz & Adresse', value: getProfileValue('Sitz & Adresse') },
  ];

  const stammdaten: FieldItem[] = [
    { label: 'Stammkapital', value: getProfileValue('Stammkapital') },
    { label: 'Gesellschafter', value: getProfileValue('Gesellschafter') },
    { label: 'Geschäftsführung', value: getProfileValue('Geschäftsführung') },
  ];

  const recht: FieldItem[] = [
    { label: 'Rechtsform', value: getProfileValue('Rechtsform') },
    { label: 'Handelsregister', value: getProfileValue('Handelsregister') },
    { label: 'Gründungsdatum', value: getProfileValue('Gründungsdatum') },
  ];

  return (
    <div className="facelift-company-register box-border w-full rounded-lg border border-solid border-border bg-surface overflow-hidden">
      {/* Registerkarten-Kopf */}
      <div className="border-0 border-b border-solid border-border flex flex-wrap items-center justify-between gap-[var(--space-3)] bg-surface-raised px-[var(--space-5)] py-[var(--space-4)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="w-[8px] h-[8px] rounded-full bg-primary shadow-glow-cyan" />
          <div>
            <div className="font-display text-[1.125rem] font-bold tracking-[0.02em] text-text">
              Firmenakte {firmenname}
            </div>
            {handelsregister && (
              <div className="font-mono text-[0.75rem] mt-[2px] text-[var(--color-text-muted)]">
                {handelsregister}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRawTable(!showRawTable)}
          aria-controls="company-register-raw-table"
          aria-expanded={showRawTable}
          className="font-body text-[0.75rem] cursor-pointer rounded-md border border-solid border-border bg-transparent transition-[color_0.15s_ease,border-color_0.15s_ease] text-[var(--color-text-muted)] hover:text-text hover:border-primary px-[12px] py-[5px]"
        >
          {showRawTable ? 'Detailtabelle verbergen' : 'Detailtabelle anzeigen'}
        </button>
      </div>

      {/* Drei Fachgruppen (Responsive Grid: Desktop 3 Spalten -> Tablet 2 -> Mobile 1) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-[var(--space-5)] items-stretch p-[var(--space-5)]">
        {/* Gruppe 1: Identität */}
        <div className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
          <div className="border-0 border-b border-solid border-border-soft font-display font-semibold text-[0.875rem] tracking-[0.01em] text-text pb-[var(--space-2)]">
            Identität & Zweck
          </div>

          <div className="flex flex-col gap-[var(--space-3)]">
            {identitaet.map((item) => (
              <div key={item.label} className="flex flex-col gap-[2px]">
                <span className="font-body text-[0.6875rem] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                  {item.label}
                </span>
                <span className="text-[0.875rem] font-medium leading-[1.4] break-words text-text">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gruppe 2: Stammdaten */}
        <div className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
          <div className="border-0 border-b border-solid border-border-soft font-display font-semibold text-[0.875rem] tracking-[0.01em] text-text pb-[var(--space-2)]">
            Stammdaten & Kapital
          </div>

          <div className="flex flex-col gap-[var(--space-3)]">
            {stammdaten.map((item) => (
              <div key={item.label} className="flex flex-col gap-[2px]">
                <span className="font-body text-[0.6875rem] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                  {item.label}
                </span>
                <span className="text-[0.875rem] font-medium leading-[1.4] break-words text-text">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gruppe 3: Recht & Beurkundung */}
        <div className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
          <div className="border-0 border-b border-solid border-border-soft font-display font-semibold text-[0.875rem] tracking-[0.01em] text-text pb-[var(--space-2)]">
            Recht & Beurkundung
          </div>

          <div className="flex flex-col gap-[var(--space-3)]">
            {recht.map((item) => (
              <div key={item.label} className="flex flex-col gap-[2px]">
                <span className="font-body text-[0.6875rem] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                  {item.label}
                </span>
                <span className="text-[0.875rem] font-medium leading-[1.4] break-words text-text">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subtile dokumentenartige Verbindung zwischen Stammdaten, Recht und Beurkundung */}
      <div className="rounded border border-solid border-border-soft bg-surface-raised flex items-center justify-between gap-[var(--space-2)] font-mono text-[0.6875rem] text-[var(--color-text-muted)] mx-[var(--space-5)] mb-[var(--space-4)] mt-0 px-[var(--space-3)] py-[var(--space-2)]">
        <span className="flex items-center gap-[var(--space-2)]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8M6 2v8" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Beurkundung: {gruendungsdatum}
        </span>
        <span className="text-[var(--cyan-light)]">
          {handelsregister}
        </span>
      </div>

      {/* Ausklappbare Detailtabelle als Fallback */}
      {showRawTable && (
        <div
          id="company-register-raw-table"
          className="border-0 border-t border-solid border-border bg-background-deep px-[var(--space-5)] py-[var(--space-4)]"
        >
          <div className="mb-[var(--space-3)] text-[0.8125rem] text-[var(--color-text-muted)]">
            Vollständige Stammdaten (Tabellen-Referenzansicht):
          </div>
          <Table
            columns={[
              { key: '0', label: 'Merkmal' },
              { key: '1', label: 'Angabe' },
            ]}
            rows={PROFILE_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
          />
        </div>
      )}
    </div>
  );
};
