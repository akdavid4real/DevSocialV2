const { PrismaClient } = require('@prisma/client');

async function checkPrismaRecord(email) {
    console.log(`📡 Checking Prisma record for: ${email}...`);

    // Use explicit connection string from env if possible, or just default
    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findFirst({
            where: { email },
        });

        if (!user) {
            console.error(`❌ Error: User with email ${email} not found in local Prisma database.`);

            const count = await prisma.user.count();
            console.log(`📊 Total users in DB: ${count}`);

            const recent = await prisma.user.findMany({ take: 3 });
            console.log('📝 Sample records:', recent.map(u => ({ email: u.email, supabaseId: u.supabaseAuthId })));
            return;
        }

        console.log(`✅ User found in Prisma!`);
        console.log(`👤 Prisma ID: ${user.id}`);
        console.log(`🆔 Supabase Auth ID: ${user.supabaseAuthId}`);
        console.log(`📛 Username: ${user.username}`);
    } catch (err) {
        console.error('❌ Database error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkPrismaRecord('akdavid4real@gmail.com');
