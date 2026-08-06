// ---------------------------------------------------------------------------
// Style Textile — Process & Machine R&D
// Core domain types for the Treatment / Program profile manager
// ---------------------------------------------------------------------------

export interface Plant {
  id: string;
  name: string;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

/** The behavioural "kind" of a feature. Drives which fields + arrow style are used. */
export type FeatureKind =
  | 'fill'
  | 'drain'
  | 'heat'
  | 'cool'
  | 'hold'
  | 'run'
  | 'inject'
  | 'dose'
  | 'loading'
  | 'circulation'
  | 'salt_circulation'
  | 'chemical_circulation'
  | 'forward_circulation'
  | 'reverse_circulation'
  | 'overflow_wash'
  | 'fresh_water_wash'
  | 'rinse'
  | 'soaping'
  | 'neutralization'
  | 'reduction_cleaning'
  | 'sample_check'
  | 'operator_call'
  | 'delay'
  | 'wait'
  | 'alarm'
  | 'machine_stop'
  | 'custom';

export interface Feature {
  id: string;
  name: string;
  kind: FeatureKind;
  icon: string; // lucide-react icon name
  color: string; // hex
  isCustom: boolean;
  order: number;
}

/** A single step placed on a Treatment's timeline. */
export interface TreatmentStep {
  id: string;
  featureId: string;
  durationMinutes: number;

  /** Optional override for the feature's default name, shown on the profile and step list. */
  label?: string;

  // Temperature related (heat / cool / hold / run / fill)
  startTemp?: number;
  endTemp?: number;
  gradient?: number; // °C / min

  // Fill related
  fillType?: string; // Cold / Warm / Hot / Fresh / Soft

  // Inject / Dose related
  chemicalName?: string;

  // Parallel operation (loading / dosing / circulation running alongside main process)
  parallel?: boolean;

  notes?: string;
}

export interface Treatment {
  id: string;
  number: string;
  name: string;
  plantId: string;
  categoryId: string;
  description: string;
  steps: TreatmentStep[];
  totalDurationMinutes: number;
  /** Total water consumption in L/kg, shown on the profile card + export, matching mill process-sheet convention. */
  totalWaterLKg?: number;
  /** Free-text applicability note shown as a small badge on the profile, e.g. "For P-1 & P-2". */
  applicabilityNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramEntry {
  id: string;
  treatmentId: string;
  order: number;
  delayBeforeMinutes: number;
  notes?: string;
}

export interface Program {
  id: string;
  number: string;
  name: string;
  plantId: string;
  entries: ProgramEntry[];
  totalDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface CalculatedStep extends TreatmentStep {
  startTime: number;
  endTime: number;
  x: number; // px cumulative
}
