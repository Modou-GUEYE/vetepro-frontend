import type { Failure } from './profilesDb';
import { INVOICES, addCredit, addPayment, getInvoice, remaining, statusOf } from './billingDb';

/** Canaux branchés : Wave et Orange Money (via un agrégateur) et PI-SPI (alias téléphone, e-mail ou SN-PI-123456). */
export const CANALS = ['Wave', 'Orange Money', 'PI-SPI'] as const;
export type Canal = (typeof CANALS)[number];
export type Methode = 'qr' | 'demande';
export type TxStatus = 'attente' | 'succes' | 'refus' | 'expire' | 'annule';

export interface TxStep { statut: TxStatus; date: string }
export interface DemoTx {
  id: string; ref: string; date: string; factureId: string | null; canal: Canal; methode: Methode; payeur: string; alias: string;
  montant: number; libelle: string; statut: TxStatus; motif: string; historique: TxStep[]; rembourse: number; expireA: string;
}
export interface DemoRefund { id: string; reference: string; date: string; origine: string; beneficiaire: string; canal: string; montant: number; motif: string; avoir: string; by: string }
export interface DemoSuspens { id: string; ref: string; date: string; canal: Canal; payeur: string; alias: string; montant: number; libelle: string; statut: 'suspens' | 'rattache' | 'rembourse'; factureId: string | null; motif: string }

const iso = (d: Date) => d.toISOString();
const minutes = (d: Date, n: number) => new Date(d.getTime() + n * 60000);
const phoneOk = (s: string) => /^(\+221)?7[0-8]\d{7}$/.test(s.replace(/[\s.-]/g, ''));
const aliasOk = (canal: string, s: string) => phoneOk(s) || (canal === 'PI-SPI' && (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()) || /^SN-PI-\d{6,}$/i.test(s.trim())));

const seed = () => {
  const d = (days: number, h: number) => { const x = new Date('2026-10-28T00:00:00.000Z'); x.setUTCDate(x.getUTCDate() - days); x.setUTCHours(h); return x; };
  const tx = (n: number, p: Omit<DemoTx, 'id' | 'ref' | 'expireA' | 'rembourse' | 'motif' | 'libelle'> & { motif?: string; rembourse?: number; libelle?: string }): DemoTx =>
    ({ id: String(n), ref: `TX-26-${String(480 + n).padStart(6, '0')}`, expireA: iso(minutes(new Date(p.date), 5)), rembourse: 0, motif: '', libelle: p.factureId ? '' : 'Vente comptoir', ...p });
  return {
    expirationMin: 5,
    transactions: [
      tx(1, { date: iso(d(12, 12)), factureId: '2', canal: 'Wave', methode: 'qr', payeur: 'Fatou Sané', alias: '70 987 65 43', montant: 8000, statut: 'succes', historique: [{ statut: 'attente', date: iso(d(12, 12)) }, { statut: 'succes', date: iso(minutes(d(12, 12), 2)) }] }),
      tx(2, { date: iso(d(1, 16)), factureId: '3', canal: 'Orange Money', methode: 'demande', payeur: 'Moussa Diallo', alias: '77 123 45 67', montant: 10000, statut: 'expire', historique: [{ statut: 'attente', date: iso(d(1, 16)) }, { statut: 'expire', date: iso(minutes(d(1, 16), 5)) }] }),
      tx(3, { date: iso(d(1, 17)), factureId: '3', canal: 'Wave', methode: 'demande', payeur: 'Moussa Diallo', alias: '77 123 45 67', montant: 5000, statut: 'refus', motif: 'Solde insuffisant', historique: [{ statut: 'attente', date: iso(d(1, 17)) }, { statut: 'refus', date: iso(minutes(d(1, 17), 1)) }] }),
      tx(4, { date: iso(d(6, 10)), factureId: null, canal: 'Wave', methode: 'qr', payeur: 'Client comptoir', alias: '-', montant: 9300, statut: 'annule', historique: [{ statut: 'attente', date: iso(d(6, 10)) }, { statut: 'annule', date: iso(minutes(d(6, 10), 1)) }] }),
    ] as DemoTx[],
    remboursements: [] as DemoRefund[],
    suspens: [
      { id: '1', ref: 'WV-26-55120', date: iso(d(4, 13)), canal: 'Wave', payeur: 'Inconnu (70 *** ** 43)', alias: '70 987 65 43', montant: 3000, libelle: '', statut: 'suspens', factureId: null, motif: '' },
      { id: '2', ref: 'OM-26-33018', date: iso(d(2, 9)), canal: 'Orange Money', payeur: 'Moussa Diallo', alias: '77 123 45 67', montant: 4500, libelle: 'Paiement vétérinaire', statut: 'suspens', factureId: null, motif: '' },
    ] as DemoSuspens[],
  };
};

let state = seed();
export const resetPayments = () => { state = seed(); };
export const getExpirationMin = () => state.expirationMin;

const notFound = (what: string): Failure => ({ status: 404, code: 'not_found', message: `${what} introuvable` });
const invalid = (message: string, code = 'invalid'): Failure => ({ status: 422, code, message });

/** Une transaction en attente expire une fois le délai écoulé ; la facture reste inchangée. */
function sweep(now: Date) {
  for (const t of state.transactions) {
    if (t.statut === 'attente' && new Date(t.expireA) <= now) { t.statut = 'expire'; t.historique.push({ statut: 'expire', date: t.expireA }); }
  }
}

export function setExpiration(minutes_: number): { expirationMin: number } | Failure {
  if (!Number.isInteger(minutes_) || minutes_ < 1 || minutes_ > 60) return invalid('Le délai doit être compris entre 1 et 60 minutes');
  state.expirationMin = minutes_;
  return { expirationMin: minutes_ };
}

/** Paiement d'une facture, ou paiement libre (acompte, vente comptoir) quand `factureId` est vide. */
export function createTx(input: { factureId: string | null; canal: string; methode: string; alias: string; montant: number; libelle?: string }, now = new Date()): DemoTx | Failure {
  sweep(now);
  const inv = input.factureId ? getInvoice(input.factureId) : null;
  if (inv && 'status' in inv) return inv;
  if (!CANALS.includes(input.canal as Canal)) return invalid("Choisissez Wave, Orange Money ou PI-SPI");
  if (input.methode !== 'qr' && input.methode !== 'demande') return invalid('Choisissez le QR code ou la demande de paiement');
  if (inv && statusOf(inv) === 'annulee') return { status: 409, code: 'cancelled', message: 'Cette facture est annulée' };
  if (!Number.isInteger(input.montant) || input.montant < 1) return invalid('Le montant doit être un nombre entier positif');
  if (inv && input.montant > remaining(inv)) return invalid(`Le montant dépasse le reste dû (${remaining(inv)} FCFA)`, 'overpayment');
  if (input.methode === 'demande' && !aliasOk(input.canal, input.alias)) return invalid(input.canal === 'PI-SPI' ? 'Alias du payeur invalide' : 'Numéro du payeur invalide');
  if (inv && state.transactions.some((t) => t.factureId === inv.id && t.statut === 'attente')) return { status: 409, code: 'pending_exists', message: 'Une transaction est déjà en attente pour cette facture' };
  const n = Math.max(0, ...state.transactions.map((t) => Number(t.id))) + 1;
  const t: DemoTx = {
    id: String(n), ref: `TX-26-${String(480 + n).padStart(6, '0')}`, date: iso(now), factureId: inv ? inv.id : null, canal: input.canal as Canal, methode: input.methode,
    payeur: inv ? inv.clientLabel : 'Client comptoir', alias: input.methode === 'demande' ? input.alias.trim() : '-', montant: input.montant, libelle: inv ? '' : (input.libelle?.trim() || 'Paiement libre'),
    statut: 'attente', motif: '', historique: [{ statut: 'attente', date: iso(now) }], rembourse: 0, expireA: iso(minutes(now, state.expirationMin)),
  };
  state.transactions.push(t);
  return t;
}

export function getTx(id: string, now = new Date()): DemoTx | Failure {
  sweep(now);
  return state.transactions.find((t) => t.id === id) ?? notFound('Transaction');
}

/** Retour de l'opérateur (simulé en démonstration) : la facture n'est mise à jour qu'à la confirmation. */
export function settleTx(id: string, outcome: 'succes' | 'refus', now = new Date(), motif = 'Refusé par l\'opérateur'): DemoTx | Failure {
  const t = getTx(id, now);
  if ('status' in t) return t;
  if (t.statut !== 'attente') return { status: 409, code: 'not_pending', message: 'Cette transaction n\'est plus en attente' };
  if (outcome === 'succes') {
    const inv = INVOICES.find((x) => x.id === t.factureId);
    if (inv) {
      const due = remaining(inv);
      if (due > 0) { const r = addPayment(inv.id, Math.min(t.montant, due), t.canal, `${t.canal} ${t.ref}`, now); if ('status' in r) return r; }
    }
    t.statut = 'succes';
  } else { t.statut = 'refus'; t.motif = motif; }
  t.historique.push({ statut: t.statut, date: iso(now) });
  return t;
}

export function cancelTx(id: string, now = new Date()): DemoTx | Failure {
  const t = getTx(id, now);
  if ('status' in t) return t;
  if (t.statut !== 'attente') return { status: 409, code: 'not_pending', message: 'Seule une transaction en attente peut être annulée' };
  t.statut = 'annule'; t.historique.push({ statut: 'annule', date: iso(now) });
  return t;
}

/** Relance : une demande en attente est renvoyée avec un nouveau délai ; une transaction expirée, refusée ou annulée donne une nouvelle transaction. */
export function relaunchTx(id: string, now = new Date()): DemoTx | Failure {
  const t = getTx(id, now);
  if ('status' in t) return t;
  if (t.statut === 'succes') return { status: 409, code: 'already_paid', message: 'Cette transaction est déjà confirmée' };
  if (t.statut === 'attente') {
    if (t.methode !== 'demande') return { status: 409, code: 'not_request', message: 'Seule une demande de paiement peut être renvoyée' };
    t.expireA = iso(minutes(now, state.expirationMin)); t.historique.push({ statut: 'attente', date: iso(now) });
    return t;
  }
  return createTx({ factureId: t.factureId, canal: t.canal, methode: t.methode, alias: t.alias, montant: t.montant, libelle: t.libelle }, now);
}

export function listTx(p: { statut?: string; canal?: string; q?: string; du?: string; au?: string; factureId?: string }, now = new Date()): DemoTx[] {
  sweep(now);
  const q = (p.q ?? '').trim().toLowerCase();
  return state.transactions
    .filter((t) => !p.statut || t.statut === p.statut)
    .filter((t) => !p.canal || t.canal === p.canal)
    .filter((t) => !p.factureId || t.factureId === p.factureId)
    .filter((t) => !p.du || t.date.slice(0, 10) >= p.du)
    .filter((t) => !p.au || t.date.slice(0, 10) <= p.au)
    .filter((t) => !q || `${t.ref} ${t.payeur} ${t.alias}`.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Remboursement (Administrateur) : motif obligatoire, canal de remboursement, avoir émis sur la facture sauf refus explicite. */
export function refundTx(id: string, montant: number, motif: string, by: string, now = new Date(), opts: { canal?: string; avoir?: boolean } = {}): DemoRefund | Failure {
  const t = getTx(id, now);
  if ('status' in t) return t;
  if (t.statut !== 'succes') return { status: 409, code: 'not_paid', message: 'Seul un paiement confirmé peut être remboursé' };
  if (!motif.trim()) return invalid('Le motif du remboursement est obligatoire');
  const max = t.montant - t.rembourse;
  if (!Number.isInteger(montant) || montant < 1 || montant > max) return invalid(`Le montant doit être compris entre 1 et ${max} FCFA`);
  const canal = opts.canal ?? t.canal;
  if (![t.canal, 'Espèces', 'Virement'].includes(canal)) return invalid('Canal de remboursement inconnu');
  let avoir = '';
  let numero = '';
  const inv = t.factureId ? INVOICES.find((x) => x.id === t.factureId) : undefined;
  if (inv) {
    numero = inv.numero;
    if (opts.avoir !== false) {
      const r = addCredit(inv.id, montant, `Remboursement ${t.ref} : ${motif.trim()}`, by, now);
      if ('status' in r) return r;
      avoir = r.credits[r.credits.length - 1].numero;
    }
  }
  t.rembourse += montant;
  return pushRefund({ origine: numero ? `${t.ref} (${numero})` : t.ref, beneficiaire: `${t.payeur}${t.alias !== '-' ? ` (${t.alias})` : ''}`, canal, montant, motif: motif.trim(), avoir, by }, now);
}

function pushRefund(r: Omit<DemoRefund, 'id' | 'reference' | 'date'>, now: Date): DemoRefund {
  const n = state.remboursements.length + 1;
  const refund: DemoRefund = { id: String(n), reference: `RMB-26-${String(40 + n).padStart(6, '0')}`, date: iso(now), ...r };
  state.remboursements.push(refund);
  return refund;
}

export const listRefunds = () => [...state.remboursements].sort((a, b) => b.date.localeCompare(a.date));
export const listSuspens = () => state.suspens.filter((s) => s.statut === 'suspens');
export const allSuspens = () => [...state.suspens].sort((a, b) => (a.statut === 'suspens' ? 0 : 1) - (b.statut === 'suspens' ? 0 : 1) || b.date.localeCompare(a.date));

/** Paiement reçu sans facture identifiable : rattaché à une facture (jamais au-delà du reste dû) ou rejeté avec motif. */
export function attachSuspens(id: string, factureId: string, now = new Date()): DemoSuspens | Failure {
  const s = state.suspens.find((x) => x.id === id);
  if (!s) return notFound('Paiement');
  if (s.statut !== 'suspens') return { status: 409, code: 'already_processed', message: 'Ce paiement est déjà traité' };
  const inv = getInvoice(factureId);
  if ('status' in inv) return inv;
  if (s.montant > remaining(inv)) return invalid(`Le paiement dépasse le reste dû de la facture (${remaining(inv)} FCFA)`, 'overpayment');
  const r = addPayment(inv.id, s.montant, s.canal, `${s.canal} ${s.ref}`, now);
  if ('status' in r) return r;
  s.statut = 'rattache'; s.factureId = inv.id;
  return s;
}

/** Paiement sans facture identifiable remboursé au payeur (Administrateur), avec motif obligatoire. */
export function refundSuspens(id: string, motif: string, by: string, now = new Date()): DemoRefund | Failure {
  const s = state.suspens.find((x) => x.id === id);
  if (!s) return notFound('Paiement');
  if (s.statut !== 'suspens') return { status: 409, code: 'already_processed', message: 'Ce paiement est déjà traité' };
  if (!motif.trim()) return invalid('Le motif du remboursement est obligatoire');
  s.statut = 'rembourse'; s.motif = motif.trim();
  return pushRefund({ origine: `${s.ref} (en suspens)`, beneficiaire: `${s.payeur} (${s.alias})`, canal: s.canal, montant: s.montant, motif: s.motif, avoir: '', by }, now);
}

export function paymentStats(now = new Date()) {
  sweep(now);
  const sum = (l: DemoTx[]) => l.reduce((n, t) => n + t.montant, 0);
  const by = (s: TxStatus) => state.transactions.filter((t) => t.statut === s);
  return {
    encaisse: sum(by('succes')), nb_encaisse: by('succes').length, en_attente: sum(by('attente')), nb_attente: by('attente').length,
    echecs: by('refus').length + by('expire').length, rembourse: state.remboursements.reduce((n, r) => n + r.montant, 0), nb_rembourse: state.remboursements.length,
    non_identifies: listSuspens().length, nb_transactions: state.transactions.length,
  };
}
