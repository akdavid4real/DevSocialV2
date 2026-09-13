import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function checkDuplicateUsernames() {
    console.log('Checking for duplicate usernames...\n');

    const users = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
            email: true,
            supabaseAuthId: true,
            createdAt: true,
        },
        orderBy: {
            username: 'asc',
        },
    });

    const usernameMap = new Map<string, any[]>();

    for (const user of users) {
        const username = user.username.toLowerCase();
        if (!usernameMap.has(username)) {
            usernameMap.set(username, []);
        }
        usernameMap.get(username)!.push(user);
    }

    let duplicatesFound = false;

    for (const [username, userList] of usernameMap.entries()) {
        if (userList.length > 1) {
            duplicatesFound = true;
            console.log(`\n🔴 DUPLICATE USERNAME: "${username}" (${userList.length} accounts)`);
            console.log('─'.repeat(80));
            userList.forEach((user, index) => {
                console.log(`  ${index + 1}. ID: ${user.id}`);
                console.log(`     Email: ${user.email}`);
                console.log(`     Supabase Auth ID: ${user.supabaseAuthId}`);
                console.log(`     Created: ${user.createdAt}`);
                console.log('');
            });
        }
    }

    if (!duplicatesFound) {
        console.log('✅ No duplicate usernames found!');
    } else {
        console.log('\n⚠️  ACTION REQUIRED: You need to resolve these duplicate usernames.');
        console.log('   Option 1: Delete one of the duplicate accounts');
        console.log('   Option 2: Rename one of the accounts to a different username');
    }

    await prisma.$disconnect();
}

checkDuplicateUsernames().catch(console.error);
