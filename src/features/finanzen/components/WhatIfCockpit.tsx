import React, { useState, useMemo } from 'react';
import { Sparkles, RotateCcw, TrendingUp, Users, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BASELINE_PARAMS,
  PARAM_LIMITS,
  PRESETS,
  type WhatIfParameters,
  type PresetKey,
  calculateProjection,
  calculateTornadoSensitivity,
  clampParameters,
} from '../services/whatIfModel';
import { WhatIfProjectionChart } from './WhatIfProjectionChart';
import { WhatIfTornadoChart } from './WhatIfTornadoChart';

export interface WhatIfCockpitProps {
  initialParams?: Partial<WhatIfParameters>;
}

export const WhatIfCockpit: React.FC<WhatIfCockpitProps> = ({ initialParams }) => {
  const [params, setParams] = useState<WhatIfParameters>(() =>
    clampParameters(initialParams ?? {}),
  );
  const [activePreset, setActivePreset] = useState<PresetKey | 'custom'>('baseline');

  const result = useMemo(() => calculateProjection(params), [params]);
  const tornadoItems = useMemo(() => calculateTornadoSensitivity(params), [params]);

  const handleParamChange = (key: keyof WhatIfParameters, value: number) => {
    setParams((prev) => clampParameters({ ...prev, [key]: value }));
    setActivePreset('custom');
  };

  const handleSelectPreset = (key: PresetKey) => {
    setActivePreset(key);
    setParams(PRESETS[key].params);
  };

  const handleReset = () => {
    handleSelectPreset('baseline');
  };

  const isBaseline =
    params.churnRate === BASELINE_PARAMS.churnRate &&
    params.salesCycleDays === BASELINE_PARAMS.salesCycleDays &&
    params.marketingBudget === BASELINE_PARAMS.marketingBudget &&
    params.winRate === BASELINE_PARAMS.winRate;

  return (
    <section
      className="mt-7 rounded-xl border border-border bg-card p-6 shadow-xl"
      data-testid="what-if-cockpit"
      aria-label="What-If Hebelrechner"
    >
      {/* Kopfbereich */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00D9C6]">
            <Sparkles size={14} aria-hidden="true" />
            Interaktive Szenario-Simulation
          </div>
          <h2 className="m-0 text-xl font-bold text-text">„What-If“-Hebelrechner</h2>
          <p className="m-0 mt-1 max-w-2xl text-xs text-text-muted">
            Verändere die 4 strategischen Wachstumshebel für Churn, Sales Cycle, Marketing und
            Win-Rate zur Echtzeit-Abschätzung von ARR, Kundenbestand und Amortisationsdauer.
          </p>
        </div>

        {/* Reset-Button */}
        <button
          type="button"
          onClick={handleReset}
          disabled={isBaseline}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-all',
            isBaseline
              ? 'cursor-not-allowed opacity-40 text-text-muted'
              : 'cursor-pointer bg-slate-800/60 text-text hover:bg-slate-700/60',
          )}
          aria-label="Hebel auf Baseline zurücksetzen"
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>Auf Baseline zurücksetzen</span>
        </button>
      </div>

      {/* Preset-Leiste */}
      <div
        role="group"
        aria-label="Schnell-Szenarien"
        className="mb-6 flex flex-wrap gap-2 border-b border-border/60 pb-4"
      >
        {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
          const preset = PRESETS[key];
          const isSelected = activePreset === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={`preset-btn-${key}`}
              onClick={() => handleSelectPreset(key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer',
                isSelected
                  ? 'border-[#00D9C6] bg-[#00D9C6]/10 text-[#00D9C6] shadow-sm'
                  : 'border-border bg-slate-800/40 text-text hover:bg-slate-700/50',
              )}
              title={preset.description}
            >
              <span>{preset.icon}</span>
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>

      {/* 4 Schieberegler */}
      <div className="mb-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Churn-Rate */}
        <div
          data-testid="slider-group-churn"
          className="rounded-lg border border-border bg-slate-800/30 p-3.5"
        >
          <div className="mb-1.5 flex justify-between">
            <label htmlFor="slider-churn" className="text-xs font-semibold text-text">
              Monatlicher Churn
            </label>
            <span
              data-testid="val-churn"
              className={cn(
                'text-xs font-bold',
                params.churnRate <= BASELINE_PARAMS.churnRate
                  ? 'text-emerald-400'
                  : 'text-[#FF7A3D]',
              )}
            >
              {params.churnRate.toLocaleString('de-DE')} %
            </span>
          </div>
          <input
            id="slider-churn"
            type="range"
            min={PARAM_LIMITS.churnRate.min}
            max={PARAM_LIMITS.churnRate.max}
            step={PARAM_LIMITS.churnRate.step}
            value={params.churnRate}
            onChange={(e) => handleParamChange('churnRate', Number(e.target.value))}
            aria-label="Monatlicher Churn in Prozent"
            className="w-full accent-[#00D9C6] cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[11px] text-text-muted">
            <span>1,0 %</span>
            <span>Basis: 2,8 %</span>
            <span>4,5 %</span>
          </div>
        </div>

        {/* 2. Sales Cycle */}
        <div
          data-testid="slider-group-cycle"
          className="rounded-lg border border-border bg-slate-800/30 p-3.5"
        >
          <div className="mb-1.5 flex justify-between">
            <label htmlFor="slider-cycle" className="text-xs font-semibold text-text">
              Sales Cycle (Dauer)
            </label>
            <span
              data-testid="val-cycle"
              className={cn(
                'text-xs font-bold',
                params.salesCycleDays <= BASELINE_PARAMS.salesCycleDays
                  ? 'text-emerald-400'
                  : 'text-[#FF7A3D]',
              )}
            >
              {params.salesCycleDays} Tage
            </span>
          </div>
          <input
            id="slider-cycle"
            type="range"
            min={PARAM_LIMITS.salesCycleDays.min}
            max={PARAM_LIMITS.salesCycleDays.max}
            step={PARAM_LIMITS.salesCycleDays.step}
            value={params.salesCycleDays}
            onChange={(e) => handleParamChange('salesCycleDays', Number(e.target.value))}
            aria-label="Sales Cycle in Tagen"
            className="w-full accent-[#00D9C6] cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[11px] text-text-muted">
            <span>20 Tage</span>
            <span>Basis: 38 Tage</span>
            <span>60 Tage</span>
          </div>
        </div>

        {/* 3. Marketing-Budget */}
        <div
          data-testid="slider-group-budget"
          className="rounded-lg border border-border bg-slate-800/30 p-3.5"
        >
          <div className="mb-1.5 flex justify-between">
            <label htmlFor="slider-budget" className="text-xs font-semibold text-text">
              Marketing-Budget/Jahr
            </label>
            <span
              data-testid="val-budget"
              className={cn(
                'text-xs font-bold',
                params.marketingBudget >= BASELINE_PARAMS.marketingBudget
                  ? 'text-[#00D9C6]'
                  : 'text-[#FF7A3D]',
              )}
            >
              {params.marketingBudget.toLocaleString('de-DE')} €
            </span>
          </div>
          <input
            id="slider-budget"
            type="range"
            min={PARAM_LIMITS.marketingBudget.min}
            max={PARAM_LIMITS.marketingBudget.max}
            step={PARAM_LIMITS.marketingBudget.step}
            value={params.marketingBudget}
            onChange={(e) => handleParamChange('marketingBudget', Number(e.target.value))}
            aria-label="Marketing-Budget pro Jahr in Euro"
            className="w-full accent-[#00D9C6] cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[11px] text-text-muted">
            <span>30.000 €</span>
            <span>Basis: 65.000 €</span>
            <span>150.000 €</span>
          </div>
        </div>

        {/* 4. Win-Rate */}
        <div
          data-testid="slider-group-winrate"
          className="rounded-lg border border-border bg-slate-800/30 p-3.5"
        >
          <div className="mb-1.5 flex justify-between">
            <label htmlFor="slider-winrate" className="text-xs font-semibold text-text">
              Win-Rate (Konversion)
            </label>
            <span
              data-testid="val-winrate"
              className={cn(
                'text-xs font-bold',
                params.winRate >= BASELINE_PARAMS.winRate ? 'text-emerald-400' : 'text-[#FF7A3D]',
              )}
            >
              {params.winRate.toLocaleString('de-DE')} %
            </span>
          </div>
          <input
            id="slider-winrate"
            type="range"
            min={PARAM_LIMITS.winRate.min}
            max={PARAM_LIMITS.winRate.max}
            step={PARAM_LIMITS.winRate.step}
            value={params.winRate}
            onChange={(e) => handleParamChange('winRate', Number(e.target.value))}
            aria-label="Win-Rate in Prozent"
            className="w-full accent-[#00D9C6] cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[11px] text-text-muted">
            <span>6,0 %</span>
            <span>Basis: 12,0 %</span>
            <span>24,0 %</span>
          </div>
        </div>
      </div>

      {/* Ergebnis-Kacheln (4 Blöcke) */}
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kachel 1: Ziel-ARR */}
        <div
          data-testid="card-target-arr"
          className="rounded-lg border border-[#00D9C6]/30 bg-[#00D9C6]/5 p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#00D9C6]">
            <DollarSign size={16} aria-hidden="true" />
            <span>Ziel-ARR (M12)</span>
          </div>
          <div className="mb-1 text-2xl font-bold text-text">
            {result.targetArr.toLocaleString('de-DE')} €
          </div>
          <div
            className={cn(
              'text-xs font-semibold',
              result.deltaArr >= 0 ? 'text-emerald-400' : 'text-[#FF7A3D]',
            )}
          >
            {result.deltaArr >= 0 ? '+' : ''}
            {result.deltaArr.toLocaleString('de-DE')} € ({result.deltaArr >= 0 ? '+' : ''}
            {result.deltaArrPercent.toLocaleString('de-DE')} %) vs. Plan
          </div>
        </div>

        {/* Kachel 2: Net New ARR */}
        <div
          data-testid="card-net-arr"
          className="rounded-lg border border-border bg-slate-800/40 p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-sky-400">
            <TrendingUp size={16} aria-hidden="true" />
            <span>Net New ARR</span>
          </div>
          <div className="mb-1 text-2xl font-bold text-text">
            {result.netNewArr >= 0 ? '+' : ''}
            {result.netNewArr.toLocaleString('de-DE')} €
          </div>
          <div className="text-xs text-text-muted">
            Neu: +{result.newArrTotal.toLocaleString('de-DE')} € · Churn: -
            {result.churnLossTotal.toLocaleString('de-DE')} €
          </div>
        </div>

        {/* Kachel 3: Kundenbestand */}
        <div
          data-testid="card-customers"
          className="rounded-lg border border-border bg-slate-800/40 p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-purple-400">
            <Users size={16} aria-hidden="true" />
            <span>Kundenbestand (M12)</span>
          </div>
          <div className="mb-1 text-2xl font-bold text-text">{result.finalCustomers} Kunden</div>
          <div className="text-xs text-text-muted">
            +{result.newCustomersTotal} gewonnen · -{result.churnedCustomersTotal} abgewandert
          </div>
        </div>

        {/* Kachel 4: CAC & Payback */}
        <div
          data-testid="card-cac-payback"
          className="rounded-lg border border-border bg-slate-800/40 p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Clock size={16} aria-hidden="true" />
            <span>CAC-Payback</span>
          </div>
          <div className="mb-1 text-2xl font-bold text-text">
            {result.cacPaybackMonths.toLocaleString('de-DE')} Monate
          </div>
          <div className="text-xs text-text-muted">
            Marketing-CAC: {result.cac.toLocaleString('de-DE')} € / Neukunde
          </div>
        </div>
      </div>

      {/* Visualisierungs-Grid: Liniendiagramm links, Tornado rechts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WhatIfProjectionChart data={result.monthlyCurve} />
        <WhatIfTornadoChart items={tornadoItems} />
      </div>
    </section>
  );
};
