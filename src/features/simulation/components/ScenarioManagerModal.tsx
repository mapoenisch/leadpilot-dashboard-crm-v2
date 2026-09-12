import React, { useState } from 'react';
import {
  useActiveScenario,
  useActiveVersion,
  useScenarioActions,
  useScenarioVersions,
  useScenarios,
} from '../../../store/hooks';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { StatusChip } from '../../../components/ui/StatusChip';
import { ScenarioManageTab } from './ScenarioManageTab';
import { ScenarioDiffTab } from './ScenarioDiffTab';

interface ScenarioManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScenarioManagerModal: React.FC<ScenarioManagerModalProps> = ({ isOpen, onClose }) => {
  const scenarios = useScenarios();
  const activeScenario = useActiveScenario();
  const activeVersion = useActiveVersion();
  const versions = useScenarioVersions();
  const { selectScenario, selectVersion, createNewVersion } = useScenarioActions();

  const [activeTab, setActiveTab] = useState<'manage' | 'diff'>('manage');

  // Version selection for Side-by-Side Diff
  const [diffVersionIdA, setDiffVersionIdA] = useState<string>(
    versions[0]?.id || activeVersion?.id || ''
  );
  const [diffVersionIdB, setDiffVersionIdB] = useState<string>(
    versions[1]?.id || versions[0]?.id || activeVersion?.id || ''
  );

  // Keep diff version IDs valid when versions change
  React.useEffect(() => {
    if (versions.length > 0) {
      if (!versions.some((v) => v.id === diffVersionIdA)) {
        setDiffVersionIdA(versions[0]?.id ?? '');
      }
      if (!versions.some((v) => v.id === diffVersionIdB)) {
        const fallbackB = versions[versions.length > 1 ? 1 : 0] ?? versions[0];
        setDiffVersionIdB(fallbackB?.id ?? '');
      }
    }
  }, [versions, diffVersionIdA, diffVersionIdB]);

  const handleOpenDiff = (versionId?: string) => {
    if (versionId) {
      setDiffVersionIdB(versionId);
    }
    setActiveTab('diff');
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Szenario- & Versions-Entscheidungswerkbank" maxWidth="1000px">
      <div className="flex flex-col gap-[var(--space-4)] w-full">
        {/* Executive Header Bar */}
        <div className="flex justify-between items-center flex-wrap gap-[var(--space-3)] rounded-md border border-solid border-border bg-background-deep px-[var(--space-4)] py-[var(--space-3)]">
          <div className="flex items-center gap-[var(--space-3)]">
            <div>
              <span className="text-[11px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                Aktives Szenario
              </span>
              <div className="text-[15px] font-bold text-text">
                {activeScenario?.name || 'Unbenanntes Szenario'}
              </div>
            </div>
            {activeScenario?.isProtected && <StatusChip variant="neutral" label="Geschützt (Base 2026)" size="sm" />}
          </div>

          <div className="flex items-center gap-[var(--space-2)]">
            <StatusChip
              variant="cyan"
              label={`Aktive Version: v${activeVersion?.versionNumber ?? 1}`}
              size="sm"
            />
            <span className="text-[12px] text-[var(--color-text-muted)]">
              ({versions.length} Version{versions.length === 1 ? '' : 'en'} verfügbar)
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-0 border-b border-solid border-border flex gap-[8px] pb-[8px]">
          <button
            data-testid="scenario-manage-tab"
            onClick={() => setActiveTab('manage')}
            className={`rounded-md cursor-pointer text-[13px] font-semibold px-[14px] py-[6px] ${activeTab === 'manage' ? 'border border-solid border-primary bg-primary-soft text-primary' : 'border border-solid border-transparent bg-transparent text-[var(--color-text-muted)]'}`}
          >
            ⚙️ Szenario & Versionen verwalten
          </button>
          <button
            data-testid="scenario-diff-tab"
            onClick={() => setActiveTab('diff')}
            className={`rounded-md cursor-pointer text-[13px] font-semibold px-[14px] py-[6px] flex items-center gap-[6px] ${activeTab === 'diff' ? 'border border-solid border-primary bg-primary-soft text-primary' : 'border border-solid border-transparent bg-transparent text-[var(--color-text-muted)]'}`}
          >
            ⚖️ Szenario-Versionen-Diff (Side-by-Side)
            {versions.length > 1 && <Badge variant="cyan">{versions.length} Versionen</Badge>}
          </button>
        </div>

        {/* TAB 1: MANAGE SCENARIO & VERSIONS */}
        {activeTab === 'manage' && (
          <ScenarioManageTab
            scenarios={scenarios}
            activeScenario={activeScenario}
            activeVersion={activeVersion}
            versions={versions}
            onSelectScenario={selectScenario}
            onSelectVersion={selectVersion}
            onOpenDiff={handleOpenDiff}
            createNewVersion={createNewVersion}
          />
        )}

        {/* TAB 2: SIDE-BY-SIDE DIFF */}
        {activeTab === 'diff' && (
          <ScenarioDiffTab
            versions={versions}
            activeVersion={activeVersion}
            diffVersionIdA={diffVersionIdA}
            diffVersionIdB={diffVersionIdB}
            setDiffVersionIdA={setDiffVersionIdA}
            setDiffVersionIdB={setDiffVersionIdB}
          />
        )}
      </div>
    </Modal>
  );
};
