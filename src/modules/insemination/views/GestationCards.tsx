import { Baby } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, EmptyState } from '@/shared/ui';
import { GESTATION_ETAT_LABEL, Gestation, METHODE_LABEL } from '../models/insemination';
import { ProgressBar } from '@/modules/vaccinations/views/ProgressBar';

interface Props { items: Gestation[]; seuil: number; canUpdate: boolean; onMiseBas: (g: Gestation) => void; onEdit: (g: Gestation) => void }

/** Une carte par gestante, triée par date de mise-bas prévue (suivi des gestations). */
export function GestationCards({ items, seuil, canUpdate, onMiseBas, onEdit }: Props) {
  if (items.length === 0) return <EmptyState title="Aucune gestation en cours" description="Les femelles dont le diagnostic est positif apparaissent ici jusqu'à la mise-bas." />;
  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((g) => {
        const a = g.acte;
        const tone = g.etat === 'passee' ? 'red' : g.etat === 'imminente' ? 'amber' : g.etat === 'a_completer' ? 'slate' : 'green';
        return (
          <article key={a.id} className="rounded-xl border border-line p-4">
            {g.etat === 'imminente' && <p className="-mx-4 -mt-4 mb-3 rounded-t-xl bg-amber-pale px-4 py-1.5 text-xs font-semibold text-amber-text">Mise-bas imminente (à {seuil} jours ou moins)</p>}
            <div className="flex items-start justify-between gap-2">
              <div><b className="flex items-center gap-1.5 text-[14px]"><Baby size={15} className="text-violet" />{a.patient?.nom}</b><p className="text-xs text-slate">{a.patient?.espece}, {a.proprietaire?.nom ?? 'sans propriétaire'}</p></div>
              <Badge tone={tone}>{g.etat === 'passee' ? 'Passée' : GESTATION_ETAT_LABEL[g.etat]}</Badge>
            </div>
            <dl className="mt-3 space-y-1 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-slate">Insémination</dt><dd>{formatDate(a.date)}, {METHODE_LABEL[a.methode]}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate">Géniteur</dt><dd>{[a.semence.race_geniteur, a.semence.nom_geniteur].filter(Boolean).join(' ') || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate">Mise-bas prévue</dt><dd className={g.etat === 'passee' ? 'font-semibold text-danger' : ''}>{a.mise_bas_prevue ? formatDate(a.mise_bas_prevue) : 'À compléter'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate">Jours restants</dt><dd className="font-semibold">{g.jours_restants === null ? '—' : g.jours_restants < 0 ? `${-g.jours_restants} j de retard` : `${g.jours_restants} j`}</dd></div>
            </dl>
            <div className="mt-3"><ProgressBar value={g.progression} tone={g.etat === 'passee' ? 'danger' : g.etat === 'imminente' ? 'amber' : 'brand'} /></div>
            {canUpdate && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => onMiseBas(g)}>Enregistrer la mise-bas</Button>
                <Button size="sm" variant="secondary" onClick={() => onEdit(g)}>Modifier l'acte</Button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
