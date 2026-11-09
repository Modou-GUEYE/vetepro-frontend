import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Fond flouté + fermeture Échap, partagé par Modal et Drawer. */
export function Overlay({ open, onClose, children, align }: { open: boolean; onClose: () => void; children: ReactNode; align: 'center' | 'right' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-[1000] flex bg-[rgba(8,28,34,.55)] backdrop-blur-md ${align === 'center' ? 'items-center justify-center' : 'justify-end'}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>,
    document.body,
  );
}
