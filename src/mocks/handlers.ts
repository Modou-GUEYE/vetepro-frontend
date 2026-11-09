import { http, HttpResponse } from 'msw';
import { adminHandlers } from './adminHandlers';
import { billingHandlers } from './billingHandlers';
import { paymentsHandlers } from './paymentsHandlers';
import { accountsHandlers } from './accountsHandlers';
import { consultHandlers } from './consultHandlers';
import { hospiHandlers } from './hospiHandlers';
import { vaccHandlers } from './vaccHandlers';
import { insemHandlers } from './inseminHandlers';
import { reportHandlers } from './reportHandlers';
import { portalHandlers } from './portalHandlers';
import { notifHandlers } from './notifHandlers';
import { forumHandlers } from './forumHandlers';
import { networkHandlers } from './networkHandlers';
import { rdvHandlers } from './rdvHandlers';
import { patientsHandlers } from './patientsHandlers';
import { pharmacyHandlers } from './pharmacyHandlers';
import { referentielsHandlers } from './referentielsHandlers';
import { CABINET, updateCabinet } from './cabinetDb';
import { authorize } from './authorize';
import {
  applyReset, changePassword, attemptLogin, buildAccess, buildSession, confirmTwofaSetup, DEMO_USERS, disableTwofa, renewBackupCodes, requestReset, resendCode, startTwofaSetup, twofaStatus,
  updateOwnContact, verifyBackupCode, verifyTwoFactor, Failure,
} from './authDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });

const userFromToken = (header: string | null) => {
  const id = header?.match(/^Bearer mock-access-(\d+)$/)?.[1];
  return DEMO_USERS.find((u) => u.id === id);
};

/** Un handler par endpoint ; chaque lot ajoute les siens. Les URL commencent par * pour fonctionner quel que soit le préfixe /api/v1. */
export const handlers = [
  ...adminHandlers,
  ...referentielsHandlers,
  ...patientsHandlers,
  ...pharmacyHandlers,
  ...billingHandlers,
  ...paymentsHandlers,
  ...accountsHandlers,
  ...consultHandlers,
  ...rdvHandlers,
  ...hospiHandlers,
  ...vaccHandlers,
  ...insemHandlers,
  ...reportHandlers,
  ...portalHandlers,
  ...notifHandlers,
  ...forumHandlers,
  ...networkHandlers,
  http.get('*/health', () => HttpResponse.json({ status: 'ok', version: 'mock' })),

  http.post('*/auth/login', async ({ request }) => {
    const { identifiant, mot_de_passe, appareil_id } = (await request.json()) as { identifiant: string; mot_de_passe: string; appareil_id?: string };
    const out = attemptLogin(identifiant, mot_de_passe, Date.now(), appareil_id);
    if (out.kind === 'error') return fail(out);
    if (out.kind === '2fa') return HttpResponse.json({ twofa_required: true, challenge_id: out.challengeId, methode: out.methode, destinataire: out.destinataire });
    if (out.kind === 'setup') return HttpResponse.json({ twofa_setup_required: true, challenge_id: out.challengeId });
    return HttpResponse.json(buildSession(out.user));
  }),

  http.post('*/auth/2fa/verify', async ({ request }) => {
    const { challenge_id, code, faire_confiance, appareil_id } = (await request.json()) as { challenge_id: string; code: string; faire_confiance?: boolean; appareil_id?: string };
    const out = verifyTwoFactor(challenge_id, code, { faireConfiance: !!faire_confiance, deviceId: appareil_id });
    return out.kind === 'ok' ? HttpResponse.json(buildSession(out.user)) : fail(out as Failure);
  }),

  http.post('*/auth/2fa/backup', async ({ request }) => {
    const { challenge_id, code } = (await request.json()) as { challenge_id: string; code: string };
    const out = verifyBackupCode(challenge_id, code);
    return out.kind === 'ok' ? HttpResponse.json(buildSession(out.user)) : fail(out as Failure);
  }),

  http.post('*/auth/2fa/resend', async ({ request }) => {
    const { challenge_id } = (await request.json()) as { challenge_id: string };
    const out = resendCode(challenge_id);
    return 'code' in out ? fail(out) : HttpResponse.json(out);
  }),

  /** Configuration imposée par le cabinet, à la connexion : choix de la méthode, puis code reçu. */
  http.post('*/auth/2fa/setup', async ({ request }) => {
    const { challenge_id, methode } = (await request.json()) as { challenge_id: string; methode: string };
    const out = startTwofaSetup(challenge_id, methode);
    return 'code' in out ? fail(out) : HttpResponse.json(out);
  }),

  http.post('*/auth/2fa/setup/verify', async ({ request }) => {
    const { challenge_id, code } = (await request.json()) as { challenge_id: string; code: string };
    const out = confirmTwofaSetup(challenge_id, code);
    return 'code' in out ? fail(out) : HttpResponse.json({ ...buildSession(out.user), codes_secours: out.codes });
  }),

  /** Mon compte : état, activation, désactivation et renouvellement des codes de secours. */
  http.get('*/auth/2fa/status', ({ request }) => {
    const user = userFromToken(request.headers.get('Authorization'));
    return user ? HttpResponse.json(twofaStatus(user.id)) : HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
  }),

  http.post('*/auth/2fa/activer', async ({ request }) => {
    const user = userFromToken(request.headers.get('Authorization'));
    if (!user) return HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
    const { methode } = (await request.json()) as { methode: string };
    if (user.twofa) return fail({ status: 409, code: 'twofa_active', message: 'La double authentification est déjà activée' });
    const out = startTwofaSetup(`ch-${user.id}`, methode);
    return 'code' in out ? fail(out) : HttpResponse.json({ challenge_id: `ch-${user.id}`, ...out });
  }),

  http.post('*/auth/2fa/activer/confirmer', async ({ request }) => {
    const user = userFromToken(request.headers.get('Authorization'));
    if (!user) return HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
    const { code } = (await request.json()) as { code: string };
    const out = confirmTwofaSetup(`ch-${user.id}`, code);
    return 'code' in out ? fail(out) : HttpResponse.json({ codes_secours: out.codes });
  }),

  http.post('*/auth/2fa/desactiver', async ({ request }) => {
    const user = userFromToken(request.headers.get('Authorization'));
    if (!user) return HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
    const { mot_de_passe } = (await request.json()) as { mot_de_passe: string };
    const err = disableTwofa(user.id, mot_de_passe);
    return err ? fail(err) : new HttpResponse(null, { status: 204 });
  }),

  http.post('*/auth/2fa/codes-secours', async ({ request }) => {
    const user = userFromToken(request.headers.get('Authorization'));
    if (!user) return HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
    const { mot_de_passe } = (await request.json()) as { mot_de_passe: string };
    const out = renewBackupCodes(user.id, mot_de_passe);
    return 'code' in out ? fail(out) : HttpResponse.json({ codes_secours: out.codes });
  }),

  http.post('*/auth/refresh', async ({ request }) => {
    const { refresh_token } = (await request.json()) as { refresh_token: string };
    const user = DEMO_USERS.find((u) => `mock-refresh-${u.id}` === refresh_token);
    return user ? HttpResponse.json(buildSession(user)) : HttpResponse.json({ code: 'invalid_token', message: 'Session expirée' }, { status: 401 });
  }),

  http.get('*/auth/me', ({ request }) => {
    const user = userFromToken(request.headers.get('Authorization'));
    return user ? HttpResponse.json(buildAccess(user)) : HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
  }),

  /** Mon compte : coordonnées de l'utilisateur connecté. */
  http.get('*/auth/profil', ({ request }) => {
    const user = userFromToken(request.headers.get('Authorization'));
    return user ? HttpResponse.json({ identifiant: user.identifiant, email: user.email, telephone: user.telephone }) : HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
  }),
  http.put('*/auth/profil', async ({ request }) => {
    const user = userFromToken(request.headers.get('Authorization'));
    if (!user) return HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
    const { email, telephone } = (await request.json()) as { email: string; telephone: string };
    const out = updateOwnContact(user.id, email, telephone);
    return 'code' in out ? fail(out) : HttpResponse.json({ identifiant: out.identifiant, email: out.email, telephone: out.telephone });
  }),

  /** Informations du cabinet : lisibles par tout utilisateur connecté, modifiables avec le droit sur les paramètres. */
  http.get('*/cabinet', ({ request }) => {
    const auth = authorize(request, null);
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ nom: CABINET.nom, ordre: CABINET.ordre, adresse: CABINET.adresse, telephone: CABINET.telephone, email: CABINET.email, logo: CABINET.logo, twofa_obligatoire: CABINET.twofaObligatoire });
  }),
  http.put('*/cabinet', async ({ request }) => {
    const auth = authorize(request, 'referentiels', 'update');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const out = updateCabinet({
      nom: String(b.nom ?? ''), ordre: String(b.ordre ?? ''), adresse: String(b.adresse ?? ''), telephone: String(b.telephone ?? ''), email: String(b.email ?? ''),
      logo: b.logo ? String(b.logo) : null, twofaObligatoire: !!b.twofa_obligatoire,
    });
    return 'code' in out ? fail(out) : HttpResponse.json({ nom: out.nom, ordre: out.ordre, adresse: out.adresse, telephone: out.telephone, email: out.email, logo: out.logo, twofa_obligatoire: out.twofaObligatoire });
  }),

  http.post('*/auth/logout', () => new HttpResponse(null, { status: 204 })),

  http.post('*/auth/change-password', async ({ request }) => {
    const user = userFromToken(request.headers.get('Authorization'));
    if (!user) return HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
    const { ancien, nouveau } = (await request.json()) as { ancien: string; nouveau: string };
    const err = changePassword(user.id, ancien, nouveau);
    return err ? fail(err) : new HttpResponse(null, { status: 204 });
  }),

  http.post('*/auth/forgot-password', async ({ request }) => {
    const { email } = (await request.json()) as { email: string };
    const err = requestReset(email);
    return err ? fail(err) : new HttpResponse(null, { status: 204 });
  }),

  http.post('*/auth/reset-password', async ({ request }) => {
    const { token } = (await request.json()) as { token: string };
    const err = applyReset(token);
    return err ? fail(err) : new HttpResponse(null, { status: 204 });
  }),
];
