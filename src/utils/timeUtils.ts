import { CalculatedStep, Program, Treatment, TreatmentStep } from '../types';

/** Format minutes as "1h 25min" / "45 min". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}min`;
}

/** For heat/cool steps, derive duration from |endTemp-startTemp| / gradient when possible. */
export function deriveDuration(step: TreatmentStep): number {
  if (
    (step.gradient && step.gradient > 0) &&
    typeof step.startTemp === 'number' &&
    typeof step.endTemp === 'number'
  ) {
    const delta = Math.abs(step.endTemp - step.startTemp);
    const derived = delta / step.gradient;
    if (derived > 0) return Math.round(derived * 10) / 10;
  }
  return step.durationMinutes || 0;
}

/** Attach start/end offsets (minutes) to each step, skipping parallel steps in the main timeline. */
export function calculateStepTimes(steps: TreatmentStep[]): CalculatedStep[] {
  let cursor = 0;
  return steps.map((step) => {
    const duration = deriveDuration(step);
    const startTime = step.parallel ? Math.max(0, cursor - duration) : cursor;
    const endTime = step.parallel ? cursor : cursor + duration;
    if (!step.parallel) cursor += duration;
    return { ...step, durationMinutes: duration, startTime, endTime, x: 0 };
  });
}

export function calculateTreatmentTotal(steps: TreatmentStep[]): number {
  return steps
    .filter((s) => !s.parallel)
    .reduce((sum, s) => sum + deriveDuration(s), 0);
}

export function calculateProgramTotal(program: Program, treatments: Record<string, Treatment>): number {
  return program.entries.reduce((sum, entry) => {
    const t = treatments[entry.treatmentId];
    const treatmentTime = t ? t.totalDurationMinutes : 0;
    return sum + entry.delayBeforeMinutes + treatmentTime;
  }, 0);
}
