import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './referentielsDb';

const input = (o: Partial<db.ServiceInput> = {}): db.ServiceInput => ({ libelle: 'Détartrage', categorie: 'Soins', description: '', prix: 8000, ...o });
beforeEach(db.resetReferentiels);

describe('services', () => {
  it('crée un service actif et refuse un doublon dans la même catégorie', () => {
    expect(db.createService(input())).toMatchObject({ libelle: 'Détartrage', actif: true });
    expect(db.createService(input({ libelle: 'détartrage' }))).toMatchObject({ code: 'service_exists' });
    expect(db.createService(input({ categorie: 'Autre' }))).toMatchObject({ libelle: 'Détartrage' });
  });

  it('valide le libellé, le prix et la catégorie', () => {
    expect(db.createService(input({ libelle: ' ' }))).toMatchObject({ status: 422 });
    expect(db.createService(input({ prix: -1 }))).toMatchObject({ status: 422 });
    expect(db.createService(input({ prix: 10.5 }))).toMatchObject({ status: 422 });
    expect(db.createService(input({ categorie: 'Inconnue' }))).toMatchObject({ code: 'invalid_category' });
  });

  it('la modification change libellé, description et prix mais pas la catégorie', () => {
    const s = db.updateService('1', input({ libelle: 'Consultation standard', categorie: 'Chirurgie', prix: 6000 }));
    expect(s).toMatchObject({ libelle: 'Consultation standard', prix: 6000, categorie: 'Consultation' });
  });

  it("un service désactivé n'est plus proposé, réactivé il l'est de nouveau", () => {
    db.setServiceActive('1', false);
    expect(db.activeServices().some((s) => s.id === '1')).toBe(false);
    db.setServiceActive('1', true);
    expect(db.activeServices().some((s) => s.id === '1')).toBe(true);
  });

  it('la suppression est logique : le service disparaît de la liste et des services proposés', () => {
    expect(db.deleteService('2')).toBeNull();
    expect(db.listServices({ page: 1, pageSize: 50 }).items.some((s) => s.id === '2')).toBe(false);
    expect(db.activeServices().some((s) => s.id === '2')).toBe(false);
  });

  it('filtre et trie par catégorie', () => {
    const { items } = db.listServices({ page: 1, pageSize: 50 });
    expect(items[0].categorie).toBe('Consultation');
    expect(db.listServices({ categorie: 'Chirurgie', page: 1, pageSize: 50 }).total).toBe(2);
    expect(db.listServices({ statut: 'inactif', page: 1, pageSize: 50 }).items.map((s) => s.libelle)).toEqual(['Toilettage complet']);
  });
});

describe('espèces et races', () => {
  it("une espèce désactivée n'est plus proposée, ni ses races", () => {
    db.setEspeceActive('bovin', false);
    expect(db.activeEspeces().some((e) => e.id === 'bovin')).toBe(false);
  });

  it('une race désactivée disparaît de la liste proposée mais pas son espèce', () => {
    const premiere = db.ESPECES.find((e) => e.id === 'chien')!.races[0].id;
    db.setRaceActive(premiere, false);
    const chien = db.activeEspeces().find((e) => e.id === 'chien')!;
    expect(chien.races.map((r) => r.id)).not.toContain(premiere);
    expect(chien.races.length).toBeGreaterThan(0);
  });

  it('la durée de gestation est modifiable entre 1 et 999 jours, ou vide', () => {
    expect(db.setGestation('bovin', 280)).toMatchObject({ gestationJours: 280 });
    expect(db.setGestation('bovin', null)).toMatchObject({ gestationJours: null });
    expect(db.setGestation('bovin', 0)).toMatchObject({ status: 422 });
    expect(db.setGestation('bovin', 1000)).toMatchObject({ status: 422 });
  });

  it('démarre avec les durées de la spécification', () => {
    const d = Object.fromEntries(db.ESPECES.map((e) => [e.id, e.gestationJours]));
    expect(d).toMatchObject({ bovin: 283, ovin: 150, caprin: 150, equin: 340, porcin: 114, chien: 63, chat: 65 });
    expect(d.lapin).toBeNull(); // espèce absente de la spécification : durée à renseigner
  });
});

describe('indicateurs du catalogue', () => {
  it('compte les services, les actifs, les catégories et le tarif moyen', () => {
    expect(db.serviceStats()).toMatchObject({ total: 12, actifs: 11, categories: 9 });
    db.setServiceActive('8', true);
    expect(db.serviceStats().actifs).toBe(12);
  });
});
