import { PrismaClient } from './src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

async function check() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    try {
        const userCount = await prisma.user.count({
            where: { email: { contains: 'example.com' } }
        });
        console.log('Test User Count:', userCount);
        const users = await prisma.user.findMany({
            where: { email: { contains: 'example.com' } },
            select: { username: true }
        });
        console.log('Seeded Users:', users.map(u => u.username));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

check();
