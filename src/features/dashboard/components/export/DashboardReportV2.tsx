// Executive Dashboard V2 (Auftrag 172 / P15b §2.3):
// Reportexport des V2-Editors: Auswahl im bestehenden Report-Dialog, danach Druckansicht mit
// automatischem Druckdialog (Druck oder „Als PDF sichern“). Nach dem Drucken wird die Ansicht entfernt.
// Kein Server-Code: Der Report nutzt nur Daten der aktuellen Ansicht (siehe DashboardPrintViewV2).

import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '@/auth/AuthContext';
import type { DashboardConfigV2 } from '../../model/dashboardConfigV2';
import type { TileDataHook } from '../LazyDashboardTile';
import { useDashboardAlarms } from '../../hooks/useDashboardAlarms';
import { convertV2TileToV1 } from '../editor/canvas/CanvasTileCard';
import { DashboardReportModal, type ReportExportConfig } from './DashboardReportModal';
import { DashboardPrintViewV2 } from './DashboardPrintViewV2';

export interface DashboardReportV2Props {
  open: boolean;
  onClose: () => void;
  config: DashboardConfigV2;
  useData: TileDataHook;
  organizationName?: string;
}

export function DashboardReportV2({
  open,
  onClose,
  config,
  useData,
  organizationName = 'LeadPilot GmbH',
}: DashboardReportV2Props) {
  const [report, setReport] = useState<ReportExportConfig | null>(null);
  const auth = useContext(AuthContext);
  const { rules } = useDashboardAlarms({ dashboardId: config.id }); // derselbe Cache wie der Canvas

  const v1Tiles = useMemo(
    () =>
      config.tiles.map((t) => convertV2TileToV1(t, config.globalTimeframe, config.globalPipeline)),
    [config.tiles, config.globalTimeframe, config.globalPipeline],
  );
  const alarmStatusByTile = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const r of rules) if (r.tileId) map[r.tileId] = r.status;
    return map;
  }, [rules]);

  // Nach dem Druckdialog Report-Ansicht entfernen
  useEffect(() => {
    if (!report) return;
    const done = () => setReport(null);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, [report]);

  return (
    <>
      <DashboardReportModal
        open={open}
        onClose={onClose}
        tiles={v1Tiles}
        filters={{ pipeline: config.globalPipeline }}
        onConfirmPrint={(cfg) => {
          setReport({ ...cfg, title: cfg.title || config.title });
          onClose();
        }}
      />
      {report && (
        <div data-report-v2="true" data-has-report="true" data-testid="report-v2-container">
          <DashboardPrintViewV2
            dashboard={config}
            report={report}
            useData={useData}
            organizationName={organizationName}
            createdBy={auth?.user?.email ?? 'Vorschau (ohne Anmeldung)'}
            alarmStatusByTile={alarmStatusByTile}
          />
        </div>
      )}
    </>
  );
}
