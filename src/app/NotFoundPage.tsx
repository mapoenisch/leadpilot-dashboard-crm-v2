import React from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';

export function NotFoundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px' }}>
      <SectionHeader
        eyebrow="Fehler 404"
        title="Seite nicht gefunden"
        description="Die angeforderte URL existiert nicht oder wurde verschoben."
      />

      <Card variant="glass">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
            Die von Ihnen aufgerufene Adresse konnte im LeadPilot Dashboard keinem gültigen Bereich zugeordnet werden.
          </p>

          <div>
            <Link
              to="/dashboard"
              data-testid="not-found-home-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                background: 'var(--color-primary)',
                color: 'var(--color-bg)',
                padding: '10px 20px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-glow-cyan)',
                transition: 'background 150ms ease',
              }}
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
