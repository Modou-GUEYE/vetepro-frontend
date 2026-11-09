# VétéPro, interface web

Interface d'une plateforme SaaS de gestion vétérinaire pour les cabinets, cliniques et associations d'un réseau : dossiers patients, rendez-vous, consultations, pharmacie, facturation, reporting, forum et CVthèque du réseau, back-office de la plateforme (offres, abonnements, contenus du site).

Cette version fonctionne **sans serveur** : des données simulées répondent à la place de l'API (voir « Mode démonstration »).

## Technologies

React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand, React Hook Form et Zod, Axios. Tests avec Vitest, API simulée avec MSW.

## Architecture

Un dossier par module dans `src/modules/` (patients, rendez-vous, consultations, pharmacie, facturation, association, portail...), organisé en trois couches :

| Couche | Rôle |
| --- | --- |
| `models/` | Types, schémas Zod et règles métier, testés sans interface |
| `services/` | Appels à l'API, validés par les schémas |
| `viewmodels/` et `views/` | État de l'écran (hooks) et composants qui l'affichent |

Autour : `src/core` (client HTTP, session, droits), `src/shared/ui` (composants), `src/mocks` (API simulée).

Quand une section est branchée sur le vrai backend, le front reprend **les noms de champs et les formats d'erreur du backend**, sans couche de traduction ni valeur de repli : voir `src/modules/association/models/offres.ts`.

## Lancer le projet

```bash
npm install
cp .env.example .env
npm run dev
```

Application : http://localhost:5173

### Mode démonstration

Avec `VITE_USE_MOCKS=true` (valeur par défaut du `.env.example`), tout est simulé. Comptes de démonstration :

| Profil | Identifiant | Mot de passe |
| --- | --- | --- |
| Super-admin de l'association | `asso` | `Asso#2026` |
| Administrateur du cabinet | `admin` | `Admin#2026` |
| Vétérinaire | `veto` | `Veto#2026` |
| Assistant | `assistant` | `Assist#2026` |

Ces comptes et toutes les données (patients, propriétaires, cabinets) sont fictifs.

### Brancher une section sur un backend

`VITE_GATEWAY_BASE_URL` donne l'adresse de l'API, sans `/api/v1`. `VITE_REAL_MODULES` liste les sections qui quittent les mocks (par exemple `offres`), le reste restant simulé. Voir `src/mocks/realModules.ts`.

## Vérifications

```bash
npm run lint
npm test
npm run build
```

## Docker

```bash
docker build --build-arg VITE_GATEWAY_BASE_URL=http://localhost:9080 --build-arg VITE_USE_MOCKS=true -t vetepro-front .
docker run -p 8080:8080 vetepro-front
```
