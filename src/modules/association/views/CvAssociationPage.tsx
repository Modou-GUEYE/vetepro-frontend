import { Archive, Check, Download, Info, Paperclip, RotateCcw } from 'lucide-react';
import { formatFileSize } from '@/core/http/download';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, Modal, Panel } from '@/shared/ui';
import { ARCHIVE_LABEL, CV_FILTERS, CV_STATE_LABEL, CV_STATE_TONE, Cv, DISPO_LABEL, PROFIL_LABEL, cvState } from '../models/association';
import { useCvAssociationViewModel } from '../viewmodels/useCvAssociationViewModel';
import { AssoColumn, AssoTable } from './AssoTable';

/** Validation et archivage des CV déposés sur le portail : seuls les profils validés sont visibles des cabinets membres. */
export function CvAssociationPage() {
  const vm = useCvAssociationViewModel();
  const actions = (c: Cv) => {
    const s = cvState(c);
    if (s === 'retire') return null;
    return (
      <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        {s !== 'valide' && s !== 'archive' && <Button size="sm" variant="success" onClick={() => vm.review(c.id, 'valider')}><Check size={13} /> Valider</Button>}
        {s === 'archive' && <Button size="sm" variant="secondary" onClick={() => vm.review(c.id, 'restaurer')}><RotateCcw size={13} /> Remettre à valider</Button>}
        {s !== 'archive' && <Button size="sm" variant="secondary" onClick={() => vm.review(c.id, 'archiver')}><Archive size={13} /> Archiver</Button>}
      </div>
    );
  };
  const columns: AssoColumn<Cv>[] = [
    { key: 'nom', header: 'Candidat', render: (c) => <div><b>{c.nom}</b>{c.fichier && <Paperclip size={12} aria-label="CV joint" className="ml-1.5 inline text-brand" />}<div className="text-xs text-slate">{c.telephone}{c.email ? `, ${c.email}` : ''}</div></div> },
    { key: 'profil', header: 'Profil', render: (c) => PROFIL_LABEL[c.profil] ?? c.profil },
    { key: 'ville', header: 'Ville', render: (c) => c.ville },
    { key: 'exp', header: 'Expérience', className: 'whitespace-nowrap', render: (c) => `${c.experience} an${c.experience > 1 ? 's' : ''}` },
    { key: 'dispo', header: 'Disponibilité', className: 'whitespace-nowrap', render: (c) => DISPO_LABEL[c.disponibilite] ?? c.disponibilite },
    { key: 'comp', header: 'Compétences', render: (c) => <span className="text-xs">{c.competences.join(', ')}</span> },
    { key: 'dep', header: 'Déposé le', className: 'whitespace-nowrap', render: (c) => formatDate(c.depose_le) },
    { key: 'statut', header: 'Statut', render: (c) => <Badge tone={CV_STATE_TONE[cvState(c)]}>{CV_STATE_LABEL[cvState(c)]}</Badge> },
    { key: 'act', header: '', render: actions },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg2 border border-info/20 bg-info-pale px-5 py-4 text-[13px] text-info-text">
        <Info size={20} className="mt-0.5 shrink-0" />
        <p>Un CV déposé sur le portail a le statut « Nouveau » et reste invisible des cabinets jusqu'à sa validation. Les profils sont archivés automatiquement 12 mois après leur dépôt. Un candidat peut demander le retrait de son profil à tout moment.</p>
      </div>
      <Panel title="CVthèque du réseau" count={`${vm.cvs.length} profil${vm.cvs.length > 1 ? 's' : ''}`} actions={
        <div role="group" aria-label="Statut" className="flex gap-1.5">
          {CV_FILTERS.map((f) => <button key={f.key} type="button" aria-pressed={vm.statut === f.key} onClick={() => vm.setStatut(f.key)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${vm.statut === f.key ? 'border-brand bg-brand-pale text-brand-text' : 'border-line bg-white text-slate hover:bg-mist'}`}>{f.label}</button>)}
        </div>
      }>
        <AssoTable columns={columns} rows={vm.cvs} rowKey={(c) => c.id} onRowClick={vm.openDetail} loading={vm.loading} emptyTitle="Aucun profil" />
      </Panel>

      <Modal open={!!vm.detail} onClose={vm.closeDetail} title={vm.detail?.nom ?? 'Profil'} footer={vm.detail && <>{actions(vm.detail)}<Button variant="secondary" onClick={vm.closeDetail}>Fermer</Button></>}>
        {vm.detail && (
          <div className="space-y-4 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={CV_STATE_TONE[cvState(vm.detail)]}>{CV_STATE_LABEL[cvState(vm.detail)]}</Badge>
              {vm.detail.archive_par && <span className="text-slate">{ARCHIVE_LABEL[vm.detail.archive_par]}</span>}
            </div>
            <dl className="grid grid-cols-[140px_1fr] gap-y-1.5">
              <dt className="text-slate">Profil</dt><dd className="font-medium">{PROFIL_LABEL[vm.detail.profil] ?? vm.detail.profil}</dd>
              <dt className="text-slate">Ville</dt><dd className="font-medium">{vm.detail.ville}</dd>
              <dt className="text-slate">Expérience</dt><dd className="font-medium">{vm.detail.experience} an{vm.detail.experience > 1 ? 's' : ''}</dd>
              <dt className="text-slate">Disponibilité</dt><dd className="font-medium">{DISPO_LABEL[vm.detail.disponibilite] ?? vm.detail.disponibilite}</dd>
              <dt className="text-slate">Téléphone</dt><dd className="font-medium">{vm.detail.telephone}</dd>
              <dt className="text-slate">E-mail</dt><dd className="font-medium">{vm.detail.email || 'Non renseigné'}</dd>
              <dt className="text-slate">CV joint</dt><dd className="font-medium">{vm.detail.fichier ? <button type="button" disabled={vm.downloading} onClick={() => vm.download(vm.detail!)} className="inline-flex items-center gap-1.5 text-brand-text hover:underline disabled:opacity-60"><Download size={13} /> {vm.detail.fichier.nom} ({formatFileSize(vm.detail.fichier.taille)})</button> : 'Aucun fichier'}</dd>
              <dt className="text-slate">Compétences</dt><dd className="font-medium">{vm.detail.competences.join(', ') || 'Non renseignées'}</dd>
              <dt className="text-slate">Origine</dt><dd className="font-medium">{vm.detail.source === 'site' ? 'Portail public' : 'Association'}</dd>
              <dt className="text-slate">Consentement</dt><dd className="font-medium">Donné le {formatDate(vm.detail.consentement.date)} (version {vm.detail.consentement.version})</dd>
            </dl>
            <p className="whitespace-pre-wrap rounded-lg bg-mist px-4 py-3">{vm.detail.presentation || 'Aucune présentation.'}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
