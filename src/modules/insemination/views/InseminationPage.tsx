import { CreditCard, Download, Pencil, Plus, Printer, ReceiptText, Search, Stethoscope, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, Input, KpiCard, Panel, Select, Tabs, toast } from '@/shared/ui';
import { InvoiceDetailModal } from '@/modules/facturation/views/InvoiceDetailModal';
import { useSpeciesChoices } from '@/modules/referentiels/viewmodels/useSpeciesChoices';
import { useVeterinaireChoices } from '@/modules/rendez-vous/viewmodels/useVeterinaireChoices';
import { DIAG_LABEL, METHODES, METHODE_LABEL, QUICK_FILTERS, RESULTAT_BADGE, RESULTAT_TONE, toCsv, toPrintHtml } from '../models/insemination';
import { useInseminationViewModel } from '../viewmodels/useInseminationViewModel';
import { DeleteInsemModal } from './DeleteInsemModal';
import { DiagnosticModal } from './DiagnosticModal';
import { GestationCards } from './GestationCards';
import { InsemFormModal } from './InsemFormModal';
import { MiseBasModal } from './MiseBasModal';
import { RappelsTable } from './RappelsTable';

const TH = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">{children}</th>;

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function InseminationPage() {
  const vm = useInseminationViewModel();
  const species = useSpeciesChoices();
  const vets = useVeterinaireChoices();
  const s = vm.stats;

  const exportExcel = () => download('actes-insemination.csv', toCsv(vm.rows), 'text/csv;charset=utf-8');
  const exportPdf = () => {
    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) { toast.warning("Autorisez l'ouverture de fenêtres pour imprimer"); return; }
    w.document.write(toPrintHtml(vm.rows)); w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
  };

  return (
    <div className="space-y-5">
      {s && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard value={s.total} label="Actes" tone="info" />
          <KpiCard value={s.planifies} label="Planifiés" tone="amber" />
          <KpiCard value={s.realises} label="Réalisés" />
          <KpiCard value={s.gestantes} label="Gestantes en suivi" tone="violet" />
          <KpiCard value={`${s.taux_reussite} %`} label="Taux de réussite" />
        </div>
      )}

      <Panel title="Insémination et reproduction"
        actions={vm.tab === 'actes' && vm.canCreate && <Button size="sm" onClick={() => vm.openForm()}><Plus size={14} /> Nouvel acte</Button>}>
        <Tabs items={[{ key: 'actes', label: "Actes d'insémination" }, { key: 'suivi', label: `Suivi gestations${s?.gestantes ? ` (${s.gestantes})` : ''}` }, { key: 'rappels', label: 'Rappels programmés' }]} value={vm.tab} onChange={vm.setTab} />

        {vm.tab === 'rappels' ? (
          <RappelsTable items={vm.rappels} delaiDiagnostic={vm.rappelsInfo?.delaiDiagnostic ?? 30} delaiMiseBas={vm.rappelsInfo?.delaiMiseBas ?? 7} canSend={vm.canUpdate} />
        ) : vm.tab === 'suivi' ? (
          <GestationCards items={vm.gestations} seuil={14} canUpdate={vm.canUpdate} onMiseBas={(g) => vm.open('mise-bas', g.acte)} onEdit={(g) => vm.openForm(g.acte)} />
        ) : (
          <>
            <div className="space-y-3 border-b border-line p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
                  <Input aria-label="Rechercher un acte" placeholder="Rechercher (animal, propriétaire, race ou nom du géniteur)" className="pl-9" value={vm.filters.q} onChange={(e) => vm.set('q')(e.target.value)} />
                </div>
                <div role="group" aria-label="Filtre rapide" className="flex flex-wrap gap-1">
                  {QUICK_FILTERS.map((f) => (
                    <button key={f.key} type="button" aria-pressed={vm.filters.filtre === f.key} onClick={() => vm.setQuick(f.key)}
                      className={clsx('rounded-lg border px-3 py-1.5 text-xs font-semibold transition', vm.filters.filtre === f.key ? 'border-brand bg-brand-pale text-brand-text' : 'border-line text-slate hover:bg-mist')}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                <Input aria-label="Du" type="date" value={vm.filters.du} onChange={(e) => vm.set('du')(e.target.value)} />
                <Input aria-label="Au" type="date" value={vm.filters.au} onChange={(e) => vm.set('au')(e.target.value)} />
                <Select aria-label="Espèce" value={vm.filters.espece} onChange={(e) => vm.set('espece')(e.target.value)}><option value="">Toutes les espèces</option>{(species.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</Select>
                <Select aria-label="Méthode" value={vm.filters.methode} onChange={(e) => vm.set('methode')(e.target.value)}><option value="">Toutes les méthodes</option>{METHODES.map((m) => <option key={m} value={m}>{METHODE_LABEL[m]}</option>)}</Select>
                <Select aria-label="Vétérinaire" value={vm.filters.veterinaire} onChange={(e) => vm.set('veterinaire')(e.target.value)}><option value="">Tous les vétérinaires</option>{(vets.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</Select>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="secondary" disabled={vm.rows.length === 0} onClick={exportExcel}><Download size={13} /> Export Excel</Button>
                <Button size="sm" variant="secondary" disabled={vm.rows.length === 0} onClick={exportPdf}><Printer size={13} /> Export PDF</Button>
              </div>
            </div>

            {vm.rows.length === 0 && !vm.loading ? <p className="p-10 text-center text-[13px] text-slate">Aucun acte d'insémination enregistré</p> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead><tr><TH>Patient</TH><TH>Propriétaire</TH><TH>Méthode</TH><TH>Géniteur et lot</TH><TH>Date de l'acte</TH><TH>Technicien</TH><TH>Diagnostic</TH><TH>Résultat</TH><TH>Mise-bas</TH><TH>Actions</TH></tr></thead>
                  <tbody>
                    {vm.rows.map((a) => (
                      <tr key={a.id} className="border-b border-[#eef2f5] align-top hover:bg-mist">
                        <td className="px-4 py-3"><b className="block">{a.patient?.nom}</b><span className="text-xs text-slate">{a.patient?.espece}{a.patient?.type === 'troupeau' ? ', troupeau' : ''}</span>{a.patient?.provisoire && <Badge tone="amber" className="ml-2">À compléter</Badge>}</td>
                        <td className="px-4 py-3">{a.proprietaire?.nom ?? '—'}</td>
                        <td className="px-4 py-3"><span className="block">{METHODE_LABEL[a.methode]}</span><Badge tone={a.statut === 'realise' ? 'blue' : 'amber'}>{a.statut === 'realise' ? 'Réalisé' : 'Planifié'}</Badge></td>
                        <td className="px-4 py-3"><span className="block">{[a.semence.race_geniteur, a.semence.nom_geniteur].filter(Boolean).join(' ') || '—'}</span>{a.semence.lot && <span className="text-xs text-slate">Lot {a.semence.lot}</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(a.date)}</td>
                        <td className="px-4 py-3">{a.veterinaire?.nom ?? '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">{a.diagnostic ? <>{formatDate(a.diagnostic.date)}{a.diagnostic.methode && <span className="block text-xs text-slate">{DIAG_LABEL[a.diagnostic.methode]}</span>}</> : '—'}</td>
                        <td className="px-4 py-3"><Badge tone={RESULTAT_TONE[a.resultat]}>{RESULTAT_BADGE[a.resultat]}</Badge></td>
                        <td className="whitespace-nowrap px-4 py-3">{a.mise_bas_prevue ? <span className="block">Prévue {formatDate(a.mise_bas_prevue)}</span> : null}{a.mise_bas ? <span className="block font-semibold text-brand-text">Réelle {formatDate(a.mise_bas.date)}</span> : !a.mise_bas_prevue && '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {vm.canUpdate && !a.mise_bas && <Button size="icon" variant="secondary" aria-label={`Modifier l'acte ${a.numero}`} onClick={() => vm.openForm(a)}><Pencil size={13} /></Button>}
                            {vm.canUpdate && a.statut === 'realise' && !a.mise_bas && <Button size="icon" variant="info" aria-label={`Diagnostic de ${a.patient?.nom}`} title="Diagnostic de gestation" onClick={() => vm.open('diagnostic', a)}><Stethoscope size={13} /></Button>}
                            {vm.canPay && a.facture && a.facture.reste > 0 && <Button size="icon" variant="success" aria-label={`Encaisser l'acte ${a.numero}`} title="Encaisser" onClick={() => vm.openInvoice(a.facture!.id)}><CreditCard size={13} /></Button>}
                            {vm.canInvoice && a.facture && <Button size="icon" variant="secondary" aria-label={`Voir la facture ${a.facture.numero}`} title={`Facture ${a.facture.numero}`} onClick={() => vm.openInvoice(a.facture!.id)}><ReceiptText size={13} /></Button>}
                            {vm.canDelete && <Button size="icon" variant="danger" aria-label={`Supprimer l'acte ${a.numero}`} onClick={() => vm.open('delete', a)}><Trash2 size={13} /></Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Panel>

      <InsemFormModal open={vm.dialog?.kind === 'form'} editing={vm.dialog?.kind === 'form' ? vm.dialog.acte : undefined} onClose={vm.close} />
      {vm.dialog?.kind === 'diagnostic' && <DiagnosticModal acte={vm.dialog.acte} onClose={vm.close} />}
      {vm.dialog?.kind === 'mise-bas' && <MiseBasModal acte={vm.dialog.acte} onClose={vm.close} />}
      {vm.dialog?.kind === 'delete' && <DeleteInsemModal acte={vm.dialog.acte} onClose={vm.close} />}
      {vm.invoiceId && <InvoiceDetailModal id={vm.invoiceId} onClose={vm.closeInvoice} />}
    </div>
  );
}
