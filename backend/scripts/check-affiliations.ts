import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Searching for affiliations...\n');

  // Search for ikeja
  const ikejaResults = await prisma.affiliation.findMany({
    where: {
      name: {
        contains: 'ikeja',
        mode: 'insensitive',
      },
    },
  });

  console.log('Results for "ikeja":');
  ikejaResults.forEach(aff => {
    console.log(`  - ${aff.name} (${aff.category} > ${aff.subType})`);
  });

  // Count by category
  console.log('\n📊 Affiliation counts by category:');
  const categories = await prisma.affiliation.groupBy({
    by: ['category', 'subType'],
    _count: true,
  });

  categories.forEach(cat => {
    console.log(`  ${cat.category} > ${cat.subType}: ${cat._count} items`);
  });

  console.log(`\n📈 Total affiliations: ${await prisma.affiliation.count()}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
