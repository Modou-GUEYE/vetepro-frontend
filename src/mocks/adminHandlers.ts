import { http, HttpResponse } from 'msw';
import { Action, MODULES, ModuleKey, Overrides, can, PermissionMap } from '@/core/auth/permissions';
import * as db from './adminDb';
import { DEMO_USERS, DemoUser } from './authDb';
import { duplicateProfile, getProfile, setProfilePermissions, Failure } from './profilesDb';
import { effectivePermissions } from '@/core/auth/permissions';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x;

function caller(request: Request): DemoUser | undefined {
  const id = request.headers.get('Authorization')?.match(/^Bearer mock-access-(\d+)$/)?.[1];
  return DEMO_USERS.find((u) => u.id === id && !u.deleted && u.actif);
}

/** Vérifie le droit effectif au moment de l'appel : un changement de droits s'applique donc tout de suite. */
function authorize(request: Request, module: ModuleKey, action: Action): { user: DemoUser } | { response: Response } {
  const user = caller(request);
  if (!user) return { response: HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 }) };
  const perms = effectivePermissions(getProfile(user.profilId)?.permissions ?? {}, user.overrides);
  if (!can(perms, module, action)) {
    return { response: HttpResponse.json({ code: 'permission_denied', message: "Vous n'avez pas les droits pour effectuer cette action." }, { status: 403 }) };
  }
  return { user };
}

const userDto = (u: DemoUser) => ({
  id: u.id, prenom: u.prenom, nom: u.nom, identifiant: u.identifiant, email: u.email, telephone: u.telephone, specialite: u.specialite,
  profil_id: u.profilId, profil_label: getProfile(u.profilId)?.label ?? '', profil_base: getProfile(u.profilId)?.baseRole ?? 'assistant', actif: u.actif, twofa: !!u.twofa,
  nb_exceptions: Object.values(u.overrides).reduce((n, row) => n + Object.keys(row ?? {}).length, 0),
});

const inputFrom = (b: Record<string, string>): db.UserInput => ({
  prenom: b.prenom, nom: b.nom, identifiant: b.identifiant, email: b.email, telephone: b.telephone ?? '', specialite: b.specialite ?? '', profilId: b.profil_id,
});

export const adminHandlers = [
  http.get('*/users', ({ request }) => {
    const auth = authorize(request, 'utilisateurs', 'read');
    if ('response' in auth) return auth.response;
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1), pageSize = Number(url.searchParams.get('page_size') ?? 10);
    const { items, total } = db.listUsers({ search: url.searchParams.get('q') ?? '', statut: url.searchParams.get('statut') ?? '', profilId: url.searchParams.get('profil') ?? '', page, pageSize });
    return HttpResponse.json({ items: items.map(userDto), total, page, page_size: pageSize });
  }),

  http.get('*/users/:id', ({ request, params }) => {
    const auth = authorize(request, 'utilisateurs', 'read');
    if ('response' in auth) return auth.response;
    const u = db.getUser(String(params.id));
    return isFailure(u) ? fail(u) : HttpResponse.json({ ...userDto(u), exceptions: u.overrides });
  }),

  http.post('*/users', async ({ request }) => {
    const auth = authorize(request, 'utilisateurs', 'create');
    if ('response' in auth) return auth.response;
    const u = db.createUser(inputFrom((await request.json()) as Record<string, string>));
    return isFailure(u) ? fail(u) : HttpResponse.json({ ...userDto(u), message: `Un e-mail contenant le mot de passe a été envoyé à ${u.email}` }, { status: 201 });
  }),

  http.put('*/users/:id', async ({ request, params }) => {
    const auth = authorize(request, 'utilisateurs', 'update');
    if ('response' in auth) return auth.response;
    const u = db.updateUser(String(params.id), inputFrom((await request.json()) as Record<string, string>));
    return isFailure(u) ? fail(u) : HttpResponse.json(userDto(u));
  }),

  http.post('*/users/:id/activate', ({ request, params }) => {
    const auth = authorize(request, 'utilisateurs', 'update');
    if ('response' in auth) return auth.response;
    const u = db.setActive(String(params.id), true, auth.user.id);
    return isFailure(u) ? fail(u) : HttpResponse.json(userDto(u));
  }),

  http.post('*/users/:id/deactivate', ({ request, params }) => {
    const auth = authorize(request, 'utilisateurs', 'update');
    if ('response' in auth) return auth.response;
    const u = db.setActive(String(params.id), false, auth.user.id);
    return isFailure(u) ? fail(u) : HttpResponse.json(userDto(u));
  }),

  http.delete('*/users/:id', ({ request, params }) => {
    const auth = authorize(request, 'utilisateurs', 'delete');
    if ('response' in auth) return auth.response;
    const r = db.deleteUser(String(params.id), auth.user.id);
    return r ? fail(r) : new HttpResponse(null, { status: 204 });
  }),

  http.put('*/users/:id/exceptions', async ({ request, params }) => {
    const auth = authorize(request, 'habilitations', 'update');
    if ('response' in auth) return auth.response;
    const { exceptions } = (await request.json()) as { exceptions: Overrides };
    const u = db.setOverrides(String(params.id), exceptions);
    return isFailure(u) ? fail(u) : HttpResponse.json({ ...userDto(u), exceptions: u.overrides });
  }),

  http.get('*/profiles', ({ request }) => {
    const auth = authorize(request, 'habilitations', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({
      items: db.profilesWithCounts().map((p) => ({ id: p.id, label: p.label, base_role: p.baseRole, system: p.system, users_count: p.usersCount, permissions: p.permissions })),
      modules: MODULES,
    });
  }),

  http.post('*/profiles/:id/duplicate', async ({ request, params }) => {
    const auth = authorize(request, 'habilitations', 'create');
    if ('response' in auth) return auth.response;
    const { label } = (await request.json()) as { label: string };
    const p = duplicateProfile(String(params.id), label);
    return isFailure(p) ? fail(p) : HttpResponse.json({ id: p.id, label: p.label, base_role: p.baseRole, system: p.system, users_count: 0, permissions: p.permissions }, { status: 201 });
  }),

  http.put('*/profiles/:id/permissions', async ({ request, params }) => {
    const auth = authorize(request, 'habilitations', 'update');
    if ('response' in auth) return auth.response;
    const { permissions } = (await request.json()) as { permissions: PermissionMap };
    const p = setProfilePermissions(String(params.id), permissions);
    return isFailure(p) ? fail(p) : HttpResponse.json({ id: p.id, label: p.label, system: p.system, permissions: p.permissions });
  }),
];

