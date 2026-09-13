const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { resolve } = require('path');

// Load env from backend
dotenv.config({ path: resolve(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from backend/.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function overridePassword(email, newPassword) {
    console.log(`📡 Attempting to override password for: ${email}...`);

    // 1. Find user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('❌ Error listing users:', listError.message);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`❌ Error: User with email ${email} not found in Supabase Auth.`);
        return;
    }

    // 2. Update password directly
    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
    );

    if (error) {
        console.error('❌ Error updating password:', error.message);
    } else {
        console.log(`✅ Success! Password for ${email} has been overridden.`);
        console.log(`👤 User ID: ${user.id}`);
    }
}

const targetEmail = 'akdavid4real@gmail.com';
const targetPassword = 'Shadowfight@2';

overridePassword(targetEmail, targetPassword);
