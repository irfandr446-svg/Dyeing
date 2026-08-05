import { Feature, TreatmentStep } from '../types';
import { deriveDuration, formatDuration } from './timeUtils';

export interface ProfilePoint {
  x: number; // layout units (px for on-screen SVG, mm for PDF) — NOT minutes
  y: number; // °C
}

export interface ProfileSegment {
  step: TreatmentStep;
  feature: Feature | undefined;
  p1: ProfilePoint;
  p2: ProfilePoint;
  newSubpath: boolean; // true = visual break (e.g. after Drain -> Fill)
  isDiagonal: boolean; // heat/cool ramp
  durationMinutes: number;
  tickLabel: string | null; // small gray label centered above the segment; null if merged into a corner label
}

export interface ProfileArrow {
  step: TreatmentStep;
  feature: Feature | undefined;
  x: number;
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
  text: string;
}

export interface ProfileGeometry {
  segments: ProfileSegment[];
  arrows: ProfileArrow[];
  ramps: ProfileParallelRamp[];
  corners: ProfileCornerLabel[];
  totalUnits: number;
  minTemp: number;
  maxTemp: number;
}

export interface ScaleOptions {
  /** Layout units per minute of process time (base proportional scale). */
  unitPerMinute: number;
  /** Minimum width given to any flat (non-ramp) segment, so short steps stay legible. */
  minFlatUnit: number;
  /** Minimum width given to a heat/cool ramp segment. */
  minRampUnit: number;
  /** Fixed visual gap inserted after a Drain -> Fill break. */
  gapUnit: number;
}

/** Default scale for the full-size on-screen SVG profile (units = px). */
export const SVG_SCALE: ScaleOptions = { unitPerMinute: 4.4, minFlatUnit: 58, minRampUnit: 130, gapUnit: 56 };
/** Smaller scale for compact previews (Program combined view). */
export const SVG_COMPACT_SCALE: ScaleOptions = { unitPerMinute: 2.6, minFlatUnit: 34, minRampUnit: 76, gapUnit: 32 };
/** Scale for PDF export (units = mm). */
export const PDF_SCALE: ScaleOptions = { unitPerMinute: 0.62, minFlatUnit: 9, minRampUnit: 20, gapUnit: 8 };

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

interface RawSegment {
  step: TreatmentStep;
  feature: Feature | undefined;
  p1: ProfilePoint;
  p2: ProfilePoint;
  newSubpath: boolean;
  isDiagonal: boolean;
  durationMinutes: number;
  gradientText: string | null;
}

export function buildProfileGeometry(
  steps: TreatmentStep[],
  featureMap: Record<string, Feature>,
  scale: ScaleOptions = SVG_SCALE,
): ProfileGeometry {
  const raw: RawSegment[] = [];
  const arrows: ProfileArrow[] = [];
  const ramps: ProfileParallelRamp[] = [];

  let cursor = 0;
  let currentTemp = 30;
  let prevKind: string | null = null;
  let minTemp = currentTemp;
  let maxTemp = currentTemp;

  for (const step of steps) {
    const feature = featureMap[step.featureId];
    const kind = feature?.kind || 'custom';
    const durationMinutes = deriveDuration(step);
    const isDiagonal = kind === 'heat' || kind === 'cool';

    if (step.parallel) {
      const width = Math.max(durationMinutes * scale.unitPerMinute, scale.minFlatUnit);
      const x2 = cursor;
      const x1 = Math.max(0, cursor - width);
      ramps.push({
        step, feature, x1, x2, lineY: currentTemp,
        durationLabel: formatDuration(durationMinutes),
        nameLabel: step.label || feature?.name || 'Parallel Op',
      });
      continue;
    }

    const newSubpath = prevKind === 'drain' && kind === 'fill';
    if (newSubpath) cursor += scale.gapUnit;

    const width = Math.max(durationMinutes * scale.unitPerMinute, isDiagonal ? scale.minRampUnit : scale.minFlatUnit);
    const x1 = cursor;
    const x2 = cursor + width;

    let y1 = currentTemp;
    let y2 = currentTemp;
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

    raw.push({
      step, feature, p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, newSubpath, isDiagonal, durationMinutes,
      gradientText: isDiagonal && step.gradient ? `${step.gradient}°C/min` : null,
    });

    minTemp = Math.min(minTemp, y1, y2);
    maxTemp = Math.max(maxTemp, y1, y2);

    if (GREEN_KINDS.has(kind)) {
      arrows.push({ step, feature, x: x1, lineY: y1, direction: 'up', color: 'green', label: step.label || feature?.name || '' });
    } else if (kind === 'drain') {
      arrows.push({ step, feature, x: x1, lineY: y1, direction: 'down', color: 'orange', label: step.label || feature?.name || 'Drain' });
    }

    currentTemp = y2;
    cursor = x2;
    prevKind = kind;
  }

  // ---- Phase 2: derive corner (bold temp) labels + decide which flat segments
  // get their own small duration tick vs. get merged into a "temp · duration" corner label.
  const corners: ProfileCornerLabel[] = [];
  const suppressTick = new Set<number>();

  raw.forEach((seg, i) => {
    const isSubpathStart = i === 0 || seg.newSubpath;
    if (i === 0) {
      corners.push({ x: seg.p1.x, temp: seg.p1.y, text: `${Math.round(seg.p1.y)}°C` });
    }

    if (seg.isDiagonal) {
      const next = raw[i + 1];
      const afterNext = raw[i + 2];
      const singleHoldFollows = next && !next.isDiagonal && !next.newSubpath
        && (!afterNext || afterNext.isDiagonal || afterNext.newSubpath);
      if (singleHoldFollows) {
        corners.push({ x: seg.p2.x, temp: seg.p2.y, text: `${Math.round(seg.p2.y)}°C · ${formatDuration(next.durationMinutes)}` });
        suppressTick.add(i + 1);
      } else {
        corners.push({ x: seg.p2.x, temp: seg.p2.y, text: `${Math.round(seg.p2.y)}°C` });
      }
    }
  });

  const segments: ProfileSegment[] = raw.map((seg, i) => ({
    step: seg.step,
    feature: seg.feature,
    p1: seg.p1,
    p2: seg.p2,
    newSubpath: seg.newSubpath,
    isDiagonal: seg.isDiagonal,
    durationMinutes: seg.durationMinutes,
    tickLabel: suppressTick.has(i) ? null : (seg.gradientText || formatDuration(seg.durationMinutes)),
  }));

  if (segments.length === 0) {
    minTemp = 20;
    maxTemp = 100;
  }

  return {
    segments,
    arrows,
    ramps,
    corners,
    totalUnits: cursor,
    minTemp: Math.floor(Math.min(minTemp, 20) / 10) * 10,
    maxTemp: Math.ceil(Math.max(maxTemp, 40) / 10) * 10,
  };
}
