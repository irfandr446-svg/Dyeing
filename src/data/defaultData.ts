import { Category, Feature, FeatureKind, Plant } from '../types';

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
