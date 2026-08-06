import jsPDF from 'jspdf';
import { Feature, Program, Treatment } from '../types';
import { buildProfileGeometry, isYellowParallelKind, PDF_SCALE } from './profileGeometry';
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

const LINE: [number, number, number] = [37, 99, 168];
const GREEN: [number, number, number] = [22, 163, 74];
const ORANGE: [number, number, number] = [234, 88, 12];
const YELLOW: [number, number, number] = [202, 138, 4];
const BLUE_BOX: [number, number, number] = [37, 99, 168];
const RED_BOX: [number, number, number] = [220, 38, 38];
const MUTED: [number, number, number] = [148, 163, 184];
const CORNER: [number, number, number] = [15, 23, 42];

function isColdLabel(label: string) { return /cold|recycle/i.test(label); }
function isHotLabel(label: string) { return /hot/i.test(label); }

async function drawBrandHeader(doc: jsPDF) {
  const logo = await getLogo();
  const pageWidth = doc.internal.pageSize.getWidth();
  if (logo) {
    try { doc.addImage(logo, 'PNG', 14, 10, 14, 14); } catch { /* ignore */ }
  }
  doc.setTextColor(...CORNER);
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

/** Small bordered "checkbox + title" badge, mirroring the mill process-sheet convention. */
function drawTitleBadge(doc: jsPDF, x: number, y: number, title: string) {
  const w = doc.getTextWidth(title) + 16;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, 8, 1, 1, 'FD');
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.35);
  doc.rect(x + 3, y + 2.2, 3.5, 3.5);
  doc.line(x + 3.4, y + 4, x + 4.3, y + 5); doc.line(x + 4.3, y + 5, x + 6, y + 2.6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORNER);
  doc.text(title, x + 9, y + 5.5);
  return w;
}

/** Draw the process profile using the same geometry model as the on-screen SVG, in mm coordinates. */
function drawProfile(
  doc: jsPDF,
  treatment: Pick<Treatment, 'steps' | 'totalDurationMinutes' | 'totalWaterLKg' | 'applicabilityNote'>,
  featureMap: Record<string, Feature>,
  x0: number, y0: number, w: number, h: number,
  title?: string,
) {
  const geo = buildProfileGeometry(treatment.steps, featureMap, PDF_SCALE);
  const tempRange = Math.max(10, geo.maxTemp - geo.minTemp);
  const badgeH = title ? 12 : 0;
  const footerH = 20;
  const padL = 4, padTop = badgeH + 8, padBottomEvents = 22;
  const plotW = w - padL - 4;
  const plotT = y0 + padTop;
  const plotB = y0 + h - padBottomEvents - footerH;
  const plotH = Math.max(10, plotB - plotT);
  const baseline = plotB + 8;

  const shrink = geo.totalUnits > plotW ? plotW / geo.totalUnits : 1;
  const sx = (u: number) => x0 + padL + u * shrink;
  const sy = (t: number) => plotT + plotH - ((t - geo.minTemp) / tempRange) * plotH;

  if (title) drawTitleBadge(doc, x0, y0, title);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(x0 + padL, baseline, x0 + padL + plotW, baseline);

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

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.55);
  geo.segments.forEach((seg) => {
    doc.line(sx(seg.p1.x), sy(seg.p1.y), sx(seg.p2.x), sy(seg.p2.y));
  });

  doc.setFillColor(...LINE);
  geo.segments.forEach((seg) => {
    doc.circle(sx(seg.p1.x), sy(seg.p1.y), 0.5, 'F');
    doc.circle(sx(seg.p2.x), sy(seg.p2.y), 0.5, 'F');
  });

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MUTED);
  geo.segments.forEach((seg) => {
    if (!seg.tickLabel) return;
    const midX = (sx(seg.p1.x) + sx(seg.p2.x)) / 2;
    const midY = (sy(seg.p1.y) + sy(seg.p2.y)) / 2;
    doc.text(seg.tickLabel, midX, midY - 2.4, { align: 'center' });
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...CORNER);
  geo.corners.forEach((c) => {
    doc.text(c.text, sx(c.x), sy(c.temp) - 5, { align: 'center' });
  });
  doc.setFont('helvetica', 'normal');

  geo.arrows.forEach((a) => {
    const isDrain = a.direction === 'down';
    const cold = isColdLabel(a.label);
    const hot = isHotLabel(a.label);
    const c = isDrain ? (hot ? RED_BOX : BLUE_BOX) : (a.color === 'green' ? GREEN : ORANGE);
    doc.setDrawColor(...c);
    doc.setLineWidth(0.35);
    const xp = sx(a.x);
    const yLine = sy(a.lineY);

    if (isDrain) {
      doc.line(xp, yLine, xp, baseline);
      const boxW = Math.max(16, doc.getTextWidth(a.label) + 4);
      doc.setLineDashPattern([0.8, 0.6], 0);
      doc.roundedRect(xp - boxW / 2, baseline + 2, boxW, 6, 0.8, 0.8, 'S');
      doc.setLineDashPattern([], 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(...c);
      doc.text(a.label, xp, baseline + 5.5, { align: 'center', maxWidth: boxW - 1 });
      doc.setFont('helvetica', 'normal');
    } else {
      doc.line(xp, baseline, xp, yLine);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...CORNER);
      doc.text(a.label, xp, baseline + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    }
  });

  // footer: stats table + applicability badge
  const footerY = y0 + h - footerH + 6;
  const hasWater = treatment.totalWaterLKg !== undefined;
  if (hasWater || treatment.totalDurationMinutes) {
    const rowH = 5;
    const col1W = 22, col2W = 16;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.setFontSize(6);
    let ty = footerY;
    if (hasWater) {
      doc.setFillColor(241, 245, 249);
      doc.rect(x0, ty, col1W, rowH, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Water (L/kg)', x0 + 1.5, ty + 3.3);
      doc.rect(x0 + col1W, ty, col2W, rowH, 'S');
      doc.setTextColor(...CORNER);
      doc.text(String(treatment.totalWaterLKg), x0 + col1W + col2W / 2, ty + 3.3, { align: 'center' });
      ty += rowH;
    }
    doc.setFillColor(241, 245, 249);
    doc.rect(x0, ty, col1W, rowH, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('Set Time (Hr:Min)', x0 + 1.5, ty + 3.3);
    doc.rect(x0 + col1W, ty, col2W, rowH, 'S');
    doc.setTextColor(...CORNER);
    const mins = treatment.totalDurationMinutes;
    doc.text(`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`, x0 + col1W + col2W / 2, ty + 3.3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  }

  if (treatment.applicabilityNote) {
    doc.setDrawColor(234, 179, 8);
    doc.setLineDashPattern([0.8, 0.6], 0);
    const noteW = doc.getTextWidth(treatment.applicabilityNote) + 8;
    doc.roundedRect(x0 + w - noteW, footerY, noteW, 6, 1, 1, 'S');
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(133, 77, 14);
    doc.text(treatment.applicabilityNote, x0 + w - noteW / 2, footerY + 3.8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  }
}

/**
 * Treatment PDF — brand header (logo, company, department) and the process
 * profile with its checkbox title badge, water/time stats table, and
 * applicability note, matching the mill process-sheet convention.
 */
export async function exportTreatmentPDF(treatment: Treatment, _categoryName: string, _plantName: string, featureMap: Record<string, Feature>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawBrandHeader(doc);

  drawProfile(
    doc, treatment, featureMap,
    14, 36, pageWidth - 28, 160,
    treatment.name || treatment.number,
  );

  doc.save(`${treatment.number || 'treatment'}.pdf`);
}

/**
 * Program PDF — brand header, then each treatment's profile stacked with its
 * own checkbox badge and stats table.
 */
export async function exportProgramPDF(program: Program, _plantName: string, treatmentMap: Record<string, Treatment>, featureMap: Record<string, Feature>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawBrandHeader(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...CORNER);
  doc.text(`${program.number}${program.name ? ` — ${program.name}` : ''}`, 14, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Program Time: ${formatDuration(program.totalDurationMinutes)}`, pageWidth - 14, 34, { align: 'right' });

  let y = 40;
  const blockH = 68;
  program.entries.forEach((entry) => {
    const t = treatmentMap[entry.treatmentId];
    if (!t) return;
    if (y + blockH > 195) { doc.addPage('a4', 'landscape'); y = 20; }
    drawProfile(doc, t, featureMap, 14, y, pageWidth - 28, blockH, t.name || t.number);
    y += blockH + 4;
  });

  doc.save(`${program.number || 'program'}.pdf`);
}
