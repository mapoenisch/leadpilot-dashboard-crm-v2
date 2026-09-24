export type ParameterType = 'number' | 'percentage' | 'enum' | 'object';

export interface ChannelMix {
  linkedIn: number; // percentage (0-100)
  seo: number; // percentage (0-100)
  partner: number; // percentage (0-100)
  webinar: number; // percentage (0-100)
  outbound: number; // percentage (0-100)
}

export interface ParameterDefinition<T = unknown> {
  id: string;
  label: string;
  description: string;
  type: ParameterType;
  unit: string;
  defaultValue: T;
  min?: number;
  max?: number;
  step?: number;
  enumValues?: readonly T[];
  userAdjustable: boolean;
}

export interface PreflightIssue {
  code: string;
  parameterId?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PreflightResult {
  valid: boolean;
  errors: PreflightIssue[];
  warnings: PreflightIssue[];
}
