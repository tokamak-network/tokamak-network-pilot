import { atom } from 'jotai';
import type { ProjectResponse } from '@/lib/api';

/** Minimal project info stored as the active context */
export interface ActiveProject {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  isNewsEnabled: boolean;
}

/** List of all projects */
export const projectsAtom = atom<ProjectResponse[]>([]);

/** Whether projects are being loaded */
export const projectsLoadingAtom = atom(false);

function loadActiveProject(): ActiveProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('tokamak_active_project');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const activeProjectBaseAtom = atom<ActiveProject | null>(loadActiveProject());

/** The currently selected project context. Persisted to localStorage. */
export const activeProjectAtom = atom(
  (get) => get(activeProjectBaseAtom),
  (_get, set, value: ActiveProject | null) => {
    set(activeProjectBaseAtom, value);
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem('tokamak_active_project', JSON.stringify(value));
      } else {
        localStorage.removeItem('tokamak_active_project');
      }
    }
  },
);
