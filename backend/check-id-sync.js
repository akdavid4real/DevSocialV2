const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, '.env') });

const prisma = new PrismaClient();

async function findUser() {
    const email = 'akdavid4real@gmail.com';
    const supabaseId = '86242cd7-b48e-4b0c-b68f-0a2adb24f81f';

    console.log(`📡 Checking Prisma records for ${email}...`);

    try {
        const userByEmail = await prisma.user.findUnique({
            where: { email },
        });

        if (userByEmail) {
            console.log(`✅ User found by email in Prisma!`);
            console.log(`🆔 SupabaseAuthId in DB: ${userByEmail.supabaseAuthId}`);
            console.log(`🆔 Expected Supabase ID: ${supabaseId}`);

            if (userByEmail.supabaseAuthId === supabaseId) {
                console.log(`✨ Match! The ID synchronization is correct.`);
            } else {
                console.warn(`⚠️ Mismatch! The SupabaseAuthId in DB (${userByEmail.supabaseAuthId}) does not match the actual ID (${supabaseId}).`);
                console.log(`🛠️ Attempting to fix ID synchronization now...`);

                await prisma.user.update({
                    where: { email },
                    data: { supabaseAuthId: supabaseId }
                });

                console.log(`✅ ID synchronization fixed.`);
            }
        } else {
            console.error(`❌ No user found with email ${email} in Prisma.`);
        }
    } catch (err) {
        console.error(`❌ Prisma Query Error: ${err.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

findUser();
