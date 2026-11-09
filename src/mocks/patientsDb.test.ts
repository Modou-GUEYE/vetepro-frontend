import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './patientsDb';
import { resetReferentiels, setEspeceActive } from './referentielsDb';

const animal = (o: Partial<db.PatientInput> = {}): db.PatientInput => ({
  type: 'animal', ownerId: '1', nom: 'Luna', especeId: 'chien', raceId: 'chien-caniche', sexe: 'F', naissance: '2023-04-01', antecedents: '', statutRepro: 'entier',
  effectif: null, femelles: null, males: null, jeunes: null, localisation: '', recensement: null, note: '', ...o,
});
const troupeau = (o: Partial<db.PatientInput> = {}): db.PatientInput => animal({ type: 'troupeau', nom: 'Troupeau Fall', especeId: 'bovin', raceId: null, sexe: null, naissance: null, statutRepro: null, effectif: 20, femelles: 12, males: 5, jeunes: 3, localisation: 'Thiès', ...o });

beforeEach(() => { db.resetPatients(); resetReferentiels(); });

describe('propriétaires', () => {
  it('crée un propriétaire (prénom et nom obligatoires, e-mail valide)', () => {
    expect(db.createOwner({ prenom: 'Ibou', nom: 'Faye', telephone: '77 000 00 00', email: '', adresse: 'Dakar' })).toMatchObject({ nom: 'Faye', actif: true });
    expect(db.createOwner({ prenom: '', nom: 'X', telephone: '', email: '', adresse: '' })).toMatchObject({ status: 422 });
    expect(db.createOwner({ prenom: 'A', nom: 'B', telephone: '', email: 'pas-un-mail', adresse: '' })).toMatchObject({ status: 422 });
  });

  it("compte les animaux et troupeaux rattachés à chaque propriétaire", () => {
    expect(db.patientCount('1')).toBe(3);
    expect(db.patientCount('4')).toBe(0);
  });

  it("refuse la suppression d'un propriétaire qui a des animaux ou troupeaux, avec un message d'avertissement", () => {
    expect(db.deleteOwner('1')).toMatchObject({ status: 409, code: 'owner_has_patients' });
    expect(db.deleteOwner('4')).toBeNull();
    expect(db.listOwners({ page: 1, pageSize: 50 }).items.some((x) => x.id === '4')).toBe(false);
  });

  it("un propriétaire désactivé n'est plus proposé pour un nouveau dossier", () => {
    db.setOwnerActive('2', false);
    expect(db.ownerChoices().some((x) => x.id === '2')).toBe(false);
    expect(db.createPatient(animal({ ownerId: '2' }), 'Test')).toMatchObject({ code: 'owner_inactive' });
    db.setOwnerActive('2', true);
    expect(db.createPatient(animal({ ownerId: '2' }), 'Test')).toMatchObject({ nom: 'Luna' });
  });
});

describe('dossiers patients', () => {
  it('génère le matricule automatiquement, un par dossier', () => {
    const a = db.createPatient(animal(), 'Dr Sy');
    const b = db.createPatient(troupeau(), 'Dr Sy');
    expect(a).toMatchObject({ matricule: 'PAT-0008' });
    expect(b).toMatchObject({ matricule: 'PAT-0009' });
  });

  it('exige propriétaire, nom et espèce, et une race qui correspond à l\'espèce', () => {
    expect(db.createPatient(animal({ nom: ' ' }), 'x')).toMatchObject({ status: 422 });
    expect(db.createPatient(animal({ ownerId: '' }), 'x')).toMatchObject({ code: 'invalid_owner' });
    expect(db.createPatient(animal({ especeId: 'chat' }), 'x')).toMatchObject({ code: 'invalid_race' });
  });

  it("refuse une espèce désactivée à la création, mais un dossier existant la garde", () => {
    setEspeceActive('chien', false);
    expect(db.createPatient(animal(), 'x')).toMatchObject({ code: 'species_inactive' });
    const rex = db.getPatient('1') as db.DemoPatient;
    expect(db.updatePatient('1', { ...animal({ nom: 'Rex II', raceId: rex.raceId }), type: 'animal' }, 'x')).toMatchObject({ nom: 'Rex II' });
  });

  it("valide un troupeau : effectif obligatoire, femelles + mâles + jeunes ne dépassent pas l'effectif", () => {
    expect(db.createPatient(troupeau({ effectif: null }), 'x')).toMatchObject({ status: 422 });
    expect(db.createPatient(troupeau({ effectif: 10, femelles: 8, males: 3, jeunes: 1 }), 'x')).toMatchObject({ status: 422 });
    expect(db.createPatient(troupeau(), 'x')).toMatchObject({ type: 'troupeau', effectif: 20 });
  });

  it('refuse une date de naissance dans le futur', () => {
    expect(db.createPatient(animal({ naissance: '2999-01-01' }), 'x')).toMatchObject({ status: 422 });
  });

  it('recherche par matricule, nom, espèce ou propriétaire, filtre par type et par propriétaire', () => {
    expect(db.listPatients({ q: 'PAT-0002', page: 1, pageSize: 20 }).items.map((x) => x.nom)).toEqual(['Mimi']);
    expect(db.listPatients({ q: 'diallo', page: 1, pageSize: 20 }).total).toBe(3);
    expect(db.listPatients({ q: 'chien', page: 1, pageSize: 20 }).total).toBe(2);
    expect(db.listPatients({ type: 'troupeau', page: 1, pageSize: 20 }).total).toBe(3);
    expect(db.listPatients({ ownerId: '2', page: 1, pageSize: 20 }).total).toBe(2);
  });

  it("trace chaque modification : auteur, date, champs changés avant et après", () => {
    const when = new Date('2026-10-22T10:30:00.000Z');
    db.updatePatient('1', animal({ nom: 'Rex', raceId: 'chien-berger-allemand', sexe: 'M', naissance: '2020-05-10', antecedents: 'Allergie aux puces et aux pollens', statutRepro: 'sterilise' }), 'Dr Fatou Diallo', when);
    const rex = db.getPatient('1') as db.DemoPatient;
    expect(rex.history).toHaveLength(2);
    expect(rex.history[0]).toMatchObject({ by: 'Dr Fatou Diallo', at: when.toISOString(), action: 'modification' });
    expect(rex.history[0].changes).toEqual([
      { champ: 'Antécédents / allergies', avant: 'Allergie aux puces', apres: 'Allergie aux puces et aux pollens' },
      { champ: 'Statut reproducteur', avant: 'Entier(e)', apres: 'Stérilisé(e)' },
    ]);
  });

  it("n'ajoute pas d'entrée d'historique quand rien ne change", () => {
    const rex = db.getPatient('1') as db.DemoPatient;
    db.updatePatient('1', { ...animal({ ownerId: '1', nom: 'Rex', raceId: rex.raceId, sexe: 'M', naissance: '2020-05-10', antecedents: 'Allergie aux puces', statutRepro: 'entier' }) }, 'x');
    expect((db.getPatient('1') as db.DemoPatient).history).toHaveLength(1);
  });

  it('ne permet pas de transformer un animal en troupeau', () => {
    expect(db.updatePatient('1', troupeau(), 'x')).toMatchObject({ status: 422 });
  });
});
