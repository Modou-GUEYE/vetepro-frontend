import { describe, expect, it } from 'vitest';
import { cellState, countOverrides, effectivePermissions, Overrides, PermissionMap, toggleOverride } from './permissions';

const profil: PermissionMap = { pharmacie: ['read', 'update'], patients: ['read'] };

describe('droits effectifs : profil + exceptions par utilisateur', () => {
  it('sans exception, les droits sont ceux du profil', () => {
    expect(effectivePermissions(profil, {})).toEqual(profil);
  });

  it('un droit accordé en plus s\'ajoute au profil', () => {
    const o: Overrides = { pharmacie: { delete: 'grant' } };
    expect(cellState(profil, o, 'pharmacie', 'delete')).toEqual({ on: true, origin: 'grant' });
    expect(effectivePermissions(profil, o).pharmacie).toEqual(['read', 'update', 'delete']);
  });

  it('un droit hérité du profil peut être retiré à un utilisateur', () => {
    const o: Overrides = { pharmacie: { update: 'deny' } };
    expect(cellState(profil, o, 'pharmacie', 'update')).toEqual({ on: false, origin: 'deny' });
    expect(effectivePermissions(profil, o).pharmacie).toEqual(['read']);
  });

  it('basculer une case hérité crée une exception, la rebasculer la supprime', () => {
    const retire = toggleOverride(profil, {}, 'pharmacie', 'update');
    expect(retire).toEqual({ pharmacie: { update: 'deny' } });
    expect(toggleOverride(profil, retire, 'pharmacie', 'update')).toEqual({});
  });

  it('basculer une case absente du profil l\'accorde, sans toucher aux autres exceptions', () => {
    const o = toggleOverride(profil, { patients: { read: 'deny' } }, 'facturation', 'read');
    expect(o).toEqual({ patients: { read: 'deny' }, facturation: { read: 'grant' } });
    expect(countOverrides(o)).toBe(2);
  });
});
