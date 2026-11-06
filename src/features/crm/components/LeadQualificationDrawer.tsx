import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Building2,
  MapPin,
  Users,
  Briefcase,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  calculateLeadScore,
  type LeadScoringInput,
  type LeadScoringResult,
} from '../services/leadScoringService';

export interface LeadQualificationDrawerProps {
  lead: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
  onConvertToDeal: (lead: Record<string, unknown>) => void;
}

export function LeadQualificationDrawer({
  lead,
  isOpen,
  onClose,
  onConvertToDeal,
}: LeadQualificationDrawerProps) {
  const leadId = lead ? String(lead.id ?? '') : '';
  const storageKey = `leadpilot_crm_bant_${leadId}`;

  const scoringInput: LeadScoringInput = {
    jobTitle: lead?.jobTitle as string | undefined,
    companyName: lead?.companyName as string | undefined,
    countryOrCity: (lead?.city || lead?.country || lead?.countryOrCity) as string | undefined,
    employeeCount: lead?.employeeCount as number | string | undefined,
    industry: lead?.industry as string | undefined,
  };

  const result: LeadScoringResult = calculateLeadScore(scoringInput);

  // BANT State (pro Lead-ID persistierbar in sessionStorage)
  const [bant, setBant] = useState<{
    budget: boolean;
    authority: boolean;
    need: boolean;
    timeline: boolean;
    notes: string;
  }>(() => {
    if (typeof window !== 'undefined' && leadId) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      budget: result.totalScore >= 70,
      authority: result.breakdown.find((b) => b.key === 'persona')?.points === 20,
      need: true,
      timeline: false,
      notes: '',
    };
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && leadId) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(bant));
      } catch {
        // Ignorieren
      }
    }
  }, [bant, leadId, storageKey]);

  if (!lead) return null;

  const fullName =
    `${String(lead.firstName ?? '')} ${String(lead.lastName ?? '')}`.trim() ||
    String(lead.name ?? 'Kontakt');
  const companyName = String(lead.companyName ?? lead.companyId ?? 'Unternehmen');
  const jobTitle = String(lead.jobTitle ?? 'Jobtitel');
  const email = String(lead.email ?? '');

  const toggleBant = (field: 'budget' | 'authority' | 'need' | 'timeline') => {
    setBant((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const bantCount = [bant.budget, bant.authority, bant.need, bant.timeline].filter(Boolean).length;

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title="Lead-Qualifizierung"
      description={`ICP-Fit-Analyse und Qualifizierungsworkflow für ${fullName}`}
      width="480px"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Schließen
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconRight={<ArrowRight size={14} />}
            onClick={() => onConvertToDeal(lead)}
            aria-label={`Lead ${fullName} zu Deal konvertieren`}
          >
            Zu Deal konvertieren
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 text-text">
        {/* Kontakt-Kopf */}
        <div className="p-3.5 rounded-lg border border-border bg-surface flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h4 className="m-0 text-[15px] font-semibold text-text">{fullName}</h4>
            <Badge
              variant={
                result.tier === 'hot' ? 'cyan' : result.tier === 'warm' ? 'orange' : 'neutral'
              }
            >
              {result.icon} {result.tierLabel}
            </Badge>
          </div>
          <div className="text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
            <Briefcase size={13} />
            <span>{jobTitle}</span>
            <span>·</span>
            <Building2 size={13} />
            <span>{companyName}</span>
          </div>
          {email && <div className="text-[12px] font-mono text-primary truncate">{email}</div>}
        </div>

        {/* Scoring Hero */}
        <div className="p-4 rounded-lg bg-[rgba(var(--color-primary-rgb,59,130,246),0.06)] border border-primary/20 flex items-center justify-between">
          <div>
            <div className="text-[12px] uppercase font-semibold tracking-wider text-primary">
              ICP-Fit Score
            </div>
            <div className="text-[28px] font-display font-bold text-text mt-0.5">
              {result.totalScore}{' '}
              <span className="text-[16px] font-normal text-[var(--color-text-muted)]">
                / 100 Pkt
              </span>
            </div>
            <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
              Klassifikation: <strong>{result.tierLabel}</strong>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[32px]" aria-hidden="true">
              {result.icon}
            </span>
          </div>
        </div>

        {/* Kriterien-Aufschlüsselung */}
        <div className="flex flex-col gap-2">
          <h5 className="m-0 text-[13px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-primary" />
            <span>ICP-Kriterien Aufschlüsselung</span>
          </h5>
          <div className="flex flex-col gap-2">
            {result.breakdown.map((item) => (
              <div
                key={item.key}
                className="p-2.5 rounded-md border border-border bg-surface/50 flex flex-col gap-1 text-[12.5px]"
              >
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5 text-text">
                    {item.key === 'region' && <MapPin size={13} className="text-primary" />}
                    {item.key === 'size' && <Users size={13} className="text-primary" />}
                    {item.key === 'industry' && <Building2 size={13} className="text-primary" />}
                    {item.key === 'persona' && <Briefcase size={13} className="text-primary" />}
                    {item.label}
                  </span>
                  <span className="font-mono text-primary font-semibold">
                    +{item.points} / {item.maxPoints}
                  </span>
                </div>
                <div className="text-[11.5px] text-[var(--color-text-muted)]">{item.reason}</div>
              </div>
            ))}
          </div>
        </div>

        {/* BANT-Qualifizierung */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h5 className="m-0 text-[13px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              BANT-Qualifizierung ({bantCount}/4)
            </h5>
            <span className="text-[11px] text-primary font-medium">
              {bantCount === 4 ? 'Voll qualifiziert' : `${4 - bantCount} Kriterien offen`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'budget', label: 'Budget vorhanden', desc: 'Software-Budget gesichert' },
              {
                id: 'authority',
                label: 'Authority (Entscheider)',
                desc: 'Direkter C-Level Kontakt',
              },
              { id: 'need', label: 'Need (Bedarf)', desc: 'Konkreter Schmerzpunkt vorhanden' },
              { id: 'timeline', label: 'Timeline ≤ 3 Monate', desc: 'Zeitnahe Kaufabsicht' },
            ].map((f) => {
              const active = bant[f.id as keyof typeof bant];
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleBant(f.id as 'budget' | 'authority' | 'need' | 'timeline')}
                  className={`p-2.5 rounded-md border text-left transition-colors flex items-start gap-2 cursor-pointer ${
                    active
                      ? 'border-success/40 bg-success/10 text-text'
                      : 'border-border bg-surface hover:bg-surface/80 text-[var(--color-text-muted)]'
                  }`}
                  aria-pressed={Boolean(active)}
                >
                  <span className="mt-0.5">
                    {active ? (
                      <CheckCircle2 size={15} className="text-success" />
                    ) : (
                      <Circle size={15} className="text-[var(--color-text-muted)]" />
                    )}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-medium leading-snug">{f.label}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] leading-tight mt-0.5">
                      {f.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notizen */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="lead-notes"
            className="text-[12px] font-medium text-[var(--color-text-muted)]"
          >
            Qualifizierungs-Notizen für den Vertrieb
          </label>
          <textarea
            id="lead-notes"
            rows={3}
            value={bant.notes}
            onChange={(e) => setBant((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Wichtige Erkenntnisse aus Erstkontakt, Schmerzpunkte, genutzte Altsysteme..."
            className="w-full rounded-md border border-border bg-surface p-2.5 text-[13px] text-text outline-none focus:border-primary resize-none"
          />
        </div>
      </div>
    </Drawer>
  );
}
