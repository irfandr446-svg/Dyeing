import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Feature, FeatureKind } from '../../types';

const ICON_CHOICES = [
  'Droplet', 'ArrowDownToLine', 'Flame', 'Snowflake', 'Pause', 'Play', 'Syringe', 'Beaker',
  'PackagePlus', 'RefreshCw', 'FlaskConical', 'RotateCw', 'RotateCcw', 'Waves', 'Droplets',
  'ShowerHead', 'Sparkles', 'Scale', 'Brush', 'TestTube', 'UserCheck', 'Clock', 'Hourglass',
  'Bell', 'Octagon', 'Settings', 'Gauge', 'Timer', 'Wind',
];

const COLOR_CHOICES = ['#16a34a', '#ea580c', '#dc2626', '#0284c7', '#334155', '#ca8a04', '#0891b2', '#7c3aed', '#64748b'];

const KIND_OPTIONS: { value: FeatureKind; label: string }[] = [
  { value: 'hold', label: 'Hold (flat line)' },
  { value: 'heat', label: 'Heat (rising diagonal)' },
  { value: 'cool', label: 'Cool (falling diagonal)' },
  { value: 'fill', label: 'Fill (green up arrow)' },
  { value: 'drain', label: 'Drain (orange down arrow)' },
  { value: 'inject', label: 'Inject / Dose (green up arrow)' },
  { value: 'circulation', label: 'Circulation (yellow parallel band)' },
  { value: 'custom', label: 'Generic step' },
];

function FeatureIcon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const Cmp = (Icons as any)[name] || Icons.Settings;
  return <Cmp size={size} color={color} />;
}

interface Draft {
  id: string | null; // null = creating new
  name: string;
  icon: string;
  color: string;
  kind: FeatureKind;
}

const BLANK_DRAFT: Draft = { id: null, name: '', icon: 'Settings', color: '#334155', kind: 'custom' };

export default function FeatureLibraryView() {
  const { features, addFeature, updateFeature, deleteFeature } = useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openEdit = (f: Feature) => setDraft({ id: f.id, name: f.name, icon: f.icon, color: f.color, kind: f.kind });
  const openNew = () => setDraft({ ...BLANK_DRAFT });

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    if (draft.id) {
      updateFeature(draft.id, { name: draft.name.trim(), icon: draft.icon, color: draft.color });
    } else {
      addFeature({ name: draft.name.trim(), icon: draft.icon, color: draft.color, kind: draft.kind });
    }
    setDraft(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Feature Library</div>
          <div className="page-subtitle">Building blocks used in the Treatment Builder timeline. Every feature — built-in or custom — can be renamed, recolored, and re-iconed.</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Add Feature</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
        {features.map((f) => (
          <div key={f.id} className="card feature-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10 }}>
            <div style={{ background: f.color, width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FeatureIcon name={f.icon} size={16} color="#fff" />
            </div>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{f.name}</div>
            <button className="icon-btn" onClick={() => openEdit(f)} title="Edit feature"><Pencil size={14} /></button>
            {f.isCustom && (
              <button className="icon-btn" onClick={() => setConfirmId(f.id)} title="Delete feature"><Trash2 size={15} /></button>
            )}
          </div>
        ))}
      </div>

      {draft && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ width: 380 }}>
            <h3>{draft.id ? 'Edit Feature' : 'New Custom Feature'}</h3>
            <p>{draft.id ? 'Rename it, or give it a new icon and color.' : 'Custom features get their own icon, color and appear alongside built-in features.'}</p>

            <div className="field-row">
              <label>Name</label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Softener Dosing" />
            </div>

            {!draft.id && (
              <div className="field-row">
                <label>Behaviour (drives the profile arrow style)</label>
                <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as FeatureKind })}>
                  {KIND_OPTIONS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>
            )}

            <div className="field-row">
              <label>Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ICON_CHOICES.map((ic) => (
                  <button
                    key={ic}
                    className="icon-btn"
                    style={{ border: draft.icon === ic ? '2px solid var(--navy-dark)' : '1px solid var(--border)' }}
                    onClick={() => setDraft({ ...draft, icon: ic })}
                  >
                    <FeatureIcon name={ic} size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div className="field-row">
              <label>Color</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft({ ...draft, color: c })}
                    style={{ width: 24, height: 24, borderRadius: 6, background: c, border: draft.color === c ? '2px solid #0f172a' : '1px solid transparent' }}
                  />
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!draft.name.trim()} onClick={save}>
                {draft.id ? 'Save Changes' : 'Add Feature'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmId && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>Delete feature?</h3>
            <p>Existing steps using this feature will keep their data but show as unknown.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteFeature(confirmId); setConfirmId(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
