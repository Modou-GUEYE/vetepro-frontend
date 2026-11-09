import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './supportDb';

beforeEach(() => db.resetSupport());

describe('réclamations au support', () => {
  it('exige un objet et un message', () => {
    expect(db.createTicket({ objet: ' ', message: 'x' }, 'Admin')).toMatchObject({ message: 'Objet requis' });
    expect(db.createTicket({ objet: 'x', message: '' }, 'Admin')).toMatchObject({ message: 'Message requis' });
  });
  it('crée un ticket ouvert, numéroté, avec notification vers l\'équipe support', () => {
    const t = db.createTicket({ objet: 'Panne', message: 'Le planning ne charge plus' }, 'Amadou Sy') as db.DemoTicket;
    expect(t).toMatchObject({ numero: 'TCK-0003', statut: 'ouvert', auteur: 'Amadou Sy', notifieA: 'support@example.com' });
    expect(db.listTickets()[0].id).toBe(t.id);
  });
  it('filtre par statut', () => { expect(db.listTickets({ statut: 'resolu' })).toHaveLength(1); });
});
