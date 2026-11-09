import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';
export interface ToastItem { id: number; kind: ToastKind; message: string }

interface ToastState {
  items: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (kind, message) => {
    const id = ++seq;
    set((s) => ({ items: [...s.items.slice(-3), { id, kind, message }] }));
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

/** Utilisable hors React (intercepteurs HTTP). */
export const toast = {
  info: (m: string) => useToastStore.getState().push('info', m),
  success: (m: string) => useToastStore.getState().push('success', m),
  warning: (m: string) => useToastStore.getState().push('warning', m),
  error: (m: string) => useToastStore.getState().push('error', m),
};
