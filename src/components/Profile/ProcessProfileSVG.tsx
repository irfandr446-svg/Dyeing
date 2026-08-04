import React, { useMemo } from 'react';
import { Feature, TreatmentStep } from '../../types';
import { buildProfileGeometry, isYellowParallelKind } from '../../utils/profileGeometry';
import { formatDuration } from '../../utils/timeUtils';

interface Props {
  steps: TreatmentStep[];
  featureMap: Record<string, Feature>;
  height?: number;
  compact?: boolean;
  title?: string;
}

const NAVY = '#1e293b';
const GREEN = '#16a34a';
const ORANGE = '#ea580c';
const YELLOW = '#ca8a04';
const AXIS = '#94a3b8';
const LABEL = '#334155';

const PAD_L = 56;
const PAD_R = 24;
const PAD_T = 28;
const PAD_B = 46;

export default function ProcessProfileSVG({ steps, featureMap, height = 420, compact = false, title }: Props) {
  const geo = useMemo(() => buildProfileGeometry(steps, featureMap), [steps, featureMap]);
  const width = Math.max(900, geo.totalMinutes * 6 + PAD_L + PAD_R);

  const plotW = width - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;
  const tRange = Math.max(1, geo.totalMinutes);
  const tempRange = Math.max(10, geo.maxTemp - geo.minTemp);

  const sx = (minutes: number) => PAD_L + (minutes / tRange) * plotW;
  const sy = (temp: number) => PAD_T + plotH - ((temp - geo.minTemp) / tempRange) * plotH;

  if (steps.length === 0) {
    return (
      <div className="profile-empty">
        <svg viewBox={`0 0 900 ${height}`} width="100%" height={height}>
          <rect x={0} y={0} width={900} height={height} fill="#ffffff" />
          <text x={450} y={height / 2} textAnchor="middle" fill="#94a3b8" fontSize={14} fontFamily="Inter, Arial, sans-serif">
            Add process steps to see the live profile
          </text>
        </svg>
      </div>
    );
  }

  // temp axis ticks
  const tempTicks: number[] = [];
  const step = tempRange > 100 ? 20 : 10;
  for (let t = geo.minTemp; t <= geo.maxTemp; t += step) tempTicks.push(t);

  // time axis ticks (every ~20% of duration, rounded to 5 min)
  const timeTickCount = 6;
  const timeTicks: number[] = [];
  for (let i = 0; i <= timeTickCount; i++) {
    timeTicks.push(Math.round((tRange * i) / timeTickCount));
  }

  // Build path "d" strings, breaking at newSubpath boundaries
  const paths: string[] = [];
  let current = '';
  geo.segments.forEach((seg, i) => {
    const x1 = sx(seg.p1.x), y1 = sy(seg.p1.y), x2 = sx(seg.p2.x), y2 = sy(seg.p2.y);
    if (seg.newSubpath || current === '') {
      if (current) paths.push(current);
      current = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else {
      current += ` L ${x2} ${y2}`;
    }
    if (i === geo.segments.length - 1 && current) paths.push(current);
  });

  const arrowSize = 6;

  return (
    <div className="profile-svg-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ background: '#ffffff' }}>
        {title && (
          <text x={PAD_L} y={16} fontSize={12} fontWeight={600} fill={LABEL} fontFamily="Inter, Arial, sans-serif">
            {title}
          </text>
        )}

        {/* axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke={AXIS} strokeWidth={1} />
        <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke={AXIS} strokeWidth={1} />

        {tempTicks.map((t) => (
          <g key={`tt-${t}`}>
            <line x1={PAD_L - 4} y1={sy(t)} x2={PAD_L + plotW} y2={sy(t)} stroke="#f1f5f9" strokeWidth={1} />
            <text x={PAD_L - 8} y={sy(t) + 3} fontSize={9} textAnchor="end" fill={AXIS} fontFamily="Inter, Arial, sans-serif">
              {t}°
            </text>
          </g>
        ))}

        {timeTicks.map((tm) => (
          <g key={`tm-${tm}`}>
            <line x1={sx(tm)} y1={PAD_T + plotH} x2={sx(tm)} y2={PAD_T + plotH + 4} stroke={AXIS} strokeWidth={1} />
            <text x={sx(tm)} y={PAD_T + plotH + 16} fontSize={9} textAnchor="middle" fill={AXIS} fontFamily="Inter, Arial, sans-serif">
              {tm}m
            </text>
          </g>
        ))}

        {/* parallel operation dashed bands */}
        {geo.bands.map((b, i) => {
          const yellow = isYellowParallelKind(b.feature?.kind || '');
          const color = yellow ? YELLOW : GREEN;
          const yBase = PAD_T + plotH;
          const yTop = PAD_T + 10;
          return (
            <g key={`band-${i}`}>
              <line x1={sx(b.x1)} y1={yBase} x2={sx(b.x1)} y2={yTop} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={sx(b.x2)} y1={yBase} x2={sx(b.x2)} y2={yTop} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={sx(b.x1)} y1={yTop} x2={sx(b.x2)} y2={yTop} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={(sx(b.x1) + sx(b.x2)) / 2} y={yTop - 4} fontSize={9} textAnchor="middle" fill={color} fontFamily="Inter, Arial, sans-serif">
                {b.label}
              </text>
            </g>
          );
        })}

        {/* main process line */}
        {paths.map((d, i) => (
          <path key={`seg-${i}`} d={d} fill="none" stroke={NAVY} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* round vertices */}
        {geo.segments.map((seg, i) => (
          <React.Fragment key={`pt-${i}`}>
            <circle cx={sx(seg.p1.x)} cy={sy(seg.p1.y)} r={3} fill="#ffffff" stroke={NAVY} strokeWidth={2} />
            <circle cx={sx(seg.p2.x)} cy={sy(seg.p2.y)} r={3} fill="#ffffff" stroke={NAVY} strokeWidth={2} />
          </React.Fragment>
        ))}

        {/* event arrows — perfectly vertical, straight shafts */}
        {geo.arrows.map((a, i) => {
          const color = a.color === 'green' ? GREEN : ORANGE;
          const xPix = sx(a.x);
          const yLine = sy(a.yTop);
          const yBase = PAD_T + plotH;
          if (a.direction === 'up') {
            return (
              <g key={`arr-${i}`}>
                <line x1={xPix} y1={yBase} x2={xPix} y2={yLine + arrowSize} stroke={color} strokeWidth={2} />
                <polygon
                  points={`${xPix - arrowSize / 1.6},${yLine + arrowSize} ${xPix + arrowSize / 1.6},${yLine + arrowSize} ${xPix},${yLine}`}
                  fill={color}
                />
              </g>
            );
          }
          return (
            <g key={`arr-${i}`}>
              <line x1={xPix} y1={yLine - arrowSize} x2={xPix} y2={yBase} stroke={color} strokeWidth={2} />
              <polygon
                points={`${xPix - arrowSize / 1.6},${yBase - arrowSize} ${xPix + arrowSize / 1.6},${yBase - arrowSize} ${xPix},${yBase}`}
                fill={color}
              />
            </g>
          );
        })}

        {/* Step labels: temperature / duration / gradient / name, offset above/below line */}
        {!compact && geo.segments.map((seg, i) => {
          const l = geo.labels[i];
          if (!l) return null;
          const midXpix = (sx(seg.p1.x) + sx(seg.p2.x)) / 2;
          const midYpix = (sy(seg.p1.y) + sy(seg.p2.y)) / 2;
          const dy = l.row > 0 ? 16 : -10;
          return (
            <text
              key={`stlbl-${i}`}
              x={midXpix}
              y={midYpix + dy}
              fontSize={9.5}
              textAnchor="middle"
              fill={LABEL}
              fontFamily="Inter, Arial, sans-serif"
            >
              {l.text}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export { buildProfileGeometry } from '../../utils/profileGeometry';
