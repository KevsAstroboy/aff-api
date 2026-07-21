/**
 * Seed le mot de passe du compte officiel AFF (user id=1).
 *
 * Usage (dans le conteneur Docker) :
 *   docker compose exec api sh -c "OFFICIAL_ACCOUNT_PASSWORD=aff2026 npx ts-node scripts/seed-official-user.ts"
 *
 * Usage (hôte, si DATABASE_URL pointe vers localhost) :
 *   OFFICIAL_ACCOUNT_PASSWORD=aff2026 npx ts-node scripts/seed-official-user.ts
 *
 * Le mot de passe n'est JAMAIS dans le code source — défini via variable d'environnement.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const password = process.env.OFFICIAL_ACCOUNT_PASSWORD;

  if (!password) {
    console.error(
      '❌  OFFICIAL_ACCOUNT_PASSWORD non définie.\n' +
        '   Usage : OFFICIAL_ACCOUNT_PASSWORD=votre-mdp npx ts-node scripts/seed-official-user.ts',
    );
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌  Le mot de passe doit faire au moins 6 caractères.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({ where: { id: 1 } });

    if (!user) {
      console.error('❌  Utilisateur id=1 (AFF Officiel) introuvable.');
      console.error('    Vérifiez que aff_db.sql a été exécuté (docker compose up -d postgres).');
      await prisma.$disconnect();
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: 1 },
      data: {
        password: hashedPassword,
        is_default_password: false,
        is_active: true,
        updated_at: new Date(),
      },
    });

    await prisma.user_profil.upsert({
      where: { user_id_profil_id: { user_id: 1, profil_id: 4 } },
      create: {
        user_id: 1,
        profil_id: 4,
        created_at: new Date(),
      },
      update: { is_deleted: false },
    });

    console.log('✅  Compte AFF Officiel configuré :');
    console.log(`   Username  : ${user.username}`);
    console.log(`   Email     : ${user.email}`);
    console.log(`   Profil    : SUPER_ADMIN`);
    console.log(`   Actif     : oui`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌  Erreur :', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
