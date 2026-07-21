# Module Generator

Génère une structure NestJS CRUD complète à partir des modèles Prisma.

## Usage

```bash
# Générer un seul module
npx ts-node scripts/generate-module.ts Edition

# Générer plusieurs modules
npx ts-node scripts/generate-module.ts Edition Awards "AwardTheme"

# Générer tous les modules (sauf user)
npx ts-node scripts/generate-module.ts --all

# Prévisualisation sans écriture
npx ts-node scripts/generate-module.ts --dry-run --all

# Forcer la réécriture d'un module existant
npx ts-node scripts/generate-module.ts --force Edition

# Aide
npx ts-node scripts/generate-module.ts --help
```

## Flags

| Flag | Description |
|------|-------------|
| `--all` | Génère les modules pour tous les modèles Prisma |
| `--dry-run` | Affiche les fichiers qui seraient créés sans rien écrire |
| `--force` | Écrase le répertoire si le module existe déjà |
| `--help`, `-h` | Affiche l'aide |

## Généré

Chaque module généré contient :

```
src/{kebab-name}/
├── dto/
│   ├── create-{kebab-name}.dto.ts    # DTO de création (validation class-validator)
│   ├── update-{kebab-name}.dto.ts    # DTO de mise à jour (extends PartialType)
│   └── {kebab-name}-response.dto.ts  # DTO de réponse (Swagger)
├── {kebab-name}.controller.ts        # Contrôleur REST (CRUD + criteria)
├── {kebab-name}.service.ts           # Service métier
└── {kebab-name}.module.ts            # Module NestJS
```

### Endpoints générés

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/{route}` | Non | Liste tous les enregistrements actifs |
| GET | `/{route}/criteria` | Non | Recherche avancée (filtres, tri, pagination) |
| GET | `/{route}/:id` | Non | Détail par ID |
| POST | `/{route}` | JWT + RBAC | Création |
| PATCH | `/{route}/:id` | JWT + RBAC | Mise à jour |
| DELETE | `/{route}/:id` | JWT + RBAC | Soft-delete |

## Workflow

1. Définir le modèle dans `prisma/schema.prisma`
2. Lancer `npx prisma generate`
3. Lancer `npx ts-node scripts/generate-module.ts MonModele`
4. Enregistrer le module dans `src/app.module.ts`
5. Adapter le code généré (règles métier, relations complexes, etc.)

## Caractéristiques

- **Soft-delete** : tous les services utilisent `is_deleted: false` par défaut
- **Validation** : DTOs avec `class-validator` et décorateurs Swagger
- **Recherche avancée** : endpoint `/criteria` avec le système `CriteriaParser`/`CriteriaBuilder`
- **RBAC intégré** : endpoints POST/PATCH/DELETE protégés par `JwtAuthGuard` + `RbacGuard`
- **Feature code** généré automatiquement : `GERER_{MODEL_NAME}` (ex: `GERER_EDITION`)
- **Relations** : auto-détectées et incluses dans les requêtes Prisma

## Modèles exclus

- `user` — géré par le module auth
- `Champs` exclus des DTOs : `id`, `created_at`, `updated_at`, `deleted_at`, `is_deleted`, `created_by`, `updated_by`, `deleted_by`

## Templates

Les templates Handlebars sont dans `scripts/templates/`. Le script les lit et remplace les variables par remplacement de chaîne simple (pas de dépendance externe).

### Variables disponibles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{modelName}}` | Nom PascalCase | `StatutEdition` |
| `{{kebabName}}` | Nom kebab-case | `statut-edition` |
| `{{camelName}}` | Nom camelCase | `statutEdition` |
| `{{routeName}}` | Préfixe de route | `statut-edition` |
| `{{label}}` | Libellé français | `Statut Edition` |
| `{{labelPlural}}` | Libellé au pluriel | `Statut Editions` |
| `{{featureCode}}` | Code de feature RBAC | `GERER_STATUT_EDITION` |

### Boucles

- `{{#each scalars}}...{{/each}}` — itère sur les champs scalaires
  - `{{name}}`, `{{type}}`, `{{tsType}}`, `{{example}}`, `{{maxLength}}`
  - `{{#if isRequired}}`, `{{#if isOptional}}`, `{{#if isString}}`, `{{#if isInt}}`, `{{#if isBoolean}}`
- `{{#each relations}}...{{/each}}` — itère sur les relations
  - `{{name}}`, `{{modelName}}`

### Conditions

- `{{#if hasRelations}}` / `{{#if hasString}}` / `{{#if hasInt}}` / `{{#if hasBoolean}}` / `{{#if hasDate}}`

---

## Seed Officiel Account

Définit le mot de passe du compte AFF Officiel (user id=1) et lui assigne le profil SUPER_ADMIN.

```bash
# Définir le mot de passe via variable d'environnement
# ⚠️ À exécuter DANS le conteneur API (Prisma est compilé pour Alpine)
docker compose exec api sh -c "OFFICIAL_ACCOUNT_PASSWORD=aff2026 npx ts-node scripts/seed-official-user.ts"
```

Le mot de passe **n'apparaît jamais dans le code source**. Il est transmis via variable d'environnement au moment du déploiement.

### Workflow premier déploiement

```bash
docker compose up -d postgres api          # Démarre PostgreSQL + API
docker compose exec api sh -c \
  "OFFICIAL_ACCOUNT_PASSWORD=aff2026 npx ts-node scripts/seed-official-user.ts"
```
