import { atom } from 'jotai';

export interface Source {
  id: string;
  name: string;
  type: 'github_repo' | 'github_org' | 'documentation' | 'file_upload' | 'notion' | 'custom';
  status: 'active' | 'syncing' | 'error' | 'disabled';
  lastSyncedAt?: string;
  createdAt: string;
}

/** List of registered knowledge sources */
export const sourcesAtom = atom<Source[]>([]);

/** Whether sources are being loaded */
export const sourcesLoadingAtom = atom(false);
