import { useState } from 'react';
import { formatDate, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Input, Modal, Select } from '@/shared/ui';
import { AVANCEMENT_LABEL, AVANCEMENT_TONE, Client, PaymentRequest, RECIPIENT_LABEL, RECIPIENT_TONE, Row, emptyRow, rowsError, rowsTotal } from '../models/comptes';
import { aliasOkFor } from '@/modules/paiements/models/paiements';
import { RequestBody } from '../services/comptes.service';
import { RowsEditor } from './RowsEditor';

const CHANNELS = ['Wave', 'Orange Money', 'PI-SPI'];
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export function RequestFormModal({ multiple, clients, error, busy, onSubmit, onClose }: { multiple: boolean; clients: Client[]; error: string | null; busy: boolean; onSubmit: (b: RequestBody) => void; onClose: () => void }) {
  const [canal, setCanal] = useState(CHANNELS[0]);
  const [echeance, setEcheance] = useState(inDays(3));
  const [motif, setMotif] = useState('');
  const [rows, setRows] = useState<Row[]>(multiple ? [emptyRow(), emptyRow()] : [emptyRow()]);
  const problem = rowsError(rows, true, (a) => aliasOkFor(canal, a.trim())) ?? (!motif.trim() ? 'Le motif est obligatoire' : undefined);

  const addClient = (id: string) => {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    const free = rows.findIndex((r) => !r.nom && !r.alias);
    if (free >= 0) setRows(rows.map((r, i) => (i === free ? { ...r, nom: c.nom, alias: c.telephone } : r)));
    else if (multiple) setRows([...rows, { nom: c.nom, alias: c.telephone, montant: '' }]);
    else setRows([{ ...rows[0], nom: c.nom, alias: c.telephone }]);
  };

  return (
    <Modal open onClose={onClose} title={multiple ? 'Demande de paiement multiple' : 'Demande de paiement'}
      footer={<><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" loading={busy} disabled={!!problem}
        onClick={() => onSubmit({ multiple, canal, echeance, motif, destinataires: rows.map((r) => ({ nom: r.nom.trim(), alias: r.alias.trim(), montant: Number(r.montant) })) })}>Envoyer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Canal" value={canal} onChange={(e) => setCanal(e.target.value)}>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</Select>
          <Input label="Échéance" type="date" min={inDays(0)} value={echeance} onChange={(e) => setEcheance(e.target.value)} />
        </div>
        <Input label="Motif *" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Acompte, participation à une campagne" />
        <Select label="Ajouter un propriétaire" value="" onChange={(e) => addClient(e.target.value)}>
          <option value="">Choisir un propriétaire</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </Select>
        <RowsEditor rows={rows} onChange={setRows} multiple={multiple} nameLabel="Destinataire" />
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        {rows.some((r) => r.nom || r.alias || r.montant) && problem && <p className="text-xs text-danger">{problem}</p>}
      </div>
    </Modal>
  );
}

export function RequestDetailModal({ request, canUpdate, busy, onAct, onClose }: { request?: PaymentRequest; canUpdate: boolean; busy: boolean; onAct: (index: number, action: 'relance' | 'paye' | 'refuse' | 'annule') => void; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={request ? `Demande ${request.reference}` : 'Demande de paiement'} size="lg" footer={<Button variant="secondary" size="sm" onClick={onClose}>Fermer</Button>}>
      {!request ? null : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-[13px] text-slate">{request.motif}<br />{request.canal}, échéance le {formatDate(request.echeance)}</p>
            <div className="text-right"><p className="text-xl font-bold tabular-nums">{formatFcfa(request.montant)}</p><Badge tone={AVANCEMENT_TONE[request.avancement]}>{AVANCEMENT_LABEL[request.avancement]}</Badge></div>
          </div>
          <ul className="divide-y divide-[#eef2f5] rounded-lg border border-line text-[13px]">
            {request.destinataires.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <span><b>{r.nom}</b> <span className="text-slate">({r.alias})</span></span>
                <span className="flex flex-wrap items-center gap-2">
                  <b className="tabular-nums">{formatFcfa(r.montant)}</b><Badge tone={RECIPIENT_TONE[r.statut]}>{RECIPIENT_LABEL[r.statut]}</Badge>
                  {canUpdate && r.statut === 'refuse' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAct(i, 'relance')}>Relancer</Button>}
                  {canUpdate && r.statut === 'attente' && (
                    <>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAct(i, 'relance')}>Relancer</Button>
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => onAct(i, 'annule')}>Annuler</Button>
                      <Button size="sm" variant="success" disabled={busy} title="Démonstration : simule le paiement du destinataire" onClick={() => onAct(i, 'paye')}>Simuler le paiement</Button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-faint">Total à recevoir : {formatFcfa(rowsTotal(request.destinataires.map((r) => ({ nom: r.nom, alias: r.alias, montant: String(r.montant) }))))}. Un paiement reçu crédite le portefeuille {request.canal}.</p>
        </div>
      )}
    </Modal>
  );
}
