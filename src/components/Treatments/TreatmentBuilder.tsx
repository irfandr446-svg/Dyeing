import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import {
  ArrowLeft, ArrowUp, ArrowDown, Copy, Clipboard, Trash2, CopyPlus, Undo2, Redo2, FileDown, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useUnsavedGuard } from '../../context/UnsavedGuard';
import { Treatment, TreatmentStep } from '../../types';
import { calculateStepTimes, calculateTreatmentTotal, formatDuration } from '../../utils/timeUtils';
import ProcessProfileSVG from '../Profile/ProcessProfileSVG';
import { exportTreatmentPDF } from '../../utils/pdfExport';

function FeatureIcon({ name, size = 15, color }: { name: string; size?: number; color?: string }) {
  const Cmp = (Icons as any)[name] || Icons.Settings;
  return <Cmp size={size} color={color} />;
}

function blankStep(featureId: string): TreatmentStep {
  return { id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, featureId, durationMinutes: 10 };
}

function nextNumber(existing: Treatment[]) {
  const n = existing.length + 1;
  return `TR-${String(n).padStart(3, '0')}`;
}

export default function TreatmentBuilder({ treatmentId, onClose }: { treatmentId: string | null; onClose: () => void }) {
  const { treatments, plants, categories, features, saveTreatment, currentPlantId } = useApp();
  const { setDirty, setSaveHandler } = useUnsavedGuard();

  const existing = treatmentId ? treatments.find((t) => t.id === treatmentId) : null;

  const [draft, setDraft] = useState<Treatment>(() => existing || {
    id: `treatment-${Date.now()}`,
    number: nextNumber(treatments),
    name: '',
    plantId: currentPlantId,
    categoryId: categories[0]?.id || '',
    description: '',
    steps: [],
    totalDurationMinutes: 0,
    createdAt: '',
    updatedAt: '',
  });

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<TreatmentStep | null>(null);
  const historyRef = useRef<TreatmentStep[][]>([draft.steps]);
  const historyIndex = useRef(0);
  const baseline = useRef(JSON.stringify(existing || draft));

  const featureMap = useMemo(() => Object.fromEntries(features.map((f) => [f.id, f])), [features]);
  const calcSteps = useMemo(() => calculateStepTimes(draft.steps), [draft.steps]);
  const total = useMemo(() => calculateTreatmentTotal(draft.steps), [draft.steps]);

  useEffect(() => {
    const dirty = JSON.stringify(draft) !== baseline.current;
    setDirty(dirty);
  }, [draft, setDirty]);

  const doSave = async () => {
    await saveTreatment({ ...draft, totalDurationMinutes: total });
    baseline.current = JSON.stringify({ ...draft, totalDurationMinutes: total });
    setDirty(false);
  };

  useEffect(() => {
    setSaveHandler(doSave);
    return () => setSaveHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, total]);

  const pushHistory = (steps: TreatmentStep[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndex.current + 1);
    historyRef.current.push(steps);
    historyIndex.current = historyRef.current.length - 1;
  };

  const setSteps = (steps: TreatmentStep[], recordHistory = true) => {
    setDraft((d) => ({ ...d, steps }));
    if (recordHistory) pushHistory(steps);
  };

  const undo = () => {
    if (historyIndex.current === 0) return;
    historyIndex.current -= 1;
    setSteps(historyRef.current[historyIndex.current], false);
  };
  const redo = () => {
    if (historyIndex.current >= historyRef.current.length - 1) return;
    historyIndex.current += 1;
    setSteps(historyRef.current[historyIndex.current], false);
  };

  const addStep = (featureId: string) => {
    const s = blankStep(featureId);
    setSteps([...draft.steps, s]);
    setSelectedStepId(s.id);
  };

  const updateStep = (id: string, patch: Partial<TreatmentStep>) => {
    setSteps(draft.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const deleteStep = (id: string) => {
    setSteps(draft.steps.filter((s) => s.id !== id));
    if (selectedStepId === id) setSelectedStepId(null);
  };

  const duplicateStep = (id: string) => {
    const idx = draft.steps.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const copy = { ...draft.steps[idx], id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    const next = [...draft.steps];
    next.splice(idx + 1, 0, copy);
    setSteps(next);
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    const idx = draft.steps.findIndex((s) => s.id === id);
    const swapIdx = idx + dir;
    if (idx === -1 || swapIdx < 0 || swapIdx >= draft.steps.length) return;
    const next = [...draft.steps];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setSteps(next);
  };

  const copyStep = (id: string) => {
    const s = draft.steps.find((s) => s.id === id);
    if (s) setClipboard(s);
  };
  const pasteStep = () => {
    if (!clipboard) return;
    const copy = { ...clipboard, id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setSteps([...draft.steps, copy]);
  };

  const selectedStep = draft.steps.find((s) => s.id === selectedStepId) || null;
  const selectedFeature = selectedStep ? featureMap[selectedStep.featureId] : null;

  const plantName = plants.find((p) => p.id === draft.plantId)?.name || '';
  const categoryName = categories.find((c) => c.id === draft.categoryId)?.name || '';

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={onClose}><ArrowLeft size={18} /></button>
          <div>
            <div className="page-title">
              {draft.number || 'New Treatment'} {draft.name && `— ${draft.name}`}
              {JSON.stringify(draft) !== baseline.current && <span className="unsaved-dot" />}
            </div>
            <div className="page-subtitle">{plantName} · {categoryName} · Total {formatDuration(total)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" onClick={undo}><Undo2 size={13} /> Undo</button>
          <button className="btn btn-sm" onClick={redo}><Redo2 size={13} /> Redo</button>
          <button className="btn btn-sm" onClick={() => exportTreatmentPDF(draft, categoryName, plantName, featureMap)}><FileDown size={13} /> PDF</button>
          <button className="btn btn-primary" onClick={doSave}>Save</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="two-col">
          <div className="field-row">
            <label>Treatment Number</label>
            <input value={draft.number} onChange={(e) => setDraft({ ...draft, number: e.target.value })} />
          </div>
          <div className="field-row">
            <label>Treatment Name</label>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Polyester Dyeing" />
          </div>
          <div className="field-row">
            <label>Plant</label>
            <select value={draft.plantId} onChange={(e) => setDraft({ ...draft, plantId: e.target.value })}>
              {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field-row">
            <label>Category</label>
            <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="field-row" style={{ marginBottom: 0 }}>
          <label>Description</label>
          <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} />
        </div>
      </div>

      <div className="builder-grid">
        {/* Feature Library */}
        <div className="builder-panel">
          <div className="builder-panel-header">Add Step</div>
          <div className="builder-panel-body">
            {features.map((f) => (
              <div key={f.id} className="feature-chip feature-chip-add" onClick={() => addStep(f.id)} title="Click to add to timeline">
                <Icons.Plus size={13} color={f.color} />
                <FeatureIcon name={f.icon} size={14} color={f.color} />
                {f.name}
              </div>
            ))}
          </div>
        </div>

        {/* Process Steps */}
        <div className="builder-panel">
          <div className="builder-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Process Steps · {draft.steps.length}</span>
            {clipboard && <button className="icon-btn" title="Paste step" onClick={pasteStep}><Clipboard size={14} /></button>}
          </div>
          <div className="builder-panel-body">
            {draft.steps.length === 0 && <div className="empty-state">Click a feature on the left to add the first step.</div>}
            {calcSteps.map((s, i) => {
              const f = featureMap[s.featureId];
              return (
                <div key={s.id} className={`step-row ${selectedStepId === s.id ? 'selected' : ''}`} onClick={() => setSelectedStepId(s.id)}>
                  <span className="step-idx">{i + 1}</span>
                  {f && <FeatureIcon name={f.icon} size={14} color={f.color} />}
                  <div style={{ flex: 1 }}>
                    <div className="step-name">{s.label || f?.name || 'Unknown'} {s.parallel && <span className="badge">parallel</span>}</div>
                    <div className="step-meta">{formatDuration(s.durationMinutes)} · {s.startTime}–{s.endTime} min</div>
                  </div>
                  <div className="step-row-actions">
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); moveStep(s.id, -1); }}><ArrowUp size={13} /></button>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); moveStep(s.id, 1); }}><ArrowDown size={13} /></button>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); duplicateStep(s.id); }}><CopyPlus size={13} /></button>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); copyStep(s.id); }}><Copy size={13} /></button>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); deleteStep(s.id); }}><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit Step */}
        <div className="builder-panel">
          <div className="builder-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            Edit Step
            {selectedStep && <button className="icon-btn" onClick={() => setSelectedStepId(null)}><X size={13} /></button>}
          </div>
          <div className="builder-panel-body">
            {!selectedStep && <div className="empty-state">Select a step to edit its properties.</div>}
            {selectedStep && selectedFeature && (
              <StepPropertiesForm
                step={selectedStep}
                kind={selectedFeature.kind}
                onChange={(patch) => updateStep(selectedStep.id, patch)}
                features={features}
                onChangeFeature={(featureId) => updateStep(selectedStep.id, { featureId })}
              />
            )}
          </div>
        </div>
      </div>

      <div className="profile-panel">
        <ProcessProfileSVG
          steps={draft.steps}
          featureMap={featureMap}
          height={360}
          title={`${categoryName || 'Process'} Profile`}
          subtitle={draft.number}
          totalLabel={formatDuration(total)}
          onSelectStep={setSelectedStepId}
          selectedStepId={selectedStepId}
        />
      </div>
    </div>
  );
}

function StepPropertiesForm({
  step, kind, onChange, features, onChangeFeature,
}: {
  step: TreatmentStep;
  kind: string;
  onChange: (p: Partial<TreatmentStep>) => void;
  features: { id: string; name: string }[];
  onChangeFeature: (featureId: string) => void;
}) {
  const heatCool = kind === 'heat' || kind === 'cool';
  const isFill = kind === 'fill';
  const isInjectDose = kind === 'inject' || kind === 'dose';
  const isDrain = kind === 'drain';
  const canBeParallel = ['loading', 'dose', 'circulation', 'salt_circulation', 'chemical_circulation', 'forward_circulation', 'reverse_circulation'].includes(kind);

  return (
    <div>
      <div className="field-row">
        <label>Label</label>
        <input value={step.label ?? ''} onChange={(e) => onChange({ label: e.target.value })} placeholder="Override display name (optional)" />
      </div>

      <div className="field-row">
        <label>Type</label>
        <select value={step.featureId} onChange={(e) => onChangeFeature(e.target.value)}>
          {features.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {heatCool && (
        <>
          <div className="field-row">
            <label>Start Temperature (°C)</label>
            <input type="number" value={step.startTemp ?? ''} onChange={(e) => onChange({ startTemp: Number(e.target.value) })} />
          </div>
          <div className="field-row">
            <label>End Temperature (°C)</label>
            <input type="number" value={step.endTemp ?? ''} onChange={(e) => onChange({ endTemp: Number(e.target.value) })} />
          </div>
          <div className="field-row">
            <label>Gradient (°C/min)</label>
            <input type="number" step="0.1" value={step.gradient ?? ''} onChange={(e) => onChange({ gradient: Number(e.target.value) })} />
          </div>
        </>
      )}

      {isFill && (
        <>
          <div className="field-row">
            <label>Fill Type</label>
            <select value={step.fillType || ''} onChange={(e) => onChange({ fillType: e.target.value })}>
              <option value="">—</option>
              <option>Cold</option><option>Warm</option><option>Hot</option><option>Fresh</option><option>Soft</option>
            </select>
          </div>
          <div className="field-row">
            <label>Temperature (°C)</label>
            <input type="number" value={step.startTemp ?? ''} onChange={(e) => onChange({ startTemp: Number(e.target.value), endTemp: Number(e.target.value) })} />
          </div>
        </>
      )}

      {isInjectDose && (
        <>
          <div className="field-row">
            <label>Chemical Name (optional)</label>
            <input value={step.chemicalName || ''} onChange={(e) => onChange({ chemicalName: e.target.value })} placeholder="Not required" />
          </div>
          <div className="field-row">
            <label>Temperature (°C, optional)</label>
            <input type="number" value={step.startTemp ?? ''} onChange={(e) => onChange({ startTemp: Number(e.target.value) })} />
          </div>
        </>
      )}

      {!isFill && !heatCool && !isDrain && (
        <div className="field-row">
          <label>Temperature (°C, optional)</label>
          <input type="number" value={step.startTemp ?? ''} onChange={(e) => onChange({ startTemp: Number(e.target.value) })} />
        </div>
      )}

      {!heatCool && (
        <div className="field-row">
          <label>Duration (min)</label>
          <input type="number" value={step.durationMinutes ?? ''} onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })} />
        </div>
      )}
      {heatCool && (
        <div className="field-row">
          <label>Duration (min) — auto-calculated when gradient is set</label>
          <input type="number" value={step.durationMinutes ?? ''} onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })} />
        </div>
      )}

      {canBeParallel && (
        <div className="field-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={!!step.parallel} onChange={(e) => onChange({ parallel: e.target.checked })} />
          <label style={{ margin: 0, textTransform: 'none' }}>Runs in parallel (shown as dashed band)</label>
        </div>
      )}

      <div className="field-row">
        <label>Notes</label>
        <textarea value={step.notes || ''} onChange={(e) => onChange({ notes: e.target.value })} rows={3} />
      </div>
    </div>
  );
}
