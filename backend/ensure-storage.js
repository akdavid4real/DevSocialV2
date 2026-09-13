const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const BUCKET_NAME = 'assets';
const BUCKET_CONFIG = {
    public: true,
    fileSizeLimit: 20971520, // 20MB
    allowedMimeTypes: [
        'image/png', 'image/jpeg', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm'
    ]
};

async function ensureBucket() {
    console.log(`Checking for bucket: ${BUCKET_NAME}...`);

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError.message);
        return;
    }

    const bucketExists = buckets.find(b => b.name === BUCKET_NAME);

    if (!bucketExists) {
        console.log(`Bucket ${BUCKET_NAME} not found. Creating...`);
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, BUCKET_CONFIG);

        if (error) {
            console.error('Error creating bucket:', error.message);
        } else {
            console.log(`Bucket ${BUCKET_NAME} created successfully.`);
        }
    } else {
        console.log(`Bucket ${BUCKET_NAME} already exists. Updating config...`);
        const { error } = await supabase.storage.updateBucket(BUCKET_NAME, BUCKET_CONFIG);
        if (error) {
            console.error('Error updating bucket:', error.message);
        } else {
            console.log(`Bucket ${BUCKET_NAME} updated successfully.`);
        }
    }
}

async function ensureRlsPolicy() {
    console.log('Ensuring RLS policies for storage...');

    // Allow public reads (SELECT) on the assets bucket
    const selectPolicy = `
        CREATE POLICY IF NOT EXISTS "Allow public read access on assets"
        ON storage.objects FOR SELECT
        USING (bucket_id = '${BUCKET_NAME}');
    `;

    // Allow authenticated inserts via service role (bypasses RLS by default,
    // but this covers edge cases with certain Supabase versions)
    const insertPolicy = `
        CREATE POLICY IF NOT EXISTS "Allow service role inserts on assets"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = '${BUCKET_NAME}');
    `;

    // Allow updates (for upserts)
    const updatePolicy = `
        CREATE POLICY IF NOT EXISTS "Allow service role updates on assets"
        ON storage.objects FOR UPDATE
        USING (bucket_id = '${BUCKET_NAME}');
    `;

    for (const [name, sql] of [['SELECT', selectPolicy], ['INSERT', insertPolicy], ['UPDATE', updatePolicy]]) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).maybeSingle();
        if (error) {
            // If the rpc doesn't exist, try raw SQL via the REST API
            console.warn(`Could not create ${name} policy via rpc: ${error.message}`);
            console.log(`→ Please run this SQL in your Supabase Dashboard > SQL Editor:`);
            console.log(sql.trim());
        } else {
            console.log(`${name} policy ensured.`);
        }
    }
}

async function main() {
    await ensureBucket();
    await ensureRlsPolicy();
    console.log('Storage setup complete.');
}

main();
