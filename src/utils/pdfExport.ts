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
const MUTED: [number, number, number] = [100, 116, 139];

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
  doc.setTextColor(...MUTED);
  doc.text('Process & Machine R&D', 32, 22);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 27, pageWidth - 14, 27);

  doc.setTextColor(...NAVY);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 36);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
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
  const padL = 12, padB = 8, padT = 4;
  const plotW = w - padL - 4;
  const plotH = h - padT - padB;

  const sx = (m: number) => x0 + padL + (m / tRange) * plotW;
  const sy = (t: number) => y0 + padT + plotH - ((t - geo.minTemp) / tempRange) * plotH;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(x0 + padL, y0 + padT, x0 + padL, y0 + padT + plotH);
  doc.line(x0 + padL, y0 + padT + plotH, x0 + padL + plotW, y0 + padT + plotH);

  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  const tempStep = tempRange > 100 ? 20 : 10;
  for (let t = geo.minTemp; t <= geo.maxTemp; t += tempStep) {
    doc.text(`${t}°`, x0 + padL - 2, sy(t) + 1, { align: 'right' });
  }

  // bands (parallel ops)
  geo.bands.forEach((b) => {
    const c = isYellowParallelKind(b.feature?.kind || '') ? YELLOW : GREEN;
    doc.setDrawColor(...c);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1, 0.8], 0);
    doc.line(sx(b.x1), y0 + padT + plotH, sx(b.x1), y0 + padT + 2);
    doc.line(sx(b.x2), y0 + padT + plotH, sx(b.x2), y0 + padT + 2);
    doc.setLineDashPattern([], 0);
  });

  // main line
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  let lastPoint: { x: number; y: number } | null = null;
  geo.segments.forEach((seg) => {
    const x1 = sx(seg.p1.x), y1 = sy(seg.p1.y), x2 = sx(seg.p2.x), y2 = sy(seg.p2.y);
    if (seg.newSubpath) lastPoint = null;
    doc.line(x1, y1, x2, y2);
    lastPoint = { x: x2, y: y2 };
  });

  // arrows
  geo.arrows.forEach((a) => {
    const c = a.color === 'green' ? GREEN : ORANGE;
    doc.setDrawColor(...c);
    doc.setFillColor(...c);
    doc.setLineWidth(0.4);
    const xp = sx(a.x);
    const yLine = sy(a.yTop);
    const yBase = y0 + padT + plotH;
    if (a.direction === 'up') {
      doc.line(xp, yBase, xp, yLine);
    } else {
      doc.line(xp, yLine, xp, yBase);
    }
  });

  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
}

export async function exportTreatmentPDF(treatment: Treatment, categoryName: string, plantName: string, featureMap: Record<string, Feature>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawHeader(doc, `${treatment.number} — ${treatment.name || 'Untitled Treatment'}`, `Plant: ${plantName}   ·   Category: ${categoryName}   ·   Total Time: ${formatDuration(treatment.totalDurationMinutes)}`);

  drawProfile(doc, treatment.steps, featureMap, 14, 48, pageWidth - 28, 110);

  // step list table
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
    doc.text(f?.name || 'Unknown', 34, y);
    doc.setTextColor(...MUTED);
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

  await drawHeader(doc, `${program.number} — ${program.name || 'Untitled Program'}`, `Plant: ${plantName}   ·   Treatments: ${program.entries.length}   ·   Total Time: ${formatDuration(program.totalDurationMinutes)}`);

  let y = 48;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('Sequence', 14, y);
  y += 6;

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
    doc.setTextColor(...MUTED);
    doc.text(`${formatDuration(t.totalDurationMinutes)}${entry.delayBeforeMinutes ? `  ·  +${entry.delayBeforeMinutes} min delay before` : ''}`, 14, y + 4);
    y += 10;
    drawProfile(doc, t.steps, featureMap, 14, y, pageWidth - 28, 46);
    y += 52;
  });

  doc.save(`${program.number || 'program'}.pdf`);
}
