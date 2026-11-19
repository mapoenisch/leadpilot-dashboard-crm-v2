// Executive Dashboard V2 (Auftrag 168 / P13c):
// Header-Slot für Alarmglocke und Ausfallhinweis (entkoppelt von Header/Layout zur Einhaltung der Schichtenarchitektur).

import React from 'react';
import { AlarmWorkerBanner } from './AlarmWorkerBanner';
import { AlarmBell } from './AlarmBell';

export const HeaderAlarmSlot: React.FC = () => {
  return (
    <>
      <AlarmWorkerBanner className="hidden lg:flex" />
      <AlarmBell />
    </>
  );
};
