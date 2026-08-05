import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc,
} from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { defaultCategories, defaultFeatures, defaultPlants } from '../data/defaultData';
import { Category, Feature, Plant, Program, SaveState, Treatment } from '../types';
import { calculateTreatmentTotal, calculateProgramTotal } from '../utils/timeUtils';

interface AppContextValue {
  ready: boolean;
  saveState: SaveState;
  treatmentsLoaded: boolean;
  programsLoaded: boolean;

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
      () => {
        // fall back silently to local defaults on permission/connection errors
        setLoaded(true);
      },
    );
    return () => unsub();
  }, [name, orderField]);
  return [items, setItems, loaded] as const;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [plants] = useCollectionState<Plant>('plants', defaultPlants);
  const [categories] = useCollectionState<Category>('categories', defaultCategories);
  const [features] = useCollectionState<Feature>('features', defaultFeatures);
  const [treatments, setTreatments, treatmentsLoaded] = useCollectionState<Treatment>('treatments', [], 'number');
  const [programs, setProgramsRaw, programsLoaded] = useCollectionState<Program>('programs', [], 'number');

  const [currentPlantId, setCurrentPlantIdState] = useState<string>(() => {
    return localStorage.getItem('style-textile:currentPlant') || 'plant-1';
  });
  const setCurrentPlantId = useCallback((id: string) => {
    setCurrentPlantIdState(id);
    localStorage.setItem('style-textile:currentPlant', id);
  }, []);

  // Seed Firestore with defaults on first run (best-effort, ignored if offline/no permissions)
  useEffect(() => {
    if (!firebaseReady) return;
    (async () => {
      try {
        for (const p of defaultPlants) {
          await setDoc(doc(db, 'plants', p.id), p, { merge: true }).catch(() => {});
        }
        for (const c of defaultCategories) {
          await setDoc(doc(db, 'categories', c.id), c, { merge: true }).catch(() => {});
        }
        for (const f of defaultFeatures) {
          await setDoc(doc(db, 'features', f.id), f, { merge: true }).catch(() => {});
        }
      } catch {
        /* offline / not configured — app still works from local defaults */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const withSaveState = useCallback(async (fn: () => Promise<void>) => {
    setSaveState('saving');
    try {
      await fn();
      setSaveState('saved');
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch (e) {
      console.error(e);
      setSaveState('error');
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

  const value: AppContextValue = {
    ready: true,
    saveState,
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
