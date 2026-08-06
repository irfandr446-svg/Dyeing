import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc,
} from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { defaultCategories, defaultFeatures, defaultPlants, buildExampleTreatments } from '../data/defaultData';
import { Category, Feature, Plant, Program, SaveState, Treatment } from '../types';
import { calculateTreatmentTotal, calculateProgramTotal } from '../utils/timeUtils';

interface AppContextValue {
  ready: boolean;
  saveState: SaveState;
  dbError: string | null;
  treatmentsLoaded: boolean;
  programsLoaded: boolean;
  runConnectionTest: () => Promise<{ step: string; ok: boolean; detail: string }[]>;

  plants: Plant[];
  categories: Category[];
  features: Feature[];
  treatments: Treatment[];
  programs: Program[];

  currentPlantId: string;
  setCurrentPlantId: (id: string) => void;

  addPlant: (name: string) => Promise<void>;
  renamePlant: (id: string, name: string) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;

  addCategory: (name: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addFeature: (feature: Omit<Feature, 'id' | 'order' | 'isCustom'>) => Promise<void>;
  updateFeature: (id: string, patch: Partial<Feature>) => Promise<void>;
  deleteFeature: (id: string) => Promise<void>;

  saveTreatment: (treatment: Treatment) => Promise<void>;
  deleteTreatment: (id: string) => Promise<void>;

  saveProgram: (program: Program) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function useCollectionState<T extends { id: string }>(
  name: string,
  fallback: T[],
  orderField = 'order',
  onError?: (msg: string) => void,
) {
  const [items, setItems] = useState<T[]>(fallback);
  const [loaded, setLoaded] = useState(!firebaseReady);
  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, name), orderBy(orderField as string));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
        }
        setLoaded(true);
      },
      (err) => {
        // fall back silently to local defaults on permission/connection errors,
        // but surface the reason so it's diagnosable from Settings/Header.
        setLoaded(true);
        onError?.(`Firestore error on "${name}": ${err.code || err.message}`);
      },
    );
    return () => unsub();
  }, [name, orderField]);
  return [items, setItems, loaded] as const;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dbError, setDbError] = useState<string | null>(null);
  const [plants] = useCollectionState<Plant>('plants', defaultPlants, 'order', setDbError);
  const [categories] = useCollectionState<Category>('categories', defaultCategories, 'order', setDbError);
  const [features] = useCollectionState<Feature>('features', defaultFeatures, 'order', setDbError);
  const [treatments, setTreatments, treatmentsLoaded] = useCollectionState<Treatment>('treatments', [], 'number', setDbError);
  const [programs, setProgramsRaw, programsLoaded] = useCollectionState<Program>('programs', [], 'number', setDbError);

  const [currentPlantId, setCurrentPlantIdState] = useState<string>(() => {
    return localStorage.getItem('style-textile:currentPlant') || 'plant-1';
  });
  const setCurrentPlantId = useCallback((id: string) => {
    setCurrentPlantIdState(id);
    localStorage.setItem('style-textile:currentPlant', id);
  }, []);

  // Seed Firestore with defaults on first run (best-effort; surfaces a clear
  // error instead of silently doing nothing if the database can't be reached —
  // this is almost always a wrong/missing VITE_FIREBASE_FIRESTORE_DATABASE_ID
  // or undeployed firestore.rules).
  useEffect(() => {
    if (!firebaseReady) return;
    (async () => {
      try {
        for (const p of defaultPlants) await setDoc(doc(db, 'plants', p.id), p, { merge: true });
        for (const c of defaultCategories) await setDoc(doc(db, 'categories', c.id), c, { merge: true });
        for (const f of defaultFeatures) await setDoc(doc(db, 'features', f.id), f, { merge: true });

        // Seed two example Treatments matching the mill's process-sheet format,
        // but ONLY if the Treatments collection is completely empty — never
        // overwrite a user's real data.
        const existingTreatments = await getDocs(collection(db, 'treatments'));
        if (existingTreatments.empty) {
          const examples = buildExampleTreatments(defaultPlants[0].id, defaultCategories[2].id); // Plant 1, Polyester Dyeing
          for (const t of examples) {
            const total = calculateTreatmentTotal(t.steps);
            await setDoc(doc(db, 'treatments', t.id), { ...t, totalDurationMinutes: total });
          }
        }
      } catch (e: any) {
        setDbError(`Could not write to Firestore: ${e?.code || e?.message || e}. Check VITE_FIREBASE_FIRESTORE_DATABASE_ID and that firestore.rules is deployed.`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const withSaveState = useCallback(async (fn: () => Promise<void>) => {
    setSaveState('saving');
    try {
      await fn();
      setSaveState('saved');
      setDbError(null);
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch (e: any) {
      console.error(e);
      setSaveState('error');
      setDbError(`Save failed: ${e?.code || e?.message || e}`);
    }
  }, []);

  // ---- Plants ----
  const addPlant = useCallback((name: string) => withSaveState(async () => {
    const id = `plant-${Date.now()}`;
    await setDoc(doc(db, 'plants', id), { id, name, order: plants.length } as Plant);
  }), [plants.length, withSaveState]);

  const renamePlant = useCallback((id: string, name: string) => withSaveState(async () => {
    await updateDoc(doc(db, 'plants', id), { name });
  }), [withSaveState]);

  const deletePlant = useCallback((id: string) => withSaveState(async () => {
    await deleteDoc(doc(db, 'plants', id));
  }), [withSaveState]);

  // ---- Categories ----
  const addCategory = useCallback((name: string) => withSaveState(async () => {
    const id = `cat-${Date.now()}`;
    await setDoc(doc(db, 'categories', id), { id, name, order: categories.length } as Category);
  }), [categories.length, withSaveState]);

  const renameCategory = useCallback((id: string, name: string) => withSaveState(async () => {
    await updateDoc(doc(db, 'categories', id), { name });
  }), [withSaveState]);

  const deleteCategory = useCallback((id: string) => withSaveState(async () => {
    await deleteDoc(doc(db, 'categories', id));
  }), [withSaveState]);

  // ---- Features ----
  const addFeature = useCallback((feature: Omit<Feature, 'id' | 'order' | 'isCustom'>) => withSaveState(async () => {
    const id = `feature-custom-${Date.now()}`;
    await setDoc(doc(db, 'features', id), { ...feature, id, order: features.length, isCustom: true } as Feature);
  }), [features.length, withSaveState]);

  const updateFeature = useCallback((id: string, patch: Partial<Feature>) => withSaveState(async () => {
    await updateDoc(doc(db, 'features', id), patch as any);
  }), [withSaveState]);

  const deleteFeature = useCallback((id: string) => withSaveState(async () => {
    await deleteDoc(doc(db, 'features', id));
  }), [withSaveState]);

  // ---- Treatments ----
  const saveTreatment = useCallback((treatment: Treatment) => withSaveState(async () => {
    const total = calculateTreatmentTotal(treatment.steps);
    const now = new Date().toISOString();
    const payload: Treatment = {
      ...treatment,
      totalDurationMinutes: total,
      updatedAt: now,
      createdAt: treatment.createdAt || now,
    };
    await setDoc(doc(db, 'treatments', treatment.id), payload);
    setTreatments((prev) => {
      const idx = prev.findIndex((t) => t.id === treatment.id);
      if (idx === -1) return [...prev, payload];
      const copy = [...prev];
      copy[idx] = payload;
      return copy;
    });
  }), [setTreatments, withSaveState]);

  const deleteTreatment = useCallback((id: string) => withSaveState(async () => {
    await deleteDoc(doc(db, 'treatments', id));
    setTreatments((prev) => prev.filter((t) => t.id !== id));
  }), [setTreatments, withSaveState]);

  // ---- Programs ----
  const treatmentMap = useMemo(() => Object.fromEntries(treatments.map((t) => [t.id, t])), [treatments]);

  const saveProgram = useCallback((program: Program) => withSaveState(async () => {
    const total = calculateProgramTotal(program, treatmentMap);
    const now = new Date().toISOString();
    const payload: Program = {
      ...program,
      totalDurationMinutes: total,
      updatedAt: now,
      createdAt: program.createdAt || now,
    };
    await setDoc(doc(db, 'programs', program.id), payload);
    setProgramsRaw((prev) => {
      const idx = prev.findIndex((p) => p.id === program.id);
      if (idx === -1) return [...prev, payload];
      const copy = [...prev];
      copy[idx] = payload;
      return copy;
    });
  }), [treatmentMap, setProgramsRaw, withSaveState]);

  const deleteProgram = useCallback((id: string) => withSaveState(async () => {
    await deleteDoc(doc(db, 'programs', id));
    setProgramsRaw((prev) => prev.filter((p) => p.id !== id));
  }), [setProgramsRaw, withSaveState]);

  const runConnectionTest = useCallback(async () => {
    const results: { step: string; ok: boolean; detail: string }[] = [];
    results.push({ step: 'Config present', ok: firebaseReady, detail: firebaseReady ? 'Firebase config loaded from .env' : 'Missing VITE_FIREBASE_* values — copy .env.example to .env' });
    if (!firebaseReady) return results;

    const probeId = `probe-${Date.now()}`;
    const ref = doc(db, '_diagnostics', probeId);
    try {
      await setDoc(ref, { ts: new Date().toISOString() });
      results.push({ step: 'Write test document', ok: true, detail: `Wrote _diagnostics/${probeId}` });
    } catch (e: any) {
      results.push({ step: 'Write test document', ok: false, detail: `${e?.code || ''} ${e?.message || e}`.trim() });
      results.push({ step: 'Diagnosis', ok: false, detail: e?.code === 'permission-denied'
        ? 'Security rules are blocking writes. Deploy firestore.rules: firebase deploy --only firestore:rules'
        : 'This usually means the database ID is wrong (check VITE_FIREBASE_FIRESTORE_DATABASE_ID) or the project has no Firestore database yet.' });
      return results;
    }

    try {
      const snap = await getDoc(ref);
      results.push({ step: 'Read test document', ok: snap.exists(), detail: snap.exists() ? 'Read back successfully' : 'Document not found after write' });
    } catch (e: any) {
      results.push({ step: 'Read test document', ok: false, detail: `${e?.code || ''} ${e?.message || e}`.trim() });
    }

    try {
      await deleteDoc(ref);
      results.push({ step: 'Clean up test document', ok: true, detail: 'Deleted probe document' });
    } catch (e: any) {
      results.push({ step: 'Clean up test document', ok: false, detail: `${e?.code || ''} ${e?.message || e}`.trim() });
    }

    results.push({ step: 'Overall', ok: results.every((r) => r.ok), detail: results.every((r) => r.ok) ? 'Firestore read/write is working correctly.' : 'See failing step above.' });
    return results;
  }, []);

  const value: AppContextValue = {
    ready: true,
    saveState,
    dbError,
    runConnectionTest,
    treatmentsLoaded,
    programsLoaded,
    plants,
    categories,
    features,
    treatments,
    programs,
    currentPlantId,
    setCurrentPlantId,
    addPlant,
    renamePlant,
    deletePlant,
    addCategory,
    renameCategory,
    deleteCategory,
    addFeature,
    updateFeature,
    deleteFeature,
    saveTreatment,
    deleteTreatment,
    saveProgram,
    deleteProgram,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
