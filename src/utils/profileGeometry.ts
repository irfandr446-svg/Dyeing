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
  newSubpath: boolean; // true = visual break (e.g. after Drain -> Fill)
  isDiagonal: boolean; // heat/cool ramp
  tickLabel: string; // small gray label centered above the segment (duration, or gradient for ramps)
}

export interface ProfileArrow {
  step: TreatmentStep;
  feature: Feature | undefined;
  x: number; // minutes
  lineY: number; // °C where the arrow meets the main line
  direction: 'up' | 'down';
  color: 'green' | 'orange';
  label: string;
}

/** Parallel operation shown as a dashed diagonal ramp from the baseline up to the main line. */
export interface ProfileParallelRamp {
  step: TreatmentStep;
  feature: Feature | undefined;
  x1: number;
  x2: number;
  lineY: number; // main-line temp at x2, where the ramp arrives
  durationLabel: string;
  nameLabel: string;
}

export interface ProfileCornerLabel {
  x: number;
  temp: number;
}

export interface ProfileGeometry {
  segments: ProfileSegment[];
  arrows: ProfileArrow[];
  ramps: ProfileParallelRamp[];
  corners: ProfileCornerLabel[];
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

export function isYellowParallelKind(kind: string): boolean {
  return YELLOW_PARALLEL_KINDS.has(kind);
}

export function buildProfileGeometry(
  steps: TreatmentStep[],
  featureMap: Record<string, Feature>,
): ProfileGeometry {
  const segments: ProfileSegment[] = [];
  const arrows: ProfileArrow[] = [];
  const ramps: ProfileParallelRamp[] = [];
  const corners: ProfileCornerLabel[] = [];

  let cursor = 0;
  let currentTemp = 30;
  let prevKind: string | null = null;
  let lastCornerTemp: number | null = null;
  let minTemp = currentTemp;
  let maxTemp = currentTemp;

  const pushCorner = (x: number, temp: number) => {
    if (lastCornerTemp === null || Math.round(temp) !== Math.round(lastCornerTemp)) {
      corners.push({ x, temp });
      lastCornerTemp = temp;
    }
  };

  pushCorner(0, currentTemp);

  for (const step of steps) {
    const feature = featureMap[step.featureId];
    const kind = feature?.kind || 'custom';
    const duration = deriveDuration(step);

    if (step.parallel) {
      const x1 = Math.max(0, cursor - duration);
      const x2 = cursor;
      ramps.push({
        step, feature, x1, x2, lineY: currentTemp,
        durationLabel: formatDuration(duration),
        nameLabel: step.label || feature?.name || 'Parallel Op',
      });
      continue;
    }

    const x1 = cursor;
    const x2 = cursor + duration;
    let y1 = currentTemp;
    let y2 = currentTemp;
    const isDiagonal = kind === 'heat' || kind === 'cool';
    const newSubpath = prevKind === 'drain' && kind === 'fill';

    if (isDiagonal) {
      y1 = typeof step.startTemp === 'number' ? step.startTemp : currentTemp;
      y2 = typeof step.endTemp === 'number' ? step.endTemp : y1;
    } else if (kind === 'fill') {
      const fillTemp = typeof step.startTemp === 'number' ? step.startTemp : currentTemp;
      y1 = fillTemp; y2 = fillTemp;
    } else if (FLAT_KINDS.has(kind)) {
      const flatTemp = typeof step.startTemp === 'number' ? step.startTemp : currentTemp;
      y1 = flatTemp; y2 = flatTemp;
    }

    const tickLabel = isDiagonal
      ? (step.gradient ? `${step.gradient}°C/min` : formatDuration(duration))
      : formatDuration(duration);

    segments.push({ step, feature, p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, newSubpath, isDiagonal, tickLabel });

    minTemp = Math.min(minTemp, y1, y2);
    maxTemp = Math.max(maxTemp, y1, y2);

    if (GREEN_KINDS.has(kind)) {
      arrows.push({ step, feature, x: x1, lineY: y1, direction: 'up', color: 'green', label: step.label || feature?.name || '' });
    } else if (kind === 'drain') {
      arrows.push({ step, feature, x: x1, lineY: y1, direction: 'down', color: 'orange', label: step.label || feature?.name || 'Drain' });
    }

    if (newSubpath) pushCorner(x1, y1);
    if (isDiagonal) pushCorner(x2, y2);

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
    ramps,
    corners,
    totalMinutes: cursor,
    minTemp: Math.floor(Math.min(minTemp, 20) / 10) * 10,
    maxTemp: Math.ceil(Math.max(maxTemp, 40) / 10) * 10,
  };
}
