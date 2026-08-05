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

/** Minimal header: logo + Style Textile + Process & Machine R&D only. */
async function drawBrandHeader(doc: jsPDF) {
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
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 27, pageWidth - 14, 27);
}

/** Draw the process profile using the same geometry model as the on-screen SVG, in mm coordinates. */
function drawProfile(
  doc: jsPDF,
  steps: Treatment['steps'],
  featureMap: Record<string, Feature>,
  x0: number, y0: number, w: number, h: number,
  caption?: string,
  totalLabel?: string,
) {
  const geo = buildProfileGeometry(steps, featureMap);
  const tRange = Math.max(1, geo.totalMinutes);
  const tempRange = Math.max(10, geo.maxTemp - geo.minTemp);
  const capH = caption ? 7 : 0;
  const padL = 4, padTop = capH + 10, padBottomEvents = 22;
  const plotW = w - padL - 4;
  const plotT = y0 + padTop;
  const plotB = y0 + h - padBottomEvents;
  const plotH = Math.max(10, plotB - plotT);
  const baseline = plotB + 8;

  const sx = (m: number) => x0 + padL + (m / tRange) * plotW;
  const sy = (t: number) => plotT + plotH - ((t - geo.minTemp) / tempRange) * plotH;

  if (caption) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...CORNER);
    doc.text(caption, x0, y0 + 6);
  }
  if (totalLabel) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...CORNER);
    doc.text(totalLabel, x0 + w, y0 + 6, { align: 'right' });
  }
  doc.setFont('helvetica', 'normal');

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(x0 + padL, baseline, x0 + padL + plotW, baseline);

  // parallel ramps (dashed diagonal)
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
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CORNER);
    doc.text(r.nameLabel, sx(r.x2), baseline + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
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
    doc.circle(sx(seg.p1.x), sy(seg.p1.y), 0.55, 'F');
    doc.circle(sx(seg.p2.x), sy(seg.p2.y), 0.55, 'F');
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

/**
 * Treatment PDF — kept intentionally minimal per spec: brand header (logo,
 * company, department) and the process profile with its total time. No plant/
 * category metadata and no step-by-step table.
 */
export async function exportTreatmentPDF(treatment: Treatment, _categoryName: string, _plantName: string, featureMap: Record<string, Feature>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawBrandHeader(doc);

  drawProfile(
    doc, treatment.steps, featureMap,
    14, 40, pageWidth - 28, 150,
    `${treatment.number}${treatment.name ? ` — ${treatment.name}` : ''}`,
    `Total Time: ${formatDuration(treatment.totalDurationMinutes)}`,
  );

  doc.save(`${treatment.number || 'treatment'}.pdf`);
}

/**
 * Program PDF — same minimal philosophy: brand header, then each treatment's
 * profile stacked with its own total time. No delay/notes/plant metadata.
 */
export async function exportProgramPDF(program: Program, _plantName: string, treatmentMap: Record<string, Treatment>, featureMap: Record<string, Feature>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawBrandHeader(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...CORNER);
  doc.text(`${program.number}${program.name ? ` — ${program.name}` : ''}`, 14, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Program Time: ${formatDuration(program.totalDurationMinutes)}`, pageWidth - 14, 36, { align: 'right' });

  let y = 44;
  const blockH = 62;
  program.entries.forEach((entry) => {
    const t = treatmentMap[entry.treatmentId];
    if (!t) return;
    if (y + blockH > 195) { doc.addPage('a4', 'landscape'); y = 20; }
    drawProfile(
      doc, t.steps, featureMap,
      14, y, pageWidth - 28, blockH,
      `${t.number} — ${t.name}`,
      formatDuration(t.totalDurationMinutes),
    );
    y += blockH + 4;
  });

  doc.save(`${program.number || 'program'}.pdf`);
}
