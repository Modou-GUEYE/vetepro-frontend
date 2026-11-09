import type { ModuleKey } from '@/core/auth/permissions';
import { INVOICES, DemoInvoice, credited, paid, remaining, statusOf, total } from './billingDb';
import { CABINET } from './cabinetDb';
import { CONSULTATIONS } from './consultDb';
import { HOSPIS } from './hospiDb';
import { INSEMS, gestations, METHODE_LABEL } from './inseminDb';
import { ARTICLES, levelOf } from './pharmacyDb';
import { OWNERS, PATIENTS, ownerName, patientEspece } from './patientsDb';
import { RDVS, startsAt, vetName } from './rdvDb';
import { ESPECES } from './referentielsDb';
import { CAMPAGNES, VACCINATIONS, rappelStatut, vaccineReminders } from './vaccDb';

/* ---------- Format commun des rapports ---------- */

export type ReportType = 'ventes' | 'factures' | 'consultations' | 'vaccins' | 'clients';
export const REPORT_TYPES: ReportType[] = ['ventes', 'factures', 'consultations', 'vaccins', 'clients'];
export type ColType = 'texte' | 'fcfa' | 'nombre' | 'date';
export interface Column { cle: string; libelle: string; type: ColType }
export interface Table { colonnes: Column[]; lignes: { id: string | null; cells: (string | number)[] }[] }
export interface Kpi { label: string; valeur: number; format: 'nombre' | 'fcfa' }
export interface Chart { titre: string; type: 'barres' | 'colonnes'; format: 'nombre' | 'fcfa'; donnees: { label: string; valeur: number }[] }
export interface ReportData extends Table { type: ReportType; kpis: Kpi[]; graphiques: Chart[]; synthese: (Table & { titre: string }) | null }

export interface ReportFilters {
  du?: string; au?: string; medicament?: string; statut?: string; mode?: string; prestation?: string; groupe?: string; patientId?: string; service?: string;
  vaccin?: string; statutRappel?: string; especeId?: string; statutClient?: string;
}

const inRange = (date: string, f: ReportFilters) => (!f.du || date >= f.du) && (!f.au || date <= f.au);
const col = (cle: string, libelle: string, type: ColType = 'texte'): Column => ({ cle, libelle, type });
const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);
const bucket = <T>(xs: T[], key: (x: T) => string) => { const m = new Map<string, T[]>(); for (const x of xs) { const k = key(x); m.set(k, [...(m.get(k) ?? []), x]); } return m; };
const net = (i: DemoInvoice) => total(i) - credited(i);
const patientOf = (id: string | null) => PATIENTS.find((p) => p.id === id);
const ownerOf = (id: string | null) => OWNERS.find((o) => o.id === id);
const monthLabel = (ym: string) => `${['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][Number(ym.slice(5)) - 1]} ${ym.slice(2, 4)}`;
const byMonth = (dates: string[]): Chart['donnees'] => [...bucket(dates, (d) => d.slice(0, 7))].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([k, v]) => ({ label: monthLabel(k), valeur: v.length }));

export const SOURCE_LABEL: Record<DemoInvoice['source'], string> = {
  consultation: 'Consultation', vente: 'Vente directe', hospitalisation: 'Hospitalisation', vaccination: 'Vaccination', insemination: 'Insémination', manuel: 'Autre',
};
export const STATUT_FACTURE_LABEL: Record<string, string> = { payee: 'Payée', partielle: 'Partielle', impayee: 'En attente', annulee: 'Annulée' };

/* ---------- Ventes de médicaments ---------- */

function ventes(f: ReportFilters): ReportData {
  const lignes = INVOICES.filter((i) => i.source === 'vente' && statusOf(i) !== 'annulee' && inRange(i.date, f))
    .flatMap((i) => i.lines.map((l) => ({ i, l })))
    .filter((x) => !f.medicament || x.l.description.toLowerCase().startsWith(f.medicament.toLowerCase()));
  const ca = (x: (typeof lignes)[number]) => Math.round(x.l.quantite * x.l.prixUnitaire * (1 - x.i.remisePct / 100));
  const groups = bucket(lignes, (x) => x.l.description);
  const syn: Table['lignes'] = [...groups].map(([nom, xs]) => ({ id: null, cells: [nom, new Set(xs.map((x) => x.i.id)).size, sum(xs.map((x) => x.l.quantite)), sum(xs.map(ca))] })).sort((a, b) => Number(b.cells[3]) - Number(a.cells[3]));
  return {
    type: 'ventes',
    kpis: [
      { label: "Chiffre d'affaires", valeur: sum(lignes.map(ca)), format: 'fcfa' }, { label: 'Unités vendues', valeur: sum(lignes.map((x) => x.l.quantite)), format: 'nombre' },
      { label: 'Ventes', valeur: new Set(lignes.map((x) => x.i.id)).size, format: 'nombre' }, { label: 'Médicaments distincts', valeur: groups.size, format: 'nombre' },
    ],
    graphiques: [{ titre: "Chiffre d'affaires par médicament", type: 'barres', format: 'fcfa', donnees: syn.map((r) => ({ label: String(r.cells[0]), valeur: Number(r.cells[3]) })) }],
    synthese: { titre: 'Synthèse par médicament', colonnes: [col('med', 'Médicament'), col('ventes', 'Ventes', 'nombre'), col('qte', 'Quantité', 'nombre'), col('ca', 'CA', 'fcfa')], lignes: syn },
    colonnes: [col('date', 'Date', 'date'), col('num', 'N° vente'), col('client', 'Client'), col('med', 'Médicament'), col('qte', 'Quantité', 'nombre'), col('pu', 'Prix unitaire', 'fcfa'), col('total', 'Total', 'fcfa'), col('mode', 'Mode')],
    lignes: lignes.sort((a, b) => b.i.date.localeCompare(a.i.date)).map((x) => ({ id: x.i.id, cells: [x.i.date, x.i.numero, x.i.clientLabel, x.l.description, x.l.quantite, x.l.prixUnitaire, ca(x), [...new Set(x.i.payments.map((p) => p.mode))].join(', ')] })),
  };
}

/* ---------- Factures ---------- */

function factures(f: ReportFilters): ReportData {
  const rows = INVOICES.filter((i) => inRange(i.date, f))
    .filter((i) => !f.statut || statusOf(i) === f.statut)
    .filter((i) => !f.mode || i.payments.some((p) => p.mode === f.mode))
    .filter((i) => !f.prestation || i.source === f.prestation);
  const live = rows.filter((i) => statusOf(i) !== 'annulee');
  const modes = new Map<string, number>();
  for (const i of rows) for (const p of i.payments) modes.set(p.mode, (modes.get(p.mode) ?? 0) + p.montant);
  const par = f.groupe === 'patient' ? 'patient' : 'prestation';
  const groups = bucket(live, (i) => (par === 'patient' ? patientOf(i.patientId)?.nom ?? i.clientLabel : SOURCE_LABEL[i.source]));
  return {
    type: 'factures',
    kpis: [
      { label: 'Facturé net', valeur: sum(live.map(net)), format: 'fcfa' }, { label: 'Encaissé', valeur: sum(rows.map(paid)), format: 'fcfa' },
      { label: 'Soldes impayés', valeur: sum(live.map(remaining)), format: 'fcfa' }, { label: 'Factures', valeur: rows.length, format: 'nombre' },
    ],
    graphiques: [{ titre: 'Encaissements par mode de paiement', type: 'barres', format: 'fcfa', donnees: [...modes].map(([label, valeur]) => ({ label, valeur })).sort((a, b) => b.valeur - a.valeur) }],
    synthese: {
      titre: `Détail par ${par === 'patient' ? 'patient' : 'prestation'}`,
      colonnes: [col('groupe', par === 'patient' ? 'Patient ou client' : 'Prestation'), col('n', 'Factures', 'nombre'), col('fact', 'Facturé', 'fcfa'), col('enc', 'Encaissé', 'fcfa'), col('reste', 'Reste', 'fcfa')],
      lignes: [...groups].map(([k, xs]) => ({ id: null, cells: [k, xs.length, sum(xs.map(net)), sum(xs.map(paid)), sum(xs.map(remaining))] })),
    },
    colonnes: [col('num', 'N°'), col('date', 'Date', 'date'), col('client', 'Client'), col('patient', 'Patient'), col('prest', 'Prestation'), col('total', 'Total', 'fcfa'), col('paye', 'Payé', 'fcfa'), col('reste', 'Reste', 'fcfa'), col('statut', 'Statut'), col('modes', 'Mode(s)')],
    lignes: rows.sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id)).map((i) => ({
      id: i.id, cells: [i.numero, i.date, i.clientLabel, patientOf(i.patientId)?.nom ?? '', SOURCE_LABEL[i.source], net(i), paid(i), remaining(i), STATUT_FACTURE_LABEL[statusOf(i)], [...new Set(i.payments.map((p) => p.mode))].join(', ')],
    })),
  };
}

/* ---------- Consultations ---------- */

function consultations(f: ReportFilters): ReportData {
  const rows = CONSULTATIONS.filter((c) => inRange(c.date, f)).filter((c) => !f.patientId || c.patientId === f.patientId).filter((c) => !f.service || c.serviceLabel === f.service);
  const types = bucket(rows, (c) => c.serviceLabel);
  return {
    type: 'consultations',
    kpis: [
      { label: 'Consultations', valeur: rows.length, format: 'nombre' }, { label: 'Patients distincts', valeur: new Set(rows.map((c) => c.patientId)).size, format: 'nombre' },
      { label: 'Urgences', valeur: rows.filter((c) => /urgence/i.test(c.serviceLabel)).length, format: 'nombre' }, { label: 'Lignes prescrites', valeur: sum(rows.map((c) => c.stock.length + c.externes.length)), format: 'nombre' },
    ],
    graphiques: [
      { titre: 'Par type', type: 'barres', format: 'nombre', donnees: [...types].map(([label, xs]) => ({ label, valeur: xs.length })).sort((a, b) => b.valeur - a.valeur) },
      { titre: 'Par mois', type: 'colonnes', format: 'nombre', donnees: byMonth(rows.map((c) => c.date)) },
    ],
    synthese: null,
    colonnes: [col('date', 'Date', 'date'), col('patient', 'Patient'), col('espece', 'Espèce'), col('proprietaire', 'Propriétaire'), col('type', 'Type'), col('motif', 'Motif'), col('diag', 'Diagnostic')],
    lignes: rows.sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id)).map((c) => {
      const p = patientOf(c.patientId);
      return { id: c.id, cells: [c.date, p?.nom ?? '', p ? patientEspece(p).nom : '', ownerOf(p?.ownerId ?? null) ? ownerName(ownerOf(p?.ownerId ?? null)!) : '', c.serviceLabel, c.motif, c.diagnostic] };
    }),
  };
}

/* ---------- Vaccins ---------- */

const STATUT_RAPPEL_LABEL = { a_jour: 'À jour', bientot: 'Rappel bientôt', en_retard: 'En retard', non_defini: 'Non défini' } as const;

function vaccins(f: ReportFilters, now: Date): ReportData {
  const rows = VACCINATIONS.filter((v) => inRange(v.date, f)).filter((v) => !f.vaccin || v.vaccin === f.vaccin)
    .filter((v) => !f.statutRappel || rappelStatut(v.rappel, now) === f.statutRappel).filter((v) => !f.especeId || patientOf(v.patientId)?.especeId === f.especeId);
  const n = (s: string) => rows.filter((v) => rappelStatut(v.rappel, now) === s).length;
  return {
    type: 'vaccins',
    kpis: [{ label: 'Vaccinations', valeur: rows.length, format: 'nombre' }, { label: 'À jour', valeur: n('a_jour'), format: 'nombre' }, { label: 'Rappel à moins de 30 jours', valeur: n('bientot'), format: 'nombre' }, { label: 'En retard', valeur: n('en_retard'), format: 'nombre' }],
    graphiques: [{ titre: 'Par vaccin', type: 'barres', format: 'nombre', donnees: [...bucket(rows, (v) => v.vaccin)].map(([label, xs]) => ({ label, valeur: xs.length })).sort((a, b) => b.valeur - a.valeur) }],
    synthese: null,
    colonnes: [col('date', 'Date', 'date'), col('animal', 'Animal'), col('espece', 'Espèce'), col('proprietaire', 'Propriétaire'), col('vaccin', 'Vaccin'), col('lot', 'Lot'), col('rappel', 'Rappel', 'date'), col('statut', 'Statut'), col('tarif', 'Tarif', 'fcfa')],
    lignes: rows.sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id)).map((v) => {
      const p = patientOf(v.patientId);
      const o = ownerOf(p?.ownerId ?? null);
      return { id: null, cells: [v.date, p?.nom ?? '', p ? patientEspece(p).nom : '', o ? ownerName(o) : '', v.vaccin, v.lot, v.rappel ?? '', STATUT_RAPPEL_LABEL[rappelStatut(v.rappel, now)], v.tarif] };
    }),
  };
}

/* ---------- Clients ---------- */

function clients(f: ReportFilters): ReportData {
  const owners = OWNERS.filter((o) => !o.deleted).filter((o) => !f.statutClient || (f.statutClient === 'actif' ? o.actif : !o.actif));
  const stats = owners.map((o) => {
    const mine = PATIENTS.filter((p) => p.ownerId === o.id).map((p) => p.id);
    const cs = CONSULTATIONS.filter((c) => mine.includes(c.patientId) && inRange(c.date, f));
    const fs = INVOICES.filter((i) => i.ownerId === o.id && statusOf(i) !== 'annulee' && inRange(i.date, f));
    const dates = [...cs.map((c) => c.date), ...fs.map((i) => i.date)].sort();
    return { o, animaux: mine.length, consultations: cs.length, ca: sum(fs.map(net)), derniere: dates[dates.length - 1] ?? '', dates };
  });
  const actifs = stats.filter((s) => s.consultations > 0 || s.ca > 0);
  const months = new Map<string, Set<string>>();
  for (const s of stats) for (const d of s.dates) months.set(d.slice(0, 7), (months.get(d.slice(0, 7)) ?? new Set()).add(s.o.id));
  return {
    type: 'clients',
    kpis: [
      { label: 'Clients', valeur: owners.length, format: 'nombre' }, { label: 'Nouveaux sur la période', valeur: owners.filter((o) => inRange(o.creeLe, f)).length, format: 'nombre' },
      { label: 'Clients actifs (visite ou facture)', valeur: actifs.length, format: 'nombre' }, { label: 'Panier moyen', valeur: actifs.length ? Math.round(sum(actifs.map((s) => s.ca)) / actifs.length) : 0, format: 'fcfa' },
    ],
    graphiques: [{ titre: 'Nombre de clients actifs par mois', type: 'colonnes', format: 'nombre', donnees: [...months].sort(([a], [b]) => a.localeCompare(b)).slice(-10).map(([k, v]) => ({ label: monthLabel(k), valeur: v.size })) }],
    synthese: null,
    colonnes: [col('num', 'N° client'), col('client', 'Client'), col('tel', 'Téléphone'), col('depuis', 'Client depuis', 'date'), col('animaux', 'Animaux et troupeaux', 'nombre'), col('consult', 'Consultations', 'nombre'), col('ca', 'CA période', 'fcfa'), col('derniere', 'Dernière visite', 'date'), col('statut', 'Statut')],
    lignes: stats.sort((a, b) => b.ca - a.ca).map((s) => ({ id: null, cells: [`CLI-${s.o.id.padStart(4, '0')}`, ownerName(s.o), s.o.telephone, s.o.creeLe, s.animaux, s.consultations, s.ca, s.derniere, s.o.actif ? 'Actif' : 'Désactivé'] })),
  };
}

export function buildReport(type: ReportType, f: ReportFilters, now = new Date()): ReportData {
  switch (type) {
    case 'ventes': return ventes(f);
    case 'factures': return factures(f);
    case 'consultations': return consultations(f);
    case 'vaccins': return vaccins(f, now);
    default: return clients(f);
  }
}

/* ---------- Rapport réglementaire ---------- */

export const ACTIVITES = ['consultations', 'vaccinations', 'campagnes', 'inseminations', 'hospitalisations'] as const;
export type Activite = (typeof ACTIVITES)[number];
export const ACTIVITE_LABEL: Record<Activite, string> = {
  consultations: 'Consultations', vaccinations: 'Vaccinations', campagnes: 'Campagnes de vaccination', inseminations: 'Inséminations', hospitalisations: 'Hospitalisations',
};
export interface ReportSection { cle: Activite; titre: string; synthese: Table; detail: Table }

const especeNom = (patientId: string) => { const p = patientOf(patientId); return p ? patientEspece(p).nom : 'Inconnue'; };
const count = <T>(xs: T[], key: (x: T) => string) => [...bucket(xs, key)].sort(([a], [b]) => a.localeCompare(b, 'fr'));

/** Rapport configurable : activités choisies, période, synthèse par espèce (zone et vaccin pour les vaccinations) puis détail des actes. */
export function regulatoryReport(p: { du: string; au: string; activites: string[] }, by: string, now = new Date()) {
  const choix = ACTIVITES.filter((a) => p.activites.includes(a));
  const f: ReportFilters = { du: p.du, au: p.au };
  const sections: ReportSection[] = choix.map((cle): ReportSection => {
    if (cle === 'consultations') {
      const rows = CONSULTATIONS.filter((c) => inRange(c.date, f));
      return {
        cle, titre: ACTIVITE_LABEL[cle],
        synthese: { colonnes: [col('espece', 'Espèce'), col('n', 'Consultations', 'nombre')], lignes: count(rows, (c) => especeNom(c.patientId)).map(([k, xs]) => ({ id: null, cells: [k, xs.length] })) },
        detail: { colonnes: [col('date', 'Date', 'date'), col('patient', 'Patient'), col('espece', 'Espèce'), col('type', 'Type'), col('diag', 'Diagnostic')], lignes: rows.sort((a, b) => a.date.localeCompare(b.date)).map((c) => ({ id: c.id, cells: [c.date, patientOf(c.patientId)?.nom ?? '', especeNom(c.patientId), c.serviceLabel, c.diagnostic] })) },
      };
    }
    if (cle === 'vaccinations') {
      const rows = VACCINATIONS.filter((v) => inRange(v.date, f));
      return {
        cle, titre: ACTIVITE_LABEL[cle],
        synthese: { colonnes: [col('espece', 'Espèce'), col('vaccin', 'Vaccin'), col('n', 'Vaccinations', 'nombre')], lignes: count(rows, (v) => `${especeNom(v.patientId)}|${v.vaccin}`).map(([k, xs]) => ({ id: null, cells: [...k.split('|'), xs.length] })) },
        detail: { colonnes: [col('date', 'Date', 'date'), col('animal', 'Animal'), col('espece', 'Espèce'), col('vaccin', 'Vaccin'), col('lot', 'Lot')], lignes: rows.sort((a, b) => a.date.localeCompare(b.date)).map((v) => ({ id: null, cells: [v.date, patientOf(v.patientId)?.nom ?? '', especeNom(v.patientId), v.vaccin, v.lot] })) },
      };
    }
    if (cle === 'campagnes') {
      const rows = CAMPAGNES.filter((c) => inRange(c.date, f));
      const nom = (id: string) => ESPECES.find((e) => e.id === id)?.nom ?? '';
      return {
        cle, titre: ACTIVITE_LABEL[cle],
        synthese: { colonnes: [col('zone', 'Zone'), col('espece', 'Espèce'), col('vaccin', 'Vaccin'), col('vaccines', 'Vaccinés', 'nombre'), col('vises', 'Visés', 'nombre')], lignes: rows.map((c) => ({ id: null, cells: [c.zone, nom(c.especeId), c.vaccin || '—', c.animaux.length, c.vises ?? 0] })) },
        detail: { colonnes: [col('campagne', 'Campagne'), col('date', 'Date', 'date'), col('animal', 'Animal'), col('proprietaire', 'Propriétaire'), col('vaccin', 'Vaccin')], lignes: rows.flatMap((c) => c.animaux.map((a) => ({ id: null, cells: [c.nom, a.date, a.animal, a.proprietaire, a.vaccin] }))) },
      };
    }
    if (cle === 'inseminations') {
      const rows = INSEMS.filter((a) => !a.deleted && inRange(a.date, f));
      return {
        cle, titre: ACTIVITE_LABEL[cle],
        synthese: {
          colonnes: [col('espece', 'Espèce'), col('actes', 'Actes', 'nombre'), col('realises', 'Réalisés', 'nombre'), col('positifs', 'Positifs', 'nombre'), col('mb', 'Mises-bas', 'nombre'), col('nes', 'Naissances vivantes', 'nombre')],
          lignes: count(rows, (a) => especeNom(a.patientId)).map(([k, xs]) => ({ id: null, cells: [k, xs.length, xs.filter((a) => a.statut === 'realise').length, xs.filter((a) => a.diagnostic?.resultat === 'positif').length, xs.filter((a) => a.miseBas).length, sum(xs.map((a) => a.miseBas?.vivants ?? 0))] })),
        },
        detail: { colonnes: [col('num', 'N°'), col('date', 'Date', 'date'), col('patient', 'Patient'), col('espece', 'Espèce'), col('methode', 'Méthode'), col('resultat', 'Résultat'), col('mb', 'Mise-bas', 'date')], lignes: rows.sort((a, b) => a.date.localeCompare(b.date)).map((a) => ({ id: a.id, cells: [a.numero, a.date, patientOf(a.patientId)?.nom ?? '', especeNom(a.patientId), METHODE_LABEL[a.methode], a.diagnostic ? { positif: 'Positif', negatif: 'Négatif', attente: 'En attente' }[a.diagnostic.resultat] : 'En attente', a.miseBas?.date ?? ''] })) },
      };
    }
    const rows = HOSPIS.filter((h) => inRange(h.dateEntree, f));
    return {
      cle: 'hospitalisations', titre: ACTIVITE_LABEL.hospitalisations,
      synthese: { colonnes: [col('espece', 'Espèce'), col('adm', 'Admissions', 'nombre'), col('sorties', 'Sorties', 'nombre'), col('deces', 'Décès', 'nombre')], lignes: count(rows, (h) => especeNom(h.patientId)).map(([k, xs]) => ({ id: null, cells: [k, xs.length, xs.filter((h) => h.sortie).length, xs.filter((h) => h.sortie?.etat === 'decede').length] })) },
      detail: { colonnes: [col('num', 'N°'), col('patient', 'Patient'), col('espece', 'Espèce'), col('entree', 'Entrée', 'date'), col('sortie', 'Sortie', 'date'), col('etat', 'État à la sortie')], lignes: rows.sort((a, b) => a.dateEntree.localeCompare(b.dateEntree)).map((h) => ({ id: h.id, cells: [h.numero, patientOf(h.patientId)?.nom ?? '', especeNom(h.patientId), h.dateEntree, h.sortie?.date ?? '', h.sortie ? { gueri: 'Guéri', ameliore: 'Amélioré', stable: 'Stable', transfere: 'Transféré', decede: 'Décédé' }[h.sortie.etat] : 'En cours'] })) },
    };
  });
  return { cabinet: { nom: CABINET.nom, ordre: CABINET.ordre, adresse: CABINET.adresse, telephone: CABINET.telephone, email: CABINET.email }, du: p.du, au: p.au, genereLe: now.toISOString(), generePar: by, sections };
}

/* ---------- Tableau de bord ---------- */

const today = (now: Date) => now.toISOString().slice(0, 10);

/** Indicateurs et listes courtes du tableau de bord ; chaque bloc n'est calculé que si l'utilisateur a le droit de lecture du module concerné. */
export function dashboard(canRead: (m: ModuleKey) => boolean, now = new Date()) {
  const t = today(now);
  const pharma = canRead('pharmacie') ? ARTICLES.filter((a) => !a.deleted && a.actif && levelOf(a) !== 'ok').sort((a, b) => (levelOf(a) === 'rupture' ? 0 : 1) - (levelOf(b) === 'rupture' ? 0 : 1) || a.nom.localeCompare(b.nom, 'fr')) : null;
  const dues = canRead('facturation') ? INVOICES.filter((i) => statusOf(i) !== 'annulee' && remaining(i) > 0).sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id)) : null;
  const rdvs = canRead('rdv') ? RDVS.filter((r) => r.date === t).sort((a, b) => a.heure.localeCompare(b.heure)) : null;
  const events: { type: 'consultation' | 'rdv' | 'facture'; titre: string; detail: string; date: string; lien: string }[] = [];
  if (canRead('consultations')) for (const c of CONSULTATIONS) events.push({ type: 'consultation', titre: `Consultation, ${patientOf(c.patientId)?.nom ?? ''}`, detail: c.serviceLabel, date: c.createdAt, lien: '/consultations' });
  if (canRead('rdv')) for (const r of RDVS) events.push({ type: 'rdv', titre: `Rendez-vous, ${patientOf(r.patientId)?.nom ?? ''}`, detail: `${r.date.split('-').reverse().join('/')} à ${r.heure}, ${r.motif}`, date: r.history[r.history.length - 1]?.at ?? startsAt(r).toISOString(), lien: '/rendez-vous' });
  if (canRead('facturation')) for (const i of dues ?? []) events.push({ type: 'facture', titre: `Facture ${i.numero} non soldée`, detail: `${i.clientLabel}, reste ${remaining(i)} FCFA`, date: `${i.date}T12:00:00.000Z`, lien: '/facturation' });
  return {
    indicateurs: {
      animaux: canRead('patients') ? PATIENTS.length : null,
      rdv_jour: rdvs ? rdvs.filter((r) => r.statut !== 'annule').length : null,
      creances: dues ? sum(dues.map(remaining)) : null,
      alertes_stock: pharma ? pharma.length : null,
    },
    rdv_jour: rdvs && rdvs.map((r) => {
      const p = patientOf(r.patientId);
      const o = ownerOf(p?.ownerId ?? null);
      return { id: r.id, heure: r.heure, animal: p?.nom ?? '', proprietaire: o ? ownerName(o) : '', motif: r.motif, statut: r.statut, veterinaire: vetName(r.vetId) };
    }),
    rappels_vaccins: canRead('vaccinations') ? vaccineReminders(now, 5).map((v) => ({ id: v.id, animal: patientOf(v.patientId)?.nom ?? '', vaccin: v.vaccin, rappel: v.rappel, statut: rappelStatut(v.rappel, now) })) : null,
    alertes_pharmacie: pharma && pharma.slice(0, 5).map((a) => ({ id: a.id, nom: a.nom, quantite: a.quantite, seuil: a.seuil, niveau: levelOf(a), unite: a.unite })),
    activite_recente: events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    creances_en_cours: dues && dues.slice(0, 5).map((i) => ({ id: i.id, numero: i.numero, client: i.clientLabel, reste: remaining(i), total: net(i), date: i.date })),
    mises_bas_depassees: canRead('insemination') ? gestations(now).filter((g) => g.etat === 'passee').map((g) => ({ id: g.acte.id, patient: patientOf(g.acte.patientId)?.nom ?? '', prevue: g.acte.miseBasPrevue, jours: -(g.joursRestants ?? 0) })) : null,
  };
}

