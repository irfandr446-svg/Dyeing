import { Category, Feature, FeatureKind, Plant, Treatment, TreatmentStep } from '../types';

export const defaultPlants: Plant[] = [
  { id: 'plant-1', name: 'Plant 1', order: 0 },
  { id: 'plant-2', name: 'Plant 2', order: 1 },
  { id: 'plant-3', name: 'Plant 3', order: 2 },
  { id: 'plant-4', name: 'Plant 4', order: 3 },
  { id: 'plant-5', name: 'Plant 5', order: 4 },
];

export const defaultCategories: Category[] = [
  { id: 'cat-pretreatment', name: 'Pretreatment', order: 0 },
  { id: 'cat-cotton', name: 'Cotton Dyeing', order: 1 },
  { id: 'cat-polyester', name: 'Polyester Dyeing', order: 2 },
  { id: 'cat-reduction', name: 'Reduction Cleaning', order: 3 },
  { id: 'cat-washing', name: 'Washing', order: 4 },
  { id: 'cat-finishing', name: 'Finishing', order: 5 },
];

interface DefaultFeatureSeed {
  name: string;
  kind: FeatureKind;
  icon: string;
  color: string;
}

const seeds: DefaultFeatureSeed[] = [
  { name: 'Fill', kind: 'fill', icon: 'Droplet', color: '#16a34a' },
  { name: 'Drain', kind: 'drain', icon: 'ArrowDownToLine', color: '#ea580c' },
  { name: 'Heat', kind: 'heat', icon: 'Flame', color: '#dc2626' },
  { name: 'Cool', kind: 'cool', icon: 'Snowflake', color: '#0284c7' },
  { name: 'Hold', kind: 'hold', icon: 'Pause', color: '#334155' },
  { name: 'Run', kind: 'run', icon: 'Play', color: '#334155' },
  { name: 'Inject', kind: 'inject', icon: 'Syringe', color: '#16a34a' },
  { name: 'Dose', kind: 'dose', icon: 'Beaker', color: '#16a34a' },
  { name: 'Loading', kind: 'loading', icon: 'PackagePlus', color: '#16a34a' },
  { name: 'Circulation', kind: 'circulation', icon: 'RefreshCw', color: '#ca8a04' },
  { name: 'Salt Circulation', kind: 'salt_circulation', icon: 'RefreshCw', color: '#ca8a04' },
  { name: 'Chemical Circulation', kind: 'chemical_circulation', icon: 'FlaskConical', color: '#ca8a04' },
  { name: 'Forward Circulation', kind: 'forward_circulation', icon: 'RotateCw', color: '#ca8a04' },
  { name: 'Reverse Circulation', kind: 'reverse_circulation', icon: 'RotateCcw', color: '#ca8a04' },
  { name: 'Overflow Wash', kind: 'overflow_wash', icon: 'Waves', color: '#0891b2' },
  { name: 'Fresh Water Wash', kind: 'fresh_water_wash', icon: 'Droplets', color: '#0891b2' },
  { name: 'Rinse', kind: 'rinse', icon: 'ShowerHead', color: '#0891b2' },
  { name: 'Soaping', kind: 'soaping', icon: 'Sparkles', color: '#0891b2' },
  { name: 'Neutralization', kind: 'neutralization', icon: 'Scale', color: '#7c3aed' },
  { name: 'Reduction Cleaning', kind: 'reduction_cleaning', icon: 'Brush', color: '#7c3aed' },
  { name: 'Sample Check', kind: 'sample_check', icon: 'TestTube', color: '#334155' },
  { name: 'Operator Call', kind: 'operator_call', icon: 'UserCheck', color: '#16a34a' },
  { name: 'Delay', kind: 'delay', icon: 'Clock', color: '#64748b' },
  { name: 'Wait', kind: 'wait', icon: 'Hourglass', color: '#64748b' },
  { name: 'Alarm', kind: 'alarm', icon: 'Bell', color: '#dc2626' },
  { name: 'Machine Stop', kind: 'machine_stop', icon: 'Octagon', color: '#dc2626' },
];

export const defaultFeatures: Feature[] = seeds.map((s, i) => ({
  id: `feature-${s.kind}`,
  name: s.name,
  kind: s.kind,
  icon: s.icon,
  color: s.color,
  isCustom: false,
  order: i,
}));

// ---------------------------------------------------------------------------
// Example Treatments — seeded once (only if the Treatments collection is
// completely empty) so the app ships with real, editable process profiles
// matching the mill's process-sheet format. Fully editable afterwards like
// any other Treatment.
// ---------------------------------------------------------------------------

function step(featureKind: FeatureKind, partial: Partial<TreatmentStep> & { durationMinutes: number }): TreatmentStep {
  const feature = defaultFeatures.find((f) => f.kind === featureKind);
  return {
    id: `seed-${featureKind}-${Math.random().toString(36).slice(2, 8)}`,
    featureId: feature?.id || 'feature-hold',
    ...partial,
  };
}

export function buildExampleTreatments(plantId: string, categoryId: string): Treatment[] {
  const now = new Date().toISOString();

  const polyesterDyeing: Treatment = {
    id: 'seed-treatment-polyester-dyeing-srt',
    number: 'TR-101',
    name: 'Polyester Dyeing (SRT)',
    plantId,
    categoryId,
    description: 'Standard 100% polyester disperse dyeing cycle with fabric loading and dye dosing.',
    totalWaterLKg: 5,
    applicabilityNote: 'For P-1 & P-2',
    steps: [
      step('drain', { label: 'Drain (Cold)', durationMinutes: 2 }),
      step('fill', { label: 'ST to MC Dry Fill', startTemp: 50, endTemp: 50, durationMinutes: 5 }),
      step('operator_call', { label: 'PH Call', durationMinutes: 2 }),
      step('inject', { label: 'Inj AT2 (PNR/Soft Water)', durationMinutes: 5 }),
      step('inject', { label: 'Inj AT2 (Poly Levellers)', durationMinutes: 5 }),
      step('loading', { label: 'Fabric Load', durationMinutes: 5 }),
      step('dose', { label: 'AT1 Dosing (Dyes)', durationMinutes: 8 }),
      step('heat', { startTemp: 50, endTemp: 80, gradient: 1.2, durationMinutes: 25 }),
      step('hold', { startTemp: 80, durationMinutes: 10 }),
      step('heat', { startTemp: 80, endTemp: 135, gradient: 1.2, durationMinutes: 46 }),
      step('hold', { startTemp: 135, durationMinutes: 45 }),
      step('cool', { startTemp: 135, endTemp: 105, gradient: 0.8, durationMinutes: 38 }),
      step('hold', { startTemp: 105, durationMinutes: 2 }),
      step('cool', { startTemp: 105, endTemp: 65, gradient: 0.8, durationMinutes: 50 }),
      step('drain', { label: 'Drain (Hot)', durationMinutes: 2 }),
    ],
    totalDurationMinutes: 0,
    createdAt: now,
    updatedAt: now,
  };

  const fastWashingLT: Treatment = {
    id: 'seed-treatment-fast-washing-lt-srt',
    number: 'TR-102',
    name: 'Fast Washing LT (SRT)',
    plantId,
    categoryId,
    description: 'Light-shade post-dyeing wash cycle: reactive/polyester washing profile.',
    totalWaterLKg: 15.2,
    applicabilityNote: 'For P-1 & P-2',
    steps: [
      step('fill', { label: 'Recall LR (3.2) Warm', startTemp: 60, endTemp: 60, durationMinutes: 3 }),
      step('hold', { label: 'Aqua 4 L/kg @60°C', startTemp: 60, durationMinutes: 10 }),
      step('heat', { startTemp: 60, endTemp: 90, gradient: 2, durationMinutes: 15 }),
      step('operator_call', { label: 'PH Call', durationMinutes: 8 }),
      step('inject', { label: 'Inj AT2 (Acetic Acid)', durationMinutes: 2 }),
      step('inject', { label: 'Inj AT2 (MUFC)', durationMinutes: 2 }),
      step('cool', { startTemp: 90, endTemp: 40, gradient: 2, durationMinutes: 25 }),
      step('hold', { label: 'Aqua 8 L/kg @40°C', startTemp: 40, durationMinutes: 5 }),
      step('operator_call', { label: 'Sample Call', durationMinutes: 5 }),
      step('drain', { label: 'Drain (Cold)', durationMinutes: 2 }),
    ],
    totalDurationMinutes: 0,
    createdAt: now,
    updatedAt: now,
  };

  return [polyesterDyeing, fastWashingLT];
}
