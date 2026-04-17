const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@upstack.io' },
    update: {},
    create: {
      email: 'demo@upstack.io',
      passwordHash,
      name: 'Demo User',
      plan: 'FREE',
      workspaces: {
        create: {
          name: "Demo Workspace",
          slug: 'demo-workspace',
          monitors: {
            create: [
              {
                name: 'GitHub API',
                url: 'https://api.github.com',
                method: 'GET',
                intervalMins: 5,
                expectedStatus: 200,
                nextCheck: new Date(),
              },
              {
                name: 'Httpbin GET',
                url: 'https://httpbin.org/get',
                method: 'GET',
                intervalMins: 10,
                expectedStatus: 200,
                nextCheck: new Date(),
              },
            ],
          },
        },
      },
    },
  });

  console.log(`[seed] Created demo user: ${user.email} (password: password123)`);
  console.log('[seed] Done!');
}

main()
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
