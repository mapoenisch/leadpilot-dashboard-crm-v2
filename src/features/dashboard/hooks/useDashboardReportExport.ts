import { useState, useCallback } from 'react';
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
    // Timeout stellt sicher, dass das DOM vor dem Druckaufruf neu gezeichnet wurde
    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    }, 100);
  }, []);

  return {
    reportModalOpen,
    printConfig,
    openReportModal,
    closeReportModal,
    confirmPrint,
  };
}
