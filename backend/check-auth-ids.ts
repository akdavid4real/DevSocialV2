import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAuthIds() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Supabase Auth Users:\n');
    users.forEach(u => {
        console.log(`Email: ${u.email}`);
        console.log(`Auth ID: ${u.id}`);
        console.log(`Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log('---');
    });
}

checkAuthIds().catch(console.error);
