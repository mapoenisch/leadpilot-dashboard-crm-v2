// Executive Dashboard V2 (Auftrag 172 / P15b §2.3):
// Reportexport des V2-Editors: Auswahl im bestehenden Report-Dialog, danach Druckansicht mit
// automatischem Druckdialog (Druck oder „Als PDF sichern“). Nach dem Drucken wird die Ansicht entfernt.
// Kein Server-Code: Der Report nutzt nur Daten der aktuellen Ansicht (siehe DashboardPrintViewV2).

import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '@/auth/AuthContext';
import { useOrganization } from '@/auth/organizationContext';
import type { DashboardConfigV2 } from '../../model/dashboardConfigV2';
import type { TileDataHook } from '../LazyDashboardTile';
import { useDashboardAlarms } from '../../hooks/useDashboardAlarms';
import { convertV2TileToV1 } from '../editor/canvas/CanvasTileCard';
import { DashboardReportModal, type ReportExportConfig } from './DashboardReportModal';
import { DashboardPrintViewV2 } from './DashboardPrintViewV2';
import { createReportTileDataHook } from './reportTileData';

export interface DashboardReportV2Props {
  open: boolean;
  onClose: () => void;
  config: DashboardConfigV2;
  useData: TileDataHook;
  /** Ohne Angabe: Organisation der Sitzung wie im V1-Report, sonst „LeadPilot GmbH“ (Vorschau) */
  organizationName?: string;
}

export function DashboardReportV2({
  open,
  onClose,
  config,
  useData,
  organizationName,
}: DashboardReportV2Props) {
  const [report, setReport] = useState<ReportExportConfig | null>(null);
  const auth = useContext(AuthContext);
  const { session } = useOrganization();
  const orgName =
    organizationName ??
    (session?.organizationId ? `Organisation ${session.organizationId}` : 'LeadPilot GmbH');
  // Angezeigter Datenstand der Ansicht (auch eingefroren), sonst die Quelle
  const reportUseData = useMemo(() => createReportTileDataHook(useData), [useData]);
  // derselbe Cache wie der Canvas; Ladezustand und Fehler gehen in Druckfreigabe und Kopf ein
  const { rules, isRulesLoading, isRulesError } = useDashboardAlarms({ dashboardId: config.id });
  const alarmsState = isRulesError ? 'fehler' : isRulesLoading ? 'laden' : 'bereit';

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
            useData={reportUseData}
            organizationName={orgName}
            createdBy={auth?.user?.email ?? 'Vorschau (ohne Anmeldung)'}
            alarmStatusByTile={alarmStatusByTile}
            alarmsState={alarmsState}
          />
        </div>
      )}
    </>
  );
}
