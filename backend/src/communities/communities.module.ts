import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';
import { CommunityAccessService } from './community-access.service';

@Module({
    imports: [PrismaModule, PostsModule, AuthModule, NotificationsModule],
    controllers: [CommunitiesController],
    providers: [CommunitiesService, CommunityAccessService, OptionalJwtAuthGuard],
    exports: [CommunitiesService, CommunityAccessService],
})
export class CommunitiesModule {}
