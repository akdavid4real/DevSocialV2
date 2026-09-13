import { PrismaClient } from '@prisma/client';
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

async function fixAuthIds() {
    const emails = [
        'akdavid@example.com',
        'john.doe@example.com',
        'jane.smith@example.com',
        'dev_guru@example.com',
        'alice.active@example.com'
    ];

    console.log('🔧 Fixing Auth IDs...\n');

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    for (const email of emails) {
        const authUser = users.find(u => u.email === email);
        
        if (!authUser) {
            console.log(`❌ ${email} - Not found in Supabase Auth`);
            continue;
        }

        try {
            await prisma.user.update({
                where: { email },
                data: { supabaseAuthId: authUser.id }
            });
            console.log(`✅ ${email} - Updated to ${authUser.id}`);
        } catch (err) {
            console.error(`❌ ${email} - Error:`, err.message);
        }
    }

    console.log('\n✨ Auth IDs fixed!');
}

fixAuthIds()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
