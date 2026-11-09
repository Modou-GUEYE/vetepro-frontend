import { Send } from 'lucide-react';
import { Button } from '@/shared/ui';
import { CANAUX, CANAL_LABEL, Canal } from '../models/notification';

interface Props { canal: Canal; onCanal: (c: Canal) => void; onSend: () => void; sending: boolean; label?: string }

/** Choix du canal (e-mail, SMS, WhatsApp) et bouton d'envoi, côte à côte. */
export function ChannelSend({ canal, onCanal, onSend, sending, label = 'Envoyer' }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <select aria-label="Canal d'envoi" value={canal} onChange={(e) => onCanal(e.target.value as Canal)} className="h-8 rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-brand">
        {CANAUX.map((c) => <option key={c} value={c}>{CANAL_LABEL[c]}</option>)}
      </select>
      <Button variant="secondary" size="sm" loading={sending} onClick={onSend}><Send size={14} /> {label}</Button>
    </span>
  );
}
