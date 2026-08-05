import React, { useMemo } from 'react';
import { Feature, TreatmentStep } from '../../types';
import { buildProfileGeometry, isYellowParallelKind } from '../../utils/profileGeometry';

interface Props {
  steps: TreatmentStep[];
  featureMap: Record<string, Feature>;
  height?: number;
  compact?: boolean;
  title?: string;
  subtitle?: string;
  totalLabel?: string;
  onSelectStep?: (stepId: string) => void;
  selectedStepId?: string | null;
}

const NAVY = '#1e293b';
const GREEN = '#16a34a';
const ORANGE = '#ea580c';
const YELLOW = '#ca8a04';
const AXIS = '#cbd5e1';
const TICK_LABEL = '#94a3b8';
const CORNER_LABEL = '#0f172a';
const NAME_LABEL = '#1e293b';

const PAD_L = 20;
const PAD_R = 40;
const PAD_T_BASE = 46; // room for corner temp labels + gradient ticks above the line
const EVENT_ZONE = 92; // room below the line for arrows + wrapped name labels

function wrapName(name: string): string[] {
  if (name.length <= 12) return [name];
  const words = name.split(' ');
  if (words.length === 1) return [name];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

export default function ProcessProfileSVG({
  steps, featureMap, height = 420, compact = false, title, subtitle, totalLabel,
  onSelectStep, selectedStepId,
}: Props) {
  const geo = useMemo(() => buildProfileGeometry(steps, featureMap), [steps, featureMap]);
  const minutesPerPixel = compact ? 3.2 : 5.2;
  const width = Math.max(compact ? 620 : 900, geo.totalMinutes * minutesPerPixel + PAD_L + PAD_R);

  const headerH = title ? 34 : 0;
  const plotT = headerH + PAD_T_BASE;
  const plotB = height - EVENT_ZONE;
  const plotH = Math.max(60, plotB - plotT);

  const plotW = width - PAD_L - PAD_R;
  const tRange = Math.max(1, geo.totalMinutes);
  const tempRange = Math.max(10, geo.maxTemp - geo.minTemp);

  const sx = (minutes: number) => PAD_L + (minutes / tRange) * plotW;
  const sy = (temp: number) => plotT + plotH - ((temp - geo.minTemp) / tempRange) * plotH;
  const eventBaseline = plotB + 26;

  if (steps.length === 0) {
    return (
      <div className="profile-svg-wrap">
        <svg viewBox={`0 0 900 ${height}`} width="100%" height={height}>
          <rect x={0} y={0} width={900} height={height} fill="#ffffff" />
          <text x={450} y={height / 2} textAnchor="middle" fill="#94a3b8" fontSize={13} fontFamily="Inter, Arial, sans-serif">
            Add process steps to see the live profile
          </text>
        </svg>
      </div>
    );
  }

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

  const ARROW_W = 5;
  const clickable = (id: string) => onSelectStep ? { cursor: 'pointer' } : {};
  const select = (id: string) => (e: React.SyntheticEvent) => { e.stopPropagation(); onSelectStep?.(id); };

  return (
    <div className="profile-svg-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ background: '#ffffff', display: 'block' }}>
        {title && (
          <text x={PAD_L} y={18} fontSize={14} fontWeight={700} fill={CORNER_LABEL} fontFamily="Inter, Arial, sans-serif">
            {title}
          </text>
        )}
        {subtitle && (
          <text x={PAD_L + (title ? title.length * 8.2 + 10 : 0)} y={18} fontSize={11.5} fill={TICK_LABEL} fontFamily="Inter, Arial, sans-serif">
            {subtitle}
          </text>
        )}
        {totalLabel && (
          <text x={width - PAD_R} y={18} fontSize={13} fontWeight={700} textAnchor="end" fill={CORNER_LABEL} fontFamily="Inter, Arial, sans-serif">
            {totalLabel}
          </text>
        )}

        {/* baseline axis */}
        <line x1={PAD_L} y1={eventBaseline} x2={width - PAD_R} y2={eventBaseline} stroke={AXIS} strokeWidth={1} />

        {/* parallel ramps (dashed diagonal) — drawn first, behind the main line */}
        {geo.ramps.map((r, i) => {
          const yellow = isYellowParallelKind(r.feature?.kind || '');
          const color = yellow ? YELLOW : GREEN;
          const x1 = sx(r.x1), x2 = sx(r.x2);
          const yTop = sy(r.lineY);
          const names = wrapName(r.nameLabel);
          return (
            <g key={`ramp-${i}`} style={clickable(r.step.id)} onClick={select(r.step.id)}>
              <line x1={x1} y1={eventBaseline} x2={x2} y2={yTop + ARROW_W} stroke={color} strokeWidth={1.75} strokeDasharray="5 4" />
              <polygon points={`${x2 - ARROW_W / 1.4},${yTop + ARROW_W} ${x2 + ARROW_W / 1.4},${yTop + ARROW_W} ${x2},${yTop}`} fill={color} />
              <text x={(x1 + x2) / 2} y={Math.min(yTop, eventBaseline) - 8} fontSize={10} textAnchor="middle" fill={color} fontStyle="italic" fontFamily="Inter, Arial, sans-serif">
                {r.durationLabel}
              </text>
              {names.map((ln, li) => (
                <text key={li} x={x2} y={eventBaseline + 16 + li * 12} fontSize={10.5} fontWeight={600} textAnchor="middle" fill={color} fontFamily="Inter, Arial, sans-serif">
                  {ln}
                </text>
              ))}
            </g>
          );
        })}

        {/* main process line */}
        {paths.map((d, i) => (
          <path key={`seg-${i}`} d={d} fill="none" stroke={NAVY} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* segment tick labels: duration (flat) or gradient (diagonal), centered above each segment */}
        {geo.segments.map((seg, i) => {
          const midX = (sx(seg.p1.x) + sx(seg.p2.x)) / 2;
          const midY = (sy(seg.p1.y) + sy(seg.p2.y)) / 2;
          const dy = seg.isDiagonal ? -8 : -10;
          return (
            <text
              key={`tick-${i}`}
              x={midX}
              y={midY + dy}
              fontSize={10}
              fontStyle="italic"
              textAnchor="middle"
              fill={TICK_LABEL}
              fontFamily="Inter, Arial, sans-serif"
              style={clickable(seg.step.id)}
              onClick={select(seg.step.id)}
            >
              {seg.tickLabel}
            </text>
          );
        })}

        {/* corner (bold) temperature labels */}
        {geo.corners.map((c, i) => (
          <text
            key={`corner-${i}`}
            x={sx(c.x)}
            y={sy(c.temp) - 20}
            fontSize={13}
            fontWeight={700}
            textAnchor="middle"
            fill={CORNER_LABEL}
            fontFamily="Inter, Arial, sans-serif"
          >
            {Math.round(c.temp)}°C
          </text>
        ))}

        {/* round vertices */}
        {geo.segments.map((seg, i) => (
          <React.Fragment key={`pt-${i}`}>
            <circle cx={sx(seg.p1.x)} cy={sy(seg.p1.y)} r={3.5} fill={NAVY} style={clickable(seg.step.id)} onClick={select(seg.step.id)} />
            <circle cx={sx(seg.p2.x)} cy={sy(seg.p2.y)} r={3.5} fill={NAVY} style={clickable(seg.step.id)} onClick={select(seg.step.id)} />
          </React.Fragment>
        ))}

        {/* event arrows — perfectly vertical shafts + arrowheads */}
        {geo.arrows.map((a, i) => {
          const color = a.color === 'green' ? GREEN : ORANGE;
          const xPix = sx(a.x);
          const yLine = sy(a.lineY);
          const names = wrapName(a.label);
          const isSelected = selectedStepId === a.step.id;
          if (a.direction === 'up') {
            return (
              <g key={`arr-${i}`} style={clickable(a.step.id)} onClick={select(a.step.id)}>
                <line x1={xPix} y1={eventBaseline} x2={xPix} y2={yLine + ARROW_W} stroke={color} strokeWidth={isSelected ? 3 : 2} />
                <polygon points={`${xPix - ARROW_W / 1.4},${yLine + ARROW_W} ${xPix + ARROW_W / 1.4},${yLine + ARROW_W} ${xPix},${yLine}`} fill={color} />
                {names.map((ln, li) => (
                  <text key={li} x={xPix} y={eventBaseline + 16 + li * 12} fontSize={10.5} fontWeight={600} textAnchor="middle" fill={NAME_LABEL} fontFamily="Inter, Arial, sans-serif">
                    {ln}
                  </text>
                ))}
              </g>
            );
          }
          return (
            <g key={`arr-${i}`} style={clickable(a.step.id)} onClick={select(a.step.id)}>
              <line x1={xPix} y1={yLine - ARROW_W} x2={xPix} y2={eventBaseline} stroke={color} strokeWidth={isSelected ? 3 : 2} />
              <polygon points={`${xPix - ARROW_W / 1.4},${eventBaseline - ARROW_W} ${xPix + ARROW_W / 1.4},${eventBaseline - ARROW_W} ${xPix},${eventBaseline}`} fill={color} />
              {names.map((ln, li) => (
                <text key={li} x={xPix} y={eventBaseline + 16 + li * 12} fontSize={10.5} fontWeight={600} textAnchor="middle" fill={NAME_LABEL} fontFamily="Inter, Arial, sans-serif">
                  {ln}
                </text>
              ))}
            </g>
          );
        })}

        {!compact && (
          <text x={PAD_L} y={height - 6} fontSize={10} fill={TICK_LABEL} fontStyle="italic" fontFamily="Inter, Arial, sans-serif">
            sequence / elapsed time →
          </text>
        )}
      </svg>
    </div>
  );
}
