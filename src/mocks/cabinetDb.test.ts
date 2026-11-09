import { beforeEach, describe, expect, it } from 'vitest';
import { CABINET, resetCabinet, updateCabinet } from './cabinetDb';

beforeEach(resetCabinet);
const valid = () => ({ ...CABINET, nom: 'Cabinet du Sud' });

describe('informations du cabinet', () => {
  it('enregistre une identité valide', () => {
    expect(updateCabinet({ ...valid(), ordre: 'odvs-0981', email: 'Contact@Sud.sn' })).toMatchObject({ nom: 'Cabinet du Sud', ordre: 'ODVS-0981', email: 'contact@sud.sn' });
  });
  it('refuse un nom vide avec le message de la spécification', () => {
    expect(updateCabinet({ ...valid(), nom: '  ' })).toMatchObject({ message: 'Renseignez le nom du cabinet' });
  });
  it("vérifie le format du numéro d'ordre, le téléphone et l'e-mail", () => {
    expect(updateCabinet({ ...valid(), ordre: '1142' })).toMatchObject({ code: 'invalid_ordre' });
    expect(updateCabinet({ ...valid(), telephone: '12' })).toMatchObject({ code: 'invalid' });
    expect(updateCabinet({ ...valid(), email: 'pas-un-mail' })).toMatchObject({ code: 'invalid' });
  });
  it("ne change rien quand la saisie est refusée", () => {
    updateCabinet({ ...valid(), nom: '' });
    expect(CABINET.nom).toBe('Clinique Vétérinaire de Dakar');
  });
});
