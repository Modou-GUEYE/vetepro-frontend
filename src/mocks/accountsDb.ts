import type { Failure } from './profilesDb';
import { listRefunds, listTx } from './paymentsDb';

/** Gestion de compte (API Business) : comptes, alias, transferts et demandes de paiement. Données de démonstration. */
export type AccountKind = 'Banque' | 'Wallet';
export type AliasType = 'Téléphone' | 'E-mail' | 'Identifiant marchand';
export const ALIAS_TYPES: AliasType[] = ['Téléphone', 'E-mail', 'Identifiant marchand'];
export type TransferType = 'Intercomptes' | 'Simple' | 'Multiple';
export type TransferStatus = 'attente' | 'succes';
export type RequestStatus = 'attente' | 'paye' | 'refuse' | 'annule';

export interface DemoAccount { id: string; type: AccountKind; nom: string; institution: string; numero: string; solde: number; principal: boolean; canal: string | null }
export interface DemoAlias { id: string; compteId: string; type: AliasType; valeur: string; defaut: boolean; actif: boolean; date: string }
export interface Beneficiary { nom: string; alias: string; montant: number }
export interface DemoTransfer { id: string; ref: string; date: string; type: TransferType; deId: string; versId: string | null; benefs: Beneficiary[]; montant: number; motif: string; statut: TransferStatus }
export interface DemoRecipient { nom: string; alias: string; montant: number; statut: RequestStatus }
export interface DemoRequest { id: string; ref: string; date: string; type: 'Simple' | 'Multiple'; canal: string; compteId: string; motif: string; echeance: string; destinataires: DemoRecipient[] }

/** Délai (secondes) après lequel un transfert transmis est confirmé par le participant. */
export const CONFIRM_DELAY_S = 5;
const OTP_TTL_MIN = 5;

const iso = (d: Date) => d.toISOString();
const day = (daysAgo: number, h = 10) => { const x = new Date('2026-10-28T00:00:00.000Z'); x.setUTCDate(x.getUTCDate() - daysAgo); x.setUTCHours(h); return iso(x); };
const phoneOk = (s: string) => /^(\+221)?7[0-8]\d{7}$/.test(s.replace(/[\s.-]/g, ''));
/** Destinataire d'une demande : un numéro ; PI-SPI accepte aussi une adresse e-mail ou un identifiant SN-PI-123456. */
const recipientOk = (canal: string, s: string) => phoneOk(s) || (canal === 'PI-SPI' && (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || /^SN-PI-\d{6,}$/i.test(s)));
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const aliasOk = (s: string) => phoneOk(s) || emailOk(s) || /^[A-Z0-9-]{4,20}$/i.test(s);
const invalid = (message: string, code = 'invalid'): Failure => ({ status: 422, code, message });
const notFound = (what: string): Failure => ({ status: 404, code: 'not_found', message: `${what} introuvable` });

const seed = () => ({
  comptes: [
    { id: '1', type: 'Banque', nom: 'Compte courant professionnel', institution: 'CBAO Groupe Attijariwafa', numero: 'SN012 01001 036180012345 67', solde: 2845000, principal: true, canal: null },
    { id: '2', type: 'Wallet', nom: 'Wave Business', institution: 'Wave', numero: 'Marchand M-77001', solde: 412500, principal: false, canal: 'Wave' },
    { id: '3', type: 'Wallet', nom: 'Orange Money Marchand', institution: 'Orange Money', numero: 'Code marchand 448812', solde: 186000, principal: false, canal: 'Orange Money' },
    { id: '4', type: 'Wallet', nom: 'PI-SPI Marchand', institution: 'PI-SPI', numero: 'Alias SN-PI-448120', solde: 95000, principal: false, canal: 'PI-SPI' },
  ] as DemoAccount[],
  alias: [
    { id: '1', compteId: '2', type: 'Téléphone', valeur: '77 001 00 00', defaut: true, actif: true, date: '2025-11-18' },
    { id: '2', compteId: '2', type: 'Identifiant marchand', valeur: 'VETSUD-ZIG', defaut: false, actif: true, date: '2026-03-02' },
    { id: '3', compteId: '3', type: 'Téléphone', valeur: '77 002 00 00', defaut: true, actif: true, date: '2026-01-10' },
    { id: '4', compteId: '3', type: 'E-mail', valeur: 'paiement@vetsud.sn', defaut: false, actif: true, date: '2026-01-10' },
    { id: '5', compteId: '4', type: 'Identifiant marchand', valeur: 'SN-PI-448120', defaut: true, actif: true, date: '2026-10-05' },
  ] as DemoAlias[],
  transferts: [
    { id: '1', ref: 'TRF-26-0031', date: day(15), type: 'Intercomptes', deId: '2', versId: '1', benefs: [{ nom: 'Compte courant professionnel', alias: 'SN012 ... 4567', montant: 300000 }], montant: 300000, motif: 'Reversement hebdomadaire Wave', statut: 'succes' },
    { id: '2', ref: 'TRF-26-0034', date: day(7, 15), type: 'Multiple', deId: '1', versId: null, benefs: [{ nom: 'Ibrahima Fall', alias: '77 003 00 00', montant: 150000 }, { nom: 'Omar Diouf', alias: '77 004 00 00', montant: 120000 }], montant: 270000, motif: 'Primes de garde', statut: 'succes' },
  ] as DemoTransfer[],
  demandes: [
    { id: '1', ref: 'DP-26-0007', date: day(2, 9), type: 'Multiple', canal: 'Wave', compteId: '2', motif: 'Participation à la campagne de vaccination', echeance: '2026-11-02', destinataires: [{ nom: 'Moussa Diallo', alias: '77 123 45 67', montant: 5000, statut: 'paye' }, { nom: 'Fatou Sané', alias: '70 987 65 43', montant: 5000, statut: 'attente' }] },
  ] as DemoRequest[],
});

let state = seed();
let otp: { userId: string; code: string; expireA: number } | null = null;
export const resetAccounts = () => { state = seed(); otp = null; };

/** Un transfert transmis est confirmé par le participant après un court délai ; le solde est débité dès la transmission. */
function sweep(now: Date) {
  for (const t of state.transferts) if (t.statut === 'attente' && now.getTime() - new Date(t.date).getTime() >= CONFIRM_DELAY_S * 1000) t.statut = 'succes';
}

export const listAccounts = () => state.comptes;
export const getAccount = (id: string) => state.comptes.find((c) => c.id === id);
export const totalBalance = () => state.comptes.reduce((n, c) => n + c.solde, 0);

// ---- Alias ----
export const listAlias = () => state.alias;

export function addAlias(input: { compteId: string; type: string; valeur: string; defaut: boolean }, now = new Date()): DemoAlias | Failure {
  const compte = getAccount(input.compteId);
  if (!compte) return notFound('Compte');
  if (compte.type === 'Banque') return invalid("Un alias se rattache à un portefeuille, pas au compte bancaire");
  if (!ALIAS_TYPES.includes(input.type as AliasType)) return invalid("Type d'alias inconnu");
  const valeur = input.valeur.trim();
  const ok = input.type === 'Téléphone' ? phoneOk(valeur) : input.type === 'E-mail' ? emailOk(valeur) : /^[A-Z0-9-]{4,20}$/i.test(valeur);
  if (!ok) return invalid(`Format invalide pour un alias de type ${input.type}`);
  if (state.alias.some((a) => a.compteId === compte.id && a.valeur.toLowerCase() === valeur.toLowerCase())) return { status: 409, code: 'duplicate', message: 'Alias déjà enregistré sur ce compte' };
  const first = !state.alias.some((a) => a.compteId === compte.id && a.actif);
  const defaut = input.defaut || first;
  if (defaut) state.alias.filter((a) => a.compteId === compte.id).forEach((a) => { a.defaut = false; });
  const a: DemoAlias = { id: String(Math.max(0, ...state.alias.map((x) => Number(x.id))) + 1), compteId: compte.id, type: input.type as AliasType, valeur, defaut, actif: true, date: iso(now).slice(0, 10) };
  state.alias.push(a);
  return a;
}

export function setDefaultAlias(id: string): DemoAlias | Failure {
  const a = state.alias.find((x) => x.id === id);
  if (!a) return notFound('Alias');
  if (!a.actif) return { status: 409, code: 'inactive', message: 'Un alias désactivé ne peut pas être par défaut' };
  state.alias.filter((x) => x.compteId === a.compteId).forEach((x) => { x.defaut = false; });
  a.defaut = true;
  return a;
}

export function toggleAlias(id: string): DemoAlias | Failure {
  const a = state.alias.find((x) => x.id === id);
  if (!a) return notFound('Alias');
  if (a.actif && a.defaut) return { status: 409, code: 'is_default', message: "Choisissez d'abord un autre alias par défaut" };
  a.actif = !a.actif;
  return a;
}

export function deleteAlias(id: string): true | Failure {
  const a = state.alias.find((x) => x.id === id);
  if (!a) return notFound('Alias');
  if (a.defaut) return { status: 409, code: 'is_default', message: "Choisissez d'abord un autre alias par défaut" };
  state.alias = state.alias.filter((x) => x.id !== id);
  return true;
}

// ---- Transferts ----
/** Code de validation envoyé par SMS ; en démonstration il est renvoyé dans la réponse. */
export function requestCode(userId: string, now = new Date()): { code: string; expireA: string } {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otp = { userId, code, expireA: now.getTime() + OTP_TTL_MIN * 60000 };
  return { code, expireA: iso(new Date(otp.expireA)) };
}

export function listTransfers(now = new Date()) { sweep(now); return [...state.transferts].sort((a, b) => b.date.localeCompare(a.date)); }

export interface TransferInput { type: string; deId: string; versId?: string; benefs: Beneficiary[]; montant?: number; motif: string; code: string }

export function createTransfer(input: TransferInput, userId: string, now = new Date()): DemoTransfer | Failure {
  sweep(now);
  const de = getAccount(input.deId);
  if (!de) return notFound('Compte débité');
  if (!['Intercomptes', 'Simple', 'Multiple'].includes(input.type)) return invalid('Type de transfert inconnu');
  const type = input.type as TransferType;
  let benefs: Beneficiary[];
  let versId: string | null = null;
  if (type === 'Intercomptes') {
    const vers = getAccount(input.versId ?? '');
    if (!vers) return notFound('Compte crédité');
    if (vers.id === de.id) return invalid('Choisissez un compte différent');
    if (!Number.isInteger(input.montant) || (input.montant ?? 0) < 1) return invalid('Le montant doit être un nombre entier positif');
    benefs = [{ nom: vers.nom, alias: vers.numero, montant: input.montant! }];
    versId = vers.id;
  } else {
    benefs = input.benefs.map((b) => ({ nom: b.nom.trim(), alias: b.alias.trim(), montant: b.montant }));
    if (benefs.length === 0) return invalid('Ajoutez au moins un bénéficiaire');
    if (type === 'Simple' && benefs.length !== 1) return invalid('Un transfert simple a un seul bénéficiaire');
    if (type === 'Multiple' && benefs.length < 2) return invalid('Un transfert multiple a au moins deux bénéficiaires');
    for (const b of benefs) {
      if (!b.nom || !b.alias) return invalid('Chaque bénéficiaire doit avoir un nom et un numéro ou alias');
      if (!aliasOk(b.alias)) return invalid(`Numéro ou alias invalide : ${b.alias}`);
      if (!Number.isInteger(b.montant) || b.montant < 1) return invalid('Chaque montant doit être un nombre entier positif');
    }
  }
  if (!input.motif.trim()) return invalid('Le motif est obligatoire');
  const montant = benefs.reduce((n, b) => n + b.montant, 0);
  if (montant > de.solde) return invalid(`Solde insuffisant sur ${de.nom} (${de.solde} FCFA)`, 'insufficient_funds');
  if (!otp || otp.userId !== userId || otp.expireA < now.getTime()) return invalid('Demandez un code de validation', 'code_required');
  if (otp.code !== input.code.trim()) return invalid('Code de validation incorrect', 'code_invalid');
  otp = null;
  de.solde -= montant;
  if (versId) { const vers = getAccount(versId)!; vers.solde += montant; }
  const n = Math.max(0, ...state.transferts.map((t) => Number(t.id))) + 1;
  const t: DemoTransfer = { id: String(n), ref: `TRF-26-${String(30 + n).padStart(4, '0')}`, date: iso(now), type, deId: de.id, versId, benefs, montant, motif: input.motif.trim(), statut: type === 'Intercomptes' ? 'succes' : 'attente' };
  state.transferts.push(t);
  return t;
}

// ---- Demandes de paiement ----
export const listRequests = () => [...state.demandes].sort((a, b) => b.date.localeCompare(a.date));
export const requestStatus = (d: DemoRequest): 'paye' | 'partiel' | 'attente' | 'cloturee' => {
  const paid = d.destinataires.filter((r) => r.statut === 'paye').length;
  if (paid === d.destinataires.length) return 'paye';
  if (d.destinataires.every((r) => r.statut !== 'attente')) return 'cloturee';
  return paid > 0 ? 'partiel' : 'attente';
};

export function createRequest(input: { multi: boolean; canal: string; echeance: string; motif: string; destinataires: Beneficiary[] }, now = new Date()): DemoRequest | Failure {
  const compte = state.comptes.find((c) => c.canal === input.canal);
  if (!compte) return invalid('Choisissez Wave, Orange Money ou PI-SPI');
  if (!input.motif.trim()) return invalid('Le motif est obligatoire');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.echeance) || input.echeance < iso(now).slice(0, 10)) return invalid("L'échéance ne peut pas être passée");
  const dest = input.destinataires.map((r) => ({ nom: r.nom.trim(), alias: r.alias.trim(), montant: r.montant }));
  if (dest.length === 0) return invalid('Ajoutez au moins un destinataire');
  if (!input.multi && dest.length !== 1) return invalid('Une demande simple a un seul destinataire');
  if (input.multi && dest.length < 2) return invalid('Une demande multiple a au moins deux destinataires');
  for (const r of dest) {
    if (!r.nom || !r.alias) return invalid('Chaque destinataire doit avoir un nom et un numéro');
    if (!recipientOk(input.canal, r.alias)) return invalid(`${input.canal === 'PI-SPI' ? 'Alias' : 'Numéro'} invalide : ${r.alias}`);
    if (!Number.isInteger(r.montant) || r.montant < 1) return invalid('Chaque montant doit être un nombre entier positif');
  }
  const n = Math.max(0, ...state.demandes.map((d) => Number(d.id))) + 1;
  const d: DemoRequest = {
    id: String(n), ref: `DP-26-${String(6 + n).padStart(4, '0')}`, date: iso(now), type: input.multi ? 'Multiple' : 'Simple', canal: input.canal, compteId: compte.id,
    motif: input.motif.trim(), echeance: input.echeance, destinataires: dest.map((r) => ({ ...r, statut: 'attente' as const })),
  };
  state.demandes.push(d);
  return d;
}

/** Relance, annulation, ou réponse du destinataire (simulée en démonstration : le paiement crédite le portefeuille). */
export function actOnRequest(id: string, index: number, action: 'relance' | 'paye' | 'refuse' | 'annule'): DemoRequest | Failure {
  const d = state.demandes.find((x) => x.id === id);
  if (!d) return notFound('Demande');
  const r = d.destinataires[index];
  if (!r) return notFound('Destinataire');
  const relaunchable = action === 'relance' && r.statut === 'refuse';
  if (r.statut !== 'attente' && !relaunchable) return { status: 409, code: 'not_pending', message: "Ce destinataire n'est plus en attente" };
  if (relaunchable) r.statut = 'attente';
  else if (action === 'paye') { r.statut = 'paye'; const c = getAccount(d.compteId); if (c) c.solde += r.montant; }
  else if (action === 'refuse') r.statut = 'refuse';
  else if (action === 'annule') r.statut = 'annule';
  return d;
}

/** Dernières opérations : transferts, encaissements en ligne et remboursements. */
export function operations(now = new Date()) {
  sweep(now);
  const walletOf = (canal: string) => state.comptes.find((c) => c.canal === canal)?.nom ?? canal;
  const rows = [
    ...state.transferts.map((t) => ({ date: t.date, libelle: `Transfert ${t.type.toLowerCase()} : ${t.motif}`, compte: getAccount(t.deId)?.nom ?? '', montant: -t.montant, statut: t.statut })),
    ...listTx({}, now).filter((t) => t.statut === 'succes').map((t) => ({ date: t.date, libelle: `Encaissement ${t.canal} ${t.ref}`, compte: walletOf(t.canal), montant: t.montant, statut: 'succes' as const })),
    ...listRefunds().map((r) => ({ date: r.date, libelle: `Remboursement ${r.reference}`, compte: '', montant: -r.montant, statut: 'succes' as const })),
  ];
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}
