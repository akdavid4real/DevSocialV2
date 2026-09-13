const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, '.env') });

async function syncRepair() {
    const email = 'akdavid4real@gmail.com';
    const supabaseId = '86242cd7-b48e-4b0c-b68f-0a2adb24f81f';
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        console.error('❌ DATABASE_URL missing from .env');
        return;
    }

    // Explicitly passing the connection string to bypass constructor validation
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: dbUrl
            }
        }
    });

    try {
        console.log(`📡 Repairing sync for ${email}...`);
        const user = await prisma.user.findFirst({ where: { email } });

        if (!user) {
            console.error(`❌ User not found in Prisma.`);
            return;
        }

        if (user.supabaseAuthId !== supabaseId) {
            console.log(`🛠️ ID mismatch found: ${user.supabaseAuthId} vs ${supabaseId}`);
            await prisma.user.update({
                where: { id: user.id },
                data: { supabaseAuthId: supabaseId }
            });
            console.log(`✅ Success! Prisma record updated with correct Supabase ID.`);
        } else {
            console.log(`✅ IDs are already correct. Your 401 might be cached or due to something else.`);
        }
    } catch (e) {
        console.error(`❌ Sync error:`, e.message);
    } finally {
        await prisma.$disconnect();
    }
}

syncRepair();
