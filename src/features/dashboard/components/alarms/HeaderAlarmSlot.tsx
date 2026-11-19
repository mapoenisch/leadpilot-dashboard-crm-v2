// Executive Dashboard V2 (Auftrag 168 / P13c):
// Header-Slot für Alarmglocke und Ausfallhinweis (entkoppelt von Header/Layout zur Einhaltung der Schichtenarchitektur).

import React from 'react';
import { AlarmBell } from './AlarmBell';
import { AlarmWorkerBanner } from './AlarmWorkerBanner';

export const HeaderAlarmSlot: React.FC = () => {
  return (
    <div data-testid="header-alarm-slot" className="flex items-center gap-2">
      <AlarmWorkerBanner className="hidden md:flex text-[11px] py-1 px-2.5 max-w-[360px]" />
      <AlarmBell />
    </div>
  );
};
