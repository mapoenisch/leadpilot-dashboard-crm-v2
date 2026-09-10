import React from 'react';
import { OverviewView } from '../overview/OverviewView';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Divider } from '../../components/ui/Divider';
import { Icon } from '../../components/ui/Icon';

const ALL_LEADS = [
  { name: 'Ari Chen', company: 'Northwind', status: 'Hot', owner: 'You' },
  { name: 'Priya Rao', company: 'Fenwick Co', status: 'Won', owner: 'You' },
  { name: 'Sam Okafor', company: 'Delta Labs', status: 'New', owner: 'Jordan' },
  { name: 'Jules Martin', company: 'Ocular', status: 'New', owner: 'Jordan' },
  { name: 'Nadia Farouk', company: 'Brightline', status: 'Hot', owner: 'You' },
  { name: 'Owen Reyes', company: 'Kestrel', status: 'Lost', owner: 'Jordan' },
];

const STEPS = [
  { step: 1, title: 'Intro email', wait: 'Day 0' },
  { step: 2, title: 'Follow-up', wait: 'Day 3' },
  { step: 3, title: 'Value nudge', wait: 'Day 7' },
  { step: 4, title: 'Final check-in', wait: 'Day 14' },
];

export function StandaloneKitView({ view = 'overview' }: { view?: 'overview' | 'leads' | 'sequences' | 'settings' }) {
  const [tab, setTab] = React.useState('all');
  const [openModal, setOpenModal] = React.useState(false);

  if (view === 'leads') {
    const rows = tab === 'all' ? ALL_LEADS : ALL_LEADS.filter((l) => l.status.toLowerCase() === tab);
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'company', label: 'Company' },
      { key: 'status', label: 'Status', render: (r: (typeof ALL_LEADS)[number]) => <Badge variant={r.status === 'Won' ? 'cyan' : r.status === 'Hot' ? 'orange' : 'neutral'}>{r.status}</Badge> },
      { key: 'owner', label: 'Owner' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <SectionHeader eyebrow="Pipeline" title="Leads" description="All contacts currently being worked." actions={<Button variant="primary" onClick={() => setOpenModal(true)}>New lead</Button>} />
        <Tabs
          items={[{ id: 'all', label: 'All' }, { id: 'hot', label: 'Hot' }, { id: 'new', label: 'New' }, { id: 'won', label: 'Won' }]}
          activeId={tab}
          onChange={setTab}
        />
        <Table columns={columns} rows={rows} />
        <Modal
          open={openModal}
          onClose={() => setOpenModal(false)}
          title="Add a new lead"
          footer={<>
            <Button variant="secondary" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpenModal(false)}>Add lead</Button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input label="Full name" placeholder="Jordan Lee" />
            <Input label="Company" placeholder="Acme Corp" />
          </div>
        </Modal>
      </div>
    );
  }

  if (view === 'sequences') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <SectionHeader eyebrow="Automation" title="Sequences" description="Outreach steps that run on autopilot." actions={<Button variant="primary">New sequence</Button>} />
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600 }}>Outbound — new leads</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>4 steps · 214 enrolled</div>
            </div>
            <Badge variant="cyan">Live</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {STEPS.map((s, i) => (
              <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-3) 0', borderTop: i > 0 ? '1px solid var(--color-border-soft)' : 'none' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>{s.step}</div>
                <Icon name="send" size={16} color="var(--color-text-muted)" />
                <div style={{ flex: 1, color: 'var(--color-text)', fontSize: '14px' }}>{s.title}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '12.5px' }}>{s.wait}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '480px' }}>
        <SectionHeader eyebrow="Account" title="Settings" description="Update your workspace details." />
        <Input label="Workspace name" defaultValue="LeadPilot Sales" />
        <Input label="Notification email" defaultValue="alerts@leadpilot.io" />
        <Divider />
        <Button variant="primary" style={{ alignSelf: 'flex-start' }}>Save changes</Button>
      </div>
    );
  }

  // Default: overview
  return <OverviewView />;
}
