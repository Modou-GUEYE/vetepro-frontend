import { useState } from 'react';
import { Button, Input, Modal, Select } from '@/shared/ui';
import { ALIAS_TYPES, Account, aliasError } from '../models/comptes';

const PLACEHOLDER: Record<string, string> = { Téléphone: '77 000 00 00', 'E-mail': 'paiement@cabinet.sn', 'Identifiant marchand': 'MON-CABINET' };

export function AliasModal({ wallets, error, busy, onSubmit, onClose }: { wallets: Account[]; error: string | null; busy: boolean; onSubmit: (v: { compte_id: string; type: string; valeur: string; defaut: boolean }) => void; onClose: () => void }) {
  const [compteId, setCompteId] = useState(wallets[0]?.id ?? '');
  const [type, setType] = useState<string>(ALIAS_TYPES[0]);
  const [valeur, setValeur] = useState('');
  const [defaut, setDefaut] = useState(false);
  const problem = aliasError(type, valeur);
  return (
    <Modal open onClose={onClose} title="Nouvel alias de réception"
      footer={<><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" loading={busy} disabled={!!problem || !compteId} onClick={() => onSubmit({ compte_id: compteId, type, valeur: valeur.trim(), defaut })}>Ajouter</Button></>}>
      <div className="space-y-4">
        <p className="text-xs text-slate">Un alias permet à vos clients de vous payer sans connaître vos coordonnées. L'alias par défaut est utilisé sur les QR codes et les demandes de paiement.</p>
        <Select label="Compte rattaché" value={compteId} onChange={(e) => setCompteId(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.nom}</option>)}</Select>
        <Select label="Type d'alias" value={type} onChange={(e) => setType(e.target.value)}>{ALIAS_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
        <Input label="Valeur *" placeholder={PLACEHOLDER[type]} value={valeur} onChange={(e) => setValeur(e.target.value)} error={valeur ? problem : undefined} />
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" className="accent-brand" checked={defaut} onChange={(e) => setDefaut(e.target.checked)} /> Définir comme alias par défaut</label>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
