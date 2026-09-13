require('dotenv').config();
const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  console.log('Dropping Like_targetId_fkey constraint...');
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_targetId_fkey";
  `);
  
  console.log('✅ Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
