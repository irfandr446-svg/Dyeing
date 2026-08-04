import { Feature, TreatmentStep } from '../types';
import { deriveDuration, formatDuration } from './timeUtils';

export interface ProfilePoint {
  x: number; // minutes
  y: number; // °C
}

export interface ProfileSegment {
  step: TreatmentStep;
  feature: Feature | undefined;
  p1: ProfilePoint;
  p2: ProfilePoint;
  newSubpath: boolean; // true = do not connect to previous segment (visual break)
}

export interface ProfileArrow {
  step: TreatmentStep;
  feature: Feature | undefined;
  x: number; // minutes
  yTop: number; // °C at line
  direction: 'up' | 'down';
  color: 'green' | 'orange';
  label: string;
}

export interface ProfileParallelBand {
  step: TreatmentStep;
  feature: Feature | undefined;
  x1: number;
  x2: number;
  label: string;
}

export interface ProfileLabel {
  x: number;
  y: number;
  text: string;
  anchor: 'start' | 'middle' | 'end';
  row: number; // stacking row, 0 = on the line, positive = below/above offsets
}

export interface ProfileGeometry {
  segments: ProfileSegment[];
  arrows: ProfileArrow[];
  bands: ProfileParallelBand[];
  labels: ProfileLabel[];
  totalMinutes: number;
  minTemp: number;
  maxTemp: number;
}

const FLAT_KINDS = new Set([
  'hold', 'run', 'drain', 'inject', 'dose', 'loading', 'circulation',
  'salt_circulation', 'chemical_circulation', 'forward_circulation',
  'reverse_circulation', 'overflow_wash', 'fresh_water_wash', 'rinse',
  'soaping', 'neutralization', 'reduction_cleaning', 'sample_check',
  'operator_call', 'delay', 'wait', 'alarm', 'machine_stop', 'custom',
]);

const GREEN_KINDS = new Set(['fill', 'inject', 'dose', 'loading', 'operator_call']);
const YELLOW_PARALLEL_KINDS = new Set([
  'loading', 'dose', 'circulation', 'salt_circulation', 'chemical_circulation',
  'forward_circulation', 'reverse_circulation',
]);

export function buildProfileGeometry(
  steps: TreatmentStep[],
  featureMap: Record<string, Feature>,
): ProfileGeometry {
  const segments: ProfileSegment[] = [];
  const arrows: ProfileArrow[] = [];
  const bands: ProfileParallelBand[] = [];
  const labels: ProfileLabel[] = [];

  let cursor = 0; // minutes, main sequential timeline
  let currentTemp = 30; // ambient start temperature
  let prevKind: string | null = null;
  let minTemp = currentTemp;
  let maxTemp = currentTemp;
  let rowToggle = 0;

  for (const step of steps) {
    const feature = featureMap[step.featureId];
    const kind = feature?.kind || 'custom';
    const duration = deriveDuration(step);

    if (step.parallel) {
      // Parallel op: dashed band drawn alongside the current position, doesn't move the main cursor.
      const x1 = Math.max(0, cursor - duration);
      const x2 = cursor;
      bands.push({ step, feature, x1, x2, label: feature?.name || 'Parallel Op' });
      continue;
    }

    const x1 = cursor;
    const x2 = cursor + duration;
    let y1 = currentTemp;
    let y2 = currentTemp;
    let newSubpath = prevKind === 'drain' && kind === 'fill';

    if (kind === 'heat' || kind === 'cool') {
      y1 = typeof step.startTemp === 'number' ? step.startTemp : currentTemp;
      y2 = typeof step.endTemp === 'number' ? step.endTemp : y1;
    } else if (kind === 'fill') {
      const fillTemp = typeof step.startTemp === 'number' ? step.startTemp : currentTemp;
      y1 = fillTemp;
      y2 = fillTemp;
    } else if (FLAT_KINDS.has(kind)) {
      const flatTemp = typeof step.startTemp === 'number' ? step.startTemp : currentTemp;
      y1 = flatTemp;
      y2 = flatTemp;
    }

    segments.push({ step, feature, p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, newSubpath });

    minTemp = Math.min(minTemp, y1, y2);
    maxTemp = Math.max(maxTemp, y1, y2);

    // Event arrows (point events layered on top of the line at the segment start)
    if (GREEN_KINDS.has(kind)) {
      arrows.push({ step, feature, x: x1, yTop: y1, direction: 'up', color: 'green', label: feature?.name || '' });
    } else if (kind === 'drain') {
      arrows.push({ step, feature, x: x1, yTop: y1, direction: 'down', color: 'orange', label: feature?.name || 'Drain' });
    }

    // Labels: temp / duration / gradient / feature name, alternating rows to reduce overlap
    const midX = (x1 + x2) / 2;
    const row = rowToggle % 2 === 0 ? 1 : -1;
    rowToggle++;
    const parts: string[] = [];
    if (feature?.name) parts.push(feature.name);
    if (kind === 'heat' || kind === 'cool') {
      if (typeof step.startTemp === 'number' && typeof step.endTemp === 'number') {
        parts.push(`${step.startTemp}°C → ${step.endTemp}°C`);
      }
      if (step.gradient) parts.push(`${step.gradient}°C/min`);
    } else if (typeof step.startTemp === 'number') {
      parts.push(`${step.startTemp}°C`);
    }
    parts.push(formatDuration(duration));
    labels.push({ x: midX, y: y2, text: parts.join(' · '), anchor: 'middle', row });

    currentTemp = y2;
    cursor = x2;
    prevKind = kind;
  }

  if (segments.length === 0) {
    minTemp = 20;
    maxTemp = 100;
  }

  return {
    segments,
    arrows,
    bands,
    labels,
    totalMinutes: cursor,
    minTemp: Math.floor(Math.min(minTemp, 20) / 10) * 10,
    maxTemp: Math.ceil(Math.max(maxTemp, 40) / 10) * 10,
  };
}

export function isYellowParallelKind(kind: string): boolean {
  return YELLOW_PARALLEL_KINDS.has(kind);
}
