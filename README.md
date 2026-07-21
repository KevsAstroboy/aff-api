# AFF API — Africa Future Festival Backend

## Stack

NestJS 10 · Prisma 5 (PostgreSQL 16) · MongoDB 7 (Mongoose) · Redis 7 · MinIO · Socket.IO · Swagger

## Quick Start

### Prérequis

- Docker & Docker Compose
- Node.js 22+

### Premier lancement

```bash
cp .env.example .env
docker compose up -d
```

L'API démarre sur http://localhost:3000.

### Générer le schéma Prisma

```bash
docker compose --profile setup run prisma-sync
```

### Configurer le compte officiel

```bash
docker compose exec api sh -c "OFFICIAL_ACCOUNT_PASSWORD=aff2026 npx ts-node scripts/seed-official-user.ts"
```

Définit le mot de passe du compte AFF Officiel (`aff_officiel`) et lui assigne le profil SUPER_ADMIN.

### Services

| Service      | Port                | Credentials            |
| ------------ | ------------------- | ---------------------- |
| PostgreSQL 16 | 5432                | postgres / postgres    |
| MongoDB 7    | 27017               | mongo / mongo          |
| Redis 7      | 6379                | —                      |
| MinIO        | 9000 (API) / 9001 (Console) | minioadmin / minioadmin |
| NestJS API   | 3000                | —                      |

### Swagger

http://localhost:3000/api/docs

## Architecture

Monolithe modulaire NestJS :

```
src/
├── auth/            # Inscription, connexion, JWT, RBAC
├── feed/            # Publications, réactions, commentaires, hashtags
├── communaute/      # CRUD communautés, abonnements
├── moderation/      # Signalements polymorphes
├── edition/         # CRUD éditions annuelles
├── awards/          # Thèmes, catégories, candidatures, votes
├── programme/       # Événements, masterclass, inscriptions, favoris
├── messagerie/      # Conversations (PG) + Messages (MongoDB) + Socket.IO
├── admin-dashboard/ # Endpoints agrégés administration
├── storage/         # Upload MinIO (S3)
├── prisma/          # PrismaService (PostgreSQL)
├── redis/           # Client Redis (cache, présence, Pub/Sub)
└── common/          # Filtres d'exception globaux
```

## Permissions RBAC

L'arbre de permissions est calculé via CTE récursive PostgreSQL, mis en cache Redis (`session:{userId}`), et invalidé automatiquement quand `feature_profil` change.

### Features principales

| Code               | Description               |
| ------------------ | ------------------------- |
| ACCEDER_ADMIN      | Dashboard admin           |
| GERER_COMMUNAUTE   | CRUD communautés          |
| GERER_EDITION      | CRUD éditions             |
| GERER_SIGNALEMENTS | Résoudre signalements     |
| GERER_AWARDS       | Gérer awards et catégories |
| GERER_PROGRAMME    | Gérer programme et masterclass |
| CREER_PUBLICATION  | Publier dans le feed      |
| REAGIR             | Réagir aux publications   |
| COMMENTER          | Commenter                 |
| ENVOYER_MESSAGE    | Messagerie                |

## Module Generator

Script de génération automatique de modules CRUD à partir du schéma Prisma.

```bash
# Générer un module spécifique
npx ts-node scripts/generate-module.ts NomModele

# Générer tous les modèles sans module existant
npx ts-node scripts/generate-module.ts --all

# Dry-run (affiche sans écrire)
npx ts-node scripts/generate-module.ts --all --dry-run
```

Plus de détails : [scripts/README.md](scripts/README.md)

## Criteria DSL

Recherche avancée avec filtres, tri et pagination via query string. Disponible sur tous les modules via `GET /api/{ressource}/get-by-criteria`.

### Syntaxe

```
GET /api/{ressource}/get-by-criteria?champ.opérateur=valeur&sort=±champ&page=1&size=20&fields=col1,col2&include=rel1,rel2
```

### Opérateurs

| Opérateur | Alias | Description | Exemple |
|-----------|-------|-------------|---------|
| `eq` | = | Égal | `statut.eq=actif` |
| `neq` | != | Différent | `role.neq=banni` |
| `gt` | > | Supérieur | `age.gt=18` |
| `gte` | >= | Supérieur ou égal | `score.gte=50` |
| `lt` | < | Inférieur | `prix.lt=100` |
| `lte` | <= | Inférieur ou égal | `date.lte=2026-12-31` |
| `in` | IN | Dans la liste | `statut.in=actif,en_attente` |
| `nin` | NOT IN | Hors liste | `role.nin=banni,supprime` |
| `like` | ILIKE | Contient (insensible casse) | `nom.like=John` |
| `bt` | BETWEEN [ ] | Entre (inclusif) | `age.bt=18,65` |
| `btio` | BETWEEN [ [ | Entre (droite exclue) | `date.btio=2026-01-01,2026-07-01` |
| `btoi` | BETWEEN ] ] | Entre (gauche exclue) | `prix.btoi=0,100` |
| `btoo` | BETWEEN ] [ | Entre (exclusif) | `score.btoo=0,100` |
| `null` | IS NULL | Est nul | `deleted_at.null=true` |
| `nnull` | IS NOT NULL | Non nul | `email.nnull=true` |

### Paramètres spéciaux

| Paramètre | Exemple | Description |
|-----------|---------|-------------|
| `sort` | `-created_at` | Tri. `+` ou rien = ascendant, `-` = descendant. Multi-colonnes : `sort=+nom,-date` |
| `page` | `page=2` | Page (1-indexé, défaut: 1) |
| `size` | `size=50` | Items par page (défaut: 20, max: 1000) |
| `fields` | `fields=id,nom,email` | Projection : retourne uniquement ces colonnes |
| `include` | `include=user,communaute` | Relations à charger (validé contre le schéma) |

### Exemples

```bash
# Communautés actives contenant "art", triées par membres
GET /api/communaute/get-by-criteria?libelle.like=art&is_active.eq=true&sort=-membres_count

# Candidatures soumises en 2026, page 1, 20 résultats
GET /api/awards/candidatures/get-by-criteria?statut_id.eq=1&submitted_at.btio=2026-01-01,2027-01-01&page=1&size=20

# Événements d'une édition, avec lieu et type, triés par jour
GET /api/programme/get-by-criteria?edition_id.eq=1&include=lieu,type_evenement&sort=+jour&fields=id,titre,jour,heure_debut

# Signalements ouverts, sévérité élevée
GET /api/moderation/get-by-criteria?statut_id.eq=1&severite_id.eq=3&sort=-created_at

# Utilisateurs avec email renseigné, paginés
GET /api/admin/users/get-by-criteria?email.nnull=true&sort=+username&page=1&size=30
```

### Réponse

```json
{
  "items": [ ... ],
  "total": 42,
  "page": 1,
  "size": 20,
  "pages": 3
}
```

### Sécurité

- Les noms de colonnes sont validés contre le schéma Prisma (DMMF). Toute colonne invalide est silencieusement ignorée.
- Les noms de relations sont validés de la même manière.
- Toutes les valeurs sont passées en requêtes paramétrées (Prisma) — pas d'injection SQL.
- Les opérateurs inconnus sont ignorés silencieusement.

## API Endpoints

### Auth

| Méthode | Endpoint           | Auth  |
| ------- | ------------------ | ----- |
| POST    | /api/auth/register | —     |
| POST    | /api/auth/login    | —     |

### Health

| Méthode | Endpoint      | Auth |
| ------- | ------------- | ---- |
| GET     | /api/health   | —    |

### Communauté

| Méthode | Endpoint                          | Auth        |
| ------- | --------------------------------- | ----------- |
| GET     | /api/communaute                   | —           |
| GET     | /api/communaute/:id               | —           |
| POST    | /api/communaute                   | admin       |
| PATCH   | /api/communaute/:id               | admin       |
| DELETE  | /api/communaute/:id               | admin       |
| POST    | /api/communaute/:id/subscribe     | auth        |
| DELETE  | /api/communaute/:id/subscribe     | auth        |

### Feed

| Méthode | Endpoint                                | Auth          |
| ------- | --------------------------------------- | ------------- |
| GET     | /api/feed                               | —             |
| GET     | /api/feed/:id                           | —             |
| POST    | /api/feed/publications                  | auth          |
| PATCH   | /api/feed/publications/:id              | owner         |
| DELETE  | /api/feed/publications/:id              | owner/admin   |
| POST    | /api/feed/publications/:id/reactions    | auth          |
| GET     | /api/feed/publications/:id/reactions    | —             |
| POST    | /api/feed/publications/:id/commentaires | auth          |
| GET     | /api/feed/publications/:id/commentaires | —             |
| DELETE  | /api/feed/commentaires/:id              | owner/admin   |
| GET     | /api/feed/hashtags                      | —             |

Query params pour `GET /api/feed` : `communaute_id`, `hashtag_id` (pagination).

### Modération

| Méthode | Endpoint                       | Auth  |
| ------- | ------------------------------ | ----- |
| POST    | /api/moderation                | auth  |
| GET     | /api/moderation                | admin |
| GET     | /api/moderation/:id            | admin |
| PATCH   | /api/moderation/:id/resolve    | admin |

### Édition

| Méthode | Endpoint               | Auth  |
| ------- | ---------------------- | ----- |
| GET     | /api/editions          | —     |
| GET     | /api/editions/current  | —     |
| GET     | /api/editions/:id      | —     |
| POST    | /api/editions          | admin |
| PATCH   | /api/editions/:id      | admin |
| DELETE  | /api/editions/:id      | admin |

### Awards

| Méthode | Endpoint                                | Auth  |
| ------- | --------------------------------------- | ----- |
| GET     | /api/awards/categories                  | —     |
| POST    | /api/awards/categories                  | admin |
| PATCH   | /api/awards/categories/:id              | admin |
| POST    | /api/awards/candidatures                | auth  |
| GET     | /api/awards/candidatures                | —     |
| GET     | /api/awards/candidatures/:id            | —     |
| PATCH   | /api/awards/candidatures/:id/statut     | admin |
| POST    | /api/awards/votes/jury                  | auth  |
| POST    | /api/awards/votes/public                | auth  |
| GET     | /api/awards/votes/results/:categorieId  | —     |

### Programme

| Méthode | Endpoint                                  | Auth  |
| ------- | ----------------------------------------- | ----- |
| GET     | /api/programme                            | —     |
| GET     | /api/programme/:id                        | —     |
| POST    | /api/programme                            | admin |
| PATCH   | /api/programme/:id                        | admin |
| DELETE  | /api/programme/:id                        | admin |
| POST    | /api/programme/masterclass                | admin |
| PATCH   | /api/programme/masterclass/:id            | admin |
| POST    | /api/programme/masterclass/:id/inscription| auth  |
| POST    | /api/programme/:id/favori                 | auth  |
| GET     | /api/programme/favoris                    | auth  |

### Messagerie

| Méthode | Endpoint                                              | Auth  |
| ------- | ----------------------------------------------------- | ----- |
| GET     | /api/messagerie/conversations                         | auth  |
| POST    | /api/messagerie/conversations                         | auth  |
| GET     | /api/messagerie/conversations/:id                     | auth  |
| POST    | /api/messagerie/conversations/:id/participants        | admin |
| DELETE  | /api/messagerie/conversations/:id/participants/:userId| admin |
| GET     | /api/messagerie/conversations/:id/messages            | auth  |

### Admin

| Méthode | Endpoint                      | Auth  |
| ------- | ----------------------------- | ----- |
| GET     | /api/admin/stats              | admin |
| GET     | /api/admin/signalements/recent| admin |
| GET     | /api/admin/users/stats        | admin |
| GET     | /api/admin/content/stats      | admin |

## Variables d'environnement

```
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=aff_db
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/aff_db

# MongoDB
MONGO_INITDB_ROOT_USERNAME=mongo
MONGO_INITDB_ROOT_PASSWORD=mongo
MONGO_INITDB_DATABASE=aff_messages
MONGO_URI=mongodb://mongo:mongo@mongodb:27017/aff_messages?authSource=admin

# Redis
REDIS_URL=redis://redis:6379

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=aff-uploads
MINIO_USE_SSL=false

# JWT
JWT_SECRET=change-me-in-production-use-64-char-random-string
JWT_EXPIRATION=7d

# Application
PORT=3000
NODE_ENV=development
```
