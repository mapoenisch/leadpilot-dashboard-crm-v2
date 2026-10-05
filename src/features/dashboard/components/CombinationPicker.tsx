// Executive Dashboard, Teilauftrag 6 (Auftrag 076): Auswahl der zweiten Kennzahl im Konfigurator.
// Bietet nur freigegebene Partner aus der Positivliste an; naheliegende, aber gesperrte Partner
// derselben Quelle erscheinen deaktiviert mit Grund. Wird mit dem Konfigurator nachgeladen.
import {
  blockedPartnersFor,
  partnersFor,
  type CombinationRule,
} from '../model/dashboardCombinations';
import { Group, Option } from './ConfiguratorFields';

export const NO_COMBINATION = 'Ohne Kombination';

export interface CombinationPickerProps {
  /** Name der Radiogruppe (eindeutig je Dialog). */
  name: string;
  /** Erste Kennzahl. */
  firstId: string;
  /** Aktuelle Wahl: Regel-ID oder die erste Kennzahl selbst (keine Kombination). */
  selectedId: string;
  onPick: (rule: CombinationRule | null) => void;
}

export function CombinationPicker({ name, firstId, selectedId, onPick }: CombinationPickerProps) {
  const partners = partnersFor(firstId);
  const blocked = blockedPartnersFor(firstId);
  if (partners.length === 0 && blocked.length === 0) return null;
  return (
    <div data-testid="combination-picker" className="max-h-[220px] overflow-y-auto">
      <Group legend="Mit zweiter Kennzahl kombinieren (optional)">
        <Option
          name={name}
          checked={selectedId === firstId}
          label={NO_COMBINATION}
          onSelect={() => onPick(null)}
        />
        {partners.map(({ rule, partnerLabel, formula }) => (
          <Option
            key={rule.id}
            name={name}
            checked={selectedId === rule.id}
            label={`${rule.name} (mit ${partnerLabel})`}
            hint={`Formel: ${formula}. ${rule.explanation}`}
            onSelect={() => onPick(rule)}
          />
        ))}
        {blocked.map(({ entry, reason }) => (
          <Option
            key={entry.id}
            name={name}
            checked={false}
            disabled
            label={entry.name}
            hint={`Nicht kombinierbar: ${reason}`}
            onSelect={() => undefined}
          />
        ))}
      </Group>
    </div>
  );
}

/** Ansage nach der Wahl der ersten Kennzahl: wie viele Kombinationen möglich sind. */
export function offerText(firstId: string): string {
  const count = partnersFor(firstId).length;
  if (count === 0) return '';
  return count === 1
    ? '1 Kombination mit einer zweiten Kennzahl möglich.'
    : `${count} Kombinationen mit einer zweiten Kennzahl möglich.`;
}
