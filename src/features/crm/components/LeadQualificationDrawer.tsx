import { useState, useEffect, useRef, useMemo } from 'react';
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
  estimateDealAmountForLead,
  type LeadScoringInput,
  type LeadScoringResult,
} from '../services/leadScoringService';

export interface LeadQualificationDrawerProps {
  lead: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
  onConvertToDeal: (lead: Record<string, unknown>) => void;
}

interface BantState {
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
  notes: string;
}

const BANT_PROGRESS_WIDTH: Record<number, string> = {
  0: 'w-0',
  1: 'w-1/4',
  2: 'w-2/4',
  3: 'w-3/4',
  4: 'w-full',
};

function loadBantState(leadId: string, result: LeadScoringResult): BantState {
  if (!leadId) {
    return {
      budget: false,
      authority: false,
      need: false,
      timeline: false,
      notes: '',
    };
  }
  if (typeof window !== 'undefined') {
    try {
      const saved = sessionStorage.getItem(`leadpilot_crm_bant_${leadId}`);
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
}

export function LeadQualificationDrawer({
  lead,
  isOpen,
  onClose,
  onConvertToDeal,
}: LeadQualificationDrawerProps) {
  const leadId = lead ? String(lead.id ?? '') : '';
  const storageKey = `leadpilot_crm_bant_${leadId}`;

  const scoringInput: LeadScoringInput = useMemo(
    () => ({
      jobTitle: lead?.jobTitle as string | undefined,
      companyName: lead?.companyName as string | undefined,
      countryOrCity: (lead?.city || lead?.country || lead?.countryOrCity) as string | undefined,
      employeeCount: lead?.employeeCount as number | string | undefined,
      industry: lead?.industry as string | undefined,
    }),
    [lead],
  );

  const result: LeadScoringResult = useMemo(() => calculateLeadScore(scoringInput), [scoringInput]);

  // BANT State mit sauberem Lead-Wechsel
  const [bant, setBant] = useState<BantState>(() => loadBantState(leadId, result));
  const activeLeadIdRef = useRef<string>(leadId);

  // Synchronisiere State bei Wechsel der leadId
  useEffect(() => {
    if (leadId && leadId !== activeLeadIdRef.current) {
      activeLeadIdRef.current = leadId;
      setBant(loadBantState(leadId, result));
    }
  }, [leadId, result]);

  // Persistiere nur für den zur aktuellen leadId passenden State
  useEffect(() => {
    if (typeof window !== 'undefined' && leadId && leadId === activeLeadIdRef.current) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(bant));
      } catch {
        // Ignorieren falls nicht verfügbar
      }
    }
  }, [bant, leadId, storageKey]);

  if (!lead) return null;

  const fullName =
    `${String(lead.firstName ?? '')} ${String(lead.lastName ?? '')}`.trim() ||
    String(lead.name ?? 'Kontakt');
  const companyName = String(lead.companyName ?? lead.companyId ?? 'Unternehmen');
  const jobTitle = String(lead.jobTitle ?? 'Jobtitel');

  const toggleBant = (field: 'budget' | 'authority' | 'need' | 'timeline') => {
    setBant((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const bantCount = [bant.budget, bant.authority, bant.need, bant.timeline].filter(Boolean).length;
  const estimatedAmount = estimateDealAmountForLead(
    lead.employeeCount as number | string | undefined,
  );

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title="Lead-Qualifizierung"
      description={`ICP-Fit-Analyse und Qualifizierungsworkflow für ${fullName}`}
      width="520px"
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
          >
            Zu Deal konvertieren
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 text-text py-1">
        {/* Lead Header Card */}
        <div className="p-3.5 rounded-lg bg-[var(--color-surface-subtle)] border border-border flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold text-[15px] text-text m-0">{fullName}</h4>
              <div className="text-[12.5px] text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
                <Briefcase size={13} />
                <span>{jobTitle}</span>
              </div>
            </div>
            <Badge
              variant={
                result.tier === 'hot' ? 'orange' : result.tier === 'warm' ? 'cyan' : 'neutral'
              }
            >
              {result.tierLabel} ({result.totalScore}%)
            </Badge>
          </div>

          <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[12px] text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5 truncate">
              <Building2 size={13} className="shrink-0" />
              <span className="truncate">{companyName}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <MapPin size={13} className="shrink-0" />
              <span className="truncate">{String(lead.city || lead.country || 'DACH-Region')}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Users size={13} className="shrink-0" />
              <span>{String(lead.employeeCount || '20–250')} MA</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles size={13} className="shrink-0" />
              <span>Geschätzt: {estimatedAmount.toLocaleString('de-DE')} €</span>
            </div>
          </div>
        </div>

        {/* BANT Framework Checkliste */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-[13.5px] uppercase tracking-wider text-[var(--color-text-muted)] m-0">
              BANT-Qualifizierung ({bantCount}/4)
            </h5>
            <span className="text-xs font-mono text-primary font-bold">
              {Math.round((bantCount / 4) * 100)} %
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden border border-border/50">
            <div
              className={`h-full bg-primary transition-all duration-300 ${BANT_PROGRESS_WIDTH[bantCount] ?? 'w-0'}`}
            />
          </div>

          <div className="flex flex-col gap-2 mt-1">
            {[
              {
                id: 'budget' as const,
                title: 'Budget vorhanden',
                desc: 'Budget ist für Vertriebssoftware reserviert (> 20.000 €).',
              },
              {
                id: 'authority' as const,
                title: 'Entscheidungskompetenz (Authority)',
                desc: 'Kontakt ist Entscheidungsträger oder direkter Budgetverantwortlicher.',
              },
              {
                id: 'need' as const,
                title: 'Konkreter Bedarf (Need)',
                desc: 'Bestehende Schmerzen bei Lead-Routing, Konvertierung oder Pipeline-Transparenz.',
              },
              {
                id: 'timeline' as const,
                title: 'Zeitplan (Timeline)',
                desc: 'Einführung ist innerhalb der nächsten 1–3 Monate geplant.',
              },
            ].map((crit) => {
              const checked = bant[crit.id];
              return (
                <button
                  key={crit.id}
                  type="button"
                  onClick={() => toggleBant(crit.id)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    checked
                      ? 'bg-primary/10 border-primary/40 text-text'
                      : 'bg-black/10 border-border hover:bg-black/20 text-[var(--color-text-muted)]'
                  }`}
                  aria-pressed={checked}
                >
                  <span className="mt-0.5 shrink-0 text-primary">
                    {checked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-text">{crit.title}</span>
                    <span className="text-[11.5px] leading-tight text-[var(--color-text-muted)]">
                      {crit.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ICP Scoring Faktoren Breakdown */}
        <div className="flex flex-col gap-2">
          <h5 className="font-semibold text-[13.5px] uppercase tracking-wider text-[var(--color-text-muted)] m-0">
            ICP-Kriterien Aufschlüsselung
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {result.breakdown.map((f) => (
              <div
                key={f.key}
                className="p-2.5 rounded-md bg-black/20 border border-border flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-text">{f.label}</span>
                  <span className="text-[11.5px] font-mono font-bold text-primary">
                    +{f.points} Pkt.
                  </span>
                </div>
                <span className="text-[11px] text-[var(--color-text-muted)] leading-tight">
                  {f.reason}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Qualifizierungsnotizen */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="lead-qualification-notes"
            className="text-[13px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider"
          >
            Qualifizierungsnotizen & Einwände
          </label>
          <textarea
            id="lead-qualification-notes"
            rows={3}
            value={bant.notes}
            onChange={(e) => setBant((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Ergebnisse des Erstgesprächs, relevante Stakeholder oder nächste Schritte notieren..."
            className="w-full p-2.5 text-[13px] bg-black/40 border border-border rounded-lg text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>
      </div>
    </Drawer>
  );
}
