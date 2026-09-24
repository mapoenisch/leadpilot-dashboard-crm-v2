import { ChannelMix, ParameterDefinition } from '../types/parameter';
import { ScenarioParameters } from '../types/scenario';

export const V1_PARAMETER_DEFINITIONS: {
  [K in keyof ScenarioParameters]: ParameterDefinition<ScenarioParameters[K]>;
} = {
  marketingBudgetYearly: {
    id: 'marketingBudgetYearly',
    label: 'Marketing-Budget (jährlich)',
    description: 'Jährliches Gesamt-Marketingbudget für Neukundenakquise',
    type: 'number',
    unit: '€/Jahr',
    defaultValue: 65000,
    min: 30000,
    max: 150000,
    step: 5000,
    userAdjustable: true,
  },
  channelMix: {
    id: 'channelMix',
    label: 'Kanal-Mix',
    description: 'Prozentuale Verteilung des Marketingbudgets auf 5 Inbound- und Outbound-Kanäle',
    type: 'object',
    unit: '%',
    defaultValue: {
      linkedIn: 38,
      seo: 22,
      partner: 18,
      webinar: 12,
      outbound: 10,
    },
    userAdjustable: true,
  },
  trialToPaidConversion: {
    id: 'trialToPaidConversion',
    label: 'Trial-to-Paid Konvertierungsrate',
    description: 'Prozentsatz der Testnutzer, die in zahlende Kunden konvertieren',
    type: 'percentage',
    unit: '%',
    defaultValue: 18,
    min: 10,
    max: 40,
    step: 1,
    userAdjustable: true,
  },
  salesRepCount: {
    id: 'salesRepCount',
    label: 'Sales-Kapazität (FTE)',
    description: 'Anzahl der Vollzeitäquivalente im Vertrieb',
    type: 'number',
    unit: 'FTE',
    defaultValue: 2,
    min: 2,
    max: 10,
    step: 1,
    userAdjustable: true,
  },
  csRepCount: {
    id: 'csRepCount',
    label: 'Customer-Success-Kapazität (FTE)',
    description: 'Anzahl der Vollzeitäquivalente im Customer Success',
    type: 'number',
    unit: 'FTE',
    defaultValue: 2,
    min: 2,
    max: 10,
    step: 1,
    userAdjustable: true,
  },
  churnRateMonthly: {
    id: 'churnRateMonthly',
    label: 'Ziel-Churn (monatlich)',
    description:
      'Monatliche Kundenabwanderungsquote in Prozent (Verbindlicher Bereich: 0,5 - 5,0 %/Monat)',
    type: 'percentage',
    unit: '% / Monat',
    defaultValue: 2.8,
    min: 0.5,
    max: 5.0, // BINDING REGISTRY MAX VALUE!
    step: 0.1,
    userAdjustable: true,
  },
  salesCycleDays: {
    id: 'salesCycleDays',
    label: 'Sales Cycle',
    description: 'Durchschnittliche Dauer des Vertriebszyklus in Tagen',
    type: 'number',
    unit: 'Tage',
    defaultValue: 38,
    min: 14,
    max: 120,
    step: 1,
    userAdjustable: true,
  },
  targetPackageFocus: {
    id: 'targetPackageFocus',
    label: 'Ziel-Paketfokus',
    description: 'Schwerpunkt der vertrieblichen Positionierung',
    type: 'enum',
    unit: '',
    defaultValue: 'Balanced',
    enumValues: ['Starter', 'Growth', 'Pro', 'Balanced'],
    userAdjustable: true,
  },
  winProbabilityMultiplier: {
    id: 'winProbabilityMultiplier',
    label: 'Gewinnwahrscheinlichkeits-Multiplikator',
    description: 'Multiplikator für Abschlusswahrscheinlichkeiten im Funnel',
    type: 'number',
    unit: 'x',
    defaultValue: 1.0,
    min: 0.5,
    max: 2.0,
    step: 0.1,
    userAdjustable: true,
  },
  discountPercent: {
    id: 'discountPercent',
    label: 'Rabattquote',
    description: 'Durchschnittlich gewährter Rabatt auf Listenpreise in Prozent',
    type: 'percentage',
    unit: '%',
    defaultValue: 0,
    min: 0,
    max: 50,
    step: 1,
    userAdjustable: true,
  },
};

export class ParameterRegistry {
  private static instance: ParameterRegistry;

  public static getInstance(): ParameterRegistry {
    if (!ParameterRegistry.instance) {
      ParameterRegistry.instance = new ParameterRegistry();
    }
    return ParameterRegistry.instance;
  }

  public getAllDefinitions(): ParameterDefinition[] {
    return Object.values(V1_PARAMETER_DEFINITIONS);
  }

  public getDefinition(id: keyof ScenarioParameters): ParameterDefinition | null {
    return V1_PARAMETER_DEFINITIONS[id] || null;
  }

  public getDefaultParameters(): ScenarioParameters {
    return {
      marketingBudgetYearly: V1_PARAMETER_DEFINITIONS.marketingBudgetYearly.defaultValue,
      channelMix: JSON.parse(JSON.stringify(V1_PARAMETER_DEFINITIONS.channelMix.defaultValue)),
      trialToPaidConversion: V1_PARAMETER_DEFINITIONS.trialToPaidConversion.defaultValue,
      salesRepCount: V1_PARAMETER_DEFINITIONS.salesRepCount.defaultValue,
      csRepCount: V1_PARAMETER_DEFINITIONS.csRepCount.defaultValue,
      churnRateMonthly: V1_PARAMETER_DEFINITIONS.churnRateMonthly.defaultValue,
      salesCycleDays: V1_PARAMETER_DEFINITIONS.salesCycleDays.defaultValue,
      targetPackageFocus: V1_PARAMETER_DEFINITIONS.targetPackageFocus.defaultValue,
      winProbabilityMultiplier: V1_PARAMETER_DEFINITIONS.winProbabilityMultiplier.defaultValue,
      discountPercent: V1_PARAMETER_DEFINITIONS.discountPercent.defaultValue,
    };
  }

  /**
   * Normalizes channel mix so that the 5 channel percentages sum up to exactly 100%.
   * Preserves proportional relationships. Throws error if any channel is invalid/negative or sum <= 0.
   */
  public normalizeChannelMix(inputMix: unknown): { mix: ChannelMix; normalized: boolean } {
    if (!inputMix || typeof inputMix !== 'object') {
      throw new Error('Kanal-Mix muss ein valides Objekt mit den 5 Kanälen sein.');
    }
    const rawMix = inputMix as Record<keyof ChannelMix, unknown>;

    const requiredKeys: (keyof ChannelMix)[] = [
      'linkedIn',
      'seo',
      'partner',
      'webinar',
      'outbound',
    ];
    const numericMix = {} as Record<keyof ChannelMix, number>;
    for (const key of requiredKeys) {
      const raw = rawMix[key];
      if (typeof raw !== 'number' || isNaN(raw) || raw < 0) {
        throw new Error(`Kanal "${key}" ist ungültig oder negativ (${raw}).`);
      }
      numericMix[key] = raw;
    }

    const currentSum = requiredKeys.reduce((sum, k) => sum + numericMix[k], 0);
    if (currentSum <= 0) {
      throw new Error('Die Gesamtsumme der Kanalanteile muss größer als 0 % sein.');
    }

    const isAlready100 = Math.abs(currentSum - 100) <= 0.01;
    if (isAlready100) {
      return {
        mix: {
          linkedIn: Number(numericMix.linkedIn.toFixed(2)),
          seo: Number(numericMix.seo.toFixed(2)),
          partner: Number(numericMix.partner.toFixed(2)),
          webinar: Number(numericMix.webinar.toFixed(2)),
          outbound: Number(numericMix.outbound.toFixed(2)),
        },
        normalized: false,
      };
    }

    // Proportional normalization to 100%
    const factor = 100 / currentSum;
    const rawNormalized = {
      linkedIn: Number((numericMix.linkedIn * factor).toFixed(2)),
      seo: Number((numericMix.seo * factor).toFixed(2)),
      partner: Number((numericMix.partner * factor).toFixed(2)),
      webinar: Number((numericMix.webinar * factor).toFixed(2)),
      outbound: Number((numericMix.outbound * factor).toFixed(2)),
    };

    // Adjust last channel to guarantee exact 100.00% sum
    const normSum =
      rawNormalized.linkedIn +
      rawNormalized.seo +
      rawNormalized.partner +
      rawNormalized.webinar +
      rawNormalized.outbound;
    const diff = Number((100 - normSum).toFixed(2));
    rawNormalized.outbound = Number((rawNormalized.outbound + diff).toFixed(2));

    return { mix: rawNormalized, normalized: true };
  }

  /**
   * Validates a single parameter value against its definition.
   */
  public validateSingleParameter(id: keyof ScenarioParameters, value: unknown): string | null {
    const def = this.getDefinition(id);
    if (!def) {
      return `Unbekannter Parameter: "${id}".`;
    }

    if (value === undefined || value === null) {
      return `Pflichtparameter "${def.label}" (${id}) fehlt.`;
    }

    if (def.type === 'number' || def.type === 'percentage') {
      if (typeof value !== 'number' || isNaN(value)) {
        return `Parameter "${def.label}" muss eine Zahl sein. Empfangen: ${typeof value}.`;
      }
      if (def.min !== undefined && value < def.min) {
        return `Wert für "${def.label}" (${value} ${def.unit}) liegt unter dem Minimum (${def.min} ${def.unit}).`;
      }
      if (def.max !== undefined && value > def.max) {
        return `Wert für "${def.label}" (${value} ${def.unit}) liegt über dem Maximum (${def.max} ${def.unit}).`;
      }
    } else if (def.type === 'enum') {
      if (!def.enumValues?.includes(value)) {
        return `Ungültiger Wert "${value}" für "${def.label}". Erlaubt: ${def.enumValues?.join(', ')}.`;
      }
    } else if (def.type === 'object' && id === 'channelMix') {
      try {
        this.normalizeChannelMix(value);
      } catch (err) {
        const message = err instanceof Error ? err.message : (err as { message: string }).message;
        return `Ungültiger Kanal-Mix: ${message}`;
      }
    }

    return null;
  }

  /**
   * Validates and normalizes full ScenarioParameters set against Registry.
   */
  public validateAllParameters(params: unknown): {
    valid: boolean;
    errors: string[];
    normalizedParams: ScenarioParameters;
  } {
    const errors: string[] = [];
    const defaults = this.getDefaultParameters();

    if (!params || typeof params !== 'object') {
      return {
        valid: false,
        errors: ['Parametersatz muss ein gültiges Objekt sein.'],
        normalizedParams: defaults,
      };
    }
    const input = params as Record<string, unknown>;

    const keys: (keyof ScenarioParameters)[] = Object.keys(
      V1_PARAMETER_DEFINITIONS,
    ) as (keyof ScenarioParameters)[];
    const resultParams: Record<string, unknown> = { ...input };

    for (const key of keys) {
      const err = this.validateSingleParameter(key, input[key]);
      if (err) {
        errors.push(err);
      }
    }

    // Attempt channel mix normalization if channelMix object is present
    if (input.channelMix) {
      try {
        const { mix } = this.normalizeChannelMix(input.channelMix);
        resultParams.channelMix = mix;
      } catch {
        // Error already captured by validateSingleParameter
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      normalizedParams: resultParams as unknown as ScenarioParameters,
    };
  }
}

export const parameterRegistry = ParameterRegistry.getInstance();
