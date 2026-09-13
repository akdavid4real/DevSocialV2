const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const { resolve } = require('path');

// Load environment variables strictly from the current directory
dotenv.config({ path: resolve(__dirname, '.env') });

async function syncUser() {
    const email = 'akdavid4real@gmail.com';
    const supabaseId = '86242cd7-b48e-4b0c-b68f-0a2adb24f81f';

    console.log(`📡 Investigating synchronization for ${email}...`);

    // Initialize client. Environment variables (DATABASE_URL) must be present.
    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error(`❌ User not found in Prisma DB. Trying lookup by Supabase ID...`);
            const userById = await prisma.user.findUnique({
                where: { supabaseAuthId: supabaseId }
            });
            if (userById) {
                console.log(`✅ Found user by ID instead! It seems the email was different in DB: ${userById.email}`);
            }
            return;
        }

        console.log(`✅ Found user record:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Stored Supabase ID: ${user.supabaseAuthId}`);
        console.log(`   Actual Auth ID: ${supabaseId}`);

        if (user.supabaseAuthId !== supabaseId) {
            console.log(`🛠️ ID DRIFT DETECTED. Correcting synchronization...`);
            await prisma.user.update({
                where: { id: user.id },
                data: { supabaseAuthId: supabaseId }
            });
            console.log(`✨ Synchronization complete. Login should now succeed.`);
        } else {
            console.log(`✅ IDs are already perfectly synchronized. No drift detected.`);
        }
    } catch (err) {
        console.error(`❌ Prisma Error: ${err.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

syncUser();
