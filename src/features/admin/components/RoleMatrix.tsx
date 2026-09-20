import React from 'react';

export const RoleMatrix: React.FC = () => {
  return (
    <section
      aria-labelledby="section-roles-title"
      className="bg-surface border border-solid border-border rounded-lg p-[var(--space-4)] flex flex-col gap-[var(--space-3)]"
    >
      <h2 id="section-roles-title" className="text-base font-semibold text-text m-0">
        Rollen und Berechtigungen
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-4)] text-xs text-[var(--color-text-muted)]">
        <div className="border border-solid border-border rounded p-3 flex flex-col gap-1">
          <span className="font-semibold text-accent text-sm">Administrator</span>
          <span>Volle Berechtigung für alle Organisationsdaten.</span>
          <ul className="pl-4 m-0 list-disc flex flex-col gap-1 pt-1">
            <li>Mitglieder einladen & Einladungen widerrufen</li>
            <li>Rollen von Mitgliedern anpassen</li>
            <li>Mitglieder deaktivieren</li>
            <li>Mindestens 1 Admin muss dauerhaft aktiv bleiben</li>
          </ul>
        </div>
        <div className="border border-solid border-border rounded p-3 flex flex-col gap-1">
          <span className="font-semibold text-primary text-sm">Manager</span>
          <span>Operativer Zugriff auf Kernfunktionen.</span>
          <ul className="pl-4 m-0 list-disc flex flex-col gap-1 pt-1">
            <li>Lesezugriff auf alle CRM- und Finanzberichte</li>
            <li>Steuerung von Simulationen und Szenarien</li>
            <li>Keine Mitglieder- oder Rollenverwaltung (403)</li>
          </ul>
        </div>
        <div className="border border-solid border-border rounded p-3 flex flex-col gap-1">
          <span className="font-semibold text-text text-sm">Viewer</span>
          <span>Reiner Lesezugriff für Beobachter.</span>
          <ul className="pl-4 m-0 list-disc flex flex-col gap-1 pt-1">
            <li>Einsicht in Dashboards und KPIs</li>
            <li>Keine schreibenden Aktionen</li>
            <li>Keine Mitgliederverwaltung (403)</li>
          </ul>
        </div>
      </div>
    </section>
  );
};
