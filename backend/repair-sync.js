const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function checkAndFixSync() {
    const email = 'akdavid4real@gmail.com';
    const supabaseId = '86242cd7-b48e-4b0c-b68f-0a2adb24f81f'; // The ID from our successful override

    console.log(`📡 Script started. Checking database for: ${email}`);

    // Initialize Prisma without explicit options to let it pick up env automatically
    const prisma = new PrismaClient();

    try {
        // 1. Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log(`❌ No user found with email ${email} in Prisma DB.`);

            // Check if user exists but has a different email?
            const userById = await prisma.user.findUnique({
                where: { supabaseAuthId: supabaseId }
            });

            if (userById) {
                console.log(`✅ Found user record by Supabase ID! Email in DB is: ${userById.email}`);
                console.log(`🛠️ Updating email to match...`);
                await prisma.user.update({
                    where: { id: userById.id },
                    data: { email: email }
                });
                console.log(`✅ Email sync fixed.`);
            } else {
                console.log(`ℹ️ Checking for any user with this ID...`);
                const anyUser = await prisma.user.findFirst();
                if (anyUser) {
                    console.log(`📝 Sample user in DB: ${anyUser.email} (${anyUser.supabaseAuthId})`);
                }
            }
            return;
        }

        console.log(`✅ Found user record in Prisma: ${user.email}`);
        console.log(`   Internal ID: ${user.id}`);
        console.log(`   Linked Supabase ID: ${user.supabaseAuthId}`);

        if (user.supabaseAuthId !== supabaseId) {
            console.log(`🛠️ DESYNC DETECTED! Updating supabaseAuthId from ${user.supabaseAuthId} to ${supabaseId}`);
            await prisma.user.update({
                where: { id: user.id },
                data: { supabaseAuthId: supabaseId }
            });
            console.log(`✅ Synchronization restored. Login should now work.`);
        } else {
            console.log(`✨ Aligned! IDs are already in sync. If login is failing, check if the email is confirmed.`);
        }

    } catch (err) {
        console.error(`❌ Prisma Error:`, err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAndFixSync();
