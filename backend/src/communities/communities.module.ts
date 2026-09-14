import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';

@Module({
    imports: [PrismaModule, PostsModule, AuthModule],
    controllers: [CommunitiesController],
    providers: [CommunitiesService, OptionalJwtAuthGuard],
})
export class CommunitiesModule {}
