import { atom } from 'jotai';
import type { AuthUser } from '@/lib/api';

/** Current authenticated user (null = not logged in) */
export const userAtom = atom<AuthUser | null>(null);

/** Whether auth state is being loaded/checked */
export const authLoadingAtom = atom(false);

/** Whether the user is authenticated */
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null);
