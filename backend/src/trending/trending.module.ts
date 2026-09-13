import { Module } from '@nestjs/common';
import { TrendingController } from './trending.controller';
import { TrendingService } from './trending.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
    controllers: [TrendingController],
    providers: [TrendingService, PrismaService],
})
export class TrendingModule {}
