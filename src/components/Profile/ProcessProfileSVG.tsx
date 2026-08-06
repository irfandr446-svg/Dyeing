import React, { useMemo } from 'react';
import { CheckSquare, Bell } from 'lucide-react';
import { Feature, TreatmentStep } from '../../types';
import { buildProfileGeometry, isYellowParallelKind, SVG_SCALE, SVG_COMPACT_SCALE } from '../../utils/profileGeometry';
import { formatDuration } from '../../utils/timeUtils';

interface Props {
  steps: TreatmentStep[];
  featureMap: Record<string, Feature>;
  height?: number;
  compact?: boolean;
  title?: string;
  totalLabel?: string;
  totalWaterLKg?: number;
  applicabilityNote?: string;
  onSelectStep?: (stepId: string) => void;
  selectedStepId?: string | null;
}

const LINE = '#2563a8';
const GREEN = '#16a34a';
const ORANGE = '#ea580c';
const BLUE_BOX = '#2563a8';
const RED_BOX = '#dc2626';
const YELLOW = '#ca8a04';
const AXIS = '#cbd5e1';
const TICK_LABEL = '#94a3b8';
const CORNER_LABEL = '#0f172a';
const NAME_LABEL = '#1e293b';

const PAD_L = 24;
const PAD_R = 40;
const PAD_T_BASE = 40;
const EVENT_ZONE = 100;

function wrapName(name: string): string[] {
  if (name.length <= 13) return [name];
  const words = name.split(' ');
  if (words.length === 1) return [name];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

function isColdLabel(label: string) { return /cold|recycle/i.test(label); }
function isHotLabel(label: string) { return /hot/i.test(label); }

export default function ProcessProfileSVG({
  steps, featureMap, height = 440, compact = false, title, totalLabel,
  totalWaterLKg, applicabilityNote, onSelectStep, selectedStepId,
}: Props) {
  const scale = compact ? SVG_COMPACT_SCALE : SVG_SCALE;
  const geo = useMemo(() => buildProfileGeometry(steps, featureMap, scale), [steps, featureMap, scale]);
  const width = Math.max(compact ? 520 : 760, geo.totalUnits + PAD_L + PAD_R);

  const headerH = 34;
  const plotT = headerH + PAD_T_BASE;
  const plotB = height - EVENT_ZONE;
  const plotH = Math.max(60, plotB - plotT);

  const tempRange = Math.max(10, geo.maxTemp - geo.minTemp);

  const sx = (u: number) => PAD_L + u;
  const sy = (temp: number) => plotT + plotH - ((temp - geo.minTemp) / tempRange) * plotH;
  const eventBaseline = plotB + 26;

  const clickable = () => (onSelectStep ? { cursor: 'pointer' } : {});
  const select = (id: string) => (e: React.SyntheticEvent) => { e.stopPropagation(); onSelectStep?.(id); };
  const ARROW_W = 5;

  return (
    <div className="profile-card-wrap">
      {!compact && (
        <div className="profile-title-badge">
          <CheckSquare size={15} color="#1e40af" />
          <span>{title || 'Untitled Treatment'}</span>
        </div>
      )}

      <div className="profile-svg-wrap">
        {steps.length === 0 ? (
          <svg viewBox={`0 0 900 ${height}`} width="100%" height={height}>
            <rect x={0} y={0} width={900} height={height} fill="#ffffff" />
            <text x={450} y={height / 2} textAnchor="middle" fill="#94a3b8" fontSize={13} fontFamily="Inter, Arial, sans-serif">
              Add process steps to see the live profile
            </text>
          </svg>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ background: '#ffffff', display: 'block' }}>
            {totalLabel && (
              <text x={width - PAD_R} y={16} fontSize={12.5} fontWeight={700} textAnchor="end" fill={CORNER_LABEL} fontFamily="Inter, Arial, sans-serif">
                Total {totalLabel}
              </text>
            )}

            <line x1={PAD_L} y1={eventBaseline} x2={width - PAD_R} y2={eventBaseline} stroke={AXIS} strokeWidth={1} />

            {geo.ramps.map((r, i) => {
              const yellow = isYellowParallelKind(r.feature?.kind || '');
              const color = yellow ? YELLOW : GREEN;
              const x1 = sx(r.x1), x2 = sx(r.x2);
              const yTop = sy(r.lineY);
              const names = wrapName(r.nameLabel);
              return (
                <g key={`ramp-${i}`} style={clickable()} onClick={select(r.step.id)}>
                  <line x1={x1} y1={eventBaseline} x2={x2} y2={yTop + ARROW_W} stroke={color} strokeWidth={1.5} strokeDasharray="5 4" />
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

            {(() => {
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
              return paths.map((d, i) => (
                <path key={`seg-${i}`} d={d} fill="none" stroke={LINE} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
              ));
            })()}

            {geo.segments.map((seg, i) => {
              if (!seg.tickLabel) return null;
              const midX = (sx(seg.p1.x) + sx(seg.p2.x)) / 2;
              const midY = (sy(seg.p1.y) + sy(seg.p2.y)) / 2;
              const dy = seg.isDiagonal ? -8 : -10;
              return (
                <text key={`tick-${i}`} x={midX} y={midY + dy} fontSize={10} fontStyle="italic" textAnchor="middle" fill={TICK_LABEL} fontFamily="Inter, Arial, sans-serif" style={clickable()} onClick={select(seg.step.id)}>
                  {seg.tickLabel}
                </text>
              );
            })}

            {geo.corners.map((c, i) => (
              <text key={`corner-${i}`} x={sx(c.x)} y={sy(c.temp) - 20} fontSize={13} fontWeight={700} textAnchor="middle" fill={CORNER_LABEL} fontFamily="Inter, Arial, sans-serif">
                {c.text}
              </text>
            ))}

            {geo.segments.map((seg, i) => (
              <React.Fragment key={`pt-${i}`}>
                <circle cx={sx(seg.p1.x)} cy={sy(seg.p1.y)} r={3} fill={LINE} style={clickable()} onClick={select(seg.step.id)} />
                <circle cx={sx(seg.p2.x)} cy={sy(seg.p2.y)} r={3} fill={LINE} style={clickable()} onClick={select(seg.step.id)} />
              </React.Fragment>
            ))}

            {geo.arrows.map((a, i) => {
              const isDrain = a.direction === 'down';
              const cold = isColdLabel(a.label);
              const hot = isHotLabel(a.label);
              const boxColor = isDrain ? (hot ? RED_BOX : BLUE_BOX) : (a.color === 'green' ? GREEN : ORANGE);
              const xPix = sx(a.x);
              const yLine = sy(a.lineY);
              const names = wrapName(a.label);
              const isSelected = selectedStepId === a.step.id;

              if (isDrain) {
                // Drain: thin vertical line down to the axis, then a small dashed label box beneath it (matches mill process-sheet convention)
                const boxW = Math.max(48, names.reduce((m, n) => Math.max(m, n.length * 6), 0) + 10);
                const boxX = xPix - boxW / 2;
                const boxY = eventBaseline + 8;
                const boxH = 15 * names.length + 8;
                return (
                  <g key={`arr-${i}`} style={clickable()} onClick={select(a.step.id)}>
                    <line x1={xPix} y1={yLine} x2={xPix} y2={eventBaseline} stroke={boxColor} strokeWidth={isSelected ? 2.5 : 1.5} />
                    <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={4} fill="#ffffff" stroke={boxColor} strokeWidth={1.2} strokeDasharray="3 2" />
                    {names.map((ln, li) => (
                      <text key={li} x={xPix} y={boxY + 15 + li * 14} fontSize={10} fontWeight={700} textAnchor="middle" fill={boxColor} fontFamily="Inter, Arial, sans-serif">
                        {ln}
                      </text>
                    ))}
                  </g>
                );
              }

              return (
                <g key={`arr-${i}`} style={clickable()} onClick={select(a.step.id)}>
                  <line x1={xPix} y1={eventBaseline} x2={xPix} y2={yLine + ARROW_W} stroke={boxColor} strokeWidth={isSelected ? 3 : 2} />
                  <polygon points={`${xPix - ARROW_W / 1.4},${yLine + ARROW_W} ${xPix + ARROW_W / 1.4},${yLine + ARROW_W} ${xPix},${yLine}`} fill={boxColor} />
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
        )}
      </div>

      {!compact && (totalWaterLKg !== undefined || totalLabel || applicabilityNote) && (
        <div className="profile-footer-row">
          {(totalWaterLKg !== undefined || totalLabel) && (
            <table className="profile-stats-table">
              <tbody>
                {totalWaterLKg !== undefined && (
                  <tr><td>Total Water<br /><span className="unit">(L/kg)</span></td><td className="value">{totalWaterLKg}</td></tr>
                )}
                {totalLabel && (
                  <tr><td>Set Time<br /><span className="unit">(Hr:Min)</span></td><td className="value">{formatHrMin(steps, totalLabel)}</td></tr>
                )}
              </tbody>
            </table>
          )}
          {applicabilityNote && (
            <div className="profile-applicability-badge">
              <Bell size={13} color="#a16207" />
              {applicabilityNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatHrMin(steps: TreatmentStep[], fallback: string): string {
  // totalLabel comes pre-formatted (e.g. "2h 19min"); mirror mill convention "Hr:Min" when possible.
  const match = fallback.match(/(?:(\d+)h)?\s*(?:(\d+)min)?/);
  if (match) {
    const h = Number(match[1] || 0);
    const m = Number(match[2] || 0);
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  return fallback;
}
