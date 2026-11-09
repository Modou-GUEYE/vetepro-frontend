import { http } from '@/core/http/client';
import { downloadFile } from '@/core/http/download';
import { ForumFilters, Person, Post, PostForm, peopleDtoSchema, postSchema, postsDtoSchema, unreadDtoSchema } from '../models/forum';

export const forumService = {
  async list(f: ForumFilters) {
    return postsDtoSchema.parse((await http.get('/forum/posts', { params: { filtre: f.filtre, categorie: f.categorie, q: f.q, tri: f.tri } })).data);
  },
  async unread(): Promise<number> { return unreadDtoSchema.parse((await http.get('/forum/non-lus')).data).non_lus; },
  async people(): Promise<Person[]> { return peopleDtoSchema.parse((await http.get('/forum/personnes')).data).items; },
  async create(f: PostForm): Promise<Post> {
    const data = new FormData();
    data.append('titre', f.titre); data.append('categorie', f.categorie); data.append('contenu', f.contenu);
    f.fichiers.forEach((file) => data.append('fichiers', file));
    return postSchema.parse((await http.post('/forum/posts', data)).data);
  },
  async markRead(id: string): Promise<void> { await http.post(`/forum/posts/${id}/lu`); },
  async markAllRead(): Promise<void> { await http.post('/forum/lues'); },
  async react(id: string, type: 'like' | 'dislike'): Promise<Post> { return postSchema.parse((await http.post(`/forum/posts/${id}/reaction`, { type })).data); },
  async comment(id: string, texte: string): Promise<Post> { return postSchema.parse((await http.post(`/forum/posts/${id}/commentaires`, { texte })).data); },
  async repost(id: string, commentaire: string): Promise<Post> { return postSchema.parse((await http.post(`/forum/posts/${id}/repartages`, { commentaire })).data); },
  async remove(id: string): Promise<void> { await http.delete(`/forum/posts/${id}`); },
  download: (postId: string, index: number, nom: string) => downloadFile(`/forum/posts/${postId}/pieces/${index}`, nom),
};
