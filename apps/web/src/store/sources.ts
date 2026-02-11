import { atom } from 'jotai';
import type { SourceResponse } from '@/lib/api';

/** List of registered knowledge sources */
export const sourcesAtom = atom<SourceResponse[]>([]);

/** Whether sources are being loaded */
export const sourcesLoadingAtom = atom(false);
