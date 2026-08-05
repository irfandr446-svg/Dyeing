import React from 'react';
import { firebaseReady } from '../../firebase';
import { useApp } from '../../context/AppContext';

export default function SettingsView() {
  const { plants, categories, features, treatments, programs, dbError } = useApp();
  const dbId = (import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Company Style Textile · Department Process &amp; Machine R&amp;D</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 620, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Data connection</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          Firebase config: <strong style={{ color: firebaseReady ? 'var(--green)' : 'var(--red)' }}>
            {firebaseReady ? 'Present' : 'Missing — copy .env.example to .env and fill it in'}
          </strong><br />
          Firestore database ID: <strong>{dbId || '(default)'}</strong>
        </div>

        {dbError && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12 }}>
            <strong style={{ color: 'var(--red)' }}>Firestore error:</strong> <span style={{ color: '#7f1d1d' }}>{dbError}</span>
            <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
              This is almost always one of two things:
              <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                <li>
                  <strong>Wrong/missing database ID.</strong> If your Firestore database was auto-created with a
                  custom ID (not the default one), open Firebase Console → Firestore Database — the ID appears right
                  after "Cloud Firestore &gt;" in the breadcrumb and in the database picker dropdown. Copy it into{' '}
                  <code>VITE_FIREBASE_FIRESTORE_DATABASE_ID</code> in your <code>.env</code>, then restart the dev server / rebuild.
                </li>
                <li>
                  <strong>Security rules not deployed.</strong> A brand-new Firestore database denies all reads/writes
                  by default. Deploy the included <code>firestore.rules</code>:
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

        {!dbError && firebaseReady && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--green)' }}>No connection issues detected.</div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 620 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Data summary</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.9 }}>
          {plants.length} Plants · {categories.length} Categories · {features.length} Features<br />
          {treatments.length} Treatments · {programs.length} Programs
        </div>
      </div>
    </div>
  );
}
