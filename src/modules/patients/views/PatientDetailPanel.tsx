import { Mail, Pencil, Phone, Plus, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ageLabel, formatDate, formatDateTime } from '@/core/utils/format';
import { Badge, Button, EmptyState, Skeleton } from '@/shared/ui';
import { PatientDetail, REPRO_LABEL, SEXE_LABEL } from '../models/patient';
import { PatientConsultationsTab } from '@/modules/consultations/views/PatientConsultationsTab';
import { PatientVaccinsTab } from '@/modules/vaccinations/views/PatientVaccinsTab';
import { PatientTab } from '../viewmodels/usePatientsViewModel';

const TABS: { key: PatientTab; label: string }[] = [
  { key: 'dossier', label: 'Dossier' }, { key: 'consultations', label: 'Consultations' }, { key: 'vaccins', label: 'Vaccins' }, { key: 'historique', label: 'Historique' },
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><dt className="text-[11px] font-semibold uppercase tracking-[.7px] text-slate">{label}</dt><dd className="mt-0.5 text-[14px] font-medium">{children || <span className="text-faint">—</span>}</dd></div>
);
const Section = ({ children }: { children: React.ReactNode }) => (
  <h4 className="mb-3 mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate first:mt-0">{children}<span className="h-px flex-1 bg-line" /></h4>
);

interface Props {
  patient?: PatientDetail; loading: boolean; error: boolean; tab: PatientTab; onTab: (t: PatientTab) => void; canEdit: boolean; onEdit: () => void;
  canConsult: boolean; onNewConsult: () => void; onOpenConsult: (id: string) => void;
  canVaccinate: boolean; onNewVaccine: () => void;
}

export function PatientDetailPanel({ patient: p, loading, error, tab, onTab, canEdit, onEdit, canConsult, onNewConsult, onOpenConsult, canVaccinate, onNewVaccine }: Props) {
  if (loading) return <div className="space-y-4 p-6"><Skeleton className="h-14" /><Skeleton className="h-10" /><Skeleton className="h-40" /></div>;
  if (error) return <EmptyState title="Dossier introuvable" description="Ce dossier n'existe pas ou a été retiré." />;
  if (!p) return <EmptyState title="Sélectionnez un dossier" description="Choisissez un animal ou un troupeau dans la liste pour voir sa fiche." />;

  const isAnimal = p.type === 'animal';
  const sub = [p.race?.nom, p.espece.nom, p.sexe ? (p.sexe === 'M' ? '♂' : '♀') : '', ageLabel(p.naissance)].filter(Boolean).join(', ');

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
        <span className={clsx('flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-[0_3px_8px_rgba(14,124,123,.22)]', isAnimal ? 'bg-gradient-to-br from-brand-light to-brand' : 'bg-gradient-to-br from-[#d98a1c] to-amber')}>{p.nom[0]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-lg font-bold">{p.nom}</h3>
            <Badge tone="slate" className="font-mono">{p.matricule}</Badge>
            {p.provisoire && <Badge tone="amber">Fiche à compléter</Badge>}
          </div>
          <p className="text-[13px] text-slate">{isAnimal ? sub : [p.race?.nom, p.espece.nom, p.effectif ? `${p.effectif} animaux` : ''].filter(Boolean).join(', ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && <Button size="sm" variant="secondary" onClick={onEdit}><Pencil size={13} /> Modifier</Button>}
          <Button size="sm" variant="secondary" disabled={!canConsult} onClick={onNewConsult} title={canConsult ? 'Nouvelle consultation pour ce dossier' : "Vous n'avez pas le droit de créer une consultation"}><Plus size={13} /> Consult.</Button>
          {isAnimal && <Button size="sm" variant="violet" disabled={!canVaccinate} onClick={onNewVaccine} title={canVaccinate ? 'Nouvelle vaccination pour cet animal' : "Vous n'avez pas le droit d'ajouter une vaccination"}><Plus size={13} /> Vaccin</Button>}
          <Button size="sm" variant="info" disabled title="Disponible avec le lot Rendez-vous (L4)"><Plus size={13} /> RDV</Button>
        </div>
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line px-4">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => onTab(t.key)}
            className={clsx('whitespace-nowrap border-b-[3px] px-3.5 py-3 text-[13px] font-semibold transition hover:bg-mist', tab === t.key ? 'border-brand text-brand' : 'border-transparent text-slate')}>
            {t.label}{t.key === 'historique' && <span className="ml-1.5 text-xs font-normal text-faint">({p.historique.length})</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'dossier' && (
          <>
            <Section>Informations</Section>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Field label="Espèce / race">{[p.espece.nom, p.race?.nom].filter(Boolean).join(', ')}</Field>
              {isAnimal ? (
                <>
                  <Field label="Naissance / âge">{p.naissance ? `${formatDate(p.naissance)} (${ageLabel(p.naissance)})` : ''}</Field>
                  <Field label="Sexe / statut">{[p.sexe ? SEXE_LABEL[p.sexe] : '', p.statutRepro ? REPRO_LABEL[p.statutRepro] : ''].filter(Boolean).join(', ')}</Field>
                </>
              ) : (
                <>
                  <Field label="Effectif total">{p.effectif ? `${p.effectif} animaux` : ''}</Field>
                  <Field label="Répartition">{[p.femelles !== null ? `${p.femelles} femelles` : '', p.males !== null ? `${p.males} mâles` : '', p.jeunes !== null ? `${p.jeunes} jeunes` : ''].filter(Boolean).join(', ')}</Field>
                  <Field label="Localisation">{p.localisation}</Field>
                  <Field label="Dernier recensement">{p.recensement ? formatDate(p.recensement) : ''}</Field>
                </>
              )}
            </dl>

            <Section>Propriétaire</Section>
            {p.proprietaire ? (
              <div className="rounded-lg border-l-4 border-brand bg-brand-pale px-4 py-3">
                <p className="font-bold">{p.proprietaire.nom}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate">
                  {p.proprietaire.telephone && <span className="flex items-center gap-1.5"><Phone size={13} /> {p.proprietaire.telephone}</span>}
                  {p.proprietaire.email && <span className="flex items-center gap-1.5"><Mail size={13} /> {p.proprietaire.email}</span>}
                </p>
                <Link to={`/patients?proprietaire=${p.proprietaire.id}`} className="mt-2 inline-block text-xs font-semibold text-brand hover:underline">Voir tous ses animaux et troupeaux</Link>
              </div>
            ) : <p className="text-sm text-slate">Aucun propriétaire.</p>}

            {isAnimal && p.antecedents && (
              <>
                <Section><TriangleAlert size={13} /> Antécédents &amp; allergies</Section>
                <div className="rounded-lg border-l-4 border-danger bg-danger-pale px-4 py-3 text-[13px] text-danger-text">{p.antecedents}</div>
              </>
            )}
            {!isAnimal && p.note && (
              <>
                <Section>Note</Section>
                <div className="rounded-lg bg-mist px-4 py-3 text-[13px]">{p.note}</div>
              </>
            )}
          </>
        )}

        {tab === 'consultations' && <PatientConsultationsTab patientId={p.id} onOpen={onOpenConsult} />}
        {tab === 'vaccins' && (isAnimal ? <PatientVaccinsTab patientId={p.id} /> : <EmptyState title="Carnet vaccinal" description="Un troupeau se vaccine par campagne : voir le module Vaccinations." />)}

        {tab === 'historique' && (
          <ol className="relative space-y-5 border-l-2 border-line pl-5">
            {p.historique.map((h, i) => (
              <li key={i} className="relative">
                <span className={clsx('absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white', h.action === 'creation' ? 'bg-brand' : 'bg-info')} />
                <p className="text-[13px] font-semibold">{h.action === 'creation' ? 'Dossier créé' : 'Dossier modifié'} <span className="font-normal text-slate">par {h.by}</span></p>
                <p className="text-xs text-faint">{formatDateTime(h.at)}</p>
                {h.changes.length > 0 && (
                  <ul className="mt-2 space-y-1 rounded-lg bg-mist px-3 py-2 text-xs">
                    {h.changes.map((c) => <li key={c.champ}><b>{c.champ}</b> : <span className="text-slate line-through">{c.avant}</span> → <span className="font-medium">{c.apres}</span></li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
