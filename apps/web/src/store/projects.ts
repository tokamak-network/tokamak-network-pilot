import { atom } from 'jotai';
import type { ProjectResponse } from '@/lib/api';

/** List of all projects */
export const projectsAtom = atom<ProjectResponse[]>([]);

/** Whether projects are being loaded */
export const projectsLoadingAtom = atom(false);
