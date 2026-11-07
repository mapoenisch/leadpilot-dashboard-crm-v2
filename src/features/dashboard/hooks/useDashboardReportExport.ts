import { useState, useCallback, useEffect } from 'react';
import type { ReportExportConfig } from '../components/export/DashboardReportModal';

export function useDashboardReportExport() {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState<ReportExportConfig | null>(null);

  const openReportModal = useCallback(() => {
    setReportModalOpen(true);
  }, []);

  const closeReportModal = useCallback(() => {
    setReportModalOpen(false);
  }, []);

  const confirmPrint = useCallback((config: ReportExportConfig) => {
    setPrintConfig(config);
    setReportModalOpen(false);
  }, []);

  // Native Browser-Druckunterstützung (Cmd+P) & Aufräumen nach Druck (Auftrag 132 Review)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforePrint = () => {
      setPrintConfig((prev) => {
        if (prev) return prev;
        return {
          title: 'LeadPilot Executive Management Briefing',
          periodText: 'Aktuelle Periode',
          selectedTileIds: [],
          commentary: '',
          orientation: 'landscape',
          includeAppendix: true,
        };
      });
    };

    const handleAfterPrint = () => {
      setPrintConfig(null);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  return {
    reportModalOpen,
    printConfig,
    openReportModal,
    closeReportModal,
    confirmPrint,
  };
}
