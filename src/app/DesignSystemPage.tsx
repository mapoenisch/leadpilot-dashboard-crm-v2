import React, { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SimpleChart } from '@/components/ui/Charts';
import { Checkbox } from '@/components/ui/Checkbox';
import { Divider } from '@/components/ui/Divider';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { NavItem } from '@/components/ui/NavItem';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Select } from '@/components/ui/Select';
import { StatusChip } from '@/components/ui/StatusChip';
import { Table } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Toolbar } from '@/components/ui/Toolbar';
import { Skeleton } from '@/components/ui/Skeleton';

// Gate G38 (Auftrag 053, Block D): DEV-only Galerie aller 19 Primitives.
// Nur via /design-system erreichbar, wenn import.meta.env.DEV — die Route
// wird in App.tsx conditional registriert (Prod: nicht vorhanden).
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-display text-[18px] font-semibold text-text">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

function Thrower(): JSX.Element {
  throw new Error('Design-System-Demo-Fehler');
}

const CHART_SAMPLE = {
  type: 'bar' as const,
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  datasets: [
    { label: 'A', data: [49, 53, 56, 58], color: '#00D9C6' },
    { label: 'B', data: [38, 41, 44, 47], color: '#FF7A3D' },
  ],
};

const TABLE_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'wert', label: 'Wert' },
];
const TABLE_ROWS = [
  { id: '1', name: 'Alpha', wert: '10 €' },
  { id: '2', name: 'Beta', wert: '20 €' },
];

export function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [stepper, setStepper] = useState(4);
  const [selectValue, setSelectValue] = useState('a');
  const [tab, setTab] = useState('one');
  const [checked, setChecked] = useState(true);
  const [throwDemo, setThrowDemo] = useState(false);
  // G39 Welle 1 (Auftrag 054, Block C): Theme-Testfläche — schaltet
  // data-theme am <html>-Element direkt (Demo ohne Persistenz; der
  // persistente Umschalter sitzt im Header).
  const [demoTheme, setDemoTheme] = useState<'dark' | 'light'>(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
      ? 'light'
      : 'dark',
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1100px]">
      <SectionHeader
        eyebrow="Design-System"
        title="Primitive-Galerie (DEV)"
        description="Alle 20 Primitives mit Varianten und Zuständen. Nur im Dev-Modus verfügbar."
      />

      <Section title="Theme (Welle 1, vorläufig)">
        <Button
          variant="secondary"
          onClick={() => {
            const next = demoTheme === 'dark' ? 'light' : 'dark';
            setDemoTheme(next);
            document.documentElement.dataset.theme = next;
          }}
        >
          {demoTheme === 'dark' ? 'Helles Design testen' : 'Dunkles Design testen'}
        </Button>
        <span className="text-[12px] text-[var(--color-text-muted)]">
          Aktuell: {demoTheme === 'dark' ? 'dunkel' : 'hell (vorläufig, Freigabe ausstehend)'}
        </span>
      </Section>

      <Section title="Alert">
        <Alert variant="info" title="Info">
          Hinweistext
        </Alert>
        <Alert variant="success" title="Erfolg">
          Erfolgstext
        </Alert>
        <Alert variant="warning" title="Warnung">
          Warntext
        </Alert>
        <Alert variant="error" title="Fehler">
          Fehlertext
        </Alert>
      </Section>

      <Section title="Badge">
        <Badge variant="cyan">Cyan</Badge>
        <Badge variant="orange">Orange</Badge>
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="mint">Mint</Badge>
        <Badge variant="red">Rot</Badge>
      </Section>

      <Section title="Button">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="primary" size="sm">
          Klein
        </Button>
        <Button variant="primary" size="lg">
          Groß
        </Button>
        <Button variant="primary" loading>
          Lädt
        </Button>
        <Button variant="primary" disabled>
          Deaktiviert
        </Button>
      </Section>

      <Section title="Card">
        <Card variant="default">Standard</Card>
        <Card variant="glass">Glas</Card>
        <Card variant="elevated">Erhöht</Card>
        <Card variant="warning">Warnung</Card>
        <Card variant="info">Info</Card>
        <Card variant="default" featured>
          Hervorgehoben
        </Card>
      </Section>

      <Section title="Charts">
        <SimpleChart config={CHART_SAMPLE} height={180} />
      </Section>

      <Section title="Checkbox">
        <Checkbox checked={checked} onChange={setChecked} label="Aktiv" />
        <Checkbox checked={false} onChange={() => undefined} label="Inaktiv" />
        <Checkbox checked={false} onChange={() => undefined} label="Deaktiviert" disabled />
        <Checkbox
          checked
          label="Mit Beschreibung"
          description="Hilfetext"
          onChange={() => undefined}
        />
      </Section>

      <Section title="Divider">
        <Divider />
      </Section>

      <Section title="Icon">
        <Icon name="checkCircle" />
        <Icon name="zap" color="var(--color-primary)" />
        <Icon name="bell" size={24} />
      </Section>

      <Section title="Input">
        <Input label="Standard" value="" onChange={() => undefined} placeholder="Eingabe" />
        <Input label="Klein" sizeVariant="sm" value="" onChange={() => undefined} />
        <Input label="Fehler" error="Pflichtfeld" value="" onChange={() => undefined} />
        <Input label="Deaktiviert" disabled value="x" onChange={() => undefined} />
      </Section>

      <Section title="Modal">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Modal öffnen
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Demo-Dialog"
          maxWidth="600px"
        >
          Dialoginhalt zur Abnahme.
        </Modal>
      </Section>

      <Section title="NavItem">
        <NavItem label="Aktiv" active />
        <NavItem label="Inaktiv" />
      </Section>

      <Section title="NumberStepper">
        <NumberStepper label="Menge" value={stepper} onChange={setStepper} />
        <NumberStepper label="Fehler" value={1} onChange={() => undefined} error="Zu klein" />
        <NumberStepper label="Deaktiviert" value={2} onChange={() => undefined} disabled />
      </Section>

      <Section title="RouteErrorBoundary">
        <RouteErrorBoundary resetKey={throwDemo ? 'wirf' : 'ruhig'}>
          {throwDemo ? (
            <Thrower />
          ) : (
            <Button variant="secondary" onClick={() => setThrowDemo(true)}>
              Fehler auslösen
            </Button>
          )}
        </RouteErrorBoundary>
      </Section>

      <Section title="SectionHeader">
        <SectionHeader title="Nur Titel" />
      </Section>

      <Section title="Select">
        <Select
          label="Auswahl"
          options={[
            { value: 'a', label: 'Option A' },
            { value: 'b', label: 'Option B' },
          ]}
          value={selectValue}
          onChange={setSelectValue}
        />
        <Select
          label="Fehler"
          options={[]}
          value=""
          onChange={() => undefined}
          error="Pflichtfeld"
        />
      </Section>

      <Section title="Skeleton">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="rect" width={220} height={64} />
        <Skeleton variant="circle" width={40} height={40} />
        <Skeleton variant="rect" width="100%" height={180} label="Lade Inhalte" />
      </Section>

      <Section title="StatusChip">
        <StatusChip variant="cyan" label="Live" />
        <StatusChip variant="orange" label="Achtung" />
        <StatusChip variant="mint" label="Ok" />
        <StatusChip variant="neutral" label="Ruhig" />
        <StatusChip variant="cyan" label="Klein" size="sm" />
        <StatusChip variant="cyan" label="Puls" pulse />
      </Section>

      <Section title="Table">
        <Table columns={TABLE_COLS} rows={TABLE_ROWS} />
        <Table columns={TABLE_COLS} rows={[]} minWidth="650px" />
      </Section>

      <Section title="Tabs">
        <Tabs
          items={[
            { id: 'one', label: 'Eins' },
            { id: 'two', label: 'Zwei (3)', count: 3 },
          ]}
          activeId={tab}
          onChange={setTab}
        />
      </Section>

      <Section title="Toolbar">
        <Toolbar align="left">
          <Button variant="secondary" size="sm">
            Links
          </Button>
        </Toolbar>
        <Toolbar align="between" gap="6px">
          <Button variant="secondary" size="sm">
            A
          </Button>
          <Button variant="secondary" size="sm">
            B
          </Button>
        </Toolbar>
      </Section>

      <Divider />
    </div>
  );
}
