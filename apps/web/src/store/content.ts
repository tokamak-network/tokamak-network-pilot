import { atom } from 'jotai';

export interface ContentEntry {
  id: string;
  title: string;
  body: string;
  project?: string;
  category?: string;
  tags: string[];
  author: string;
  isOutdated: boolean;
  createdAt: string;
  updatedAt: string;
}

/** List of curated content entries */
export const contentEntriesAtom = atom<ContentEntry[]>([]);

/** Whether content is being loaded */
export const contentLoadingAtom = atom(false);
