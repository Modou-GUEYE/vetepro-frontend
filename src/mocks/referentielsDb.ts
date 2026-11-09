import type { Failure } from './profilesDb';

/** Catégories fixées par le pôle Produit (spécification : « Gestion des services »). */
export const SERVICE_CATEGORIES = ['Consultation', 'Chirurgie', 'Vaccination', 'Diagnostic', 'Soins', 'Toilettage', 'Urgence', 'Hospitalisation', 'Laboratoire', 'Autre'] as const;

export interface DemoService { id: string; libelle: string; categorie: string; description: string; prix: number; actif: boolean; deleted?: boolean }
export interface DemoRace { id: string; nom: string; actif: boolean }
export interface DemoEspece { id: string; nom: string; description: string; vaccins: string; actif: boolean; gestationJours: number | null; races: DemoRace[] }

const svc = (id: string, libelle: string, categorie: string, prix: number, description = '', actif = true): DemoService => ({ id, libelle, categorie, description, prix, actif });

const seedServices = (): DemoService[] => [
  svc('1', 'Consultation générale', 'Consultation', 5000, 'Examen clinique complet'),
  svc('2', 'Consultation à domicile', 'Consultation', 10000, 'Déplacement inclus, zone de Dakar'),
  svc('3', 'Vaccination (acte)', 'Vaccination', 2500, 'Acte de vaccination, produit facturé à part'),
  svc('4', 'Castration', 'Chirurgie', 25000),
  svc('5', 'Césarienne', 'Chirurgie', 80000, 'Bovins et petits ruminants'),
  svc('6', 'Échographie', 'Diagnostic', 15000),
  svc('7', 'Pansement et soins', 'Soins', 3000),
  svc('8', 'Toilettage complet', 'Toilettage', 12000, '', false),
  svc('9', 'Urgence de nuit', 'Urgence', 20000),
  svc('10', 'Hospitalisation (par jour)', 'Hospitalisation', 7500),
  svc('11', 'Analyse de laboratoire', 'Laboratoire', 9000),
  svc('12', 'Insémination', 'Soins', 25000),
];

const r = (id: string, nom: string, actif = true): DemoRace => ({ id, nom, actif });
/** Espèces et races reprises du prototype V4 ; durées de gestation de la spécification pour les espèces qu'elle cite. */
const seedEspeces = (): DemoEspece[] => [
  { id: "chien", nom: "Chien", description: "Animal de compagnie et de travail", vaccins: "Rage, Parvovirose, Maladie de Carré, Hépatite de Rubarth, Leptospirose, Toux du chenil", actif: true, gestationJours: 63, races: [r("chien-berger-allemand", "Berger Allemand"), r("chien-labrador-retriever", "Labrador Retriever"), r("chien-golden-retriever", "Golden Retriever"), r("chien-husky-siberien", "Husky Sibérien"), r("chien-rottweiler", "Rottweiler"), r("chien-caniche", "Caniche"), r("chien-chihuahua", "Chihuahua"), r("chien-bulldog-anglais", "Bulldog Anglais"), r("chien-boerboel", "Boerboel"), r("chien-basenji", "Basenji"), r("chien-azawakh", "Azawakh"), r("chien-berger-de-l-afrique-de-l-ouest", "Berger de l'Afrique de l'Ouest"), r("chien-batard-race-mixte", "Bâtard / Race mixte")] },
  { id: "chat", nom: "Chat", description: "Animal de compagnie", vaccins: "Typhus félin, Leucose féline, Rage, Chlamydiose", actif: true, gestationJours: 65, races: [r("chat-persan", "Persan"), r("chat-siamois", "Siamois"), r("chat-maine-coon", "Maine Coon"), r("chat-british-shorthair", "British Shorthair"), r("chat-bengal", "Bengal"), r("chat-abyssin", "Abyssin"), r("chat-chat-europeen-domestique", "Chat Européen / Domestique"), r("chat-chat-de-gouttiere-senegal", "Chat de gouttière (Sénégal)")] },
  { id: "lapin", nom: "Lapin", description: "Rongeur de compagnie", vaccins: "Myxomatose, VHD", actif: true, gestationJours: null, races: [r("lapin-lapin-belier", "Lapin Bélier"), r("lapin-nain-de-hollande", "Nain de Hollande"), r("lapin-rex", "Rex"), r("lapin-lapin-de-ferme-local", "Lapin de ferme / local")] },
  { id: "oiseau", nom: "Oiseau", description: "NAC : perroquets, canaris, perruches", vaccins: "—", actif: true, gestationJours: null, races: [r("oiseau-perroquet-gris-du-gabon", "Perroquet Gris du Gabon"), r("oiseau-perroquet-du-senegal", "Perroquet du Sénégal"), r("oiseau-perruche", "Perruche"), r("oiseau-canari", "Canari"), r("oiseau-tourterelle", "Tourterelle")] },
  { id: "reptile", nom: "Reptile", description: "NAC : lézards, tortues, serpents", vaccins: "—", actif: false, gestationJours: null, races: [r("reptile-gecko-leopard", "Gecko Léopard"), r("reptile-iguane-vert", "Iguane vert"), r("reptile-tortue-d-hermann", "Tortue d'Hermann"), r("reptile-python-royal", "Python royal")] },
  { id: "cobaye", nom: "Cobaye", description: "Rongeur de compagnie", vaccins: "—", actif: false, gestationJours: null, races: [r("cobaye-cochon-d-inde-standard", "Cochon d'Inde standard"), r("cobaye-hamster-dore", "Hamster doré")] },
  { id: "bovin", nom: "Bovin", description: "Élevage bovin : zébu, taurin, métis", vaccins: "Charbon, PPCB, FMD, Pasteurellose", actif: true, gestationJours: 283, races: [r("bovin-zebu-gobra", "Zébu Gobra"), r("bovin-zebu-maure", "Zébu Maure"), r("bovin-taurin-ndama", "Taurin Ndama"), r("bovin-metis-ndama-zebu", "Métis (Ndama × Zébu)"), r("bovin-girolando", "Girolando")] },
  { id: "ovin", nom: "Ovin", description: "Élevage ovin : mouton, brebis", vaccins: "Pasteurellose, Clavelée, Brucellose", actif: true, gestationJours: 150, races: [r("ovin-mouton-peul-peul", "Mouton Peul-Peul"), r("ovin-mouton-touabire-tabaski", "Mouton Touabire (Tabaski)"), r("ovin-mouton-ladoum", "Mouton Ladoum"), r("ovin-mouton-warale", "Mouton Waralé"), r("ovin-brebis-locale-mixte", "Brebis locale mixte")] },
  { id: "caprin", nom: "Caprin", description: "Élevage caprin : chèvre, bouc", vaccins: "Pasteurellose, Brucellose, PPR", actif: true, gestationJours: 150, races: [r("caprin-chevre-du-sahel", "Chèvre du Sahel"), r("caprin-chevre-djallonke", "Chèvre Djallonké"), r("caprin-chevre-naine-africaine", "Chèvre Naine africaine"), r("caprin-bouc-de-race-amelioree-saanen", "Bouc de race améliorée (Saanen ×)")] },
  { id: "porcin", nom: "Porcin", description: "Élevage porcin : porc, truie", vaccins: "Rouget, PPA (surveillance), Parvovirose porcine", actif: false, gestationJours: 114, races: [r("porcin-porc-local-large-white", "Porc local (Large White ×)"), r("porcin-large-white", "Large White"), r("porcin-landrace", "Landrace")] },
  { id: "volaille", nom: "Volaille", description: "Poulets, pintades, dindons, canards", vaccins: "Newcastle, Gumboro, Marek, Bronchite infectieuse", actif: true, gestationJours: null, races: [r("volaille-poulet-local-gallus", "Poulet local (Gallus)"), r("volaille-poulet-de-chair-cobb-ross", "Poulet de chair (Cobb, Ross)"), r("volaille-pintade-locale", "Pintade locale"), r("volaille-dinde", "Dinde"), r("volaille-canard-de-barbarie", "Canard de Barbarie")] },
  { id: "equin", nom: "Équin", description: "Cheval, âne, mulet", vaccins: "Rage, Rhinopneumonie, Grippe équine, Tétanos", actif: true, gestationJours: 340, races: [r("equin-cheval-de-race-locale", "Cheval de race locale"), r("equin-cheval-pur-sang-arabe", "Cheval Pur-sang Arabe"), r("equin-ane-local", "Âne local"), r("equin-mulet", "Mulet")] },
  { id: "camelin", nom: "Camelin", description: "Chameau, dromadaire", vaccins: "MERS (surveillance), Rage", actif: false, gestationJours: null, races: [r("camelin-dromadaire-camelus-dromedarius", "Dromadaire (Camelus dromedarius)")] },
  { id: "autre", nom: "Autre", description: "Autre espèce non listée", vaccins: "—", actif: true, gestationJours: null, races: [] },
];

export let SERVICES: DemoService[] = seedServices();
export let ESPECES: DemoEspece[] = seedEspeces();
export const resetReferentiels = () => { SERVICES = seedServices(); ESPECES = seedEspeces(); };

const notFound = (what: string): Failure => ({ status: 404, code: 'not_found', message: `${what} introuvable` });
const liveServices = () => SERVICES.filter((s) => !s.deleted);

export interface ServiceInput { libelle: string; categorie: string; description: string; prix: number }

function validate(i: ServiceInput): Failure | null {
  if (!i.libelle.trim()) return { status: 422, code: 'invalid', message: 'Le libellé est obligatoire' };
  if (!Number.isInteger(i.prix) || i.prix < 0) return { status: 422, code: 'invalid', message: 'Le prix doit être un nombre entier de FCFA' };
  return null;
}

const dupe = (libelle: string, categorie: string, exceptId?: string) =>
  liveServices().some((s) => s.id !== exceptId && s.categorie === categorie && s.libelle.toLowerCase() === libelle.trim().toLowerCase());

export function listServices(p: { q?: string; categorie?: string; statut?: string; page: number; pageSize: number }) {
  const q = (p.q ?? '').trim().toLowerCase();
  const rows = liveServices()
    .filter((s) => !q || `${s.libelle} ${s.description}`.toLowerCase().includes(q))
    .filter((s) => !p.categorie || s.categorie === p.categorie)
    .filter((s) => !p.statut || (p.statut === 'actif' ? s.actif : !s.actif))
    .sort((a, b) => SERVICE_CATEGORIES.indexOf(a.categorie as never) - SERVICE_CATEGORIES.indexOf(b.categorie as never) || a.libelle.localeCompare(b.libelle, 'fr'));
  const start = (p.page - 1) * p.pageSize;
  return { items: rows.slice(start, start + p.pageSize), total: rows.length };
}

export function createService(i: ServiceInput): DemoService | Failure {
  const err = validate(i);
  if (err) return err;
  if (!SERVICE_CATEGORIES.includes(i.categorie as never)) return { status: 422, code: 'invalid_category', message: 'Catégorie inconnue' };
  if (dupe(i.libelle, i.categorie)) return { status: 409, code: 'service_exists', message: 'Ce service existe déjà dans cette catégorie' };
  const s: DemoService = { id: String(Math.max(0, ...SERVICES.map((x) => Number(x.id))) + 1), libelle: i.libelle.trim(), categorie: i.categorie, description: i.description.trim(), prix: i.prix, actif: true };
  SERVICES.push(s);
  return s;
}

/** Modification : libellé, description et prix (la catégorie ne change pas, d'après la spécification). */
export function updateService(id: string, i: ServiceInput): DemoService | Failure {
  const s = liveServices().find((x) => x.id === id);
  if (!s) return notFound('Service');
  const err = validate(i);
  if (err) return err;
  if (dupe(i.libelle, s.categorie, id)) return { status: 409, code: 'service_exists', message: 'Ce service existe déjà dans cette catégorie' };
  Object.assign(s, { libelle: i.libelle.trim(), description: i.description.trim(), prix: i.prix });
  return s;
}

export function setServiceActive(id: string, actif: boolean): DemoService | Failure {
  const s = liveServices().find((x) => x.id === id);
  if (!s) return notFound('Service');
  s.actif = actif;
  return s;
}

export function deleteService(id: string): null | Failure {
  const s = liveServices().find((x) => x.id === id);
  if (!s) return notFound('Service');
  s.deleted = true;
  s.actif = false;
  return null;
}

/** Services proposables lors d'une consultation : seuls les services actifs. */
export const activeServices = () => liveServices().filter((s) => s.actif);

export function setEspeceActive(id: string, actif: boolean): DemoEspece | Failure {
  const e = ESPECES.find((x) => x.id === id);
  if (!e) return notFound('Espèce');
  e.actif = actif;
  return e;
}

export function setRaceActive(id: string, actif: boolean): DemoEspece | Failure {
  const e = ESPECES.find((x) => x.races.some((r) => r.id === id));
  const race = e?.races.find((x) => x.id === id);
  if (!e || !race) return notFound('Race');
  race.actif = actif;
  return e;
}

/** Durée de gestation paramétrable par espèce (valeurs de départ à faire valider par un vétérinaire). */
export function setGestation(id: string, jours: number | null): DemoEspece | Failure {
  const e = ESPECES.find((x) => x.id === id);
  if (!e) return notFound('Espèce');
  if (jours !== null && (!Number.isInteger(jours) || jours < 1 || jours > 999)) return { status: 422, code: 'invalid', message: 'La durée doit être un nombre de jours entre 1 et 999' };
  e.gestationJours = jours;
  return e;
}

/** Espèces et races proposables à l'ajout d'un patient ou d'un rendez-vous : seulement les actives. */
export const activeEspeces = () => ESPECES.filter((e) => e.actif).map((e) => ({ ...e, races: e.races.filter((r) => r.actif) }));

export function serviceStats() {
  const rows = liveServices();
  const total = rows.length;
  return {
    total,
    actifs: rows.filter((x) => x.actif).length,
    categories: new Set(rows.map((x) => x.categorie)).size,
    tarif_moyen: total ? Math.round(rows.reduce((n, x) => n + x.prix, 0) / total) : 0,
  };
}
