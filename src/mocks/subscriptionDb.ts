import type { ModuleKey } from '@/core/auth/permissions';
import { CABINET } from './cabinetDb';
import type { Failure } from './profilesDb';

/**
 * Packs, cabinets membres et abonnements (spécification : portail public, inscription en 4 étapes, essai de 30 jours,
 * blocage à l'échéance). Ce fichier ne dépend pas de authDb : c'est authDb qui lit l'abonnement pour construire les accès.
 */
export type Periode = 'mensuel' | 'annuel';
export type EntiteType = 'cabinet_individuel' | 'cabinet_activite' | 'clinique' | 'reseau';
export const ENTITE_LABEL: Record<EntiteType, string> = { cabinet_individuel: 'Cabinet individuel', cabinet_activite: 'Cabinet en activité', clinique: 'Clinique', reseau: 'Réseau' };

export interface DemoPack {
  id: string; nom: string; cible: string; prix: number; engagement: string; fonctionnalites: string[]; modules: ModuleKey[];
  utilisateursMax: number | null; star: boolean; actif: boolean; personnalise: boolean;
}

/** Modules toujours disponibles, quel que soit le pack : administration du cabinet, support et CVthèque du réseau. */
export const ALWAYS_ON: ModuleKey[] = ['utilisateurs', 'habilitations', 'referentiels', 'support', 'cvtheque'];
export const PACK_MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'patients', label: 'Dossiers patients' }, { key: 'proprietaires', label: 'Propriétaires' }, { key: 'rdv', label: 'Rendez-vous' },
  { key: 'consultations', label: 'Consultations' }, { key: 'ordonnances', label: 'Ordonnances' }, { key: 'services', label: 'Services' },
  { key: 'pharmacie', label: 'Pharmacie' }, { key: 'stock', label: 'Stock' }, { key: 'ventes', label: 'Ventes de médicaments' }, { key: 'facturation', label: 'Facturation' },
  { key: 'vaccinations', label: 'Vaccinations' }, { key: 'reporting', label: 'Reporting' }, { key: 'hospitalisations', label: 'Hospitalisations' }, { key: 'insemination', label: 'Insémination' },
  { key: 'reseau', label: 'Réseau et forum' }, { key: 'paiements', label: 'Paiements électroniques' }, { key: 'comptes', label: 'Gestion de compte' },
];

export interface DemoSettings { essaiJours: number; anneeMoisOfferts: number }
export interface DemoPromo { id: string; code: string; pct: number; mois: number; limite: number; utilises: number; debut: string; fin: string; packs: string[]; actif: boolean; auto: boolean }

export interface Paiement { date: string; montant: number; libelle: string; moyen: string }
export interface DemoCabinetRec {
  id: string; nom: string; ordre: string; adresse: string; ville: string; telephone: string; email: string; responsable: string;
  entite: EntiteType; packId: string; periode: Periode; essai: boolean; debut: string; fin: string; promoCode: string;
  source: 'demo' | 'portail' | 'adhesion' | 'association'; veterinaires: number; doubleAuth: boolean; url: string; paiements: Paiement[];
}
export interface AuditEntry { id: string; date: string; par: string; action: string; cible: string }

const DAY = 86_400_000;
const iso = (n: number, from = Date.now()) => new Date(from + n * DAY).toISOString();
const day = (n: number) => iso(n).slice(0, 10);

const seedPacks = (): DemoPack[] => [
  {
    id: 'decouverte', nom: 'Découverte', cible: 'Cabinet individuel qui démarre', prix: 12_500, engagement: 'Sans engagement', utilisateursMax: 1, star: false, actif: true, personnalise: false,
    fonctionnalites: ['Dossiers patients et propriétaires', 'Rendez-vous et consultations', 'Ordonnances numériques', '1 utilisateur'],
    modules: ['patients', 'proprietaires', 'rdv', 'consultations', 'ordonnances', 'services'],
  },
  {
    id: 'essentiel', nom: 'Essentiel', cible: 'Cabinet en activité', prix: 25_000, engagement: 'Sans engagement', utilisateursMax: 3, star: true, actif: true, personnalise: false,
    fonctionnalites: ['Tout le pack Découverte', 'Facturation et caisse', 'Vaccinations et rappels', 'Pharmacie et stock', "Jusqu'à 3 utilisateurs"],
    modules: ['patients', 'proprietaires', 'rdv', 'consultations', 'ordonnances', 'services', 'pharmacie', 'stock', 'ventes', 'facturation', 'vaccinations', 'paiements'],
  },
  {
    id: 'professionnel', nom: 'Professionnel', cible: 'Clinique avec élevage', prix: 30_000, engagement: 'Sans engagement', utilisateursMax: null, star: false, actif: true, personnalise: false,
    fonctionnalites: ['Tout le pack Essentiel', 'Hospitalisation', 'Insémination et reproduction', 'Accès au réseau : forum, cas cliniques partagés, veille épidémio et annuaire', 'Utilisateurs illimités'],
    modules: ['patients', 'proprietaires', 'rdv', 'consultations', 'ordonnances', 'services', 'pharmacie', 'stock', 'ventes', 'facturation', 'vaccinations', 'reporting', 'hospitalisations', 'insemination', 'reseau', 'paiements', 'comptes'],
  },
  {
    id: 'reseau', nom: 'Réseau+', cible: 'Groupe ou réseau de cliniques', prix: 50_000, engagement: 'Sans engagement', utilisateursMax: null, star: false, actif: true, personnalise: false,
    fonctionnalites: ['Tout le pack Professionnel', 'Multi-cliniques mutualisées', 'Statistiques consolidées', 'Référentiels partagés', 'Support prioritaire'],
    modules: ['patients', 'proprietaires', 'rdv', 'consultations', 'ordonnances', 'services', 'pharmacie', 'stock', 'ventes', 'facturation', 'vaccinations', 'reporting', 'hospitalisations', 'insemination', 'reseau', 'paiements', 'comptes'],
  },
];

const seedSettings = (): DemoSettings => ({ essaiJours: 30, anneeMoisOfferts: 2 });

const seedPromos = (): DemoPromo[] => [
  { id: 'pr1', code: 'LANCEMENT5', pct: 5, mois: 6, limite: 10, utilises: 3, debut: day(-60), fin: day(120), packs: [], actif: true, auto: true },
  { id: 'pr2', code: 'JSV2026', pct: 15, mois: 3, limite: 30, utilises: 4, debut: day(-10), fin: day(40), packs: ['essentiel', 'professionnel'], actif: true, auto: false },
  { id: 'pr3', code: 'ETE2026', pct: 10, mois: 2, limite: 20, utilises: 20, debut: day(-150), fin: day(-60), packs: [], actif: false, auto: false },
];

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cabinet';

const seedCabinets = (): DemoCabinetRec[] => [
  { id: '1', nom: CABINET.nom, ordre: CABINET.ordre, adresse: CABINET.adresse, ville: 'Dakar', telephone: CABINET.telephone, email: CABINET.email, responsable: 'Amadou Sy', entite: 'clinique', packId: 'reseau', periode: 'mensuel', essai: false, debut: day(-165), fin: day(200), promoCode: '', source: 'demo', veterinaires: 2, doubleAuth: false, url: 'https://clinique-vet-dakar.vetepro.sn', paiements: [{ date: iso(-165), montant: 50_000, libelle: 'Abonnement Réseau+ (mensuel)', moyen: 'Wave' }] },
  { id: '2', nom: 'Clinique du Sine', ordre: 'ODVS-2210', adresse: 'Route de Fatick', ville: 'Fatick', telephone: '33 949 10 10', email: 'contact@clinique-sine.sn', responsable: 'Cheikh Sarr', entite: 'clinique', packId: 'professionnel', periode: 'mensuel', essai: false, debut: day(-95), fin: day(-3), promoCode: '', source: 'portail', veterinaires: 3, doubleAuth: false, url: 'https://clinique-du-sine.vetepro.sn', paiements: [] },
  { id: '3', nom: 'Cabinet Vétérinaire de Thiès', ordre: 'ODVS-3105', adresse: 'Avenue Malick Sy', ville: 'Thiès', telephone: '33 951 20 20', email: 'cabinet.thies@vet.sn', responsable: 'Aïssatou Mbaye', entite: 'cabinet_individuel', packId: 'decouverte', periode: 'mensuel', essai: true, debut: day(-18), fin: day(12), promoCode: 'LANCEMENT5', source: 'portail', veterinaires: 1, doubleAuth: false, url: 'https://cabinet-veterinaire-de-thies.vetepro.sn', paiements: [] },
  { id: '4', nom: 'Clinique Saint-Louis', ordre: 'ODVS-4402', adresse: 'Quai Roume', ville: 'Saint-Louis', telephone: '33 961 30 30', email: 'clinique.sl@vet.sn', responsable: 'Ousmane Diallo', entite: 'clinique', packId: 'professionnel', periode: 'annuel', essai: false, debut: day(-120), fin: day(245), promoCode: '', source: 'portail', veterinaires: 4, doubleAuth: true, url: 'https://clinique-saint-louis.vetepro.sn', paiements: [{ date: iso(-120), montant: 300_000, libelle: 'Abonnement Professionnel (annuel)', moyen: 'Carte •••• 4242' }] },
  { id: '5', nom: 'Cabinet de Kaolack', ordre: 'ODVS-5120', adresse: 'Rue du Marché', ville: 'Kaolack', telephone: '33 941 40 40', email: 'cabinet.kaolack@vet.sn', responsable: 'Fatou Sarr', entite: 'cabinet_individuel', packId: 'decouverte', periode: 'mensuel', essai: false, debut: day(-40), fin: day(4), promoCode: '', source: 'adhesion', veterinaires: 1, doubleAuth: false, url: 'https://cabinet-de-kaolack.vetepro.sn', paiements: [{ date: iso(-40), montant: 12_500, libelle: 'Abonnement Découverte (mensuel)', moyen: 'Orange Money' }] },
];

export let PACKS: DemoPack[] = seedPacks();
export let SETTINGS: DemoSettings = seedSettings();
export let PROMOS: DemoPromo[] = seedPromos();
export let CABINETS: DemoCabinetRec[] = seedCabinets();
export let AUDIT: AuditEntry[] = [];
export const resetSubscriptions = () => { PACKS = seedPacks(); SETTINGS = seedSettings(); PROMOS = seedPromos(); CABINETS = seedCabinets(); AUDIT = []; };

export const getPack = (id: string) => PACKS.find((p) => p.id === id);
export const getCabinet = (id: string) => CABINETS.find((c) => c.id === id);
export const cabinetNom = (c: DemoCabinetRec) => (c.id === '1' ? CABINET.nom : c.nom);
export const cabinetUrl = (nom: string) => `https://${slug(nom)}.vetepro.sn`;

export function trace(par: string, action: string, cible: string, now = new Date()) {
  AUDIT.unshift({ id: `a${AUDIT.length + 1}`, date: now.toISOString(), par, action, cible });
}

/* ---------- Abonnement d'un cabinet ---------- */

export type Statut = 'essai' | 'actif' | 'expire';
export const statutOf = (c: DemoCabinetRec, now = Date.now()): Statut => (Date.parse(c.fin) <= now ? 'expire' : c.essai ? 'essai' : 'actif');
export const joursRestants = (c: DemoCabinetRec, now = Date.now()) => Math.max(0, Math.ceil((Date.parse(c.fin) - now) / DAY));

/** Modules ouverts par le pack du cabinet, plus ceux qui sont toujours disponibles. */
export function packModules(cabinetId: string): Set<ModuleKey> {
  const c = getCabinet(cabinetId);
  const p = c && getPack(c.packId);
  return new Set<ModuleKey>([...(p?.modules ?? []), ...ALWAYS_ON]);
}

/* ---------- Tarifs, offre de lancement et codes promotionnels ---------- */

const inRange = (p: DemoPromo, now: number) => Date.parse(p.debut) <= now && now <= Date.parse(p.fin) + DAY - 1;
export const promoDisponible = (p: DemoPromo, packId: string, now = Date.now()) => p.actif && p.utilises < p.limite && inRange(p, now) && (p.packs.length === 0 || p.packs.includes(packId));
export const promoAuto = (packId: string, now = Date.now()) => PROMOS.find((p) => p.auto && promoDisponible(p, packId, now));

export interface Quote { base: number; remise: number; net: number; promo: DemoPromo | null; periode: Periode }
/** Prix d'une période : l'annuel offre `anneeMoisOfferts` mois ; un code valide remplace l'offre de lancement automatique. */
export function quote(packId: string, periode: Periode, code = '', now = Date.now()): Quote | Failure {
  const pack = getPack(packId);
  if (!pack) return { status: 422, code: 'pack_requis', message: 'Sélectionnez un package' };
  let promo: DemoPromo | null = null;
  if (code.trim()) {
    const p = PROMOS.find((x) => x.code === code.trim().toUpperCase());
    if (!p || !promoDisponible(p, packId, now)) return { status: 422, code: 'promo_invalide', message: 'Code promotionnel invalide, expiré ou non applicable à ce pack' };
    promo = p;
  } else promo = promoAuto(packId, now) ?? null;
  const base = periode === 'annuel' ? pack.prix * (12 - SETTINGS.anneeMoisOfferts) : pack.prix;
  const remise = promo ? Math.round((base * promo.pct) / 100) : 0;
  return { base, remise, net: base - remise, promo, periode };
}
export const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('base' in x) && !('id' in x);

/* ---------- Moyen de paiement (simulé jusqu'au lot L8) ---------- */

export type Moyen = { type: 'carte'; numero: string; expiration: string; cvc: string } | { type: 'mobile'; operateur: string; numero: string } | { type: 'pispi'; alias: string };
export const OPERATEURS = ['Wave', 'Orange Money', 'Free Money'];

const luhn = (digits: string) => {
  let sum = 0;
  [...digits].reverse().forEach((d, i) => { let n = Number(d); if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; } sum += n; });
  return sum % 10 === 0;
};

/** Contrôle du format (spécification : cartes et numéros de téléphone). Une carte finissant par 0002 est refusée par la banque simulée. */
export function checkMoyen(m: Moyen | null | undefined, now = new Date()): Failure | null {
  const bad = (message: string, code = 'moyen_invalide'): Failure => ({ status: 422, code, message });
  if (!m) return bad('Choisissez un moyen de paiement', 'moyen_requis');
  if (m.type === 'carte') {
    const digits = m.numero.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(digits) || !luhn(digits)) return bad('Numéro de carte invalide');
    const [mm, yy] = m.expiration.split('/').map(Number);
    if (!mm || mm < 1 || mm > 12 || !yy) return bad("Date d'expiration invalide (MM/AA)");
    if (2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1)) return bad('La carte est expirée');
    if (!/^\d{3,4}$/.test(m.cvc)) return bad('Code de sécurité invalide');
    if (digits.endsWith('0002')) return bad('Paiement refusé par la banque', 'paiement_refuse');
    return null;
  }
  if (m.type === 'pispi') {
    const a = m.alias.trim();
    const ok = a.replace(/\D/g, '').length >= 9 && !/[@a-z]/i.test(a.replace(/^\+/, '')) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a) || /^SN-PI-\d{6,}$/i.test(a);
    return ok ? null : bad('Alias PI-SPI invalide');
  }
  if (!OPERATEURS.includes(m.operateur)) return bad("Sélectionnez l'opérateur");
  if (m.numero.replace(/\D/g, '').length < 9) return bad('Numéro de téléphone invalide');
  return null;
}
export const moyenLabel = (m: Moyen) => (m.type === 'carte' ? `Carte •••• ${m.numero.replace(/\s/g, '').slice(-4)}` : m.type === 'pispi' ? `PI-SPI ${m.alias}` : `${m.operateur} ${m.numero}`);

/* ---------- Renouvellement ---------- */

/** Le cabinet choisit un pack et paie : l'accès est rétabli et l'échéance prolongée d'un mois ou d'un an à partir d'aujourd'hui (ou de l'ancienne échéance si elle n'est pas passée). */
export function renew(cabinetId: string, i: { packId: string; periode: Periode; promoCode: string; moyen: Moyen | null }, by: string, now = new Date()): DemoCabinetRec | Failure {
  const c = getCabinet(cabinetId);
  if (!c) return { status: 404, code: 'not_found', message: 'Cabinet introuvable' };
  const pack = getPack(i.packId);
  if (!pack || !pack.actif || (pack.personnalise && pack.id !== c.packId)) return { status: 422, code: 'pack_requis', message: 'Sélectionnez un package' };
  const q = quote(i.packId, i.periode, i.promoCode, now.getTime());
  if (isFailure(q)) return q;
  const refus = checkMoyen(i.moyen, now);
  if (refus) return refus;
  const from = Math.max(now.getTime(), Date.parse(c.fin));
  c.packId = i.packId; c.periode = i.periode; c.essai = false;
  c.debut = now.toISOString(); c.fin = new Date(from + (i.periode === 'annuel' ? 365 : 30) * DAY).toISOString();
  c.paiements.unshift({ date: now.toISOString(), montant: q.net, libelle: `Abonnement ${pack.nom} (${i.periode})${q.promo ? ` avec ${q.promo.code}` : ''}`, moyen: moyenLabel(i.moyen!) });
  if (q.promo) { q.promo.utilises += 1; c.promoCode = q.promo.code; }
  trace(by, 'Renouvellement de l\'abonnement', cabinetNom(c), now);
  return c;
}
