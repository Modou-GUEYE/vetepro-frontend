import { useState } from 'react';
import { formatDateTime, formatFcfa } from '@/core/utils/format';
import { Button, Input, Modal, Select } from '@/shared/ui';
import { Account, Row, TRANSFER_API, TRANSFER_LABEL, TransferType, emptyRow, rowsError, rowsTotal } from '../models/comptes';
import { TransferBody } from '../services/comptes.service';
import { RowsEditor } from './RowsEditor';

interface Props {
  type: TransferType; from?: string; accounts: Account[]; error: string | null; busy: boolean; sendingCode: boolean;
  onRequestCode: () => Promise<{ code_demo: string; expire_a: string }>; onSubmit: (b: TransferBody) => void; onClose: () => void;
}

/** Transfert en deux temps : saisie et contrôle, puis code de validation reçu par SMS. */
export function TransferModal({ type, from, accounts, error, busy, sendingCode, onRequestCode, onSubmit, onClose }: Props) {
  const [de, setDe] = useState(from ?? accounts[0]?.id ?? '');
  const [vers, setVers] = useState(accounts.find((a) => a.id !== (from ?? accounts[0]?.id))?.id ?? '');
  const [montant, setMontant] = useState('');
  const [rows, setRows] = useState<Row[]>(type === 'multiple' ? [emptyRow(), emptyRow()] : [emptyRow()]);
  const [motif, setMotif] = useState('');
  const [step, setStep] = useState<'saisie' | 'code'>('saisie');
  const [code, setCode] = useState('');
  const [demo, setDemo] = useState<{ code_demo: string; expire_a: string } | null>(null);

  const source = accounts.find((a) => a.id === de);
  const total = type === 'inter' ? (/^\d+$/.test(montant) ? Number(montant) : 0) : rowsTotal(rows);
  const problem = !source ? 'Choisissez le compte débité'
    : type === 'inter' ? (vers === de ? 'Choisissez un compte différent' : !/^\d+$/.test(montant) || Number(montant) < 1 ? 'Montant : nombre entier positif' : undefined)
    : rowsError(rows, false);
  const insufficient = source && total > source.solde ? `Solde insuffisant sur ${source.nom} (${formatFcfa(source.solde)})` : undefined;
  const blocked = problem ?? insufficient ?? (!motif.trim() ? 'Le motif est obligatoire' : undefined);

  const next = async () => { setDemo(await onRequestCode()); setStep('code'); };
  const submit = () => onSubmit({
    type: TRANSFER_API[type], compte_debite: de, motif, code,
    ...(type === 'inter' ? { compte_credite: vers, montant: Number(montant) } : { beneficiaires: rows.map((r) => ({ nom: r.nom.trim(), alias: r.alias.trim(), montant: Number(r.montant) })) }),
  });

  return (
    <Modal open onClose={onClose} title={TRANSFER_LABEL[type]}
      footer={step === 'saisie'
        ? <><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" loading={sendingCode} disabled={!!blocked} onClick={() => void next()}>Continuer</Button></>
        : <><Button variant="secondary" size="sm" onClick={() => setStep('saisie')}>Retour</Button><Button size="sm" loading={busy} disabled={code.length !== 6} onClick={submit}>Valider le transfert</Button></>}>
      {step === 'saisie' ? (
        <div className="space-y-4">
          <Select label="Compte débité" value={de} onChange={(e) => setDe(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.nom}, {formatFcfa(a.solde)}</option>)}</Select>
          {type === 'inter' ? (
            <div className="grid grid-cols-2 gap-3">
              <Select label="Compte crédité" value={vers} onChange={(e) => setVers(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}</Select>
              <Input label="Montant (FCFA)" inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value)} />
            </div>
          ) : <RowsEditor rows={rows} onChange={setRows} multiple={type === 'multiple'} nameLabel="Bénéficiaire" />}
          <Input label="Motif *" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Reversement, salaire, fournisseur" />
          {(problem && (type === 'inter' ? vers === de || (montant !== '' && !/^\d+$/.test(montant)) : rows.some((r) => r.nom || r.alias || r.montant))) && <p className="text-xs text-danger">{problem}</p>}
          {insufficient && <p role="alert" className="text-xs text-danger">{insufficient}</p>}
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="space-y-1.5 rounded-lg border border-line p-3 text-[13px]">
            <div className="flex justify-between"><dt className="text-slate">Depuis</dt><dd className="font-semibold">{source?.nom}</dd></div>
            {type === 'inter'
              ? <div className="flex justify-between"><dt className="text-slate">Vers</dt><dd className="font-semibold">{accounts.find((a) => a.id === vers)?.nom}</dd></div>
              : rows.map((r, i) => <div key={i} className="flex justify-between"><dt className="text-slate">{r.nom} ({r.alias})</dt><dd className="tabular-nums">{formatFcfa(Number(r.montant))}</dd></div>)}
            <div className="flex justify-between border-t border-line pt-1.5 font-bold"><dt>Total</dt><dd className="tabular-nums">{formatFcfa(total)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate">Motif</dt><dd>{motif}</dd></div>
          </dl>
          <p className="rounded-lg bg-mist px-3 py-2 text-xs text-slate">Saisissez le code reçu par SMS pour valider le transfert. Code de démonstration : <b className="text-ink">{demo?.code_demo}</b> (valable jusqu'à {demo ? formatDateTime(demo.expire_a) : ''}).</p>
          <Input label="Code de validation" inputMode="numeric" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} wrapperClassName="max-w-[200px]" />
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
