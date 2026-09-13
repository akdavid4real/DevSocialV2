import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma with pg adapter
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`);

  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Creating backup in: ${backupDir}`);

  try {
    // Backup all tables
    const tables = [
      'user',
      'affiliation',
      'post',
      'postMedia',
      'comment',
      'like',
      'follow',
      'block',
      'tag',
      'postTag',
      'userMention',
      'conversation',
      'conversationParticipant',
      'message',
      'community',
      'communityMember',
      'xpLog',
      'userStats',
      'leaderboardSnapshot',
      'referral',
      'mission',
      'missionProgress',
      'weeklyChallenge',
      'challengeParticipation',
      'project',
      'knowledgeEntry',
      'notification',
      'report',
      'activity',
      'view',
      'feedback',
      'feedbackComment',
      'botAccount',
      'botActivity',
      'aiLog',
      'auditLog',
    ];

    for (const table of tables) {
      try {
        const data = await (prisma as any)[table].findMany();
        const filePath = path.join(backupDir, `${table}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✓ Backed up ${table}: ${data.length} records`);
      } catch (error) {
        console.log(`✗ Failed to backup ${table}:`, error.message);
      }
    }

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      database: 'postgres',
      tables: tables.length,
    };
    fs.writeFileSync(
      path.join(backupDir, '_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 Location: ${backupDir}`);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();
