import { ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Overlay } from './Overlay';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  return (
    <Overlay open={open} onClose={onClose} align="center">
      <div role="dialog" aria-modal="true" aria-label={title} className={clsx('max-h-[88vh] w-[90%] overflow-y-auto rounded-[20px] bg-white shadow-pop', size === 'md' ? 'max-w-[680px]' : 'max-w-[900px]')}>
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[20px] border-b border-line bg-white px-6 pb-4 pt-5">
          <h2 className="text-[19px] font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-slate hover:bg-mist"><X size={18} /></button>
        </div>
        <div className="px-6 py-[22px]">{children}</div>
        {footer && <div className="sticky bottom-0 flex justify-end gap-2 rounded-b-[20px] border-t border-line bg-[#fbfcfd] px-6 py-3.5">{footer}</div>}
      </div>
    </Overlay>
  );
}
