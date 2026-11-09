import { beforeEach, describe, expect, it } from 'vitest';
import { resetUsers } from './authDb';
import * as db from './forumDb';
import { NOTIFS, resetNotifications } from './notifDb';

beforeEach(() => { db.resetForum(); resetUsers(); resetNotifications(); });

const post = (over: Partial<db.PostInput> = {}) => ({ titre: 'Sujet', categorie: 'Général', contenu: 'Bonjour', pieces: [], ...over });

describe('publication', () => {
  it('exige un titre et une description', () => {
    expect(db.createPost(post({ titre: ' ' }), '2')).toMatchObject({ message: 'Titre requis' });
    expect(db.createPost(post({ contenu: '' }), '2')).toMatchObject({ message: 'Description requise' });
  });
  it('refuse une catégorie inconnue, un fichier de plus de 10 Mo et plus de 5 fichiers', () => {
    expect(db.createPost(post({ categorie: 'Autre' }), '2')).toMatchObject({ message: 'Catégorie inconnue' });
    expect(db.createPost(post({ pieces: [{ nom: 'gros.pdf', taille: db.FICHIER_MAX_OCTETS + 1, type: 'pdf' }] }), '2')).toMatchObject({ message: 'gros.pdf dépasse 10 Mo' });
    const six = Array.from({ length: 6 }, (_, i) => ({ nom: `f${i}.pdf`, taille: 10, type: 'pdf' as const }));
    expect(db.createPost(post({ pieces: six }), '2')).toMatchObject({ message: '5 fichiers au plus par publication' });
  });
  it("enregistre le post avec l'identité de son auteur : nom, prénom et profil", () => {
    const p = db.createPost(post(), '2') as db.DemoPost;
    expect(db.personOf(p.auteurId)).toMatchObject({ nom: 'Fatou Diallo', profil: 'Vétérinaire' });
    expect(db.listPosts('1')[0].id).toBe(p.id);
  });
  it("notifie les personnes mentionnées qui ont un compte, jamais l'auteur", () => {
    const p = db.createPost(post({ contenu: 'Avis de @Ibrahima Ba et de @Fatou Diallo et de @Ousmane Diallo ?' }), '2') as db.DemoPost;
    expect(p.mentions.sort()).toEqual(['6', 'r1']);
    const mentions = NOTIFS.filter((n) => n.type === 'mention');
    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toMatchObject({ userId: '6', lien: `/forum?post=${p.id}` });
  });
  it("ne propose à la mention que des utilisateurs de la plateforme qui ont accès au forum", () => {
    expect(db.mentionables('2').map((p) => p.nom)).not.toContain('Fatou Diallo');
    expect(db.mentionables().map((p) => p.nom)).not.toContain('Mame Gaye');
    expect(db.mentionables().map((p) => p.nom)).not.toContain('Awa Ndiaye');
    expect(db.extractMentions('Salut @Personne Inconnue')).toEqual([]);
  });
});

describe('posts non lus', () => {
  it("compte les posts des autres non encore ouverts, pas les siens", () => {
    expect(db.unreadCount('2')).toBe(4);
    db.createPost(post(), '2');
    expect(db.unreadCount('2')).toBe(4);
    expect(db.unreadCount('1')).toBe(db.POSTS.filter((p) => p.auteurId !== '1' && !p.luPar.includes('1')).length);
  });
  it('un post ouvert, puis tout marquer comme lu, font baisser le compteur', () => {
    db.markRead('2', '2');
    expect(db.unreadCount('2')).toBe(3);
    db.markAllRead('2');
    expect(db.unreadCount('2')).toBe(0);
  });
  it('filtre les mentions, les publications de la personne et les non lues', () => {
    expect(db.listPosts('2', { filtre: 'mentions' }).map((p) => p.id)).toEqual(['2']);
    expect(db.listPosts('1', { filtre: 'miennes' }).map((p) => p.id)).toEqual(['3']);
    expect(db.listPosts('2', { filtre: 'non_lues' }).every((p) => p.auteurId !== '2')).toBe(true);
  });
  it('recherche dans le titre, le texte et le nom de l\'auteur, par catégorie, et trie par popularité', () => {
    expect(db.listPosts('1', { q: 'échographe' }).map((p) => p.id)).toEqual(['5']);
    expect(db.listPosts('1', { q: 'ousmane' }).map((p) => p.id)).toEqual(['2']);
    expect(db.listPosts('1', { categorie: 'Matériel' }).map((p) => p.id)).toEqual(['5']);
    expect(db.listPosts('1', { tri: 'populaires' })[0].id).toBe('3');
  });
});

describe('réactions', () => {
  it("j'aime et je n'aime pas s'excluent, un second clic retire la réaction", () => {
    db.react('1', '2', 'like');
    expect(db.getPost('1')).toMatchObject({ likes: expect.arrayContaining(['2']) });
    db.react('1', '2', 'dislike');
    expect(db.getPost('1')).toMatchObject({ dislikes: ['2'], likes: expect.not.arrayContaining(['2']) });
    db.react('1', '2', 'dislike');
    expect((db.getPost('1') as db.DemoPost).dislikes).toEqual([]);
    expect(db.react('1', '2', 'bravo')).toMatchObject({ message: 'Réaction inconnue' });
  });
  it('un commentaire vide est refusé, un commentaire avec mention notifie la personne', () => {
    expect(db.addComment('1', '  ', '2')).toMatchObject({ message: 'Commentaire vide' });
    db.addComment('1', 'Merci @Ibrahima Ba', '2');
    expect((db.getPost('1') as db.DemoPost).commentaires).toHaveLength(2);
    expect(NOTIFS.filter((n) => n.type === 'mention' && n.userId === '6')).toHaveLength(1);
  });
  it("repartage une fois par personne, toujours depuis la publication d'origine", () => {
    const r = db.repost('4', 'Utile', '2') as db.DemoPost;
    expect(r.repostDe).toBe('3');
    expect((db.getPost('3') as db.DemoPost).reposts.map((x) => x.userId)).toContain('2');
    expect(db.repost('3', '', '2')).toMatchObject({ status: 409 });
  });
  it('un post inconnu ou supprimé est introuvable', () => {
    expect(db.react('999', '2', 'like')).toMatchObject({ status: 404 });
    db.deletePost('5', '1', true);
    expect(db.getPost('5')).toMatchObject({ status: 404 });
  });
});

describe('suppression', () => {
  it("réservée à l'auteur ou à celui qui a le droit de suppression", () => {
    expect(db.deletePost('3', '2', false)).toMatchObject({ status: 403 });
    expect(db.deletePost('3', '1', false)).toBe(true);
  });
  it('retire aussi les repartages du post supprimé', () => {
    db.deletePost('3', '1', false);
    expect(db.listPosts('1').map((p) => p.id)).not.toContain('4');
  });
});
