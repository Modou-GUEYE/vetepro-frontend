import { http } from '@/core/http/client';
import { Overrides, PermissionMap } from '@/core/auth/permissions';
import { PageParams, toQuery } from '@/core/http/pagination';
import {
  Profile, UserDetail, UserForm, UserPage, UserRow, createdUserDtoSchema, profileDtoOnly, profileListDtoSchema,
  toProfile, toUserRow, userDetailDtoSchema, userPageDtoSchema,
} from '../models/administration';

const body = (f: UserForm) => ({
  prenom: f.prenom, nom: f.nom, identifiant: f.identifiant, email: f.email,
  telephone: f.telephone, specialite: f.specialite, profil_id: f.profilId,
});

export const administrationService = {
  async listUsers(params: PageParams & { statut?: string; profil?: string }): Promise<UserPage> {
    const { data } = await http.get('/users', { params: { ...toQuery(params), ...(params.statut ? { statut: params.statut } : {}), ...(params.profil ? { profil: params.profil } : {}) } });
    const d = userPageDtoSchema.parse(data);
    return { items: d.items.map(toUserRow), total: d.total, page: d.page, pageSize: d.page_size };
  },

  async getUser(id: string): Promise<UserDetail> {
    const { data } = await http.get(`/users/${id}`);
    const d = userDetailDtoSchema.parse(data);
    return { ...toUserRow(d), exceptions: d.exceptions as Overrides };
  },

  async createUser(form: UserForm): Promise<{ user: UserRow; message: string }> {
    const { data } = await http.post('/users', body(form));
    const d = createdUserDtoSchema.parse(data);
    return { user: toUserRow(d), message: d.message };
  },

  async updateUser(id: string, form: UserForm): Promise<void> {
    await http.put(`/users/${id}`, body(form));
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await http.post(`/users/${id}/${active ? 'activate' : 'deactivate'}`);
  },

  async deleteUser(id: string): Promise<void> {
    await http.delete(`/users/${id}`);
  },

  async saveExceptions(id: string, exceptions: Overrides): Promise<void> {
    await http.put(`/users/${id}/exceptions`, { exceptions });
  },

  async listProfiles(): Promise<Profile[]> {
    const { data } = await http.get('/profiles');
    return profileListDtoSchema.parse(data).items.map(toProfile);
  },

  async duplicateProfile(id: string, label: string): Promise<Profile> {
    const { data } = await http.post(`/profiles/${id}/duplicate`, { label });
    return toProfile(profileDtoOnly.parse(data));
  },

  async savePermissions(id: string, permissions: PermissionMap): Promise<void> {
    await http.put(`/profiles/${id}/permissions`, { permissions });
  },
};
