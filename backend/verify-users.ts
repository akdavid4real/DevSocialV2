import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyAllSeededUsers() {
    const emails = [
        'akdavid@example.com',
        'john.doe@example.com',
        'jane.smith@example.com',
        'dev_guru@example.com',
        'alice.active@example.com'
    ];

    console.log('🔍 Verifying seeded users...\n');

    for (const email of emails) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            console.log(`❌ ${email} - Not found in Supabase Auth`);
            continue;
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
        );

        if (updateError) {
            console.log(`❌ ${email} - Failed to verify: ${updateError.message}`);
        } else {
            console.log(`✅ ${email} - Verified successfully`);
        }
    }

    console.log('\n✨ All users verified! You can now login with Password123!');
}

verifyAllSeededUsers()
    .catch(console.error)
    .finally(() => process.exit(0));
