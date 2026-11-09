import { beforeEach, describe, expect, it } from 'vitest';
import { resetUsers } from './authDb';
import { resetForum } from './forumDb';
import * as db from './networkDb';
import { NOTIFS, resetNotifications } from './notifDb';
import { resetPatients } from './patientsDb';

beforeEach(() => { db.resetNetwork(); resetUsers(); resetForum(); resetNotifications(); resetPatients(); });

const cas = (over: Partial<db.CasInput> = {}) => ({ titre: 'Boiterie', espece: 'Bovin', categorie: '2ᵉ avis', description: 'Boiterie depuis 3 semaines', ...over });

describe('cas partagés', () => {
  it('exige titre, espèce, description et une catégorie connue', () => {
    expect(db.createCas(cas({ titre: ' ' }), '2')).toMatchObject({ message: 'Titre requis' });
    expect(db.createCas(cas({ espece: '' }), '2')).toMatchObject({ message: 'Espèce requise' });
    expect(db.createCas(cas({ description: '' }), '2')).toMatchObject({ message: 'Description requise' });
    expect(db.createCas(cas({ categorie: 'Autre chose' }), '2')).toMatchObject({ message: 'Catégorie inconnue' });
  });
  it('refuse un cas qui contient le nom d\'un propriétaire (anonymisation)', () => {
    expect(db.createCas(cas({ description: 'Animal de Moussa Diallo, boiteux' }), '2')).toMatchObject({ code: 'not_anonymous' });
  });
  it('affiche le cas avec l\'établissement et la ville de son auteur', () => {
    const c = db.createCas(cas(), '2') as db.DemoCas;
    expect(c).toMatchObject({ resolu: false, ville: 'Dakar', date: new Date().toISOString().slice(0, 10) });
    expect(db.listCas()[0].id).toBe(c.id);
  });
  it('filtre par recherche, espèce et statut', () => {
    expect(db.listCas({ q: 'newcastle' }).map((c) => c.id)).toEqual(['3']);
    expect(db.listCas({ espece: 'Chien' }).map((c) => c.id)).toEqual(['2']);
    expect(db.listCas({ statut: 'resolu' }).map((c) => c.id)).toEqual(['2']);
    expect(db.listCas({ statut: 'ouvert' }).map((c) => c.id)).toEqual(['3', '1']);
  });
  it('une voix « Utile » par personne, retirée au second clic', () => {
    expect((db.toggleUtile('3', '2') as db.DemoCas).votes).toEqual(['r1']);
    expect((db.toggleUtile('3', '2') as db.DemoCas).votes).toEqual(['r1', '2']);
  });
  it('un avis vide est refusé', () => {
    expect(db.addAvis('3', ' ', '2')).toMatchObject({ message: 'Écrivez votre avis' });
    expect((db.addAvis('3', 'Prélèvement à envoyer', '2') as db.DemoCas).avis).toHaveLength(1);
  });
  it('seul l\'auteur clôture le cas, l\'Administrateur qui modère aussi', () => {
    expect(db.resolveCas('1', '2', false)).toMatchObject({ status: 403 });
    expect((db.resolveCas('1', '1', false) as db.DemoCas).resolu).toBe(true);
    expect((db.resolveCas('3', '2', true) as db.DemoCas).resolu).toBe(true);
  });
});

describe('veille épidémiologique', () => {
  const foyer = (over: Partial<db.EpiInput> = {}) => ({ maladie: 'Rage', espece: 'Chien', ville: 'Dakar', cas: 2, gravite: 'moyenne', notes: '', ...over });
  it('exige maladie, espèce, localité, au moins un cas et une gravité connue', () => {
    expect(db.createEpidemie(foyer({ maladie: '' }), '2')).toMatchObject({ message: 'Maladie requise' });
    expect(db.createEpidemie(foyer({ ville: ' ' }), '2')).toMatchObject({ message: 'Localité requise' });
    expect(db.createEpidemie(foyer({ cas: 0 }), '2')).toMatchObject({ message: 'Le nombre de cas doit être au moins 1' });
    expect(db.createEpidemie(foyer({ gravite: 'grave' }), '2')).toMatchObject({ message: 'Gravité inconnue' });
  });
  it('déclare un foyer actif au nom de l\'établissement du déclarant', () => {
    const out = db.createEpidemie(foyer(), '2') as { foyer: db.DemoEpi };
    expect(out.foyer).toMatchObject({ statut: 'active', declarantId: '2', clinique: expect.stringContaining('Dakar') });
  });
  it('calcule les indicateurs', () => {
    expect(db.epiStats()).toEqual({ actifs: 4, cas: 80, localites: 4, signalements: 6 });
  });
  it('déclenche une alerte quand deux établissements signalent la même maladie dans la même ville', () => {
    expect(db.alertes()).toEqual([{ maladie: 'Maladie de Newcastle', ville: 'Louga', foyers: 2, cas: 55 }]);
  });
  it('un même établissement qui signale deux fois ne déclenche pas d\'alerte, un second établissement oui, avec notification', () => {
    db.createEpidemie(foyer({ maladie: 'Botulisme', ville: 'Kolda' }), '2');
    expect(db.createEpidemie(foyer({ maladie: 'botulisme', ville: 'kolda' }), '2')).toMatchObject({ alerteDeclenchee: false });
    expect(NOTIFS.filter((n) => n.type === 'epidemie')).toHaveLength(0);
    expect(db.createEpidemie(foyer({ maladie: 'Botulisme', ville: 'Kolda' }), '12')).toMatchObject({ alerteDeclenchee: true });
    expect(NOTIFS.filter((n) => n.type === 'epidemie')).toMatchObject([{ module: 'reseau', titre: 'Alerte réseau : Botulisme à Kolda' }]);
  });
  it('un foyer résolu ne compte plus dans l\'alerte ni dans les foyers actifs', () => {
    db.resolveEpidemie('6', 'r3', false);
    expect(db.alertes()).toEqual([]);
    expect(db.activeCount()).toBe(3);
  });
  it('seul le déclarant, ou l\'Administrateur, marque un foyer résolu', () => {
    expect(db.resolveEpidemie('2', '2', false)).toMatchObject({ status: 403 });
    expect((db.resolveEpidemie('2', '1', true) as db.DemoEpi).statut).toBe('resolu');
  });
  it('recherche et filtre par gravité', () => {
    expect(db.listEpidemies({ q: 'thiès' }).map((e) => e.id)).toEqual(['2', '4']);
    expect(db.listEpidemies({ gravite: 'faible' })).toEqual([]);
  });
});

describe('annuaire', () => {
  it('cherche par nom, établissement, ville, spécialité ou équipement', () => {
    expect(db.listAnnuaire('échographie').map((a) => a.id)).toEqual(['2', '4']);
    expect(db.listAnnuaire('louga').map((a) => a.id)).toEqual(['3']);
    expect(db.listAnnuaire('zzz')).toEqual([]);
  });
  it('oriente un patient avec un motif obligatoire', () => {
    expect(db.orienter('1', { patientId: '1', motif: ' ' }, 'Fatou Diallo')).toMatchObject({ message: "Motif de l'orientation requis" });
    expect(db.orienter('1', { patientId: '999', motif: 'x' }, 'Fatou Diallo')).toMatchObject({ message: 'Patient requis' });
    expect(db.orienter('99', { patientId: '1', motif: 'x' }, 'Fatou Diallo')).toMatchObject({ status: 404 });
    expect(db.orienter('1', { patientId: '1', motif: 'Bloc chirurgical nécessaire' }, 'Fatou Diallo')).toMatchObject({ confrereId: '1', par: 'Fatou Diallo' });
    expect(db.ORIENTATIONS).toHaveLength(1);
  });
});
