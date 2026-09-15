import { Module } from '@nestjs/common';
import { TrendingController } from './trending.controller';
import { TrendingService } from './trending.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { PostsModule } from '../posts/posts.module';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Module({
    imports: [PostsModule, AuthModule],
    controllers: [TrendingController],
    providers: [TrendingService, PrismaService, OptionalJwtAuthGuard],
})
export class TrendingModule {}
