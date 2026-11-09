import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Overlay } from './Overlay';

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Overlay open={open} onClose={onClose} align="right">
      <aside role="dialog" aria-modal="true" aria-label={title} className="flex h-full w-full max-w-[480px] flex-col bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-[17px] font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-slate hover:bg-mist"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-3.5">{footer}</div>}
      </aside>
    </Overlay>
  );
}
