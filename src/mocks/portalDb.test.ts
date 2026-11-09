import { beforeEach, describe, expect, it } from 'vitest';
import { buildAccess, DEMO_USERS, resetAll } from './authDb';
import * as db from './portalDb';
import * as sub from './subscriptionDb';
import type { Failure } from './profilesDb';
import { resetSupport } from './supportDb';

beforeEach(() => { resetAll(); db.resetPortal(); resetSupport(); });

const CARTE = { type: 'carte', numero: '4242 4242 4242 4242', expiration: '12/30', cvc: '123' } as const;
const inscription = (over: Partial<db.InscriptionInput> = {}): db.InscriptionInput => ({
  packId: 'professionnel', periode: 'mensuel', promoCode: '', nom: 'Ndiaye', prenom: 'Awa', email: 'awa@cabinet-test.sn', identifiant: 'awa.ndiaye', ordre: 'ODVS-7777', typeEtablissement: 'cabinet', etablissement: 'Cabinet du Baobab',
  adresse: 'Rue 10, Mbour', ville: 'Mbour', telephone: '77 111 22 33', doubleAuth: false, moyen: CARTE, cgu: true, ...over,
});
const ok = <T>(x: T | Failure): T => { if (typeof x === 'object' && x && 'code' in x && 'status' in x && 'message' in x) throw new Error(JSON.stringify(x)); return x as T; };

describe('abonnement et accès par pack', () => {
  it("l'utilisateur de démonstration est en abonnement actif, celui du cabinet expiré est bloqué", () => {
    expect(buildAccess(DEMO_USERS.find((u) => u.identifiant === 'admin')!).abonnement).toMatchObject({ statut: 'actif', pack: { id: 'reseau' } });
    expect(buildAccess(DEMO_USERS.find((u) => u.identifiant === 'expire')!).abonnement.statut).toBe('expire');
  });

  it("les modules hors pack sont retirés des droits (Découverte : ni vaccinations, ni facturation, ni insémination)", () => {
    expect(Object.keys(buildAccess(DEMO_USERS.find((u) => u.identifiant === 'admin')!).permissions)).toEqual(expect.arrayContaining(['insemination', 'hospitalisations', 'vaccinations']));
    const a = buildAccess(DEMO_USERS.find((u) => u.identifiant === 'essai')!);
    expect(a.permissions.consultations).toBeDefined();
    expect(a.permissions.vaccinations).toBeUndefined();
    expect(a.permissions.facturation).toBeUndefined();
    expect(a.permissions.insemination).toBeUndefined();
    expect(a.permissions.utilisateurs).toBeDefined(); // administration toujours disponible
    expect(a.abonnement).toMatchObject({ statut: 'essai', jours_restants: 12 });
  });

  it("le Super-admin n'a aucun droit de cabinet", () => {
    const a = buildAccess(DEMO_USERS.find((u) => u.identifiant === 'asso')!);
    expect(a.user.role).toBe('super_admin');
    expect(a.permissions).toEqual({});
  });

  it("la fin d'essai fait passer le cabinet en expiré, au jour près", () => {
    const c = sub.getCabinet('3')!;
    expect(sub.statutOf(c)).toBe('essai');
    expect(sub.joursRestants(c)).toBe(12);
    expect(sub.statutOf(c, Date.parse(c.fin) + 1)).toBe('expire');
  });
});

describe('tarifs, offre de lancement et codes promotionnels', () => {
  it("l'annuel offre deux mois et l'offre de lancement automatique s'applique", () => {
    const q = sub.quote('professionnel', 'annuel') as sub.Quote;
    expect(q.base).toBe(30_000 * 10);
    expect(q.promo?.code).toBe('LANCEMENT5');
    expect(q.remise).toBe(15_000);
    expect(q.net).toBe(285_000);
  });
  it('un code valide remplace l\'offre automatique, un code expiré ou hors pack est refusé', () => {
    expect((sub.quote('essentiel', 'mensuel', 'jsv2026') as sub.Quote).remise).toBe(3_750);
    expect(sub.quote('reseau', 'mensuel', 'JSV2026')).toMatchObject({ code: 'promo_invalide' });
    expect(sub.quote('professionnel', 'mensuel', 'ETE2026')).toMatchObject({ code: 'promo_invalide' });
  });
  it("le contrôle du moyen de paiement vérifie le format de la carte et du numéro mobile", () => {
    expect(sub.checkMoyen(null)).toMatchObject({ code: 'moyen_requis' });
    expect(sub.checkMoyen({ ...CARTE, numero: '1234 5678 9012 3456' })).toMatchObject({ message: 'Numéro de carte invalide' });
    expect(sub.checkMoyen({ ...CARTE, expiration: '01/20' })).toMatchObject({ message: 'La carte est expirée' });
    expect(sub.checkMoyen({ ...CARTE, numero: '4000 0000 0000 0002' })).toMatchObject({ code: 'paiement_refuse' });
    expect(sub.checkMoyen({ type: 'mobile', operateur: 'Wave', numero: '77 123' })).toMatchObject({ message: 'Numéro de téléphone invalide' });
    expect(sub.checkMoyen({ type: 'mobile', operateur: 'Wave', numero: '77 123 45 67' })).toBeNull();
    expect(sub.checkMoyen(CARTE)).toBeNull();
  });
});

describe('inscription en ligne', () => {
  it("crée le cabinet en essai, son administrateur et envoie un mot de passe généré, avec un lien valable 7 jours", () => {
    const now = new Date('2026-10-27T10:00:00Z');
    const r = ok(db.register(inscription(), now));
    expect(r.cabinet.essai).toBe(true);
    expect(Date.parse(r.essaiFin) - now.getTime()).toBe(30 * 86_400_000);
    expect(Date.parse(r.lienExpire) - now.getTime()).toBe(7 * 86_400_000);
    expect(r.email_simule.motDePasse).toMatch(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/);
    const admin = DEMO_USERS.find((u) => u.identifiant === 'awa.ndiaye')!;
    expect(admin.profilId).toBe('admin');
    expect(buildAccess(admin).user.cabinet_nom).toBe('Cabinet du Baobab');
    expect(buildAccess(admin, now.getTime()).abonnement).toMatchObject({ statut: 'essai', jours_restants: 30 });
    expect(sub.PROMOS.find((p) => p.code === 'LANCEMENT5')!.utilises).toBe(4);
  });
  it('refuse les cas d\'erreur de la spécification', () => {
    expect(db.register(inscription({ packId: '' }))).toMatchObject({ code: 'pack_requis' });
    expect(db.register(inscription({ nom: '' }))).toMatchObject({ code: 'invalid' });
    expect(db.register(inscription({ email: 'amadou.sy@vetepro.sn' }))).toMatchObject({ code: 'email_pris' });
    expect(db.register(inscription({ identifiant: 'admin' }))).toMatchObject({ code: 'identifiant_pris' });
    expect(db.register(inscription({ ordre: '1234' }))).toMatchObject({ code: 'ordre_invalide' });
    expect(db.register(inscription({ cgu: false }))).toMatchObject({ code: 'cgu_requises' });
    expect(db.register(inscription({ moyen: null }))).toMatchObject({ code: 'moyen_requis' });
    expect(db.register(inscription({ moyen: { ...CARTE, numero: '4000 0000 0000 0002' } }))).toMatchObject({ code: 'paiement_refuse' });
    expect(sub.CABINETS).toHaveLength(5); // aucun cabinet créé après un refus
  });
  it('un e-mail déjà pris par un cabinet est refusé, y compris pour une adhésion rapide', () => {
    ok(db.register(inscription()));
    expect(db.quickJoin({ packId: 'essentiel', nom: 'Autre cabinet', responsable: 'Fall', telephone: '77 000 00 00', email: 'AWA@cabinet-test.sn' })).toMatchObject({ code: 'email_pris' });
  });
  it("l'option double authentification impose la configuration à l'administrateur du cabinet", () => {
    ok(db.register(inscription({ doubleAuth: true })));
    expect(DEMO_USERS.find((u) => u.identifiant === 'awa.ndiaye')!.twofaRequise).toBe(true);
  });
  it("l'adhésion rapide demande le nom du cabinet et démarre l'essai", () => {
    expect(db.quickJoin({ packId: 'essentiel', nom: ' ', responsable: 'Awa Fall', telephone: '77 000 00 00', email: 'a@b.sn' })).toMatchObject({ message: 'Renseignez le nom du cabinet' });
    const r = ok(db.quickJoin({ packId: 'essentiel', nom: 'Cabinet Express', responsable: 'Awa Fall', telephone: '77 000 00 00', email: 'express@vet.sn' }));
    expect(r.cabinet.source).toBe('adhesion');
    expect(r.identifiant).toBe('express');
    expect(sub.statutOf(r.cabinet)).toBe('essai');
  });
});

describe('moyen de paiement PI-SPI', () => {
  it("accepte un téléphone, un e-mail ou un identifiant SN-PI-, refuse le reste", () => {
    for (const alias of ['77 123 45 67', 'awa@vet.sn', 'SN-PI-123456']) expect(sub.checkMoyen({ type: 'pispi', alias })).toBeNull();
    for (const alias of ['', 'abc', 'SN-PI-12', '12 34']) expect(sub.checkMoyen({ type: 'pispi', alias })).toMatchObject({ code: 'moyen_invalide' });
    expect(sub.moyenLabel({ type: 'pispi', alias: 'SN-PI-123456' })).toBe('PI-SPI SN-PI-123456');
  });
});

describe('renouvellement', () => {
  it("rétablit l'accès d'un cabinet expiré et prolonge d'un mois ou d'un an", () => {
    const now = new Date();
    const c = ok(sub.renew('2', { packId: 'essentiel', periode: 'annuel', promoCode: '', moyen: CARTE }, 'Cheikh Sarr', now));
    expect(sub.statutOf(c)).toBe('actif');
    expect(Date.parse(c.fin) - now.getTime()).toBe(365 * 86_400_000);
    expect(c.paiements[0]!.montant).toBe(25_000 * 10 - Math.round(25_000 * 10 * 0.05));
    expect(buildAccess(DEMO_USERS.find((u) => u.identifiant === 'expire')!).abonnement.statut).toBe('actif');
  });
  it('refuse un paiement refusé sans changer l\'abonnement', () => {
    expect(sub.renew('2', { packId: 'essentiel', periode: 'mensuel', promoCode: '', moyen: { ...CARTE, numero: '4000 0000 0000 0002' } }, 'x')).toMatchObject({ code: 'paiement_refuse' });
    expect(sub.statutOf(sub.getCabinet('2')!)).toBe('expire');
  });
});

describe('CVthèque', () => {
  const cvInput = (over: Partial<db.CvInput> = {}): db.CvInput => ({ nom: 'Dr Sané', profil: 'veterinaire', ville: 'Dakar', experience: 3, disponibilite: 'immediate', telephone: '77 333 44 55', email: '', competences: 'Chirurgie, Imagerie ', presentation: '', consentement: true, ...over });

  it('un dépôt public crée un profil « Nouveau » invisible des cabinets avant validation', () => {
    const before = db.compteurVivier();
    const c = ok(db.depositCv(cvInput()));
    expect(c).toMatchObject({ statut: 'nouveau', source: 'site', competences: ['Chirurgie', 'Imagerie'] });
    expect(db.compteurVivier()).toBe(before + 1);
    expect(db.searchCvs({ q: 'Sané' })).toHaveLength(0);
    ok(db.reviewCv(c.id, 'valider', 'Mame Gaye'));
    expect(db.searchCvs({ q: 'Sané' })).toHaveLength(1);
  });
  it('refuse sans nom, ville, téléphone ou consentement', () => {
    expect(db.depositCv(cvInput({ ville: '' }))).toMatchObject({ message: 'Nom, ville et téléphone sont requis' });
    expect(db.depositCv(cvInput({ consentement: false }))).toMatchObject({ code: 'consentement_requis' });
  });
  it('accepte un CV PDF de 2 Mo au plus, refuse le reste, et supprime le fichier avec le profil', () => {
    const pdf = { nom: 'cv.pdf', taille: 500_000, type: 'application/pdf' };
    const c = ok(db.depositCv(cvInput({ fichier: pdf })));
    expect(c.fichier).toEqual({ nom: 'cv.pdf', taille: 500_000 });
    expect(db.depositCv(cvInput({ fichier: { ...pdf, nom: 'cv.docx', type: 'application/msword' } }))).toMatchObject({ code: 'fichier_invalide' });
    expect(db.depositCv(cvInput({ fichier: { ...pdf, taille: 3 * 1024 * 1024 } }))).toMatchObject({ code: 'fichier_trop_gros' });
    expect(db.depositCv(cvInput({ fichier: { ...pdf, taille: 0 } }))).toMatchObject({ code: 'fichier_invalide' });
    expect(db.depositCv(cvInput()).valueOf()).toMatchObject({ fichier: null });
    db.withdrawCv('77 333 44 55');
    expect(db.CVS.filter((x) => x.telephone === '77 333 44 55').every((x) => x.fichier === null)).toBe(true);
  });
  it("l'archivage automatique supprime le fichier du CV", () => {
    expect(db.CVS.find((c) => c.id === 'cv6')!.fichier).toBeNull();
    const old = db.CVS.find((c) => c.id === 'cv3')!;
    db.autoArchive(Date.parse(old.creeLe) + 400 * 86_400_000);
    expect(old).toMatchObject({ statut: 'archive', archivePar: 'auto', fichier: null });
  });
  it('filtre par profil, ville, disponibilité, expérience et compétence', () => {
    expect(db.searchCvs({ profil: 'veterinaire' }).map((c) => c.id).sort()).toEqual(['cv1', 'cv2']);
    expect(db.searchCvs({ ville: 'thi' }).map((c) => c.id)).toEqual(['cv2']);
    expect(db.searchCvs({ disponibilite: 'immediate' }).map((c) => c.id).sort()).toEqual(['cv1', 'cv3']);
    expect(db.searchCvs({ experienceMin: 10 }).map((c) => c.id)).toEqual(['cv2']);
    expect(db.searchCvs({ competence: 'insémin' }).map((c) => c.id)).toEqual(['cv2']);
  });
  it('archive automatiquement après 12 mois et retire sur demande du candidat', () => {
    db.autoArchive();
    expect(db.CVS.find((c) => c.id === 'cv6')).toMatchObject({ statut: 'archive', archivePar: 'auto' });
    expect(db.searchCvs({})).not.toContainEqual(expect.objectContaining({ id: 'cv6' }));
    expect(db.withdrawCv('mariama.ba@mail.sn')).toBe(1);
    expect(db.searchCvs({}).map((c) => c.id)).not.toContain('cv1');
    expect(db.withdrawCv('inconnu@mail.sn')).toMatchObject({ code: 'not_found' });
    expect(db.reviewCv('cv1', 'valider', 'x')).toMatchObject({ code: 'cv_retire' });
  });
});

describe('back-office du Super-admin', () => {
  it('met à jour une offre, garde une seule offre « Le plus choisi » et protège les offres utilisées', () => {
    const p = ok(db.savePack('essentiel', { nom: 'Essentiel', cible: 'Cabinet individuel', prix: 18_000, engagement: 'Sans engagement', fonctionnalites: ['A'], modules: ['patients'], utilisateursMax: 3, star: true, actif: true }, 'Mame Gaye'));
    expect(p.prix).toBe(18_000);
    expect(sub.PACKS.filter((x) => x.star).map((x) => x.id)).toEqual(['essentiel']);
    expect(db.deletePack('decouverte', 'x')).toMatchObject({ code: 'pack_utilise' });
    expect(db.savePack(null, { nom: 'essentiel', cible: '', prix: 1, engagement: '', fonctionnalites: [], modules: ['patients'], utilisateursMax: null, star: false, actif: true }, 'x')).toMatchObject({ code: 'nom_pris' });
    expect(sub.AUDIT[0]).toMatchObject({ par: 'Mame Gaye', action: "Modification d'une offre", cible: 'Essentiel' });
  });
  it("règle la durée d'essai dans les bornes et l'applique aux nouvelles inscriptions", () => {
    expect(db.saveSettings({ essaiJours: 120, anneeMoisOfferts: 2 }, 'x')).toMatchObject({ status: 422 });
    db.saveSettings({ essaiJours: 14, anneeMoisOfferts: 3 }, 'x');
    const r = ok(db.register(inscription()));
    expect(Date.parse(r.essaiFin) - Date.parse(r.cabinet.debut)).toBe(14 * 86_400_000);
    expect((sub.quote('professionnel', 'annuel', '', Date.now()) as sub.Quote).base).toBe(30_000 * 9);
  });
  it('gère les codes promotionnels : unicité, une seule offre de lancement, bornes', () => {
    const base = { code: 'rentree', pct: 20, mois: 2, limite: 5, debut: '2026-10-01', fin: '2026-12-31', packs: [], actif: true, auto: true };
    const p = ok(db.savePromo(null, base, 'x'));
    expect(p.code).toBe('RENTREE');
    expect(sub.PROMOS.filter((x) => x.auto).map((x) => x.code)).toEqual(['RENTREE']);
    expect(db.savePromo(null, base, 'x')).toMatchObject({ code: 'code_pris' });
    expect(db.savePromo(null, { ...base, code: 'X', pct: 150 }, 'x')).toMatchObject({ status: 422 });
    expect(db.savePromo(null, { ...base, code: 'Y', fin: '2026-01-01' }, 'x')).toMatchObject({ status: 422 });
  });
  it("crée une entité sur mesure avec son pack personnalisé, invisible du portail, et envoie les identifiants", () => {
    const r = ok(db.createCustomEntity({
      entite: 'reseau', nom: 'Groupe Vétos du Sud', ordre: '', adresse: 'Ziguinchor', ville: 'Ziguinchor', telephone: '77 900 00 00', email: 'direction@groupe-sud.sn', responsable: 'Pape Badji', identifiant: 'pbadji',
      tarif: 120_000, modules: ['patients', 'facturation', 'insemination'], utilisateursMax: null, periode: 'mensuel', essai: false, veterinaires: 8,
    }, 'Mame Gaye'));
    expect(r.pack.personnalise).toBe(true);
    expect(db.publicPacks().map((p) => p.id)).not.toContain(r.pack.id);
    expect(sub.statutOf(r.cabinet)).toBe('actif');
    const a = buildAccess(DEMO_USERS.find((u) => u.identifiant === 'pbadji')!);
    expect(Object.keys(a.permissions)).toContain('insemination');
    expect(Object.keys(a.permissions)).not.toContain('vaccinations');
    expect(r.email_simule.destinataire).toBe('direction@groupe-sud.sn');
  });
  it('les chiffres clés comptent les cabinets dont l\'accès est ouvert', () => {
    expect(db.chiffresCles()).toMatchObject({ cabinets: 4, veterinaires: 8 });
    ok(db.quickJoin({ packId: 'essentiel', nom: 'Cabinet Express', responsable: 'Awa Fall', telephone: '77 000 00 00', email: 'express@vet.sn' }));
    expect(db.chiffresCles().cabinets).toBe(5);
  });
  it('gère les annonces publiées : une annonce non publiée reste hors du portail', () => {
    expect(db.publishedAnnonces()).toHaveLength(6);
    const a = ok(db.saveAnnonce(null, { categorie: 'evenement', titre: 'Assemblée générale', resume: 'Résumé', texte: '', zone: 'Dakar', date: '2026-12-01', publie: false }, 'x'));
    expect(a.texte).toBe('Résumé');
    expect(db.publishedAnnonces()).toHaveLength(6);
    expect(db.saveAnnonce(null, { ...a, titre: ' ' }, 'x')).toMatchObject({ status: 422 });
  });
  it('prolonge un abonnement et trace chaque action', () => {
    const c = ok(db.extendCabinet('3', 15, 'Mame Gaye'));
    expect(sub.joursRestants(c)).toBe(27);
    expect(db.extendCabinet('3', 0, 'x')).toMatchObject({ status: 422 });
    expect(sub.AUDIT[0]).toMatchObject({ action: 'Prolongation de 15 jours' });
  });
});
