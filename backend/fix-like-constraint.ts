import { PrismaService } from './src/common/prisma/prisma.service';

async function main() {
  const prisma = new PrismaService();
  
  console.log('Dropping Like_targetId_fkey constraint...');
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_targetId_fkey";
  `);
  
  console.log('✅ Migration completed successfully!');
  
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  });
