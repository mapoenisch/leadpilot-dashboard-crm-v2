import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, DollarSign, Calendar, Tag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { estimateDealAmountForLead } from '../services/leadScoringService';

export interface ConvertedDealData {
  dealName: string;
  stage: string;
  amount: number;
  closeDate: string;
  companyName: string;
  leadId: string;
  leadName: string;
}

export interface LeadConversionModalProps {
  lead: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deal: ConvertedDealData) => void;
}

const STAGE_OPTIONS = [
  { value: 'Erstgespräch geführt', label: 'Erstgespräch geführt (Initial)' },
  { value: 'Bedarfsanalyse', label: 'Bedarfsanalyse (Qualifiziert)' },
  { value: 'Angebot erstellt', label: 'Angebot erstellt' },
];

export function LeadConversionModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: LeadConversionModalProps) {
  const [dealName, setDealName] = useState('');
  const [amountStr, setAmountStr] = useState('30000');
  const [stage, setStage] = useState('Erstgespräch geführt');
  const [closeDate, setCloseDate] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (lead) {
      const company = String(lead.companyName ?? lead.companyId ?? 'Unternehmen');
      const count = lead.employeeCount as number | string | undefined;
      const estimated = estimateDealAmountForLead(count);
      setDealName(`${company} – LeadPilot Enterprise`);
      setAmountStr(String(estimated));
      setStage('Erstgespräch geführt');

      // Vordefiniertes Abschlussdatum: ca. 60 Tage in der Zukunft
      const d = new Date();
      d.setDate(d.getDate() + 60);
      const isoDate = d.toISOString().split('T')[0] || '2026-12-31';
      setCloseDate(isoDate);
      setIsSubmitted(false);
    }
  }, [lead]);

  if (!lead) return null;

  const fullName =
    `${String(lead.firstName ?? '')} ${String(lead.lastName ?? '')}`.trim() ||
    String(lead.name ?? 'Kontakt');
  const companyName = String(lead.companyName ?? lead.companyId ?? 'Unternehmen');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;

    const newDeal: ConvertedDealData = {
      dealName: dealName.trim() || `${companyName} – Deal`,
      stage,
      amount,
      closeDate: closeDate || '2026-12-31',
      companyName,
      leadId: String(lead.id ?? ''),
      leadName: fullName,
    };

    // Speichere in sessionStorage für konsistente Sichtbarkeit
    try {
      const stored = sessionStorage.getItem('leadpilot_crm_converted_deals');
      const list: ConvertedDealData[] = stored ? JSON.parse(stored) : [];
      list.push(newDeal);
      sessionStorage.setItem('leadpilot_crm_converted_deals', JSON.stringify(list));
    } catch {
      // Ignorieren falls nicht verfügbar
    }

    setIsSubmitted(true);
    setTimeout(() => {
      onSuccess(newDeal);
      onClose();
    }, 400);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Lead in Deal umwandeln"
      maxWidth="600px"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitted}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconRight={isSubmitted ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
            onClick={() => handleSubmit()}
            disabled={isSubmitted || !dealName.trim()}
          >
            {isSubmitted ? 'Deal angelegt!' : 'Deal jetzt anlegen'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-text py-1">
        <div className="p-3 rounded-md bg-[rgba(var(--color-primary-rgb,59,130,246),0.06)] border border-primary/20 text-[13px] flex flex-col gap-1">
          <div className="font-medium text-text">
            Kontakt: <strong className="text-primary">{fullName}</strong>
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Unternehmen: {companyName} · Qualifizierte Lead-Konvertierung in die operative Pipeline.
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="deal-name-input"
            className="text-[13px] font-medium text-[var(--color-text-muted)]"
          >
            Deal-Titel
          </label>
          <Input
            id="deal-name-input"
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
            placeholder="z. B. Acme GmbH – LeadPilot Enterprise"
            leadingIcon={<Tag size={15} />}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="deal-amount-input"
              className="text-[13px] font-medium text-[var(--color-text-muted)]"
            >
              Geschätzter Betrag (€)
            </label>
            <Input
              id="deal-amount-input"
              type="number"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="z. B. 48000"
              leadingIcon={<DollarSign size={15} />}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Select
              label="Startphase:"
              options={STAGE_OPTIONS}
              value={stage}
              onChange={(val) => setStage(val)}
              fullWidth
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="deal-close-date-input"
            className="text-[13px] font-medium text-[var(--color-text-muted)]"
          >
            Voraussichtliches Abschlussdatum
          </label>
          <Input
            id="deal-close-date-input"
            type="date"
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
            leadingIcon={<Calendar size={15} />}
            required
          />
        </div>
      </form>
    </Modal>
  );
}
