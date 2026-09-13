import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, NotificationType } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Reduced for Supabase pooler
      min: 2,
      idleTimeoutMillis: 10000, // Release idle connections faster
      connectionTimeoutMillis: 30000, // Increased timeout
      allowExitOnIdle: true, // Allow pool to close when idle
      statement_timeout: 10000, // 10s query timeout
    });

    const adapter = new PrismaPg(pool);
    super({
      adapter,
      log: ['error', 'warn'],
    });

    pool.on('error', (err) => {
      this.logger.error('Unexpected pool error:', err);
    });

    // Remove debug logging of every connection
    pool.on('acquire', () => {
      this.logger.debug(`Pool: ${pool.totalCount} total, ${pool.idleCount} idle, ${pool.waitingCount} waiting`);
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('Connecting to database...');
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

