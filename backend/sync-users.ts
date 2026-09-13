import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function syncUsers() {
    const testUsers = [
        {
            email: 'akdavid@example.com',
            username: 'akdavid',
            displayName: 'AK David',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
            role: UserRole.ADMIN,
            points: 500,
            level: 5,
        },
        {
            email: 'john.doe@example.com',
            username: 'johndoe',
            displayName: 'John Doe',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
            role: UserRole.USER,
            points: 150,
            level: 2,
        },
        {
            email: 'jane.smith@example.com',
            username: 'janesmith',
            displayName: 'Jane Smith',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
            role: UserRole.USER,
            points: 300,
            level: 3,
        },
        {
            email: 'dev_guru@example.com',
            username: 'devguru',
            displayName: 'Dev Guru',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guru',
            role: UserRole.MODERATOR,
            points: 1200,
            level: 10,
        },
        {
            email: 'alice.active@example.com',
            username: 'alice',
            displayName: 'Alice In Tech',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
            role: UserRole.USER,
            points: 50,
            level: 1,
        }
    ];

    console.log('🔄 Syncing users to database...\n');

    for (const userData of testUsers) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        const authUser = users?.find((u: any) => u.email === userData.email);

        if (!authUser) {
            console.log(`❌ ${userData.email} - Not found in Supabase Auth`);
            continue;
        }

        try {
            const user = await prisma.user.upsert({
                where: { email: userData.email },
                update: {},
                create: {
                    supabaseAuthId: authUser.id,
                    email: userData.email,
                    username: userData.username,
                    displayName: userData.displayName,
                    avatar: userData.avatar,
                    role: userData.role,
                    points: userData.points,
                    level: userData.level,
                    onboardingCompleted: true,
                    isVerified: true,
                    lastActive: new Date(),
                },
            });

            await prisma.userStats.upsert({
                where: { userId: user.id },
                update: {},
                create: { userId: user.id },
            });

            console.log(`✅ ${userData.email} - Synced to database`);
        } catch (dbError) {
            console.error(`❌ ${userData.email} - Database error:`, dbError.message);
        }
    }

    console.log('\n✨ Sync complete!');
}

syncUsers()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
