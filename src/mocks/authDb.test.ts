import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyReset, attemptLogin, changePassword, buildAccess, confirmTwofaSetup, DEMO_USERS, disableTwofa, maskedTarget, renewBackupCodes, requestReset, resetFailures, startTwofaSetup,
  twofaStatus, updateOwnContact, verifyBackupCode, verifyTwoFactor, resetAll,
} from './authDb';
import { can } from '@/core/auth/permissions';
import { updateCabinet, CABINET } from './cabinetDb';

beforeEach(resetFailures);

describe('connexion de démonstration', () => {
  it('connecte un compte valide', () => expect(attemptLogin('admin', 'Admin#2026').kind).toBe('ok'));

  it('renvoie un message générique si le mot de passe est faux ou le compte inconnu', () => {
    for (const [id, pw] of [['admin', 'faux'], ['inconnu', 'x']]) {
      expect(attemptLogin(id, pw)).toMatchObject({ code: 'invalid_credentials', message: 'Identifiant ou mot de passe incorrect' });
    }
  });

  it('bloque 15 minutes après 5 échecs, même avec le bon mot de passe, puis rouvre', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) attemptLogin('veto', 'faux', t0);
    expect(attemptLogin('veto', 'Veto#2026', t0 + 60_000)).toMatchObject({ status: 423, code: 'account_locked' });
    expect(attemptLogin('veto', 'Veto#2026', t0 + 16 * 60_000).kind).toBe('ok');
  });

  it('un succès remet le compteur à zéro', () => {
    for (let i = 0; i < 4; i++) attemptLogin('veto', 'faux');
    attemptLogin('veto', 'Veto#2026');
    for (let i = 0; i < 4; i++) attemptLogin('veto', 'faux');
    expect(attemptLogin('veto', 'Veto#2026').kind).toBe('ok');
  });

  it('refuse un compte désactivé avec un message dédié, sans le révéler si le mot de passe est faux', () => {
    expect(attemptLogin('desactive', 'Desact#2026')).toMatchObject({ status: 403, code: 'account_disabled' });
    expect(attemptLogin('desactive', 'faux')).toMatchObject({ code: 'invalid_credentials' });
  });

  it('demande un code de double authentification', () => {
    const out = attemptLogin('double', 'Double#2026');
    expect(out.kind).toBe('2fa');
    if (out.kind !== '2fa') return;
    expect(verifyTwoFactor(out.challengeId, '000000')).toMatchObject({ code: 'invalid_code' });
    expect(verifyTwoFactor(out.challengeId, '123456').kind).toBe('ok');
  });
});

describe('mot de passe oublié', () => {
  it('signale une adresse inconnue (cas d\'erreur de la spécification)', () => {
    expect(requestReset('nobody@x.sn')).toMatchObject({ code: 'email_not_found' });
    expect(requestReset('AMADOU.SY@vetepro.sn')).toBeNull();
  });
  it('refuse un lien expiré', () => {
    expect(applyReset('expire')).toMatchObject({ status: 410 });
    expect(applyReset('valide')).toBeNull();
  });
});

describe('droits de démonstration', () => {
  const access = (id: string) => buildAccess(DEMO_USERS.find((u) => u.identifiant === id)!);
  it("l'Assistant consulte le stock, réapprovisionne et vend, mais ne crée, ne modifie ni ne supprime aucun article (règle D3)", () => {
    const p = access('assistant').permissions;
    expect(p.pharmacie).toEqual(['read']);
    expect(can(p, 'stock', 'create')).toBe(true);
    expect(can(p, 'ventes', 'create')).toBe(true);
    expect(can(p, 'pharmacie', 'create')).toBe(false);
    expect(can(p, 'pharmacie', 'update')).toBe(false);
    expect(can(p, 'pharmacie', 'delete')).toBe(false);
    expect(can(p, 'utilisateurs')).toBe(false);
  });
  it("seul l'Administrateur voit l'administration", () => {
    expect(can(access('admin').permissions, 'habilitations')).toBe(true);
    expect(can(access('veto').permissions, 'habilitations')).toBe(false);
  });
});

describe('changement de mot de passe', () => {
  it('refuse un mot de passe actuel incorrect, accepte le bon et le nouveau mot de passe fonctionne', () => {
    expect(changePassword('3', 'faux', 'Nouveau#2026')).toMatchObject({ code: 'invalid_current_password' });
    expect(changePassword('3', 'Assist#2026', 'Nouveau#2026')).toBeNull();
    expect(attemptLogin('assistant', 'Nouveau#2026').kind).toBe('ok');
  });
});

describe('double authentification', () => {
  beforeEach(() => resetAll());

  it('annonce où le code est envoyé, masqué', () => {
    const out = attemptLogin('double', 'Double#2026');
    expect(out).toMatchObject({ kind: '2fa', methode: 'sms', destinataire: '77 *** ** 00' });
    expect(maskedTarget(DEMO_USERS.find((u) => u.id === '6')!, 'email')).toBe('i***@vetepro.sn');
  });

  it('dispense du code un appareil de confiance', () => {
    const first = attemptLogin('double', 'Double#2026', Date.now(), 'appareil-1');
    if (first.kind !== '2fa') throw new Error('code attendu');
    expect(verifyTwoFactor(first.challengeId, '123456', { deviceId: 'appareil-1', faireConfiance: true }).kind).toBe('ok');
    expect(attemptLogin('double', 'Double#2026', Date.now(), 'appareil-1').kind).toBe('ok');
    expect(attemptLogin('double', 'Double#2026', Date.now(), 'appareil-2').kind).toBe('2fa');
  });

  it('accepte un code de secours une seule fois', () => {
    const out = attemptLogin('double', 'Double#2026');
    if (out.kind !== '2fa') throw new Error('code attendu');
    expect(verifyBackupCode(out.challengeId, 'ab12-cd34').kind).toBe('ok');
    expect(verifyBackupCode(out.challengeId, 'AB12-CD34')).toMatchObject({ code: 'invalid_code' });
  });

  it('impose la configuration quand le cabinet l\'exige', () => {
    const out = attemptLogin('securise', 'Secure#2026');
    expect(out.kind).toBe('setup');
    if (out.kind !== 'setup') return;
    expect(startTwofaSetup(out.challengeId, 'fax')).toMatchObject({ code: 'invalid' });
    expect(startTwofaSetup(out.challengeId, 'email')).toMatchObject({ destinataire: 'k***@vetepro.sn' });
    expect(confirmTwofaSetup(out.challengeId, '000000')).toMatchObject({ code: 'invalid_code' });
    const done = confirmTwofaSetup(out.challengeId, '123456');
    if ('code' in done) throw new Error('activation attendue');
    expect(done.codes).toHaveLength(8);
    expect(done.codes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(attemptLogin('securise', 'Secure#2026').kind).toBe('2fa');
  });

  it('ne peut pas être désactivée quand elle est imposée, mais l\'est sinon, après le mot de passe', () => {
    const req = attemptLogin('securise', 'Secure#2026');
    if (req.kind !== 'setup') throw new Error('configuration attendue');
    startTwofaSetup(req.challengeId, 'sms');
    confirmTwofaSetup(req.challengeId, '123456');
    expect(disableTwofa('9', 'Secure#2026')).toMatchObject({ code: 'twofa_required' });
    expect(disableTwofa('6', 'faux')).toMatchObject({ code: 'invalid_current_password' });
    expect(disableTwofa('6', 'Double#2026')).toBeNull();
    expect(twofaStatus('6')).toMatchObject({ active: false, methode: null });
  });

  it('renouvelle les codes de secours', () => {
    expect(renewBackupCodes('6', 'faux')).toMatchObject({ code: 'invalid_current_password' });
    const r = renewBackupCodes('6', 'Double#2026');
    if ('code' in r) throw new Error('codes attendus');
    expect(r.codes).toHaveLength(8);
    expect(twofaStatus('6').codes_secours_restants).toBe(8);
  });
});

describe('double authentification imposée par le cabinet', () => {
  beforeEach(() => resetAll());
  it("demande la configuration à tous les utilisateurs et interdit de la désactiver", () => {
    expect(attemptLogin('admin', 'Admin#2026').kind).toBe('ok');
    updateCabinet({ ...CABINET, twofaObligatoire: true });
    expect(attemptLogin('admin', 'Admin#2026').kind).toBe('setup');
    expect(twofaStatus('6').requise).toBe(true);
    expect(disableTwofa('6', 'Double#2026')).toMatchObject({ code: 'twofa_required' });
  });
});

describe('mon compte : coordonnées', () => {
  beforeEach(() => resetAll());
  it("met à jour l'e-mail et le téléphone, l'e-mail restant unique", () => {
    expect(updateOwnContact('2', 'Nouveau@Vetepro.sn', '77 100 20 30')).toMatchObject({ email: 'nouveau@vetepro.sn', telephone: '77 100 20 30' });
    expect(updateOwnContact('2', 'admin@x.sn', '12')).toMatchObject({ code: 'invalid' });
    expect(updateOwnContact('2', 'amadou.sy@vetepro.sn', '77 100 20 30')).toMatchObject({ code: 'email_taken' });
    expect(updateOwnContact('2', 'pas-un-mail', '')).toMatchObject({ code: 'invalid' });
  });
});
