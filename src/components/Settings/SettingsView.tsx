import React, { useState } from 'react';
import { CheckCircle2, XCircle, PlayCircle } from 'lucide-react';
import { firebaseReady } from '../../firebase';
import { useApp } from '../../context/AppContext';

export default function SettingsView() {
  const { plants, categories, features, treatments, programs, dbError, runConnectionTest } = useApp();
  const dbId = (import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{ step: string; ok: boolean; detail: string }[] | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResults(null);
    const r = await runConnectionTest();
    setResults(r);
    setTesting(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Company Style Textile · Department Process &amp; Machine R&amp;D</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Data connection</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          Firebase config: <strong style={{ color: firebaseReady ? 'var(--green)' : 'var(--red)' }}>
            {firebaseReady ? 'Present' : 'Missing — copy .env.example to .env'}
          </strong><br />
          Firestore database ID: <strong>{dbId || '(default)'}</strong>
        </div>

        <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={runTest} disabled={testing}>
          <PlayCircle size={13} /> {testing ? 'Testing…' : 'Run Connection Test'}
        </button>

        {results && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                {r.ok ? <CheckCircle2 size={15} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} /> : <XCircle size={15} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />}
                <div>
                  <strong>{r.step}:</strong> <span style={{ color: 'var(--text-muted)' }}>{r.detail}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {dbError && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12 }}>
            <strong style={{ color: 'var(--red)' }}>Latest Firestore error:</strong> <span style={{ color: '#7f1d1d' }}>{dbError}</span>
            <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
              Most common causes:
              <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                <li>
                  <strong>Wrong/missing database ID.</strong> Projects auto-provisioned by AI Studio / Gemini often get
                  a Firestore database with a custom ID (not "(default)"). Open Firebase Console → Firestore Database —
                  the ID appears right after "Cloud Firestore &gt;" in the breadcrumb and in the database picker. Copy it into{' '}
                  <code>VITE_FIREBASE_FIRESTORE_DATABASE_ID</code> in <code>.env</code>, then rebuild.
                </li>
                <li>
                  <strong>Security rules not deployed.</strong> A brand-new Firestore database denies all access by default:
                  <pre style={{ background: '#fff', padding: 8, borderRadius: 4, marginTop: 6, overflowX: 'auto' }}>
{`firebase login
firebase use --add        # pick this project
firebase deploy --only firestore:rules`}
                  </pre>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Data summary</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.9 }}>
          {plants.length} Plants · {categories.length} Categories · {features.length} Features<br />
          {treatments.length} Treatments · {programs.length} Programs
        </div>
      </div>
    </div>
  );
}
