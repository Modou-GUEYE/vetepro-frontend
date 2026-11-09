import { describe, expect, it } from 'vitest';
import { usernameFrom, cvSchema, emptyCv, emptyInfos, filterAnnonces, infosSchema, offerText, stepOfError, wrapIndex, Annonce } from './portail';

const a = (id: string, categorie: string): Annonce => ({ id, categorie, titre: id, resume: '', texte: '', zone: '', date: '2026-10-01', publie: true });
const infos = { ...emptyInfos(), nom: 'Ndiaye', prenom: 'Awa', email: 'awa@x.sn', identifiant: 'awa.n', ordre: 'ODVS-1234', etablissement: 'Cabinet', adresse: 'Rue', ville: 'Dakar', telephone: '77 111 22 33' };

describe('portail', () => {
  it('filtre les annonces par catégorie', () => {
    const l = [a('1', 'alerte'), a('2', 'evenement'), a('3', 'alerte')];
    expect(filterAnnonces(l, 'all')).toHaveLength(3);
    expect(filterAnnonces(l, 'alerte').map((x) => x.id)).toEqual(['1', '3']);
  });
  it('boucle sur le carrousel', () => {
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(1, 0)).toBe(0);
  });
  it("décrit l'offre de lancement quand il en reste", () => {
    expect(offerText({ essai_jours: 30, offre_lancement: null })).toContain('30 jours');
    expect(offerText({ essai_jours: 30, offre_lancement: { code: 'X', pct: 5, mois: 6, limite: 10, restantes: 1 } })).toContain('encore 1 place)');
  });
  it("propose le nom d'utilisateur prenom.nom sans accents ni espaces", () => {
    expect(usernameFrom('Aïssatou', 'Mbaye')).toBe('aissatou.mbaye');
    expect(usernameFrom('Awa', 'Ndiaye Sow')).toBe('awa.ndiaye-sow');
    expect(usernameFrom('Awa', '')).toBe('awa');
    expect(usernameFrom('', '')).toBe('');
  });
  it('le CV demande nom, ville, téléphone et consentement', () => {
    expect(cvSchema.safeParse({ ...emptyCv(), consentement: true }).success).toBe(false);
    expect(cvSchema.safeParse({ ...emptyCv(), nom: 'A', ville: 'D', telephone: '77 123 45 67' }).success).toBe(false);
    expect(cvSchema.safeParse({ ...emptyCv(), nom: 'A', ville: 'D', telephone: '77 123 45 67', consentement: true, experience: '4' as unknown as number }).success).toBe(true);
  });
  it('le fichier du CV doit être un PDF de 2 Mo au plus, et reste facultatif', () => {
    const base = { ...emptyCv(), nom: 'A', ville: 'D', telephone: '77 123 45 67', consentement: true };
    const msg = (f: File | null) => { const r = cvSchema.safeParse({ ...base, fichier: f }); return r.success ? '' : r.error.issues[0]!.message; };
    expect(msg(null)).toBe('');
    expect(msg(new File(['x'], 'cv.pdf', { type: 'application/pdf' }))).toBe('');
    expect(msg(new File(['x'], 'cv.docx', { type: 'application/msword' }))).toBe('Le CV doit être au format PDF');
    expect(msg(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'cv.pdf', { type: 'application/pdf' }))).toBe('Le CV ne doit pas dépasser 2 Mo');
  });
  it("contrôle le format du numéro d'ordre et de l'e-mail", () => {
    expect(infosSchema.safeParse(infos).success).toBe(true);
    expect(infosSchema.safeParse({ ...infos, ordre: '1234' }).success).toBe(false);
    expect(infosSchema.safeParse({ ...infos, email: 'x' }).success).toBe(false);
    expect(infosSchema.safeParse({ ...infos, identifiant: 'a b' }).success).toBe(false);
  });
  it("ramène à l'étape concernée par le refus", () => {
    expect(stepOfError('email_pris')).toBe(2);
    expect(stepOfError('promo_invalide')).toBe(1);
    expect(stepOfError('paiement_refuse')).toBe(3);
  });
});
