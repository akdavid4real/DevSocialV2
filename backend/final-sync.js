const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function main() {
    const email = 'akdavid4real@gmail.com';
    const expectedSupabaseId = '86242cd7-b48e-4b0c-b68f-0a2adb24f81f'; // From earlier supabase list

    console.log(`📡 Script started. Synchronizing database for: ${email}`);

    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error(`❌ ERROR: User record not found in local Prisma database.`);
            return;
        }

        console.log(`✅ Prisma record found. Linked ID: ${user.supabaseAuthId}`);

        if (user.supabaseAuthId !== expectedSupabaseId) {
            console.log(`🛠️ DESYNC DETECTED! Updating record...`);
            await prisma.user.update({
                where: { id: user.id },
                data: { supabaseAuthId: expectedSupabaseId },
            });
            console.log(`✅ SUCCESS: Synchronization restored.`);
        } else {
            console.log(`✨ ALIGNED: Records are already in sync. No action needed.`);
        }
    } catch (err) {
        console.error(`❌ CRITICAL ERROR:`, err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
