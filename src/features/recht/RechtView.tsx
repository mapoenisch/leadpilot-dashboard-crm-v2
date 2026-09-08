import React from 'react';
import { ArticlesPage } from './pages/ArticlesPage';
import { ShareholdersPage } from './pages/ShareholdersPage';
import { CommercialRegisterPage } from './pages/CommercialRegisterPage';
import { ManagingDirectorContractPage } from './pages/ManagingDirectorContractPage';
import { LeaseContractPage } from './pages/LeaseContractPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-satzung': ArticlesPage,
  's-gesellschafter': ShareholdersPage,
  's-handelsregister': CommercialRegisterPage,
  's-gf': ManagingDirectorContractPage,
  's-mietvertrag': LeaseContractPage,
};

export interface RechtViewProps {
  activeSubView?: string;
}

export function RechtView({ activeSubView = 's-satzung' }: RechtViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? ArticlesPage;
  return <Component />;
}
