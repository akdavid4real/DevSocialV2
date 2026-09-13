import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
    try {
        console.log('🔍 Checking database for duplicate usernames...\n');

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

        console.log(`Total users: ${users.length}\n`);

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
                console.log(`\n🔴 DUPLICATE: "${username}" (${userList.length} accounts)`);
                console.log('='.repeat(80));
                userList.forEach((user: any, index: number) => {
                    console.log(`\n  Account ${index + 1}:`);
                    console.log(`    ID: ${user.id}`);
                    console.log(`    Email: ${user.email}`);
                    console.log(`    Created: ${user.createdAt.toISOString()}`);
                });
                console.log('\n' + '='.repeat(80));
            }
        }

        if (!duplicatesFound) {
            console.log('✅ No duplicates found!');
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
