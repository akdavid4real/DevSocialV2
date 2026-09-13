require('dotenv').config();
const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function checkDatabase() {
    try {
        console.log('🔍 Checking database for duplicate usernames...\n');

        // Get all users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                supabaseAuthId: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        console.log(`Total users in database: ${users.length}\n`);

        // Group by username (case-insensitive)
        const usernameMap = new Map();

        for (const user of users) {
            const username = user.username.toLowerCase();
            if (!usernameMap.has(username)) {
                usernameMap.set(username, []);
            }
            usernameMap.get(username).push(user);
        }

        // Find duplicates
        let duplicatesFound = false;

        for (const [username, userList] of usernameMap.entries()) {
            if (userList.length > 1) {
                duplicatesFound = true;
                console.log(`\n🔴 DUPLICATE USERNAME: "${username}" (${userList.length} accounts)`);
                console.log('='.repeat(80));
                userList.forEach((user, index) => {
                    console.log(`\n  Account ${index + 1}:`);
                    console.log(`    ID: ${user.id}`);
                    console.log(`    Email: ${user.email}`);
                    console.log(`    Supabase Auth ID: ${user.supabaseAuthId}`);
                    console.log(`    Created: ${user.createdAt.toISOString()}`);
                });
                console.log('\n' + '='.repeat(80));
            }
        }

        if (!duplicatesFound) {
            console.log('✅ No duplicate usernames found!');
        } else {
            console.log('\n⚠️  DUPLICATE USERNAMES DETECTED!');
            console.log('\nThis should not be possible with a unique constraint.');
            console.log('The constraint may not have been applied to the database.');
            console.log('\nTo fix this:');
            console.log('1. Decide which account to keep for each duplicate');
            console.log('2. Delete or rename the other account(s)');
            console.log('3. Run: npx prisma migrate deploy');
        }

        // Check for unique constraint
        console.log('\n\n🔍 Checking database constraints...\n');
        const constraints = await prisma.$queryRaw`
            SELECT 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'UNIQUE' 
                AND tc.table_name = 'User'
                AND kcu.column_name = 'username';
        `;

        if (constraints.length > 0) {
            console.log('✅ Username unique constraint EXISTS in database');
            console.log('   Constraint name:', constraints[0].constraint_name);
        } else {
            console.log('❌ Username unique constraint MISSING from database!');
            console.log('   Run: npx prisma migrate deploy');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
