import React from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)] max-w-[800px]">
      <SectionHeader
        eyebrow="Fehler 404"
        title="Seite nicht gefunden"
        description="Die angeforderte URL existiert nicht oder wurde verschoben."
      />

      <Card variant="glass">
        <div className="flex flex-col gap-[var(--space-4)]">
          <p className="m-0 text-[15px] leading-[1.6] text-[var(--color-text-muted)]">
            Die von Ihnen aufgerufene Adresse konnte im LeadPilot Dashboard keinem gültigen Bereich zugeordnet werden.
          </p>

          <div>
            <Link
              to="/dashboard"
              data-testid="not-found-home-link"
              className="inline-flex items-center gap-[var(--space-2)] font-semibold text-[14px] no-underline rounded-full bg-primary text-[var(--color-bg)] px-[20px] py-[10px] shadow-glow-cyan transition-[background_150ms_ease]"
            >
              ← Zurück zum Executive Dashboard
            </Link>
          </div>
        </div>
      </Card>

      <Alert variant="info" title="Navigation">
        Nutzen Sie die linke Seitenleiste, um direkt zu den Unternehmens-, Produkt-, Markt- oder Simulationsansichten zu wechseln.
      </Alert>
    </div>
  );
}
