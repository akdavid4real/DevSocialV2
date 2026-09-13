const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Use anon key for client-side simulation

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin(email, password) {
    console.log(`📡 Testing client-side login for: ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('❌ Login Failed:', error.message);
    } else {
        console.log('✅ Login Successful!');
        console.log('👤 User ID:', data.user.id);
        console.log('🎫 Session Token starts with:', data.session.access_token.substring(0, 10) + '...');
    }
}

testLogin('akdavid4real@gmail.com', 'Shadowfight@2');
