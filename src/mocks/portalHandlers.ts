import { http, HttpResponse } from 'msw';
import { authorize, caller } from './authorize';
import { buildAccess, DemoUser, fullName } from './authDb';
import { getProfile, type Failure } from './profilesDb';
import * as db from './portalDb';
import * as sub from './subscriptionDb';
import { listTickets, setTicketStatut, SUPPORT_ADDRESS } from './supportDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x) && !('cabinet' in x) && !('base' in x);
const forbidden = () => HttpResponse.json({ code: 'permission_denied', message: "Action réservée au Super-admin de l'association." }, { status: 403 });
const body = async (r: Request) => (await r.json().catch(() => ({}))) as Record<string, unknown>;
const str = (v: unknown) => String(v ?? '');
const num = (v: unknown) => Number(v ?? 0);
const strs = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

/** Réservé au profil Super-admin : refusé aux autres profils, y compris l'Administrateur d'un cabinet. */
const asso = (request: Request): { user: DemoUser; by: string } | { response: Response } => {
  const user = caller(request);
  if (!user) return { response: HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 }) };
  if (getProfile(user.profilId)?.baseRole !== 'super_admin') return { response: forbidden() };
  return { user, by: fullName(user) };
};

const packDto = (p: sub.DemoPack) => ({
  id: p.id, nom: p.nom, cible: p.cible, prix: p.prix, prix_annuel: p.prix * (12 - sub.SETTINGS.anneeMoisOfferts), engagement: p.engagement, fonctionnalites: p.fonctionnalites, modules: p.modules,
  utilisateurs_max: p.utilisateursMax, star: p.star, actif: p.actif, personnalise: p.personnalise, cabinets: sub.CABINETS.filter((c) => c.packId === p.id).length,
});

/* ---- Contrat du backend (Administration, section platform) ---- */
const apiError = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message, details: [] } }, { status, headers: {} });
const notFound = (message: string) => apiError(404, 'http_404', message);
const apiFail = (f: Failure) => apiError(f.status, f.code, f.message);
/** Mêmes règles d'accès que `asso`, avec les erreurs au format du backend. */
const platformAuth = (request: Request): { user: DemoUser; by: string } | { response: Response } => {
  const a = asso(request);
  if (!('response' in a)) return a;
  return { response: a.response.status === 401 ? apiError(401, 'http_401', 'Authentification requise.') : apiError(403, 'permission_denied', "Action réservée au Super-admin de l'association.") };
};
/** Doublure du backend : durée d'engagement en mois (le mock garde un texte) et tarif annuel saisi (le mock ne le stocke pas). */
const engagementLabel = (months: number) => (months > 0 ? `${months} mois` : 'Sans engagement');
const engagementMonths = (label: string) => { const m = /(\d+)/.exec(label); return m ? Number(m[1]) * (/\ban(s)?\b/i.test(label) ? 12 : 1) : 0; };
const ANNUAL = new Map<string, number>();
const money = (n: number) => `${n}.00`;
const apiPack = (p: sub.DemoPack) => ({
  id: p.id, name: p.nom, target: p.cible || null, monthly_price: money(p.prix), annual_price: money(ANNUAL.get(p.id) ?? p.prix * (12 - sub.SETTINGS.anneeMoisOfferts)),
  user_limit: p.utilisateursMax, commitment_months: engagementMonths(p.engagement), features: p.fonctionnalites, module_codes: p.modules,
  is_published: p.actif, is_featured: p.star, is_custom: p.personnalise, subscriber_count: sub.CABINETS.filter((c) => c.packId === p.id).length, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
});
const apiPromo = (p: sub.DemoPromo) => ({
  id: p.id, code: p.code, discount_percent: p.pct, duration_months: p.mois, usage_limit: p.limite, starts_on: p.debut, ends_on: p.fin,
  pack_ids: p.packs, is_active: p.actif, is_automatic: p.auto, used_count: p.utilises, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
});
/** Liste paginée comme le backend : `page` et `page_size` (100 au plus). */
const pageOf = (items: unknown[], request: Request) => {
  const q = new URL(request.url).searchParams;
  const page = Number(q.get('page') ?? 1);
  const size = Number(q.get('page_size') ?? 20);
  return { items: items.slice((page - 1) * size, page * size), total: items.length, page, page_size: size };
};
/** Corps de création (champs complets) ou de modification partielle (PATCH : seuls les champs envoyés changent). */
const packFromBody = (b: Record<string, unknown>, cur?: sub.DemoPack): db.PackInput => ({
  nom: 'name' in b ? str(b.name) : cur?.nom ?? '',
  cible: 'target' in b ? str(b.target) : cur?.cible ?? '',
  prix: 'monthly_price' in b ? num(b.monthly_price) : cur?.prix ?? 0,
  engagement: 'commitment_months' in b ? engagementLabel(num(b.commitment_months)) : cur?.engagement ?? '',
  fonctionnalites: 'features' in b ? strs(b.features) : cur?.fonctionnalites ?? [],
  modules: 'module_codes' in b ? strs(b.module_codes) : cur?.modules ?? [],
  utilisateursMax: 'user_limit' in b ? (b.user_limit === null ? null : num(b.user_limit)) : cur?.utilisateursMax ?? null,
  star: 'is_featured' in b ? !!b.is_featured : cur?.star ?? false,
  actif: 'is_published' in b ? !!b.is_published : cur?.actif ?? false,
});
const promoFromBody = (b: Record<string, unknown>, cur?: sub.DemoPromo): db.PromoInput => ({
  code: 'code' in b ? str(b.code) : cur?.code ?? '',
  pct: 'discount_percent' in b ? num(b.discount_percent) : cur?.pct ?? 0,
  mois: 'duration_months' in b ? num(b.duration_months) : cur?.mois ?? 0,
  limite: 'usage_limit' in b ? num(b.usage_limit) : cur?.limite ?? 0,
  debut: 'starts_on' in b ? str(b.starts_on) : cur?.debut ?? '',
  fin: 'ends_on' in b ? str(b.ends_on) : cur?.fin ?? '',
  packs: 'pack_ids' in b ? strs(b.pack_ids) : cur?.packs ?? [],
  actif: 'is_active' in b ? !!b.is_active : cur?.actif ?? false,
  auto: 'is_automatic' in b ? !!b.is_automatic : cur?.auto ?? false,
});
const annonceDto = (a: db.DemoAnnonce) => ({ id: a.id, categorie: a.categorie, titre: a.titre, resume: a.resume, texte: a.texte, zone: a.zone, date: a.date, publie: a.publie });
const temoignageDto = (t: db.DemoTemoignage) => ({ id: t.id, auteur: t.auteur, role: t.role, texte: t.texte, publie: t.publie });
const cvDto = (c: db.DemoCv, full = true) => ({
  id: c.id, nom: c.nom, profil: c.profil, ville: c.ville, experience: c.experience, disponibilite: c.disponibilite, telephone: c.telephone, email: c.email, competences: c.competences,
  presentation: c.presentation, statut: c.statut, depose_le: c.creeLe, fichier: c.fichier, ...(full ? { source: c.source, consentement: c.consentement, retire: c.retire, archive_par: c.archivePar } : {}),
});
/** Fichier de démonstration : un PDF d'une page qui reprend le nom du candidat (le vrai fichier n'existe qu'avec le serveur). */
const pdfResponse = (c: db.DemoCv) => {
  const text = `CV simule de ${c.nom}`.replace(/[()\\]/g, '');
  const stream = `BT /F1 18 Tf 60 760 Td (${text}) Tj ET`;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new HttpResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${c.fichier?.nom ?? 'cv.pdf'}"` } });
};
const cabinetDto = (c: sub.DemoCabinetRec) => ({
  id: c.id, nom: sub.cabinetNom(c), ordre: c.ordre, adresse: c.adresse, ville: c.ville, telephone: c.telephone, email: c.email, responsable: c.responsable, entite: c.entite, entite_label: sub.ENTITE_LABEL[c.entite],
  pack: { id: c.packId, nom: sub.getPack(c.packId)?.nom ?? '' }, periode: c.periode, statut: sub.statutOf(c), jours_restants: sub.joursRestants(c), debut: c.debut, fin: c.fin, promo: c.promoCode, source: c.source, url: c.url,
  veterinaires: c.veterinaires, paiements: c.paiements,
});
const quoteDto = (q: sub.Quote) => ({ base: q.base, remise: q.remise, net: q.net, periode: q.periode, promo: q.promo && { code: q.promo.code, pct: q.promo.pct, mois: q.promo.mois } });
const registrationDto = (r: db.InscriptionResult) => ({
  cabinet: { id: r.cabinet.id, nom: r.cabinet.nom }, pack: { id: r.pack.id, nom: r.pack.nom }, essai_fin: r.essaiFin, url_acces: r.urlAcces, lien_expire: r.lienExpire, identifiant: r.identifiant, email: r.email,
  apres_essai: r.apresEssai, email_simule: { destinataire: r.email_simule.destinataire, objet: r.email_simule.objet, mot_de_passe: r.email_simule.motDePasse },
});

const moyenOf = (v: unknown): sub.Moyen | null => {
  const m = v as Record<string, unknown> | null;
  if (!m) return null;
  return m.type === 'carte' ? { type: 'carte', numero: str(m.numero), expiration: str(m.expiration), cvc: str(m.cvc) } : m.type === 'mobile' ? { type: 'mobile', operateur: str(m.operateur), numero: str(m.numero) } : m.type === 'pispi' ? { type: 'pispi', alias: str(m.alias) } : null;
};
const annonceInput = (b: Record<string, unknown>) => ({ categorie: str(b.categorie) as db.AnnonceCat, titre: str(b.titre), resume: str(b.resume), texte: str(b.texte), zone: str(b.zone), date: str(b.date), publie: !!b.publie });

export const portalHandlers = [
  /* ----- Site public, sans connexion ----- */
  http.get('*/portail', () => {
    db.autoArchive();
    const auto = sub.PROMOS.find((p) => p.auto && sub.promoDisponible(p, p.packs[0] ?? ''));
    return HttpResponse.json({
      contenu: { titre: db.CONTENT.titre, sous_titre: db.CONTENT.sousTitre, contact: { telephone: db.CONTENT.contactTel, email: db.CONTENT.contactEmail, adresse: db.CONTENT.contactAdresse }, pourquoi: db.CONTENT.pourquoi },
      chiffres: db.chiffresCles(), packs: db.publicPacks().map(packDto), annonces: db.publishedAnnonces().map(annonceDto), temoignages: db.TEMOIGNAGES.filter((t) => t.publie).map(temoignageDto),
      essai_jours: sub.SETTINGS.essaiJours, annee_mois_offerts: sub.SETTINGS.anneeMoisOfferts, operateurs: sub.OPERATEURS, vivier: db.compteurVivier(),
      offre_lancement: auto ? { code: auto.code, pct: auto.pct, mois: auto.mois, limite: auto.limite, restantes: auto.limite - auto.utilises } : null,
    });
  }),

  http.get('*/portail/tarif', ({ request }) => {
    const u = new URL(request.url).searchParams;
    const q = sub.quote(u.get('pack') ?? '', u.get('periode') === 'annuel' ? 'annuel' : 'mensuel', u.get('code') ?? '');
    return isFailure(q) ? fail(q) : HttpResponse.json(quoteDto(q));
  }),

  http.post('*/portail/adhesion', async ({ request }) => {
    const b = await body(request);
    const r = db.quickJoin({ packId: str(b.pack_id), nom: str(b.nom), responsable: str(b.responsable), telephone: str(b.telephone), email: str(b.email) });
    return isFailure(r) ? fail(r) : HttpResponse.json(registrationDto(r), { status: 201 });
  }),

  http.post('*/portail/inscription', async ({ request }) => {
    const b = await body(request);
    const r = db.register({
      packId: str(b.pack_id), periode: b.periode === 'annuel' ? 'annuel' : 'mensuel', promoCode: str(b.code_promo), nom: str(b.nom), prenom: str(b.prenom), email: str(b.email), identifiant: str(b.identifiant),
      ordre: str(b.ordre), etablissement: str(b.etablissement), typeEtablissement: b.type_etablissement === 'clinique' ? 'clinique' : 'cabinet', adresse: str(b.adresse), ville: str(b.ville), telephone: str(b.telephone), doubleAuth: !!b.double_auth, moyen: moyenOf(b.moyen), cgu: !!b.cgu,
    });
    return isFailure(r) ? fail(r) : HttpResponse.json(registrationDto(r), { status: 201 });
  }),

  http.post('*/portail/cv', async ({ request }) => {
    const form = await request.formData();
    const f = (k: string) => String(form.get(k) ?? '');
    const file = form.get('fichier');
    const c = db.depositCv({
      nom: f('nom'), profil: f('profil'), ville: f('ville'), experience: Number(f('experience')), disponibilite: f('disponibilite'), telephone: f('telephone'), email: f('email'), competences: f('competences'),
      presentation: f('presentation'), consentement: f('consentement') === 'true', fichier: file instanceof File && file.size + file.name.length > 0 ? { nom: file.name, taille: file.size, type: file.type } : null,
    });
    return isFailure(c) ? fail(c) : HttpResponse.json({ id: c.id, statut: c.statut, vivier: db.compteurVivier() }, { status: 201 });
  }),

  http.post('*/portail/cv/retrait', async ({ request }) => {
    const n = db.withdrawCv(str((await body(request)).contact));
    return isFailure(n) ? fail(n) : HttpResponse.json({ retires: n, vivier: db.compteurVivier() });
  }),

  /* ----- Espace membre : abonnement et CVthèque ----- */
  http.get('*/abonnement', ({ request }) => {
    const user = caller(request);
    if (!user) return HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
    const cab = sub.getCabinet(user.cabinetId ?? '1');
    if (!cab) return HttpResponse.json({ code: 'not_found', message: 'Cabinet introuvable' }, { status: 404 });
    return HttpResponse.json({
      cabinet: cabinetDto(cab), acces: buildAccess(user).abonnement, essai_jours: sub.SETTINGS.essaiJours, annee_mois_offerts: sub.SETTINGS.anneeMoisOfferts, operateurs: sub.OPERATEURS,
      packs: sub.PACKS.filter((p) => p.actif && (!p.personnalise || p.id === cab.packId)).map(packDto), peut_renouveler: getProfile(user.profilId)?.baseRole === 'admin',
    });
  }),

  http.post('*/abonnement/renouveler', async ({ request }) => {
    const user = caller(request);
    if (!user) return HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
    if (getProfile(user.profilId)?.baseRole !== 'admin') return HttpResponse.json({ code: 'permission_denied', message: "Seul l'Administrateur du cabinet peut renouveler l'abonnement." }, { status: 403 });
    const b = await body(request);
    const out = sub.renew(user.cabinetId ?? '1', { packId: str(b.pack_id), periode: b.periode === 'annuel' ? 'annuel' : 'mensuel', promoCode: str(b.code_promo), moyen: moyenOf(b.moyen) }, fullName(user));
    return isFailure(out) ? fail(out) : HttpResponse.json({ cabinet: cabinetDto(out), acces: buildAccess(user) });
  }),

  http.get('*/cvtheque/:id/fichier', ({ request, params }) => {
    const auth = authorize(request, 'cvtheque', 'read');
    if ('response' in auth) return auth.response;
    const c = db.CVS.find((x) => x.id === String(params.id) && x.statut === 'valide' && !x.retire);
    return c?.fichier ? pdfResponse(c) : HttpResponse.json({ code: 'not_found', message: 'Aucun CV disponible pour ce profil' }, { status: 404 });
  }),

  http.get('*/cvtheque', ({ request }) => {
    const auth = authorize(request, 'cvtheque', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url).searchParams;
    const items = db.searchCvs({ profil: u.get('profil') ?? '', ville: u.get('ville') ?? '', disponibilite: u.get('disponibilite') ?? '', experienceMin: Number(u.get('experience') ?? 0), competence: u.get('competence') ?? '', q: u.get('q') ?? '' });
    return HttpResponse.json({ items: items.map((c) => cvDto(c, false)), total: items.length });
  }),

  /* ----- Back-office du Super-admin ----- */
  http.get('*/association/tableau', ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    return HttpResponse.json(db.reseauStats());
  }),

  http.get('*/association/cabinets', ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const u = new URL(request.url).searchParams;
    const statut = u.get('statut') ?? '', q = (u.get('q') ?? '').toLowerCase();
    const items = sub.CABINETS.filter((c) => (!statut || sub.statutOf(c) === statut) && (!q || `${sub.cabinetNom(c)} ${c.responsable} ${c.email} ${c.ville}`.toLowerCase().includes(q))).map(cabinetDto);
    return HttpResponse.json({ items, total: items.length });
  }),

  http.post('*/association/cabinets', async ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const b = await body(request);
    const r = db.createCustomEntity({
      entite: str(b.entite), nom: str(b.nom), ordre: str(b.ordre), adresse: str(b.adresse), ville: str(b.ville), telephone: str(b.telephone), email: str(b.email), responsable: str(b.responsable), identifiant: str(b.identifiant),
      tarif: num(b.tarif), modules: strs(b.modules), utilisateursMax: b.utilisateurs_max === null || b.utilisateurs_max === undefined || b.utilisateurs_max === '' ? null : num(b.utilisateurs_max),
      periode: b.periode === 'annuel' ? 'annuel' : 'mensuel', essai: b.essai !== false, veterinaires: num(b.veterinaires),
    }, a.by);
    return isFailure(r) ? fail(r) : HttpResponse.json(registrationDto(r), { status: 201 });
  }),

  http.post('*/association/cabinets/:id/prolonger', async ({ request, params }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const c = db.extendCabinet(String(params.id), num((await body(request)).jours), a.by);
    return isFailure(c) ? fail(c) : HttpResponse.json(cabinetDto(c));
  }),

  /* Catalogue de modules de l'offre sur mesure : ancien contrat, section pas encore branchée sur le backend. */
  http.get('*/association/offres', ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    return HttpResponse.json({ modules: sub.PACK_MODULES, toujours_actifs: sub.ALWAYS_ON });
  }),
  /* ---- Administration, section platform : packs, promotions et réglages, au format du backend ---- */
  http.get('*/administration/platform/modules', ({ request }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    return HttpResponse.json(sub.PACK_MODULES.map((m) => ({ code: m.key, label: m.label })));
  }),
  http.get('*/administration/platform/packs', ({ request }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    return HttpResponse.json(pageOf(sub.PACKS.map(apiPack), request));
  }),
  http.post('*/administration/platform/packs', async ({ request }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    const b = await body(request);
    const p = db.savePack(null, packFromBody(b), a.by);
    if (isFailure(p)) return apiFail(p);
    if ('annual_price' in b) ANNUAL.set(p.id, num(b.annual_price));
    return HttpResponse.json(apiPack(p), { status: 201 });
  }),
  http.patch('*/administration/platform/packs/:id', async ({ request, params }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    const cur = sub.PACKS.find((p) => p.id === String(params.id));
    if (!cur) return notFound('Pack introuvable.');
    const b = await body(request);
    const p = db.savePack(cur.id, packFromBody(b, cur), a.by);
    if (isFailure(p)) return apiFail(p);
    if ('annual_price' in b) ANNUAL.set(p.id, num(b.annual_price));
    return HttpResponse.json(apiPack(p));
  }),
  http.delete('*/administration/platform/packs/:id', ({ request, params }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    const f = db.deletePack(String(params.id), a.by);
    return f ? apiFail(f) : new HttpResponse(null, { status: 204 });
  }),
  http.get('*/administration/platform/commercial-settings', ({ request }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    return HttpResponse.json({ trial_days: sub.SETTINGS.essaiJours });
  }),
  http.put('*/administration/platform/commercial-settings', async ({ request }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    const b = await body(request);
    const s = db.saveSettings({ essaiJours: num(b.trial_days), anneeMoisOfferts: sub.SETTINGS.anneeMoisOfferts }, a.by);
    return isFailure(s) ? apiFail(s) : HttpResponse.json({ trial_days: s.essaiJours });
  }),
  http.get('*/administration/platform/commercial-history', ({ request }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    const q = (new URL(request.url).searchParams.get('q') ?? '').toLowerCase();
    const items = sub.AUDIT.filter((e) => `${e.par} ${e.action} ${e.cible}`.toLowerCase().includes(q)).map((e) => ({
      id: e.id, actor: e.par, action: e.action, resource_type: e.cible, resource_id: e.id, before: null, after: null, created_at: e.date,
    }));
    return HttpResponse.json(pageOf(items, request));
  }),
  http.get('*/administration/platform/promotions', ({ request }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    return HttpResponse.json(pageOf(sub.PROMOS.map(apiPromo), request));
  }),
  http.post('*/administration/platform/promotions', async ({ request }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    const p = db.savePromo(null, promoFromBody(await body(request)), a.by);
    return isFailure(p) ? apiFail(p) : HttpResponse.json(apiPromo(p), { status: 201 });
  }),
  http.patch('*/administration/platform/promotions/:id', async ({ request, params }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    const cur = sub.PROMOS.find((p) => p.id === String(params.id));
    if (!cur) return notFound('Promotion introuvable.');
    const p = db.savePromo(cur.id, promoFromBody(await body(request), cur), a.by);
    return isFailure(p) ? apiFail(p) : HttpResponse.json(apiPromo(p));
  }),
  http.delete('*/administration/platform/promotions/:id', ({ request, params }) => {
    const a = platformAuth(request);
    if ('response' in a) return a.response;
    const f = db.deletePromo(String(params.id), a.by);
    return f ? apiFail(f) : new HttpResponse(null, { status: 204 });
  }),

  http.get('*/association/contenus', ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    return HttpResponse.json({
      contenu: { titre: db.CONTENT.titre, sous_titre: db.CONTENT.sousTitre, contact: { telephone: db.CONTENT.contactTel, email: db.CONTENT.contactEmail, adresse: db.CONTENT.contactAdresse }, pourquoi: db.CONTENT.pourquoi },
      annonces: db.ANNONCES.map(annonceDto).sort((x, y) => y.date.localeCompare(x.date)), temoignages: db.TEMOIGNAGES.map(temoignageDto), categories: db.ANNONCE_CATS,
    });
  }),
  http.put('*/association/contenus', async ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const b = await body(request);
    const c = (b.contact ?? {}) as Record<string, unknown>;
    const out = db.saveContent({ titre: str(b.titre), sousTitre: str(b.sous_titre), contactTel: str(c.telephone), contactEmail: str(c.email), contactAdresse: str(c.adresse), pourquoi: ((b.pourquoi as { titre: string; texte: string }[]) ?? []).map((p) => ({ titre: str(p.titre), texte: str(p.texte) })) }, a.by);
    return isFailure(out) ? fail(out) : HttpResponse.json({ ok: true });
  }),
  http.post('*/association/annonces', async ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const x = db.saveAnnonce(null, annonceInput(await body(request)), a.by);
    return isFailure(x) ? fail(x) : HttpResponse.json(annonceDto(x), { status: 201 });
  }),
  http.put('*/association/annonces/:id', async ({ request, params }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const x = db.saveAnnonce(String(params.id), annonceInput(await body(request)), a.by);
    return isFailure(x) ? fail(x) : HttpResponse.json(annonceDto(x));
  }),
  http.delete('*/association/annonces/:id', ({ request, params }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const f = db.deleteAnnonce(String(params.id), a.by);
    return f ? fail(f) : new HttpResponse(null, { status: 204 });
  }),
  http.post('*/association/temoignages', async ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const b = await body(request);
    const x = db.saveTemoignage(null, { auteur: str(b.auteur), role: str(b.role), texte: str(b.texte), publie: !!b.publie }, a.by);
    return isFailure(x) ? fail(x) : HttpResponse.json(temoignageDto(x), { status: 201 });
  }),
  http.put('*/association/temoignages/:id', async ({ request, params }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const b = await body(request);
    const x = db.saveTemoignage(String(params.id), { auteur: str(b.auteur), role: str(b.role), texte: str(b.texte), publie: !!b.publie }, a.by);
    return isFailure(x) ? fail(x) : HttpResponse.json(temoignageDto(x));
  }),
  http.delete('*/association/temoignages/:id', ({ request, params }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const f = db.deleteTemoignage(String(params.id), a.by);
    return f ? fail(f) : new HttpResponse(null, { status: 204 });
  }),

  http.get('*/association/cvs', ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    db.autoArchive();
    const statut = new URL(request.url).searchParams.get('statut') ?? '';
    const items = db.CVS.filter((c) => !statut || (statut === 'retire' ? c.retire : c.statut === statut && !c.retire)).sort((x, y) => y.creeLe.localeCompare(x.creeLe));
    return HttpResponse.json({ items: items.map((c) => cvDto(c)), total: items.length });
  }),
  http.get('*/association/cvs/:id/fichier', ({ request, params }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const c = db.CVS.find((x) => x.id === String(params.id));
    return c?.fichier ? pdfResponse(c) : HttpResponse.json({ code: 'not_found', message: 'Aucun CV disponible pour ce profil' }, { status: 404 });
  }),
  http.post('*/association/cvs/:id/:action', ({ request, params }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const action = String(params.action);
    if (action !== 'valider' && action !== 'archiver' && action !== 'restaurer') return HttpResponse.json({ code: 'not_found', message: 'Action inconnue' }, { status: 404 });
    const c = db.reviewCv(String(params.id), action, a.by);
    return isFailure(c) ? fail(c) : HttpResponse.json(cvDto(c));
  }),

  http.get('*/association/reclamations', ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const statut = new URL(request.url).searchParams.get('statut') ?? '';
    const items = listTickets({ statut }).map((t) => ({ id: t.id, numero: t.numero, date: t.date, objet: t.objet, message: t.message, statut: t.statut, auteur: t.auteur, cabinet: sub.cabinetNom(sub.getCabinet('1')!), mis_a_jour: t.misAJour }));
    return HttpResponse.json({ items, total: items.length, adresse_support: SUPPORT_ADDRESS });
  }),
  http.put('*/association/reclamations/:id', async ({ request, params }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    const t = setTicketStatut(String(params.id), str((await body(request)).statut));
    if (!isFailure(t)) sub.trace(a.by, `Réclamation passée au statut « ${t.statut} »`, t.numero);
    return isFailure(t) ? fail(t) : HttpResponse.json({ id: t.id, statut: t.statut, mis_a_jour: t.misAJour });
  }),

  http.get('*/association/journal', ({ request }) => {
    const a = asso(request);
    if ('response' in a) return a.response;
    return HttpResponse.json({ items: sub.AUDIT.map((e) => ({ id: e.id, date: e.date, par: e.par, action: e.action, cible: e.cible })) });
  }),
];
