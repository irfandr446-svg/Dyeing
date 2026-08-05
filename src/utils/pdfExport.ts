import jsPDF from 'jspdf';
import { Feature, Program, Treatment } from '../types';
import { buildProfileGeometry, isYellowParallelKind } from './profileGeometry';
import { formatDuration } from './timeUtils';

let logoDataUrl: string | null = null;
async function getLogo(): Promise<string | null> {
  if (logoDataUrl) return logoDataUrl;
  try {
    const res = await fetch('/logo.png');
    const blob = await res.blob();
    logoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return logoDataUrl;
  } catch {
    return null;
  }
}

const NAVY: [number, number, number] = [30, 41, 59];
const GREEN: [number, number, number] = [22, 163, 74];
const ORANGE: [number, number, number] = [234, 88, 12];
const YELLOW: [number, number, number] = [202, 138, 4];
const MUTED: [number, number, number] = [148, 163, 184];
const CORNER: [number, number, number] = [15, 23, 42];

async function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  const logo = await getLogo();
  const pageWidth = doc.internal.pageSize.getWidth();
  if (logo) {
    try { doc.addImage(logo, 'PNG', 14, 10, 14, 14); } catch { /* ignore */ }
  }
  doc.setTextColor(...NAVY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STYLE TEXTILE', 32, 17);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Process & Machine R&D', 32, 22);

  // legend, top-right
  let lx = pageWidth - 90;
  const ly = 14;
  doc.setFontSize(7.5);
  const legendItem = (color: [number, number, number], symbol: 'up' | 'down' | 'dash', label: string) => {
    doc.setDrawColor(...color); doc.setFillColor(...color);
    if (symbol === 'up') doc.triangle(lx, ly + 1.6, lx + 2.4, ly + 1.6, lx + 1.2, ly - 1, 'F');
    if (symbol === 'down') doc.triangle(lx, ly - 1, lx + 2.4, ly - 1, lx + 1.2, ly + 1.6, 'F');
    if (symbol === 'dash') { doc.setLineWidth(0.3); doc.setLineDashPattern([0.8, 0.6], 0); doc.line(lx + 1.2, ly - 1.5, lx + 1.2, ly + 1.8); doc.setLineDashPattern([], 0); }
    doc.setTextColor(...CORNER);
    doc.text(label, lx + 4, ly + 1.2);
    lx += 4 + doc.getTextWidth(label) + 5;
  };
  legendItem(GREEN, 'up', 'Addition / inject');
  legendItem(ORANGE, 'down', 'Drain');
  legendItem(YELLOW, 'dash', 'Gradual dosing');

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 27, pageWidth - 14, 27);

  doc.setTextColor(...NAVY);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 36);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 14, 42);
}

/** Draw the process profile using the same geometry model as the on-screen SVG, in mm coordinates. */
function drawProfile(
  doc: jsPDF,
  steps: Treatment['steps'],
  featureMap: Record<string, Feature>,
  x0: number, y0: number, w: number, h: number,
) {
  const geo = buildProfileGeometry(steps, featureMap);
  const tRange = Math.max(1, geo.totalMinutes);
  const tempRange = Math.max(10, geo.maxTemp - geo.minTemp);
  const padL = 4, padTop = 12, padBottomEvents = 22;
  const plotW = w - padL - 4;
  const plotT = y0 + padTop;
  const plotB = y0 + h - padBottomEvents;
  const plotH = Math.max(10, plotB - plotT);
  const baseline = plotB + 8;

  const sx = (m: number) => x0 + padL + (m / tRange) * plotW;
  const sy = (t: number) => plotT + plotH - ((t - geo.minTemp) / tempRange) * plotH;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(x0 + padL, baseline, x0 + padL + plotW, baseline);

  // parallel ramps
  geo.ramps.forEach((r) => {
    const c = isYellowParallelKind(r.feature?.kind || '') ? YELLOW : GREEN;
    doc.setDrawColor(...c);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1, 0.8], 0);
    doc.line(sx(r.x1), baseline, sx(r.x2), sy(r.lineY));
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6);
    doc.setTextColor(...c);
    doc.text(r.durationLabel, (sx(r.x1) + sx(r.x2)) / 2, Math.min(sy(r.lineY), baseline) - 2, { align: 'center' });
    doc.text(r.nameLabel, sx(r.x2), baseline + 5, { align: 'center' });
  });

  // main line
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.7);
  geo.segments.forEach((seg) => {
    doc.line(sx(seg.p1.x), sy(seg.p1.y), sx(seg.p2.x), sy(seg.p2.y));
  });

  // vertices
  doc.setFillColor(...NAVY);
  geo.segments.forEach((seg) => {
    doc.circle(sx(seg.p1.x), sy(seg.p1.y), 0.5, 'F');
    doc.circle(sx(seg.p2.x), sy(seg.p2.y), 0.5, 'F');
  });

  // tick labels (duration / gradient)
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MUTED);
  geo.segments.forEach((seg) => {
    const midX = (sx(seg.p1.x) + sx(seg.p2.x)) / 2;
    const midY = (sy(seg.p1.y) + sy(seg.p2.y)) / 2;
    doc.text(seg.tickLabel, midX, midY - 2.4, { align: 'center' });
  });

  // corner bold temp labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...CORNER);
  geo.corners.forEach((c) => {
    doc.text(`${Math.round(c.temp)}°C`, sx(c.x), sy(c.temp) - 5, { align: 'center' });
  });
  doc.setFont('helvetica', 'normal');

  // arrows
  geo.arrows.forEach((a) => {
    const c = a.color === 'green' ? GREEN : ORANGE;
    doc.setDrawColor(...c);
    doc.setLineWidth(0.4);
    const xp = sx(a.x);
    const yLine = sy(a.lineY);
    if (a.direction === 'up') doc.line(xp, baseline, xp, yLine);
    else doc.line(xp, yLine, xp, baseline);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CORNER);
    doc.text(a.label, xp, baseline + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  });
}

export async function exportTreatmentPDF(treatment: Treatment, categoryName: string, plantName: string, featureMap: Record<string, Feature>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawHeader(
    doc,
    `${treatment.number} — ${treatment.name || 'Untitled Treatment'}`,
    `Plant: ${plantName}   ·   Category: ${categoryName}   ·   Total Time: ${formatDuration(treatment.totalDurationMinutes)}`,
  );

  drawProfile(doc, treatment.steps, featureMap, 14, 48, pageWidth - 28, 108);

  let y = 168;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('Step', 14, y);
  doc.text('Feature', 34, y);
  doc.text('Duration', 90, y);
  doc.text('Temp', 115, y);
  doc.text('Notes', 140, y);
  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  treatment.steps.forEach((s, i) => {
    if (y > 195) { doc.addPage('a4', 'landscape'); y = 20; }
    const f = featureMap[s.featureId];
    doc.setTextColor(...NAVY);
    doc.text(String(i + 1), 14, y);
    doc.text(s.label || f?.name || 'Unknown', 34, y);
    doc.setTextColor(100, 116, 139);
    doc.text(formatDuration(s.durationMinutes), 90, y);
    doc.text(typeof s.startTemp === 'number' ? `${s.startTemp}°C${typeof s.endTemp === 'number' && s.endTemp !== s.startTemp ? ` → ${s.endTemp}°C` : ''}` : '—', 115, y);
    doc.text((s.notes || '').slice(0, 60), 140, y);
    y += 5;
  });

  doc.save(`${treatment.number || 'treatment'}.pdf`);
}

export async function exportProgramPDF(program: Program, plantName: string, treatmentMap: Record<string, Treatment>, featureMap: Record<string, Feature>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawHeader(
    doc,
    `${program.number} — ${program.name || 'Untitled Program'}`,
    `Plant: ${plantName}   ·   Treatments: ${program.entries.length}   ·   Total Time: ${formatDuration(program.totalDurationMinutes)}`,
  );

  let y = 48;
  program.entries.forEach((entry, i) => {
    const t = treatmentMap[entry.treatmentId];
    if (!t) return;
    if (y > 150) { doc.addPage('a4', 'landscape'); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(`${i + 1}. ${t.number} — ${t.name}`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${formatDuration(t.totalDurationMinutes)}${entry.delayBeforeMinutes ? `  ·  +${entry.delayBeforeMinutes} min delay before` : ''}`, 14, y + 4);
    y += 10;
    drawProfile(doc, t.steps, featureMap, 14, y, pageWidth - 28, 46);
    y += 52;
  });

  doc.save(`${program.number || 'program'}.pdf`);
}
