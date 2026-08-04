import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, CopyPlus, FileDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useUnsavedGuard } from '../../context/UnsavedGuard';
import { Program, ProgramEntry } from '../../types';
import { calculateProgramTotal, formatDuration } from '../../utils/timeUtils';
import ProcessProfileSVG from '../Profile/ProcessProfileSVG';
import { exportProgramPDF } from '../../utils/pdfExport';

function nextNumber(existing: Program[]) {
  return `PR-${String(existing.length + 1).padStart(3, '0')}`;
}

export default function ProgramBuilder({ programId, onClose }: { programId: string | null; onClose: () => void }) {
  const { programs, treatments, plants, features, saveProgram, currentPlantId } = useApp();
  const { setDirty, setSaveHandler } = useUnsavedGuard();

  const existing = programId ? programs.find((p) => p.id === programId) : null;

  const [draft, setDraft] = useState<Program>(() => existing || {
    id: `program-${Date.now()}`,
    number: nextNumber(programs),
    name: '',
    plantId: currentPlantId,
    entries: [],
    totalDurationMinutes: 0,
    createdAt: '',
    updatedAt: '',
  });

  const baseline = React.useRef(JSON.stringify(existing || draft));
  const featureMap = useMemo(() => Object.fromEntries(features.map((f) => [f.id, f])), [features]);
  const treatmentMap = useMemo(() => Object.fromEntries(treatments.map((t) => [t.id, t])), [treatments]);
  const plantTreatments = treatments.filter((t) => t.plantId === draft.plantId);
  const total = calculateProgramTotal(draft, treatmentMap);
  const plantName = plants.find((p) => p.id === draft.plantId)?.name || '';

  useEffect(() => {
    setDirty(JSON.stringify(draft) !== baseline.current);
  }, [draft, setDirty]);

  const doSave = async () => {
    await saveProgram({ ...draft, totalDurationMinutes: total });
    baseline.current = JSON.stringify({ ...draft, totalDurationMinutes: total });
    setDirty(false);
  };

  useEffect(() => {
    setSaveHandler(doSave);
    return () => setSaveHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, total]);

  // If the plant changes, drop entries that no longer belong to it.
  const onPlantChange = (plantId: string) => {
    setDraft((d) => ({
      ...d,
      plantId,
      entries: d.entries.filter((e) => treatmentMap[e.treatmentId]?.plantId === plantId),
    }));
  };

  const addTreatment = (treatmentId: string) => {
    const entry: ProgramEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      treatmentId,
      order: draft.entries.length,
      delayBeforeMinutes: 0,
    };
    setDraft((d) => ({ ...d, entries: [...d.entries, entry] }));
  };

  const updateEntry = (id: string, patch: Partial<ProgramEntry>) => {
    setDraft((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  };

  const removeEntry = (id: string) => {
    setDraft((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  };

  const duplicateEntry = (id: string) => {
    const idx = draft.entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const copy = { ...draft.entries[idx], id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    const next = [...draft.entries];
    next.splice(idx + 1, 0, copy);
    setDraft((d) => ({ ...d, entries: next }));
  };

  const moveEntry = (id: string, dir: -1 | 1) => {
    const idx = draft.entries.findIndex((e) => e.id === id);
    const swap = idx + dir;
    if (idx === -1 || swap < 0 || swap >= draft.entries.length) return;
    const next = [...draft.entries];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setDraft((d) => ({ ...d, entries: next }));
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={onClose}><ArrowLeft size={18} /></button>
          <div>
            <div className="page-title">
              {draft.number || 'New Program'} {draft.name && `— ${draft.name}`}
              {JSON.stringify(draft) !== baseline.current && <span className="unsaved-dot" />}
            </div>
            <div className="page-subtitle">{plantName} · Total {formatDuration(total)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" onClick={() => exportProgramPDF(draft, plantName, treatmentMap, featureMap)}><FileDown size={13} /> PDF</button>
          <button className="btn btn-primary" onClick={doSave}>Save</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="two-col">
          <div className="field-row">
            <label>Program Number</label>
            <input value={draft.number} onChange={(e) => setDraft({ ...draft, number: e.target.value })} />
          </div>
          <div className="field-row">
            <label>Program Name</label>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Poly-Cotton Combined Program" />
          </div>
          <div className="field-row" style={{ gridColumn: '1 / 3' }}>
            <label>Plant</label>
            <select value={draft.plantId} onChange={(e) => onPlantChange(e.target.value)}>
              {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="builder-grid" style={{ gridTemplateColumns: '260px 1fr' }}>
        <div className="builder-panel">
          <div className="builder-panel-header">Treatment Library — {plantName}</div>
          <div className="builder-panel-body">
            {plantTreatments.length === 0 && <div className="empty-state">No treatments exist for this plant yet.</div>}
            {plantTreatments.map((t) => (
              <div key={t.id} className="feature-chip" onClick={() => addTreatment(t.id)} title="Click to add to sequence">
                <div style={{ flex: 1 }}>
                  <div>{t.number} — {t.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 400 }}>{formatDuration(t.totalDurationMinutes)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="builder-panel">
          <div className="builder-panel-header">Program Sequence ({draft.entries.length})</div>
          <div className="builder-panel-body">
            {draft.entries.length === 0 && <div className="empty-state">Add treatments from the library on the left.</div>}
            {draft.entries.map((entry, i) => {
              const t = treatmentMap[entry.treatmentId];
              return (
                <div className="program-seq-item" key={entry.id}>
                  <span className="seq-num">{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{t ? `${t.number} — ${t.name}` : 'Missing treatment'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t ? formatDuration(t.totalDurationMinutes) : ''}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <label style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Delay before (min)</label>
                      <input
                        type="number"
                        style={{ width: 70, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 4 }}
                        value={entry.delayBeforeMinutes}
                        onChange={(e) => updateEntry(entry.id, { delayBeforeMinutes: Number(e.target.value) })}
                      />
                      <input
                        placeholder="Note between treatments (optional)"
                        style={{ flex: 1, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 4 }}
                        value={entry.notes || ''}
                        onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="step-row-actions">
                    <button className="icon-btn" onClick={() => moveEntry(entry.id, -1)}><ArrowUp size={13} /></button>
                    <button className="icon-btn" onClick={() => moveEntry(entry.id, 1)}><ArrowDown size={13} /></button>
                    <button className="icon-btn" onClick={() => duplicateEntry(entry.id)}><CopyPlus size={13} /></button>
                    <button className="icon-btn" onClick={() => removeEntry(entry.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="page-subtitle" style={{ marginBottom: 8 }}>Combined Profile Preview</div>
        {draft.entries.map((entry) => {
          const t = treatmentMap[entry.treatmentId];
          if (!t) return null;
          return (
            <div className="profile-panel" key={entry.id} style={{ height: 280, marginBottom: 12 }}>
              <div className="profile-panel-header">
                <strong style={{ fontSize: 12.5 }}>{t.number} — {t.name}</strong>
                <span className="badge">{formatDuration(t.totalDurationMinutes)}{entry.delayBeforeMinutes ? ` · +${entry.delayBeforeMinutes}min delay before` : ''}</span>
              </div>
              <ProcessProfileSVG steps={t.steps} featureMap={featureMap} height={220} compact />
            </div>
          );
        })}
      </div>
    </div>
  );
}
