import { beforeEach, describe, expect, it } from 'vitest';
import { can } from '@/core/auth/permissions';
import * as db from './adminDb';
import { attemptLogin, buildAccess, DEMO_USERS, resetAll } from './authDb';
import { duplicateProfile, getProfile, resetProfiles, setProfilePermissions } from './profilesDb';

const input = (o: Partial<db.UserInput> = {}): db.UserInput =>
  ({ prenom: 'Aïcha', nom: 'Thiam', identifiant: 'aicha', email: 'aicha@vetepro.sn', telephone: '', specialite: '', profilId: 'assistant', ...o });
const access = (id: string) => buildAccess(DEMO_USERS.find((u) => u.id === id)!);

beforeEach(() => { resetAll(); resetProfiles(); });

describe('utilisateurs', () => {
  it('crée un utilisateur et refuse un identifiant ou un e-mail déjà pris', () => {
    expect(db.createUser(input())).toMatchObject({ identifiant: 'aicha' });
    expect(db.createUser(input({ email: 'autre@x.sn' }))).toMatchObject({ code: 'identifiant_taken' });
    expect(db.createUser(input({ identifiant: 'autre' }))).toMatchObject({ code: 'email_taken' });
  });

  it('filtre par recherche et par statut, avec pagination', () => {
    expect(db.listUsers({ search: 'diallo', page: 1, pageSize: 10 }).total).toBe(1);
    expect(db.listUsers({ statut: 'inactif', page: 1, pageSize: 10 }).items.map((u) => u.identifiant)).toEqual(['desactive']);
    expect(db.listUsers({ page: 2, pageSize: 3 }).items).toHaveLength(3);
  });

  it('un compte désactivé ne peut plus se connecter, réactivé il le peut', () => {
    db.setActive('3', false, '1');
    expect(attemptLogin('assistant', 'Assist#2026')).toMatchObject({ code: 'account_disabled' });
    db.setActive('3', true);
    expect(attemptLogin('assistant', 'Assist#2026').kind).toBe('ok');
  });

  it('refuse de désactiver ou supprimer son propre compte', () => {
    expect(db.setActive('1', false, '1')).toMatchObject({ code: 'cannot_self' });
    expect(db.deleteUser('1', '1')).toMatchObject({ code: 'cannot_self' });
  });

  it('la suppression est logique : le compte disparaît des listes et de la connexion', () => {
    expect(db.deleteUser('3', '1')).toBeNull();
    expect(db.listUsers({ search: 'diouf', page: 1, pageSize: 10 }).total).toBe(0);
    expect(attemptLogin('assistant', 'Assist#2026')).toMatchObject({ status: 403, code: 'account_deleted' });
    expect(attemptLogin('assistant', 'faux')).toMatchObject({ code: 'invalid_credentials' });
    expect(DEMO_USERS.find((u) => u.id === '3')?.deleted).toBe(true);
  });
});

describe('profils et habilitations', () => {
  it('duplique un profil avec un nouveau libellé, copie ses droits, refuse un libellé déjà pris', () => {
    const copy = duplicateProfile('assistant', 'Assistant sénior');
    expect(copy).toMatchObject({ label: 'Assistant sénior', system: false });
    expect('permissions' in copy && copy.permissions).toEqual(getProfile('assistant')!.permissions);
    expect(duplicateProfile('assistant', 'assistant sénior')).toMatchObject({ code: 'label_taken' });
    expect(duplicateProfile('assistant', '  ')).toMatchObject({ code: 'invalid' });
  });

  it('une modification de profil est immédiatement répercutée sur ses utilisateurs', () => {
    expect(can(access('3').permissions, 'facturation')).toBe(false);
    setProfilePermissions('assistant', { ...getProfile('assistant')!.permissions, facturation: ['read'] });
    expect(can(access('3').permissions, 'facturation')).toBe(true);
  });

  it('retire à un utilisateur un droit que son profil lui donne', () => {
    expect(can(access('3').permissions, 'ventes', 'create')).toBe(true);
    db.setOverrides('3', { ventes: { create: 'deny' } });
    expect(can(access('3').permissions, 'ventes', 'create')).toBe(false);
    expect(can(access('3').permissions, 'ventes', 'read')).toBe(true);
    expect(can(access('2').permissions, 'ventes', 'create')).toBe(true); // les autres utilisateurs du profil ne changent pas
  });

  it("l'Administrateur ne peut pas perdre ses droits sur les utilisateurs et habilitations", () => {
    const perms = { ...getProfile('admin')!.permissions, habilitations: ['read' as const] };
    expect(setProfilePermissions('admin', perms)).toMatchObject({ code: 'protected_profile' });
  });
});
